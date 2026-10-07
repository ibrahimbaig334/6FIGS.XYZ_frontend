"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { base58Encode } from "@sixfigs/tee/shared";
import type { Profile } from "../lib/api";
import { errMsg } from "../lib/api";
import { notifyError } from "../lib/notify";
import {
  prepareSet,
  prepareSetPublic,
  prepareWalletAddition,
  submitSet,
  submitSetSessionless,
  submitWalletAddition,
  isWalletProved,
  markWalletProved,
  onceByKey,
  type TeeWalletInput,
} from "../lib/teeVerify";
import { rememberWalletAddresses } from "../lib/walletAddresses";

type ProveMode = "establish" | "add";

function descriptorKey(wallet: TeeWalletInput): string {
  return `${wallet.family}:${wallet.address.toLowerCase()}`;
}

type Prepared =
  | { kind: "establish"; value: Awaited<ReturnType<typeof prepareSet>>["prepared"]; client: Awaited<ReturnType<typeof prepareSet>>["client"]; forAddress: string }
  | { kind: "add"; value: Awaited<ReturnType<typeof prepareWalletAddition>>["prepared"]; client: Awaited<ReturnType<typeof prepareWalletAddition>>["client"]; forAddress: string };

/**
 * Fully automatic tee flow with NO visible UI (returns null) — the parent
 * swaps its CONNECT/ADD button for a CONNECTING… indicator while mounted.
 *
 * Deliberately simple: one staged wallet in state, and every step is a
 * useEffect with correct deps, so each step always sees a consistent
 * snapshot (no cross-await liveness checks, no address comparisons across
 * renders — the entire class of bug that kept biting). Overlap safety
 * (StrictMode double-mount, rapid re-presses) comes from module-level
 * onceByKey dedup on prepare/sign/submit, keyed so twins join instead of
 * colliding on single-use nonces.
 *
 *   press → popup → pick → connect → prepare → sign → submit → done.
 *
 * One wallet per run (ADD WALLET afterwards for the next). "establish"
 * enrolls a full new set, "add" extends an existing account.
 * `sessionless` runs the public establish variant: no session needed, the
 * backend resolves (or creates) the owner and returns one — the wallet
 * login. Only meaningful with mode="establish".
 */
