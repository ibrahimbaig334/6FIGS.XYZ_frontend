"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../lib/api";
import { notifyError } from "../lib/notify";
import TeeProve from "./TeeProve";
import { isAppKitReady } from "./Web3Providers";

/**
 * One auth entry point, two ways in. Wallet proof is the default because it is
 * what creates the account and the tier; username + password exists for people
 * who already set one up and just want to get back in on another device
 * without touching a wallet. Choosing credentials routes to /recover, which
 * also carries the wallet recovery flow.
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
      <div className="dialog-overlay" onClick={onClose}>
        <div
          className="dialog-box"
          style={{ alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Connect a wallet"
        >
          <TeeProve
            mode="establish"
            sessionless
            onDone={(p) => {
              onDone(p);
              onClose();
            }}
            onDismiss={() => setWallet(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box"
        style={{ textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Sign in"
      >
        <p className="mono-label">SIGN IN</p>
        <button
          className="btn-solid"
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
          CONNECT WALLET ↗
        </button>
        <p className="fine" style={{ margin: 0 }}>
          First time? Connecting a wallet creates your account and proves your
          tier. Returning? Any enrolled wallet signs you straight in.
        </p>
        <p className="fine" style={{ margin: 0 }}>
          Already set up a username and password? Sign in without a wallet — or
          recover it with one.
        </p>
        <a className="btn-solid" href="/recover">
          USERNAME + PASSWORD ↗
        </a>
        <button className="btn-ghost" onClick={onClose}>
          CANCEL
        </button>
      </div>
    </div>
  );
}