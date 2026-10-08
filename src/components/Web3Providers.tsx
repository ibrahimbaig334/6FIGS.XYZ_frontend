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
import PickerScrim from "./PickerScrim";

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
/**
 * Both Solana clusters are always offered. The wallet stays on whichever it
 * is already on — forcing a switch (devnet-only builds did) loops on some
 * wallets because the adapter never settles. The proof is
 * cluster-independent: the address format is identical and the enclave reads
 * the balance from its configured RPC.
 */
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  solana,
  solanaDevnet,
];

/**
 * The origin WalletConnect validates against the Reown project. It must be
 * the origin the page is actually served from, or the handshake is refused:
 * hardcoding the production domain makes every localhost run fail to connect.
 * NEXT_PUBLIC_SITE_URL pins it for production; dev falls back to the real host.
 */
function siteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (configured) return configured;
  if (typeof window !== "undefined" && window.location) {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

const metadata = {
  name: "6FIGS.XYZ",
  description: "Proof of bags. Room for holders.",
  url: siteUrl(),
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

/**
 * True when AppKit's modal element is present, painted, and has rendered its
 * shadow content. AppKit can create the element but leave it empty/transparent
 * when `open()` races its first render, so callers verify instead of trusting
 * the promise.
 */
export function isWalletModalVisible(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.querySelector("w3m-modal");
  if (!el) return false;
  const cs = getComputedStyle(el);
  const rendered =
    el.shadowRoot != null && el.shadowRoot.children.length > 0;
  return rendered && cs.display !== "none" && cs.opacity !== "0";
}

/** Open the picker, retrying once if the modal renders empty. */
export async function openWalletModalVerified(): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await openWalletModal();
    await new Promise((r) => setTimeout(r, 800));
    if (isWalletModalVisible()) return true;
    // Empty shell: dismiss and try again rather than leaving it invisible.
    await appKit?.close().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export async function disconnectWallets(): Promise<void> {
  await appKit?.disconnect();
}

/**
 * Dev aid: describe the AppKit modal element so a stuck wallet flow reports
 * facts instead of a bare spinner. Non-production only.
 */
export async function walletModalDiagnostics(): Promise<string> {
  if (typeof document === "undefined") return "ssr";
  await new Promise((r) => setTimeout(r, 400));
  const el = document.querySelector("w3m-modal");
  if (!el) {
    return "w3m-modal NOT in DOM — AppKit never mounted its modal element";
  }
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const shadow = el.shadowRoot;
  const kids = shadow
    ? Array.from(shadow.children)
        .map((c) => `${c.tagName.toLowerCase()}${c.className ? "." + String(c.className).split(" ")[0] : ""}`)
        .slice(0, 6)
        .join(",")
    : "none";
  return [
    `ua=${typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) : "?"}`,
    `origin=${typeof location !== "undefined" ? location.origin : "?"}`,
    `display=${cs.display}`,
    `visibility=${cs.visibility}`,
    `opacity=${cs.opacity}`,
    `z=${cs.zIndex}`,
    `size=${Math.round(rect.width)}x${Math.round(rect.height)}`,
    `shadow=${kids || "(empty)"}`,
  ].join(" ·");
}

const queryClient = new QueryClient();

export default function Web3Providers({ children }: { children: ReactNode }) {
  if (!wagmiAdapter) return <>{children}</>;
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <PickerScrim />
      </QueryClientProvider>
    </WagmiProvider>
  );
}