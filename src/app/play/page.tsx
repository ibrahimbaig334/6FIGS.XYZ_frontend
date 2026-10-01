"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
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
} from "../../lib/constants";
import { connectSocket } from "../../lib/ws";
import SolanaConnect from "../../components/SolanaConnect";
import Loader from "../../components/Loader";

export default function PlayPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendTotal, setFriendTotal] = useState(0);
  const [friendPage, setFriendPage] = useState(1);
  const [friendSort, setFriendSort] = useState("created");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [incoming, setIncoming] = useState<RoomRequestInfo[]>([]);
  const [outgoing, setOutgoing] = useState<RoomRequestInfo[]>([]);
  const [joining, setJoining] = useState<string | null>(null); // overlay text while connecting to a room
  const [initialLoading, setInitialLoading] = useState(true);
  const searchingRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setReady(true);
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);

  const refreshFriends = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(friendPage),
        limit: String(FRIENDS_PAGE_SIZE),
        sort: friendSort,
      });
      if (q) params.set("q", q);
      const res = await api<FriendList>(`/play/friends?${params.toString()}`);
      setFriends(res.items);
      setFriendTotal(res.total);
    } catch {
      /* keep last known list through blips */
    }
  }, [q, friendPage, friendSort]);

  const load = useCallback(async () => {
    refreshFriends();
    try {
      const [inc, out] = await Promise.all([
        api<RoomRequestInfo[]>("/play/requests/incoming"),
        api<RoomRequestInfo[]>("/play/requests/outgoing"),
      ]);
      setIncoming(inc);
      setOutgoing((prev) => {
        // requester side: an accepted outgoing means "join the game now"
        const acc = out.find((o) => o.status === "accepted" && o.gameId);
        if (
          acc &&
          !prev.some((p) => p.id === acc.id && p.status === "accepted")
        ) {
          joinRoomWithOverlay(
            `ACCEPTED — JOINING ${acc.toHandle.toUpperCase()}'S GAME…`,
            acc.gameId as string,
          );
        }
        return out;
      });
    } catch (e) {
      console.error("play load failed", e);
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
  useEffect(() => {
    if (!ready || !getToken()) return;
    const s = connectSocket();
    const onRequest = (r: RoomRequestInfo) =>
      setIncoming((prev) =>
        prev.some((x) => x.id === r.id) ? prev : [r, ...prev],
      );
    const onAccepted = (p: { requestId: string; gameId: string }) =>
      setOutgoing((prev) => {
        const hit = prev.find((o) => o.id === p.requestId);
        if (hit) joinRoomWithOverlay("ACCEPTED — JOINING GAME…", p.gameId);
        return prev.map((o) =>
          o.id === p.requestId
            ? { ...o, status: "accepted", gameId: p.gameId }
            : o,
        );
      });
    const onDeclined = (p: { requestId: string }) => {
      setOutgoing((prev) => prev.filter((o) => o.id !== p.requestId));
      setErr("Room request declined.");
    };
    const onCancelled = (p: { requestId: string }) =>
      setIncoming((prev) => prev.filter((o) => o.id !== p.requestId));
    s.on("roomRequest", onRequest);
    s.on("requestAccepted", onAccepted);
    s.on("requestDeclined", onDeclined);
    s.on("requestCancelled", onCancelled);
    return () => {
      s.off("roomRequest", onRequest);
      s.off("requestAccepted", onAccepted);
      s.off("requestDeclined", onDeclined);
      s.off("requestCancelled", onCancelled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Poll incoming/outgoing while on the tab (covers missed WS events).
  useEffect(() => {
    if (!ready || !getToken()) return;
    const t = setInterval(() => {
      api<RoomRequestInfo[]>("/play/requests/incoming")
        .then(setIncoming)
        .catch(() => {});
      api<RoomRequestInfo[]>("/play/requests/outgoing")
        .then((out) => {
          const acc = out.find((o) => o.status === "accepted" && o.gameId);
          if (acc)
            joinRoomWithOverlay(
              `ACCEPTED — JOINING ${acc.toHandle.toUpperCase()}'S GAME…`,
              acc.gameId as string,
            );
          else setOutgoing(out);
        })
        .catch(() => {});
    }, POLL_REQUESTS_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Friend presence refreshes every 5s — dots go live without a reload.
  useEffect(() => {
    if (!ready || !getToken()) return;
    const t = setInterval(refreshFriends, POLL_FRIENDS_MS);
    return () => clearInterval(t);
  }, [ready, refreshFriends]);

  // Searching ticker + status poll.
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
    setErr("");
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
      setSearching(true); // animation locks the UI until matched/cancelled
    } catch (e) {
      console.error("queue failed", e);
      setErr("Couldn't join the queue — try again");
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

  async function sendRequest(f: Friend) {
    setErr("");
    try {
      const r = await api<RoomRequestInfo>("/play/request", {
        method: "POST",
        body: { userId: f.id },
      });
      setOutgoing((prev) => [r, ...prev]);
    } catch (e) {
      console.error("request failed", e);
      setErr("Couldn't send the request — try again");
    }
  }

  async function cancelRequest(id: string) {
    try {
      await api(`/play/requests/${id}/cancel`, { method: "POST" });
      setOutgoing((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      console.error("cancel request failed", e);
      setErr("Couldn't cancel — try again");
    }
  }

  async function acceptRequest(r: RoomRequestInfo) {
    setErr("");
    try {
      const acc = await api<RoomRequestInfo & { gameId: string }>(
        `/play/requests/${r.id}/accept`,
        { method: "POST" },
      );
      setIncoming((prev) => prev.filter((x) => x.id !== r.id));
      joinRoomWithOverlay(
        `JOINING ${acc.fromHandle.toUpperCase()}'S GAME…`,
        acc.gameId,
      );
    } catch (e) {
      console.error("accept failed", e);
      setErr("Couldn't accept — try again");
    }
  }

  async function declineRequest(id: string) {
    try {
      await api(`/play/requests/${id}/decline`, { method: "POST" });
      setIncoming((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error("decline failed", e);
      setErr("Couldn't decline — try again");
    }
  }

  const pendingTo = (friendId: string) =>
    outgoing.find((o) => o.toUserId === friendId);

  // Mounted guard (see rooms page): localStorage token is client-only.
  if (!ready) {
    return (
      <section className="page-enter loader-page">
        <Loader label="LOADING PLAY…" />
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
          <p className="mono-label">PLAY — CONNECT FIRST</p>
          <div
            style={{
              marginTop: "1.2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <SolanaConnect onDone={load} />
          </div>
        </div>
      </section>
    );
  }

  const tier = profile?.eligibility.tier;

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
          <a href="/rooms">Private rooms</a>
          <a href="/play" className="active">
            1v1 chat
          </a>
        </div>
        <span className="tier-badge">
          {tier ? `YOU · ${tier}` : "UNVERIFIED"}
        </span>
      </div>
      {!tier && (
        <div className="gate-note">
          <p>
            <strong>Locked.</strong> Verify ≥ $100K in{" "}
            <a href="/profile">Profile</a> to play.
          </p>
          <a
            href="/profile"
            className="btn-solid"
            style={{ padding: "0.6rem 0.9rem" }}
          >
            GO TO PROFILE ↗
          </a>
        </div>
      )}

      {incoming.map((r) => (
        <div key={r.id} className="request-banner" role="alert">
          <span>
            <strong>{r.fromHandle}</strong> invites you to a private room
          </span>
          <span style={{ display: "flex", gap: "0.4rem" }}>
            <button
              className="btn-solid"
              style={{ padding: "0.5rem 0.9rem" }}
              onClick={() => acceptRequest(r)}
            >
              ACCEPT
            </button>
            <button
              className="btn-ghost"
              style={{ padding: "0.5rem 0.9rem" }}
              onClick={() => declineRequest(r.id)}
            >
              DECLINE
            </button>
          </span>
        </div>
      ))}

      <div className="card">
        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn-solid"
            onClick={quickplay}
            disabled={!tier || searching}
          >
            RANDOM
          </button>
        </div>
        <p className="fine" style={{ textAlign: "center" }}>
          Random pairs you with another searching holder. Chat both ways to
          become friends, then invite friends to private rooms.
        </p>
        {err && <p className="err-center">{err}</p>}
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          className="field"
          style={{ maxWidth: "220px" }}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setFriendPage(1);
          }}
          placeholder="search friends…"
        />
        <select
          className="field"
          style={{ maxWidth: "190px", flex: "none" }}
          value={friendSort}
          onChange={(e) => {
            setFriendSort(e.target.value);
            setFriendPage(1);
          }}
        >
          <option value="created">SORT: NEWEST</option>
          <option value="name">SORT: NAME</option>
          <option value="online">SORT: ONLINE</option>
        </select>
        <span className="fine" style={{ marginLeft: "auto" }}>
          {friendTotal} FRIENDS
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {initialLoading ? (
          <div className="card">
            <Loader label="LOADING FRIENDS…" />
          </div>
        ) : (
          friends.map((p) => {
            const pend = pendingTo(p.id);
            return (
              <div key={p.id} className="peer-row">
                <span
                  className={p.online ? "dot on" : "dot"}
                  title={p.online ? "Online" : "Offline"}
                />
                <strong style={{ fontSize: "1.05rem" }}>{p.handle}</strong>
                <span className="fine">{timeAgo(p.lastSeenAt)}</span>
                <span className="fine">{p.online ? "ONLINE" : "OFFLINE"}</span>
                <span
                  className={
                    p.tier === "TIER III" || p.tier === "TIER IV" ? "tier-badge t3" : "tier-badge"
                  }
                >
                  {p.tier ?? "UNVERIFIED"}
                </span>
                {p.assetPct && Object.keys(p.assetPct).length > 0 && (
                  <span className="fine">
                    {Object.entries(p.assetPct)
                      .map(([c, pct]) => `${c} ${pct}%`)
                      .join(" · ")}
                  </span>
                )}
                {pend ? (
                  <button
                    className="btn-ghost btn-sm"
                    style={{ marginLeft: "auto" }}
                    onClick={() => cancelRequest(pend.id)}
                  >
                    CANCEL REQUEST
                  </button>
                ) : (
                  <button
                    className="btn-solid btn-sm"
                    style={{ marginLeft: "auto" }}
                    disabled={!tier || !p.online}
                    onClick={() => sendRequest(p)}
                  >
                    {p.online ? "ROOM REQUEST ↗" : "OFFLINE"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      {friends.length === 0 && !initialLoading && (
        <p className="fine">
          No friends yet — hit RANDOM to meet someone. One message each way
          makes you friends.
        </p>
      )}
      {Math.ceil(friendTotal / FRIENDS_PAGE_SIZE) > 1 && (
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
            disabled={friendPage <= 1}
            onClick={() => setFriendPage(friendPage - 1)}
          >
            ← PREV
          </button>
          <span className="mono-label">
            PAGE {friendPage} / {Math.ceil(friendTotal / FRIENDS_PAGE_SIZE)}
          </span>
          <button
            className="chip"
            disabled={friendPage >= Math.ceil(friendTotal / FRIENDS_PAGE_SIZE)}
            onClick={() => setFriendPage(friendPage + 1)}
          >
            NEXT →
          </button>
        </div>
      )}

      {(searching || joining) && (
        <div
          className="search-overlay"
          role="alertdialog"
          aria-label="Matchmaking"
        >
          <div className="search-rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="mono-label">
            {joining ?? `FINDING OPPONENT… ${elapsed}s`}
          </p>
          {!joining && (
            <button
              className="btn-ghost"
              style={{ padding: "0.7rem 1.2rem" }}
              onClick={cancelSearch}
            >
              CANCEL
            </button>
          )}
        </div>
      )}
    </section>
  );
}
