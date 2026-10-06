"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { base58Encode } from "@sixfigs/tee/shared";
import type { Profile } from "../lib/api";
import { notifyError } from "../lib/notify";
import {
  prepareSet,
  prepareWalletAddition,
  submitSet,
  submitWalletAddition,
  isWalletProved,
  markWalletProved,
  type TeeWalletInput,
} from "../lib/teeVerify";

type ProveMode = "establish" | "add";

function descriptorKey(wallet: TeeWalletInput): string {
  return `${wallet.family}:${wallet.address.toLowerCase()}`;
}

/**
 * Fully automatic tee flow with NO visible UI (returns null) — the parent
 * swaps its CONNECT/ADD button for a CONNECTING… indicator while a run is
 * active. One linear run per mount, no scattered state:
 *
 *   open selection popup → connect → prepare → sign → submit → done.
 *
 * Every step is awaited in order with a generation token, so overlapping
 * events (double mounts, slow popups, reselection) cannot interleave into a
 * stuck state. Any failure or dismissal toasts (where needed) and closes
 * back to the button via onDismiss.
 *
 * One wallet per run (ADD WALLET afterwards for the next). "establish"
 * enrolls a full new set, "add" extends an existing account.
 */
export default function TeeProve({
  mode,
  onDone,
  onDismiss,
}: {
  mode: ProveMode;
  onDone: (profile: Profile) => void;
  /** Nothing left to do (dismissed popup, failure) — show the button again. */
  onDismiss: () => void;
}) {
  const { publicKey, signMessage, wallet, connected, connect, disconnect } =
    useWallet();
  const { visible: modalVisible, setVisible: setModalVisible } = useWalletModal();

  // Live mirror — always fresh inside async continuations (no stale closures).
  const liveRef = useRef({
    connected: false,
    address: null as string | null,
    adapterName: null as string | null,
    wallet: null as typeof wallet,
    signMessage: null as typeof signMessage | null,
    modalVisible: false,
  });
  liveRef.current = {
    connected,
    address: publicKey?.toString() ?? null,
    adapterName: wallet?.adapter.name ?? null,
    wallet,
    signMessage,
    modalVisible,
  };

  // Generation token: every restart/unmount invalidates older runs.
  const runTokenRef = useRef(0);
  // Guards the modal-close drive: one connection attempt at a time.
  const drivingRef = useRef(false);
  const waiterRef = useRef<null | {
    resolve: (addr: string | null) => void;
  }>(null);

  function waitForConnect(): Promise<string | null> {
    return new Promise((resolve) => {
      waiterRef.current = { resolve };
    });
  }

  // Adapter connected (fresh connect OR silent in-extension switch) while a
  // waiter is pending → hand the address to the driver. Check-and-clear is
  // synchronous, so overlapping watchers cannot double-resolve.
  useEffect(() => {
    if (connected && publicKey && waiterRef.current) {
      const w = waiterRef.current;
      waiterRef.current = null;
      w.resolve(publicKey.toString());
    }
  }, [connected, publicKey]);

  // Selection popup closed with a waiter pending: no selection = dismissed;
  // a selection = (re)connect it, then the adapter watcher above resolves.
  // Always cycling (disconnect first) is what makes switching wallets work —
  // a silent keep-connection is exactly what used to strand the flow.
  useEffect(() => {
    if (modalVisible || !waiterRef.current || drivingRef.current) return;
    const w = waiterRef.current;
    const sel = liveRef.current.wallet;
    if (!sel) {
      waiterRef.current = null;
      w.resolve(null);
      return;
    }
    drivingRef.current = true;
    void (async () => {
      try {
        if (liveRef.current.connected) {
          try {
            await disconnect();
          } catch {
            /* already gone — connect below anyway */
          }
        }
        await connect();
        // Success resolves via the adapter watcher (single resolution point).
      } catch (e) {
        console.error("wallet connect failed", e);
        if (waiterRef.current === w) {
          waiterRef.current = null;
          notifyError("Connection failed — try again");
          w.resolve(null);
        }
      } finally {
        drivingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalVisible]);

  async function runFlow() {
    const my = ++runTokenRef.current;
    const alive = () => runTokenRef.current === my;
    try {
      // Always through the selection popup — even with a wallet connected.
      setModalVisible(true);
      const addr = await waitForConnect();
      if (!alive()) return;
      if (!addr) {
        onDismiss();
        return;
      }
      const key = `solana:${addr.toLowerCase()}`;
      // Re-picking a wallet proved earlier this session: warn before any
      // enclave round-trip or signature popup.
      if (mode === "add" && isWalletProved(key)) {
        notifyError("That wallet is already connected");
        onDismiss();
        return;
      }
      const entry: TeeWalletInput = {
        family: "solana",
        chainId: 0,
        address: addr,
        label: liveRef.current.adapterName ?? "Solana Wallet",
      };
      const prepped =
        mode === "add"
          ? await prepareWalletAddition({ added: [entry] }).then(
              ({ client, prepared }) => ({
                client,
                kind: "add" as const,
                value: prepared,
              }),
            )
          : await prepareSet({ wallets: [entry] }).then(
              ({ client, prepared }) => ({
                client,
                kind: "establish" as const,
                value: prepared,
              }),
            );
      if (!alive()) return;
      // Switched wallets mid-prepare: restart instead of signing wrong.
      if (liveRef.current.address?.toLowerCase() !== addr.toLowerCase()) {
        notifyError("Wallet switched — press CONNECT WALLET to restart");
        onDismiss();
        return;
      }
      const sm = liveRef.current.signMessage;
      if (!sm) {
        notifyError("Wallet cannot sign — try again");
        onDismiss();
        return;
      }
      const message =
        prepped.kind === "establish"
          ? prepped.value.message
          : (prepped.value.addMessages[key] ?? null);
      if (!message) {
        notifyError("No message for that wallet — try again");
        onDismiss();
        return;
      }
      let sig: string;
      try {
        const raw = (await sm(
          new TextEncoder().encode(message),
        )) as unknown as Uint8Array | { signature: Uint8Array };
        sig = base58Encode(raw instanceof Uint8Array ? raw : raw.signature);
      } catch {
        notifyError("Signature declined — press CONNECT WALLET to try again");
        onDismiss();
        return;
      }
      if (!alive()) return;
      if (liveRef.current.address?.toLowerCase() !== addr.toLowerCase()) {
        notifyError("Wallet switched — press CONNECT WALLET to restart");
        onDismiss();
        return;
      }
      const profile =
        prepped.kind === "add"
          ? await submitWalletAddition({
              client: prepped.client,
              prepared: prepped.value,
              signatures: { [key]: sig },
            })
          : await submitSet({
              client: prepped.client,
              prepared: prepped.value,
              wallets: [entry],
              signatures: { [key]: sig },
            });
      if (!alive()) return;
      markWalletProved(key);
      onDone(profile);
    } catch (e) {
      console.error("prove flow failed", e);
      if (!alive()) return;
      notifyError(e instanceof Error ? e.message : "Couldn't verify — try again");
      onDismiss();
    }
  }

  // One run per mount. Unmount invalidates the run; a dangling waiter is
  // simply never resolved (the modal-close watcher is gone with it).
  useEffect(() => {
    void runFlow();
    return () => {
      runTokenRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
