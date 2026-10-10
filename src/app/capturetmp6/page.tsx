"use client";

// TEMPORARY capture harness — the real home hero, same markup/classes as
// src/app/page.tsx with the real tier ladder.
import { useHideChrome } from "../hideChrome";

const tiers = [
  { name: "TIER I", min: 100000 },
  { name: "TIER II", min: 300000 },
  { name: "TIER III", min: 500000 },
  { name: "TIER IV", min: 1000000 },
];

export default function CaptureHero() {
  useHideChrome();
  return (
    <section className="hero page-enter" style={{ minHeight: "100vh" }}>
      <div className="hero-giant" aria-hidden="true">
        6
      </div>
      <p className="mono-label">
        PRIVATE MEMBERS&apos; ROOM — VERIFIED HOLDERS ONLY
      </p>
      <h1
        style={{
          fontSize: "clamp(3.5rem,9vw,8rem)",
          lineHeight: 0.85,
          letterSpacing: "-0.06em",
          margin: "1rem 0 0",
        }}
      >
        PROOF OF
        <br />
        <span style={{ color: "var(--crimson)" }}>BAGS.</span>
      </h1>
      <p
        style={{
          maxWidth: "460px",
          fontFamily: "var(--font-dm-mono)",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}
      >
        Proof &gt; $100K net worth (zero-knowledge).
        <br />
        Nobody — not even us — can see your address or balance.
      </p>
      <div className="tabs" style={{ margin: "1rem 0 0" }}>
        <a href="/rooms">Chat</a>
        <a href="/play">Play</a>
      </div>
      <div className="tier-strip" style={{ marginTop: "2rem" }}>
        {tiers.map((t) => (
          <div key={t.name}>
            <strong
              style={{ fontFamily: "var(--font-dm-mono)", fontSize: "0.66rem" }}
            >
              {t.name}
            </strong>
            <span style={{ fontWeight: 700, fontSize: "1.4rem" }}>
              ${t.min.toLocaleString()}+
            </span>
          </div>
        ))}
        <div style={{ borderRight: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "0.62rem",
              fontWeight: 400,
            }}
          >
            Only the tier badge is public. Never the number. Solana combined.
          </span>
        </div>
      </div>
    </section>
  );
}
