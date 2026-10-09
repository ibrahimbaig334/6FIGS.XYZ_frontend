"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { notifyError } from "../lib/notify";
import BusyPhase from "./BusyPhase";
import { ensureWalletStack, isWalletConfigured } from "./Web3Providers";

// Type-only: erased at build, so this shell never pulls the wallet chunk.
export type { IdentifiedAccount, ProveMode, TeeProveProps } from "./TeeProveInner";

import type { TeeProveProps } from "./TeeProveInner";

const HeavyProve = lazy(() => import("./TeeProveInner"));

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

/**
 * The light half of the prove flow: gates on configuration, warms the wallet
 * chunk in the background, and renders the heavy flow inside its provider
 * scope once ready. While loading it shows the same busy face the flow
 * itself wears — the door never goes blank mid-ceremony.
 */
export default function TeeProve(props: TeeProveProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isWalletConfigured()) return;
    let live = true;
    void ensureWalletStack()
      .then(() => {
        if (live) setReady(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  if (!isWalletConfigured()) return <NotConfigured onDismiss={props.onDismiss} />;
  const fallback = <BusyPhase label={props.busyLabel ?? "Opening your wallet…"} />;
  if (!ready) return fallback;
  return (
    <Suspense fallback={fallback}>
      <HeavyProve {...props} />
    </Suspense>
  );
}
