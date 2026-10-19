/**
 * Browsers refuse a new pointer lock for a moment after Esc releases one
 * (Chrome for about a second). A refusal then says nothing about whether
 * the page may capture the mouse at all, so the next click should try
 * again; only a refusal well clear of a release means capture is not
 * allowed here, and looking falls back to dragging.
 */
export const RELOCK_COOLDOWN_MS = 2000;

/** Whether a lock refused `sinceRelease` ms after the last release means capture is unavailable. */
export function lockUnavailable(sinceRelease: number) {
  return sinceRelease > RELOCK_COOLDOWN_MS;
}
