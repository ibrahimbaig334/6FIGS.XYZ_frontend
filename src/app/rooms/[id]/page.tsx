"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, ChatMessage, extractTickers, GameState, getToken, Profile, RoomMember } from "../../../lib/api";
import { connectSocket } from "../../../lib/ws";
import TokenCard from "../../../components/TokenCard";
import ConnectPopup from "../../../components/ConnectPopup";

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [me, setMe] = useState<Profile | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [gameErr, setGameErr] = useState("");
  const [ready, setReady] = useState(false);
  const [popup, setPopup] = useState(false);
  const sock = useRef<ReturnType<typeof connectSocket> | null>(null);

  useEffect(() => {
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!getToken()) return;
    try {
      // Invite-link flow: ?code=CODE auto-joins, then drops the code from the URL.
      const code = search.get("code");
      if (code) {
        try {
          await api(`/rooms/${id}/join`, { method: "POST", body: { code } });
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Join failed");
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
      }
      setInviteCode(sessionStorage.getItem(`invite:${id}`) ?? "");
      setMembers(await api<RoomMember[]>(`/rooms/${id}/members`));
      const h = await api<{ items: ChatMessage[] }>(`/chat/room/${id}?limit=50`);
      setMsgs(h.items);
      try {
        const g = await api<{ gameId: string }>(`/rooms/${id}/game`);
        const full = await api<GameState>(`/games/${g.gameId}`);
        setGame(full);
      } catch (e) {
        setGameErr(e instanceof Error ? e.message : "No game yet");
      }
      if (getToken()) {
        try {
          setMe(await api<Profile>("/profile/user"));
        } catch {
          setMe(null);
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed (join the room first)");
    }
  }, [id, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const s = connectSocket();
    sock.current = s;
    s.emit("joinScope", { scope: "room", scopeId: id });
    if (game) s.emit("joinGame", { gameId: game.id });
    const onChat = (p: { message: ChatMessage }) => setMsgs((m) => [...m, p.message]);
    const onState = (st: GameState) => setGame((g) => (g ? { ...st, opponent: g.opponent } : st));
    s.on("chatMessage", onChat);
    s.on("gameState", onState);
    return () => {
      s.off("chatMessage", onChat);
      s.off("gameState", onState);
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
    sock.current?.emit("sendMessage", { scope: "room", scopeId: id, body }, (ack: { error?: string }) => {
      if (ack?.error) setErr(ack.error);
    });
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

  return (
    <section style={{ padding: "2rem 5vw", display: "grid", gridTemplateColumns: "220px 1fr", gap: "1rem" }}>
      <div>
        <p className="mono-label">1V1 ROOM · {members.length}/2</p>
        {peer && (
          <h3 style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "0.4rem 0" }}>
            <span className={peer.online ? "dot on" : "dot"} /> {peer.handle}
          </h3>
        )}
        {inviteCode && (
          <div className="invite-box" style={{ margin: "0.6rem 0" }}>
            INVITE LINK: <a href={`${location.origin}/rooms/${id}?code=${inviteCode}`}>{`${location.origin}/rooms/${id}?code=${inviteCode}`}</a>
          </div>
        )}
        <p className="mono-label">MEMBERS ({members.length})</p>
        {members.map((m) => (
          <p key={m.id} style={{ fontFamily: '"DM Mono", monospace', fontSize: "0.7rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <span className={m.online ? "dot on" : "dot"} title={m.online ? "Online" : "Offline"} /> {m.handle}
          </p>
        ))}
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
            <li key={m.id} className="msg">
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
