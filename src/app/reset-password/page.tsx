"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { emailReset } from "../../lib/api";
import { notifyError } from "../../lib/notify";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  async function submit() {
    if (busy) return;
    if (password.length < 10) {
      notifyError("Password must be at least 10 characters");
      return;
    }
    if (password !== confirm) {
      notifyError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await emailReset(token, password);
      setDone(true);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Reset failed — request a new link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-enter" style={{ padding: "2rem 5vw", display: "grid", placeItems: "center", flex: 1 }}>
      <div className="card" style={{ width: "100%", maxWidth: "460px", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <p className="mono-label">RESET PASSWORD</p>
        {done ? (
          <>
            <p className="fine" style={{ margin: 0 }}>
              Password updated. Sign in with your new password.
            </p>
            <Link className="btn-solid" href="/profile" style={{ textAlign: "center" }}>
              GO TO PROFILE
            </Link>
          </>
        ) : (
          <>
            {!token && (
              <p className="fine" style={{ margin: 0 }}>
                This link is missing its token. Use the link in the email, or request a new one.
              </p>
            )}
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              placeholder="new password (10+ chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              placeholder="confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button className="btn-solid" disabled={busy || !token} onClick={() => void submit()}>
              {busy ? "SAVING…" : "SET NEW PASSWORD"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}