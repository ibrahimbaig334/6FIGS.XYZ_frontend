"use client";

import { useEffect, useRef, useState } from "react";
import { Smiley } from "@phosphor-icons/react";
import { CHAT_EMOJIS } from "../lib/constants";

/** Emoji picker popup for chat and room descriptions (the emojis are chat
 *  content; the control itself wears the house materials). */
export default function EmojiPicker({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flex: "none" }}>
      <button
        type="button"
        className="chip"
        aria-label="Pick an emoji"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{ padding: "0.55rem 0.7rem", color: "var(--tx)" }}
      >
        <Smiley size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="menu menu-up"
          role="menu"
          style={{
            bottom: "110%",
            right: 0,
            padding: "0.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "0.15rem",
            width: "max-content",
            maxWidth: "90vw",
          }}
        >
          {CHAT_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="menuitem"
              aria-label={`emoji ${e}`}
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              style={{
                border: 0,
                background: "none",
                borderRadius: "4px",
                fontSize: "1.25rem",
                lineHeight: 1,
                padding: "0.4rem",
                cursor: "pointer",
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
