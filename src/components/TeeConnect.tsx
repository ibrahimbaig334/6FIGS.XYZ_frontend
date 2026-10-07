"use client";

import { useCallback, useState } from "react";
import type { Profile } from "../lib/api";
import TeeProve from "./TeeProve";

/**
 * Drop-in wallet entry button (replaces the old signature-login button).
 * Press → the attested connect flow runs (selection popup opens by
 * itself) → session + tier land together. Same look, zero addresses leave
 * the browser: the backend only ever sees one-way nullifiers.
 */
export default function TeeConnect({
  onDone,
  label,
}: {
  onDone: (p?: Profile) => void;
  label?: string;
}) {
  const [active, setActive] = useState(false);

  const done = useCallback(
    (p: Profile) => {
      setActive(false);
      onDone(p);
    },
    [onDone],
  );

  if (active) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <button className="btn-solid" disabled>
          CONNECTING…
        </button>
        <TeeProve
          mode="establish"
          sessionless
          onDone={done}
          onDismiss={() => setActive(false)}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        alignItems: "center",
      }}
    >
      <button className="btn-solid" onClick={() => setActive(true)}>
        {label ?? "CONNECT WALLET"}
      </button>
    </div>
  );
}
