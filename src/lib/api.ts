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
  mockUsd: number | null;
}

export interface Eligibility {
  tier: string | null;
  total: number;
  assetPct: Record<string, number>;
  expiresAt: string | null;
  walletCount: number;
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
  isBot: boolean;
  online: boolean;
  lastSeenAt: string | null;
}

export interface RoomMember {
  id: string;
  handle: string;
  isBot: boolean;
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
  opponent: { id: string; handle: string; visMode: string; isBot: boolean } | null;
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
