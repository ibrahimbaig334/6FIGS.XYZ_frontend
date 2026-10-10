"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The light wallet shell. The AppKit/wagmi/Solana stack is megabytes of
 * parse-and-execute that used to ride the initial bundle of every page; now
 * it lives in WalletStack and loads on demand, the first time a wallet flow
 * starts. Pages paint before any of it downloads.
 *
 * Same exports, same behavior — every action ensures the stack first, so
 * callers (Header, profile, game pages) change nothing. Nothing here may
 * statically import @reown, wagmi, or WalletStack, or the split is undone.
 */
const projectId = (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "").trim();

/** The env is configured. The stack itself may still be loading. */
export function isWalletConfigured(): boolean {
  return projectId.length > 0;
}

type HeavyModule = typeof import("./WalletStack");

let heavyPromise: Promise<HeavyModule> | null = null;
let heavyModule: HeavyModule | null = null;
const listeners = new Set<(m: HeavyModule | null) => void>();

/**
 * Load the wallet chunk. Cached and single-flight: concurrent callers join
 * one import, and a failure clears so the next attempt retries fresh.
 */
export function ensureWalletStack(): Promise<HeavyModule | null> {
  if (!isWalletConfigured()) return Promise.resolve(null);
  if (heavyModule) return Promise.resolve(heavyModule);
  if (!heavyPromise) {
    heavyPromise = import("./WalletStack")
      .then((m) => {
        heavyModule = m;
        listeners.forEach((fn) => fn(m));
        return m;
      })
      .catch((e) => {
        heavyPromise = null;
        throw e;
      });
  }
  return heavyPromise;
}

function useWalletStack(): HeavyModule | null {
  const [mod, setMod] = useState<HeavyModule | null>(heavyModule);
  useEffect(() => {
    listeners.add(setMod);
    return () => {
      listeners.delete(setMod);
    };
  }, []);
  return mod;
}

async function heavy(): Promise<HeavyModule> {
  const m = await ensureWalletStack();
  if (!m) {
    throw new Error(
      "Wallet connect is not configured. Set NEXT_PUBLIC_REOWN_PROJECT_ID.",
    );
  }
  return m;
}

/** True once the chunk is loaded and AppKit exists. */
export function isAppKitReady(): boolean {
  try {
    return Boolean(heavyModule?.isAppKitReady());
  } catch {
    return false;
  }
}

export async function openWalletModal(): Promise<void> {
  await (await heavy()).openWalletModal();
}

export function isWalletModalVisible(): boolean {
  try {
    return heavyModule?.isWalletModalVisible() ?? false;
  } catch {
    return false;
  }
}

/** Open the picker, retrying once if the modal renders empty. */
export async function openWalletModalVerified(): Promise<boolean> {
  return (await heavy()).openWalletModalVerified();
}

export async function disconnectWallets(): Promise<void> {
  // Never-loaded means never-connected: nothing to disconnect, and no
  // reason to download the stack just to learn that.
  const m =
    heavyModule ??
    (isWalletConfigured() ? await ensureWalletStack().catch(() => null) : null);
  await m?.disconnectWallets();
}

/**
 * Dev aid: describe the AppKit modal element so a stuck wallet flow reports
 * facts instead of a bare spinner. Non-production only.
 */
export async function walletModalDiagnostics(): Promise<string> {
  const m = await ensureWalletStack().catch(() => null);
  return m ? m.walletModalDiagnostics() : "wallet stack not loaded";
}

export default function Web3Providers({ children }: { children: ReactNode }) {
  const stack = useWalletStack();
  const ScrimHost = stack?.WalletScrimHost;
  // Deliberately flat: children never re-wrap, so loading the stack later
  // cannot remount the page or reset its state. The scrim host only adds.
  return (
    <>
      {children}
      {ScrimHost ? <ScrimHost /> : null}
    </>
  );
}
