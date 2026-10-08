"use client";

/**
 * Rematch offer toast: Accept resets the board for both players, Decline
 * tells the offerer. Rendered by the game pages when a `rematchOffer`
 * arrives for the open game.
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
    <div className="toast-stack" role="alert">
      <div className="toast toast-challenge">
        <span>
          <strong>{fromHandle}</strong> wants a rematch
        </span>
        <span className="toast-actions">
          <button className="btn btn-primary btn-sm" onClick={onAccept}>
            Accept
          </button>
          <button className="btn-ghost btn-sm" onClick={onDecline}>
            Decline
          </button>
        </span>
      </div>
    </div>
  );
}
