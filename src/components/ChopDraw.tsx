"use client";

/* The house signs its mark while you wait: the 6's tail draws first, then
   the bowl, a breath of hold, and again. Waiting reads as ceremony — the
   chop being cut — instead of a spinner going nowhere. Static under
   reduced motion. */
export default function ChopDraw({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`chop chop-${size} chop-draw`} aria-hidden="true">
      <svg viewBox="0 0 22 22">
        <path
          className="draw-tail"
          d="M13.9 9 C14.3 5.5, 12.2 2.7, 8.9 2.7"
        />
        <circle className="draw-bowl" cx="11" cy="14.5" r="6" />
      </svg>
    </span>
  );
}
