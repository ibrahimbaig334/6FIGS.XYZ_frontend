"use client";

import { useAppKitState } from "@reown/appkit/react";

/**
 * Focus scrim behind AppKit's wallet picker. AppKit appends its modal to
 * <body> at z-index 9999; this sits just beneath it (9000, above our dialogs
 * at 50) and blurs/dims the page so attention stays on the picker.
 * pointer-events:none, so picker clicks — and our CANCEL beneath — pass
 * through untouched. Rendered only while the picker is open.
 */
export default function PickerScrim() {
  const { open } = useAppKitState();
  if (!open) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(8, 8, 10, 0.45)",
        backdropFilter: "blur(6px) brightness(0.85)",
        WebkitBackdropFilter: "blur(6px) brightness(0.85)",
        pointerEvents: "none",
      }}
    />
  );
}
