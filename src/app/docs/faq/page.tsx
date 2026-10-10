import type { Metadata } from "next";
import { Pager } from "../components/pager";
import { DocHeader } from "../components/doc-header";

export const metadata: Metadata = {
  title: "6figs. Docs: FAQ",
};

const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: "Does 6figs know how much I hold?",
    a: (
      <>
        No. Your exact total is computed inside the sealed enclave and never
        leaves it. The outside world learns only the tier, and even the tier is
        a lower bound, not a number.
      </>
    ),
  },
  {
    q: "Can signing hurt my wallets?",
    a: (
      <>
        No. Every signature we request is a plain message signature, the same
        popup your wallet shows when you log in to a dapp. It cannot move funds,
        spend tokens, or grant approvals. If a 6figs flow ever asks you to
        confirm a <em>transaction</em>, stop: that&apos;s not us.
      </>
    ),
  },
  {
    q: "What happens if I lose a wallet?",
    a: (
      <>
        Press remove on its row and tick the confirmation. The lost wallet signs
        nothing, because disconnecting takes no signature. Your tier resets on
        the spot; re-prove the wallets you still hold to restore it.
      </>
    ),
  },
  {
    q: "What happens if I lose everything, all wallets?",
    a: (
      <>
        Then there is no way to re-prove the account; that&apos;s true of every
        system anchored in wallets. A username and password (set up beforehand
        in profile) still signs you in, but it cannot re-create a wallet set
        that no longer exists. Enroll the wallets you actually control and keep
        at least one healthy.
      </>
    ),
  },
  {
    q: "Someone bought a new bag on another chain. How do I add it?",
    a: (
      <>
        Connect the new wallet and sign one short message with it. That&apos;s
        the entire flow. Existing wallets don&apos;t sign or reconnect. The next
        verification prices the merged set.
      </>
    ),
  },
  {
    q: "Can my tier go down?",
    a: (
      <>
        Yes, that&apos;s the point. Verification re-runs automatically against
        your sealed wallet list, so the badge reflects a recent check. If your
        portfolio drops below the threshold, the badge says so. Selling your
        bags has consequences, here at least.
      </>
    ),
  },
  {
    q: "Are spam airdrops counted?",
    a: (
      <>
        Only if a market data source gives them a real, live price. Everything
        discovered is priced by contract address from price APIs; anything
        unpriceable is skipped entirely, never valued at a guess. Pegged assets
        within a cent of $1.00 are counted at exactly $1.00 so they can&apos;t
        be gamed.
      </>
    ),
  },
  {
    q: "Do you support multiple wallets? Chains?",
    a: (
      <>
        Up to 20 wallets per account. Solana today, including all SPL tokens you
        hold. Everything is priced together into one tier.
      </>
    ),
  },
  {
    q: "Why can't I just screenshot my portfolio instead?",
    a: (
      <>
        Screenshots are trivially faked and leak your whole portfolio. A signed,
        attested computation is the opposite: impossible to fake and leaks
        almost nothing.
      </>
    ),
  },
  {
    q: "Can I delete my account?",
    a: (
      <>
        Removing your wallets de-verifies the account, and the server holds no
        addresses or balances to forget. That&apos;s structural, not a policy.
        Tier records and pseudonyms can be removed on request.
      </>
    ),
  },
  {
    q: "Why does my browser check a certificate before signing?",
    a: (
      <>
        So you never send secrets to an impostor. The enclave proves its code
        image and hardware first; if anything is off (wrong image, debug mode,
        stale key), your browser refuses to proceed. It&apos;s the same reflex
        as checking a site&apos;s padlock, but cryptographic.
      </>
    ),
  },
  {
    q: "Is Google part of this?",
    a: (
      <>
        Yes, honestly: the enclave runs on Google Cloud Confidential Space, and
        Google signs the attestation. That is the vendor trust every TEE
        carries. What you get in return is checkable behavior: the image digest
        is public and pinned, so what runs is what everyone can see.
      </>
    ),
  },
];

export default function Faq() {
  return (
    <>
      <DocHeader
        title={
          <>
            Questions, <span className="accent">answered straight.</span>
          </>
        }
        lede={
          <>
            The questions people actually ask, answered the way we&apos;d want
            them answered. Click to open.
          </>
        }
      />
      {QA.map((item, i) => (
        <details className="docs-qa" key={item.q} open={i === 0}>
          <summary className="docs-q">{item.q}</summary>
          <div className="docs-a">{item.a}</div>
        </details>
      ))}
      <Pager current="/docs/faq" />
    </>
  );
}
