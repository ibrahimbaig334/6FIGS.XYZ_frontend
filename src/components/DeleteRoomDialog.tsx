"use client";

import { useState } from "react";
import { Warning } from "@phosphor-icons/react";
import { notifyError } from "../lib/notify";

/** Delete-room confirmation: explicit checkbox plus confirm, no accidents. */
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ack || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } catch (e2) {
      console.error("delete room failed", e2);
      notifyError("Delete failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="veil" onClick={onClose}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Delete room"
      >
        <p className="label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--seal-bright)" }}>
          <Warning size={14} aria-hidden="true" />
          Delete room
        </p>
        <h3>{roomName}</h3>
        <p className="fine">
          This folds the table for both players. Members and all room messages
          go with it. This cannot be undone.
        </p>
        <form onSubmit={submit}>
          <label className="ack">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I understand this room and its messages will be deleted.
          </label>
          <div className="dialog-actions">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!ack || busy}
            >
              {busy ? "Deleting" : "Delete room"}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
