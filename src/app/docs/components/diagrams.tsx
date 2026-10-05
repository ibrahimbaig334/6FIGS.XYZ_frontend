"use client";

/**
 * Inline SVG diagrams. They inherit the app's CSS variables so they follow
 * light/dark mode automatically; mono labels match the DM Mono used app-wide.
 */

export function FlowDiagram() {
  return (
    <figure className="docs-fig">
      <svg viewBox="0 0 760 340" role="img" aria-label="Three parties: your browser, a sealed enclave, and the 6figs backend. Wallet signatures go to the enclave; only a tier comes back and is stored.">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)" />
          </marker>
        </defs>
        {/* Browser */}
        <rect x="20" y="120" width="180" height="100" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <text x="110" y="155" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="15" fill="var(--ink)">YOUR BROWSER</text>
        <text x="110" y="178" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--muted)">wallet signs one message</text>
        <text x="110" y="196" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--muted)">verifies the enclave itself</text>
        {/* Enclave */}
        <rect x="290" y="70" width="200" height="200" fill="var(--gold)" stroke="var(--ink)" strokeWidth="3" />
        <text x="390" y="105" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="15" fill="var(--on-dark)">🔒 SEALED ENCLAVE</text>
        <text x="390" y="130" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--on-dark)">Google Confidential Space</text>
        <text x="390" y="152" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--on-dark)">reads balances + prices</text>
        <text x="390" y="170" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--on-dark)">computes your tier</text>
        <text x="390" y="196" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--on-dark)">sees addresses — then forgets</text>
        <text x="390" y="214" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--on-dark)">signs the result</text>
        {/* Backend */}
        <rect x="560" y="120" width="180" height="100" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <text x="650" y="155" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="15" fill="var(--ink)">6FIGS SERVER</text>
        <text x="650" y="178" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--muted)">stores tier + pseudonyms</text>
        <text x="650" y="196" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--muted)">no address. no balance.</text>
        {/* Arrows */}
        <line x1="200" y1="150" x2="288" y2="130" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arr)" />
        <text x="240" y="122" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10" fill="var(--ink)">encrypted proof request</text>
        <line x1="288" y1="210" x2="200" y2="190" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arr)" />
        <text x="240" y="242" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10" fill="var(--ink)">signed tier back</text>
        <line x1="490" y1="170" x2="558" y2="170" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arr)" />
        <text x="524" y="158" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10" fill="var(--ink)">tier only</text>
      </svg>
      <figcaption className="fine">
        The only thing that ever crosses from the enclave to 6figs is your tier and a pseudonym.
      </figcaption>
    </figure>
  );
}

export function AttestationDiagram() {
  return (
    <figure className="docs-fig">
      <svg viewBox="0 0 760 300" role="img" aria-label="Google issues a tamper-evident certificate describing exactly what code runs in the enclave; your browser checks it against a pinned fingerprint before trusting it.">
        <defs>
          <marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)" />
          </marker>
        </defs>
        <rect x="20" y="100" width="200" height="100" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <text x="120" y="140" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="14" fill="var(--ink)">GOOGLE ATTESTS</text>
        <text x="120" y="163" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">signs: “this exact image,</text>
        <text x="120" y="180" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">on real sealed hardware”</text>
        <rect x="280" y="100" width="200" height="100" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <text x="380" y="140" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="14" fill="var(--ink)">CERTIFICATE (JWT)</text>
        <text x="380" y="163" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">image fingerprint · GCP project</text>
        <text x="380" y="180" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">not debuggable · fresh nonce</text>
        <rect x="540" y="100" width="200" height="100" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <text x="640" y="140" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="14" fill="var(--ink)">YOUR BROWSER CHECKS</text>
        <text x="640" y="163" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">signature · fingerprint we pinned</text>
        <text x="640" y="180" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">anything wrong → refuse to send</text>
        <line x1="220" y1="150" x2="278" y2="150" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arr2)" />
        <line x1="480" y1="150" x2="538" y2="150" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arr2)" />
        <text x="380" y="240" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--muted)">
          The fingerprint is public. If 6figs ever changed what the enclave runs, every browser would notice.
        </text>
      </svg>
      <figcaption className="fine">
        You don&apos;t take our word for it — the enclave proves what it is before you prove anything.
      </figcaption>
    </figure>
  );
}

