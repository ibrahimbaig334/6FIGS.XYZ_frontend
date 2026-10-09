"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import {
  api,
  errMsg,
  Friend,
  FriendList,
  getToken,
  Profile,
  RoomRequestInfo,
  timeAgo,
} from "../../lib/api";
import {
  FRIENDS_PAGE_SIZE,
  JOIN_REDIRECT_MS,
  POLL_FRIENDS_MS,
  POLL_QUEUE_MS,
  POLL_REQUESTS_MS,
  REQUEST_TIMEOUT_MS,
} from "../../lib/constants";
import { connectSocket } from "../../lib/ws";
import { notifyError } from "../../lib/notify";
import SignInButton from "../../components/SignInButton";
import SelectMenu from "../../components/SelectMenu";
import Loader from "../../components/Loader";
import Chop from "../../components/Chop";
import TierTag from "../../components/TierTag";

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

export default function PlayPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendTotal, setFriendTotal] = useState(0);
  const [friendPage, setFriendPage] = useState(1);
  const [friendSort, setFriendSort] = useState("created");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [q, setQ] = useState("");
  const [ready, setReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [outgoing, setOutgoing] = useState<RoomRequestInfo[]>([]);
  // Offer outcomes (declined / no response) land in the error toast only.
  const [joining, setJoining] = useState<string | null>(null); // overlay text while connecting to a room
  const [initialLoading, setInitialLoading] = useState(true);
  const [goto, setGoto] = useState("");
  const searchingRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // 15s response window per outgoing request: fires the no-response expiry.
  const reqTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const outgoingRef = useRef<RoomRequestInfo[]>([]);

  useEffect(() => {
    setReady(true);
    const pending = timers.current;
    const reqs = reqTimers.current;
    return () => {
      pending.forEach(clearTimeout);
      reqs.forEach(clearTimeout);
      reqs.clear();
    };
  }, []);

  // WS handlers read the freshest outgoing list without stale closures.
  useEffect(() => {
    outgoingRef.current = outgoing;
  }, [outgoing]);

  const refreshFriends = useCallback(async () => {
    if (!getToken()) return; // gate is showing: no session, no calls
    try {
      const params = new URLSearchParams({
        page: String(friendPage),
        limit: String(FRIENDS_PAGE_SIZE),
        sort: friendSort,
      });
      // Name sort runs A to Z; the rest keep newest-first.
      if (friendSort === "name") params.set("order", "asc");
      if (q) params.set("q", q);
      const res = await api<FriendList>(`/play/friends?${params.toString()}`);
      setFriends(res.items);
      setFriendTotal(res.total);
    } catch (e) {
      // Keep the last known list through blips; the reason lands in the error box.
      console.error("friends load failed", e);
      notifyError(errMsg(e, "Couldn't load your connections. Try again."));
    }
  }, [q, friendPage, friendSort]);

  const load = useCallback(async () => {
    if (!getToken()) return; // gate is showing: no session, no calls
    refreshFriends();
    try {
      const out = await api<RoomRequestInfo[]>("/play/requests/outgoing");
      out.forEach(armRequestTimer);
      setOutgoing((prev) => {
        // Requester side: an accepted outgoing means "join the game now".
        const acc = out.find((o) => o.status === "accepted" && o.gameId);
        if (
          acc &&
          !prev.some((p) => p.id === acc.id && p.status === "accepted")
        ) {
          joinRoomWithOverlay(
            `Accepted. Joining ${acc.toHandle}'s table.`,
            acc.gameId as string,
          );
        }
        return out;
      });
    } catch (e) {
      console.error("play load failed", e);
      notifyError(errMsg(e, "Couldn't load your requests. Try again."));
    }
    if (getToken()) {
      try {
        setProfile(await api<Profile>("/profile/user"));
      } catch {
        setProfile(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, refreshFriends]);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  function joinRoomWithOverlay(text: string, gameId: string) {
    setJoining(text);
    setSearching(false);
    searchingRef.current = false;
    later(() => router.push(`/game/${gameId}`), JOIN_REDIRECT_MS);
  }

  useEffect(() => {
    load().finally(() => setInitialLoading(false));
  }, [load]);

  // Realtime matchmaking events (polling below is the fallback).
  // Incoming offers live in the global ChallengeToast; this tab only tracks
  // the requests WE sent (accept/decline outcomes land on the connection row).
  useEffect(() => {
    if (!ready || !getToken()) return;
    const s = connectSocket();
    const onAccepted = (p: { requestId: string; gameId: string }) => {
      const hit = outgoingRef.current.find((o) => o.id === p.requestId);
      clearRequestTimer(p.requestId);
      if (hit) joinRoomWithOverlay("Accepted. Joining the table.", p.gameId);
      setOutgoing((prev) =>
        prev.map((o) =>
          o.id === p.requestId
            ? { ...o, status: "accepted", gameId: p.gameId }
            : o,
        ),
      );
    };
    const onDeclined = (p: { requestId: string }) => {
      clearRequestTimer(p.requestId);
      const hit = outgoingRef.current.find((o) => o.id === p.requestId);
      if (hit) {
        notifyError(`${hit.toHandle} declined the request.`);
      }
      setOutgoing((prev) => prev.filter((o) => o.id !== p.requestId));
    };
    s.on("requestAccepted", onAccepted);
    s.on("requestDeclined", onDeclined);
    return () => {
      s.off("requestAccepted", onAccepted);
      s.off("requestDeclined", onDeclined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Poll outgoing while on the tab (covers missed WS events).
  useEffect(() => {
    if (!ready || !getToken()) return;
    const t = setInterval(() => {
      api<RoomRequestInfo[]>("/play/requests/outgoing")
        .then((out) => {
          out.forEach(armRequestTimer);
          const acc = out.find((o) => o.status === "accepted" && o.gameId);
          if (acc)
            joinRoomWithOverlay(
              `Accepted. Joining ${acc.toHandle}'s table.`,
              acc.gameId as string,
            );
          else setOutgoing(out);
        })
        .catch(() => {});
    }, POLL_REQUESTS_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Presence refreshes every 5s; dots go live without a reload.
  useEffect(() => {
    if (!ready || !getToken()) return;
    const t = setInterval(refreshFriends, POLL_FRIENDS_MS);
    return () => clearInterval(t);
  }, [ready, refreshFriends]);

  // Elapsed ticker + status poll while searching.
  useEffect(() => {
    if (!searching) return;
    const t0 = Date.now();
    const tick = setInterval(
      () => setElapsed(Math.floor((Date.now() - t0) / 1000)),
      1000,
    );
    const poll = setInterval(async () => {
      if (!searchingRef.current) return;
      try {
        const st = await api<{ status: string; gameId?: string }>(
          "/play/queue/status",
        );
        if (!searchingRef.current) return;
        if (st.status === "matched" && st.gameId) {
          searchingRef.current = false;
          setSearching(false);
          router.push(`/game/${st.gameId}`);
        } else if (st.status === "idle") {
          searchingRef.current = false;
          setSearching(false);
        }
      } catch {
        /* keep searching through blips */
      }
    }, POLL_QUEUE_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  async function quickplay() {
    setElapsed(0);
    try {
      const r = await api<{ status: string; gameId?: string }>("/play/queue", {
        method: "POST",
      });
      if (r.status === "matched" && r.gameId) {
        router.push(`/game/${r.gameId}`);
        return;
      }
      searchingRef.current = true;
      setSearching(true); // the veil locks the tab until matched/cancelled
    } catch (e) {
      console.error("queue failed", e);
      notifyError(errMsg(e, "Couldn't join the queue. Try again."));
    }
  }

  async function cancelSearch() {
    searchingRef.current = false;
    setSearching(false);
    try {
      await api("/play/queue", { method: "DELETE" });
    } catch {
      /* already gone */
    }
  }

  function clearRequestTimer(id: string) {
    const t = reqTimers.current.get(id);
    if (t) clearTimeout(t);
    reqTimers.current.delete(id);
  }

  /** Start (or resume) the 15s window on an outgoing request; at the mark the
   *  offer is withdrawn server-side and the row shows "No response". */
  function armRequestTimer(r: RoomRequestInfo) {
    if (r.status !== "pending" || reqTimers.current.has(r.id)) return;
    const created = Date.parse(r.createdAt);
    const left = Number.isNaN(created)
      ? REQUEST_TIMEOUT_MS
      : REQUEST_TIMEOUT_MS - (Date.now() - created);
    reqTimers.current.set(
      r.id,
      setTimeout(
        () => expireRequest(r.id, r.toUserId, r.toHandle),
        Math.max(0, left),
      ),
    );
  }

  function expireRequest(id: string, friendId: string, handle: string) {
    clearRequestTimer(id);
    setOutgoing((prev) => prev.filter((o) => o.id !== id));
    api(`/play/requests/${id}/cancel`, { method: "POST" })
      .then(() => {
        notifyError(`${handle} didn't respond.`);
      })
      .catch((e) => {
        // Accepted in the same breath; the join flow takes over, no note.
        console.error("request expire failed", e);
      });
  }

  async function sendRequest(f: Friend) {
    try {
      const r = await api<RoomRequestInfo>("/play/request", {
        method: "POST",
        body: { userId: f.id },
      });
      setOutgoing((prev) => [r, ...prev]);
      armRequestTimer(r);
    } catch (e) {
      console.error("request failed", e);
      notifyError(errMsg(e, "Couldn't send the request. Try again."));
    }
  }

  async function cancelRequest(id: string) {
    clearRequestTimer(id);
    try {
      await api(`/play/requests/${id}/cancel`, { method: "POST" });
      setOutgoing((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      console.error("cancel request failed", e);
      notifyError(errMsg(e, "Couldn't cancel. Try again."));
    }
  }

  const pendingTo = (friendId: string) =>
    outgoing.find((o) => o.toUserId === friendId);

  const friendPages = Math.max(1, Math.ceil(friendTotal / FRIENDS_PAGE_SIZE));

  function goToPage() {
    const n = parseInt(goto, 10);
    if (!Number.isNaN(n)) setFriendPage(Math.min(friendPages, Math.max(1, n)));
    setGoto("");
  }

  function pickSort(v: string) {
    setFriendSort(v);
    setFriendPage(1);
  }

  // Mounted guard (see rooms page): localStorage token is client-only.
  if (!ready) {
    return (
      <section className="page-enter loader-page">
        <Loader label="Walking the floor" />
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
              marginTop: "1.2rem",
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

  const tier = profile?.eligibility.tier;

  return (
    <section className="page-enter shell" style={{ flex: 1 }}>
      <h1 className="vh">Play</h1>
      <div className="topline">
        <div className="tabbar">
          <a href="/rooms">Private rooms</a>
          <a href="/play" className="active">
            1-on-1
          </a>
        </div>
        <TierTag tier={tier ?? null} />
      </div>

      <div className="plate" style={{ textAlign: "center" }}>
        <p className="fine" style={{ marginBottom: "0.9rem" }}>
          Random seats you at a table with another searching member. One
          message each way makes you connections.
        </p>
        <button className="btn btn-primary" onClick={quickplay} disabled={!tier || searching}>
          Take a seat
        </button>
        {!tier && (
          <p className="fine" style={{ marginTop: "0.8rem" }}>
            The tables are gated by tier. Verify your holdings in Profile
            first.
          </p>
        )}
      </div>

      <div className="filters">
        <input
          className="field rooms-q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setFriendPage(1);
          }}
          placeholder="Search connections"
        />
        <div className="sortmenu-wrap">
          <SelectMenu
            label="Sort connections"
            value={friendSort}
            onChange={pickSort}
            options={[
              { value: "created", label: "Newest" },
              { value: "name", label: "Name A to Z" },
              { value: "online", label: "Online first" },
            ]}
          />
        </div>
        <span className="fine num rooms-count">{friendTotal} connections</span>
      </div>

      {initialLoading ? (
        <div className="floor" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-table" />
          ))}
        </div>
      ) : (
        <div className="floor">
          {friends.map((p) => {
            const pend = pendingTo(p.id);
            return (
              <div key={p.id} className="friend-row">
                <span
                  className={`friend-av${p.online ? " live" : ""}`}
                  aria-hidden="true"
                >
                  <Chop id={p.id} size="md" />
                </span>
                <div className="dir-main">
                  <div className="dir-topline">
                    <strong className="dir-name" title={p.handle}>
                      {p.handle}
                    </strong>
                  </div>
                  <p className="fine dir-meta">
                    <span
                      className={p.online ? "dot on" : "dot"}
                      title={p.online ? "Online" : "Offline"}
                    />{" "}
                    {p.online ? "at the tables" : `away, ${timeAgo(p.lastSeenAt)}`}
                  </p>
                </div>
                <div className="friend-side">
                  <TierTag tier={p.tier} />
                  {pend ? (
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => cancelRequest(pend.id)}
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!tier || !p.online}
                      title={!tier ? "Verify your tier first" : "Invite to a table"}
                      onClick={() => sendRequest(p)}
                    >
                      {p.online ? "Invite" : "Away"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {friends.length === 0 && !initialLoading && (
        <div className="plate empty">
          <p className="label">No connections yet</p>
          <p className="fine">
            Take a seat at a random table and meet someone.
          </p>
        </div>
      )}

      <div className="pager">
        <span className="fine num pager-stat">
          Page {friendPage} of {friendPages}
        </span>
        <div className="pager-nav">
          <button
            className="chip"
            disabled={friendPage <= 1}
            onClick={() => setFriendPage(1)}
            title="First page"
            aria-label="First page"
          >
            <CaretDoubleLeft size={12} aria-hidden="true" />
          </button>
          <button
            className="chip"
            disabled={friendPage <= 1}
            onClick={() => setFriendPage(friendPage - 1)}
            title="Previous page"
            aria-label="Previous page"
          >
            <CaretLeft size={12} aria-hidden="true" />
          </button>
          <span className="pager-nums">
            {pageWindow(friendPage, friendPages).map((n, i) =>
              n === "…" ? (
                <span key={`gap-${i}`} className="pager-gap">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  className={n === friendPage ? "chip on" : "chip"}
                  onClick={() => setFriendPage(n)}
                  aria-label={`Page ${n}`}
                  aria-current={n === friendPage ? "page" : undefined}
                >
                  {n}
                </button>
              ),
            )}
          </span>
          <button
            className="chip"
            disabled={friendPage >= friendPages}
            onClick={() => setFriendPage(friendPage + 1)}
            title="Next page"
            aria-label="Next page"
          >
            <CaretRight size={12} aria-hidden="true" />
          </button>
          <button
            className="chip"
            disabled={friendPage >= friendPages}
            onClick={() => setFriendPage(friendPages)}
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

      {(searching || joining) && (
        <div className="search-veil" role="alertdialog" aria-label="Matchmaking">
          <div className="search-scene">
            <div className="hero-table-top search-table" aria-hidden="true" />
            <div className="search-card">
              <div className="place-card">
                <Chop id={profile?.id ?? "you"} size="md" />
                <span className="who">{profile?.handle ?? "you"}</span>
                <span className="what">waiting</span>
              </div>
            </div>
          </div>
          <p className="label num">
            {joining ?? `Finding your table, ${elapsed}s`}
          </p>
          {!joining && (
            <button className="btn-ghost" onClick={cancelSearch}>
              Leave the floor
            </button>
          )}
        </div>
      )}
    </section>
  );
}
