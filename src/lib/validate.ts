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
 */

export function roomNameError(v: string): string | null {
  const n = v.trim().length;
  if (n < ROOM_NAME_MIN) return `Name needs ${ROOM_NAME_MIN}+ characters`;
  if (n > ROOM_NAME_MAX)
    return `Name must be ${ROOM_NAME_MAX} characters or fewer`;
  return null;
}

export function roomDescriptionError(v: string): string | null {
  if (!v.trim()) return "Description is required";
  if (v.trim().length > ROOM_DESC_MAX)
    return `Description must be ${ROOM_DESC_MAX} characters or fewer`;
  return null;
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
