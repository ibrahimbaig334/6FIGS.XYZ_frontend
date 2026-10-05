import type { Metadata } from "next";
import { Pager } from "../components/pager";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Docs: Wallets & accounts",
};

export default function Wallets() {
  return (
    <>
      <h1 className="docs-title">Wallets &amp; accounts</h1>
      <p className="docs-lede">
        There is no separate account to create and no secret to lose. Your
        account is the set of wallets you enrolled — here&apos;s what that
        means in practice.
      </p>

      <h2 className="docs-h2">Your wallet set is your account</h2>
      <p className="docs-body-text">
        Sign in with the same wallets and you&apos;re back in — same profile,
        same tier, same rooms. No password was ever the root of your account,
        so there is no seed phrase to save and no recovery phrase to hide in a
        drawer. Coming back after a year is just signing the same proof again.
      </p>
      <div className="docs-card">
        <p className="mono-label">WHY THIS MATTERS</p>
        <p className="docs-body-text">
          Most platforms make you choose between &ldquo;one stolen password =
          account stolen&rdquo; and &ldquo;one lost secret = account gone
          forever.&rdquo; Anchoring identity in a set of wallets (plus an
          optional email) means recovery is re-proving what you still hold —
          not guessing what you lost.
        </p>
      </div>

      <h2 className="docs-h2">Adding a wallet — one signature</h2>
      <p className="docs-body-text">
        Bought on a new chain? Connect the new wallet and sign one short
        message with it. Your existing wallets are not touched — they don&apos;t
        sign, don&apos;t reconnect, don&apos;t even need to be online. The
        enclave merges the new wallet into your sealed wallet set and re-signs
        the whole thing.
      </p>
      <ul className="docs-list">
        <li>The new wallet signs a consent message naming your account.</li>
        <li>Existing wallets stay enrolled exactly as they were.</li>
        <li>One wallet can belong to only one 6figs account, ever.</li>
      </ul>

      <h2 className="docs-h2">Removing a wallet — including a lost one</h2>
      <p className="docs-body-text">
        This is the part most platforms can&apos;t do. If a wallet is lost or
        compromised, the wallets you still hold can evict it: every remaining
        wallet signs one shared message naming the removed address. The
        removed wallet signs nothing — it can&apos;t, it&apos;s gone.
      </p>
      <ul className="docs-list">
        <li>
          <strong>Removing a wallet you hold:</strong> type its address,
          sign with the rest. It&apos;s out.
        </li>
        <li>
          <strong>Lost a wallet:</strong> same flow. N−1 wallets can always
          remove the Nth.
        </li>
        <li>An account always keeps at least one wallet — you can&apos;t
          remove your way to zero.</li>
      </ul>
      <p className="fine">
        The flip side, stated honestly: anyone holding all-but-one of your
        wallets could remove the last one. That&apos;s the price of
        recoverability, and it&apos;s why the wallets you enroll should be
        the ones you actually control.
      </p>

      <h2 className="docs-h2">Email — the optional safety net</h2>
      <p className="docs-body-text">
        You can link an email and password to your account. It is not your
        identity — the wallet set is — but a verified email lets you authorize
        wallet additions and recover your login if you&apos;re signed out.
        Verify it and you get:
      </p>
      <ul className="docs-list">
        <li>One-signature wallet additions (the email session authorizes them).</li>
        <li>Password reset if you lose your session.</li>
        <li>A second factor standing between attackers and your badge.</li>
      </ul>

      <h2 className="docs-h2">What signing actually means</h2>
      <p className="docs-body-text">
        Every signature 6figs asks for is a plain message signature — the same
        &ldquo;sign text&rdquo; popup your wallet shows for logins. It grants
        no token approvals, no spending permissions, no access to funds. If a
        signature request ever asks you to &ldquo;confirm a
        transaction,&rdquo; that is not 6figs.
      </p>

      <Pager current="/docs/wallets" />
    </>
  );
}
