"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, clearToken, getToken, isDevnet, Profile } from "../../lib/api";
import { disconnectSocket } from "../../lib/ws";
import ConnectPopup from "../../components/ConnectPopup";

const TABS = ["profile", "wallets", "settings"] as const;

function ProfileInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState<string>(params.get("tab") ?? "wallets");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [popup, setPopup] = useState(false);
  const [err, setErr] = useState("");
  const [handle, setHandle] = useState("");
  const [mockEdits, setMockEdits] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!getToken()) {
      setProfile(null);
      return;
    }
    try {
      const p = await api<Profile>("/profile/me");
      setProfile(p);
      setHandle(p.handle ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function recheck() {
    try {
      await api("/eligibility/check", { method: "POST" });
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Check failed");
    }
  }

  async function saveVis(visMode: string) {
    try {
      await api("/profile/me", { method: "PATCH", body: { visMode } });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveHandle() {
    try {
      await api("/profile/me", { method: "PATCH", body: { handle } });
      await load();
      window.dispatchEvent(new Event("sixfigs-auth"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveMock(id: string) {
    try {
      await api(`/wallet/${id}/mock`, { method: "PATCH", body: { value: Number(mockEdits[id] ?? 0) } });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function removeWallet(id: string) {
    try {
      await api(`/wallet/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Remove failed");
    }
  }

  function disconnect() {
    clearToken();
    disconnectSocket();
    setProfile(null);
    location.href = "/";
  }

  // Mounted guard (see rooms page): localStorage token is client-only.
  if (!ready) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <p className="mono-label">LOADING PROFILE…</p>
      </section>
    );
  }

  if (!getToken() || !profile) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <div className="card">
          <p className="mono-label">PROFILE — CONNECT FIRST</p>
          <p style={{ fontFamily: '"DM Mono", monospace', fontSize: "0.75rem" }}>
            Link a wallet to open your profile. Below $100K you can still link more wallets here.
          </p>
          <button className="btn-solid" onClick={() => setPopup(true)}>CONNECT WALLET ↗</button>
          {err && <p style={{ color: "var(--crimson)" }}>{err}</p>}
        </div>
        {popup && <ConnectPopup onClose={() => setPopup(false)} onDone={() => { load(); window.dispatchEvent(new Event("sixfigs-auth")); }} />}
      </section>
    );
  }

  const elig = profile.eligibility;

  return (
    <section style={{ padding: "2rem 5vw", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {TABS.map((t) => (
          <button key={t} className={tab === t ? "chip active" : "chip"} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
        <span className="tier-badge" style={{ marginLeft: "auto", alignSelf: "center" }}>
          {elig.tier ?? "BELOW $100K"} · ${elig.total.toLocaleString()}
        </span>
      </div>
      {err && <p style={{ color: "var(--crimson)", fontFamily: '"DM Mono", monospace', fontSize: "0.7rem" }}>{err}</p>}

      {tab === "wallets" && (
        <div className="card">
          <p className="mono-label">1 / CONNECTED WALLETS (EVM + SOLANA + BTC)</p>
          {profile.wallets.map((w) => (
            <div key={w.id} className="wallet-row">
              <span className={w.chain === "SOL" ? "chain-badge sol" : "chain-badge"}>{w.chain}</span>
              <code className="wallet-addr">{w.address}</code>
              {isDevnet ? (
                <>
                  <input
                    className="field"
                    style={{ maxWidth: "130px" }}
                    type="number"
                    min={0}
                    placeholder={String(w.mockUsd ?? 0)}
                    value={mockEdits[w.id] ?? ""}
                    onChange={(e) => setMockEdits({ ...mockEdits, [w.id]: e.target.value })}
                  />
                  <button className="chip" onClick={() => saveMock(w.id)}>SET ${Number(mockEdits[w.id] ?? w.mockUsd ?? 0).toLocaleString()}</button>
                </>
              ) : (
                <span className="mono-label">${(w.mockUsd ?? 0).toLocaleString()}</span>
              )}
              <button className="chip" onClick={() => removeWallet(w.id)}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
            <button className="btn-solid" style={{ padding: "0.7rem 1rem" }} onClick={() => setPopup(true)}>+ ADD WALLET</button>
            <button className="btn-ghost" style={{ padding: "0.7rem 1rem" }} onClick={recheck}>PROVE COMBINED TOTAL ↗</button>
          </div>
          <p className="fine">Tiers — I &gt; $100K · II &gt; $500K · III &gt; $1M. {isDevnet ? "Devnet: set mock USD per wallet, then prove." : "Balances arrive via ZKP later."}</p>
        </div>
      )}

      {tab === "profile" && (
        <>
          <div className="card">
            <p className="mono-label">2 / PROOF STATUS</p>
            {elig.tier ? (
              <p style={{ fontFamily: '"DM Mono", monospace', fontSize: "0.75rem" }}>
                ✓ {elig.tier} CLEARED — ${elig.total.toLocaleString()} across {elig.walletCount} wallet(s).
                {elig.expiresAt ? ` Refreshes ${new Date(elig.expiresAt).toLocaleString()}.` : ""}
              </p>
            ) : (
              <p style={{ fontFamily: '"DM Mono", monospace', fontSize: "0.75rem" }}>
                ✕ ${elig.total.toLocaleString()} — below $100K. Link more wallets in the Wallets tab.
              </p>
            )}
            <div style={{ display: "flex", gap: "0.4rem", margin: "0.5rem 0" }}>
              {Object.entries(elig.assetPct).map(([chain, pct]) => (
                <span key={chain} className="tier-badge">{chain} {pct}%</span>
              ))}
              {Object.keys(elig.assetPct).length === 0 && <span className="fine">No allocation data yet.</span>}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <a href="/play" className="btn-solid" style={{ padding: "0.7rem 1rem" }}>PLAY ↗</a>
              <a href="/rooms" className="btn-ghost" style={{ padding: "0.7rem 1rem" }}>ROOMS ↗</a>
            </div>
          </div>
          <div className="card">
            <p className="mono-label">3 / PORTFOLIO VISIBILITY</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["HIDDEN", "CATEGORIES", "FULL"] as const).map((v) => (
                <button key={v} className={profile.visMode === v ? "chip active" : "chip"} onClick={() => saveVis(v)}>{v}</button>
              ))}
            </div>
            <p className="fine">HIDDEN = tier badge only · CATEGORIES = allocation % · FULL = already-doxxed only.</p>
          </div>
        </>
      )}

      {tab === "settings" && (
        <div className="card">
          <p className="mono-label">SETTINGS</p>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input className="field" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="handle (3–24 chars)" style={{ maxWidth: "240px" }} />
            <button className="chip" onClick={saveHandle}>SAVE HANDLE</button>
          </div>
          <p className="fine">API: {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"} · Mode: {isDevnet ? "devnet" : "prod"}</p>
          <button className="btn-ghost" style={{ padding: "0.7rem 1rem" }} onClick={disconnect}>DISCONNECT ALL</button>
        </div>
      )}
      {popup && <ConnectPopup onClose={() => setPopup(false)} onDone={() => { load(); window.dispatchEvent(new Event("sixfigs-auth")); }} />}
    </section>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileInner />
    </Suspense>
  );
}
