"use client";

import { useState } from "react";
import { ChatMessage, extractTickers, GameState, Profile } from "../lib/api";
import { useChatScroll } from "../lib/useChatScroll";
import { MSG_MAX_LEN } from "../lib/constants";
import { clampGraphemes } from "../lib/validate";
import TokenCard from "./TokenCard";
import ChatSuggestions from "./ChatSuggestions";
import EmojiPicker from "./EmojiPicker";

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Indices of the winning row, or empty when the game is not decided. */
function winCells(board: string): Set<number> {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] !== "." && board[a] === board[b] && board[b] === board[c])
      return new Set(line);
  }
  return new Set();
}

function mark(m: string | undefined) {
  return m === "O" ? "○" : "×";
}

function statusLine(game: GameState): string {
  if (game.status === "draw") return "DRAW — NOBODY BLINKED";
  if (game.status === "done") return `${game.winner} WINS`;
  return game.turn === game.youAre ? "YOUR TURN" : "OPPONENT'S TURN";
}

/**
 * The one and only game surface — random matchmaking and private rooms both
 * render this exact panel. The host page owns data (socket, history) and passes
 * callbacks; the panel owns the board, chat input, suggestions and emoji.
 * `header`/`waiting` are mode-specific slots (room name, "waiting for peer").
 */
export default function GamePanel({
  game,
  me,
  msgs,
  oppOnline,
  onMove,
  onRematch,
  onSend,
  header,
  waiting,
  rematchPending,
}: {
  game: GameState | null;
  me: Profile | null;
  msgs: ChatMessage[];
  oppOnline: boolean;
  onMove: (i: number) => void;
  onRematch: () => void;
  onSend: (body: string) => void;
  header?: React.ReactNode;
  waiting?: React.ReactNode;
  rematchPending?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const chatRef = useChatScroll(msgs.length);
  const won =
    game && game.status === "done" ? winCells(game.board) : new Set<number>();
  const oppMark = game ? (game.youAre === "X" ? "O" : "X") : undefined;
  // Opponent away mid-game (tab closed, elsewhere): the DATA persists (they
  // may return and resume) but the VIEW resets to waiting — no ghost turns,
  // no active highlights, frozen board. Finished games still show the result.
  const oppAway = !!game && game.status === "open" && !oppOnline;

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    onSend(body);
  }

  return (
    <div className="layout-game game-panel">
      <div className="game-main">
        {header}
        {game ? (
          <>
            <div className="arena-head">
              <div
                className={`seat${game.turn === game.youAre && game.status === "open" && !oppAway ? " active" : ""}`}
              >
                <span className="seat-mark">{mark(game.youAre)}</span>
                <span>
                  <span className="seat-role">YOU</span>
                  <span className="seat-name">{me?.handle ?? "YOU"}</span>
                </span>
              </div>
              <span className="arena-vs">VS</span>
              <div
                className={`seat${game.turn !== game.youAre && game.status === "open" && !oppAway ? " active" : ""}`}
              >
                <span>
                  <span className="seat-role">
                    <span className={oppOnline ? "dot on" : "dot"} /> OPPONENT
                  </span>
                  <span className="seat-name">
                    {oppAway
                      ? "WAITING…"
                      : (game.opponent?.handle ?? "WAITING…")}
                  </span>
                </span>
                <span className="seat-mark">{mark(oppMark)}</span>
              </div>
            </div>

            <p className="arena-status">
              <span className="mono-label">
                {oppAway ? "WAITING FOR OPPONENT" : statusLine(game)}
              </span>
              {game.status !== "open" && (
                <button
                  className="btn-solid btn-sm"
                  onClick={onRematch}
                  disabled={!!rematchPending}
                >
                  {rematchPending ? "OFFER SENT…" : "REMATCH ↺"}
                </button>
              )}
            </p>

            <div className="board-frame">
              <div className="board">
                {game.board.split("").map((cell, i) => (
                  <button
                    key={i}
                    className={`board-cell${won.has(i) ? " win" : ""}`}
                    onClick={() => onMove(i)}
                    disabled={cell !== "." || game.status !== "open" || oppAway}
                    aria-label={`cell ${i + 1}`}
                    style={{
                      color: cell === "O" ? "var(--crimson)" : "var(--ink)",
                    }}
                  >
                    {cell === "." ? "" : mark(cell)}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="board-frame board-idle">
            {waiting ?? <p className="fine">Waiting for your 1v1 peer…</p>}
          </div>
        )}
      </div>

      <aside className="card game-chat">
        <p className="mono-label">TABLE TALK — $TICKERS UNFURL</p>
        <ol className="chat-log" ref={chatRef}>
          {msgs.length === 0 && (
            <li className="msg sys">Say hi — type $BTC to unfurl a card.</li>
          )}
          {msgs.map((m) => (
            <li key={m.id} className={m.senderId === me?.id ? "msg me" : "msg"}>
              <strong>{m.senderHandle}:</strong> {m.body}
              {extractTickers(m.body).map((t) => (
                <TokenCard key={t} symbol={t} />
              ))}
            </li>
          ))}
        </ol>
        <ChatSuggestions
          onPick={(t) =>
            setDraft((d) => clampGraphemes(d ? `${d} ${t}` : t, MSG_MAX_LEN))
          }
        />
        <form onSubmit={send} className="chat-send">
          <input
            className="field"
            value={draft}
            onChange={(e) =>
              setDraft(clampGraphemes(e.target.value, MSG_MAX_LEN))
            }
            placeholder="$BTC thoughts?"
          />
          <EmojiPicker
            onPick={(e) => setDraft((d) => clampGraphemes(d + e, MSG_MAX_LEN))}
          />
          <button
            className="btn-solid"
            style={{ padding: "0.7rem" }}
            type="submit"
          >
            SEND
          </button>
        </form>
      </aside>
    </div>
  );
}
