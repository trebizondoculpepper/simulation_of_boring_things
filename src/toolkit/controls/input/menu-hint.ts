const KEY = 'pool-plant:menu-hint:dev';
let shownThisPage = false;

/** Claim only when a playable room is visible, never while preparing hidden scenes. */
export function claimMenuHint(): boolean {
  if (shownThisPage) return false;
  shownThisPage = true;
  try {
    if (globalThis.localStorage?.getItem(KEY)) return false;
    globalThis.localStorage?.setItem(KEY, 'shown');
  } catch {
    // Blocked storage still gets just one hint for this page session.
  }
  return true;
}
