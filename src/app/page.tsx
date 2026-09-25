"use client";

import { useEffect, useState } from "react";
import { api, getToken, getTiers, Profile, TierInfo } from "../lib/api";

export default function Home() {
  const [tier, setTier] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tiers, setTiers] = useState<TierInfo[]>([]);

  useEffect(() => {
    setReady(true);
    getTiers().then((t) => setTiers(t.tiers));
    if (!getToken()) return;
    api<Profile>("/profile/user")
      .then((p) => setTier(p.eligibility.tier))
      .catch(() => setTier(null));
  }, []);

  const locked = ready && !tier;

  return (
    <>
      <section className="hero">
        <div className="hero-giant" aria-hidden="true">6</div>
        <p className="mono-label">PRIVATE MEMBERS&apos; ROOM — VERIFIED HOLDERS ONLY</p>
        <h1 style={{ fontSize: "clamp(3.5rem,9vw,8rem)", lineHeight: 0.85, letterSpacing: "-0.06em", margin: "1rem 0 0" }}>
          PROOF OF
          <br />
          <span style={{ color: "var(--crimson)" }}>BAGS.</span>
        </h1>
        <p style={{ maxWidth: "460px", fontFamily: 'var(--font-dm-mono)', fontSize: "0.9rem", lineHeight: 1.6 }}>
          Proof &gt; $100K net worth (zero-knowledge).<br />
          Nobody — not even us — can see your address or balance.
        </p>
        <div className="tabs" style={{ margin: "1rem 0 0" }}>
          <a href="/rooms">Chat</a>
          <a href="/play">Play</a>
        </div>
        <div className="tier-strip" style={{ marginTop: "2rem" }}>
          {tiers.map((t) => (
            <div key={t.name}>
              <strong style={{ fontFamily: 'var(--font-dm-mono)', fontSize: "0.66rem" }}>{t.name}</strong>
              <span style={{ fontWeight: 700, fontSize: "1.4rem" }}>${t.min.toLocaleString()}+</span>
            </div>
          ))}
          <div style={{ borderRight: 0 }}>
            <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: "0.62rem", fontWeight: 400 }}>
              Only the tier badge is public. Never the number. EVM + Solana + BTC combined.
            </span>
          </div>
        </div>
      </section>

      <section style={{ padding: "2rem 5vw" }}>
        <div className="topline">
          <h2 style={{ margin: 0 }}>Then…</h2>
          {locked && <span className="tier-badge">VERIFY IN PROFILE TO UNLOCK</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.2rem" }}>
          <div className="card">
            <p className="mono-label">PLAY FAIR</p>
            <div className={locked ? "locked-blur" : ""} aria-hidden={locked}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", background: "var(--ink)", padding: "4px", border: "2px solid var(--ink)", margin: "0.8rem 0" }}>
                {["×", "○", "", "", "×", "", "○", "", "×"].map((c, i) => (
                  <div key={i} style={{ aspectRatio: "1", background: "var(--paper)", display: "grid", placeItems: "center", fontSize: "1.8rem", color: c === "○" ? "var(--crimson)" : "var(--ink)" }}>
                    {c}
                  </div>
                ))}
              </div>
            </div>
            <p className="fine">Tic-tac-toe, 1v1 + side chat. {locked ? "UI blurred until verified." : "Fair game, no stakes."}</p>
            <a href="/play" className="btn-solid" style={{ padding: "0.7rem 1rem" }}>PLAY ↗</a>
          </div>
          <div className="card">
            <p className="mono-label">JOIN PRIVATE ROOMS</p>
            <div className={locked ? "locked-blur" : ""} aria-hidden={locked}>
              <div style={{ border: "2px solid var(--ink)", background: "var(--card)", padding: "0.8rem", margin: "0.8rem 0", fontFamily: 'var(--font-dm-mono)', fontSize: "0.7rem" }}>
                <p style={{ margin: "0 0 0.4rem" }}>🔒 INVITE-ONLY · 1/2 · BTC Maxis</p>
                <p style={{ margin: "0 0 0.4rem" }}>✓ TIER I · 2/2 · Crypto Degens</p>
                <p style={{ margin: 0 }}>✓ TIER II · 1/2 · HYPE Talks</p>
              </div>
            </div>
            <p className="fine">1v1 private rooms — tier-gated or invite-only. {locked ? "Disabled until verified." : ""}</p>
            <a href="/rooms" className="btn-solid" style={{ padding: "0.7rem 1rem" }}>ROOMS ↗</a>
          </div>
        </div>
      </section>
    </>
  );
}
