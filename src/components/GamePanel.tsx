"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ChatMessage, extractTickers, GameState, Profile } from "../lib/api";
import { useChatScroll } from "../lib/useChatScroll";
import { MSG_MAX_LEN } from "../lib/constants";
import { clampGraphemes } from "../lib/validate";
import TokenCard from "./TokenCard";
import ChatSuggestions from "./ChatSuggestions";
import EmojiPicker from "./EmojiPicker";
import Chop from "./Chop";

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

// SVG centers for cells (0..8) in a 0-300 grid.
function cellXY(i: number): [number, number] {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return [50 + c * 100, 50 + r * 100];
}

/** The win line: from the first winning cell's center to the last's. */
function winLine(board: string): [number, number][] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] !== "." && board[a] === board[b] && board[b] === board[c])
      return [cellXY(a), cellXY(c)];
  }
  return null;
}

function statusLine(game: GameState): string {
  if (game.status === "draw") return "Draw. Nobody blinked.";
  if (game.status === "done") return `${game.winner} takes the table.`;
  return game.turn === game.youAre ? "Your move." : "Their move.";
}

function Mark({ cell, index }: { cell: string; index: number }) {
  if (cell === ".") return null;
  if (cell === "X")
    return (
      <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5 L19 19" />
        <path d="M19 5 L5 19" />
      </svg>
    );
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
    </svg>
  );
}

