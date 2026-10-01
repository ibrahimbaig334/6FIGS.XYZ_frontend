"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom dropdown (native <select> option hover can't be styled —
 * this uses the same gold-hover language as the profile dropdown).
 */
export default function SelectMenu({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="field"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        style={{
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
        }}
        onClick={() => setOpen(!open)}
      >
        <span>{current?.label ?? value}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div
          className="dropdown"
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "105%",
            background: "var(--paper)",
            border: "2px solid var(--ink)",
            boxShadow: "4px 4px 0 var(--shadow)",
            zIndex: 40,
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.value === value ? "✓ " : ""}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
