"use client";

import { useCallback, useEffect, useState } from "react";
import { api, copyText, getToken, Room, RoomList } from "../../lib/api";
import ConnectPopup from "../../components/ConnectPopup";
import InviteDialog from "../../components/InviteDialog";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [popup, setPopup] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ name: "", accessType: "tier", minTier: "TIER I", inviteCode: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [accessFilter, setAccessFilter] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("created");
  const [inviteFor, setInviteFor] = useState<Room | null>(null);
  const [inviteLink, setInviteLink] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12", sort });
      if (accessFilter) params.set("access", accessFilter);
      if (q) params.set("q", q);
      const res = await api<RoomList>(`/rooms?${params.toString()}`);
      setRooms(res.items);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }, [page, accessFilter, q, sort]);

  useEffect(() => {
    setReady(true);
    if (getToken()) load();
  }, [load]);

  async function join(r: Room, code?: string) {
    setErr("");
    try {
      await api(`/rooms/${r.id}/join`, { method: "POST", body: { code } });
      setInviteFor(null);
      location.href = `/rooms/${r.id}`;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Join failed");
    }
  }

  function askJoin(r: Room) {
    if (r.isMember) {
      // Already inside (creator/previous join) — never re-prompt for a password.
      location.href = `/rooms/${r.id}`;
      return;
    }
    if (r.accessType === "invite") setInviteFor(r);
    else join(r);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const room = await api<{ id: string; inviteCode?: string }>("/rooms", { method: "POST", body: form });
      if (room.inviteCode) {
        const link = `${location.origin}/rooms/${room.id}?code=${room.inviteCode}`;
        sessionStorage.setItem(`invite:${room.id}`, room.inviteCode);
        setInviteLink(link);
      }
      setPage(1);
      await load();
      if (!room.inviteCode) location.href = `/rooms/${room.id}`;
    } catch (err2) {
      setErr(err2 instanceof Error ? err2.message : "Create failed");
    }
  }

  const pages = Math.max(1, Math.ceil(total / 12));

  // Mounted guard: localStorage token is client-only.
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
      <div className="topline" style={{ marginBottom: 0 }}>
        <div className="tabs">
          <a href="/rooms" className="active">Private rooms</a>
          <a href="/play">1v1 chat</a>
        </div>
        <button className="btn-solid" style={{ padding: "0.7rem 1rem" }} onClick={() => setShowCreate(!showCreate)}>
          + CREATE ROOM
        </button>
      </div>
      {err && <p style={{ color: "var(--crimson)", fontFamily: '"DM Mono", monospace', fontSize: "0.7rem" }}>{err}</p>}
      {inviteLink && (
        <div className="invite-box">
          INVITE LINK (share it — shown once): <a href={inviteLink}>{inviteLink}</a>
            <button className="chip" style={{ marginLeft: "0.6rem" }} onClick={() => { copyText(inviteLink); }}>COPY</button>
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <input className="field" style={{ maxWidth: "200px" }} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="search…" />
        {["", "tier", "invite"].map((f) => (
          <button key={f || "all"} className={accessFilter === f ? "chip active" : "chip"} onClick={() => { setAccessFilter(f); setPage(1); }}>
            {f === "" ? "ALL" : f === "tier" ? "TIER-BASED" : "🔒 INVITE-ONLY"}
          </button>
        ))}
        <select className="field" style={{ maxWidth: "170px", flex: "none" }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="created">SORT: NEWEST</option>
          <option value="name">SORT: NAME</option>
          <option value="members">SORT: MEMBERS</option>
        </select>
        <span className="fine" style={{ marginLeft: "auto" }}>{total} ROOMS · 1V1 MAX 2 EACH</span>
      </div>
      {showCreate && (
        <form onSubmit={create} className="card" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}>
          <label className="mono-label">NAME <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="HYPE Talks" /></label>
          <label className="mono-label">VIEW
            <select className="field" value={form.accessType} onChange={(e) => setForm({ ...form, accessType: e.target.value })}>
              <option value="tier">TIER-BASED ENTRY</option>
              <option value="invite">INVITE-ONLY</option>
            </select>
          </label>
          {form.accessType === "tier" ? (
            <label className="mono-label">TIERS
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
                {r.accessType === "invite" ? "🔒 INVITE-ONLY" : `✓ ${r.minTier}`}
              </span>
              <span className="fine">{r.memberCount}/2 MEMBERS</span>
            </div>
            <h3 style={{ margin: "0.5rem 0" }}>{r.name}</h3>
            <button className="btn-solid" style={{ padding: "0.6rem 0.9rem" }} onClick={() => askJoin(r)}>
              {r.isMember ? "ENTER ↗" : "JOIN 1V1 ↗"}
            </button>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}>
          <button className="chip" disabled={page <= 1} onClick={() => setPage(page - 1)}>← PREV</button>
          <span className="mono-label">PAGE {page} / {pages}</span>
          <button className="chip" disabled={page >= pages} onClick={() => setPage(page + 1)}>NEXT →</button>
        </div>
      )}
      {inviteFor && (
        <InviteDialog
          roomName={inviteFor.name}
          onClose={() => setInviteFor(null)}
          onSubmit={(code) => join(inviteFor, code)}
        />
      )}
    </section>
  );
}
