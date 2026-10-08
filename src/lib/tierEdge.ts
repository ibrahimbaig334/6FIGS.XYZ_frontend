/* Tier edge classes: plain, brass, gilt, the house's own.
   Plain module (no client directive) so server components can import it. */

export function tierEdgeClass(tier: string | null | undefined): string {
  switch (tier) {
    case "TIER I":
      return "t1";
    case "TIER II":
      return "t2";
    case "TIER III":
      return "t3";
    case "TIER IV":
      return "t4";
    default:
      return "none";
  }
}
