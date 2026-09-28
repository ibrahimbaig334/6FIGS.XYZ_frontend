"use client";

import { useEffect, useRef } from "react";

/**
 * Chat auto-scroll: follows new messages while the user is near the bottom.
 * Reading history up top never yanks the viewport; sending (which happens at
 * the bottom) always lands on the new message.
 */
export function useChatScroll(count: number) {
  const ref = useRef<HTMLOListElement | null>(null);
  const nearBottom = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      nearBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [count]);

  return ref;
}
