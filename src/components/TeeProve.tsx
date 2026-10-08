"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAppKitAccount,
  useAppKitProvider,
  useAppKitState,
} from "@reown/appkit/react";
import type { Provider as SolanaProvider } from "@reown/appkit-adapter-solana/react";
import { useAccount, useSignMessage } from "wagmi";
import { base58Encode } from "@sixfigs/tee/shared";
import type { Profile } from "../lib/api";
import { errMsg, teeIdentify } from "../lib/api";
import { notifyError } from "../lib/notify";
import {
  isWalletProved,
  markWalletProved,
  onceByKey,
  prepareSet,
  prepareSetPublic,
  prepareWalletAddition,
  submitSet,
  submitSetSessionless,
  submitSignedOnly,
  submitWalletAddition,
  type TeeWalletInput,
} from "../lib/teeVerify";
import {
  disconnectWallets,
  isAppKitReady,
  openWalletModalVerified,
  walletModalDiagnostics,
} from "./Web3Providers";

type ProveMode = "establish" | "add" | "identify";

export interface IdentifiedAccount {
  username: string | null;
  recoveryToken: string;
}

function descriptorKey(wallet: TeeWalletInput): string {
  return `${wallet.family}:${wallet.address.toLowerCase()}`;
}

function familyFromCaip(caipAddress: string | undefined): "evm" | "solana" | null {
  const namespace = caipAddress?.split(":")[0];
  if (namespace === "eip155") return "evm";
  if (namespace === "solana") return "solana";
  return null;
}

/** head…tail, family shown, never a full address dump. */
function shortAddress(address: string): string {
  return address.length > 14
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

/**
 * The wallet's currently active account is what gets proven. Confirm it before
 * asking for a signature so a wrong account is caught here, not after an
 * irreversible prove — "use another account" drops the connection and reopens
 * the wallet picker so the user can switch in their wallet first.
 */
function AccountConfirm({
  address,
  family,
  onConfirm,
  onOther,
}: {
  address: string;
  family: "evm" | "solana";
  onConfirm: () => void;
  onOther: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        alignItems: "center",
      }}
    >
      <p className="fine" style={{ margin: 0, textAlign: "center" }}>
        {family === "evm" ? "EVM" : "SOLANA"} ACCOUNT{" "}
        <strong>{shortAddress(address)}</strong>
        <br />
        CHECK THIS IS THE ONE YOU WANT TO PROVE.
      </p>
      <button className="btn-solid" onClick={onConfirm}>
        CONFIRM &amp; SIGN
      </button>
      <button className="btn-ghost" onClick={onOther}>
        USE ANOTHER ACCOUNT
      </button>
    </div>
  );
}

type RegistrationPrep = Awaited<ReturnType<typeof prepareSet>>["prepared"];
type AdditionPrep = Awaited<ReturnType<
  typeof prepareWalletAddition
>>["prepared"];
type Prepared =
  | {
      kind: "establish" | "identify";
      value: RegistrationPrep;
      client: Awaited<ReturnType<typeof prepareSet>>["client"];
      forAddress: string;
    }
  | {
      kind: "add";
      value: AdditionPrep;
      client: Awaited<ReturnType<typeof prepareWalletAddition>>["client"];
      forAddress: string;
    };

/**
 * Fully automatic tee flow with NO visible UI (returns null) — the parent
 * swaps its CONNECT button for a CONNECTING… indicator while mounted.
 *
 * One wallet per run: press → AppKit modal → pick → connect → prepare → sign
 * → submit → done. Both families share the flow; EVM signs EIP-191
 * personal_sign hex, Solana signs ed25519 and is base58-encoded. "establish"
 * enrolls a set, "add" extends an existing account, "identify" is recovery
 * (no session, username + single-use token). `sessionless` runs the public
 * establish variant: no session needed, the backend resolves (or creates) the
 * owner — the wallet sign-in.
 */
export interface TeeProveProps {
  mode: ProveMode;
  sessionless?: boolean;
  /** Label for the in-progress button; parents render nothing themselves. */
  busyLabel?: string;
  onDone?: (profile: Profile) => void;
  onIdentified?: (account: IdentifiedAccount) => void;
  /** Nothing left to do (dismissed popup, failure) — show the button again. */
  onDismiss: () => void;
}