/**
 * The one and only game surface: random matchmaking and private rooms both
 * render this exact panel. The host page owns data (socket, history) and
 * passes callbacks; the panel owns the board, chat input, suggestions and
 * emoji. `header` and `waiting` are mode-specific slots.
 *
 * The handshake: when a fresh board arrives (a match just made), the table
 * assembles - the frame sets, the grid draws itself, the two place cards
 * slide in, the lamp turns to the move. A rematch re-runs it.
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
  const boardRef = useRef<HTMLDivElement>(null);
  const assembledRef = useRef<string | null>(null);

  const won =
    game && game.status === "done" ? winCells(game.board) : new Set<number>();
  const line = game && game.status === "done" ? winLine(game.board) : null;
  const oppMark = game ? (game.youAre === "X" ? "O" : "X") : undefined;
  // Opponent away mid-game (tab closed, elsewhere): the DATA persists (they
  // may return and resume) but the VIEW resets to waiting. No ghost turns,
  // no active highlights, frozen board. Finished games still show the result.
  const oppAway = !!game && game.status === "open" && !oppOnline;
  const fresh =
    !!game &&
    game.status === "open" &&
    !game.board.includes("X") &&
    !game.board.includes("O");

  // The handshake: a fresh board assembles the table once. Mid-game loads
  // and settled games render the state as-is - no ceremony.
  useEffect(() => {
    if (!game || !fresh) return;
    if (assembledRef.current === game.id) return;
    assembledRef.current = game.id;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = boardRef.current;
    if (!frame) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".table-frame",
        { opacity: 0, scale: 0.985, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55 },
      )
        .fromTo(
          ".board-lines line.grid",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.55, stagger: 0.09 },
          "-=0.22",
        )
        .fromTo(
          ".seat-card",
          { opacity: 0, x: (i: number) => (i === 0 ? -20 : 20) },
          { opacity: 1, x: 0, duration: 0.55, stagger: 0.13 },
          "-=0.3",
        )
        .fromTo(
          ".lamp-pool",
          { opacity: 0 },
          { opacity: 1, duration: 0.65 },
          "-=0.25",
        );
    }, frame);
    return () => {
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, fresh]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    onSend(body);
  }

  return (
    <div className="game-grid" ref={boardRef}>
      <div className="plate game-main">
        {header}
        {game ? (
          <>
            <div className="arena-head">
              <div
                className={`seat-card${game.turn === game.youAre && game.status === "open" && !oppAway ? " seat-on" : ""}`}
              >
                <span className="seat-id">
                  {me && <Chop id={me.id} size="sm" />}
                  <span>
                    <span className="seat-role">You</span>
                    <span className="seat-name">{me?.handle ?? "You"}</span>
                  </span>
                </span>
                <span className="seat-mark" aria-hidden="true">
                  {game.youAre}
                </span>
              </div>
              <span className="arena-vs" aria-hidden="true">
                vs
              </span>
              <div
                className={`seat-card${game.turn !== game.youAre && game.status === "open" && !oppAway ? " seat-on" : ""}`}
              >
                <span className="seat-id">
                  {game.opponent && <Chop id={game.opponent.id} size="sm" />}
                  <span>
                    <span className="seat-role">
                      <span className={oppOnline ? "dot on" : "dot"} />
                      Stranger
                    </span>
                    <span className="seat-name">
                      {oppAway ? "away" : (game.opponent?.handle ?? "waiting")}
                    </span>
                  </span>
                </span>
                <span className="seat-mark" aria-hidden="true">
                  {oppMark}
                </span>
              </div>
            </div>

            <div className="arena-status">
              <p className="fine" style={{ margin: 0, fontSize: "0.84rem" }}>
                {oppAway ? "Waiting for your stranger." : statusLine(game)}
              </p>
              {game.status !== "open" && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onRematch}
                  disabled={!!rematchPending}
                >
                  {rematchPending ? "Offer sent" : "Rematch"}
                </button>
              )}
            </div>

            <div className="board-frame">
              <div className="table-frame">
                <div className="board-grid">
                  <svg
                    className="board-lines"
                    viewBox="0 0 300 300"
                    aria-hidden="true"
                  >
                    {[
                      [100, 8, 100, 292],
                      [200, 8, 200, 292],
                      [8, 100, 292, 100],
                      [8, 200, 292, 200],
                    ].map(([x1, y1, x2, y2], i) => (
                      <line
                        key={i}
                        className="grid"
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        pathLength={1}
                        strokeDasharray={1}
                        strokeDashoffset={fresh ? 1 : 0}
                      />
                    ))}
                    {line && (
                      <line
                        className="win-line"
                        x1={line[0][0]}
                        y1={line[0][1]}
                        x2={line[1][0]}
                        y2={line[1][1]}
                        pathLength={1}
                        strokeDasharray={1}
                      />
                    )}
                  </svg>
                  <div className="board-cells">
                    {game.board.split("").map((cell, i) => (
                      <button
                        key={i}
                        className={`board-cell${won.has(i) ? " win" : ""}${cell === "O" ? " mark-o" : ""}`}
                        onClick={() => onMove(i)}
                        disabled={
                          cell !== "." || game.status !== "open" || oppAway
                        }
                        aria-label={`square ${i + 1}`}
                      >
                        <Mark cell={cell} index={i} />
                      </button>
                    ))}
                  </div>
                  <div className="lamp-pool" aria-hidden="true" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="board-idle">
            {waiting ?? <p className="fine">Waiting for your stranger.</p>}
          </div>
        )}
      </div>

      <aside className="plate game-chat">
        <p className="label">Table talk</p>
        <ol className="chat-log" ref={chatRef}>
          {msgs.length === 0 && (
            <li className="msg sys">Say hello. Type $BTC to unfurl a card.</li>
          )}
          {msgs.map((m) => (
            <li key={m.id} className={m.senderId === me?.id ? "msg me" : "msg"}>
              <span className="who">{m.senderHandle}</span>
              <span className="body">{m.body}</span>
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
            placeholder="Say something, or $BTC"
            aria-label="Message"
          />
          <EmojiPicker
            onPick={(e) => setDraft((d) => clampGraphemes(d + e, MSG_MAX_LEN))}
          />
          <button className="btn btn-primary" type="submit">
            Send
          </button>
        </form>
      </aside>
    </div>
  );
}
