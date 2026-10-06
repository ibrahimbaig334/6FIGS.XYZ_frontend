"use client";

/**
 * Docs diagrams as HTML/CSS boxes (not SVG) so text wraps natively and the
 * layout is responsive at every width. Light/dark via inherited CSS vars.
 */

function Node({
  title,
  lines,
  variant,
}: {
  title: string;
  lines?: string[];
  variant?: "gold" | "crimson";
}) {
  return (
    <div className={`doc-node${variant ? ` ${variant}` : ""}`}>
      <h4>{title}</h4>
      {lines?.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

function Arrow({
  label,
  glyph = "→",
  labelBelow,
}: {
  label?: string;
  glyph?: string;
  labelBelow?: string;
}) {
  return (
    <div className="doc-arrow">
      {label && <span className="lbl">{label}</span>}
      <span className="glyph">{glyph}</span>
      {labelBelow && <span className="lbl">{labelBelow}</span>}
    </div>
  );
}

export function FlowDiagram() {
  return (
    <figure className="docs-fig">
      <div
        className="doc-diagram"
        role="img"
        aria-label="Three parties: your browser, a sealed enclave, and the 6figs backend. Wallet signatures go to the enclave; only a tier comes back and is stored."
      >
        <Node
          title="YOUR BROWSER"
          lines={["wallet signs one message", "verifies the enclave itself"]}
        />
        <Arrow label="encrypted proof request" glyph="⇄" labelBelow="signed tier back" />
        <Node
          title="🔒 SEALED ENCLAVE"
          variant="gold"
          lines={[
            "Google Confidential Space",
            "reads balances + prices",
            "computes your tier",
            "sees addresses — then forgets",
            "signs the result",
          ]}
        />
        <Arrow label="tier only" />
        <Node
          title="6FIGS SERVER"
          lines={["stores tier + pseudonyms", "no address. no balance."]}
        />
      </div>
      <figcaption className="fine">
        The only thing that ever crosses from the enclave to 6figs is your tier
        and a pseudonym.
      </figcaption>
    </figure>
  );
}

export function AttestationDiagram() {
  return (
    <figure className="docs-fig">
      <div
        className="doc-diagram"
        role="img"
        aria-label="Google issues a tamper-evident certificate describing exactly what code runs in the enclave; your browser checks it against a pinned fingerprint before trusting it."
      >
        <Node
          title="GOOGLE ATTESTS"
          lines={['signs: “this exact image,', 'on real sealed hardware”']}
        />
        <Arrow />
        <Node
          title="CERTIFICATE (JWT)"
          lines={[
            "image fingerprint · GCP project",
            "not debuggable · fresh nonce",
          ]}
        />
        <Arrow />
        <Node
          title="YOUR BROWSER CHECKS"
          lines={[
            "signature · fingerprint we pinned",
            "anything wrong → refuse to send",
          ]}
        />
        <p className="doc-note">
          The fingerprint is public. If 6figs ever changed what the enclave
          runs, every browser would notice.
        </p>
      </div>
      <figcaption className="fine">
        You don&apos;t take our word for it — the enclave proves what it is
        before you prove anything.
      </figcaption>
    </figure>
  );
}

export function BandDiagram() {
  return (
    <figure className="docs-fig">
      <div
        className="doc-bands"
        role="img"
        aria-label="A number line from zero to over one million dollars divided into bands: under 100k, 100k to 300k, 300k to 500k, 500k to 1M, and 1M plus."
      >
        <div className="doc-band">
          <b>UNDER $100K</b>
          <span>not admitted</span>
        </div>
        <div className="doc-band gold">
          <b>TIER I</b>
          <span>$100K–$300K</span>
        </div>
        <div className="doc-band">
          <b>TIER II</b>
          <span>$300K–$500K</span>
        </div>
        <div className="doc-band gold">
          <b>TIER III</b>
          <span>$500K–$1M</span>
        </div>
        <div className="doc-band crimson">
          <b>TIER IV</b>
          <span>$1M+</span>
        </div>
      </div>
      <p className="doc-note">
        We store which band you&apos;re in. Not the number. 250k and 299k look
        identical to us.
      </p>
      <figcaption className="fine">
        Tier badges are lower bounds. The gap between tiers is the privacy
        margin.
      </figcaption>
    </figure>
  );
}

export function RecheckDiagram() {
  return (
    <figure className="docs-fig">
      <div
        className="doc-diagram"
        role="img"
        aria-label="Hourly recheck: the server replays the sealed wallet list to the enclave, which re-reads balances and re-signs the tier. You sign nothing."
      >
        <Node
          title="6FIGS SERVER"
          lines={["holds a sealed envelope", "it cannot open"]}
        />
        <Arrow label="sealed envelope" />
        <Node
          title="🔒 ENCLAVE"
          variant="gold"
          lines={[
            "opens the envelope inside,",
            "re-reads balances, re-signs",
          ]}
        />
        <Arrow label="fresh tier" />
        <Node
          title="YOUR PROFILE"
          lines={["tier stays fresh", "you did nothing"]}
        />
        <p className="doc-note">
          No signatures, no popups, no gas. The envelope is only ever opened
          inside the enclave.
        </p>
      </div>
      <figcaption className="fine">
        The sealed envelope (escrow blob) is ciphertext only the enclave can
        open — even we can&apos;t.
      </figcaption>
    </figure>
  );
}
