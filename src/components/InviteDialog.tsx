"use client";

import { useState } from "react";

/** Proper invite-code dialog (replaces window.prompt). */
export default function InviteDialog({
  roomName,
  onSubmit,
  onClose,
  error,
}: {
  roomName: string;
  onSubmit: (code: string) => void;
  onClose: () => void;
  error?: string;
}) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setErr("Enter the invite code");
      return;
    }
    onSubmit(code.trim());
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Enter invite code">
        <p className="mono-label">🔒 INVITE-ONLY ROOM</p>
        <h3 style={{ margin: 0 }}>{roomName}</h3>
        <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            className="field"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            autoFocus
            maxLength={32}
          />
          <button className="btn-solid" style={{ padding: "0.7rem 1rem" }} type="submit">JOIN ↗</button>
        </form>
        {(err || error) && <p style={{ color: "var(--crimson)", fontFamily: 'var(--font-dm-mono)', fontSize: "0.7rem" }}>{err || error}</p>}
        <button className="btn-ghost" style={{ padding: "0.5rem 0.8rem" }} onClick={onClose}>CANCEL</button>
      </div>
    </div>
  );
}
