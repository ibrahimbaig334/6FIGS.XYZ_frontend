"use client";

import { useState } from "react";
import { errMsg, usernameLogin, usernameReset } from "../../lib/api";
import { notifyError } from "../../lib/notify";
import TeeProve, { type IdentifiedAccount } from "../../components/TeeProve";
import { isAppKitReady } from "../../components/Web3Providers";

/**
 * Device-free sign-in hub. Two modes: username + password sign-in, or
 * forgot-either recovery by proving an enrolled wallet (no session is
 * created; the reset signs the holder into the recovered account).
 */
export default function RecoverPage() {
  const [mode, setMode] = useState<"signin" | "forgot">("signin");

  // No session gate here on purpose: logged-in users may also recover a
  // different account's credentials with a wallet (the reset signs them
  // into the recovered account).
  return (
    <section
      className="page-enter"
      style={{
        padding: "2rem 5vw",
        flex: 1,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          textAlign: "center",
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <p className="mono-label">SIGN IN WITHOUT WALLET</p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          {(["signin", "forgot"] as const).map((m) => (
            <button
              key={m}
              className={mode === m ? "chip active" : "chip"}
              onClick={() => setMode(m)}
            >
              {m === "signin" ? "USERNAME + PASSWORD" : "FORGOT EITHER"}
            </button>
          ))}
        </div>
        {mode === "signin" ? <SigninForm /> : <ForgotFlow />}
      </div>
    </section>
  );
}

function SigninForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!username.trim() || !password) {
      notifyError("Enter your username and password");
      return;
    }
    setBusy(true);
    try {
      await usernameLogin(username.trim(), password);
      location.href = "/profile";
    } catch (e) {
      console.error("username login failed", e);
      notifyError(errMsg(e, "Couldn't sign in — try again"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <input
        className="field"
        placeholder="username"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
      />
      <input
        className="field"
        type="password"
        placeholder="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
      />
      <button className="btn-solid" disabled={busy} onClick={() => void submit()}>
        {busy ? "WORKING…" : "SIGN IN ↗"}
      </button>
      <p className="fine" style={{ margin: 0 }}>
        Set up in profile first (optional). No wallets needed here.
      </p>
    </div>
  );
}

function ForgotFlow() {
  const [active, setActive] = useState(false);
  const [found, setFound] = useState<IdentifiedAccount | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function finish() {
    if (saving || !found) return;
    if (!newPassword) {
      notifyError("Enter a new password to finish recovery");
      return;
    }
    setSaving(true);
    try {
      await usernameReset(
        found.recoveryToken,
        newUsername.trim() || undefined,
        newPassword,
      );
      location.href = "/profile";
    } catch (e) {
      console.error("recovery reset failed", e);
      notifyError(errMsg(e, "Couldn't save — try again"));
    } finally {
      setSaving(false);
    }
  }

  if (found) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <p className="fine" style={{ margin: 0 }}>
          {found.username
            ? `Account found: ${found.username}. Set a new password to sign in.`
            : "Account found (no username yet). Create one plus a password to sign in."}
        </p>
        <input
          className="field"
          placeholder="username (3–24 chars)"
          autoComplete="username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
        />
        <input
          className="field"
          type="password"
          placeholder="new password (10+ chars)"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button className="btn-solid" disabled={saving} onClick={() => void finish()}>
          {saving ? "SAVING…" : "SAVE & SIGN IN ↗"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <p className="fine" style={{ margin: 0 }}>
        Connect one of your enrolled wallets and sign — that proves ownership;
        no session is created.
      </p>
      {active ? (
        <TeeProve
          mode="identify"
          busyLabel="CHECKING…"
          onIdentified={(account) => {
            setActive(false);
            setFound(account);
            setNewUsername(account.username ?? "");
          }}
          onDismiss={() => setActive(false)}
        />
      ) : (
        <button
          className="btn-solid"
          onClick={() => {
            if (!isAppKitReady()) {
              notifyError(
                "Wallet connect is not configured — set NEXT_PUBLIC_REOWN_PROJECT_ID",
              );
              return;
            }
            setActive(true);
          }}
        >
          CONNECT WALLET ↗
        </button>
      )}
    </div>
  );
}