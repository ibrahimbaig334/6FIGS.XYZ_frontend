"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, Peer, Profile, timeAgo } from "../../lib/api";
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
        setProfile(await api<Profile>("/profile/user"));
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

  async function challenge(peer: Peer) {
    setStatus(`Challenging ${peer.handle}…`);
    setErr("");
    try {
      const r = await api<{ gameId: string }>("/play/challenge", { method: "POST", body: { userId: peer.id } });
      router.push(`/game/${r.gameId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Challenge failed");
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
      <div className="topline" style={{ marginBottom: 0 }}>
        <div className="tabs">
          <a href="/rooms">Private rooms</a>
          <a href="/play" className="active">1v1 chat</a>
        </div>
        <span className="tier-badge">{tier ? `YOU · ${tier}` : "UNVERIFIED"}</span>
      </div>
      {!tier && (
        <div className="gate-note">
          <p><strong>Locked.</strong> Verify ≥ $100K in <a href="/profile">Profile</a> to play.</p>
          <a href="/profile" className="btn-solid" style={{ padding: "0.6rem 0.9rem" }}>GO TO PROFILE ↗</a>
        </div>
      )}
      <div className="card">
        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-solid" onClick={quickplay} disabled={!tier}>RANDOM</button>
          <span className="mono-label">or</span>
          <span className="btn-ghost" style={{ cursor: "default" }}>WITH FRIENDS ↓</span>
        </div>
        {status && <p className="fine" style={{ textAlign: "center" }}>{status}</p>}
        {err && <p style={{ color: "var(--crimson)", fontFamily: '"DM Mono", monospace', fontSize: "0.7rem", textAlign: "center" }}>{err}</p>}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input className="field" style={{ maxWidth: "220px" }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="search…" />
        {["", "TIER I", "TIER II", "TIER III"].map((f) => (
          <button key={f || "all"} className={filter === f ? "chip active" : "chip"} onClick={() => setFilter(f)}>
            {f ? f.replace("TIER ", "") : "FILTER: ALL"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {peers.map((p) => (
          <div key={p.id} className="peer-row">
            <span className={p.online ? "dot on" : "dot"} title={p.online ? "Online" : "Offline"} />
            <strong style={{ fontSize: "1.05rem" }}>{p.handle}</strong>
            <span className="fine">{timeAgo(p.lastSeenAt)}</span>
            <span className="fine">{p.online ? "ONLINE" : "OFFLINE"}</span>
            <span className={p.tier === "TIER III" ? "tier-badge t3" : "tier-badge"}>{p.tier}</span>
            <button className="btn-solid" style={{ padding: "0.55rem 0.9rem", marginLeft: "auto" }} disabled={!tier} onClick={() => challenge(p)}>
              PLAY ↗
            </button>
          </div>
        ))}
      </div>
      {peers.length === 0 && <p className="fine">Nobody online with this filter.</p>}
    </section>
  );
}
