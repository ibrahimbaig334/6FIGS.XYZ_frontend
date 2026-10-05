import type { Metadata } from "next";
import { AttestationDiagram } from "../components/diagrams";
import { Pager } from "../components/pager";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Docs: How it works",
};

export default function HowItWorks() {
  return (
    <>
      <h1 className="docs-title">How it works</h1>
      <p className="docs-lede">
        Five steps from &ldquo;connect wallet&rdquo; to a tier badge. Each step
        notes exactly who can see what.
      </p>

      <div className="docs-step">
        <div className="docs-step-num">1</div>
        <div>
          <p className="mono-label">YOU SIGN — NOTHING MOVES</p>
          <p className="docs-body-text">
            You connect the wallets you want to enroll and sign one plain
            message per wallet. It says &ldquo;I control this address&rdquo;
            and nothing else. It is a signature, not a transaction: no gas,
            no spending, no approvals — the signing request can never touch
            your funds.
          </p>
          <p className="fine">Visible to others: nothing.</p>
        </div>
      </div>

      <div className="docs-step">
        <div className="docs-step-num">2</div>
        <div>
          <p className="mono-label">YOUR BROWSER VETS THE ENCLAVE FIRST</p>
          <p className="docs-body-text">
            Before anything is sent, the enclave must prove what it is. Google
            issues a signed certificate (an attestation) stating the exact
            sealed-enclave code image that is running, that it runs on real
            memory-encrypted hardware, and that debugging is off. Your browser
            checks that certificate against the image fingerprint 6figs
            publishes — before releasing anything.
          </p>
          <AttestationDiagram />
          <p className="fine">Visible to others: nothing yet.</p>
        </div>
      </div>

      <div className="docs-step">
        <div className="docs-step-num">3</div>
        <div>
          <p className="mono-label">ADDRESSES TRAVEL ENCRYPTED — TO THE ENCLAVE ONLY</p>
          <p className="docs-body-text">
            Your signatures and addresses are encrypted to the enclave&apos;s
            key before they leave your browser. Even a network attacker or a
            hostile proxy sees ciphertext. The enclave decrypts, verifies your
            signatures, then reads balances from public blockchains and prices
            from market APIs — all inside the sealed box.
          </p>
          <p className="fine">Visible to others: the fact that a request happened.</p>
        </div>
      </div>

      <div className="docs-step">
        <div className="docs-step-num">4</div>
        <div>
          <p className="mono-label">TIER COMPUTED, ADDRESSES FORGOTTEN</p>
          <p className="docs-body-text">
            The enclave totals your portfolio, assigns the highest tier you
            qualify for, and replaces your wallets with one-way pseudonyms
            (nullifiers) — a kind of hash that can&apos;t be turned back into
            an address. It signs the result with its key and issues a fresh
            attestation bound to the exact result bytes. Then the plaintext
            addresses exist nowhere — not in memory, not in storage.
          </p>
          <p className="fine">Visible to others: nothing (the result is signed, not sent yet).</p>
        </div>
      </div>

      <div className="docs-step">
        <div className="docs-step-num">5</div>
        <div>
          <p className="mono-label">SERVER VERIFIES, STORES ALMOST NOTHING</p>
          <p className="docs-body-text">
            Your browser checks the signed result first, then forwards it. The
            6figs server independently            verifies the signature and the
            attestation — same image fingerprint, fresh nonce, no debug mode —
            and stores: your tier, a coarse band, your top three token
            symbols (disclosed automatically, symbols only — never amounts),
            and the wallet pseudonyms. There is no column
            anywhere for an address or an amount; the database schema makes
            storing one impossible.
          </p>
          <p className="fine">Visible to others: your tier badge (if your profile is visible).</p>
        </div>
      </div>

      <div className="docs-card">
        <p className="mono-label">STAYING FRESH</p>
        <p className="docs-body-text">
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
