"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { ERROR_TOAST_MS } from "../lib/constants";
import { ERROR_EVENT } from "../lib/notify";

interface Toast {
  id: number;
  message: string;
}

let nextId = 1;

/**
 * Global error toast on every page (mounted in layout, next to the
 * challenge toasts). Every transient failure lands here as a uniform note:
 * visible 10s, dismissible, stacked when several fire.
 */
export default function ErrorToast() {
  const [items, setItems] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  // Fresh list for the once-registered listener, avoids a stale closure.
  const itemsRef = useRef<Toast[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  function drop(id: number) {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  useEffect(() => {
    const map = timers.current; // stable Map instance, cleanup must use it
    const onError = (e: Event) => {
      const message = (e as CustomEvent<string>).detail;
      if (!message) return;
      // The same failure firing twice (StrictMode remount, load + poll
      // racing): never stack duplicates. Reset the visible one's 10s clock.
      const dupe = itemsRef.current.find((x) => x.message === message);
      if (dupe) {
        const t = map.get(dupe.id);
        if (t) clearTimeout(t);
        map.set(
          dupe.id,
          setTimeout(() => {
            map.delete(dupe.id);
            setItems((prev) => prev.filter((x) => x.id !== dupe.id));
          }, ERROR_TOAST_MS),
        );
        return;
      }
      const id = nextId++;
      setItems((prev) => [...prev.slice(-2), { id, message }]); // keep at most 3
      map.set(
        id,
        setTimeout(() => {
          map.delete(id);
          setItems((prev) => prev.filter((x) => x.id !== id));
        }, ERROR_TOAST_MS),
      );
    };
    window.addEventListener(ERROR_EVENT, onError);
    return () => {
      window.removeEventListener(ERROR_EVENT, onError);
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast toast-error" role="alert">
          <p>{t.message}</p>
          <button
            className="error-close"
            onClick={() => drop(t.id)}
            aria-label="Dismiss"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
