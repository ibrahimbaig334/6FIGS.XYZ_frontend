"use client";

import { useEffect, useState } from "react";
import { api, getToken, Room } from "../../lib/api";
import ConnectPopup from "../../components/ConnectPopup";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [popup, setPopup] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", accessType: "tier", minTier: "TIER I", inviteCode: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function load() {
    try {
      setRooms(await api<Room[]>("/rooms"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }

  useEffect(() => {
    if (getToken()) load();
  }, []);

  async function join(r: Room) {
    setErr("");
    try {
      let code: string | undefined;
      if (r.accessType === "invite") {
        const c = prompt(`"${r.name}" is invite-only. Enter code:`);
        if (!c) return;
        code = c;
      }
      await api(`/rooms/${r.id}/join`, { method: "POST", body: { code } });
      location.href = `/rooms/${r.id}`;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Join failed");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const room = await api<{ id: string }>("/rooms", { method: "POST", body: form });
      location.href = `/rooms/${room.id}`;
    } catch (err2) {
      setErr(err2 instanceof Error ? err2.message : "Create failed");
    }
  }

  // Mounted guard: token lives in localStorage (client-only). Rendering the
  // authed tree before mount hydrates against the server's logged-out HTML.
  if (!ready) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <p className="mono-label">LOADING ROOMS…</p>
      </section>
    );
  }

  if (!getToken()) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <div className="card">
          <p className="mono-label">ROOMS — CONNECT FIRST</p>
          <button className="btn-solid" onClick={() => setPopup(true)}>CONNECT WALLET ↗</button>
        </div>
        {popup && <ConnectPopup onClose={() => setPopup(false)} onDone={load} />}
      </section>
    );
  }

  return (
    <section style={{ padding: "2rem 5vw", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <p className="mono-label">PRIVATE ROOMS</p>
          <h2 style={{ margin: "0.3rem 0 0" }}>Tier-gated lounges + invite-only dens.</h2>
        </div>
        <button className="btn-solid" style={{ marginLeft: "auto", padding: "0.7rem 1rem" }} onClick={() => setShowCreate(!showCreate)}>+ CREATE ROOM</button>
      </div>
      {err && <p style={{ color: "var(--crimson)", fontFamily: '"DM Mono", monospace', fontSize: "0.7rem" }}>{err}</p>}
      {showCreate && (
        <form onSubmit={create} className="card" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}>
          <label className="mono-label">NAME <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My lounge" /></label>
          <label className="mono-label">ACCESS
            <select className="field" value={form.accessType} onChange={(e) => setForm({ ...form, accessType: e.target.value })}>
              <option value="tier">TIER-GATED</option>
              <option value="invite">INVITE-ONLY</option>
            </select>
          </label>
          {form.accessType === "tier" ? (
            <label className="mono-label">MIN TIER
              <select className="field" value={form.minTier} onChange={(e) => setForm({ ...form, minTier: e.target.value })}>
                <option>TIER I</option><option>TIER II</option><option>TIER III</option>
              </select>
            </label>
          ) : (
            <label className="mono-label">INVITE CODE <input className="field" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} placeholder="SECRET1" /></label>
          )}
          <button className="btn-solid" style={{ padding: "0.7rem 1rem" }} type="submit">CREATE ↗</button>
        </form>
      )}
      <div className="grid-cards">
        {rooms.map((r) => (
          <div key={r.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={r.accessType === "invite" ? "tier-badge t3" : "tier-badge"}>
                {r.accessType === "invite" ? "🔒 INVITE" : `✓ ${r.minTier}`}
              </span>
              <span className="fine">{r.memberCount} MEMBERS</span>
            </div>
            <h3 style={{ margin: "0.5rem 0" }}>{r.name}</h3>
            <button className="btn-solid" style={{ padding: "0.6rem 0.9rem" }} onClick={() => join(r)}>JOIN ROOM ↗</button>
          </div>
        ))}
      </div>
    </section>
  );
}
