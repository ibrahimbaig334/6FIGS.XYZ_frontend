"use client";

import {
  encryptEscrowBlob,
  RegistrationClient,
  type PreparedRegistration,
  type WalletDescriptor,
} from "@sixfigs/tee/client";
import { teeNonce, teeRegister, type Profile } from "./api";

export interface EnclaveConfig {
  enclaveUrl: string;
  allowedImageDigests: string[];
  allowedProjects: string[];
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
  if (!enclaveUrl || !allowedImageDigests.length || !allowedProjects.length) {
    throw new Error(
      "Enclave is not configured (NEXT_PUBLIC_ENCLAVE_URL / NEXT_PUBLIC_IMAGE_DIGEST / NEXT_PUBLIC_GCP_PROJECT)",
    );
  }
  return { enclaveUrl, allowedImageDigests, allowedProjects };
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

/**
 * Prepare the ownership message for a wallet set. The backend nonce binds the
 * attempt to this session; signatures are collected wallet by wallet.
 */
export async function prepareSet(input: {
  wallets: TeeWalletInput[];
  remove?: TeeWalletInput[];
}): Promise<{ client: RegistrationClient; prepared: PreparedRegistration }> {
  const config = enclaveConfig();
  const client = new RegistrationClient({
    enclaveUrl: config.enclaveUrl,
    policy: {
      allowedImageDigests: config.allowedImageDigests,
      allowedProjects: config.allowedProjects,
    },
  });
  const { nonce } = await teeNonce();
  const prepared = client.prepare({
    wallets: input.wallets.map(toDescriptor),
    ...(input.remove && input.remove.length > 0
      ? { remove: input.remove.map(toDescriptor) }
      : {}),
    disclosure: "hidden",
    nonce,
  });
  return { client, prepared };
}

/**
 * Submit collected signatures, escrow the wallet set to the enclave, and
 * register with the backend. Prefers calling only after every enrolled
 * wallet has signed; nothing is persisted on partial sets.
 */
export async function submitSet(input: {
  client: RegistrationClient;
  prepared: PreparedRegistration;
  keep: TeeWalletInput[];
  signatures: Record<string, string>;
  removalSignatures?: Record<string, string>;
}): Promise<Profile> {
  const { client, prepared, keep, signatures, removalSignatures } = input;
  const signed = await client.submit({
    prepared,
    signatures,
    ...(removalSignatures ? { removalSignatures } : {}),
  });
  const hello = await client.hello();
  const escrowBlob = await encryptEscrowBlob(
    hello.escrowPublicKey,
    keep.map((w) => ({
      family: w.family,
      chainId: w.chainId,
      address: w.address,
      ...(w.label ? { label: w.label } : {}),
    })),
  );
  return teeRegister(signed, escrowBlob);
}
