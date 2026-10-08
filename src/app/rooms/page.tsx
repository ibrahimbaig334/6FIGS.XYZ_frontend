"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errMsg, getToken, Room, RoomList, RoomMeta } from "../../lib/api";
import { notifyError } from "../../lib/notify";
import { ROOMS_PAGE_SIZE, MAX_ROOMS_PER_USER } from "../../lib/constants";
import SignInButton from "../../components/SignInButton";
import SelectMenu from "../../components/SelectMenu";
import InviteDialog from "../../components/InviteDialog";
import DeleteRoomDialog from "../../components/DeleteRoomDialog";
import Loader from "../../components/Loader";

const TIER_ONLY_PREFIX = "only:";

/** Sliding page list with ellipsis: 1 … 4 5 6 … 12. */
function pageWindow(cur: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  const keep = new Set(
    [1, totalPages, cur - 1, cur, cur + 1].filter(
      (p) => p >= 1 && p <= totalPages,
    ),
  );
  const sorted = Array.from(keep).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p > sorted[i - 1] + 1) out.push("…");
    out.push(p);
  });
  return out;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [owned, setOwned] = useState(0);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [accessFilter, setAccessFilter] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("created");
  const [inviteFor, setInviteFor] = useState<Room | null>(null);
  const [deleteFor, setDeleteFor] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [goto, setGoto] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // "only:TIER x" options live in the same dropdown: they filter to that
      // min-tier (newest first). Tier rooms have no meaning under invite-only.
      const onlyTier = sort.startsWith(TIER_ONLY_PREFIX)
        ? sort.slice(TIER_ONLY_PREFIX.length)
        : "";
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ROOMS_PAGE_SIZE),
        sort: onlyTier ? "created" : sort,
      });
      if (accessFilter) params.set("access", accessFilter);
      if (onlyTier && accessFilter !== "invite") params.set("tier", onlyTier);
      if (q) params.set("q", q);
      const res = await api<RoomList>(`/rooms?${params.toString()}`);
      setRooms(res.items);
      setTotal(res.total);
      setOwned(res.ownedCount ?? 0);
    } catch (e) {
      console.error("rooms load failed", e);
      notifyError(errMsg(e, "Couldn't load rooms — try again"));
    } finally {
      setLoading(false);
    }
  }, [page, accessFilter, q, sort]);

  useEffect(() => {
    setReady(true);
    if (getToken()) void load();
    else setLoading(false);
  }, [load]);

  async function join(r: Room, code?: string) {
    try {
      await api(`/rooms/${r.id}/join`, { method: "POST", body: { code } });
      setInviteFor(null);
      location.href = `/rooms/${r.id}`;
    } catch (e) {
      console.error("join failed", e);
      if (r.accessType === "invite") {
        // Dialog stays open for a retry; the reason lands in the error box.
        notifyError(errMsg(e, "Wrong invite code — try again"));
        return;
      }
      // Tier room: read the entry gate — it carries the specific REASON
      // (tier shortfall, room full, …). The box names the room for context.
      let reason = "";
      try {
        const m = await api<RoomMeta>(`/rooms/${r.id}/meta`);
        reason = m.joinReason ?? "";
      } catch {
        /* meta unavailable — fall back below */
      }
      if (!reason)
        reason = errMsg(
          e,
          r.minTier
            ? `Couldn't join this ${r.minTier} room — try again`
            : "Couldn't join this room — try again",
        );
      notifyError(`${r.name}: ${reason}`);
    }
  }

  function askJoin(r: Room) {
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

  function pickAccess(f: string) {
    setAccessFilter(f);
    // No tier ordering exists for invite rooms — fall back to newest.
    if (
      f === "invite" &&
      (sort === "tier" || sort.startsWith(TIER_ONLY_PREFIX))
    )
      setSort("created");
    setPage(1);
  }

  function pickSort(v: string) {
    // A tier-only view is a tier view, not an invite view.
    if (v.startsWith(TIER_ONLY_PREFIX)) setAccessFilter("");
    setSort(v);
    setPage(1);
  }

  function goToPage() {
    const n = parseInt(goto, 10);
    if (!Number.isNaN(n)) setPage(Math.min(pages, Math.max(1, n)));
    setGoto("");
  }

  // Mounted guard: localStorage token is client-only.
  if (!ready) {
    return (
      <section className="page-enter loader-page">
        <Loader />
      </section>
    );
  }

  if (!getToken()) {
    return (
      <section
        className="page-enter"
        style={{
          padding: "2rem 5vw",
          flex: 1,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "520px",
            textAlign: "center",
            padding: "2.5rem 2rem",
          }}
        >
          <p className="mono-label">ROOMS — SIGN IN</p>
          <div
            style={{
              marginTop: "1.2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <SignInButton onDone={load} />
          </div>
          <p className="fine" style={{ margin: "0.8rem 0 0" }}>
            NEW HERE? CONNECTING A WALLET CREATES YOUR ACCOUNT AND PROVES YOUR
            TIER.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="page-enter"
      style={{
        padding: "2rem 5vw",
        flex: 1,
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
      {/* Join-code feedback lives inside the dialog (error prop below). */}
      <div className="rooms-filter">
        <input
          className="field rooms-q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="search…"
        />
        <div className="filter-chips">
          {["", "tier", "invite"].map((f) => (
            <button
              key={f || "all"}
              className={accessFilter === f ? "chip active" : "chip"}
              onClick={() => pickAccess(f)}
            >
              {f === ""
                ? "ALL"
                : f === "tier"
                  ? "TIER-BASED"
                  : "🔒 INVITE-ONLY"}
            </button>
          ))}
        </div>
        <div className="sortmenu-wrap">
          <SelectMenu
            label="Sort rooms"
            value={sort}
            onChange={pickSort}
            options={[
              { value: "created", label: "NEWEST" },
              { value: "members", label: "MOST MEMBERS" },
              { value: "mine", label: "MY ROOMS" },
              // Invite rooms carry no tier — no tier options under invite-only.
              ...(accessFilter !== "invite"
                ? [
                    { value: "tier", label: "TOP TIER" },
                    { value: "only:TIER I", label: "TIER I ONLY" },
                    { value: "only:TIER II", label: "TIER II ONLY" },
                    { value: "only:TIER III", label: "TIER III ONLY" },
                    { value: "only:TIER IV", label: "TIER IV ONLY" },
                  ]
                : []),
            ]}
          />
        </div>
        <span className="fine rooms-count">
          {total} ROOMS · MY ROOMS {owned}/{MAX_ROOMS_PER_USER} · 1V1 MAX 2 EACH
        </span>
      </div>
      {loading ? (
        <div className="loader-block">
          <Loader label="LOADING ROOMS…" />
        </div>
      ) : rooms.length > 0 ? (
        <div className="room-rows">
          {rooms.map((r) => {
            const onlinePct = Math.min(100, (r.onlineCount / 2) * 100);
            return (
              <div key={r.id} className="room-row">
                <div className="room-main">
                  <div className="room-topline">
                    <span
                      className={
                        r.accessType === "invite"
                          ? "tier-badge t3"
                          : "tier-badge"
                      }
                    >
                      {r.accessType === "invite"
                        ? "🔒 INVITE-ONLY"
                        : `✓ ${r.minTier}`}
                    </span>
                    {r.isOwner && <span className="tier-badge">OWNER</span>}
                  </div>
                  <h3 className="room-name" title={r.name}>
                    {r.name}
                  </h3>
                  {r.description && (
                    <p className="fine room-desc" title={r.description}>
                      {r.description}
                    </p>
                  )}
                  <p className="fine room-meta">
                    BY {r.creatorHandle.toUpperCase()}
                  </p>
                </div>
                <div className="room-side">
                  <span className="fine room-occ">
                    <span className={r.onlineCount > 0 ? "dot on" : "dot"} />
                    {r.onlineCount}/2 ONLINE
                  </span>
                  <div
                    className="meter"
                    role="progressbar"
                    aria-valuenow={r.onlineCount}
                    aria-valuemin={0}
                    aria-valuemax={2}
                    aria-label={`${r.onlineCount} of 2 online`}
                  >
                    <i style={{ width: `${onlinePct}%` }} />
                  </div>
                  <button
                    className="btn-solid btn-sm"
                    onClick={() => askJoin(r)}
                  >
                    {r.accessType === "invite" || !r.isMember
                      ? "JOIN 1V1 ↗"
                      : "ENTER ↗"}
                  </button>
                  {r.isOwner && (
                    <button
                      className="chip room-del"
                      onClick={() => setDeleteFor(r)}
                    >
                      DELETE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="card"
          style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}
        >
          <p className="mono-label">NO ROOMS YET</p>
          <p className="fine">
            Be the first — spin up a 1v1 room for you and a peer.
          </p>
          <a
            href="/create"
            className="btn-solid btn-sm"
            style={{ marginTop: "10px" }}
          >
            + CREATE ROOM
          </a>
        </div>
      )}
      <div className="pager">
        <span className="fine pager-stat">
          PAGE {page} / {pages} · {total} ROOMS
        </span>
        <div className="pager-nav">
          <button
            className="chip"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            title="First page"
            aria-label="First page"
          >
            «
          </button>
          <button
            className="chip"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            title="Previous page"
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="pager-nums">
            {pageWindow(page, pages).map((n, i) =>
              n === "…" ? (
                <span key={`gap-${i}`} className="pager-gap">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  className={n === page ? "chip active" : "chip"}
                  onClick={() => setPage(n)}
                  aria-label={`Page ${n}`}
                  aria-current={n === page ? "page" : undefined}
                >
                  {n}
                </button>
              ),
            )}
          </span>
          <button
            className="chip"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            title="Next page"
            aria-label="Next page"
          >
            ›
          </button>
          <button
            className="chip"
            disabled={page >= pages}
            onClick={() => setPage(pages)}
            title="Last page"
            aria-label="Last page"
          >
            »
          </button>
        </div>
        <label className="pager-goto">
          <input
            className="field"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="GO TO PAGE"
            value={goto}
            onChange={(e) => setGoto(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToPage();
            }}
            aria-label="Go to page"
          />
          <button className="chip" onClick={goToPage}>
            GO
          </button>
        </label>
      </div>
      {inviteFor && (
        <InviteDialog
          roomName={inviteFor.name}
          onClose={() => setInviteFor(null)}
          onSubmit={(code) => join(inviteFor, code)}
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
