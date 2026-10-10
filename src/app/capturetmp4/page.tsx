"use client";

// TEMPORARY capture harness — the real attestation flow diagram SVG.
import { FlowDiagram } from "../docs/components/diagrams";

export default function CaptureFlow() {
  return (
    <div style={{ padding: "26px 30px", background: "var(--paper)" }}>
      <FlowDiagram />
    </div>
  );
}
