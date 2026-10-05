import type { Metadata } from "next";
import { Pager } from "../components/pager";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Docs: Privacy & trust",
};

export default function Privacy() {
  return (
    <>
      <h1 className="docs-title">Privacy &amp; trust</h1>
      <p className="docs-lede">
        The promise is &ldquo;not even we can see your bags.&rdquo; Here is
        the machinery behind that sentence — and the places where we say
        plainly what remains.
      </p>

      <h2 className="docs-h2">Why you don&apos;t have to take our word for it</h2>
      <p className="docs-body-text">
        The balance-reading code doesn&apos;t run on our servers. It runs in a
        sealed enclave — a virtual machine whose memory is encrypted by the
        physical chip (AMD SEV / Intel TDX), on Google Cloud&apos;s
        Confidential Space. Not even the machine&apos;s operator — us — can
        read its memory or change its code while it runs.
      </p>
      <p className="docs-body-text">
        And you don&apos;t have to believe that description either. The
        enclave holds a certificate, signed by Google, that names the exact
        code image it runs. Your browser checks that certificate against the
        fingerprint we publish publicly before sending anything. If the image
        ever changed — added logging, exported balances — the old fingerprint
        would stop matching and every client would refuse to talk to it.
      </p>
      <p className="docs-body-text">
        The image is built from public source. If you want, you can read
        exactly what the enclave does with your data — because the answer is
        &ldquo;compute the tier, sign it, forget the addresses.&rdquo;
      </p>

      <h2 className="docs-h2">What different parties can see</h2>
      <div className="docs-table">
        <div className="docs-table-row head">
          <span>PARTY</span>
          <span>WHAT THEY CAN SEE</span>
        </div>
        <div className="docs-table-row">
          <span>Other members</span>
          <span>Your tier badge and handle. That&apos;s the whole list.</span>
        </div>
        <div className="docs-table-row">
          <span>The 6figs server</span>
          <span>Tier, coarse band, chosen top-3 symbols, pseudonyms. No
            addresses, no amounts, anywhere.</span>
        </div>
        <div className="docs-table-row">
          <span>The enclave (during a check)</span>
          <span>Your addresses and balances — transiently, in encrypted
            memory, then forgotten. It cannot be observed doing so.</span>
        </div>
        <div className="docs-table-row">
          <span>Google</span>
          <span>That a Confidential Space VM runs a pinned image. This is
            the vendor trust we can&apos;t remove — but can audit.</span>
        </div>
        <div className="docs-table-row">
          <span>Chain data providers (RPC)</span>
          <span>Addresses the enclave queries, over TLS. See the honest
            tradeoffs below.</span>
        </div>
      </div>

      <h2 className="docs-h2">The honest tradeoffs</h2>
      <div className="docs-card">
        <p className="mono-label">RPC PROVIDERS SEE QUERIED ADDRESSES</p>
        <p className="docs-body-text">
          To read a balance, the enclave must ask a blockchain node, and the
          address is in the question by definition. Those providers could, in
          principle, correlate queries. Mitigations (provider rotation, and
          longer-term self-hosted nodes) are on the roadmap; today this is the
          main residual leak, and we&apos;d rather name it than bury it.
        </p>
      </div>
      <div className="docs-card">
        <p className="mono-label">PRICES COME FROM MARKET APIs</p>
        <p className="docs-body-text">
          Valuations come from public price APIs. There is no token
          allowlist: everything you hold gets priced, and anything
          unpriceable is skipped — never guessed. Every value is
          overflow-checked, dollar-pegged assets are capped at $1.00, and the
          final total is bucketed into a band so small price errors rarely
          move your tier.
        </p>
      </div>
      <div className="docs-card">
        <p className="mono-label">PSEUDONYMS ARE ONE-WAY, NOT MAGIC</p>
        <p className="docs-body-text">
          Wallet pseudonyms are keyed hashes: nobody can reverse them into an
          address. In production they are keyed with a secret only the
          enclave holds, so even a leaked database can&apos;t be matched
          against a list of guessed addresses. The registry is treated as
          write-only and never published.
        </p>
      </div>
      <div className="docs-card">
        <p className="mono-label">A TEE IS NOT SORCERY</p>
        <p className="docs-body-text">
          Attestation makes the enclave&apos;s behavior <em>checkable</em>,
          not physically impossible to subvert. Google sits in the trust
          base — the difference is that its claims are verified, not
          assumed. We publish this so you can decide what it&apos;s worth to
          you.
        </p>
      </div>

      <h2 className="docs-h2">Fails closed, not open</h2>
      <p className="docs-body-text">
        Every check in the chain — attestation, signature, nonce, expiry,
        policy version, image fingerprint — must pass or the whole
        verification is rejected. There are no &ldquo;accepted with
        warnings&rdquo; paths. If the enclave can&apos;t prove itself, your
        browser stops. If the result can&apos;t prove itself, the server
        stops. Nobody can talk either side into a lower standard.
      </p>

      <Pager current="/docs/privacy" />
    </>
  );
}
