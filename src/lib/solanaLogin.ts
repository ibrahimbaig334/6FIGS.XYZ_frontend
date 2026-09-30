import { api, b58encode, getToken, loginMessage, setToken } from "./api";

export type WalletSignFn = (
  msg: Uint8Array,
) => Promise<Uint8Array | { signature: Uint8Array }>;

/**
 * Singleton Solana login coordinator. Many SolanaConnect instances can mount
 * at once (profile hero + empty slots) and StrictMode double-fires effects —
 * without this, N concurrent flows fetch N nonces that overwrite each other
 * server-side, so EVERY verify fails with "nonce expired". Here exactly one
 * flow runs per address; everyone else joins the same promise (one wallet
 * signature popup, one verify).
 */
let current: { address: string; promise: Promise<string> } | null = null;

async function doLogin(
  address: string,
  sign: WalletSignFn,
  walletName: string | null,
): Promise<string> {
  const { nonce } = await api<{ nonce: string }>("/wallet/nonce", {
    method: "POST",
    body: { chain: "SOL", address },
    auth: false,
  });
  const raw = (await sign(
    new TextEncoder().encode(loginMessage("SOL", address, nonce)),
  )) as unknown as Uint8Array | { signature: Uint8Array };
  const signature = b58encode(
    raw instanceof Uint8Array ? raw : raw.signature,
  );
  const endpoint = getToken() ? "/wallet/add" : "/wallet/verify";
  const res = await api<{ token: string }>(endpoint, {
    method: "POST",
    body: { chain: "SOL", address, nonce, signature, walletName },
  });
  return res.token;
}

export function loginOnce(
  address: string,
  sign: WalletSignFn,
  walletName: string | null,
): Promise<string> {
  if (!current || current.address !== address) {
    const promise = doLogin(address, sign, walletName).finally(() => {
      if (current?.address === address) current = null;
    });
    current = { address, promise };
  }
  return current.promise;
}

const LAST_ADDR_KEY = "sol_last_signed_addr";

export function storeSession(token: string, address: string) {
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
