"use client";

// TEMPORARY capture harness — the real wallet rows + visibility chips and the
// tier headline from the profile page, with representative data.
export default function CapturePrivacy() {
  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "16px", background: "var(--paper)" }}>
      <div className="card" style={{ margin: 0 }}>
        <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <p className="mono-label" style={{ fontSize: 20 }}>PROFILE PAGE</p>
            <h2 style={{ margin: "0.3rem 0 0", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", letterSpacing: "-0.03em" }}>0xWhale</h2>
          </div>
          <span className="tier-badge" style={{ alignSelf: "center", padding: "7px 30px" }}>TIER III</span>
        </div>
        <p style={{ margin: "0.8rem 0 0", fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
          SOL · BTC · HYPE
        </p>
        <p className="fine" style={{ margin: "0.3rem 0 0" }}>BAND 500k-1m · VERIFIED</p>

        <div className="profile-fields">
          <div>
            <p className="mono-label" style={{ marginBottom: "0.4rem" }}>USERNAME</p>
            <input className="field" defaultValue="0xWhale" readOnly style={{ maxWidth: "220px" }} />
          </div>
          <div className="vis-block">
            <p className="mono-label" style={{ marginBottom: "0.4rem" }}>VISIBILITY</p>
            <div className="vis-chips">
              <button className="chip">HIDDEN</button>
              <button className="chip active">VISIBLE</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ margin: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <p className="mono-label" style={{ fontSize: 20 }}>WALLETS</p>
          <span className="fine" style={{ marginLeft: "auto" }}>3/20</span>
        </div>
        <div className="wallet-grid">
          {["Phantom", "Solflare", "Ledger"].map((n) => (
            <div key={n} className="wallet-row">
              <span className="wallet-icon" style={{ display: "grid", placeItems: "center", fontFamily: "var(--font-dm-mono)", fontWeight: 700 }}>{n[0]}</span>
              <div className="wallet-info">
                <strong style={{ fontSize: "1rem" }}>{n}</strong>
                <span className="fine" style={{ margin: 0 }}>SOL · ADDRESS HIDDEN BY DESIGN</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "0.8rem" }}>
          <button className="btn-solid" style={{ padding: "0.6rem 1rem" }}>ADD WALLET ↗</button>
          <button className="btn-ghost" style={{ padding: "0.6rem 1rem", marginLeft: "0.5rem" }}>REFRESH TIER</button>
        </div>
      </div>
    </div>
  );
}
