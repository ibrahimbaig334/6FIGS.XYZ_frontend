"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PAGES = [
  { href: "/docs", label: "Start here" },
  { href: "/docs/how-it-works", label: "How it works" },
  { href: "/docs/tiers", label: "Tiers and what's shown" },
  { href: "/docs/wallets", label: "Wallets and accounts" },
  { href: "/docs/privacy", label: "Privacy and trust" },
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

  // Track the (responsive) masthead height so the sticky docs chrome sits
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
        <p className="label">6figs.xyz, the handbook</p>
        <h1>The handbook</h1>
        <p className="fine">
          How proving your holdings works, what we can and cannot see, and why.
        </p>
      </div>
      <div className="docs-body">
        <aside className="docs-nav" aria-label="Handbook chapters">
          <p className="docs-nav-head">Contents</p>
          {PAGES.map((p, i) => (
            <Link
              key={p.href}
              href={p.href}
              className={isActive(p.href) ? "active" : ""}
              aria-current={isActive(p.href) ? "page" : undefined}
            >
              <span className="docs-nav-num num">
                {String(i + 1).padStart(2, "0")}
              </span>
              {p.label}
            </Link>
          ))}
        </aside>
        <article className="docs-article">
          <div className="docs-progress" aria-hidden="true">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          {children}
        </article>
      </div>
    </section>
  );
}
