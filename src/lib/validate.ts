"use client";

import {
  HANDLE_PATTERN,
  INVITE_CODE_MIN,
  ROOM_DESC_MAX,
  ROOM_NAME_MAX,
  ROOM_NAME_MIN,
} from "./constants";

/**
 * Client-side mirrors of the backend validation rules (rooms.service,
 * profile.service). Invalid input shows an inline error and NEVER hits
 * the backend; the server still enforces everything (defense in depth).
 *
 * Lengths are counted in GRAPHEMES (user-perceived characters via
 * Intl.Segmenter) — an emoji counts as 1, not 2 UTF-16 units — so the
 * 160/48 limits behave the same whether you type or use the emoji picker
 * (which appends via setState and bypasses the input's maxLength).
 */
function graphemeCount(v: string): number {
  try {
    const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(seg.segment(v)).length;
  } catch {
    return Array.from(v).length; // ancient browsers: code points (close enough)
  }
}

export function roomNameError(v: string): string | null {
  const n = graphemeCount(v.trim());
  if (n < ROOM_NAME_MIN) return `Name needs ${ROOM_NAME_MIN}+ characters`;
  if (n > ROOM_NAME_MAX)
    return `Name must be ${ROOM_NAME_MAX} characters or fewer`;
  return null;
}

export function roomDescriptionError(v: string): string | null {
  if (!v.trim()) return "Description is required";
  if (graphemeCount(v.trim()) > ROOM_DESC_MAX)
    return `Description must be ${ROOM_DESC_MAX} characters or fewer`;
  return null;
}

/**
 * Soft cap for inputs (typing + emoji-picker appends both stop at the limit).
 * Submit-time validation above stays as the backstop.
 */
export function clampGraphemes(v: string, n: number): string {
  try {
    const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
    const parts = Array.from(seg.segment(v), (p) => p.segment);
    return parts.length > n ? parts.slice(0, n).join("") : v;
  } catch {
    return v;
  }
}

export function inviteCodeError(v: string): string | null {
  if (v.trim().length < INVITE_CODE_MIN)
    return `Invite code needs ${INVITE_CODE_MIN}+ characters`;
  return null;
}

export function handleError(v: string): string | null {
  const h = v.trim();
  if (!h) return null; // empty clears the handle (backend sets null)
  if (!HANDLE_PATTERN.test(h))
    return "Handle: 3–24 chars, letters/numbers/._ only";
  return null;
}
