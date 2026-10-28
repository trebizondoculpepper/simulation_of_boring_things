import { NO_PAD, keyIntent, padIntents } from '../logic/menu-navigation';
import type { MenuIntent, PadState } from '../logic/menu-navigation';

/**
 * The one keyboard and gamepad reader for menus (mission 096): the
 * control scheme's menu bindings (`logic/menu-navigation.ts`) read once
 * for the whole app and handed to whichever menu takes them. Menus listen
 * here; none reads a key or polls a pad of its own. The newest listener is
 * asked first; one that takes an intent stops it going further (and the
 * key going to the game). While a listener is modal (a panel open over the
 * game), every other key is held back from the game as well.
 */

export type MenuSource = 'keyboard' | 'gamepad';

export interface MenuListener {
  /** Do `intent` if it means something here now; whether it was taken. */
  intent(intent: MenuIntent, from: MenuSource): boolean;
  /** Whether it holds the keys now. */
  modal?(): boolean;
}

const listeners: MenuListener[] = [];
let started = false;
/** Keys whose keydown a menu took: their keyup is held back too. */
const taken = new Set<string>();

/** Whether a key is being typed into a field, which menus leave alone. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLElement && target.isContentEditable);

const dispatch = (intent: MenuIntent, from: MenuSource) => {
  for (let i = listeners.length - 1; i >= 0; i--)
    if (listeners[i].intent(intent, from)) return true;
  return false;
};
const modal = () => listeners.some((l) => l.modal?.());

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener(
    'keydown',
    (event) => {
      if (typing(event.target)) return;
      const intent = keyIntent(event.key, event.shiftKey);
      // Esc while the pointer is captured is the browser's, to free it.
      const free = intent !== 'back' || !document.pointerLockElement;
      if (intent && free && dispatch(intent, 'keyboard')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        // Its keyup too, so a focused button (the accessible copy's) does
        // not also click on Space's release.
        taken.add(event.code);
        return;
      }
      if (modal()) event.stopImmediatePropagation();
    },
    true,
  );
  window.addEventListener(
    'keyup',
    (event) => {
      if (taken.delete(event.code)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (modal() && !typing(event.target)) event.stopImmediatePropagation();
    },
    true,
  );
  let pad: PadState = NO_PAD;
  let last = performance.now();
  const poll = (now: number) => {
    requestAnimationFrame(poll);
    const delta = Math.min(0.5, (now - last) / 1000);
    last = now;
    const gamepad =
      typeof navigator !== 'undefined' && navigator.getGamepads
        ? [...navigator.getGamepads()].find((p) => p?.mapping === 'standard')
        : undefined;
    if (!gamepad) {
      pad = NO_PAD;
      return;
    }
    const read = padIntents(
      gamepad.buttons.map((b) => b.pressed),
      gamepad.axes,
      pad,
      delta,
    );
    pad = read.state;
    for (const intent of read.intents) dispatch(intent, 'gamepad');
  };
  requestAnimationFrame(poll);
}

/** Listen for menu intents; returns a function to stop. */
export function listenMenu(listener: MenuListener): () => void {
  start();
  listeners.push(listener);
  return () => {
    const at = listeners.indexOf(listener);
    if (at >= 0) listeners.splice(at, 1);
  };
}

/** For tests and the DEV handle: deliver an intent as if from an input. */
export const sendMenuIntent = (
  intent: MenuIntent,
  from: MenuSource = 'keyboard',
) => dispatch(intent, from);
