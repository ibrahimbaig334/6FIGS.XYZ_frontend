"use client";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const KEY = "sixfigs-token";

export const isDevnet = (process.env.NEXT_PUBLIC_CHAIN_MODE ?? "devnet") === "devnet";

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(KEY);
}
export function setToken(t: string) {
  localStorage.setItem(KEY, t);
}
export function clearToken() {
  localStorage.removeItem(KEY);
}

export async function api<T>(path: string, opts?: { method?: string; body?: unknown; auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const useAuth = opts?.auth !== false;
  const token = useAuth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { message?: unknown };
  if (!res.ok) throw new Error(typeof data.message === "string" ? data.message : `Request failed (${res.status})`);
  return data as T;
}

export interface Wallet {
  id: string;
  chain: string;
  address: string;
  display: string;
}

export interface WalletBalance {
  walletId: string;
  chain: string;
  usd: number;
}

export interface Eligibility {
  tier: string | null;
  total: number;
  assetPct: Record<string, number>;
  balances: WalletBalance[];
  expiresAt: string | null;
  walletCount: number;
}

export interface TierInfo {
  name: string;
  min: number;
}

export async function getTiers(): Promise<{ chainMode: string; tiers: TierInfo[] }> {
  try {
    return await api<{ chainMode: string; tiers: TierInfo[] }>("/tiers", { auth: false });
  } catch {
    return {
      chainMode: "prod",
      tiers: [
        { name: "TIER I", min: 100000 },
        { name: "TIER II", min: 500000 },
        { name: "TIER III", min: 1000000 },
      ],
    };
  }
}

export interface Profile {
  id: string;
  handle: string | null;
  visMode: string;
  tags: string[];
  eligibility: Eligibility;
  wallets: Wallet[];
}

export interface Peer {
  id: string;
  handle: string;
  tier: string;
  visMode: string;
  tags: string[];
  online: boolean;
  lastSeenAt: string | null;
}

export interface RoomMember {
  id: string;
  handle: string;
  online: boolean;
  lastSeenAt: string | null;
}

export interface GameState {
  id: string;
  matchId: string;
  board: string;
  turn: string;
  status: string;
  winner: string | null;
  youAre: string;
  oppId: string;
  opponent: { id: string; handle: string; visMode: string } | null;
}

export interface Room {
  id: string;
  name: string;
  imageUrl: string | null;
  accessType: string;
  minTier: string | null;
  memberCount: number;
  createdAt: string;
}

export interface RoomList {
  items: Room[];
  total: number;
  page: number;
  limit: number;
}

export interface ChatMessage {
  id: string;
  scope: string;
  scopeId: string;
  senderId: string;
  senderHandle: string;
  body: string;
  createdAt: string;
}

export function extractTickers(text: string): string[] {
  const out: string[] = [];
  const re = /\$([A-Za-z]{2,10})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const s = m[1].toUpperCase();
    if (!out.includes(s)) out.push(s);
  }
  return out.slice(0, 3);
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "long ago";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Must match backend loginMessage() byte-for-byte. */
export function loginMessage(chain: string, address: string, nonce: string): string {
  return `6FIGS.XYZ login\n${chain}:${address}\nnonce: ${nonce}`;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function b58encode(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  if (zeros === bytes.length) return "1".repeat(Math.max(zeros, 1));
  const digits: number[] = [0];
  for (let k = zeros; k < bytes.length; k++) {
    let carry = bytes[k];
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = "";
  for (let i = 0; i < zeros; i++) out += "1";
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}
