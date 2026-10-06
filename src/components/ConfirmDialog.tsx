"use client";

import { useState } from "react";

/**
 * Generic destructive-action confirm: explicit tick (checkbox) + confirm
 * button, no accidents. Failures are toasted by the caller's onConfirm.
 */
export default function ConfirmDialog({
  title,
  message,
  ackLabel,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  ackLabel: string;
  confirmLabel: string;
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <p className="mono-label" style={{ color: "var(--crimson)" }}>
          ⚠ {title}
        </p>
        <p className="fine" style={{ margin: "0.4rem 0" }}>
          {message}
        </p>
        <form onSubmit={submit}>
          <label
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
              fontFamily: "var(--font-dm-mono)",
              fontSize: "0.72rem",
              cursor: "pointer",
              margin: "0.6rem 0",
            }}
          >
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              style={{
                marginTop: "0.15rem",
                width: "1rem",
                height: "1rem",
                accentColor: "var(--crimson)",
              }}
            />
            {ackLabel}
          </label>          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn-solid"
              type="submit"
              disabled={!ack || busy}
              style={{
                padding: "0.7rem 1rem",
                background: "var(--crimson)",
                borderColor: "var(--crimson)",
                color: "#fff",
                opacity: !ack || busy ? 0.45 : 1,
                cursor: !ack || busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "WORKING…" : confirmLabel}
            </button>
            <button
              className="btn-ghost"
              style={{ padding: "0.7rem 1rem" }}
              type="button"
              onClick={onClose}
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
