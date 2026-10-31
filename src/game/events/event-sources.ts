import type { World } from '../world';
import type { GameEvent } from './game-event';
import { watcherEvents } from './watchers';
import { valveEvents } from './valve-events';

/**
 * Where the log's lines about the plant come from: a short list of event
 * sources, each comparing the world before and after a step or an action
 * and adding a line for each change it sees. A new kind of event (pumps
 * starting and stopping, alarms) is a new source added to the list. Pure.
 */

/** What made a change, when the world knows: an action's hand; none for a step. */
export interface EventCause {
  /** Who did it: the player's hand ('you'), or the console. */
  by?: 'you' | 'console';
}

/**
 * A source: what changed from `before` to `after`, pushed onto `out`.
 * It runs every step, so it allocates nothing when nothing changed.
 */
export type EventSource = (
  before: World,
  after: World,
  cause: EventCause | undefined,
  out: GameEvent[],
) => void;

/** Every source, in the order their lines are logged. */
export const EVENT_SOURCES: readonly EventSource[] = [
  watcherEvents,
  valveEvents,
];

/** What changed from `before` to `after`, a line each, from every source. */
export function diffWorld(
  before: World,
  after: World,
  cause?: EventCause,
): GameEvent[] {
  const found: GameEvent[] = [];
  collectEvents(before, after, cause, found);
  return found;
}

/** As `diffWorld`, onto `out`: for each step, nothing allocated when nothing changed. */
export function collectEvents(
  before: World,
  after: World,
  cause: EventCause | undefined,
  out: GameEvent[],
) {
  if (before === after) return;
  for (const source of EVENT_SOURCES) source(before, after, cause, out);
}
