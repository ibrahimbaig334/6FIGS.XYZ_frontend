"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../lib/api";
import { notifyError } from "../lib/notify";
import TeeProve from "./TeeProve";
import { ensureWalletStack, isWalletConfigured } from "./Web3Providers";

/**
 * One auth entry point, two ways in. Wallet proof is the default because it is
 * what creates the account and the tier; username + password exists for people
 * who already set one up and just want to get back in on another device.
 *
 * Both phases stay inside this dialog, including the account confirmation,
 * so nothing ever renders in place of the header button.
 *
 * The wallet phase uses the standard dialog backdrop. That is safe under
 * AppKit's picker: AppKit appends its modal to <body> at z-index 9999, so the
 * picker always paints above, and the global PickerScrim blurs everything
 * behind it while open.
 */
export default function AuthModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (p?: Profile) => void;
}) {
  const [wallet, setWallet] = useState(false);

  // The door opening means a wallet is likely: warm the attestation trust
  // anchor (Google JWKS) and start the wallet chunk downloading while the
  // user reads, so neither waits on the critical path later.
  useEffect(() => {
    void import("../lib/teeVerify").then((m) => m.prewarmTee());
    void ensureWalletStack().catch(() => {});
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (wallet) {
    return (
      <div className="veil">
        <div
          className="dialog"
          style={{ alignItems: "center", textAlign: "center" }}
          role="dialog"
          aria-label="Connect a wallet"
        >
          <p className="door-title" style={{ margin: 0 }}>
            Proof of bags
          </p>
          <TeeProve
            mode="establish"
            sessionless
            busyLabel="Opening your wallet…"
            onDone={(p) => {
              onDone(p);
              onClose();
            }}
            onDismiss={() => setWallet(false)}
          />
          <button className="btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="veil" onClick={onClose}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Sign in"
      >
        <h1 className="door-title" style={{ margin: 0, textAlign: "center" }}>
          Sign in
        </h1>

        <button
          className="door-option"
          onClick={() => {
            if (!isWalletConfigured()) {
              notifyError(
                "Wallet connect is not configured. Set NEXT_PUBLIC_REOWN_PROJECT_ID.",
              );
              return;
            }
            void ensureWalletStack().catch(() => {});
            setWallet(true);
          }}
        >
          <span className="door-option-title">Connect a wallet</span>
          <span className="door-option-sub">
            New here? This creates your account and proves your tier. Returning?
            Any enrolled wallet signs you in.
          </span>
        </button>

        <a className="door-option" href="/recover">
          <span className="door-option-title">Username and password</span>
          <span className="door-option-sub">
            Set one up in your profile to skip wallets on other devices. Forgot
            it? Recover with any enrolled wallet.
          </span>
        </a>

        <button
          className="btn-ghost btn-sm"
          style={{ alignSelf: "center" }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
