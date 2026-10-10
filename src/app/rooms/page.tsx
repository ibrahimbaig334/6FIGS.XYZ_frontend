"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
  LockSimple,
} from "@phosphor-icons/react";
import { api, errMsg, getToken, Room, RoomList, RoomMeta } from "../../lib/api";
import { notifyError } from "../../lib/notify";
import { ROOMS_PAGE_SIZE, MAX_ROOMS_PER_USER } from "../../lib/constants";
import { tierEdgeClass } from "../../lib/tierEdge";
import SignInButton from "../../components/SignInButton";
import SelectMenu from "../../components/SelectMenu";
import InviteDialog from "../../components/InviteDialog";
import DeleteRoomDialog from "../../components/DeleteRoomDialog";
import Loader from "../../components/Loader";
import TierTag from "../../components/TierTag";

const TIER_ONLY_PREFIX = "only:";

/** Sliding page list with ellipsis: 1 ... 4 5 6 ... 12. */
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
      notifyError(errMsg(e, "Couldn't load rooms. Try again."));
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
        notifyError(errMsg(e, "Wrong invite code. Try again."));
        return;
      }
      // Tier room: read the entry gate, which carries the specific reason
      // (tier shortfall, room full). The toast names the room for context.
      let reason = "";
      try {
        const m = await api<RoomMeta>(`/rooms/${r.id}/meta`);
        reason = m.joinReason ?? "";
      } catch {
        /* meta unavailable, fall back below */
      }
      if (!reason)
        reason = errMsg(
          e,
          r.minTier
            ? `Couldn't join this ${r.minTier} room. Try again.`
            : "Couldn't join this room. Try again.",
        );
      notifyError(`${r.name}: ${reason}`);
    }
  }

  function askJoin(r: Room) {
    // Invite rooms enforce the password for everyone, even the creator.
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
    // No tier ordering exists for invite rooms, fall back to newest.
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
        <div className="plate auth-card">
          <h1 className="label">The door</h1>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <SignInButton onDone={load} label="Sign in" />
          </div>
          <p className="fine" style={{ margin: 0 }}>
            New here? Connecting a wallet creates your account and proves
            your tier.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-enter shell" style={{ flex: 1 }}>
      <h1 className="vh">The floor</h1>
      <div className="topline">
        <div className="tabbar">
          <a href="/rooms" className="active">
            Private rooms
          </a>
          <a href="/play">1-on-1</a>
        </div>
        <a href="/create" className="btn btn-primary">
          Set a table
        </a>
      </div>

      <div className="filters">
        <input
          className="field rooms-q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search tables"
        />
        <div className="filter-chips">
          {["", "tier", "invite"].map((f) => (
            <button
              key={f || "all"}
              className={accessFilter === f ? "chip on" : "chip"}
              onClick={() => pickAccess(f)}
            >
              {f === "invite" && <LockSimple size={11} aria-hidden="true" />}
              {f === "" ? "All" : f === "tier" ? "Tier based" : "Invite only"}
            </button>
          ))}
        </div>
        <div className="sortmenu-wrap">
          <SelectMenu
            label="Sort tables"
            value={sort}
            onChange={pickSort}
            options={[
              { value: "created", label: "Newest" },
              { value: "members", label: "Most members" },
              { value: "mine", label: "My tables" },
              // Invite rooms carry no tier, so no tier options under invite-only.
              ...(accessFilter !== "invite"
                ? [
                    { value: "tier", label: "Top tier" },
                    { value: "only:TIER I", label: "Tier I only" },
                    { value: "only:TIER II", label: "Tier II only" },
                    { value: "only:TIER III", label: "Tier III only" },
                    { value: "only:TIER IV", label: "Tier IV only" },
                  ]
                : []),
            ]}
          />
        </div>
        <span className="fine num rooms-count">
          {total === 1 ? "1 table" : `${total} tables`}, {owned}/
          {MAX_ROOMS_PER_USER} yours
        </span>
      </div>

      {loading ? (
        <div className="floor" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-table" />
          ))}
        </div>
      ) : rooms.length > 0 ? (
        <div className="floor">
          {rooms.map((r) => {
            return (
              <article
                key={r.id}
                className={`table-card ${
                  r.accessType === "invite" ? "none" : tierEdgeClass(r.minTier)
                }`}
              >
                <div className="table-info">
                  <h3 className="table-name-big" title={r.name}>
                    {r.name}
                  </h3>
                  <div className="dir-topline">
                    {r.accessType === "invite" ? (
                      <span className="tier-tag">
                        <LockSimple size={11} aria-hidden="true" />
                        Invite only
                      </span>
                    ) : (
                      <TierTag tier={r.minTier} />
                    )}
                    {r.isOwner && <span className="tier-tag">Yours</span>}
                    <span className="fine dir-by" title={r.creatorHandle}>
                      by {r.creatorHandle}
                    </span>
                  </div>
                  {r.description && (
                    <p className="fine dir-desc" title={r.description}>
                      {r.description}
                    </p>
                  )}
                  <div className="table-actions">
                    <span
                      className="fine num"
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <span className={r.onlineCount > 0 ? "dot on" : "dot"} />
                      {r.onlineCount}/2 in the room
                    </span>
                    <button
                      className="btn-primary btn btn-sm"
                      style={{ marginLeft: "auto" }}
                      onClick={() => askJoin(r)}
                    >
                      {r.accessType === "invite" || !r.isMember
                        ? "Join"
                        : "Enter"}
                    </button>
                    {r.isOwner && (
                      <button
                        className="chip danger"
                        onClick={() => setDeleteFor(r)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="plate empty">
          <p className="label">No tables set</p>
          <p className="fine">
            The floor is quiet. Set the first table for you and a peer.
          </p>
          <a href="/create" className="btn btn-primary btn-sm">
            Set a table
          </a>
        </div>
      )}

      <div className="pager">
        <span className="fine num pager-stat">
          Page {page} of {pages}
        </span>
        <div className="pager-nav">
          <button
            className="chip"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            title="First page"
            aria-label="First page"
          >
            <CaretDoubleLeft size={12} aria-hidden="true" />
          </button>
          <button
            className="chip"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            title="Previous page"
            aria-label="Previous page"
          >
            <CaretLeft size={12} aria-hidden="true" />
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
                  className={n === page ? "chip on" : "chip"}
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
            <CaretRight size={12} aria-hidden="true" />
          </button>
          <button
            className="chip"
            disabled={page >= pages}
            onClick={() => setPage(pages)}
            title="Last page"
            aria-label="Last page"
          >
            <CaretDoubleRight size={12} aria-hidden="true" />
          </button>
        </div>
        <label className="pager-goto">
          <input
            className="field"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Page"
            value={goto}
            onChange={(e) => setGoto(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToPage();
            }}
            aria-label="Go to page"
          />
          <button className="chip" onClick={goToPage}>
            Go
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
