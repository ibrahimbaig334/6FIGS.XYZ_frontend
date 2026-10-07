"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getToken, Profile } from "../lib/api";
import { notifyError } from "../lib/notify";
import {
  alreadySignedIn,
  isAutoLoginSuppressed,
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
  const { publicKey, signMessage, wallet, connected, connecting, connect, select } =
    useWallet();
  const { visible, setVisible: setModalVisible } = useWalletModal();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"idle" | "choose" | "connect">("idle");
  const doneFor = useRef<string | null>(null);
  const connRef = useRef(false);
  // Explicit-intent flags. Selections are cleared on press (select(null)),
  // so ANY selection present at popup close is a real pick — a dismissed
  // popup can never auto-connect a stale stored wallet.
  const armedRef = useRef(false);
  const prevConnRef = useRef(false);
  const firstRunRef = useRef(true);

  // Popup closed: a present selection is always a real pick (press clears
  // stale ones first); otherwise back out silently.
  useEffect(() => {
    if (visible || phase !== "choose") return;
    if (!wallet) setPhase("idle");
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
    // Stand down where another flow owns signatures: the /recover workspace
    // and any active recovery-link run (their nonces live in a separate
    // slot, but a second signature popup would still be wrong). Explicit
    // button presses (armed) always win.
    const quiet =
      (pathname !== null && pathname.startsWith("/recover")) ||
      isAutoLoginSuppressed();
    if (quiet && !armedRef.current) return;
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
  }, [connected, publicKey, attempt, pathname]);

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
          try {
            select(null); // clear any stale stored selection first
          } catch {
            /* selection unsupported — popup still opens */
          }
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
