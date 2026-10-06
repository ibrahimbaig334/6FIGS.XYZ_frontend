"use client";

import { useEffect } from "react";
import EmailAuth from "./EmailAuth";
import type { Profile } from "../lib/api";

/**
 * Top-bar login: email signup/login. Wallets connect only after login,
 * through the tee prove flow on the profile page.
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
      </div>
    </div>
  );
}