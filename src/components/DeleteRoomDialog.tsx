"use client";

import { useState } from "react";
import { api } from "../lib/api";

/** Delete-room confirmation: explicit checkbox + red button, no accidents. */
export default function DeleteRoomDialog({
  roomName,
  onConfirm,
  onClose,
}: {
  roomName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ack || busy) return;
    setBusy(true);
    setErr("");
    try {
      await onConfirm();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Delete room">
        <p className="mono-label" style={{ color: "var(--crimson)" }}>⚠ DELETE ROOM</p>
        <h3 style={{ margin: "0.2rem 0" }}>{roomName}</h3>
        <p className="fine" style={{ margin: "0.4rem 0" }}>
          This permanently deletes the room for <strong>both</strong> players — members and all
          room messages go with it. This cannot be undone.
        </p>
        <form onSubmit={submit}>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontFamily: '"DM Mono", monospace', fontSize: "0.72rem", cursor: "pointer", margin: "0.6rem 0" }}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: "0.15rem", width: "1rem", height: "1rem", accentColor: "var(--crimson)" }} />
            I understand this room and its messages will be deleted forever.
          </label>
          {err && <p style={{ color: "var(--crimson)", fontFamily: '"DM Mono", monospace', fontSize: "0.7rem" }}>{err}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn-solid"
              type="submit"
              disabled={!ack || busy}
              style={{ padding: "0.7rem 1rem", background: "var(--crimson)", borderColor: "var(--crimson)", color: "#fff", opacity: !ack || busy ? 0.45 : 1, cursor: !ack || busy ? "not-allowed" : "pointer" }}
            >
              {busy ? "DELETING…" : "DELETE ROOM"}
            </button>
            <button className="btn-ghost" style={{ padding: "0.7rem 1rem" }} type="button" onClick={onClose}>CANCEL</button>
          </div>
        </form>
      </div>
    </div>
  );
}
