"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, CaretUp, Check } from "@phosphor-icons/react";

/** Custom dropdown: native option hover can't be styled, so this uses the
 *  house menu (hairline panel, card hover) for every select. */
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
        <span aria-hidden="true">
          {open ? <CaretUp size={12} /> : <CaretDown size={12} />}
        </span>
      </button>
      {open && (
        <div className="menu" role="listbox" style={{ top: "106%" }}>
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span style={{ width: "1rem", flex: "none", display: "inline-grid" }}>
                {o.value === value && <Check size={12} aria-hidden="true" />}
              </span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
