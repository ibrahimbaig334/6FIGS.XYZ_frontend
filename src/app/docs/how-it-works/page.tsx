import type { Metadata } from "next";
import { AttestationDiagram } from "../components/diagrams";
import { Pager } from "../components/pager";
import { DocHeader } from "../components/doc-header";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Docs: How it works",
};

const STEPS: {
  title: string;
  body: React.ReactNode;
  sees: string;
  some?: boolean;
  diagram?: React.ReactNode;
}[] = [
  {
    title: "YOU SIGN — NOTHING MOVES",
    body: (
      <>
        After logging in, you connect the wallets you want to enroll and sign
        one plain message per wallet. It says &ldquo;I control this
        address&rdquo; and nothing else. It is a signature, not a
        transaction: no gas, no spending, no approvals — the signing request
        can never touch your funds.
      </>
    ),
    sees: "🔒 VISIBLE TO OTHERS: NOTHING",
  },
  {
    title: "YOUR BROWSER VETS THE ENCLAVE FIRST",
    body: (
      <>
        Before anything is sent, the enclave must prove what it is. Google
        issues a signed certificate (an attestation) stating the exact
        sealed-enclave code image that is running, that it runs on real
        memory-encrypted hardware, and that debugging is off. Your browser
        checks that certificate against the image fingerprint 6figs
        publishes — before releasing anything.
      </>
    ),
    sees: "🔒 VISIBLE TO OTHERS: NOTHING YET",
    diagram: <AttestationDiagram />,
  },
  {
    title: "ADDRESSES TRAVEL ENCRYPTED — TO THE ENCLAVE ONLY",
    body: (
      <>
        Your signatures and addresses are encrypted to the enclave&apos;s
        key before they leave your browser. Even a network attacker or a
        hostile proxy sees ciphertext. The enclave decrypts, verifies your
        signatures, then reads balances from public blockchains and prices
        from market APIs — all inside the sealed box.
      </>
    ),
    sees: "👁 VISIBLE TO OTHERS: ONLY THAT A REQUEST HAPPENED",
    some: true,
  },
  {
    title: "TIER COMPUTED, ADDRESSES FORGOTTEN",
    body: (
      <>
        The enclave totals your portfolio, assigns the highest tier you
        qualify for, and replaces your wallets with one-way pseudonyms
        (nullifiers) — a kind of hash that can&apos;t be turned back into
        an address. It signs the result with its key and issues a fresh
        attestation bound to the exact result bytes. Then the plaintext
        addresses exist nowhere — not in memory, not in storage.
      </>
    ),
    sees: "🔒 VISIBLE TO OTHERS: NOTHING (SIGNED, NOT SENT YET)",
  },
  {
    title: "SERVER VERIFIES, STORES ALMOST NOTHING",
    body: (
      <>
        Your browser checks the signed result first, then forwards it. The
        6figs server independently verifies the signature and the
        attestation — same image fingerprint, fresh nonce, no debug mode —
        and stores: your tier, a coarse band, your top three token
        symbols (disclosed automatically, symbols only — never amounts),
        and the wallet pseudonyms. There is no column
        anywhere for an address or an amount; the database schema makes
        storing one impossible.
      </>
    ),
    sees: "👁 VISIBLE TO OTHERS: YOUR TIER BADGE (IF VISIBLE)",
    some: true,
  },
];

export default function HowItWorks() {
  return (
    <>
      <DocHeader
        index="02"
        chapter="HOW IT WORKS"
        title={
          <>
            Five steps to <span className="accent">a tier badge.</span>
          </>
        }
        lede={
          <>
            From &ldquo;connect wallet&rdquo; to badge — each step notes
            exactly who can see what.
          </>
        }
      />

      <div className="docs-steps">
        {STEPS.map((s, i) => (
          <div className="docs-step" key={s.title}>
            <div className="docs-step-num">{i + 1}</div>
            <div>
              <p className="mono-label">{s.title}</p>
              <p className="docs-body-text">{s.body}</p>
              {s.diagram}
              <span className={`docs-sees${s.some ? " some" : ""}`}>
                {s.sees}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="docs-callout ink">
        <p className="mono-label">STAYING FRESH</p>
        <p>
          Markets move, so verification isn&apos;t frozen in time. The server
          holds your wallet list as a sealed envelope it cannot open — only
          the enclave can. On a schedule (and when you press
          &ldquo;refresh&rdquo;), the envelope is replayed to the enclave,
          which re-reads balances and re-signs a fresh tier. You sign nothing.
        </p>
      </div>

      <Pager current="/docs/how-it-works" />
    </>
  );
}
