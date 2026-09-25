"use client";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const KEY = "sixfigs-token";

export const isDevnet = (process.env.NEXT_PUBLIC_CHAIN_MODE ?? "devnet") === "devnet";

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(KEY);
}
export function setToken(t: string) {
  localStorage.setItem(KEY, t);
  purgeCache(); // new session must not show the previous user's data
}
export function clearToken() {
  localStorage.removeItem(KEY);
  purgeCache();
}

/** Error with HTTP status; status 0 = network unreachable. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* ---------------- client-side SWR cache (survives page navigations) ----------------
 * localStorage-backed so full page loads (plain <a href> nav) still hit it.
 * Fresh window: served instantly, no network. Stale up to 24h: served instantly
 * + one background revalidate (dispatches "sixfigs-cache"). Mutations + login
 * changes purge everything. Realtime paths (games/chat/online/members) skip it.
 */
const CACHE_PREFIX = "sixfigs-cache:";
const FRESH_MS = 30_000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // user asked for at least a day
const UNCACHED = ["/chat/room/", "/chat/dm/", "/games/", "/play/online", "/rooms/"];

interface CacheEntry {
  t: number;
  d: unknown;
}

function isCacheable(path: string): boolean {
  return !UNCACHED.some((p) => path.startsWith(p));
}

function cacheRead(path: string): { data: unknown; age: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry;
    const age = Date.now() - e.t;
    if (age > MAX_AGE_MS) {
      localStorage.removeItem(CACHE_PREFIX + path);
      return null;
    }
    return { data: e.d, age };
  } catch {
    return null;
  }
}

function cacheWrite(path: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ t: Date.now(), d: data }));
  } catch {
    /* quota — skip */
  }
}

/** Synchronous peek for instant first paint (any age ≤ 24h). */
export function peekCache<T>(path: string): T | null {
  const hit = cacheRead(path);
  return hit ? (hit.data as T) : null;
}

export function purgeCache(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

async function rawFetch<T>(method: string, path: string, body: unknown, token: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server", 0);
  }
  const data = (await res.json().catch(() => ({}))) as { message?: unknown };
  if (res.status === 401 && token) {
    // Session actually invalid/expired (JWT lasts 7d) — NOT cleared on network blips.
    clearToken();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("sixfigs-auth"));
  }
  if (!res.ok) throw new ApiError(typeof data.message === "string" ? data.message : `Request failed (${res.status})`, res.status);
  return data as T;
}

const inflightBg = new Set<string>();
function scheduleBackground(path: string): void {
  if (typeof window === "undefined" || inflightBg.has(path)) return;
  inflightBg.add(path);
  const tokenAtStart = getToken();
  rawFetch<unknown>("GET", path, undefined, tokenAtStart)
    .then((data) => {
      // discard if the session changed while we were fetching
      if (getToken() === tokenAtStart) {
        cacheWrite(path, data);
        window.dispatchEvent(new CustomEvent("sixfigs-cache", { detail: { path, data } }));
      }
    })
    .catch(() => {
      /* keep serving stale on failure */
    })
    .finally(() => inflightBg.delete(path));
}

export async function api<T>(
  path: string,
  opts?: { method?: string; body?: unknown; auth?: boolean; cache?: boolean; force?: boolean },
): Promise<T> {
  const method = (opts?.method ?? "GET").toUpperCase();
  const useAuth = opts?.auth !== false;
  const token = useAuth ? getToken() : null;
  const cacheable = method === "GET" && opts?.cache !== false && isCacheable(path);

  if (cacheable && !opts?.force) {
    const hit = cacheRead(path);
    if (hit && hit.age < FRESH_MS) return hit.data as T;
    if (hit) {
      scheduleBackground(path); // stale-while-revalidate: instant paint, fresh data shortly after
      return hit.data as T;
    }
  }

  const data = await rawFetch<T>(method, path, opts?.body, token);
  if (method === "GET" && cacheable) cacheWrite(path, data);
  else if (method !== "GET") purgeCache(); // mutations invalidate everything
  return data;
}

/** Prompt-free copy (legacy execCommand) — navigator.clipboard can raise permission dialogs. */
export function copyText(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
  description: string | null;
  imageUrl: string | null;
  accessType: string;
  minTier: string | null;
  memberCount: number;
  onlineCount: number;
  createdAt: string;
  isMember: boolean;
  isOwner: boolean;
}

export interface RoomMeta {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  accessType: string;
  minTier: string | null;
  memberCount: number;
  onlineCount: number;
  isMember: boolean;
  isOwner: boolean;
}

export interface Friend {
  id: string;
  handle: string;
  tier: string | null;
  visMode: string;
  tags: string[];
  online: boolean;
  lastSeenAt: string | null;
}

export interface RoomRequestInfo {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromHandle: string;
  toHandle: string;
  status: string;
  roomId: string | null;
  createdAt: string;
}

export interface RoomList {
  items: Room[];
  total: number;
  page: number;
  limit: number;
  ownedCount: number;
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
