"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Friend, getToken, Profile, RoomRequestInfo, timeAgo } from "../../lib/api";
import { connectSocket } from "../../lib/ws";
import ConnectPopup from "../../components/ConnectPopup";

export default function PlayPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [q, setQ] = useState("");
  const [popup, setPopup] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [incoming, setIncoming] = useState<RoomRequestInfo[]>([]);
  const [outgoing, setOutgoing] = useState<RoomRequestInfo[]>([]);
  const [joining, setJoining] = useState<string | null>(null); // overlay text while connecting to a room
  const searchingRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setReady(true);
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const [fr, inc, out] = await Promise.all([
        api<Friend[]>(`/play/friends?${params.toString()}`),
        api<RoomRequestInfo[]>("/play/requests/incoming", { cache: false }),
        api<RoomRequestInfo[]>("/play/requests/outgoing", { cache: false }),
      ]);
      setFriends(fr);
      setIncoming(inc);
      setOutgoing((prev) => {
        // requester side: an accepted outgoing means "join the room now"
        const acc = out.find((o) => o.status === "accepted" && o.roomId);
        if (acc && !prev.some((p) => p.id === acc.id && p.status === "accepted")) {
          joinRoomWithOverlay(`ACCEPTED — JOINING ${acc.toHandle.toUpperCase()}'S ROOM…`, acc.roomId as string);
        }
        return out;
      });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  function joinRoomWithOverlay(text: string, roomId: string) {
    setJoining(text);
    setSearching(false);
    searchingRef.current = false;
    later(() => router.push(`/rooms/${roomId}`), 1800);
  }

  useEffect(() => {
    load();
  }, [load]);

  // Realtime matchmaking events (polling below is the fallback).
  useEffect(() => {
    if (!ready || !getToken()) return;
    const s = connectSocket();
    const onRequest = (r: RoomRequestInfo) =>
      setIncoming((prev) => (prev.some((x) => x.id === r.id) ? prev : [r, ...prev]));
    const onAccepted = (p: { requestId: string; roomId: string }) =>
      setOutgoing((prev) => {
        const hit = prev.find((o) => o.id === p.requestId);
        if (hit) joinRoomWithOverlay("ACCEPTED — JOINING ROOM…", p.roomId);
        return prev.map((o) => (o.id === p.requestId ? { ...o, status: "accepted", roomId: p.roomId } : o));
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
      api<RoomRequestInfo[]>("/play/requests/incoming", { cache: false }).then(setIncoming).catch(() => {});
      api<RoomRequestInfo[]>("/play/requests/outgoing", { cache: false })
        .then((out) => {
          const acc = out.find((o) => o.status === "accepted" && o.roomId);
          if (acc) joinRoomWithOverlay(`ACCEPTED — JOINING ${acc.toHandle.toUpperCase()}'S ROOM…`, acc.roomId as string);
          else setOutgoing(out);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Searching ticker + status poll.
  useEffect(() => {
    if (!searching) return;
    const t0 = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    const poll = setInterval(async () => {
      if (!searchingRef.current) return;
      try {
        const st = await api<{ status: string; gameId?: string }>("/play/queue/status", { cache: false });
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
    }, 2000);
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
      const r = await api<{ status: string; gameId?: string }>("/play/queue", { method: "POST" });
      if (r.status === "matched" && r.gameId) {
        router.push(`/game/${r.gameId}`);
        return;
      }
      searchingRef.current = true;
      setSearching(true); // animation locks the UI until matched/cancelled
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Queue failed");
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
      const r = await api<RoomRequestInfo>("/play/request", { method: "POST", body: { userId: f.id } });
      setOutgoing((prev) => [r, ...prev]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    }
  }

  async function cancelRequest(id: string) {
    try {
      await api(`/play/requests/${id}/cancel`, { method: "POST" });
      setOutgoing((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  async function acceptRequest(r: RoomRequestInfo) {
    setErr("");
    try {
      const acc = await api<RoomRequestInfo & { roomId: string }>(`/play/requests/${r.id}/accept`, { method: "POST" });
      setIncoming((prev) => prev.filter((x) => x.id !== r.id));
      joinRoomWithOverlay(`JOINING ${acc.fromHandle.toUpperCase()}'S ROOM…`, acc.roomId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Accept failed");
    }
  }

  async function declineRequest(id: string) {
    try {
      await api(`/play/requests/${id}/decline`, { method: "POST" });
      setIncoming((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Decline failed");
    }
  }

  const pendingTo = (friendId: string) => outgoing.find((o) => o.toUserId === friendId);

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

      {incoming.map((r) => (
        <div key={r.id} className="request-banner" role="alert">
          <span><strong>{r.fromHandle}</strong> invites you to a private room</span>
          <span style={{ display: "flex", gap: "0.4rem" }}>
            <button className="btn-solid" style={{ padding: "0.5rem 0.9rem" }} onClick={() => acceptRequest(r)}>ACCEPT</button>
            <button className="btn-ghost" style={{ padding: "0.5rem 0.9rem" }} onClick={() => declineRequest(r.id)}>DECLINE</button>
          </span>
        </div>
      ))}

      <div className="card">
        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-solid" onClick={quickplay} disabled={!tier || searching}>RANDOM</button>
        </div>
        <p className="fine" style={{ textAlign: "center" }}>
          Random pairs you with another searching holder. Chat both ways to become friends,
          then invite friends to private rooms.
        </p>
        {err && <p style={{ color: "var(--crimson)", fontFamily: 'var(--font-dm-mono)', fontSize: "0.7rem", textAlign: "center" }}>{err}</p>}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input className="field" style={{ maxWidth: "220px" }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="search friends…" />
        <span className="fine" style={{ marginLeft: "auto" }}>{friends.length} FRIENDS</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {friends.map((p) => {
          const pend = pendingTo(p.id);
          return (
            <div key={p.id} className="peer-row">
              <span className={p.online ? "dot on" : "dot"} title={p.online ? "Online" : "Offline"} />
              <strong style={{ fontSize: "1.05rem" }}>{p.handle}</strong>
              <span className="fine">{timeAgo(p.lastSeenAt)}</span>
              <span className="fine">{p.online ? "ONLINE" : "OFFLINE"}</span>
              <span className={p.tier === "TIER III" ? "tier-badge t3" : "tier-badge"}>{p.tier ?? "UNVERIFIED"}</span>
              {pend ? (
                <button className="btn-ghost" style={{ padding: "0.55rem 0.9rem", marginLeft: "auto" }} onClick={() => cancelRequest(pend.id)}>
                  CANCEL REQUEST
                </button>
              ) : (
                <button className="btn-solid" style={{ padding: "0.55rem 0.9rem", marginLeft: "auto" }} disabled={!tier || !p.online} onClick={() => sendRequest(p)}>
                  {p.online ? "ROOM REQUEST ↗" : "OFFLINE"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {friends.length === 0 && <p className="fine">No friends yet — hit RANDOM to meet someone. One message each way makes you friends.</p>}

      {(searching || joining) && (
        <div className="search-overlay" role="alertdialog" aria-label="Matchmaking">
          <div className="search-rings" aria-hidden="true"><span /><span /><span /></div>
          <p className="mono-label">{joining ?? `FINDING OPPONENT… ${elapsed}s`}</p>
          {!joining && (
            <button className="btn-ghost" style={{ padding: "0.7rem 1.2rem" }} onClick={cancelSearch}>CANCEL</button>
          )}
        </div>
      )}
    </section>
  );
}
