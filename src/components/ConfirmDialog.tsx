"use client";

import { useState } from "react";
import { Warning } from "@phosphor-icons/react";

/**
 * Destructive-action confirm: explicit tick plus confirm button, no
 * accidents. Failures are toasted by the caller's onConfirm.
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
    <div className="veil" onClick={onClose}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <p className="label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--seal-bright)" }}>
          <Warning size={14} aria-hidden="true" />
          {title}
        </p>
        <p className="fine">{message}</p>
        <form onSubmit={submit}>
          <label className="ack">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            {ackLabel}
          </label>
          <div className="dialog-actions">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!ack || busy}
            >
              {busy ? "Working" : confirmLabel}
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
