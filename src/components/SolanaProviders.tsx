"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import { TrustWalletAdapter } from "@solana/wallet-adapter-trust";
import "@solana/wallet-adapter-react-ui/styles.css";
import { isDevnet } from "../lib/api";

const DEVNET_RPC = "https://api.devnet.solana.com";
const MAINNET_RPC = "https://api.mainnet-beta.solana.com";

/** Solana wallet stack (connection only used for signing — no transactions). */
export default function SolanaProviders({ children }: { children: React.ReactNode }) {
  const endpoint = isDevnet ? DEVNET_RPC : MAINNET_RPC;
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
