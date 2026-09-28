"use client";

import { CHAT_SUGGESTIONS } from "../lib/constants";

/** Tap-to-fill chat recommendations above the input. */
export default function ChatSuggestions({
  onPick,
}: {
  onPick: (text: string) => void;
}) {
  return (
    <div
      style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}
      aria-label="Suggested messages"
    >
      {CHAT_SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          className="chip"
          style={{ padding: "0.4rem 0.7rem" }}
          onClick={() => onPick(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
