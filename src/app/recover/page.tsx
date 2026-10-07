"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  b58encode,
  errMsg,
  getToken,
  loginMessage,
  usernameLogin,
  usernameRecover,
  usernameReset,
  walletNonce,
} from "../../lib/api";
import { notifyError } from "../../lib/notify";

/**
 * Device-free sign-in hub. Two modes: username + password sign-in, or
 * forgot-either recovery by signing with a linked wallet (no session, and
 * deliberately NOT the wallet-login flow — recovery must never create or
 * switch accounts).
 */
export default function RecoverPage() {
  const [mode, setMode] = useState<"signin" | "forgot">("signin");

  if (typeof window !== "undefined" && getToken()) {
    location.href = "/profile";
    return null;
  }
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
  const { publicKey, signMessage, wallet, connected, connecting, connect, disconnect } =
    useWallet();
  const { visible, setVisible } = useWalletModal();
  const [phase, setPhase] = useState<"idle" | "choose" | "connect">("idle");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{
    username: string | null;
    recoveryToken: string;
  } | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const connRef = useRef(false);
  const doneFor = useRef<string | null>(null);

  // Same modal discipline as the prove flow: modal only selects.
  useEffect(() => {
    if (!visible && phase === "choose") setPhase("connect");
  }, [visible, phase]);

  useEffect(() => {
    if (phase !== "connect") return;
    if (connected) {
      setPhase("idle");
      return;
    }
    if (!wallet) {
      if (!visible) setPhase("idle");
      return;
    }
    if (connecting || connRef.current) return;
    connRef.current = true;
    connect()
      .catch((e) => {
        console.error("wallet connect failed", e);
        notifyError("Connection failed — try again");
      })
      .finally(() => {
        connRef.current = false;
        setPhase("idle");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, wallet, connected, connecting, visible]);

  // Connected (and not yet recovered with it): nonce → sign → recover.
  // Never the wallet-login endpoint — recovery must not create a session.
  useEffect(() => {
    if (!connected || !publicKey || !signMessage || busy || found) return;
    const address = publicKey.toString();
    if (doneFor.current === address) return;
    doneFor.current = address;
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const { nonce } = await walletNonce("SOL", address);
        const raw = (await signMessage(
          new TextEncoder().encode(loginMessage("SOL", address, nonce)),
        )) as unknown as Uint8Array | { signature: Uint8Array };
        const res = await usernameRecover(
          "SOL",
          address,
          nonce,
          b58encode(raw instanceof Uint8Array ? raw : raw.signature),
        );
        if (cancelled) return;
        setFound({ username: res.username, recoveryToken: res.recoveryToken });
        setNewUsername(res.username ?? "");
        // Recovery over — drop the adapter connection; the reset below is sessionless.
        try {
          await disconnect();
        } catch {
          /* already gone */
        }
      } catch (e) {
        if (!cancelled) {
          console.error("recovery failed", e);
          notifyError(errMsg(e, "Couldn't recover — try again"));
          doneFor.current = null;
          // Drop the connection so a fresh press retries cleanly.
          try {
            await disconnect();
          } catch {
            /* already gone */
          }
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, busy, found]);

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

  // Top-of-render redirect breaks hooks order — profile gate handles authed users.
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
        Connect one of your linked wallets and sign — that proves ownership,
        no session is created.
      </p>
      <button
        className="btn-solid"
        disabled={busy || connecting}
        onClick={() => {
          setVisible(true);
          setPhase("choose");
        }}
      >
        {busy || connecting ? "CHECKING…" : "CONNECT WALLET ↗"}
      </button>
    </div>
  );
}
