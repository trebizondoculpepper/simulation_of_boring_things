/**
 * Menu navigation, part of the one control scheme (mission 096; the owner,
 * 2026-10-28: "We absolutely need to support touch, mouse, gamepad, and
 * keyboard"). Every menu panel is worked the same way on every input:
 *
 * - Keyboard: arrows move the focus between controls by where they stand
 *   (on a knob or selector, Left and Right turn it a step instead); Tab
 *   and Shift-Tab cycle it in reading order; Enter or Space press; Esc
 *   backs out (and, in a room, opens the settings panel).
 * - Gamepad: the d-pad or left stick moves the focus; A presses; B backs
 *   out; LB and RB turn the focused knob; Start opens and closes the
 *   settings panel.
 * - Mouse and touch: the panel's parts are clicked or tapped directly.
 *
 * Pure: what each input means, and where the focus goes.
 */

export type MenuIntent =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'next'
  | 'previous'
  | 'activate'
  | 'back'
  | 'turnDown'
  | 'turnUp'
  | 'toggle';

/** A control the focus can rest on: where it stands (x right, y down) and how it works. */
export interface MenuTarget {
  id: string;
  x: number;
  y: number;
  /** A knob or selector turns; anything else is pressed. */
  turns?: boolean;
}

/** What a key means to a menu, or null. */
export function keyIntent(key: string, shift = false): MenuIntent | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    case 'Tab':
      return shift ? 'previous' : 'next';
    case 'Enter':
    case ' ':
      return 'activate';
    case 'Escape':
      return 'back';
    case 'PageDown':
    case '-':
      return 'turnDown';
    case 'PageUp':
    case '+':
    case '=':
      return 'turnUp';
    default:
      return null;
  }
}

/** The standard gamepad's buttons a menu answers to. */
export const MENU_PAD = {
  activate: 0,
  back: 1,
  turnDown: 4,
  turnUp: 5,
  toggle: 9,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
} as const satisfies Partial<Record<MenuIntent, number>>;

/** How far the stick must lean to move the focus, and how long before it repeats, seconds. */
export const STICK_LEAN = 0.6;
export const STICK_REPEAT = 0.35;

export interface PadState {
  held: ReadonlySet<number>;
  /** The stick's direction last seen, and how long until it repeats. */
  stick: MenuIntent | null;
  repeatIn: number;
}

export const NO_PAD: PadState = { held: new Set(), stick: null, repeatIn: 0 };

/**
 * A gamepad's reading, `delta` seconds after the last, as menu intents:
 * each button once as it goes down, and the left stick as a direction
 * once as it leans and again every `STICK_REPEAT` while it is held.
 */
export function padIntents(
  pressed: readonly boolean[],
  axes: readonly number[],
  state: PadState,
  delta: number,
): { intents: MenuIntent[]; state: PadState } {
  const intents: MenuIntent[] = [];
  const held = new Set<number>();
  for (const [intent, button] of Object.entries(MENU_PAD) as [
    MenuIntent,
    number,
  ][]) {
    if (!pressed[button]) continue;
    held.add(button);
    if (!state.held.has(button)) intents.push(intent);
  }
  const [x = 0, y = 0] = axes;
  const stick: MenuIntent | null =
    Math.max(Math.abs(x), Math.abs(y)) < STICK_LEAN
      ? null
      : Math.abs(x) > Math.abs(y)
        ? x > 0
          ? 'right'
          : 'left'
        : y > 0
          ? 'down'
          : 'up';
  let repeatIn = state.repeatIn - delta;
  if (stick && (stick !== state.stick || repeatIn <= 0)) {
    intents.push(stick);
    repeatIn = STICK_REPEAT;
  }
  return { intents, state: { held, stick, repeatIn } };
}

/**
 * The focus moved from `current` in a direction: to the nearest control
 * that way, its distance along the direction counted once and across it
 * twice, so the focus keeps to its row or column. Stays put if there is
 * none that way; with no focus yet, goes to the first in reading order.
 */
export function moveFocus(
  targets: readonly MenuTarget[],
  current: string | null,
  direction: 'up' | 'down' | 'left' | 'right',
): string | null {
  const from = targets.find((t) => t.id === current);
  if (!from) return readingOrder(targets)[0]?.id ?? null;
  const [ax, ay] =
    direction === 'left'
      ? [-1, 0]
      : direction === 'right'
        ? [1, 0]
        : direction === 'up'
          ? [0, -1]
          : [0, 1];
  let best: MenuTarget | null = null;
  let bestScore = Infinity;
  for (const t of targets) {
    if (t === from) continue;
    const dx = t.x - from.x;
    const dy = t.y - from.y;
    const along = dx * ax + dy * ay;
    if (along <= 1e-9) continue;
    const across = Math.abs(dx * ay - dy * ax);
    const score = along + 2 * across;
    if (score < bestScore) [best, bestScore] = [t, score];
  }
  return best?.id ?? from.id;
}

/** The controls in reading order: by rows (within a small tolerance), then left to right. */
export function readingOrder(
  targets: readonly MenuTarget[],
  tolerance = 0.01,
): MenuTarget[] {
  return [...targets].sort((a, b) =>
    Math.abs(a.y - b.y) > tolerance ? a.y - b.y : a.x - b.x,
  );
}

/** The focus cycled `by` steps in reading order, round and round. */
export function cycleFocus(
  targets: readonly MenuTarget[],
  current: string | null,
  by: 1 | -1,
): string | null {
  const order = readingOrder(targets);
  if (!order.length) return null;
  const at = order.findIndex((t) => t.id === current);
  if (at < 0) return (by > 0 ? order[0] : order.at(-1)!).id;
  return order[(at + by + order.length) % order.length].id;
}

/**
 * What an intent does to a panel's focus: a new focus, a turn of the
 * focused control, a press of it, or backing out. Left and Right turn a
 * focused knob or selector rather than moving off it (as arrows move a
 * slider); Up and Down and Tab still move.
 */
export type MenuStep =
  | { kind: 'focus'; id: string | null }
  | { kind: 'turn'; id: string; by: -1 | 1 }
  | { kind: 'press'; id: string }
  | { kind: 'back' }
  | { kind: 'none' };

export function menuStep(
  targets: readonly MenuTarget[],
  current: string | null,
  intent: MenuIntent,
): MenuStep {
  const focused = targets.find((t) => t.id === current);
  switch (intent) {
    case 'back':
      return { kind: 'back' };
    case 'next':
    case 'previous':
      return {
        kind: 'focus',
        id: cycleFocus(targets, current, intent === 'next' ? 1 : -1),
      };
    case 'turnDown':
    case 'turnUp':
      return focused?.turns
        ? { kind: 'turn', id: focused.id, by: intent === 'turnUp' ? 1 : -1 }
        : { kind: 'none' };
    case 'left':
    case 'right':
      if (focused?.turns)
        return {
          kind: 'turn',
          id: focused.id,
          by: intent === 'right' ? 1 : -1,
        };
      return { kind: 'focus', id: moveFocus(targets, current, intent) };
    case 'up':
    case 'down':
      return { kind: 'focus', id: moveFocus(targets, current, intent) };
    case 'activate':
      if (!focused)
        return { kind: 'focus', id: readingOrder(targets)[0]?.id ?? null };
      return focused.turns
        ? { kind: 'turn', id: focused.id, by: 1 }
        : { kind: 'press', id: focused.id };
    default:
      return { kind: 'none' };
  }
}
