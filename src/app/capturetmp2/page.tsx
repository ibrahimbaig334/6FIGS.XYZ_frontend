"use client";

// TEMPORARY capture harness — reproduces the real rooms directory markup
// (same classes as src/app/rooms/page.tsx) with representative data.
import type { Room } from "../../lib/api";

const rooms: Room[] = [
  { id: "r1", name: "Crypto Degens", description: "High-conviction plays, no leverage talk.", imageUrl: null, accessType: "tier", minTier: "TIER I", memberCount: 2, onlineCount: 2, createdAt: "", isMember: true, isOwner: false, creatorHandle: "0xWhale" },
  { id: "r2", name: "BTC Maxis", description: "Orange coin only. Invite code required.", imageUrl: null, accessType: "invite", minTier: null, memberCount: 2, onlineCount: 1, createdAt: "", isMember: false, isOwner: false, creatorHandle: "SatoshiJnr" },
  { id: "r3", name: "HYPE Talks", description: "Perps, points, and the meta.", imageUrl: null, accessType: "tier", minTier: "TIER II", memberCount: 1, onlineCount: 1, createdAt: "", isMember: false, isOwner: true, creatorHandle: "0xWhale" },
  { id: "r4", name: "Solana OGs", description: "Since the bear. Still here.", imageUrl: null, accessType: "tier", minTier: "TIER III", memberCount: 2, onlineCount: 0, createdAt: "", isMember: false, isOwner: false, creatorHandle: "SolWhale" },
];

export default function CaptureRooms() {
  return (
    <section className="page-enter" style={{ padding: "2rem 5vw", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="topline" style={{ marginBottom: 0 }}>
        <div className="tabs">
          <a href="/rooms" className="active">Private rooms</a>
          <a href="/play">1v1 chat</a>
        </div>
        <a href="/create" className="btn-solid">+ CREATE ROOM</a>
      </div>
      <div className="rooms-filter">
        <input className="field rooms-q" placeholder="search…" defaultValue="" readOnly />
        <div className="filter-chips">
          <button className="chip active">ALL</button>
          <button className="chip">TIER-BASED</button>
          <button className="chip">🔒 INVITE-ONLY</button>
        </div>
        <span className="fine rooms-count">4 ROOMS · MY ROOMS 1/3 · 1V1 MAX 2 EACH</span>
      </div>
      <div className="room-rows">
        {rooms.map((r) => {
          const onlinePct = Math.min(100, (r.onlineCount / 2) * 100);
          return (
            <div key={r.id} className="room-row">
              <div className="room-main">
                <div className="room-topline">
                  <span className={r.accessType === "invite" ? "tier-badge t3" : "tier-badge"}>
                    {r.accessType === "invite" ? "🔒 INVITE-ONLY" : `✓ ${r.minTier}`}
                  </span>
                  {r.isOwner && <span className="tier-badge">OWNER</span>}
                </div>
                <h3 className="room-name" title={r.name}>{r.name}</h3>
                {r.description && <p className="fine room-desc" title={r.description}>{r.description}</p>}
                <p className="fine room-meta">BY {r.creatorHandle.toUpperCase()}</p>
              </div>
              <div className="room-side">
                <span className="fine room-occ">
                  <span className={r.onlineCount > 0 ? "dot on" : "dot"} />
                  {r.onlineCount}/2 ONLINE
                </span>
                <div className="meter" role="progressbar" aria-valuenow={r.onlineCount} aria-valuemin={0} aria-valuemax={2}>
                  <i style={{ width: `${onlinePct}%` }} />
                </div>
                <button className="btn-solid btn-sm">
                  {r.accessType === "invite" || !r.isMember ? "JOIN 1V1 ↗" : "ENTER ↗"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
