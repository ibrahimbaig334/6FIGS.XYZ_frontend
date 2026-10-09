"use client";

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