/** Fails closed when no Reown project ID is configured. */
function NotConfigured({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    notifyError(
      "Wallet connect is not configured — set NEXT_PUBLIC_REOWN_PROJECT_ID",
    );
    onDismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function TeeProve(props: TeeProveProps) {
  if (!isAppKitReady()) return <NotConfigured onDismiss={props.onDismiss} />;
  return <TeeProveInner {...props} />;
}

function TeeProveInner({
  mode,
  sessionless,
  busyLabel = "CONNECTING…",
  onDone,
  onIdentified,
  onDismiss,
}: TeeProveProps) {
  const { address, caipAddress, isConnected } = useAppKitAccount();
  const { connector } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>("solana");
  const { open: modalOpen } = useAppKitState();

  const [staged, setStaged] = useState<TeeWalletInput | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [diag, setDiag] = useState<string | null>(null);
  const wasOpenRef = useRef(false);
  const prepSeq = useRef(0);
  const signingForRef = useRef<string | null>(null);
  const submittedRef = useRef(false);

  // Mount: open the connect modal unless a wallet is already connected (a
  // stale connection is consumed directly, e.g. a retry after a failure).
  // AppKit can mount an empty shell if open() races its first render, so the
  // verified opener retries and the fallback surfaces if it can't.
  useEffect(() => {
    if (isConnected) return;
    let cancelled = false;
    openWalletModalVerified()
      .then((shown) => {
        if (cancelled || shown) return;
        notifyError("Couldn't open the wallet picker — reload and try again");
        setShowFallback(true);
      })
      .catch((e) => {
        console.error("wallet modal failed to open", e);
        if (cancelled) return;
        notifyError("Couldn't open the wallet picker — reload and try again");
        onDismiss();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dev probe: while waiting on a connection, report what the AppKit modal is
  // actually doing so a stuck flow is diagnosable without guesswork.
  useEffect(() => {
    if (staged || process.env.NODE_ENV === "production") return;
    const t = setTimeout(() => {
      walletModalDiagnostics()
        .then((d) => {
          setDiag(d);
          console.warn("[tee] wallet modal diagnostics:", d);
        })
        .catch((e) => setDiag(`diagnostics failed: ${String(e)}`));
    }, 3_000);
    return () => clearTimeout(t);
  }, [staged]);

  // Watchdog: if the picker never yields a connection, offer a way out instead
  // of stranding the user on a spinner.
  useEffect(() => {
    if (staged) return;
    const t = setTimeout(() => setStalled(true), 12_000);
    return () => clearTimeout(t);
  }, [staged]);

  // Modal closed with nothing connected = dismissal.
  useEffect(() => {
    if (wasOpenRef.current && !modalOpen && !isConnected) onDismiss();
    wasOpenRef.current = modalOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, isConnected]);

  // Connected account: stage it, then prepare its challenge.
  useEffect(() => {
    if (!isConnected || !address) return;
    const family = familyFromCaip(caipAddress);
    if (!family) {
      notifyError("That wallet's network is not supported");
      onDismiss();
      return;
    }
    if (staged && staged.address.toLowerCase() === address.toLowerCase()) return;
    const entry: TeeWalletInput = {
      family,
      chainId: 0,
      address,
      label:
        family === "evm"
          ? (connector?.name ?? "EVM Wallet")
          : (solanaProvider?.name ?? "Solana Wallet"),
    };
    if (mode === "add" && isWalletProved(descriptorKey(entry))) {
      notifyError("That wallet is already connected");
      onDismiss();
      return;
    }
    setStaged(entry);
    setSig(null);
    setConfirmed(false);
    const mySeq = ++prepSeq.current;
    const prepKey = `${mode}:${sessionless ? "pub" : "sess"}:${address.toLowerCase()}`;
    void onceByKey(prepKey, async () => {
      if (mode === "add") {
        const { client, prepared: p } = await prepareWalletAddition({
          added: [entry],
        });
        return { kind: "add" as const, client, value: p };
      }
      if (mode === "identify") {
        const { client, prepared: p } = await prepareSetPublic({
          wallets: [entry],
        });
        return { kind: "identify" as const, client, value: p };
      }
      if (sessionless) {
        const { client, prepared: p } = await prepareSetPublic({
          wallets: [entry],
        });
        return { kind: "establish" as const, client, value: p };
      }
      const { client, prepared: p } = await prepareSet({ wallets: [entry] });
      return { kind: "establish" as const, client, value: p };
    })
      .then((p) => {
        if (mySeq !== prepSeq.current) return;
        setPrepared({ ...p, forAddress: address });
      })
      .catch((e) => {
        if (mySeq !== prepSeq.current) return;
        console.error("tee prepare failed", e);
        notifyError(
          e instanceof Error ? e.message : "Could not prepare — try again",
        );
        onDismiss();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, caipAddress]);

  // Prepared for the staged wallet: prompt its signature (family-specific).
  useEffect(() => {
    if (!prepared || !staged || sig || !confirmed) return;
    if (!isConnected || !address) return;
    if (address.toLowerCase() !== staged.address.toLowerCase()) return;
    const message =
      prepared.kind === "add"
        ? prepared.value.addMessages[descriptorKey(staged)] ?? null
        : prepared.value.message;
    if (!message) {
      notifyError("No message for that wallet — try again");
      onDismiss();
      return;
    }
    if (signingForRef.current === message) return;
    signingForRef.current = message;
    void onceByKey(`sign:${message}`, async () => {
      try {
        if (staged.family === "evm") {
          return await signMessageAsync({ message });
        }
        if (!solanaProvider?.signMessage) {
          throw new Error("Wallet cannot sign messages");
        }
        const bytes = await solanaProvider.signMessage(
          new TextEncoder().encode(message),
        );
        return base58Encode(bytes);
      } finally {
        if (signingForRef.current === message) signingForRef.current = null;
      }
    })
      .then((s) => setSig(s as string))
      .catch((e) => {
        console.error("tee sign failed", e);
        notifyError("Signature declined — press CONNECT WALLET to try again");
        onDismiss();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, staged, sig, confirmed, isConnected, address]);

  // Signed: submit (deduped by message — single-use nonces can't be spent
  // twice). Disconnect afterwards so the next run picks a fresh wallet.
  useEffect(() => {
    if (!sig || !prepared || !staged) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    const message =
      prepared.kind === "add"
        ? prepared.value.addMessages[descriptorKey(staged)] ?? ""
        : prepared.value.message;
    void onceByKey(`submit:${message}`, async () => {
      if (prepared.kind === "add") {
        return submitWalletAddition({
          client: prepared.client,
          prepared: prepared.value,
          signatures: { [descriptorKey(staged)]: sig },
        });
      }
      if (prepared.kind === "identify") {
        const signed = await submitSignedOnly({
          client: prepared.client,
          prepared: prepared.value,
          signatures: { [descriptorKey(staged)]: sig },
        });
        return { identified: await teeIdentify(signed) };
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
      .then((result) => {
        markWalletProved(descriptorKey(staged));
        void disconnectWallets();
        if ("identified" in result) onIdentified?.(result.identified);
        else onDone?.(result.profile);
      })
      .catch((e) => {
        console.error("tee submit failed", e);
        notifyError(errMsg(e, "Submit failed — try again"));
        onDismiss();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  if (staged && !confirmed) {
    return (
      <AccountConfirm
        address={staged.address}
        family={staged.family}
        onConfirm={() => setConfirmed(true)}
        onOther={() => {
          setStaged(null);
          setPrepared(null);
          void disconnectWallets().then(() => openWalletModalVerified());
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        alignItems: "center",
      }}
    >
      <button className="btn-solid" disabled>
        {sig ? "SUBMITTING…" : busyLabel}
      </button>
      {diag && !stalled && (
        <p
          className="fine"
          style={{
            margin: 0,
            textAlign: "center",
            maxWidth: 320,
            wordBreak: "break-word",
            fontSize: "0.68rem",
            opacity: 0.7,
          }}
        >
          {diag}
        </p>
      )}
      {(stalled || showFallback) && (
        <>
          <p className="fine" style={{ margin: 0, textAlign: "center" }}>
            THE WALLET PICKER IS NOT SHOWING. OPEN IT AGAIN, OR CANCEL.
          </p>
          {diag && (
            <p
              className="fine"
              style={{
                margin: 0,
                textAlign: "center",
                maxWidth: 320,
                wordBreak: "break-word",
                fontSize: "0.66rem",
                opacity: 0.7,
              }}
            >
              {diag}
            </p>
          )}
          <button
            className="btn-ghost"
            onClick={() => {
              setStalled(false);
              setShowFallback(false);
              void openWalletModalVerified().then((shown) => {
                if (!shown) setShowFallback(true);
              });
            }}
          >
            OPEN THE WALLET PICKER AGAIN
          </button>
        </>
      )}
    </div>
  );
}