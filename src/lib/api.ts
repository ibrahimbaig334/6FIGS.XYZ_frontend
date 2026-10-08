"use client";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const KEY = "sixfigs-token";

export const isDevnet =
  (process.env.NEXT_PUBLIC_CHAIN_MODE ?? "devnet") === "devnet";

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(KEY);
}
export function setToken(t: string) {
  localStorage.setItem(KEY, t);
}
export function clearToken() {
  localStorage.removeItem(KEY);
}

/** Error with HTTP status; status 0 = network unreachable. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* No client-side cache by design: every call hits the backend, which owns all
 * caching (Redis). Guarantees fresh data on every sort/filter/navigation. */

async function rawFetch<T>(
  method: string,
  path: string,
  body: unknown,
  token: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
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
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("sixfigs-auth"));
  }
  if (!res.ok)
    throw new ApiError(
      typeof data.message === "string"
        ? data.message
        : `Request failed (${res.status})`,
      res.status,
    );
  return data as T;
}

export async function api<T>(
  path: string,
  opts?: { method?: string; body?: unknown; auth?: boolean },
): Promise<T> {
  const method = (opts?.method ?? "GET").toUpperCase();
  const useAuth = opts?.auth !== false;
  const token = useAuth ? getToken() : null;
  return rawFetch<T>(method, path, opts?.body, token);
}

/**
 * Turn a caught error into a user-facing REASON (never a blank failure):
 * - network down → "Can't reach the server…"
 * - 4xx → the backend's own curated message ("Handle already taken", "Room is full…")
 * - anything else → the caller's action-specific fallback
 */
export function errMsg(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return "Can't reach the server — try again";
    if (e.status >= 400 && e.status < 500) return e.message;
  }
  return fallback;
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
  name: string | null;
  /** Null for tee-linked wallets: the backend stores no address. */
  address: string | null;
  display: string;
}

export interface WalletBalance {
  walletId: string;
  chain: string;
  usd: number;
}

export interface TeeWalletView {
  id: string;
  family: string;
  label: string | null;
}

/** Attested view: tier facts and disclosed symbols, never amounts. */
export interface TeeEligibility {
  source: "tee";
  tier: string | null;
  tierId: number;
  portfolioBand: string;
  topAssets: string[];
  wallets: TeeWalletView[];
  walletCount: number;
  verifiedAt: string;
  expiresAt: string;
  stale: boolean;
  verified: boolean;
}

/** Wallet-only accounts get no tier: live balance reads and address columns
 *  are gone. Shown as an unverified profile until they prove through the tee. */
export interface LegacyEligibility {
  source: "legacy";
  tier: null;
  walletCount: number;
  expiresAt: null;
}

export type Eligibility = TeeEligibility | LegacyEligibility;

export interface TierInfo {
  name: string;
  min: number;
}

export async function getTiers(): Promise<{
  chainMode: string;
  tiers: TierInfo[];
}> {
  try {
    return await api<{ chainMode: string; tiers: TierInfo[] }>("/tiers", {
      auth: false,
    });
  } catch {
    return {
      chainMode: "prod",
      tiers: [
        { name: "TIER I", min: 100000 },
        { name: "TIER II", min: 300000 },
        { name: "TIER III", min: 500000 },
        { name: "TIER IV", min: 1000000 },
      ],
    };
  }
}

export interface Profile {
  id: string;
  handle: string | null;
  username?: string | null;
  visMode: string;
  tags: string[];
  eligibility: Eligibility;
  wallets: Wallet[];
}

/**
 * Optional device-free login. Attach a username + password to the current
 * (wallet) account in profile, then sign in anywhere without wallets.
 * Forgetting either is recovered by signing with a linked wallet.
 */
export async function usernameSetup(username: string, password: string) {
  return api<{ username: string }>("/auth/username/setup", {
    method: "POST",
    body: { username, password },
  });
}

export async function usernameLogin(username: string, password: string) {
  const res = await api<{ token: string }>("/auth/username/login", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
  setToken(res.token);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("sixfigs-auth"));
  return res;
}

export async function usernameChange(
  currentPassword: string,
  newPassword: string,
) {
  return api<{ ok: boolean }>("/auth/username/change", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

/** Step 2: consume the token — rename/reset/sign in. */
export async function usernameReset(
  token: string,
  username?: string,
  password?: string,
) {
  const res = await api<{ token: string; username: string | null }>(
    "/auth/username/reset",
    {
      method: "POST",
      body: {
        token,
        ...(username !== undefined ? { username } : {}),
        ...(password !== undefined ? { password } : {}),
      },
      auth: false,
    },
  );
  setToken(res.token);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("sixfigs-auth"));
  return res;
}

export interface TeeAddPrep {
  identityNullifier: string;
  escrowBlob: unknown;
}

/** Single-use tee registration nonce bound to this session. Verified users
 *  also receive the stored identity and opaque escrow blob for an addition. */
export async function teeNonce(): Promise<{ nonce: string; add?: TeeAddPrep }> {
  return api("/eligibility/tee-nonce", { method: "POST" });
}

/** Sessionless wallet login through the enclave: resolves (or creates) the
 *  owner from attested nullifiers and returns a session token. */
export async function teeLogin(signed: unknown, escrowBlob?: unknown) {
  const res = await api<{ token: string }>("/eligibility/tee-login", {
    method: "POST",
    body: escrowBlob ? { signed, escrowBlob } : { signed },
    auth: false,
  });
  setToken(res.token);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("sixfigs-auth"));
  return res;
}

/** Sessionless identify for username recovery: which account holds these
 *  wallets? Returns the username plus a single-use recovery token. */
export async function teeIdentify(signed: unknown) {
  return api<{ username: string | null; recoveryToken: string }>(
    "/eligibility/tee-identify",
    { method: "POST", body: { signed }, auth: false },
  );
}

/** Submit an attested registration. Additions carry the merged escrow blob
 *  inside the signed result, so no separate blob is needed. The endpoint
 *  returns the attested eligibility view; callers get the full refreshed
 *  profile (registration is persisted synchronously before this fetch). */
export async function teeRegister(
  signed: unknown,
  escrowBlob?: unknown,
): Promise<Profile> {
  await api("/eligibility/tee-register", {
    method: "POST",
    body: escrowBlob ? { signed, escrowBlob } : { signed },
  });
  return api<Profile>("/profile/user");
}

/** Force a silent freshness re-verification now. */
export async function teeRecheck(): Promise<unknown> {
  return api("/eligibility/tee-recheck", { method: "POST" });
}

/**
 * Session-authorized wallet removal. `walletId` is the opaque wallet
 * nullifier from the tee view; no wallet signature or address is involved.
 * Returns the refreshed profile with the new tier and wallet set.
 */
export async function removeTeeWallet(walletId: string): Promise<Profile> {
  await api(`/eligibility/tee-wallet/${encodeURIComponent(walletId)}`, {
    method: "DELETE",
  });
  return api<Profile>("/profile/user");
}

/**
 * Disconnect every wallet: wipes the attested verification (identity,
 * bindings, tier cache). The username sign-in survives. Idempotent.
 */
export async function resetTeeIdentity(): Promise<void> {
  await api("/eligibility/tee-identity", { method: "DELETE" });
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
  creatorHandle: string;
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
  canEnter: boolean;
  joinReason: string | null;
  creatorHandle: string;
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
  matchId: string | null;
  gameId: string | null;
  createdAt: string;
}

export interface FriendList {
  items: Friend[];
  total: number;
  page: number;
  limit: number;
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
  const s = Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
