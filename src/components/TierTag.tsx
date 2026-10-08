"use client";

import { tierEdgeClass } from "../lib/tierEdge";

/* The tier as the card's edge: plain, brass, gilt, the house's own.
   The quietest flex - visible only at an angle, like the real thing. */
export default function TierTag({ tier }: { tier: string | null }) {
  return <span className={`tier-tag ${tierEdgeClass(tier)}`}>{tier ?? "Unverified"}</span>;
}
