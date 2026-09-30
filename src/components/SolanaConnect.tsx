"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./SolanaConnectInner"), {
  ssr: false,
  loading: () => (
    <button className="btn-solid" disabled>
      CONNECT WALLET ↗
    </button>
  ),
});

/** Client-only wrapper (wallet adapters touch window — never SSR this). */
export default function SolanaConnect({ onDone }: { onDone: () => void }) {
  return <Inner onDone={onDone} />;
}
