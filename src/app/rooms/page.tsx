"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getToken, Room, RoomList } from "../../lib/api";
import { ROOMS_PAGE_SIZE } from "../../lib/constants";
import ConnectPopup from "../../components/ConnectPopup";
import InviteDialog from "../../components/InviteDialog";
import DeleteRoomDialog from "../../components/DeleteRoomDialog";
import Loader from "../../components/Loader";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [owned, setOwned] = useState(0);
  const [page, setPage] = useState(1);
  const [popup, setPopup] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [accessFilter, setAccessFilter] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("created");
  const [inviteFor, setInviteFor] = useState<Room | null>(null);
  const [deleteFor, setDeleteFor] = useState<Room | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ROOMS_PAGE_SIZE),
        sort,
      });
      if (accessFilter) params.set("access", accessFilter);
      if (q) params.set("q", q);
      const res = await api<RoomList>(`/rooms?${params.toString()}`);
      setRooms(res.items);
      setTotal(res.total);
      setOwned(res.ownedCount ?? 0);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }, [page, accessFilter, q, sort]);

  useEffect(() => {
    setReady(true);
    if (getToken()) load().finally(() => setInitialLoading(false));
    else setInitialLoading(false);
  }, [load]);

  async function join(r: Room, code?: string) {
    setErr("");
    try {
      await api(`/rooms/${r.id}/join`, { method: "POST", body: { code } });
      setInviteFor(null);
      location.href = `/rooms/${r.id}`;
    } catch (e) {
      // Invalid password lands INSIDE the popup (dialog stays open with the message).
      setErr(e instanceof Error ? e.message : "Join failed");
    }
  }

  function askJoin(r: Room) {
    setErr("");
    // Invite rooms enforce the password for everyone — even the creator/members.
    if (r.accessType === "invite") {
      setInviteFor(r);
      return;
    }
    if (r.isMember) {
      location.href = `/rooms/${r.id}`;
      return;
    }
    join(r);
  }

  async function confirmDelete(r: Room) {
    await api(`/rooms/${r.id}`, { method: "DELETE" });
    setDeleteFor(null);
    await load();
  }

  const pages = Math.max(1, Math.ceil(total / ROOMS_PAGE_SIZE));

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
          <button className="btn-solid" onClick={() => setPopup(true)}>
            CONNECT WALLET ↗
          </button>
        </div>
        {popup && (
          <ConnectPopup onClose={() => setPopup(false)} onDone={load} />
        )}
      </section>
    );
  }

  return (
    <section
      className="page-enter"
      style={{
        padding: "2rem 5vw",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div className="topline" style={{ marginBottom: 0 }}>
        <div className="tabs">
          <a href="/rooms" className="active">
            Private rooms
          </a>
          <a href="/play">1v1 chat</a>
        </div>
        <a href="/create" className="btn-solid">
          + CREATE ROOM
        </a>
      </div>
      {err && !inviteFor && <p className="err">{err}</p>}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          className="field"
          style={{ maxWidth: "200px" }}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="search…"
        />
        {["", "tier", "invite"].map((f) => (
          <button
            key={f || "all"}
            className={accessFilter === f ? "chip active" : "chip"}
            onClick={() => {
              setAccessFilter(f);
              setPage(1);
            }}
          >
            {f === "" ? "ALL" : f === "tier" ? "TIER-BASED" : "🔒 INVITE-ONLY"}
          </button>
        ))}
        <select
          className="field"
          style={{ maxWidth: "190px", flex: "none" }}
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="created">SORT: NEWEST</option>
          <option value="members">SORT: MEMBERS</option>
          <option value="mine">SORT: MY ROOMS</option>
        </select>
        <span className="fine" style={{ marginLeft: "auto" }}>
          {total} ROOMS · MY ROOMS {owned}/3 · 1V1 MAX 2 EACH
        </span>
      </div>
      <div className="grid-cards">
        {initialLoading ? (
          <div className="card">
            <Loader label="LOADING ROOMS…" />
          </div>
        ) : (
          rooms.map((r) => (
            <div key={r.id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  className={
                    r.accessType === "invite" ? "tier-badge t3" : "tier-badge"
                  }
                >
                  {r.accessType === "invite"
                    ? "🔒 INVITE-ONLY"
                    : `✓ ${r.minTier}`}
                </span>
                <span className="fine">
                  <span className={r.onlineCount > 0 ? "dot on" : "dot"} />{" "}
                  {r.onlineCount}/2 ONLINE
                </span>
              </div>
              <h3 style={{ margin: "0.5rem 0 0.2rem" }}>{r.name}</h3>
              {r.description && (
                <p className="fine" style={{ margin: "0 0 0.4rem" }}>
                  {r.description}
                </p>
              )}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <button className="btn-solid btn-sm" onClick={() => askJoin(r)}>
                  {r.accessType === "invite" || !r.isMember
                    ? "JOIN 1V1 ↗"
                    : "ENTER ↗"}
                </button>
                {r.isOwner && (
                  <button
                    className="chip"
                    style={{
                      color: "var(--crimson)",
                      borderColor: "var(--crimson)",
                    }}
                    onClick={() => setDeleteFor(r)}
                  >
                    DELETE
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {pages > 1 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            className="chip"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ← PREV
          </button>
          <span className="mono-label">
            PAGE {page} / {pages}
          </span>
          <button
            className="chip"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            NEXT →
          </button>
        </div>
      )}
      {!initialLoading && rooms.length === 0 && (
        <div
          className="card"
          style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}
        >
          <p className="mono-label">NO ROOMS YET</p>
          <p className="fine">
            Be the first — spin up a 1v1 room for you and a peer.
          </p>
          <a href="/create" className="btn-solid btn-sm">
            + CREATE ROOM
          </a>
        </div>
      )}
      {inviteFor && (
        <InviteDialog
          roomName={inviteFor.name}
          onClose={() => {
            setInviteFor(null);
            setErr("");
          }}
          onSubmit={(code) => join(inviteFor, code)}
          error={err}
        />
      )}
      {deleteFor && (
        <DeleteRoomDialog
          roomName={deleteFor.name}
          onClose={() => setDeleteFor(null)}
          onConfirm={() => confirmDelete(deleteFor)}
        />
      )}
    </section>
  );
}
