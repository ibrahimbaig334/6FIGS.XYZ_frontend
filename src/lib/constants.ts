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

// Emoji set for room descriptions + chats (tap to insert)
export const CHAT_EMOJIS = [
  "🚀",
  "🌙",
  "💎",
  "🔥",
  "⚡",
  "🎯",
  "💰",
  "🐂",
  "🐻",
  "🏆",
  "🎲",
  "♟️",
  "⚽",
  "🎮",
  "💬",
  "👑",
  "💯",
  "✨",
  "🎉",
  "👋",
  "🤝",
  "😂",
  "😎",
  "🤔",
];

// Room-create punch lines — one random pick shows under the heading
export const ROOM_PUNCH_LINES = [
  "No balances. No mercy. Just tic-tac-toe.",
  "Proof of bags, then proof of skill.",
  "Six figures to enter. Three in a row to win.",
  "Your wallet got you in. Your brain keeps you here.",
  "Zero knowledge. Full contact tic-tac-toe.",
  "Whales only. Egos optional.",
  "We can't see your bags. We can see your blunders.",
  "HODL the room. Win the game.",
  "Paper hands can't click this fast.",
  "The only chart here goes X, O, X.",
  "Bear market? Never met her. Play.",
  "Your seed phrase stays secret. Your strategy won't.",
  "Gas fees can't stop tic-tac-toe.",
  "Diamond hands, trigger fingers.",
  "No leverage. Just Xs and Os.",
  "Touch grass? Touch a winning row.",
  "Confirmed in one block. Won in three moves.",
  "The mempool is slow. This game isn't.",
  "Stake your pride, not your stack.",
  "Slippage-free since day one.",
  "Built for holders. Won by thinkers.",
  "Orange coin, red game, golden plays.",
  "Private keys, public humiliation.",
  "Frontrun this: × ○ ×.",
  "Verify your bags, then wreck your friends.",
  "Not financial advice. Just financial warfare.",
  "Your portfolio is private. Your defeat won't be.",
  "One room. Two seats. Zero excuses.",
  "Come for the verification. Stay for the victory.",
  "Your net worth unlocked the door. Now kick it down.",
];
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
