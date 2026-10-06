import type { Metadata } from "next";
import { FlowDiagram } from "./components/diagrams";
import { Pager } from "./components/pager";
import { DocHeader } from "./components/doc-header";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Docs: Start here",
};

const CHAPTERS = [
  {
    href: "/docs/how-it-works",
    label: "HOW IT WORKS",
    blurb:
      "The full journey of a verification, in five steps — who sees what at each point.",
  },
  {
    href: "/docs/tiers",
    label: "TIERS & WHAT'S SHOWN",
    blurb:
      "The four tiers, the bands behind them, and exactly which facts about your portfolio are visible.",
  },
  {
    href: "/docs/wallets",
    label: "WALLETS & ACCOUNTS",
    blurb:
      "Adding wallets with one signature, removing a lost wallet, and why your wallet set is your account.",
  },
  {
    href: "/docs/privacy",
    label: "PRIVACY & TRUST",
    blurb:
      "What the server stores, what Google sees, where the honest tradeoffs are. No hand-waving.",
  },
  {
    href: "/docs/faq",
    label: "FAQ",
    blurb:
      "Spam tokens, price swings, losing a device, deleting your account — the questions people actually ask.",
  },
];

export default function DocsIndex() {
  return (
    <>
      <DocHeader
        index="01"
        chapter="START HERE"
        title={
          <>
            Proof of bags, <span className="accent">in plain words.</span>
          </>
        }
        lede={
          <>
            6FIGS proves you hold six figures or more in crypto — without
            ever seeing your address or your balance. Not &ldquo;we promise
            not to look.&rdquo; Provable: the code that would see your data
            is sealed, attested, and public.
          </>
        }
      />

      <div className="docs-card">
        <p className="mono-label">THE DEAL, IN THREE LINES</p>
        <ul className="docs-list">
          <li>
            <strong>Prove you hold.</strong> Log in, connect your wallets,
            sign one message per wallet. No transaction, no gas.
          </li>
          <li>
            <strong>A sealed enclave reads your balances</strong> and prices
            them, computes your tier, then forgets your addresses.
          </li>
          <li>
            <strong>Only your tier survives.</strong> What 6figs keeps is a
            badge — never a number, never a wallet.
          </li>
        </ul>
      </div>

      <FlowDiagram />

      <h2 className="docs-h2">What you&apos;ll find here</h2>
      <div className="docs-grid">
        {CHAPTERS.map((c, i) => (
          <a className="docs-grid-card" href={c.href} key={c.href}>
            <span className="docs-grid-num">
              CHAPTER {String(i + 2).padStart(2, "0")}
            </span>
            <p className="mono-label">{c.label}</p>
            <p className="fine">{c.blurb}</p>
          </a>
        ))}
      </div>

      <div className="docs-callout">
        <p className="mono-label">THE ONE-SENTENCE VERSION</p>
        <p>
          Your wallet set is your identity; an attested enclave computes your
          tier inside a sealed box and signs the answer; the 6figs server can
          verify that answer cryptographically without ever learning
          anything it wasn&apos;t already told.
        </p>
      </div>

      <Pager current="/docs" />
    </>
  );
}
