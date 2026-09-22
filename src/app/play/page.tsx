"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, Peer, Profile } from "../../lib/api";
import ConnectPopup from "../../components/ConnectPopup";

export default function PlayPage() {
  const router = useRouter();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [popup, setPopup] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("filter", filter);
      if (q) params.set("q", q);
      setPeers(await api<Peer[]>(`/play/online?${params.toString()}`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
    if (getToken()) {
      try {
        setProfile(await api<Profile>("/profile/me"));
      } catch {
        setProfile(null);
      }
    }
  }, [filter, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function quickplay() {
    setStatus("Finding a random online member…");
    setErr("");
    try {
      const r = await api<{ gameId: string }>("/play/queue", { method: "POST" });
      router.push(`/game/${r.gameId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Queue failed");
      setStatus("");
    }
  }

  // Mounted guard (see rooms page): localStorage token is client-only.
  if (!ready) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <p className="mono-label">LOADING PLAY…</p>
      </section>
    );
  }

  if (!getToken()) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <div className="card">
          <p className="mono-label">PLAY — CONNECT FIRST</p>
          <button className="btn-solid" onClick={() => setPopup(true)}>CONNECT WALLET ↗</button>
        </div>
        {popup && <ConnectPopup onClose={() => setPopup(false)} onDone={load} />}
      </section>
    );
  }

  const tier = profile?.eligibility.tier;

  return (
    <section style={{ padding: "2rem 5vw", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p className="mono-label">FIND A MATCH</p>
          <h2 style={{ margin: "0.3rem 0 0" }}>Verified holders. Pick your table.</h2>
        </div>
        <span className="tier-badge" style={{ marginLeft: "auto" }}>{tier ? `YOU · ${tier}` : "UNVERIFIED"}</span>
      </div>
      {!tier && (
        <div className="gate-note">
          <p><strong>Locked.</strong> Verify ≥ $100K in Profile to queue — connecting alone isn&apos;t enough.</p>
          <a href="/profile" className="btn-solid" style={{ padding: "0.6rem 0.9rem" }}>GO TO PROFILE ↗</a>
        </div>
      )}
      <div className="card">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn-solid" onClick={quickplay} disabled={!tier}>🎲 QUICK PLAY — RANDOM</button>
          <a href="/rooms" className="btn-ghost" style={{ padding: "1rem 1.2rem" }}>BROWSE ROOMS ↓</a>
        </div>
        {status && <p className="fine">{status}</p>}
        {err && <p style={{ color: "var(--crimson)", fontFamily: '"DM Mono", monospace', fontSize: "0.7rem" }}>{err}</p>}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        {["", "TIER I", "TIER II", "TIER III"].map((f) => (
          <button key={f || "all"} className={filter === f ? "chip active" : "chip"} onClick={() => setFilter(f)}>
            {f || "ALL TIERS"}
          </button>
        ))}
        <input className="field" style={{ maxWidth: "220px" }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="search handle…" />
      </div>
      <div className="grid-cards">
        {peers.map((p) => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={p.tier === "TIER III" ? "tier-badge t3" : "tier-badge"}>✓ {p.tier}</span>
              <span className="fine">{p.tags.slice(0, 2).join(" · ")}</span>
            </div>
            <h3 style={{ margin: "0.5rem 0", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className={p.online ? "dot on" : "dot"} title={p.online ? "Online" : "Offline"} />
              {p.handle}
              <span className="fine">{p.online ? "ONLINE" : "OFFLINE"}</span>
            </h3>
            <button className="btn-solid" style={{ padding: "0.6rem 0.9rem" }} disabled={!tier} onClick={quickplay}>OPEN ROOM ↗</button>
          </div>
        ))}
      </div>
      {peers.length === 0 && <p className="fine">Nobody online with this filter.</p>}
    </section>
  );
}
