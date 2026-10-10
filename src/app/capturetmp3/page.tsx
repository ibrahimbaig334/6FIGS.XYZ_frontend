"use client";

// TEMPORARY capture harness — the real tier table + the real BandDiagram SVG.
import { BandDiagram } from "../docs/components/diagrams";

export default function CaptureTiers() {
  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "18px", background: "var(--paper)" }}>
      <h2 className="docs-h2" style={{ margin: 0 }}>The four tiers</h2>
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
      <p className="fine" style={{ margin: 0 }}>
        Tiers are lower bounds — a Tier II badge means &ldquo;at least $300K.&rdquo;
      </p>
      <BandDiagram />
    </div>
  );
}
