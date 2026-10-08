"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Copy, LockSimple } from "@phosphor-icons/react";
import {
  api,
  ApiError,
  ChatMessage,
  copyText,
  errMsg,
  GameState,
  getToken,
  Profile,
  RoomMember,
  RoomMeta,
} from "../../../lib/api";
import { connectSocket } from "../../../lib/ws";
import { notifyError } from "../../../lib/notify";
import GamePanel from "../../../components/GamePanel";
import RematchToast from "../../../components/RematchToast";
import SignInButton from "../../../components/SignInButton";
import InviteDialog from "../../../components/InviteDialog";
import DeleteRoomDialog from "../../../components/DeleteRoomDialog";
import Loader from "../../../components/Loader";
import Chop from "../../../components/Chop";
import { POLL_ROOM_MS, ROOM_GONE_REDIRECT_MS } from "../../../lib/constants";
import TierTag from "../../../components/TierTag";

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [needCode, setNeedCode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [roomGone, setRoomGone] = useState<"deleted" | "removed" | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [booted, setBooted] = useState(false);
  // Rematch offer flow: incoming offer toast plus our outgoing offer state.
  const [offer, setOffer] = useState<{
    gameId: string;
    fromHandle: string;
  } | null>(null);
  const [rematchPending, setRematchPending] = useState(false);
  const sock = useRef<ReturnType<typeof connectSocket> | null>(null);
  const gameRef = useRef<GameState | null>(null);
  // Seat fingerprint + retired game ids: when the seated pair rotates
  // (leave + new join) the old pair's game is dropped and the new pair's
  // loads, and late broadcasts for retired games are ignored.
  const seatsRef = useRef<string | null>(null);
  const retiredRef = useRef<Set<string>>(new Set());
  // Our own game-room membership (leave on exit/turnover, like the game page).
  const joinedRef = useRef<string | null>(null);
  // Join-gate reasons live in the error toast (toast once per new reason;
  // the meta poll re-sets the same object every few seconds).
  const joinReasonRef = useRef<string | null>(null);

  useEffect(() => {
    const r = meta?.joinReason ?? null;
    if (r && r !== joinReasonRef.current) {
      joinReasonRef.current = r;
      notifyError(r);
    }
    if (!r) joinReasonRef.current = null;
  }, [meta?.joinReason]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Room gone out from under us (owner deleted it, or we were removed).
  useEffect(() => {
    if (!roomGone) return;
    const t = setTimeout(() => {
      location.href = "/rooms";
    }, ROOM_GONE_REDIRECT_MS);
    return () => clearTimeout(t);
  }, [roomGone]);

  useEffect(() => {
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!getToken()) return;
    seatsRef.current = null; // fresh room (or retry), re-learn the seated pair
    try {
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
          console.error("invite-link auto-join failed", e);
          notifyError(errMsg(e, "Wrong invite code. Try again."));
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
      }
      setMeta(m);
      if (!m.isMember) {
        if (m.accessType === "invite" && code) setNeedCode(true); // wrong ?code, let them retry in the dialog
        return;
      }
      // Member whose tier dropped below the room's requirement: show the
      // locked notice instead of half-loading a room they cannot play.
      if (!m.canEnter) return;
      setNeedCode(false);
      setInviteCode(sessionStorage.getItem(`invite:${id}`) ?? "");
      const [mem, h] = await Promise.all([
        api<RoomMember[]>(`/rooms/${id}/members`),
        api<{ items: ChatMessage[] }>(`/chat/room/${id}?limit=50`),
      ]);
      setMembers(mem);
      setMsgs(h.items);
      // (re)join the socket room, covers first load and post-join refresh
      sock.current?.emit("joinScope", { scope: "room", scopeId: id });
      try {
        const g = await api<{ gameId: string }>(`/rooms/${id}/game`);
        const full = await api<GameState>(`/games/${g.gameId}`);
        setGame(full);
      } catch (e) {
        // 400 = normal "waiting for peer" (the slot already says it); real
        // failures land in the top-right error box.
        if (!(e instanceof ApiError && e.status === 400))
          notifyError(errMsg(e, "Couldn't load the room game. Try again."));
      }
      try {
        setMe(await api<Profile>("/profile/user"));
      } catch {
        setMe(null);
      }
    } catch (e) {
      console.error("room load failed", e);
      // 404 already became the roomGone notice; anything else lands in the box.
      if (!(e instanceof ApiError && e.status === 404))
        notifyError(errMsg(e, "Couldn't load this room. Try again."));
    }
  }, [id, search]);

  useEffect(() => {
    load().finally(() => setBooted(true));
  }, [load]);

  // Client-side navigation reuses this component for a new room id: drop ALL
  // per-room state (loader shows until the new room loads, never the old
  // room, and never its game/offers). Socket cleanup runs before this setup,
  // so joinedRef is still intact for leaving the old game.
  useEffect(() => {
    setBooted(false);
    setRoomGone(null);
    setMeta(null);
    setMembers([]);
    setMsgs([]);
    setGame(null);
    setOffer(null);
    setRematchPending(false);
    setNeedCode(false);
    setInviteCode("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Poll while in the room: meta (membership + live occupancy), member
  // presence, and the 1v1 game as soon as the peer joins. Notices
  // deletion/removal so the peer gets kicked to a notice, not a ghost room.
  useEffect(() => {
    if (!ready || !getToken() || !meta?.isMember || !meta.canEnter || roomGone)
      return;
    const t = setInterval(async () => {
      let m: RoomMeta;
      try {
        m = await api<RoomMeta>(`/rooms/${id}/meta`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setRoomGone("deleted");
        return; // blip, keep polling
      }
      setMeta(m);
      if (!m.isMember) {
        setRoomGone("removed");
        return;
      }
      try {
        const mem = await api<RoomMember[]>(`/rooms/${id}/members`);
        const seats = mem
          .map((x) => x.id)
          .sort()
          .join(",");
        if (seatsRef.current === null) {
          seatsRef.current = seats;
        } else if (seatsRef.current !== seats) {
          // Seats rotated: the room belongs to whoever is seated now (online
          // or not). Retire the old pair's game so the new pair's loads.
          seatsRef.current = seats;
          if (gameRef.current) {
            retiredRef.current.add(gameRef.current.id);
            gameRef.current = null;
            setGame(null);
            setOffer(null);
            setRematchPending(false);
          }
        }
        setMembers(mem);
      } catch {
        /* meta is fresh, transient */
      }
      if (!gameRef.current) {
        try {
          const g = await api<{ gameId: string }>(`/rooms/${id}/game`);
          const full = await api<GameState>(`/games/${g.gameId}`);
          setGame(full);
        } catch (e) {
          if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
            setRoomGone("deleted");
          } else if (!(e instanceof ApiError && e.status === 400)) {
            // 400 = still waiting for the peer, not an error.
            notifyError(errMsg(e, "Couldn't load the room game. Try again."));
          }
        }
      }
    }, POLL_ROOM_MS);
    return () => clearInterval(t);
  }, [ready, id, meta?.isMember, meta?.canEnter, roomGone]);

  useEffect(() => {
    const s = connectSocket();
    sock.current = s;
    const joinAll = () => {
      s.emit("joinScope", { scope: "room", scopeId: id });
      // Membership intent is synchronous, so turnover/unmount must always be
      // able to leave, even if the join ack is still in flight.
      if (gameRef.current) {
        joinedRef.current = gameRef.current.id;
        s.emit("joinGame", { gameId: gameRef.current.id });
      }
    };
    joinAll();
    const onChat = (p: { message: ChatMessage }) =>
      setMsgs((m) =>
        m.some((x) => x.id === p.message.id) ? m : [...m, p.message],
      );
    // Viewer-relative fields survive broadcasts computed for the mover.
    const keepView = (g: GameState | null, st: GameState): GameState => ({
      ...st,
      youAre: g?.youAre ?? st.youAre,
      oppId: g?.oppId ?? st.oppId,
      opponent: g?.opponent ?? st.opponent,
    });
    const onState = (st: GameState) => {
      if (retiredRef.current.has(st.id)) return; // old pair's game, ignore
      if (st.status === "open") {
        setRematchPending(false); // fresh board, offers resolved
        setOffer(null);
      }
      setGame((g) => (g ? keepView(g, st) : st));
    };
    const onOffer = (p: { gameId: string; fromHandle: string }) => {
      if (gameRef.current && p.gameId === gameRef.current.id) setOffer(p);
    };
    const onDeclined = (p: { gameId: string; reason: string }) => {
      if (!gameRef.current || p.gameId !== gameRef.current.id) return;
      setRematchPending(false);
      notifyError(
        p.reason === "noresponse"
          ? "No answer to the rematch offer."
          : "The rematch was declined.",
      );
    };
    s.on("chatMessage", onChat);
    s.on("gameState", onState);
    s.on("rematchOffer", onOffer);
    s.on("rematchDeclined", onDeclined);
    s.io.on("reconnect", joinAll); // socket.io rooms die with the old socket id
    return () => {
      // Leaving the page (or rotating to a new pair's game) leaves the game
      // room: broadcasts stop and game presence drops, socket stays up.
      if (joinedRef.current) {
        s.emit("leaveGame", { gameId: joinedRef.current });
        joinedRef.current = null;
      }
      s.emit("leaveScope", { scope: "room", scopeId: id }); // stop counting me as occupant
      s.off("chatMessage", onChat);
      s.off("gameState", onState);
      s.off("rematchOffer", onOffer);
      s.off("rematchDeclined", onDeclined);
      s.io.off("reconnect", joinAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, game?.id]);

  function move(i: number) {
    if (!game) return;
    sock.current?.emit(
      "makeMove",
      { gameId: game.id, index: i },
      (ack: { error?: string; state?: GameState }) => {
        if (ack?.error) notifyError(ack.error);
        else if (ack?.state) {
          const st = ack.state;
          setGame((g) => ({
            ...st,
            youAre: g?.youAre ?? st.youAre,
            oppId: g?.oppId ?? st.oppId,
            opponent: g?.opponent ?? null,
          }));
        }
      },
    );
  }

  function rematch() {
    // Offer flow: the opponent gets an accept/decline toast. The board
    // resets only on accept (the server enforces it too).
    if (!game || rematchPending) return;
    sock.current?.emit(
      "rematchOffer",
      { gameId: game.id },
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
        else if (accept && ack?.state) {
          const st = ack.state;
          setGame((g) =>
            g
              ? {
                  ...st,
                  youAre: g.youAre,
                  oppId: g.oppId,
                  opponent: g.opponent,
                }
              : st,
          );
        }
      },
    );
    setOffer(null);
  }

  function send(body: string) {
    if (!body.trim()) return;
    sock.current?.emit(
      "sendMessage",
      { scope: "room", scopeId: id, body },
      (ack: { error?: string; message?: ChatMessage }) => {
        if (ack?.error) {
          console.error("room message rejected", ack.error);
          notifyError(ack.error);
        } else if (ack?.message) {
          // Append from ack: the WS echo may be missed if joinScope is still in flight.
          const msg = ack.message;
          setMsgs((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
        }
      },
    );
  }

  async function joinWithCode(code: string) {
    try {
      await api(`/rooms/${id}/join`, { method: "POST", body: { code } });
      setNeedCode(false);
      await load();
    } catch (e) {
      console.error("join with code failed", e);
      notifyError(errMsg(e, "Wrong invite code. Try again."));
    }
  }

  async function joinTier() {
    try {
      await api(`/rooms/${id}/join`, { method: "POST", body: {} });
      await load();
    } catch (e) {
      console.error("tier join failed", e);
      // Re-read the gate (the joinReason effect above toasts the new
      // reason); fall back to the raw failure if the re-read fails.
      try {
        setMeta(await api<RoomMeta>(`/rooms/${id}/meta`));
      } catch {
        notifyError(errMsg(e, "Couldn't join. Try again."));
      }
    }
  }

  async function leaveRoom() {
    try {
      await api(`/rooms/${id}/leave`, { method: "POST" });
      location.href = "/rooms";
    } catch (e) {
      console.error("leave failed", e);
      notifyError(errMsg(e, "Couldn't leave. Try again."));
    }
  }

  async function deleteRoom() {
    try {
      await api(`/rooms/${id}`, { method: "DELETE" });
      location.href = "/rooms";
    } catch (e) {
      console.error("delete failed", e);
      setConfirmDelete(false);
      notifyError(errMsg(e, "Couldn't delete this room. Try again."));
    }
  }

  if (!ready) {
    return (
      <section className="page-enter loader-page">
        <Loader label="Setting the table" />
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

  if (!meta && !booted && !roomGone) {
    return (
      <section className="page-enter loader-page">
        <Loader label="Setting the table" />
      </section>
    );
  }

  // Join gate: non-members (and members who dropped below the room's tier)
  // get the proper reason or code prompt, centered. Never a dead end.
  if (meta && (!meta.isMember || !meta.canEnter)) {
    const invite = meta.accessType === "invite";
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
        <div className="plate gate-card">
          <p className="label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            {invite && <LockSimple size={13} aria-hidden="true" />}
            {invite ? "Invite only" : `${meta.minTier} table`}
          </p>
          <h1>{meta.name}</h1>
          <p className="fine num">
            {meta.onlineCount}/2 in the room · {meta.memberCount}/2 seated
          </p>
          {invite ? (
            meta.isMember ? (
              <a href="/rooms" className="btn btn-primary">
                Back to the floor
              </a>
            ) : (
              <button className="btn btn-primary" onClick={() => setNeedCode(true)}>
                Enter invite code
              </button>
            )
          ) : meta.canEnter ? (
            <button className="btn btn-primary" onClick={joinTier}>
              Take the seat
            </button>
          ) : (
            <a href="/profile" className="btn btn-primary">
              Go to profile
            </a>
          )}
        </div>
        {needCode && (
          <InviteDialog
            roomName={meta.name}
            onSubmit={joinWithCode}
            onClose={() => setNeedCode(false)}
          />
        )}
      </section>
    );
  }

  if (roomGone) {
    return (
      <section className="loader-page">
        <div className="plate gate-card">
          <p className="label">
            {roomGone === "deleted" ? "Table cleared" : "Removed from the table"}
          </p>
          <p className="fine">
            {roomGone === "deleted"
              ? "The owner cleared this table. Taking you back to the floor."
              : "You are no longer seated here. Taking you back to the floor."}
          </p>
          <a href="/rooms" className="btn btn-primary">
            Back to the floor
          </a>
        </div>
      </section>
    );
  }

  // Load failed outright (no room data, not deleted): the reason already
  // landed in the error box. Here just a way back out, not a ghost room.
  if (booted && !meta) {
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
        <div className="plate gate-card">
          <h1 className="label">Couldn&apos;t open this table</h1>
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => {
                setBooted(false);
                load().finally(() => setBooted(true));
              }}
            >
              Retry
            </button>
            <a href="/rooms" className="btn-ghost">
              Back to the floor
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-enter shell" style={{ flex: 1, gap: "1rem" }}>
      <div className="plate">
        <div className="room-head">
          <div className="room-head-info">
            <div className="room-head-row">
              <p className="label num">{meta?.onlineCount ?? 0}/2 in the room</p>
              {meta?.accessType === "invite" ? (
                <span className="tier-tag">
                  <LockSimple size={11} aria-hidden="true" />
                  Invite only
                </span>
              ) : (
                <TierTag tier={meta?.minTier ?? null} />
              )}
            </div>
            <h2>{meta?.name}</h2>
            <p className="fine dir-meta">by {meta?.creatorHandle}</p>
            {meta?.description && (
              <p className="fine" style={{ marginTop: "0.4rem" }}>
                {meta.description}
              </p>
            )}
            {inviteCode && (
              <div className="invite-box" style={{ marginTop: "0.8rem" }}>
                <span>Invite link</span>
                <a href={`${location.origin}/rooms/${id}?code=${inviteCode}`}>
                  {`${location.origin}/rooms/${id}?code=${inviteCode}`}
                </a>
                <button
                  className="chip"
                  style={{ marginLeft: "auto" }}
                  onClick={() =>
                    copyText(
                      `${location.origin}/rooms/${id}?code=${inviteCode}`,
                    )
                  }
                >
                  <Copy size={12} aria-hidden="true" />
                  Copy
                </button>
              </div>
            )}
          </div>
          <div className="room-head-side">
            <div className="room-head-row">
              {members.map((m) => (
                <span key={m.id} className="tier-tag" title={m.online ? "At this table" : "Not here right now"}>
                  <Chop id={m.id} size="sm" />
                  {m.handle}
                </span>
              ))}
            </div>
            <div className="room-head-row">
              <button className="chip" onClick={leaveRoom}>
                Leave the table
              </button>
              {meta?.isOwner && (
                <button
                  className="chip danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  Clear the table
                </button>
              )}
            </div>
          </div>
        </div>
        {confirmDelete && meta && (
          <DeleteRoomDialog
            roomName={meta.name}
            onClose={() => setConfirmDelete(false)}
            onConfirm={deleteRoom}
          />
        )}
      </div>
      <GamePanel
        game={game}
        me={me}
        msgs={msgs}
        oppOnline={!!members.find((m) => m.id === game?.oppId)?.online}
        onMove={move}
        onRematch={rematch}
        onSend={send}
        rematchPending={rematchPending}
        header={<p className="label">The table</p>}
        waiting={
          <p className="fine">
            Your card is on the table. The other seat is empty.
          </p>
        }
      />
      {offer && game && offer.gameId === game.id && (
        <RematchToast
          fromHandle={offer.fromHandle}
          onAccept={() => answerOffer(true)}
          onDecline={() => answerOffer(false)}
        />
      )}
    </section>
  );
}
