"use client";

import {
  encryptEscrowBlob,
  RegistrationClient,
  type PreparedAddition,
  type PreparedRegistration,
  type PreparedRemoval,
  type WalletDescriptor,
} from "@sixfigs/tee/client";
import type { SignedRegistration } from "@sixfigs/tee/shared";
import { teeNonce, teeRegister, teeLogin, api, type Profile } from "./api";

export interface EnclaveConfig {
  enclaveUrl: string;
  allowedImageDigests: string[];
  allowedProjects: string[];
  requiredEscrowKeyProviders?: string[];
}

/** Fails closed when the enclave is not configured. */
export function enclaveConfig(): EnclaveConfig {
  const enclaveUrl = (process.env.NEXT_PUBLIC_ENCLAVE_URL ?? "").trim();
  const allowedImageDigests = (process.env.NEXT_PUBLIC_IMAGE_DIGEST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const allowedProjects = (process.env.NEXT_PUBLIC_GCP_PROJECT ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const requiredEscrowKeyProviders = (
    process.env.NEXT_PUBLIC_REQUIRED_ESCROW_KEY_PROVIDERS ?? ""
  )
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (!enclaveUrl || !allowedImageDigests.length || !allowedProjects.length) {
    throw new Error(
      "Enclave is not configured (NEXT_PUBLIC_ENCLAVE_URL / NEXT_PUBLIC_IMAGE_DIGEST / NEXT_PUBLIC_GCP_PROJECT)",
    );
  }
  return {
    enclaveUrl,
    allowedImageDigests,
    allowedProjects,
    ...(requiredEscrowKeyProviders.length
      ? { requiredEscrowKeyProviders }
      : {}),
  };
}

/**
 * Google Confidential Space OIDC JWKS. The SDK's default path fetches the
 * issuer's `.well-known/openid-configuration` first, but that document is
 * served as `text/html` with no `access-control-allow-origin`, so the browser
 * (Firefox especially) rejects it with a generic "NetworkError" before the
 * attestation is ever checked. This JWKS endpoint is CORS-enabled, so we pin
 * it and skip the discovery hop. The key is still fetched live from Google —
 * nothing is baked in — preserving the attestation trust anchor.
 */
const GOOGLE_CS_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/metadata/jwk/signer@confidentialspace-sign.iam.gserviceaccount.com";

let jwksPromise: Promise<{ keys: Array<Record<string, unknown>> }> | null =
  null;

/**
 * Module-level run-once: concurrent twins (StrictMode double-mount, rapid
 * re-presses) proving/signing/submitting the SAME key join one promise
 * instead of colliding on single-use nonces and double popups. Entries
 * clear on settle, so retries always run fresh.
 */
const inflight = new Map<string, Promise<unknown>>();
export function onceByKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn().finally(() => {
    if (inflight.get(key) === p) inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
function loadGoogleJwks(): Promise<{ keys: Array<Record<string, unknown>> }> {
  if (!jwksPromise) {
    jwksPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(GOOGLE_CS_JWKS_URL, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`);
        const jwks = (await res.json()) as { keys?: unknown };
        if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) {
          throw new Error("JWKS document has no keys");
        }
        return jwks as { keys: Array<Record<string, unknown>> };
      } finally {
        clearTimeout(timer);
      }
    })().catch((e) => {
      jwksPromise = null; // allow retry on a transient network failure
      throw e;
    });
  }
  return jwksPromise;
}

export interface TeeWalletInput {
  family: "evm" | "solana";
  chainId: number;
  address: string;
  label?: string;
}

/**
 * Warm the attestation trust anchor ahead of a prove flow. The Google JWKS
 * fetch is the only network hop in client construction; firing it while the
 * user reads the door keeps it off the prepare critical path. Cached
 * module-wide and safe to call often; silent on failure, since prepare
 * retries the same fetch anyway.
 */
export function prewarmTee(): void {
  void loadGoogleJwks().catch(() => {});
}

/**
 * Wallets proven in this browser session (by address key). Lets the add
 * flow warn "already connected" BEFORE any popup when the user re-picks a
 * wallet they just proved — the backend still rejects cross-session
 * duplicates. Cleared on any disconnect (a freed wallet may be re-added).
 */
const sessionProvedKeys = new Set<string>();

export function markWalletProved(key: string) {
  sessionProvedKeys.add(key);
}

export function isWalletProved(key: string) {
  return sessionProvedKeys.has(key);
}

export function clearProvedWallets() {
  sessionProvedKeys.clear();
}

function toDescriptor(wallet: TeeWalletInput): WalletDescriptor {
  return {
    family: wallet.family,
    chainId: wallet.chainId,
    address: wallet.address,
    ...(wallet.label ? { label: wallet.label } : {}),
  };
}

async function newClient(): Promise<RegistrationClient> {
  const config = enclaveConfig();
  const jwks = await loadGoogleJwks();
  return new RegistrationClient({
    enclaveUrl: config.enclaveUrl,
    // Bound wrapper: the SDK calls `this.fetchImpl(...)`, which makes `this` the
    // client instance. Firefox's native fetch rejects that ("'fetch' called on
    // an object that does not implement interface Window"), so bind to window.
    fetchImpl: (...args: Parameters<typeof fetch>) => fetch(...args),
    policy: {
      allowedImageDigests: config.allowedImageDigests,
      allowedProjects: config.allowedProjects,
      ...(config.requiredEscrowKeyProviders
        ? { requiredEscrowKeyProviders: config.requiredEscrowKeyProviders }
        : {}),
      // Skips the non-CORS discovery fetch (see loadGoogleJwks).
      jwks,
    },
  });
}

/**
 * Establish: prepare the ownership message for a full wallet set. The backend
 * nonce binds the attempt to this session; every wallet signs the same message.
 */
export async function prepareSet(input: {
  wallets: TeeWalletInput[];
}): Promise<{ client: RegistrationClient; prepared: PreparedRegistration }> {
  // Independent hops, one wait: the trust anchor and the session nonce.
  const [client, { nonce }] = await Promise.all([newClient(), teeNonce()]);
  const prepared = client.prepare({
    wallets: input.wallets.map(toDescriptor),
    disclosure: "hidden",
    nonce,
  });
  return { client, prepared };
}

/**
 * Sessionless establish-prepare for wallet login / identify: no server
 * round trip at all — the SDK mints a fresh nonce and the backend claims it
 * atomically at submit (first submitter wins; the attested creation time
 * bounds replays). Nothing to lose between prepare and submit.
 */
export async function prepareSetPublic(input: {
  wallets: TeeWalletInput[];
}): Promise<{ client: RegistrationClient; prepared: PreparedRegistration }> {
  const client = await newClient();
  // No server nonce: the SDK mints a fresh one per prepare (input.nonce
  // falls back to random inside `prepare` when omitted).
  const prepared = client.prepare({
    wallets: input.wallets.map(toDescriptor),
    disclosure: "hidden",
  });
  return { client, prepared };
}

/** Establish: submit signatures, escrow the set, and register with the backend. */
export async function submitSet(input: {
  client: RegistrationClient;
  prepared: PreparedRegistration;
  wallets: TeeWalletInput[];
  signatures: Record<string, string>;
}): Promise<{ profile: Profile; signed: SignedRegistration }> {
  const { client, prepared, wallets, signatures } = input;
  const signed = await client.submit({ prepared, signatures });
  const hello = await client.hello();
  const escrowBlob = await encryptEscrowBlob(
    hello.escrowPublicKey,
    wallets.map((w) => ({
      family: w.family,
      chainId: w.chainId,
      address: w.address,
      ...(w.label ? { label: w.label } : {}),
    })),
  );
  return { profile: await teeRegister(signed, escrowBlob), signed };
}

/**
 * Sessionless establish-submit for wallet login: same escrow, but the
 * backend resolves (or creates) the owner from attested nullifiers and
 * returns a session token instead of requiring one.
 */
export async function submitSetSessionless(input: {
  client: RegistrationClient;
  prepared: PreparedRegistration;
  wallets: TeeWalletInput[];
  signatures: Record<string, string>;
}): Promise<{ profile: Profile; signed: SignedRegistration }> {
  const { client, prepared, wallets, signatures } = input;
  const signed = await client.submit({ prepared, signatures });
  const hello = await client.hello();
  const escrowBlob = await encryptEscrowBlob(
    hello.escrowPublicKey,
    wallets.map((w) => ({
      family: w.family,
      chainId: w.chainId,
      address: w.address,
      ...(w.label ? { label: w.label } : {}),
    })),
  );
  await teeLogin(signed, escrowBlob);
  return { profile: await api<Profile>("/profile/user"), signed };
}

/** Sessionless submit for identify: no escrow stored, no session minted —
 *  just the countersigned result for the backend to look up. */
export async function submitSignedOnly(input: {
  client: RegistrationClient;
  prepared: PreparedRegistration;
  signatures: Record<string, string>;
}): Promise<SignedRegistration> {
  const { client, prepared, signatures } = input;
  return client.submit({ prepared, signatures });
}

/**
 * Add: prepare the compact consent for one or more new wallets. The backend
 * returns the stored identity plus the opaque escrow blob, which the browser
 * forwards untouched — the old wallets are never needed or re-signed.
 */
export async function prepareWalletAddition(input: {
  added: TeeWalletInput[];
}): Promise<{ client: RegistrationClient; prepared: PreparedAddition }> {
  // Independent hops, one wait: the trust anchor and the session nonce.
  const [client, prep] = await Promise.all([newClient(), teeNonce()]);
  if (!prep.add) {
    throw new Error("This account has no verified wallet set to extend yet");
  }
  const prepared = client.prepareAddition({
    added: input.added.map(toDescriptor),
    escrowBlob: prep.add.escrowBlob as Parameters<
      RegistrationClient["prepareAddition"]
    >[0]["escrowBlob"],
    accountIdentityNullifier: prep.add.identityNullifier,
    nonce: prep.nonce,
  });
  return { client, prepared };
}

/** Add: submit the new wallets' signatures; the enclave merges and re-escrows. */
export async function submitWalletAddition(input: {
  client: RegistrationClient;
  prepared: PreparedAddition;
  signatures: Record<string, string>;
}): Promise<{ profile: Profile; signed: SignedRegistration }> {
  const { client, prepared, signatures } = input;
  const signed = await client.submitAddition({ prepared, signatures });
  return { profile: await teeRegister(signed), signed };
}

/**
 * Remove: prepare the threshold consent. The kept wallets must all be
 * connected; the removed wallet is only an address (it may be lost).
 */
export async function prepareWalletRemoval(input: {
  kept: TeeWalletInput[];
  remove: TeeWalletInput[];
}): Promise<{ client: RegistrationClient; prepared: PreparedRemoval }> {
  // Independent hops, one wait: the trust anchor and the session nonce.
  const [client, prep] = await Promise.all([newClient(), teeNonce()]);
  if (!prep.add) {
    throw new Error(
      "This account has no verified wallet set to remove from yet",
    );
  }
  const prepared = client.prepareRemoval({
    kept: input.kept.map(toDescriptor),
    remove: input.remove.map(toDescriptor),
    escrowBlob: prep.add.escrowBlob as Parameters<
      RegistrationClient["prepareRemoval"]
    >[0]["escrowBlob"],
    accountIdentityNullifier: prep.add.identityNullifier,
    nonce: prep.nonce,
  });
  return { client, prepared };
}

/** Remove: submit the kept wallets' signatures; the enclave prunes and re-escrows. */
export async function submitWalletRemoval(input: {
  client: RegistrationClient;
  prepared: PreparedRemoval;
  signatures: Record<string, string>;
}): Promise<Profile> {
  const { client, prepared, signatures } = input;
  const signed = await client.submitRemoval({ prepared, signatures });
  return teeRegister(signed);
}
