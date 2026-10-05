"use client";

/**
 * Rematch offer toast (top-right, challenge-toast look): ACCEPT resets the
 * board for both players, DECLINE tells the offerer. Rendered by the game
 * pages when a `rematchOffer` arrives for the open game.
 */
export default function RematchToast({
  fromHandle,
  onAccept,
  onDecline,
}: {
  fromHandle: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="offer-stack" role="alert">
      <div className="challenge-toast">
        <span>
          <strong>{fromHandle}</strong> wants a rematch
        </span>
        <span className="toast-actions">
          <button className="btn-solid btn-sm" onClick={onAccept}>
            ACCEPT
          </button>
          <button className="btn-ghost btn-sm" onClick={onDecline}>
            DECLINE
          </button>
        </span>
      </div>
    </div>
  );
}
