"use client";

const KEY = "sixfigs-wallet-addresses";

export type WalletAddressMap = Record<string, string>;

/**
 * Local-only address captions. The backend never stores addresses, so the
 * browser remembers the address → walletNullifier pairs it learned at
 * registration and uses them to caption its own wallet list. Nothing here is
 * ever sent to the backend.
 */
export function readWalletAddressMap(): WalletAddressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: WalletAddressMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && k) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function rememberWalletAddresses(
  pairs: Array<{ walletNullifier: string; address: string }>,
): void {
  if (typeof window === "undefined" || pairs.length === 0) return;
  try {
    const map = readWalletAddressMap();
    for (const { walletNullifier, address } of pairs) {
      if (walletNullifier && address) map[walletNullifier] = address;
    }
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota — captions are best-effort */
  }
}

export function forgetWalletAddress(walletNullifier: string): void {
  if (typeof window === "undefined" || !walletNullifier) return;
  try {
    const map = readWalletAddressMap();
    if (!(walletNullifier in map)) return;
    delete map[walletNullifier];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function formatAddress(address: string | undefined): string | null {
  if (!address) return null;
  return address.length <= 14
    ? address
    : `${address.slice(0, 6)}…${address.slice(-4)}`;
}
