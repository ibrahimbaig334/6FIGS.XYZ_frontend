"use client";

// TEMPORARY capture harness — renders the real product components with
// representative data so the promo video can use authentic UI. Deleted after
// screenshots are taken; not part of the app.
import GamePanel from "../../components/GamePanel";
import type { ChatMessage, GameState, Profile } from "../../lib/api";

const game: GameState = {
  id: "g1",
  matchId: "m_9f3a2b",
  board: "XX.OO....",
  turn: "X",
  status: "open",
  winner: null,
  youAre: "X",
  oppId: "u2",
  opponent: { id: "u2", handle: "SatoshiJnr", visMode: "VISIBLE" },
};

const me = {
  id: "u1",
  handle: "0xWhale",
  email: null,
  emailVerified: true,
  visMode: "VISIBLE",
  tags: [],
  eligibility: {
    source: "tee",
    tier: "TIER III",
    tierId: 3,
    portfolioBand: "500k-1m",
    topAssets: ["SOL", "BTC", "HYPE"],
    wallets: [],
    walletCount: 3,
    verifiedAt: new Date().toISOString(),
    expiresAt: "",
    stale: false,
    verified: true,
  },
  wallets: [],
} as unknown as Profile;

const msgs: ChatMessage[] = [
  {
    id: "1",
    scope: "dm",
    scopeId: "m",
    senderId: "u2",
    senderHandle: "SatoshiJnr",
    body: "gg!",
    createdAt: "",
  },
  {
    id: "2",
    scope: "dm",
    scopeId: "m",
    senderId: "u1",
    senderHandle: "0xWhale",
    body: "what are you holding?",
    createdAt: "",
  },
  {
    id: "3",
    scope: "dm",
    scopeId: "m",
    senderId: "u2",
    senderHandle: "SatoshiJnr",
    body: "HYPE, SOL, and a long BTC",
    createdAt: "",
  },
];

export default function Capture() {
  return (
    <section className="page-enter game-page" style={{ padding: "1.6rem 5vw" }}>
      <div className="game-topbar">
        <span className="tier-badge">LIVE · TURN X</span>
        <button className="btn-ghost btn-sm">EXIT ✕</button>
        <span className="tier-badge" style={{ marginLeft: "auto" }}>
          YOU · TIER III
        </span>
      </div>
      <GamePanel
        game={game}
        me={me}
        msgs={msgs}
        oppOnline={true}
        onMove={() => {}}
        onRematch={() => {}}
        onSend={() => {}}
        header={<p className="mono-label">RANDOM MATCH · 9F3A2B</p>}
      />
    </section>
  );
}
