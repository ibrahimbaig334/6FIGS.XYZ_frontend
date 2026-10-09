"use client";

import { useEffect, useState } from "react";
import ChopDraw from "./ChopDraw";

/* The house signs its mark while the page loads. An explicit label is the
   page's own voice ("Walking the floor"); without one, the house whispers a
   rotating line so the wait feels attended, never stuck. */
const WHISPERS = [
  "Lighting the lamp.",
  "Warming your seat.",
  "Reading balances inside the sealed box.",
  "Shuffling the deck.",
  "Forgetting addresses as it goes.",
  "Checking the door.",
  "Signing nothing but the tier.",
  "Dealing you in.",
];

export default function Loader({ label }: { label?: string }) {
  const [whisper, setWhisper] = useState(0);
  useEffect(() => {
    if (label) return;
    const t = setInterval(
      () => setWhisper((w) => (w + 1) % WHISPERS.length),
      2400,
    );
    return () => clearInterval(t);
  }, [label]);
  return (
    <div className="loader-wrap" role="status" aria-label={label ?? "Loading"}>
      <div className="loader-mark" aria-hidden="true">
        <ChopDraw size="lg" />
      </div>
      {label ? (
        <p className="label">{label}</p>
      ) : (
        <p className="label loader-whisper" aria-hidden="true">
          {WHISPERS[whisper]}
        </p>
      )}
    </div>
  );
}
