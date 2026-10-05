"use client";

import dynamic from "next/dynamic";
import type { Profile } from "../lib/api";

const Inner = dynamic(() => import("./SolanaConnectInner"), {
  ssr: false,
  loading: () => (
    <button className="btn-solid" disabled>
      CONNECT WALLET ↗
    </button>
  ),
});

/** Client-only wrapper (wallet adapters touch window — never SSR this).
 *  onDone receives the profile from the login response (undefined on
 *  already-signed-in paths — callers fall back to their own load).
 *  Connect failures land in the global error box, never inline.
 *  label overrides the trigger text (e.g. "CONNECT MORE WALLETS"). */
export default function SolanaConnect({
  onDone,
  label,
}: {
  onDone: (p?: Profile) => void;
  label?: string;
}) {
  return <Inner onDone={onDone} label={label} />;
}
