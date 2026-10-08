"use client";

/**
 * Wallet badge for an enrolled wallet. AppKit does not expose per-name
 * adapter icons the way the old Solana stack did, so this renders the letter
 * badge with the wallet label as the tooltip.
 */
export default function WalletIcon({
  name,
  letter,
}: {
  name: string;
  letter: string;
}) {
  return (
    <span
      className="chain-badge sol"
      title={name}
      style={{ padding: "0.4rem 0.8rem", fontSize: 15 }}
    >
      {letter}
    </span>
  );
}