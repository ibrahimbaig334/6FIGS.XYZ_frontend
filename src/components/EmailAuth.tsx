"use client";

import { useState } from "react";
import { ApiError, emailLink, emailLogin, emailSignup } from "../lib/api";

/**
 * Email signup/login. Wallets attach later through the tee prove flow.
 * `linkOnly` attaches the email to the current (wallet) account instead.
 */
export default function EmailAuth({
  onDone,
  linkOnly,
}: {
  onDone: () => void;
  linkOnly?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setErr("");
    setBusy(true);
    try {
      if (linkOnly) await emailLink(email, password);
      else if (mode === "signup") await emailSignup(email, password);
      else await emailLogin(email, password);
      onDone();
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : "Authentication failed — try again",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {!linkOnly && (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              className={mode === m ? "chip active" : "chip"}
              onClick={() => {
                setMode(m);
                setErr("");
              }}
            >
              {m === "login" ? "LOG IN" : "SIGN UP"}
            </button>
          ))}
        </div>
      )}
      <input
        className="field"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="field"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        placeholder="password (10+ chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
      />
      <button className="btn-solid" disabled={busy} onClick={() => void submit()}>
        {busy
          ? "WORKING…"
          : linkOnly
            ? "LINK EMAIL ↗"
            : mode === "login"
              ? "LOG IN ↗"
              : "CREATE ACCOUNT ↗"}
      </button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}