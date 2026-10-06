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
  const [progress, setProgress] = useState(0);
  useEffect(() => setReady(true), []);

  // Track the (responsive) masthead height so sticky docs chrome sits
  // exactly below it at every breakpoint.
  useEffect(() => {
    const sync = () => {
      const h =
        document
          .querySelector<HTMLElement>(".masthead")
          ?.getBoundingClientRect().height ?? 0;
      if (h > 0)
        document
          .querySelector<HTMLElement>(".docs-shell")
          ?.style.setProperty("--docs-top", `${h}px`);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    setProgress(0);
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const isActive = (href: string) =>
    ready &&
    (pathname === href || (href !== "/docs" && pathname.startsWith(href)));

  return (
    <section className="page-enter docs-shell">
      <div className="docs-head">
        <p className="mono-label">6FIGS.XYZ — PROTOCOL DOCS</p>
        <h1>The handbook</h1>
        <p className="fine">
          How proving your bags works, what we can and cannot see, and why.
        </p>
      </div>
      <div className="docs-body">
        <aside className="docs-nav" aria-label="Docs chapters">
          <p className="docs-nav-head">CONTENTS</p>
          {PAGES.map((p, i) => (
            <Link
              key={p.href}
              href={p.href}
              className={isActive(p.href) ? "active" : ""}
              aria-current={isActive(p.href) ? "page" : undefined}
            >
              <span className="docs-nav-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              {p.label}
            </Link>
          ))}
        </aside>
        <article className="docs-article">
          <div
            className="docs-progress"
            aria-hidden="true"
          >
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          {children}
        </article>
      </div>
    </section>
  );
}
