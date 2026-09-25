"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, ApiError, ChatMessage, copyText, extractTickers, GameState, getToken, Profile, RoomMember, RoomMeta } from "../../../lib/api";
import { connectSocket } from "../../../lib/ws";
import TokenCard from "../../../components/TokenCard";
import ConnectPopup from "../../../components/ConnectPopup";
import InviteDialog from "../../../components/InviteDialog";
import DeleteRoomDialog from "../../../components/DeleteRoomDialog";

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [me, setMe] = useState<Profile | null>(null);
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [needCode, setNeedCode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [roomGone, setRoomGone] = useState<"deleted" | "removed" | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [gameErr, setGameErr] = useState("");
  const [ready, setReady] = useState(false);
  const [popup, setPopup] = useState(false);
  const sock = useRef<ReturnType<typeof connectSocket> | null>(null);
  const gameRef = useRef<GameState | null>(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Room gone out from under us (owner deleted it, or we were removed).
  useEffect(() => {
    if (!roomGone) return;
    const t = setTimeout(() => {
      location.href = "/rooms";
    }, 3500);
    return () => clearTimeout(t);
  }, [roomGone]);

  useEffect(() => {
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!getToken()) return;
    try {
      setErr("");
      // Invite-link flow: ?code=CODE auto-joins, then drops the code from the URL.
      const code = search.get("code");
      let m: RoomMeta;
      try {
        m = await api<RoomMeta>(`/rooms/${id}/meta`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setRoomGone("deleted");
        throw e;
      }
      if (!m.isMember && code) {
        try {
          await api(`/rooms/${id}/join`, { method: "POST", body: { code } });
          m = await api<RoomMeta>(`/rooms/${id}/meta`);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Wrong invite code");
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
      }
      setMeta(m);
      if (!m.isMember) {
        if (m.accessType === "invite" && code) setNeedCode(true); // wrong ?code — let them retry in the dialog
        return;
      }
      setNeedCode(false);
      setInviteCode(sessionStorage.getItem(`invite:${id}`) ?? "");
      const [mem, h] = await Promise.all([
        api<RoomMember[]>(`/rooms/${id}/members`),
        api<{ items: ChatMessage[] }>(`/chat/room/${id}?limit=50`),
      ]);
      setMembers(mem);
      setMsgs(h.items);
      // (re)join the socket room — covers first load and post-join refresh
      sock.current?.emit("joinScope", { scope: "room", scopeId: id });
      try {
        const g = await api<{ gameId: string }>(`/rooms/${id}/game`);
        const full = await api<GameState>(`/games/${g.gameId}`);
        setGame(full);
      } catch (e) {
        setGameErr(e instanceof Error ? e.message : "No game yet");
      }
      try {
        setMe(await api<Profile>("/profile/user"));
      } catch {
        setMe(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }, [id, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while in the room: meta (membership + live occupancy), member presence,
  // and the 1v1 game as soon as the peer joins. Notices deletion/removal so the
  // peer gets kicked to a notice instead of a ghost room.
  useEffect(() => {
    if (!ready || !getToken() || !meta?.isMember || roomGone) return;
    const t = setInterval(async () => {
      let m: RoomMeta;
      try {
        m = await api<RoomMeta>(`/rooms/${id}/meta`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setRoomGone("deleted");
        return; // blip — keep polling
      }
      setMeta(m);
      if (!m.isMember) {
        setRoomGone("removed");
        return;
      }
      try {
        setMembers(await api<RoomMember[]>(`/rooms/${id}/members`));
      } catch {
        /* meta is fresh — transient */
      }
      if (!gameRef.current) {
        try {
          const g = await api<{ gameId: string }>(`/rooms/${id}/game`);
          const full = await api<GameState>(`/games/${g.gameId}`);
          setGameErr("");
          setGame(full);
        } catch (e) {
          if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
            setRoomGone("deleted");
          } else {
            setGameErr(e instanceof Error ? e.message : "Waiting for peer…");
          }
        }
      }
    }, 2500);
    return () => clearInterval(t);
  }, [ready, id, meta?.isMember, roomGone]);

  useEffect(() => {
    const s = connectSocket();
    sock.current = s;
    const joinAll = () => {
      s.emit("joinScope", { scope: "room", scopeId: id });
      if (gameRef.current) s.emit("joinGame", { gameId: gameRef.current.id });
    };
    joinAll();
    const onChat = (p: { message: ChatMessage }) =>
      setMsgs((m) => (m.some((x) => x.id === p.message.id) ? m : [...m, p.message]));
    const onState = (st: GameState) => setGame((g) => (g ? { ...st, opponent: g.opponent } : st));
    s.on("chatMessage", onChat);
    s.on("gameState", onState);
    s.io.on("reconnect", joinAll); // socket.io rooms die with the old socket id
    return () => {
      s.emit("leaveScope", { scope: "room", scopeId: id }); // stop counting me as occupant
      s.off("chatMessage", onChat);
      s.off("gameState", onState);
      s.io.off("reconnect", joinAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, game?.id]);

  function move(i: number) {
    if (!game) return;
    setGameErr("");
    sock.current?.emit("makeMove", { gameId: game.id, index: i }, (ack: { error?: string; state?: GameState }) => {
      if (ack?.error) setGameErr(ack.error);
      else if (ack?.state) setGame((g) => ({ ...ack.state, opponent: g?.opponent ?? null }) as GameState);
    });
  }

  function rematch() {
    if (!game) return;
    sock.current?.emit("rematch", { gameId: game.id }, (ack: { error?: string; state?: GameState }) => {
      if (ack?.error) setGameErr(ack.error);
      else if (ack?.state) setGame((g) => ({ ...ack.state, opponent: g?.opponent ?? null }) as GameState);
    });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft;
    setDraft("");
    sock.current?.emit(
      "sendMessage",
      { scope: "room", scopeId: id, body },
      (ack: { error?: string; message?: ChatMessage }) => {
        if (ack?.error) setErr(ack.error);
        else if (ack?.message) {
          // append from ack — the WS echo may be missed if joinScope is still in flight
          const msg = ack.message;
          setMsgs((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
        }
      },
    );
  }

  async function joinWithCode(code: string) {
    setErr("");
    try {
      await api(`/rooms/${id}/join`, { method: "POST", body: { code } });
      setNeedCode(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Wrong invite code");
    }
  }

  async function joinTier() {
    setErr("");
    try {
      await api(`/rooms/${id}/join`, { method: "POST", body: {} });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Join failed");
    }
  }

  async function leaveRoom() {
    setErr("");
    try {
      await api(`/rooms/${id}/leave`, { method: "POST" });
      location.href = "/rooms";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Leave failed");
    }
  }

  async function deleteRoom() {
    await api(`/rooms/${id}`, { method: "DELETE" });
    location.href = "/rooms";
  }

  const peer = members.find((m) => m.id !== me?.id) ?? null;

  if (!ready) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <p className="mono-label">LOADING ROOM…</p>
      </section>
    );
  }

  if (!getToken()) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <div className="card">
          <p className="mono-label">ROOM — CONNECT FIRST</p>
          <button className="btn-solid" onClick={() => setPopup(true)}>CONNECT WALLET ↗</button>
        </div>
        {popup && <ConnectPopup onClose={() => setPopup(false)} onDone={load} />}
      </section>
    );
  }

  // Join gate: non-members get the proper code prompt / tier button (never a dead end).
  if (meta && !meta.isMember) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <div className="card" style={{ maxWidth: "480px" }}>
          <p className="mono-label">{meta.accessType === "invite" ? "🔒 INVITE-ONLY ROOM" : `✓ ${meta.minTier} ROOM`}</p>
          <h3 style={{ margin: "0.3rem 0" }}>{meta.name}</h3>
          <p className="fine">{meta.onlineCount}/2 ONLINE · 1V1 ONLY</p>
          {meta.accessType === "tier" ? (
            <>
              <p className="fine">Requires {meta.minTier} to enter.</p>
              <button className="btn-solid" style={{ marginTop: "0.6rem" }} onClick={joinTier}>
                JOIN {meta.minTier} ROOM ↗
              </button>
            </>
          ) : (
            <button className="btn-solid" style={{ marginTop: "0.6rem" }} onClick={() => setNeedCode(true)}>
              ENTER INVITE CODE ↗
            </button>
          )}
          {err && <p style={{ color: "var(--crimson)", fontSize: "0.7rem" }}>{err}</p>}
        </div>
        {needCode && (
          <InviteDialog roomName={meta.name} onSubmit={joinWithCode} onClose={() => setNeedCode(false)} error={err} />
        )}
      </section>
    );
  }

  if (roomGone) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <div className="card" style={{ maxWidth: "480px" }}>
          <p className="mono-label">{roomGone === "deleted" ? "ROOM DELETED" : "REMOVED FROM ROOM"}</p>
          <p className="fine">
            {roomGone === "deleted"
              ? "The owner deleted this room. Taking you back to the lobby…"
              : "You are no longer in this room. Taking you back to the lobby…"}
          </p>
          <a href="/rooms" className="btn-solid" style={{ padding: "0.7rem 1rem" }}>BACK TO ROOMS ↗</a>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: "2rem 5vw", display: "grid", gridTemplateColumns: "220px 1fr", gap: "1rem" }}>
      <div>
        <p className="mono-label">1V1 ROOM · {meta?.onlineCount ?? 0}/2 ONLINE</p>
        {meta?.description && <p className="fine" style={{ margin: "0.2rem 0 0.4rem" }}>{meta.description}</p>}
        {peer && (
          <h3 style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "0.4rem 0" }}>
            <span className={peer.online ? "dot on" : "dot"} /> {peer.handle}
          </h3>
        )}
        {inviteCode && (
          <div className="invite-box" style={{ margin: "0.6rem 0" }}>
            INVITE LINK: <a href={`${location.origin}/rooms/${id}?code=${inviteCode}`}>{`${location.origin}/rooms/${id}?code=${inviteCode}`}</a>
            <button className="chip" style={{ marginLeft: "0.4rem" }} onClick={() => copyText(`${location.origin}/rooms/${id}?code=${inviteCode}`)}>COPY</button>
          </div>
        )}
        <p className="mono-label">MEMBERS ({members.length})</p>
        {members.map((m) => (
          <p key={m.id} style={{ fontFamily: 'var(--font-dm-mono)', fontSize: "0.7rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <span className={m.online ? "dot on" : "dot"} title={m.online ? "Online" : "Offline"} /> {m.handle}
          </p>
        ))}
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          <button className="chip" onClick={leaveRoom}>LEAVE ROOM</button>
          {meta?.isOwner && (
            <button className="chip" style={{ color: "var(--crimson)", borderColor: "var(--crimson)" }} onClick={() => setConfirmDelete(true)}>DELETE ROOM</button>
          )}
        </div>
        {confirmDelete && meta && (
          <DeleteRoomDialog roomName={meta.name} onClose={() => setConfirmDelete(false)} onConfirm={deleteRoom} />
        )}
        <div className="card" style={{ marginTop: "0.8rem" }}>
          <p className="mono-label">1V1 GAME</p>
          {game ? (
            <>
              <p className="fine">YOU ARE {game.youAre} · {game.status === "open" ? `TURN: ${game.turn}` : game.status === "draw" ? "DRAW" : `${game.winner} WINS`}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", background: "var(--ink)", padding: "3px", border: "2px solid var(--ink)" }}>
                {game.board.split("").map((cell, i) => (
                  <button
                    key={i}
                    onClick={() => move(i)}
                    disabled={cell !== "." || game.status !== "open"}
                    style={{ aspectRatio: "1", fontSize: "1.4rem", background: "var(--paper)", border: 0, cursor: cell === "." && game.status === "open" ? "pointer" : "default", color: cell === "O" ? "var(--crimson)" : "var(--ink)" }}
                  >
                    {cell === "." ? "" : cell === "X" ? "×" : "○"}
                  </button>
                ))}
              </div>
              {game.status !== "open" && <button className="chip" style={{ marginTop: "0.5rem" }} onClick={rematch}>REMATCH</button>}
              {gameErr && <p style={{ color: "var(--crimson)", fontSize: "0.65rem" }}>{gameErr}</p>}
            </>
          ) : (
            <p className="fine">{gameErr || "Waiting for your 1v1 peer to join…"}</p>
          )}
        </div>
        {err && <p style={{ color: "var(--crimson)", fontSize: "0.7rem" }}>{err}</p>}
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p className="mono-label">ROOM CHAT — $TICKERS UNFURL</p>
        <ol className="chat-log">
          {msgs.map((m) => (
            <li key={m.id} className={m.senderId === me?.id ? "msg me" : "msg"}>
              <strong>{m.senderHandle}:</strong> {m.body}
              {extractTickers(m.body).map((t) => <TokenCard key={t} symbol={t} />)}
            </li>
          ))}
        </ol>
        <form onSubmit={send} style={{ display: "flex", gap: "0.5rem" }}>
          <input className="field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type $BTC to unfurl a card…" maxLength={240} />
          <button className="btn-solid" style={{ padding: "0.7rem" }} type="submit">SEND</button>
        </form>
      </div>
    </section>
  );
}
