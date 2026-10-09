import type { Metadata } from "next";
import { FlowDiagram } from "./components/diagrams";
import { Pager } from "./components/pager";
import { DocHeader } from "./components/doc-header";

export const metadata: Metadata = {
  title: "6figs. Docs: Start here",
};

const CHAPTERS = [
  {
    href: "/docs/how-it-works",
    label: "HOW IT WORKS",
    blurb:
      "The full journey of a verification, in five steps. Who sees what at each point.",
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
      "Spam tokens, price swings, losing a device, deleting your account. The questions people actually ask.",
  },
];

export default function DocsIndex() {
  return (
    <>
      <DocHeader
        title={
          <>
            Proof of bags, <span className="accent">in plain words.</span>
          </>
        }
        lede={
          <>
            6figs proves you hold six figures or more in crypto, without
            ever seeing your address or your balance. Not &ldquo;we promise
            not to look.&rdquo; Provable: the code that would see your data
            is sealed, attested, and public.
          </>
        }
      />

      <div className="docs-card">
        <p className="label">THE DEAL, IN THREE LINES</p>
        <div className="deal-row">
          <p className="label">01 · Prove you hold</p>
          <p className="docs-body-text">
            Connect your wallets, sign one message per wallet. No
            transaction, no gas.
          </p>
        </div>
        <div className="deal-row">
          <p className="label">02 · A sealed box does the math</p>
          <p className="docs-body-text">
            An enclave reads your balances and prices them, computes your
            tier, then forgets your addresses.
          </p>
        </div>
        <div className="deal-row">
          <p className="label">03 · Only your tier survives</p>
          <p className="docs-body-text">
            What 6figs keeps is a badge. Never a number, never a wallet.
          </p>
        </div>
      </div>

      <FlowDiagram />

      <h2 className="docs-h2">What you&apos;ll find here</h2>
      <div className="docs-grid">
        {CHAPTERS.map((c, i) => (
          <a className="docs-grid-card" href={c.href} key={c.href}>
            <span className="docs-grid-num">
              CHAPTER {String(i + 2).padStart(2, "0")}
            </span>
            <p className="label">{c.label}</p>
            <p className="fine">{c.blurb}</p>
          </a>
        ))}
      </div>

      <div className="docs-callout">
        <p className="label">THE ONE-SENTENCE VERSION</p>
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
