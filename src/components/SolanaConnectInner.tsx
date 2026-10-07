"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getToken, Profile } from "../lib/api";
import { notifyError } from "../lib/notify";
import {
  alreadySignedIn,
  lastLoggedInProfile,
  loginOnce,
} from "../lib/solanaLogin";

/**
 * Navbar-style (btn-solid) trigger that opens the DEFAULT wallet-adapter
 * select popup. Popups only ever follow explicit intent:
 * - press while disconnected → popup; picking connects, closing backs out;
 * - press while connected → signs in with the current wallet directly;
 * - closing the popup without picking a DIFFERENT wallet does nothing.
 * Login runs on fresh connects or explicit presses — never on mount — then
 * nonce → sign → verify (first wallet) / attach (extra wallets).
 */
function SolanaConnectInner({
  onDone,
  label,
}: {
  onDone: (p?: Profile) => void;
  label?: string;
}) {
  const { publicKey, signMessage, wallet, connected, connecting, connect } =
    useWallet();
  const { visible, setVisible: setModalVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"idle" | "choose" | "connect">("idle");
  const doneFor = useRef<string | null>(null);
  const connRef = useRef(false);
  // Selection snapshot at popup open + explicit-intent flags.
  const openSelRef = useRef<string | null>(null);
  const armedRef = useRef(false);
  const prevConnRef = useRef(false);
  const firstRunRef = useRef(true);

  // Popup closed: a NEW pick connects; anything else backs out silently.
  // (Comparing against the open-time snapshot is what stops a dismissed
  // popup from auto-connecting the previously used wallet.)
  useEffect(() => {
    if (visible || phase !== "choose") return;
    const picked =
      (wallet?.adapter.name ?? null) !== openSelRef.current;
    if (!picked) setPhase("idle");
    else setPhase("connect");
  }, [visible, phase, wallet]);

  useEffect(() => {
    if (phase !== "connect") return;
    if (connected || !wallet) {
      setPhase("idle");
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

  useEffect(() => {
    const was = prevConnRef.current;
    prevConnRef.current = connected;
    const first = firstRunRef.current;
    firstRunRef.current = false;
    const fresh = !was && connected && !first;
    if (!connected || !publicKey || !signMessage) return;
    const address = publicKey.toString();
    if (doneFor.current === address) return;
    if (alreadySignedIn(address)) {
      doneFor.current = address;
      onDone(lastLoggedInProfile() ?? undefined);
      return;
    }
    // No popup without intent: skip mount-connected and idle states; only
    // fresh connects and explicit button presses proceed to signatures.
    if (!fresh && !armedRef.current) return;
    armedRef.current = false;
    let cancelled = false;
    setBusy(true);
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
          notifyError("Connection failed — try again");
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
          // Explicit intent: connected press signs in directly, anything
          // else goes through the popup (pick = connect, close = back out).
          if (connected && publicKey) {
            armedRef.current = true;
            setAttempt((a) => a + 1);
            return;
          }
          openSelRef.current = wallet?.adapter.name ?? null;
          setModalVisible(true);
          setPhase("choose");
        }}
      >
        {uiConnecting ? "CONNECTING…" : (label ?? "CONNECT WALLET")}
      </button>
    </div>
  );
}

export default SolanaConnectInner;
