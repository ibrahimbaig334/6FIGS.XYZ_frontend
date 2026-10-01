"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io-client";
import { api, getToken, RoomRequestInfo } from "../lib/api";
import { REQUEST_TIMEOUT_MS } from "../lib/constants";
import { connectSocket } from "../lib/ws";

/**
 * Global top-right challenge notification on every page (the /play list uses
 * it too). Shows pending + live room requests and auto-dismisses each at the
 * 15s request mark unless accepted/declined.
 */
export default function ChallengeToast() {
  const [items, setItems] = useState<RoomRequestInfo[]>([]);
  const router = useRouter();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const sock = useRef<Socket | null>(null);

  function drop(id: string) {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function show(r: RoomRequestInfo) {
    // The offer's clock starts when the request was created — a reloaded page
    // only sees whatever is left of the 15s window (stale offers never show).
    const created = Date.parse(r.createdAt);
    const left = Number.isNaN(created)
      ? REQUEST_TIMEOUT_MS
      : REQUEST_TIMEOUT_MS - (Date.now() - created);
    if (left <= 0) return;
    setItems((prev) => (prev.some((x) => x.id === r.id) ? prev : [r, ...prev]));
    if (timers.current.has(r.id)) return;
    timers.current.set(
      r.id,
      setTimeout(() => {
        timers.current.delete(r.id);
        setItems((prev) => prev.filter((x) => x.id !== r.id));
      }, left),
    );
  }

  useEffect(() => {
    const map = timers.current; // stable Map instance — cleanup must use it
    const onReq = (r: RoomRequestInfo) => show(r);
    const onCancel = (p: { requestId: string }) => drop(p.requestId);

    const detach = () => {
      if (!sock.current) return;
      sock.current.off("roomRequest", onReq);
      sock.current.off("requestCancelled", onCancel);
      sock.current = null;
    };

    // (Re)attach whenever the session changes — Header recreates the socket
    // on sixfigs-auth, which orphans listeners on the old instance.
    const start = () => {
      detach();
      if (!getToken()) {
        map.forEach(clearTimeout);
        map.clear();
        setItems([]);
        return;
      }
      const s = connectSocket();
      sock.current = s;
      s.on("roomRequest", onReq);
      s.on("requestCancelled", onCancel);
      // Challenges missed while this page was loading / elsewhere.
      api<RoomRequestInfo[]>("/play/requests/incoming")
        .then((pending) => pending.forEach(show))
        .catch(() => {});
    };

    start();
    window.addEventListener("sixfigs-auth", start);
    return () => {
      window.removeEventListener("sixfigs-auth", start);
      detach();
      map.forEach(clearTimeout);
      map.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function accept(r: RoomRequestInfo) {
    drop(r.id);
    try {
      const acc = await api<{ gameId: string }>(
        `/play/requests/${r.id}/accept`,
        { method: "POST" },
      );
      router.push(`/game/${acc.gameId}`);
    } catch (e) {
      console.error("accept failed", e);
    }
  }

  async function decline(r: RoomRequestInfo) {
    drop(r.id);
    try {
      await api(`/play/requests/${r.id}/decline`, { method: "POST" });
    } catch (e) {
      console.error("decline failed", e);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((r) => (
        <div key={r.id} className="challenge-toast" role="alert">
          <span>
            <strong>{r.fromHandle}</strong> invites you to a private room
          </span>
          <span className="toast-actions">
            <button className="btn-solid btn-sm" onClick={() => accept(r)}>
              ACCEPT
            </button>
            <button className="btn-ghost btn-sm" onClick={() => decline(r)}>
              DECLINE
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
