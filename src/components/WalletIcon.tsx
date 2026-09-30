"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

/**
 * Brand icon for a connected wallet (adapter ships a data-URL icon for every
 * configured/discovered wallet). Falls back to the letter badge when the
 * name doesn't match a known wallet. Mounted gate keeps SSR/client markup
 * identical (wallet-standard discovery differs per environment).
 */
export default function WalletIcon({
  name,
  letter,
}: {
  name: string;
  letter: string;
}) {
  const { wallets } = useWallet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fallback = (
    <span
      className="chain-badge sol"
      style={{ padding: "0.4rem 0.8rem", fontSize: 15 }}
    >
      {letter}
    </span>
  );
  if (!mounted) return fallback;
  const icon = wallets.find((w) => String(w.adapter.name) === name)?.adapter
    .icon;
  if (!icon) return fallback;
  return (
    <Image
      className="wallet-icon"
      src={icon}
      alt={`${name} icon`}
      width={34}
      height={34}
      unoptimized
    />
  );
}
