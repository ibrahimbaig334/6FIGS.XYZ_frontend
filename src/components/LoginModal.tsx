"use client";

import { useEffect } from "react";
import EmailAuth from "./EmailAuth";
import SolanaConnect from "./SolanaConnect";
import type { Profile } from "../lib/api";

/**
 * Top-bar login: email signup/login is the primary path (accounts are created
 * with email). Wallet connect stays as legacy sign-in below the divider.
 */
export default function LoginModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (p?: Profile) => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        style={{ width: "min(440px, 92vw)", textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Log in"
      >
        <p className="mono-label">LOG IN</p>
        <EmailAuth
          onDone={() => {
            onDone();
            onClose();
          }}
        />
        <p className="fine" style={{ margin: "0.4rem 0 0" }}>
          ...or connect a wallet (legacy sign-in)
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SolanaConnect
            label="CONNECT WALLET ↗"
            onDone={(p) => {
              onDone(p);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}