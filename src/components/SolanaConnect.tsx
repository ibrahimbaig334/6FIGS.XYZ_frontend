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
 *  hideError suppresses the inline connect error (e.g. navbar).
 *  label overrides the trigger text (e.g. "CONNECT MORE WALLETS"). */
export default function SolanaConnect({
  onDone,
  hideError,
  label,
}: {
  onDone: (p?: Profile) => void;
  hideError?: boolean;
  label?: string;
}) {
  return <Inner onDone={onDone} hideError={hideError} label={label} />;
}
