"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getToken, Profile } from "../lib/api";
import {
  alreadySignedIn,
  lastLoggedInProfile,
  loginOnce,
} from "../lib/solanaLogin";

/**
 * Navbar-style (btn-solid) trigger that opens the DEFAULT wallet-adapter
 * select popup. Nothing connects until the user presses this button; once the
 * popup closes we connect the chosen (or previously used) wallet, then run
 * nonce → sign → verify (first wallet) / attach (extra wallets).
 */
function SolanaConnectInner({
  onDone,
  hideError,
  label,
}: {
  onDone: (p?: Profile) => void;
  hideError?: boolean;
  label?: string;
}) {
  const { publicKey, signMessage, wallet, connected, connecting, connect } =
    useWallet();
  const { visible, setVisible: setModalVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"idle" | "choose" | "connect">("idle");
  const doneFor = useRef<string | null>(null);
  const connRef = useRef(false);

  // Popup closed → the press resolves: connect (or retry sign-in if we are
  // already connected to this wallet).
  useEffect(() => {
    if (!visible && phase === "choose") setPhase("connect");
  }, [visible, phase]);

  useEffect(() => {
    if (phase !== "connect") return;
    if (connected) {
      // Press while connected = retry the sign-in flow for the current wallet.
      setAttempt((a) => a + 1);
      setPhase("idle");
      return;
    }
    if (!wallet) {
      if (!visible) setPhase("idle"); // closed without picking a wallet
      return;
    }
    if (connecting || connRef.current) return;
    connRef.current = true;
    connect()
      .catch((e) => {
        console.error("wallet connect failed", e);
        setErr("Connection failed — try again");
      })
      .finally(() => {
        connRef.current = false;
        setPhase("idle");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, wallet, connected, connecting, visible]);

  useEffect(() => {
    if (!connected || !publicKey || !signMessage) return;
    const address = publicKey.toString();
    if (doneFor.current === address) return;
    if (alreadySignedIn(address)) {
      doneFor.current = address;
      onDone(lastLoggedInProfile() ?? undefined);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setErr("");
    const sign = (m: Uint8Array) =>
      signMessage(m) as unknown as Promise<
        Uint8Array | { signature: Uint8Array }
      >;
    // Shared singleton flow: concurrent instances (and StrictMode's double
    // effect) all join ONE nonce→sign→verify, so nonces never collide.
    loginOnce(address, sign, wallet?.adapter.name ?? null)
      .then((res) => {
        if (cancelled) return;
        doneFor.current = address;
        onDone(res.profile);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("wallet sign-in failed", e);
          setErr("Connection failed — try again");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, attempt]);

  // Session cleared server-side (401): allow this address to sign in again.
  // MUST ignore events where this wallet's session is intact — onDone →
  // authed() → sixfigs-auth → this listener would otherwise re-fire onDone
  // forever (HTTP storm: every cycle = /profile/user + socket reconnect).
  useEffect(() => {
    const onAuth = () => {
      const address = publicKey?.toString() ?? null;
      if (address && getToken() && alreadySignedIn(address)) return;
      doneFor.current = null;
      setAttempt((a) => a + 1);
    };
    window.addEventListener("sixfigs-auth", onAuth);
    return () => window.removeEventListener("sixfigs-auth", onAuth);
  }, [publicKey]);

  const uiConnecting = busy || connecting;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        alignItems: "center",
      }}
    >
      {/* Same class/layout as the navbar dark buttons; opens the default adapter popup. */}
      <button
        className="btn-solid"
        disabled={uiConnecting}
        onClick={() => {
          setErr("");
          setModalVisible(true);
          setPhase("choose");
        }}
      >
        {uiConnecting ? "CONNECTING…" : (label ?? "CONNECT WALLET")}
      </button>
      {err && !hideError && <p className="err">{err}</p>}
    </div>
  );
}

export default SolanaConnectInner;