export function BandDiagram() {
  return (
    <figure className="docs-fig">
      <svg viewBox="0 0 760 240" role="img" aria-label="A number line from zero to over one million dollars divided into bands: under 100k, 100k to 300k, 300k to 500k, 500k to 1M, and 1M plus.">
        <rect x="20" y="80" width="144" height="60" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <rect x="164" y="80" width="144" height="60" fill="var(--gold)" stroke="var(--ink)" strokeWidth="3" />
        <rect x="308" y="80" width="144" height="60" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <rect x="452" y="80" width="144" height="60" fill="var(--gold)" stroke="var(--ink)" strokeWidth="3" />
        <rect x="596" y="80" width="144" height="60" fill="var(--crimson)" stroke="var(--ink)" strokeWidth="3" />
        <text x="92" y="105" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--ink)">UNDER $100K</text>
        <text x="92" y="124" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="9" fill="var(--muted)">not admitted</text>
        <text x="236" y="105" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="12" fill="var(--on-dark)">TIER I</text>
        <text x="236" y="124" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="9" fill="var(--on-dark)">$100K–$300K</text>
        <text x="380" y="105" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="12" fill="var(--ink)">TIER II</text>
        <text x="380" y="124" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="9" fill="var(--muted)">$300K–$500K</text>
        <text x="524" y="105" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="12" fill="var(--on-dark)">TIER III</text>
        <text x="524" y="124" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="9" fill="var(--on-dark)">$500K–$1M</text>
        <text x="668" y="105" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="12" fill="#fff">TIER IV</text>
        <text x="668" y="124" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="9" fill="#fff">$1M+</text>
        <text x="380" y="180" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--muted)">
          We store which band you&apos;re in. Not the number. 250k and 299k look identical to us.
        </text>
      </svg>
      <figcaption className="fine">
        Tier badges are lower bounds. The gap between tiers is the privacy margin.
      </figcaption>
    </figure>
  );
}

export function RecheckDiagram() {
  return (
    <figure className="docs-fig">
      <svg viewBox="0 0 760 260" role="img" aria-label="Hourly recheck: the server replays the sealed wallet list to the enclave, which re-reads balances and re-signs the tier. You sign nothing.">
        <defs>
          <marker id="arr3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)" />
          </marker>
        </defs>
        <rect x="20" y="90" width="200" height="90" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <text x="120" y="128" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="14" fill="var(--ink)">6FIGS SERVER</text>
        <text x="120" y="150" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">holds a sealed envelope</text>
        <text x="120" y="166" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">it cannot open</text>
        <rect x="290" y="90" width="200" height="90" fill="var(--gold)" stroke="var(--ink)" strokeWidth="3" />
        <text x="390" y="128" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="14" fill="var(--on-dark)">🔒 ENCLAVE</text>
        <text x="390" y="150" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--on-dark)">opens the envelope inside,</text>
        <text x="390" y="166" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--on-dark)">re-reads balances, re-signs</text>
        <rect x="560" y="90" width="180" height="90" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
        <text x="650" y="128" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontWeight="700" fontSize="14" fill="var(--ink)">YOUR PROFILE</text>
        <text x="650" y="150" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">tier stays fresh</text>
        <text x="650" y="166" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10.5" fill="var(--muted)">you did nothing</text>
        <line x1="220" y1="135" x2="288" y2="135" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arr3)" />
        <text x="254" y="122" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10" fill="var(--ink)">sealed envelope</text>
        <line x1="490" y1="135" x2="558" y2="135" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arr3)" />
        <text x="524" y="122" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="10" fill="var(--ink)">fresh tier</text>
        <text x="380" y="220" textAnchor="middle" fontFamily="var(--font-dm-mono)" fontSize="11" fill="var(--muted)">
          No signatures, no popups, no gas. The envelope is only ever opened inside the enclave.
        </text>
      </svg>
      <figcaption className="fine">
        The sealed envelope (escrow blob) is ciphertext only the enclave can open — even we can&apos;t.
      </figcaption>
    </figure>
  );
}
