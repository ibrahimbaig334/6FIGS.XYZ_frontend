"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import { TrustWalletAdapter } from "@solana/wallet-adapter-trust";
import "@solana/wallet-adapter-react-ui/styles.css";
import { isDevnet } from "../lib/api";

/** Wallet RPC: explicit NEXT_PUBLIC_RPC_URL wins, otherwise devnet /
 *  mainnet default follows the environment. Only used for signing. */
const RPC_URL =
  (process.env.NEXT_PUBLIC_RPC_URL ?? "").trim() ||
  (isDevnet
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com");

/** Solana wallet stack (connection only used for signing — no transactions). */
export default function SolanaProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint = RPC_URL;
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new TrustWalletAdapter(),
      // Backpack, OKX, Exodus, … appear automatically via wallet-standard discovery.
    ],
    [],
  );
  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* Connect only ever happens after an explicit CONNECT WALLET press. */}
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
