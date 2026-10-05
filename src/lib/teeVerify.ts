"use client";

import {
  encryptEscrowBlob,
  RegistrationClient,
  type PreparedAddition,
  type PreparedRegistration,
  type PreparedRemoval,
  type WalletDescriptor,
} from "@sixfigs/tee/client";
import { teeNonce, teeRegister, type Profile } from "./api";

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

export interface TeeWalletInput {
  family: "evm" | "solana";
  chainId: number;
  address: string;
  label?: string;
}

function toDescriptor(wallet: TeeWalletInput): WalletDescriptor {
  return {
    family: wallet.family,
    chainId: wallet.chainId,
    address: wallet.address,
    ...(wallet.label ? { label: wallet.label } : {}),
  };
}

function newClient(): RegistrationClient {
  const config = enclaveConfig();
  return new RegistrationClient({
    enclaveUrl: config.enclaveUrl,
    policy: {
      allowedImageDigests: config.allowedImageDigests,
      allowedProjects: config.allowedProjects,
      ...(config.requiredEscrowKeyProviders
        ? { requiredEscrowKeyProviders: config.requiredEscrowKeyProviders }
        : {}),
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
  const client = newClient();
  const { nonce } = await teeNonce();
  const prepared = client.prepare({
    wallets: input.wallets.map(toDescriptor),
    disclosure: "hidden",
    nonce,
  });
  return { client, prepared };
}

/** Establish: submit signatures, escrow the set, and register with the backend. */
export async function submitSet(input: {
  client: RegistrationClient;
  prepared: PreparedRegistration;
  wallets: TeeWalletInput[];
  signatures: Record<string, string>;
}): Promise<Profile> {
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
  return teeRegister(signed, escrowBlob);
}

/**
 * Add: prepare the compact consent for one or more new wallets. The backend
 * returns the stored identity plus the opaque escrow blob, which the browser
 * forwards untouched — the old wallets are never needed or re-signed.
 */
export async function prepareWalletAddition(input: {
  added: TeeWalletInput[];
}): Promise<{ client: RegistrationClient; prepared: PreparedAddition }> {
  const client = newClient();
  const prep = await teeNonce();
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
}): Promise<Profile> {
  const { client, prepared, signatures } = input;
  const signed = await client.submitAddition({ prepared, signatures });
  return teeRegister(signed);
}

/**
 * Remove: prepare the threshold consent. The kept wallets must all be
 * connected; the removed wallet is only an address (it may be lost).
 */
export async function prepareWalletRemoval(input: {
  kept: TeeWalletInput[];
  remove: TeeWalletInput[];
}): Promise<{ client: RegistrationClient; prepared: PreparedRemoval }> {
  const client = newClient();
  const prep = await teeNonce();
  if (!prep.add) {
    throw new Error("This account has no verified wallet set to remove from yet");
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