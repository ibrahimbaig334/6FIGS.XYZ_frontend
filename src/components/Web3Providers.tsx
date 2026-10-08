"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  solana,
  solanaDevnet,
  type AppKitNetwork,
} from "@reown/appkit/networks";
import { WagmiProvider } from "wagmi";
import { isDevnet } from "../lib/api";

/**
 * One wallet stack for both families (Reown AppKit: wagmi + Solana adapters).
 * Used only to select a wallet and sign messages — the product never sends a
 * chain transaction and secret material never leaves the wallet.
 *
 * The Reown project ID is required for the connect modal. Without it the app
 * still renders; wallet actions fail closed with a clear message.
 */
const projectId = (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "").trim();

const evmNetworks: AppKitNetwork[] = [
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
];
const solanaNetwork = isDevnet ? solanaDevnet : solana;
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  solanaNetwork,
];

const metadata = {
  name: "6FIGS.XYZ",
  description: "Proof of bags. Room for holders.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://6figs.xyz").trim(),
  icons: ["https://6figs.xyz/favicon.ico"],
};

let appKit: ReturnType<typeof createAppKit> | undefined;
let wagmiAdapter: WagmiAdapter | undefined;

if (projectId) {
  wagmiAdapter = new WagmiAdapter({
    projectId,
    ssr: true,
    networks: evmNetworks,
  });
  appKit = createAppKit({
    adapters: [wagmiAdapter, new SolanaAdapter()],
    networks,
    projectId,
    metadata,
    themeMode: "light",
    enableCoinbase: false,
    features: { email: false, socials: false, analytics: false },
  });
}

/** False until a Reown project ID is configured; wallet actions must check. */
export function isAppKitReady(): boolean {
  return Boolean(appKit);
}

export async function openWalletModal(): Promise<void> {
  await appKit?.open();
}

export async function disconnectWallets(): Promise<void> {
  await appKit?.disconnect();
}

const queryClient = new QueryClient();

export default function Web3Providers({ children }: { children: ReactNode }) {
  if (!wagmiAdapter) return <>{children}</>;
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}