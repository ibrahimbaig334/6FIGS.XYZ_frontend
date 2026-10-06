"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  api,
  ChatMessage,
  errMsg,
  GameState,
  getToken,
  Profile,
} from "../../../lib/api";
import { connectSocket } from "../../../lib/ws";
import { notifyError } from "../../../lib/notify";
import {
  OPP_JOIN_GRACE_MS,
  OPP_RETURN_MS,
  POLL_GAME_LIVE_MS,
} from "../../../lib/constants";
import EmailAuth from "../../../components/EmailAuth";
import GamePanel from "../../../components/GamePanel";
import RematchToast from "../../../components/RematchToast";
import Loader from "../../../components/Loader";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<GameState | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [err, setErr] = useState("");
  // Opponent presence = IN THIS GAME (page open), not merely online elsewhere.
  // Leaving for the homepage leaves the game room → the countdown below fires.
  const [oppInGame, setOppInGame] = useState(false);
  // Opponent-return countdown (seconds left, null = not waiting). Ticks in
  // the toast + overlay; at zero the game is closed and both sides leave.
  const [returnLeft, setReturnLeft] = useState<number | null>(null);
  const returnTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Countdown label: seen-then-left vs never arrived since match.
  const [wasSeen, setWasSeen] = useState(false);
  const seenOpp = useRef(false);
  const pageStart = useRef(Date.now());
  // Close initiated (timer expired): polls/countdowns must never restart —
  // the local game is still "open" until navigation unmounts us.
  const closingRef = useRef(false);
  // Tracks our own game-room membership so unmount always leaves it.
  const joinedRef = useRef<string | null>(null);
  // Rematch offer flow: incoming offer toast + our outgoing offer state.
  const [offer, setOffer] = useState<{
    gameId: string;
    fromHandle: string;
  } | null>(null);
  const [rematchPending, setRematchPending] = useState(false);
  // Close initiated: fullscreen exit — the game never flashes back.
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);
  const sock = useRef<ReturnType<typeof connectSocket> | null>(null);

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
      if (g.status === "closed") {
        // Kicked out: the game was closed while we were gone.
        notifyError("This game was closed");
        router.push("/play");
        return;
      }
      setGame(g);
      setErr("");
      try {
        setMe(await api<Profile>("/profile/user"));
      } catch {
        setMe(null);
      }
      // No global-online check here: the live poll below reports whether the
      // opponent is actually IN this game (seat dot + countdown source).
    } catch (e) {
      // Specific, human reason (e.g. a game that no longer exists) — never blank.
      setErr(errMsg(e, "Couldn't load this game — try again"));
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Opponent presence = IN THIS GAME ROOM (page open). Leaving for the
  // homepage leaves the game room even while globally online — that starts
  // the 30s return countdown. Never-arrived opponents get a join grace first.
  // Reloads rejoin too fast (3s polls) to trip it.
  function stopReturn() {
    if (returnTimer.current) clearInterval(returnTimer.current);
    returnTimer.current = null;
    setReturnLeft(null);
  }

  async function closeAndLeave() {
    closingRef.current = true; // polls below become no-ops from here on
    stopReturn();
    // Flip local state first: the poll effect tears itself down on the
    // status change, so no new countdown can start before navigation.
    setGame((g) => (g ? { ...g, status: "closed" } : g));
    setLeaving(true); // instant fullscreen exit — no game flash
    // Fire-and-forget: navigation must not wait on the round trip. If it
    // ever fails, the returnee's own countdown closes the idle game.
    api(`/games/${id}/close`, { method: "POST" }).catch((e) =>
      console.error("close failed", e),
    );
    notifyError("Opponent didn't return — game closed");
    router.push("/play");
  }

  function startReturn() {
    if (closingRef.current) return;
    stopReturn();
    const deadline = Date.now() + OPP_RETURN_MS;
    setReturnLeft(Math.ceil(OPP_RETURN_MS / 1000));
    returnTimer.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setReturnLeft(left);
      if (left <= 0) {
        stopReturn();
        void closeAndLeave();
      }
    }, 500);
  }

  useEffect(() => {
    if (!game || game.status !== "open") return;
    const t = setInterval(async () => {
      if (closingRef.current) return;
      try {
        const live = await api<{
          oppOnline: boolean;
          oppHere: boolean;
          oppInGame: boolean;
        }>(`/games/${id}/live`);
        setOppInGame(live.oppInGame);
        if (live.oppInGame) {
          seenOpp.current = true;
          setWasSeen(true);
          if (returnTimer.current !== null) stopReturn(); // back — cancelled
        } else if (
          returnTimer.current === null &&
          (seenOpp.current ||
            Date.now() - pageStart.current > OPP_JOIN_GRACE_MS)
        ) {
          startReturn();
        }
      } catch {
        /* blip — keep polling */
      }
    }, POLL_GAME_LIVE_MS);
    return () => {
      clearInterval(t);
      stopReturn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, game?.id]);

  // Client-side navigation reuses this component for a new game id: drop ALL
  // per-game state so the previous game can never bleed into the next one
  // (restarted countdowns, stale offers, ghost boards auto-kicking the user).
  // Socket cleanup (leaveGame) runs before this setup — joinedRef is intact.
  useEffect(() => {
    stopReturn();
    closingRef.current = false;
    seenOpp.current = false;
    pageStart.current = Date.now();
    setWasSeen(false);
    setOffer(null);
    setRematchPending(false);
    setMsgs([]);
    setGame(null);
    setErr("");
    setLeaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!game) return;
    const s = connectSocket();
    sock.current = s;
    const joinAll = () => {
      // Membership intent is synchronous — a slow ack must never strand us
      // in the game room after unmount (leaveGame would never fire).
      joinedRef.current = id;
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
    const onState = (st: GameState) => {
      if (st.status === "open") {
        setRematchPending(false); // fresh board — offers resolved
        setOffer(null);
      }
      setGame((g) => mergeState(g, st));
    };
    const onChat = (p: { message: ChatMessage }) =>
      setMsgs((m) =>
        m.some((x) => x.id === p.message.id) ? m : [...m, p.message],
      );
    const onOffer = (p: { gameId: string; fromHandle: string }) => {
      if (p.gameId === id) setOffer(p);
    };
    const onDeclined = (p: { gameId: string; reason: string }) => {
      if (p.gameId !== id) return;
      setRematchPending(false);
      notifyError(
        p.reason === "noresponse"
          ? "Opponent didn't respond to the rematch"
          : "Opponent declined the rematch",
      );
    };
    s.on("gameState", onState);
    s.on("chatMessage", onChat);
    s.on("rematchOffer", onOffer);
    s.on("rematchDeclined", onDeclined);
    s.io.on("reconnect", joinAll); // new socket id = old rooms gone; rejoin
    // load dm history with the real match id
    api<{ items: ChatMessage[] }>(`/chat/dm/${game.matchId}?limit=50`)
      .then((h) => setMsgs(h.items))
      .catch(() => {});
    return () => {
      // Leaving the page = leaving the game (broadcasts stop, presence
      // drops) — even though the socket itself stays connected elsewhere.
      if (joinedRef.current) {
        s.emit("leaveGame", { gameId: joinedRef.current });
        joinedRef.current = null;
      }
      s.emit("leaveScope", { scope: "dm", scopeId: game.matchId });
      s.off("gameState", onState);
      s.off("chatMessage", onChat);
      s.off("rematchOffer", onOffer);
      s.off("rematchDeclined", onDeclined);
      s.io.off("reconnect", joinAll);
    };
  }, [game?.matchId, id]); // eslint-disable-line react-hooks/exhaustive-deps

  function move(i: number) {
    sock.current?.emit(
      "makeMove",
      { gameId: id, index: i },
      (ack: { error?: string; state?: GameState }) => {
        if (ack?.error) notifyError(ack.error);
        else if (ack?.state)
          setGame((g) => mergeState(g, ack.state as GameState));
      },
    );
  }

  function rematch() {
    // Offer flow: the opponent gets an accept/decline toast — the board
    // resets ONLY on accept (server enforces it too).
    if (!game || rematchPending) return;
    sock.current?.emit(
      "rematchOffer",
      { gameId: id },
      (ack: { error?: string }) => {
        if (ack?.error) notifyError(ack.error);
        else setRematchPending(true);
      },
    );
  }

  function answerOffer(accept: boolean) {
    if (!offer) return;
    sock.current?.emit(
      "rematchAnswer",
      { gameId: offer.gameId, accept },
      (ack: { error?: string; state?: GameState }) => {
        if (ack?.error) notifyError(ack.error);
        else if (accept && ack?.state)
          setGame((g) => mergeState(g, ack.state as GameState));
      },
    );
    setOffer(null);
  }

  function send(body: string) {
    if (!game) return;
    sock.current?.emit(
      "sendMessage",
      { scope: "dm", scopeId: game.matchId, body },
      (ack: { error?: string; message?: ChatMessage }) => {
        if (ack?.error) notifyError(ack.error);
        else if (ack?.message) {
          const msg = ack.message;
          setMsgs((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
        }
      },
    );
  }

  // Closing: instant fullscreen exit — the game never flashes back while
  // the close lands and navigation unmounts us.
  if (leaving)
    return (
      <section className="page-enter loader-page">
        <Loader label="CLOSING GAME…" />
      </section>
    );
  if (!ready)
    return (
      <section className="page-enter loader-page">
        <Loader label="LOADING..." />
      </section>
    );
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
        <div className="card auth-card">
          <p className="mono-label">GAME — LOG IN FIRST</p>
          <div
            style={{
              marginTop: "1.2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <EmailAuth onDone={load} />
          </div>
        </div>
      </section>
    );
  }
  if (err && !game) {
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
        <div className="card gate-card">
          <p className="mono-label">{"CAN'T JOIN THIS GAME"}</p>
          <p className="gate-reason">{err}</p>
          <a href="/play" className="btn-solid">
            ← BACK TO PLAY
          </a>
        </div>
      </section>
    );
  }
  if (!game) {
    return (
      <section className="page-enter loader-page">
        <Loader label="FINDING GAME..." />
      </section>
    );
  }

  return (
    <section className="page-enter game-page" style={{ padding: "1.6rem 5vw" }}>
      <div className="game-topbar">
        <span className="tier-badge">
          {game.status === "open"
            ? `LIVE · TURN ${game.turn}`
            : game.status === "draw"
              ? "DRAW"
              : `${game.winner} WINS`}
        </span>
        <button
          className="btn-ghost btn-sm"
          onClick={() => router.push("/play")}
        >
          EXIT ✕
        </button>
      </div>
      <GamePanel
        game={game}
        me={me}
        msgs={msgs}
        oppOnline={oppInGame}
        onMove={move}
        onRematch={rematch}
        onSend={send}
        rematchPending={rematchPending}
        header={
          <p className="mono-label">
            RANDOM MATCH · {game.matchId.slice(-6).toUpperCase()}
          </p>
        }
      />
      {offer && offer.gameId === game.id && (
        <RematchToast
          fromHandle={offer.fromHandle}
          onAccept={() => answerOffer(true)}
          onDecline={() => answerOffer(false)}
        />
      )}
      {returnLeft !== null && (
        <div className="search-overlay" role="alert">
          <p className="mono-label">
            {wasSeen ? "OPPONENT LEFT — WAITING" : "WAITING FOR OPPONENT"}
          </p>
          <p className="fine">
            Closing the game in {returnLeft}s if they don&apos;t return…
          </p>
        </div>
      )}
      {returnLeft !== null && (
        <div className="return-toast" role="alert">
          {wasSeen ? "OPPONENT LEFT" : "WAITING FOR OPPONENT"} — CLOSING IN{" "}
          {returnLeft}s
        </div>
      )}
    </section>
  );
}
