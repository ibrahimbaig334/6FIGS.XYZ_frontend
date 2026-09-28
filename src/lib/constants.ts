"use client";

/**
 * Frontend tunables — change here and the whole app follows. Backend rules
 * they mirror (lengths, regex) are duplicated from backend/src/common/constants.ts
 * — keep the two files in sync (no shared package yet).
 */

// Validation mirrors (backend: rooms.service, profile.service)
export const ROOM_NAME_MIN = 3;
export const ROOM_NAME_MAX = 48;
export const ROOM_DESC_MAX = 160;
export const INVITE_CODE_MIN = 4;
export const HANDLE_PATTERN = /^[a-zA-Z0-9_.]{3,24}$/;
export const MSG_MAX_LEN = 240;

// Pagination
export const ROOMS_PAGE_SIZE = 20;
export const FRIENDS_PAGE_SIZE = 10;

// Chat recommendations (tap-to-fill)
export const CHAT_SUGGESTIONS = [
  "gg!",
  "Nice move!",
  "Rematch?",
  "$BTC to the moon",
  "What are you holding?",
  "wp, chat?",
];

// Polling / redirect timers (ms)
export const POLL_ROOM_MS = 2500;
export const POLL_GAME_LIVE_MS = 3000;
export const POLL_REQUESTS_MS = 4000;
export const POLL_FRIENDS_MS = 5000;
export const POLL_QUEUE_MS = 2000;
export const JOIN_REDIRECT_MS = 1800;
export const OPP_GONE_REDIRECT_MS = 3000;
export const ROOM_GONE_REDIRECT_MS = 3500;
