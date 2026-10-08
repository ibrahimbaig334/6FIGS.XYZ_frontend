"use client";

/* The house clock: the board's still mark (a drawn ×) with the lamp's slow
   brass arc. Loading reads as deliberate, not stuck. */
export default function Loader({ label }: { label?: string }) {
  return (
    <div className="loader-wrap" role="status" aria-label={label ?? "Loading"}>
      <div className="loader-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 5 L19 19" />
          <path d="M19 5 L5 19" />
        </svg>
        <span className="loader-ring" />
      </div>
      {label && <p className="label">{label}</p>}
    </div>
  );
}
