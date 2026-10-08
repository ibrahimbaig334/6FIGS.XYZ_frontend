"use client";

import { useState } from "react";
import { LockSimple } from "@phosphor-icons/react";
import { notifyError } from "../lib/notify";

/** Invite-code dialog. Empty submits nudge; wrong-code failures land in the
 *  error toast and the dialog stays open for a retry. */
export default function InviteDialog({
  roomName,
  onSubmit,
  onClose,
}: {
  roomName: string;
  onSubmit: (code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      notifyError("Enter the invite code.");
      return;
    }
    onSubmit(code.trim());
  }

  return (
    <div className="veil" onClick={onClose}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Enter invite code"
      >
        <p className="label" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <LockSimple size={13} aria-hidden="true" />
          Invite only
        </p>
        <h3>{roomName}</h3>
        <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", flexDirection: "row", alignItems: "center" }}>
          <input
            className="field"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code"
            autoFocus
            maxLength={32}
            aria-label="Invite code"
          />
          <button className="btn btn-primary" type="submit">
            Join
          </button>
        </form>
        <button className="btn-ghost btn-sm" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
