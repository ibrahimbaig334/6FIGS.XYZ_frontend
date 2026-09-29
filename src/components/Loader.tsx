"use client";

/** Uniform app loader: 6FIGS mark with a gold rotation ring, centered. */
export default function Loader({ label }: { label?: string }) {
  return (
    <div className="loader-wrap" role="status" aria-label={label ?? "Loading"}>
      <div className="loader-mark" aria-hidden="true">
        <span className="loader-six">6</span>
        <span className="loader-ring" />
      </div>
      {label && <p className="mono-label">{label}</p>}
    </div>
  );
}
