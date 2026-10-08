"use client";

import { useState } from "react";
import type { Profile } from "../lib/api";
import AuthModal from "./AuthModal";

/**
 * The single sign-in call to action. Owns its own modal so every gate (header,
 * rooms, play, create, game, profile) is one tag: one button, then a choice
 * between connecting a wallet and using a username + password.
 *
 * Only the trigger lives here. Every phase of the flow, including the account
 * confirmation, renders inside the dialog so it never replaces the button.
 */
export default function SignInButton({
  onDone,
  label = "Sign in",
}: {
  onDone: (p?: Profile) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <AuthModal onClose={() => setOpen(false)} onDone={onDone} />
      )}
    </>
  );
}
