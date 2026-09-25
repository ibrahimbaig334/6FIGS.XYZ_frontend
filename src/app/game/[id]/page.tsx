"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api, ChatMessage, extractTickers, GameState, getToken, Peer, Profile } from "../../../lib/api";
import { connectSocket } from "../../../lib/ws";
import TokenCard from "../../../components/TokenCard";
import ConnectPopup from "../../../components/ConnectPopup";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<GameState | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [oppOnline, setOppOnline] = useState(false);
  const [ready, setReady] = useState(false);
  const [popup, setPopup] = useState(false);
  const sock = useRef<ReturnType<typeof connectSocket> | null>(null);

  function mergeState(prev: GameState | null, st: GameState): GameState {
    return { ...st, opponent: prev?.opponent ?? st.opponent ?? null };
  }

  useEffect(() => {
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!getToken()) return;
    try {
      const g = await api<GameState>(`/games/${id}`);
      setGame(g);
      try {
        setMe(await api<Profile>("/profile/user"));
      } catch {
        setMe(null);
      }
      try {
        const peers = await api<Peer[]>("/play/online");
        setOppOnline(peers.some((p) => p.id === g.oppId && p.online));
      } catch {
        setOppOnline(false);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!game) return;
    const s = connectSocket();
    sock.current = s;
    const joinAll = () => {
      s.emit("joinGame", { gameId: id }, (ack: { error?: string; state?: GameState }) => {
        if (ack?.state) setGame((g) => mergeState(g, ack.state as GameState));
      });
      s.emit("joinScope", { scope: "dm", scopeId: game.matchId });
    };
    joinAll();
    const onState = (st: GameState) => setGame((g) => mergeState(g, st));
    const onChat = (p: { message: ChatMessage }) =>
      setMsgs((m) => (m.some((x) => x.id === p.message.id) ? m : [...m, p.message]));
    s.on("gameState", onState);
    s.on("chatMessage", onChat);
    s.io.on("reconnect", joinAll); // new socket id = old rooms gone; rejoin
    // load dm history with the real match id
    api<{ items: ChatMessage[] }>(`/chat/dm/${game.matchId}?limit=50`).then((h) => setMsgs(h.items)).catch(() => {});
    return () => {
      s.off("gameState", onState);
      s.off("chatMessage", onChat);
      s.io.off("reconnect", joinAll);
    };
  }, [game?.matchId, id]); // eslint-disable-line react-hooks/exhaustive-deps

  function move(i: number) {
    setErr("");
    sock.current?.emit("makeMove", { gameId: id, index: i }, (ack: { error?: string; state?: GameState }) => {
      if (ack?.error) setErr(ack.error);
      else if (ack?.state) setGame((g) => mergeState(g, ack.state as GameState));
    });
  }

  function rematch() {
    sock.current?.emit("rematch", { gameId: id }, (ack: { error?: string; state?: GameState }) => {
      if (ack?.error) setErr(ack.error);
      else if (ack?.state) setGame((g) => mergeState(g, ack.state as GameState));
    });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !game) return;
    const body = draft;
    setDraft("");
    sock.current?.emit(
      "sendMessage",
      { scope: "dm", scopeId: game.matchId, body },
      (ack: { error?: string; message?: ChatMessage }) => {
        if (ack?.error) setErr(ack.error);
        else if (ack?.message) {
          const msg = ack.message;
          setMsgs((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
        }
      },
    );
  }

  if (!ready) return <section style={{ padding: "2rem 5vw" }}><p className="mono-label">LOADING…</p></section>;
  if (!getToken()) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <div className="card">
          <p className="mono-label">GAME — CONNECT FIRST</p>
          <button className="btn-solid" onClick={() => setPopup(true)}>CONNECT WALLET ↗</button>
        </div>
        {popup && <ConnectPopup onClose={() => setPopup(false)} onDone={load} />}
      </section>
    );
  }
  if (err && !game) return <section style={{ padding: "2rem 5vw" }}><div className="card"><p>{err}</p><a href="/play">← PLAY</a></div></section>;
  if (!game) return <section style={{ padding: "2rem 5vw" }}><p className="mono-label">LOADING…</p></section>;

  return (
    <section style={{ padding: "2rem 5vw", display: "grid", gridTemplateColumns: "1fr 340px", gap: "1rem" }}>
      <div>
        <p className="mono-label">MATCHED · YOU ARE {game.youAre} · TURN: {game.turn}</p>
        <h2 style={{ margin: "0.3rem 0 1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className={oppOnline ? "dot on" : "dot"} title={oppOnline ? "Online" : "Offline"} />
          You × {game.opponent?.handle ?? "?"}
        </h2>
        <p className="fine"><a href="/play">← PLAY</a> · <a href="/rooms">ROOMS</a></p>
        {game.status !== "open" && <p className="mono-label">{game.status === "draw" ? "DRAW" : `${game.winner} WINS`} — <button className="chip" onClick={rematch}>REMATCH</button></p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, min(110px, 26vw))", gap: "4px", background: "var(--ink)", padding: "4px", width: "max-content", border: "2px solid var(--ink)", boxShadow: "8px 8px 0 var(--shadow)" }}>
          {game.board.split("").map((cell, i) => (
            <button
              key={i}
              className="board-cell"
              onClick={() => move(i)}
              disabled={cell !== "." || game.status !== "open"}
              style={{ color: cell === "O" ? "var(--crimson)" : "var(--ink)" }}
            >
              {cell === "." ? "" : cell === "X" ? "×" : "○"}
            </button>
          ))}
        </div>
        {err && <p style={{ color: "var(--crimson)" }}>{err}</p>}
      </div>
      <aside className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p className="mono-label">TABLE TALK — $TICKERS UNFURL</p>
        <ol className="chat-log">
          {msgs.map((m) => (
            <li key={m.id} className={m.senderId === me?.id ? "msg me" : "msg"}>
              <strong>{m.senderHandle}:</strong> {m.body}
              {extractTickers(m.body).map((t) => <TokenCard key={t} symbol={t} />)}
            </li>
          ))}
        </ol>
        <form onSubmit={send} style={{ display: "flex", gap: "0.5rem" }}>
          <input className="field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="$BTC thoughts?" maxLength={240} />
          <button className="btn-solid" style={{ padding: "0.7rem" }} type="submit">SEND</button>
        </form>
      </aside>
    </section>
  );
}
