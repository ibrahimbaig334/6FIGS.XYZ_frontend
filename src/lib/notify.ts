"use client";

/** Name of the window event carrying a global error-toast message. */
export const ERROR_EVENT = "sixfigs-error";

/**
 * Show a transient failure in the global top-left error box (10s + ✕).
 * This is the ONLY place action/load errors surface — pages keep just live
 * field validation and full-page gate states inline.
 */
export function notifyError(message: string) {
  if (typeof window === "undefined" || !message) return;
  window.dispatchEvent(
    new CustomEvent<string>(ERROR_EVENT, { detail: message }),
  );
}
