import type { Metadata } from "next";
import { Pager } from "../components/pager";
import { DocHeader } from "../components/doc-header";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Docs: Wallets & accounts",
};

export default function Wallets() {
  return (
    <>
      <DocHeader
        index="04"
        chapter="WALLETS & ACCOUNTS"
        title={
          <>
            Your wallet set <span className="accent">is your account.</span>
          </>
        }
        lede={
          <>
            You sign in with a wallet — then your account is the set of
            wallets you enrolled. No password to lose, no seed phrase to
            hide in a drawer. A username + password is optional, for signing
            in on devices where your wallets aren&apos;t.
          </>
        }
      />

      <h2 className="docs-h2">Sign in with a wallet, prove with wallets</h2>
      <p className="docs-body-text">
        Your session starts the moment you connect a wallet and sign one
        short message — that&apos;s the whole login, on any device. Your
        tier, rooms, and profile hang off the set of wallets you enrolled:
        connect them on your profile, sign once each, and the enclave does
        the rest. Lose your session and the same signature brings you back;
        the wallets re-prove what you hold.
      </p>
      <div className="docs-callout">
        <p className="mono-label">WHY THIS MATTERS</p>
        <p>
          Most platforms make you choose between &ldquo;one stolen password =
          account stolen&rdquo; and &ldquo;one lost secret = account gone
          forever.&rdquo; Anchoring the account in a set of wallets means
          recovery is re-proving what you still hold — not guessing what
          you lost.
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

      <h2 className="docs-h2">Removing a wallet — one tick</h2>
      <p className="docs-body-text">
        Every wallet row has an ✕ at the far right. Press it, tick the
        confirmation box, and the wallet is detached — your tier is
        recalculated from the remaining wallets on the spot, no signatures
        needed. You can&apos;t remove your only wallet this way (use
        DISCONNECT ALL to start over); LOG OUT just signs you out.
      </p>
      <ul className="docs-list">
        <li>
          <strong>Removing one wallet:</strong> ✕ on its row, tick to
          confirm. The badge updates to what the rest still proves.
        </li>
        <li>Removed wallets can be added back any time with one signature.</li>
      </ul>
      <div className="docs-callout danger">
        <p className="mono-label">⚠️ THE HONEST FLIP SIDE</p>
        <p>
          Anyone signed in as you can remove a wallet the same way.
          That&apos;s the price of one-click removal, and it&apos;s why a
          username + password (profile, optional) stands guard in front of
          it on shared devices.
        </p>
      </div>

      <h2 className="docs-h2">Username — optional device-free sign-in</h2>
      <p className="docs-body-text">
        Wallets not at hand? Set a username + password once in profile and
        sign in anywhere without connecting anything:
      </p>
      <ul className="docs-list">
        <li>One wallet signature to attach them — never typed into a dapp.</li>
        <li>Link a wallet for recovery: forget either and a wallet
          signature re-issues them (no email involved, ever).</li>
        <li>Changing the password signs out every other session instantly.</li>
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
