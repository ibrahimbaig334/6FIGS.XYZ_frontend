"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PAGES = [
  { href: "/docs", label: "START HERE" },
  { href: "/docs/how-it-works", label: "HOW IT WORKS" },
  { href: "/docs/tiers", label: "TIERS & WHAT'S SHOWN" },
  { href: "/docs/wallets", label: "WALLETS & ACCOUNTS" },
  { href: "/docs/privacy", label: "PRIVACY & TRUST" },
  { href: "/docs/faq", label: "FAQ" },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <section className="page-enter docs-shell">
      <div className="docs-head">
        <p className="mono-label">6FIGS.XYZ — PROTOCOL DOCS</p>
        <p className="fine">
          How proving your bags works, what we can and cannot see, and why.
        </p>
      </div>
      <div className="docs-body">
        <aside className="side-tabs" aria-label="Docs">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={
                (ready && pathname === p.href) ||
                (ready && p.href !== "/docs" && pathname.startsWith(p.href))
                  ? "active"
                  : ""
              }
            >
              {p.label}
            </Link>
          ))}
        </aside>
        <article className="docs-article">{children}</article>
      </div>
    </section>
  );
}
