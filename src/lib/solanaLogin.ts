import {
  api,
  b58encode,
  getToken,
  loginMessage,
  Profile,
  setToken,
} from "./api";

export type WalletSignFn = (
  msg: Uint8Array,
) => Promise<Uint8Array | { signature: Uint8Array }>;

export interface LoginResult {
  token: string;
  profile?: Profile;
}

/** Replay window: late callers after a success share the same result
 *  (no second nonce/add flow). */
const REPLAY_TTL_MS = 15000;

/**
 * Singleton Solana login coordinator. Many SolanaConnect instances can mount
 * at once (profile hero + empty slots) and StrictMode double-fires effects —
 * without this, N concurrent flows fetch N nonces that overwrite each other
 * server-side, so EVERY verify fails with "nonce expired". Here exactly one
 * flow runs per address; everyone else joins the same promise (one wallet
 * signature popup, one verify). Successful results are replayed for
 * REPLAY_TTL_MS so staggered effect runs can never start a duplicate flow.
 */
let current: {
  address: string;
  promise: Promise<LoginResult>;
  settledAt: number | null;
} | null = null;

const LAST_ADDR_KEY = "sol_last_signed_addr";

function storeSession(token: string, address: string) {
  setToken(token);
  try {
    localStorage.setItem(LAST_ADDR_KEY, address);
  } catch {
    // private mode etc. — guard is best-effort
  }
}

/**
 * True when this address already completed login under the current token —
 * connecting it again must NOT pop a redundant signature request.
 */
export function alreadySignedIn(address: string): boolean {
  if (!getToken()) return false;
  try {
    return localStorage.getItem(LAST_ADDR_KEY) === address;
  } catch {
    return false;
  }
}

/** Profile from the most recent successful login (for already-signed-in paths). */
let lastProfile: Profile | null = null;
export function lastLoggedInProfile(): Profile | null {
  return lastProfile;
}

async function doLogin(
  address: string,
  sign: WalletSignFn,
  walletName: string | null,
): Promise<LoginResult> {
  const { nonce } = await api<{ nonce: string }>("/wallet/nonce", {
    method: "POST",
    body: { chain: "SOL", address },
    auth: false,
  });
  const raw = (await sign(
    new TextEncoder().encode(loginMessage("SOL", address, nonce)),
  )) as unknown as Uint8Array | { signature: Uint8Array };
  const signature = b58encode(raw instanceof Uint8Array ? raw : raw.signature);
  const endpoint = getToken() ? "/wallet/add" : "/wallet/verify";
  const res = await api<{ token: string; profile?: Profile }>(endpoint, {
    method: "POST",
    body: { chain: "SOL", address, nonce, signature, walletName },
  });
  storeSession(res.token, address);
  if (res.profile) lastProfile = res.profile;
  // Notify global listeners (Header token/socket refresh, create-page state)
  // AFTER every instance's onDone microtask has run — macrotask ordering lets
  // Header mark the just-delivered profile as fresh and skip its own
  // /profile/user fetch (the old duplicate-request storm).
  setTimeout(() => window.dispatchEvent(new Event("sixfigs-auth")), 0);
  return { token: res.token, profile: res.profile };
}

export function loginOnce(
  address: string,
  sign: WalletSignFn,
  walletName: string | null,
): Promise<LoginResult> {
  if (
    current &&
    current.address === address &&
    (current.settledAt === null ||
      Date.now() - current.settledAt < REPLAY_TTL_MS)
  ) {
    return current.promise;
  }
  const entry: {
    address: string;
    promise: Promise<LoginResult>;
    settledAt: number | null;
  } = {
    address,
    promise: undefined as unknown as Promise<LoginResult>,
    settledAt: null,
  };
  entry.promise = doLogin(address, sign, walletName)
    .then((res) => {
      entry.settledAt = Date.now();
      return res;
    })
    .catch((e) => {
      // Failed flows must be retryable immediately — only successes replay.
      if (current === entry) current = null;
      throw e;
    });
  current = entry;
  return entry.promise;
}
