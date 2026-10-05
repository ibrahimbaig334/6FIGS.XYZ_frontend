import type { Metadata } from "next";
import { FlowDiagram } from "./components/diagrams";
import { Pager } from "./components/pager";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Docs: Start here",
};

export default function DocsIndex() {
  return (
    <>
      <h1 className="docs-title">Proof of bags, in plain words.</h1>
      <p className="docs-lede">
        6FIGS proves you hold six figures or more in crypto — without ever
        seeing your address or your balance. Not &ldquo;we promise not to
        look.&rdquo; Provable: the code that would see your data is sealed,
        attested, and public.
      </p>

      <div className="docs-card">
        <p className="mono-label">THE DEAL, IN THREE LINES</p>
        <ul className="docs-list">
          <li>
            <strong>Prove you hold.</strong> Connect your wallets, sign one
            message per wallet. No transaction, no gas.
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
        <a className="docs-grid-card" href="/docs/how-it-works">
          <p className="mono-label">HOW IT WORKS</p>
          <p className="fine">
            The full journey of a verification, in five steps — who sees what
            at each point.
          </p>
        </a>
        <a className="docs-grid-card" href="/docs/tiers">
          <p className="mono-label">TIERS &amp; WHAT&apos;S SHOWN</p>
          <p className="fine">
            The four tiers, the bands behind them, and exactly which facts
            about your portfolio are visible.
          </p>
        </a>
        <a className="docs-grid-card" href="/docs/wallets">
          <p className="mono-label">WALLETS &amp; ACCOUNTS</p>
          <p className="fine">
            Adding wallets with one signature, removing a lost wallet, and
            why your wallet set <em>is</em> your account.
          </p>
        </a>
        <a className="docs-grid-card" href="/docs/privacy">
          <p className="mono-label">PRIVACY &amp; TRUST</p>
          <p className="fine">
            What the server stores, what Google sees, where the honest
            tradeoffs are. No hand-waving.
          </p>
        </a>
        <a className="docs-grid-card" href="/docs/faq">
          <p className="mono-label">FAQ</p>
          <p className="fine">
            Spam tokens, price swings, losing a device, deleting your
            account — the questions people actually ask.
          </p>
        </a>
      </div>

      <div className="docs-card">
        <p className="mono-label">THE ONE-SENTENCE VERSION</p>
        <p className="docs-body-text">
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
