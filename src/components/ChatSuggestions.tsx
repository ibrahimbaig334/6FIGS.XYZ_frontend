"use client";

import { CHAT_SUGGESTIONS } from "../lib/constants";

/** Tap-to-fill suggestions above the chat input. */
export default function ChatSuggestions({
  onPick,
}: {
  onPick: (text: string) => void;
}) {
  return (
    <div className="suggestions" aria-label="Suggested messages">
      {CHAT_SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          className="chip chip-sm"
          onClick={() => onPick(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
