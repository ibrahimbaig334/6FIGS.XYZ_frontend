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

// Wallet cap (backend: MAX_WALLETS_PER_USER)
export const MAX_WALLETS = 20;

// Rooms one user may own (backend: MAX_ROOMS_PER_USER)
export const MAX_ROOMS_PER_USER = 3;

// Holdings-gate symbols (backend: ROOM_TOKEN_OPTIONS). Compared against the
// joiner's disclosed top assets (uppercase).
export const TOKEN_OPTIONS = [
  "BTC",
  "ETH",
  "SOL",
  "USDT",
  "USDC",
  "XRP",
  "DOGE",
  "HYPE",
] as const;

// Seat counts offered at create (backend: ROOM_MIN/MAX_MEMBERS 2–50).
export const MEMBER_OPTIONS = [2, 3, 4, 5, 10, 20, 50];
export const ROOM_MIN_MEMBERS = 2;
export const ROOM_MAX_MEMBERS = 50;

// Emoji set for room descriptions + chats (tap to insert). Curated for the
// house register: no rocket ships, no moons, no money bags.
export const CHAT_EMOJIS = [
  "♟️",
  "🎲",
  "🎯",
  "🤝",
  "👋",
  "💬",
  "🐂",
  "🐻",
  "🏆",
  "🔥",
  "⚡",
  "💎",
  "🥂",
  "😂",
  "😎",
  "🤔",
];

// Room-create punch lines, one random pick shows under the heading
export const ROOM_PUNCH_LINES = [
  "Set for two. No stakes.",
  "Your wallet got you in. Your play keeps you here.",
  "We can't see your bags. We can see your blunders.",
  "Six figures at the door. Three in a row to win.",
  "The house keeps the tier. You keep your pride.",
  "No leverage. Just Xs and Os.",
  "The felt is green. The talk is quiet.",
  "One table. Two seats. Zero excuses.",
  "Come for the verification. Stay for the table talk.",
  "Proof of bags, then proof of skill.",
  "A quiet room, a fair game.",
  "Your seed phrase stays secret. Your strategy won't.",
];
export const CHAT_SUGGESTIONS = [
  "gg",
  "Nice move.",
  "Rematch?",
  "What are you holding?",
  "wp, chat?",
  "$BTC thoughts?",
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

// A room request lives this long: the offer toast auto-hides at the mark and
// the requester cancels + sees "DIDN'T RESPOND" if nobody answered (ms).
export const REQUEST_TIMEOUT_MS = 15000;

// Global error toasts live this long (each also has an ✕ to dismiss now).
export const ERROR_TOAST_MS = 10000;

// A random-match opponent that drops mid-game gets this long to return before
// the game is closed and both sides are kicked out (ms).
export const OPP_RETURN_MS = 30000;

// Newly matched opponents get this long to OPEN the game page before the
// return countdown can trigger for a never-seen opponent (ms).
export const OPP_JOIN_GRACE_MS = 30000;

// Tier ladder (backend: common/tiers.ts). Used to hide room tiers above you.
export const TIER_ORDER = ["TIER I", "TIER II", "TIER III", "TIER IV"] as const;
export function tierRank(t: string | null | undefined): number {
  const i = TIER_ORDER.indexOf((t ?? "") as (typeof TIER_ORDER)[number]);
  return i < 0 ? 0 : i + 1;
}
