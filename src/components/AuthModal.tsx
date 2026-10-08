"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../lib/api";
import { notifyError } from "../lib/notify";
import TeeProve from "./TeeProve";
import { isAppKitReady } from "./Web3Providers";

/**
 * One auth entry point, two ways in. Wallet proof is the default because it is
 * what creates the account and the tier; username + password exists for people
 * who already set one up and just want to get back in on another device.
 *
 * Both phases stay inside this dialog — including the account confirmation —
 * so nothing ever renders in place of the header button.
 *
 * The wallet phase uses the standard dialog backdrop (z-50). That is safe
 * under AppKit's picker: AppKit appends its modal to <body> at z-index 9999,
 * so the picker always paints above, and the global PickerScrim blurs
 * everything behind it while open.
 */
export default function AuthModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (p?: Profile) => void;
}) {
  const [wallet, setWallet] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (wallet) {
    return (
      <div className="dialog-overlay">
        <div
          className="dialog-box"
          style={{ alignItems: "center", textAlign: "center" }}
          role="dialog"
          aria-label="Connect a wallet"
        >
          <TeeProve
            mode="establish"
            sessionless
            busyLabel="OPENING YOUR WALLET…"
            onDone={(p) => {
              onDone(p);
              onClose();
            }}
            onDismiss={() => setWallet(false)}
          />
          <button
            className="btn-ghost"
            style={{ padding: "0.5rem 1rem" }}
            onClick={onClose}
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        style={{ textAlign: "left" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Sign in"
      >
        <p className="mono-label" style={{ margin: 0, textAlign: "center" }}>
          SIGN IN
        </p>

        <button
          className="auth-option"
          onClick={() => {
            if (!isAppKitReady()) {
              notifyError(
                "Wallet connect is not configured — set NEXT_PUBLIC_REOWN_PROJECT_ID",
              );
              return;
            }
            setWallet(true);
          }}
        >
          <span className="auth-option-title">CONNECT A WALLET ↗</span>
          <span className="auth-option-sub">
            New here? This creates your account and proves your tier. Returning?
            Any enrolled wallet signs you straight in.
          </span>
        </button>

        <a className="auth-option" href="/recover">
          <span className="auth-option-title">USERNAME + PASSWORD ↗</span>
          <span className="auth-option-sub">
            Set one up in your profile to skip wallets on other devices. Forgot
            it? Recover with any enrolled wallet.
          </span>
        </a>

        <button
          className="btn-ghost"
          style={{ alignSelf: "center", padding: "0.5rem 1rem" }}
          onClick={onClose}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}