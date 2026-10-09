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

/* The brand's own chop: a 6 drawn in two chop strokes — the tail, hooking
   left off the bowl's upper edge the way a written 6 does, and the bowl. */
export function BrandChop({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`chop chop-${size}`} aria-hidden="true">
      <svg viewBox="0 0 22 22" role="img" aria-hidden="true">
        <g
          fill="none"
          stroke="currentColor"
          style={{ strokeWidth: 2.2, strokeLinecap: "round" }}
        >
          <path d="M13.9 9 C14.3 5.5, 12.2 2.7, 8.9 2.7" />
          <circle cx="11" cy="14.5" r="6" />
        </g>
      </svg>
    </span>
  );
}
