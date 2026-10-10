"use client";

import { useEffect, useState } from "react";
import ChopDraw from "./ChopDraw";

/* A wait with a face: the house chop drawing itself beside the true phase
   label. Used by the prove button and anywhere a flow is mid-ceremony. */
export default function BusyPhase({ label }: { label: string }) {
  return (
    <button className="btn" disabled>
      <span className="btn-mark">
        <ChopDraw size="sm" />
      </span>
      {label}
    </button>
  );
}

/* Under a long phase, the house narrates its true work on rotation — every
   line names something actually happening inside the sealed box. */
export function PhaseWhisper({ lines }: { lines: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (lines.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 2600);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <p
      className="fine"
      style={{ margin: 0, textAlign: "center" }}
      aria-live="off"
    >
      {lines[i % lines.length]}
    </p>
  );
}
