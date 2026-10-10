"use client";

/* The house signs its mark while you wait: the tail arc draws first, then
   the bowl, a breath of hold, and again. Waiting reads as ceremony — the
   chop being cut — instead of a spinner going nowhere. Static under
   reduced motion. */
const TAIL = "M14.33 9.45 A5.7 5.7 0 0 0 8.7 2.9";
const BOWL = "M16.02 11.3 A5.8 5.8 0 1 1 12.01 8.49";

export default function ChopDraw({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`chop chop-${size} chop-draw`} aria-hidden="true">
      <svg viewBox="0 0 22 22">
        <path className="draw-tail" d={TAIL} />
        <path className="draw-bowl" d={BOWL} />
      </svg>
    </span>
  );
}
