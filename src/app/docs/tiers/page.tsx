import type { Metadata } from "next";
import { BandDiagram, RecheckDiagram } from "../components/diagrams";
import { Pager } from "../components/pager";

export const metadata: Metadata = {
  title: "6FIGS.XYZ — Docs: Tiers & what's shown",
};

export default function Tiers() {
  return (
    <>
      <h1 className="docs-title">Tiers &amp; what&apos;s shown</h1>
      <p className="docs-lede">
        Verification answers one question — which tier? — and deliberately
        nothing else. Here is the full map of what exists and who can see it.
      </p>

      <h2 className="docs-h2">The four tiers</h2>
      <div className="docs-tier-table">
        <div className="docs-tier-row">
          <span className="tier-badge">TIER I</span>
          <span className="docs-body-text">$100K+ portfolio value</span>
        </div>
        <div className="docs-tier-row">
          <span className="tier-badge">TIER II</span>
          <span className="docs-body-text">$300K+</span>
        </div>
        <div className="docs-tier-row">
          <span className="tier-badge">TIER III</span>
          <span className="docs-body-text">$500K+</span>
        </div>
        <div className="docs-tier-row">
          <span className="tier-badge">TIER IV</span>
          <span className="docs-body-text">$1M+</span>
        </div>
      </div>
      <p className="fine">
        Tiers are lower bounds — a Tier II badge means &ldquo;at least
        $300K,&rdquo; whether you hold $310K or $3M short of Tier III.
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
          <span>Portfolio band (e.g. &ldquo;$100K–$300K&rdquo;)</span>
          <span>Only you, on your profile</span>
        </div>
        <div className="docs-table-row">
          <span>Up to 3 token symbols (e.g. &ldquo;SOL · ETH · HYPE&rdquo;)</span>
          <span>Only you, on your profile</span>
        </div>
        <div className="docs-table-row">
          <span>Wallet pseudonyms (one-way, reversible by no one)</span>
          <span>Server-internal; useless for identification</span>
        </div>
        <div className="docs-table-row">
          <span>Sealed wallet-list envelope (ciphertext)</span>
          <span>Nobody — including us — until the enclave opens it</span>
        </div>
      </div>

      <div className="docs-card">
        <p className="mono-label">WHAT IS NEVER STORED, NEVER SENT, NEVER ASKED</p>
        <p className="docs-body-text">
          Your exact total. Any token amount. Any allocation percentage. Any
          address. Not in the database, not in logs, not in a backup. The
          schema has no place to put them — the strongest kind of promise.
        </p>
      </div>

      <h2 className="docs-h2">Why a band instead of a number</h2>
      <p className="docs-body-text">
        A number is a fingerprint: your exact portfolio value is unique
        enough to track you across the app and over time. A band is coarse
        enough to share a room with thousands of other holders while still
        proving you cleared the bar. The width of each tier is the privacy
        margin — inside a band, a lower balance and a higher one are
        indistinguishable.
      </p>

      <h2 className="docs-h2">Keeping it honest over time</h2>
      <p className="docs-body-text">
        A tier proved once would go stale — sold yesterday, badged today. So
        verification quietly re-runs on a schedule against the sealed
        envelope, and your badge reflects a recent check, not a historic
        one. You can force a refresh any time from your profile.
      </p>

      <RecheckDiagram />

      <Pager current="/docs/tiers" />
    </>
  );
}
