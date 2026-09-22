"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api, ChatMessage, extractTickers, RoomMember } from "../../../lib/api";
import { connectSocket } from "../../../lib/ws";
import TokenCard from "../../../components/TokenCard";

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const sock = useRef<ReturnType<typeof connectSocket> | null>(null);

  const load = useCallback(async () => {
    try {
      setMembers(await api<RoomMember[]>(`/rooms/${id}/members`));
      const h = await api<{ items: ChatMessage[] }>(`/chat/room/${id}?limit=50`);
      setMsgs(h.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed (join the room first)");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const s = connectSocket();
    sock.current = s;
    s.emit("joinScope", { scope: "room", scopeId: id });
    const onChat = (p: { message: ChatMessage }) => setMsgs((m) => [...m, p.message]);
    s.on("chatMessage", onChat);
    return () => {
      s.off("chatMessage", onChat);
    };
  }, [id]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft;
    setDraft("");
    sock.current?.emit("sendMessage", { scope: "room", scopeId: id, body }, (ack: { error?: string }) => {
      if (ack?.error) setErr(ack.error);
    });
  }

  return (
    <section style={{ padding: "2rem 5vw", display: "grid", gridTemplateColumns: "220px 1fr", gap: "1rem" }}>
      <div>
        <p className="mono-label">MEMBERS ({members.length})</p>
        {members.map((m) => (
          <p key={m.id} style={{ fontFamily: '"DM Mono", monospace', fontSize: "0.7rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <span className={m.online ? "dot on" : "dot"} title={m.online ? "Online" : "Offline"} /> {m.handle}
          </p>
        ))}
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
