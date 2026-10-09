"use client";

/* The house signs its mark while you wait: the 6 draws itself in one
   flowing stroke, a breath of hold, and again. Waiting reads as ceremony —
   the chop being cut — instead of a spinner going nowhere. Static under
   reduced motion. */
export default function ChopDraw({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`chop chop-${size} chop-draw`} aria-hidden="true">
      <svg viewBox="0 0 22 22">
        <path
          className="draw-mark"
          d="M10.5 3 C8 3.5, 6 5.5, 5.3 8.5 C4.4 12.5, 5.5 17.5, 9.2 19.6 C12.5 21.3, 16.2 19.6, 16.5 16.2 C16.7 13.5, 14.2 11.5, 11 11.5 C9 11.5, 7.2 12.3, 6.2 13.5"
        />
      </svg>
    </span>
  );
}