export default function TeeProve({
  mode,
  sessionless,
  onDone,
  onDismiss,
}: {
  mode: ProveMode;
  sessionless?: boolean;
  onDone: (profile: Profile) => void;
  /** Nothing left to do (dismissed popup, failure) — show the button again. */
  onDismiss: () => void;
}) {
  const { publicKey, signMessage, wallet, connected, connecting, connect, select } =
    useWallet();
  const { visible: modalVisible, setVisible: setModalVisible } = useWalletModal();
  const [staged, setStaged] = useState<TeeWalletInput | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "choose" | "connect">("idle");
  const connRef = useRef(false);
  const signingForRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const prepSeq = useRef(0);

  // Mount: open the selection popup (clearing any stale stored selection
  // first, so a close without picking is provably a dismissal).
  useEffect(() => {
    if (!connected) {
      try {
        select(null);
      } catch {
        /* selection unsupported — close logic below still guards */
      }
    }
    setModalVisible(true);
    setPhase("choose");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Popup closed: a present selection is a real pick (stale ones were
  // cleared on press); nothing selected backs out silently.
  useEffect(() => {
    if (modalVisible || phase !== "choose") return;
    if (!wallet) {
      setPhase("idle");
      onDismiss();
      return;
    }
    setPhase("connect");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalVisible, phase, wallet]);

  // Connect the pick.
  useEffect(() => {
    if (phase !== "connect") return;
    if (connected || !wallet) {
      setPhase("idle");
      return;
    }
    if (connecting || connRef.current) return;
    connRef.current = true;
    connect()
      .catch((e) => {
        console.error("wallet connect failed", e);
        notifyError("Connection failed — try again");
      })
      .finally(() => {
        connRef.current = false;
        setPhase("idle");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, wallet, connected, connecting, modalVisible]);

  // Fresh connection: stage it and prepare. A later switch restarts here
  // for the new address; the seq guard drops stale prepare results.
  useEffect(() => {
    if (!connected || !publicKey || !signMessage) return;
    const addr = publicKey.toString();
    if (staged?.address.toLowerCase() === addr.toLowerCase()) return;
    const entry: TeeWalletInput = {
      family: "solana",
      chainId: 0,
      address: addr,
      label: wallet?.adapter.name ?? "Solana Wallet",
    };
    if (mode === "add" && isWalletProved(descriptorKey(entry))) {
      notifyError("That wallet is already connected");
      onDismiss();
      return;
    }
    setStaged(entry);
    setSig(null);
    const mySeq = ++prepSeq.current;
    const prepKey = `${mode}:${sessionless ? "pub" : "sess"}:${addr.toLowerCase()}`;
    void onceByKey(prepKey, async () => {
      const p =
        mode === "add"
          ? await prepareWalletAddition({ added: [entry] }).then(
              ({ client, prepared }) => ({
                client,
                kind: "add" as const,
                value: prepared,
              }),
            )
          : await (async () => {
              if (sessionless) {
                const { client, prepared } = await prepareSetPublic({
                  wallets: [entry],
                });
                return {
                  client,
                  kind: "establish" as const,
                  value: prepared,
                };
              }
              const { client, prepared } = await prepareSet({
                wallets: [entry],
              });
              return {
                client,
                kind: "establish" as const,
                value: prepared,
              };
            })();
      if (mySeq !== prepSeq.current) return null;
      setPrepared({ ...p, forAddress: addr });
      return p;
    }).catch((e) => {
      if (mySeq !== prepSeq.current) return;
      console.error("tee prepare failed", e);
      notifyError(e instanceof Error ? e.message : "Could not prepare — try again");
      onDismiss();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, signMessage]);

  // Prepared for the staged wallet and holding it: prompt its signature.
  // Guarded per message (not a boolean): switching wallets mid-prompt
  // starts a new message instead of stalling behind the old one.
  useEffect(() => {
    if (!prepared || !staged || sig) return;
    if (!connected || !publicKey) return;
    if (
      prepared.forAddress.toLowerCase() !== staged.address.toLowerCase() ||
      publicKey.toString().toLowerCase() !== staged.address.toLowerCase()
    ) {
      return;
    }
    const sm = signMessage;
    if (!sm) {
      notifyError("Wallet cannot sign — try again");
      onDismiss();
      return;
    }
    const message =
      prepared.kind === "establish"
        ? prepared.value.message
        : (prepared.value.addMessages[descriptorKey(staged)] ?? null);
    if (!message) {
      notifyError("No message for that wallet — try again");
      onDismiss();
      return;
    }
    if (signingForRef.current === message) return;
    signingForRef.current = message;
    void onceByKey(`sign:${message}`, async () => {
      try {
        const raw = (await sm(
          new TextEncoder().encode(message),
        )) as unknown as Uint8Array | { signature: Uint8Array };
        return base58Encode(raw instanceof Uint8Array ? raw : raw.signature);
      } finally {
        if (signingForRef.current === message) signingForRef.current = null;
      }
    })
      .then((s) => setSig(s))
      .catch(() => {
        notifyError("Signature declined — press CONNECT WALLET to try again");
        onDismiss();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, staged, sig, connected, publicKey]);

  // Signed: submit (deduped by message — single-use nonces can't be spent twice).
  useEffect(() => {
    if (!sig || !prepared || !staged) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    const message =
      prepared.kind === "establish"
        ? prepared.value.message
        : (prepared.value.addMessages[descriptorKey(staged)] ?? "");
    void onceByKey(`submit:${message}`, async () => {
      if (prepared.kind === "add") {
        return submitWalletAddition({
          client: prepared.client,
          prepared: prepared.value,
          signatures: { [descriptorKey(staged)]: sig },
        });
      }
      if (sessionless) {
        return submitSetSessionless({
          client: prepared.client,
          prepared: prepared.value,
          wallets: [staged],
          signatures: { [descriptorKey(staged)]: sig },
        });
      }
      return submitSet({
        client: prepared.client,
        prepared: prepared.value,
        wallets: [staged],
        signatures: { [descriptorKey(staged)]: sig },
      });
    })
      .then((submitted) => {
        const binding =
          prepared.kind === "add"
            ? submitted.signed.body.addedWalletNullifiers?.[0]
            : submitted.signed.body.walletNullifiers[0];
        if (binding) {
          // Local-only caption; the backend never learns the address.
          rememberWalletAddresses([
            { walletNullifier: binding.walletNullifier, address: staged.address },
          ]);
        }
        markWalletProved(descriptorKey(staged));
        onDone(submitted.profile);
      })
      .catch((e) => {
        console.error("tee submit failed", e);
        notifyError(errMsg(e, "Submit failed — try again"));
        onDismiss();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return null;
}
