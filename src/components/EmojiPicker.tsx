"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_EMOJIS } from "../lib/constants";

/** Emoji picker popup (gold-hover grid, same language as other dropdowns). */
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
        style={{ padding: "0.7rem 0.8rem", fontSize: "1rem" }}
      >
        😀
      </button>
      {open && (
        <div
          className="dropdown"
          role="menu"
          style={{
            position: "absolute",
            bottom: "110%",
            right: 0,
            background: "var(--paper)",
            border: "2px solid var(--ink)",
            boxShadow: "4px 4px 0 var(--shadow)",
            zIndex: 40,
            padding: "0.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "0.15rem",
            width: "max-content",
            maxWidth: "70vw",
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
                fontSize: "1.3rem",
                lineHeight: 1,
                padding: "0.4rem",
                cursor: "pointer",
              }}
              onMouseEnter={(ev) => {
                (ev.target as HTMLButtonElement).style.background =
                  "var(--gold)";
              }}
              onMouseLeave={(ev) => {
                (ev.target as HTMLButtonElement).style.background = "none";
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
