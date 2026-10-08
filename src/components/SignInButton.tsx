"use client";

import { useState } from "react";
import type { Profile } from "../lib/api";
import AuthModal from "./AuthModal";

/**
 * The single sign-in call to action. Owns its own modal so every gate (header,
 * rooms, play, create, game, profile) is one tag: one button, then a choice
 * between connecting a wallet and using a username + password.
 */
export default function SignInButton({
  onDone,
  label = "SIGN IN ↗",
}: {
  onDone: (p?: Profile) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn-solid" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <AuthModal onClose={() => setOpen(false)} onDone={onDone} />
      )}
    </>
  );
}