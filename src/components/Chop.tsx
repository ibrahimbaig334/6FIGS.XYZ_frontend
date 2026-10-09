"use client";

/* The proof mark: a maker's chop derived from an identity string. Your
   identity is your proof, rendered as strokes, not pixels. Nine cells;
   each holds one chop stroke (or stays empty) chosen by a stable hash of
   the id. Deterministic, designed, no two members alike. */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const W = 2.4;
const CAP: React.CSSProperties = { strokeWidth: W, strokeLinecap: "round" };

// Stroke primitives inside one cell (0,0)-(6,6). 0 = empty.
function strokePath(kind: number): React.ReactNode {
  switch (kind) {
    case 1:
      return <path d="M0 3 H6" />;
    case 2:
      return <path d="M3 0 V6" />;
    case 3:
      return <path d="M0 0 L6 6" />;
    case 4:
      return <path d="M0 6 L6 0" />;
    case 5:
      return <path d="M0 6 V0 H6" />;
    case 6:
      return <path d="M6 0 V6 H0" />;
    case 7:
      return <circle cx="3" cy="3" r="1.3" fill="currentColor" stroke="none" />;
    default:
      return null;
  }
}

export default function Chop({
  id,
  size = "md",
  color,
}: {
  /** Stable identity string (a member id, a handle, the brand). */
  id: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Override the stroke color; defaults to currentColor. */
  color?: string;
}) {
  const cells = Array.from({ length: 9 }, (_, i) => {
    const bits = hash(`${id}#${i}`) % 10;
    return bits < 6 ? 0 : (bits % 7) + 1; // ~60% empty: a chop, not a QR
  });
  return (
    <span
      className={`chop chop-${size}`}
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 22 22" role="img" aria-hidden="true">
        <g fill="none" stroke="currentColor" style={{ ...CAP, strokeWidth: 1.6 }}>
          {cells.map((kind, i) =>
            kind === 0 ? null : (
              <g
                key={i}
                transform={`translate(${(i % 3) * 7 + 1}, ${Math.floor(i / 3) * 7 + 1})`}
              >
                {strokePath(kind)}
              </g>
            ),
          )}
        </g>
      </svg>
    </span>
  );
}

/* The brand's own chop: the numeral 6 cut straight from the house typeface
   (Bricolage Grotesque 650), so the letterform is professional artwork, not
   a hand-drawn guess. A stick on a circle reads as "d"; this is simply 6. */
export function BrandChop({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`chop chop-${size}`} aria-hidden="true">
      <svg viewBox="0 0 22 22" role="img" aria-hidden="true">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M11.60 20.50Q7.59 20.50 5.49 18.11Q3.40 15.73 3.40 11.16Q3.40 8.05 4.36 5.89Q5.33 3.73 7.13 2.62Q8.93 1.50 11.46 1.50Q12.78 1.50 13.89 1.81Q15.00 2.13 15.86 2.76Q16.72 3.39 17.28 4.37Q17.84 5.35 18.05 6.64L14.57 7.53Q14.43 6.44 13.91 5.81Q13.39 5.17 12.69 4.90Q11.98 4.63 11.25 4.63Q10.14 4.63 9.33 5.16Q8.53 5.68 8.03 6.60Q7.52 7.52 7.28 8.71Q7.04 9.89 7.04 11.21Q7.04 11.87 7.13 12.69Q7.21 13.51 7.37 14.26H7.64Q7.57 12.73 8.04 11.69Q8.51 10.65 9.31 10.02Q10.11 9.39 11.08 9.11Q12.05 8.83 12.99 8.83Q14.49 8.83 15.76 9.45Q17.04 10.07 17.82 11.31Q18.60 12.55 18.60 14.37Q18.60 15.50 18.24 16.59Q17.88 17.68 17.06 18.57Q16.23 19.46 14.89 19.98Q13.56 20.50 11.60 20.50ZM11.43 17.50Q12.28 17.50 12.91 17.26Q13.54 17.03 13.98 16.61Q14.43 16.19 14.65 15.64Q14.87 15.09 14.87 14.44Q14.87 13.49 14.43 12.82Q14.00 12.15 13.29 11.80Q12.59 11.45 11.71 11.45Q10.75 11.45 9.97 11.87Q9.19 12.29 8.73 13.04Q8.28 13.78 8.28 14.78Q8.28 15.57 8.55 16.09Q8.82 16.61 9.28 16.92Q9.74 17.24 10.31 17.37Q10.87 17.50 11.43 17.50Z"
        />
      </svg>
    </span>
  );
}
