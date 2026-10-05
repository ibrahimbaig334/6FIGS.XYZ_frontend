import Link from "next/link";

const ORDER = [
  { href: "/docs", label: "Start here" },
  { href: "/docs/how-it-works", label: "How it works" },
  { href: "/docs/tiers", label: "Tiers & what's shown" },
  { href: "/docs/wallets", label: "Wallets & accounts" },
  { href: "/docs/privacy", label: "Privacy & trust" },
  { href: "/docs/faq", label: "FAQ" },
];

export function Pager({ current }: { current: string }) {
  const idx = ORDER.findIndex((p) => p.href === current);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
  return (
    <div className="docs-pager">
      {prev ? (
        <Link href={prev.href} className="docs-pager-link">
          ← {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="docs-pager-link next">
          {next.label} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
