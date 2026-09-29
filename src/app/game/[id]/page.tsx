"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  api,
  ChatMessage,
  extractTickers,
  GameState,
  getToken,
  Peer,
  Profile,
} from "../../../lib/api";
import { connectSocket } from "../../../lib/ws";
import { useChatScroll } from "../../../lib/useChatScroll";
import {
  OPP_GONE_REDIRECT_MS,
  POLL_GAME_LIVE_MS,
} from "../../../lib/constants";
import TokenCard from "../../../components/TokenCard";
import ConnectPopup from "../../../components/ConnectPopup";
import ChatSuggestions from "../../../components/ChatSuggestions";
import EmojiPicker from "../../../components/EmojiPicker";
import Loader from "../../../components/Loader";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameState | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [oppOnline, setOppOnline] = useState(false);
  const [oppGone, setOppGone] = useState(false);
  const offStreak = useRef(0);
  const goneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [popup, setPopup] = useState(false);
  const sock = useRef<ReturnType<typeof connectSocket> | null>(null);
  const chatRef = useChatScroll(msgs.length);

  function mergeState(prev: GameState | null, st: GameState): GameState {
    // youAre/oppId are viewer-relative: a broadcast computed for the mover must
    // never overwrite the local player's perspective (the X-flip bug).
    return {
      ...st,
      youAre: prev?.youAre ?? st.youAre,
      oppId: prev?.oppId ?? st.oppId,
      opponent: prev?.opponent ?? st.opponent ?? null,
    };
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

  // Opponent-left detection (random matches): two consecutive offline polls
  // mid-game → notice + back to play. Reloads reconnect too fast to trip it.
  useEffect(() => {
    if (!game || game.status !== "open" || oppGone) return;
    const t = setInterval(async () => {
      try {
        const live = await api<{ oppOnline: boolean; oppHere: boolean }>(
          `/games/${id}/live`,
        );
        setOppOnline(live.oppOnline);
        if (!live.oppOnline) {
          offStreak.current += 1;
          if (offStreak.current >= 2) {
            setOppGone(true);
            goneTimer.current = setTimeout(
              () => router.push("/play"),
              OPP_GONE_REDIRECT_MS,
            );
          }
        } else {
          offStreak.current = 0;
        }
      } catch {
        /* blip — keep polling */
      }
    }, POLL_GAME_LIVE_MS);
    return () => {
      clearInterval(t);
      if (goneTimer.current) clearTimeout(goneTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, game?.id, oppGone]);

  useEffect(() => {
    if (!game) return;
    const s = connectSocket();
    sock.current = s;
    const joinAll = () => {
      s.emit(
        "joinGame",
        { gameId: id },
        (ack: { error?: string; state?: GameState }) => {
          if (ack?.state) setGame((g) => mergeState(g, ack.state as GameState));
        },
      );
      s.emit("joinScope", { scope: "dm", scopeId: game.matchId });
    };
    joinAll();
    const onState = (st: GameState) => setGame((g) => mergeState(g, st));
    const onChat = (p: { message: ChatMessage }) =>
      setMsgs((m) =>
        m.some((x) => x.id === p.message.id) ? m : [...m, p.message],
      );
    s.on("gameState", onState);
    s.on("chatMessage", onChat);
    s.io.on("reconnect", joinAll); // new socket id = old rooms gone; rejoin
    // load dm history with the real match id
    api<{ items: ChatMessage[] }>(`/chat/dm/${game.matchId}?limit=50`)
      .then((h) => setMsgs(h.items))
      .catch(() => {});
    return () => {
      s.emit("leaveScope", { scope: "dm", scopeId: game.matchId });
      s.off("gameState", onState);
      s.off("chatMessage", onChat);
      s.io.off("reconnect", joinAll);
    };
  }, [game?.matchId, id]); // eslint-disable-line react-hooks/exhaustive-deps

  function move(i: number) {
    setErr("");
    sock.current?.emit(
      "makeMove",
      { gameId: id, index: i },
      (ack: { error?: string; state?: GameState }) => {
        if (ack?.error) setErr(ack.error);
        else if (ack?.state)
          setGame((g) => mergeState(g, ack.state as GameState));
      },
    );
  }

  function rematch() {
    sock.current?.emit(
      "rematch",
      { gameId: id },
      (ack: { error?: string; state?: GameState }) => {
        if (ack?.error) setErr(ack.error);
        else if (ack?.state)
          setGame((g) => mergeState(g, ack.state as GameState));
      },
    );
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

  if (!ready)
    return (
      <section className="page-enter loader-page">
        <Loader label="LOADING…" />
      </section>
    );
  if (!getToken()) {
    return (
      <section style={{ padding: "2rem 5vw" }}>
        <div className="card">
          <p className="mono-label">GAME — CONNECT FIRST</p>
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
  if (err && !game)
    return (
      <section className="page-enter" style={{ padding: "2rem 5vw" }}>
        <div className="card">
          <p>{err}</p>
          <a href="/play">← PLAY</a>
        </div>
      </section>
    );
  if (!game) {
    return (
      <section
        className="page-enter loader-page"
      >
        <Loader label="FINDING GAME…" />
      </section>
    );
  }

  return (
    <section className="page-enter layout-game" style={{ padding: "2rem 5vw" }}>
      <div>
        <p className="mono-label">
          MATCHED · YOU ARE {game.youAre} · TURN: {game.turn}
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
            margin: "0.5rem 0",
          }}
        >
          <span className="tier-badge">YOU · {game.youAre}</span>
          <span className="fine">VS</span>
          <span className="tier-badge">
            <span
              className={oppOnline ? "dot on" : "dot"}
              title={oppOnline ? "Online" : "Offline"}
            />{" "}
            {game.opponent?.handle ?? "?"} · {game.youAre === "X" ? "O" : "X"}
          </span>
          <button className="chip" onClick={() => router.push("/play")}>
            EXIT
          </button>
        </div>
        <p className="fine">
          <a href="/play">← PLAY</a> · <a href="/rooms">ROOMS</a>
        </p>
        {game.status !== "open" && (
          <p className="mono-label">
            {game.status === "draw" ? "DRAW" : `${game.winner} WINS`} —{" "}
            <button className="chip" onClick={rematch}>
              REMATCH
            </button>
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, min(110px, 26vw))",
            gap: "4px",
            background: "var(--ink)",
            padding: "4px",
            width: "max-content",
            border: "2px solid var(--ink)",
            boxShadow: "8px 8px 0 var(--shadow)",
          }}
        >
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
      <aside
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        <p className="mono-label">TABLE TALK — $TICKERS UNFURL</p>
        <ol className="chat-log" ref={chatRef}>
          {msgs.map((m) => (
            <li key={m.id} className={m.senderId === me?.id ? "msg me" : "msg"}>
              <strong>{m.senderHandle}:</strong> {m.body}
              {extractTickers(m.body).map((t) => (
                <TokenCard key={t} symbol={t} />
              ))}
            </li>
          ))}
        </ol>
        <ChatSuggestions
          onPick={(t) => setDraft((d) => (d ? `${d} ${t}` : t))}
        />
        <form onSubmit={send} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            className="field"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="$BTC thoughts?"
            maxLength={240}
          />
          <button
            className="btn-solid"
            style={{ padding: "0.7rem" }}
            type="submit"
          >
            SEND
          </button>
        </form>
      </aside>
      {oppGone && (
        <div className="search-overlay" role="alert">
          <p className="mono-label">OPPONENT LEFT</p>
          <p className="fine">Taking you back to play…</p>
        </div>
      )}
    </section>
  );
}
