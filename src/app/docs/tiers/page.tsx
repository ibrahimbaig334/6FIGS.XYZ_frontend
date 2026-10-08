import type { Metadata } from "next";
import { BandDiagram, RecheckDiagram } from "../components/diagrams";
import { tierEdgeClass } from "../../../lib/tierEdge";
import { Pager } from "../components/pager";
import { DocHeader } from "../components/doc-header";

export const metadata: Metadata = {
  title: "6figs. Docs: Tiers and what's shown",
};

const RUNGS = [
  { tier: "TIER I", range: "$100K-$300K", locked: false },
  { tier: "TIER II", range: "$300K-$500K", locked: false },
  { tier: "TIER III", range: "$500K-$1M", locked: false },
  { tier: "TIER IV", range: "$1M+", locked: false },
];

export default function Tiers() {
  return (
    <>
      <DocHeader
        title={
          <>
            Which tier, <span className="accent">and nothing else.</span>
          </>
        }
        lede={
          <>
            Verification answers one question (which tier?) and deliberately
            nothing else. Here is the full map of what exists and who can see it.
          </>
        }
      />

      <h2 className="docs-h2">The four tiers</h2>
      <div className="docs-ladder">
        <div className="docs-rung locked">
          <span className="label">Locked</span>
          <span className="docs-rung-range">Under $100K, not admitted</span>
        </div>
        {RUNGS.map((r) => (
          <div className={`docs-rung ${tierEdgeClass(r.tier)}`} key={r.tier}>
            <span className="label" style={{ color: "var(--tx-page)" }}>{r.tier}</span>
            <span className="docs-rung-range">{r.range}</span>
          </div>
        ))}
      </div>
      <p className="fine">
        Tiers are lower bounds. A Tier II badge means &ldquo;at least
        $300K,&rdquo; whether you hold $310K or $3M short of Tier III.
        Production thresholds shown; devnet uses lower test values.
      </p>

      <BandDiagram />

      <h2 className="docs-h2">What we store, exactly</h2>
      <div className="docs-table">
        <div className="docs-table-row head">
          <span>FACT</span>
          <span>WHO SEES IT</span>
        </div>
        <div className="docs-table-row">
          <span>Your tier</span>
          <span>Everyone, if your visibility is set to VISIBLE</span>
        </div>
        <div className="docs-table-row">
          <span>Portfolio band (e.g. &ldquo;$100K-$300K&rdquo;)</span>
          <span>Only you, on your profile</span>
        </div>
        <div className="docs-table-row">
          <span>Top 3 token symbols (e.g. &ldquo;SOL · ETH · HYPE&rdquo;)</span>
          <span>Only you, on your profile. Symbols only, never amounts</span>
        </div>
        <div className="docs-table-row">
          <span>Wallet pseudonyms (one-way, reversible by no one)</span>
          <span>Server-internal; useless for identification</span>
        </div>
        <div className="docs-table-row">
          <span>Sealed wallet-list envelope (ciphertext)</span>
          <span>Nobody, including us, until the enclave opens it</span>
        </div>
      </div>

      <div className="docs-callout danger">
        <p className="label" style={{ color: "var(--seal-bright)" }}>Never stored, never sent, never asked</p>
        <p>
          Your exact total. Any token amount. Any allocation percentage. Any
          address. Not in the database, not in logs, not in a backup. The
          schema has no place to put them. The strongest kind of promise.
        </p>
      </div>

      <h2 className="docs-h2">Why a band instead of a number</h2>
      <p className="docs-body-text">
        A number is a fingerprint: your exact portfolio value is unique
        enough to track you across the app and over time. A band is coarse
        enough to share a room with thousands of other holders while still
        proving you cleared the bar. The width of each tier is the privacy
        margin. Inside a band, a lower balance and a higher one are
        indistinguishable.
      </p>

      <h2 className="docs-h2">Keeping it honest over time</h2>
      <p className="docs-body-text">
        A tier proved once would go stale: sold yesterday, badged today. So
        verification quietly re-runs on a schedule against the sealed
        envelope, and your badge reflects a recent check, not a historic
        one. You can force a refresh any time from your profile.
      </p>

      <RecheckDiagram />

      <Pager current="/docs/tiers" />
    </>
  );
}
