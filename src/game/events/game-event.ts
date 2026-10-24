/**
 * The game's event log (`doc/prompts/058-developer-console.md`): a line for
 * everything done to the model and everything the plant does by itself,
 * as a plant logbook would keep it. The console shows it. It is not part
 * of the world and is never saved. Pure.
 */

export type GameEventKind = 'action' | 'plant' | 'command' | 'system';
export type GameEventSeverity = 'info' | 'notice' | 'alarm';

export interface GameEvent {
  /** World seconds when it happened. */
  time: number;
  kind: GameEventKind;
  severity: GameEventSeverity;
  /** What it happened to: a tag, an id or a room; '' for none. */
  subject: string;
  text: string;
  /** Who did it, for actions: the player's hand, or the console. */
  by?: 'you' | 'console';
}

/** The lines a log keeps, newest last. */
export const EVENT_LOG_LINES = 2000;

/** `events` with `more` appended, the oldest let go past `limit`. */
export function appendEvents(
  events: readonly GameEvent[],
  more: readonly GameEvent[],
  limit = EVENT_LOG_LINES,
): readonly GameEvent[] {
  if (!more.length) return events;
  const all = [...events, ...more];
  return all.length > limit ? all.slice(all.length - limit) : all;
}

/** World seconds as a clock, `hh:mm:ss`, hours running on past 24. */
export function worldClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
}

/** One line of the log: the clock, the subject, the text, and who. */
export function formatEvent(e: GameEvent) {
  const who = e.by ? ` (by ${e.by})` : '';
  const subject = e.subject ? `${e.subject.padEnd(12)}  ` : '';
  return `${worldClock(e.time)}  ${subject}${e.text}${who}`;
}

/** The log as a text file, for `condump`: a header, then a line each. */
export function formatDump(
  events: readonly GameEvent[],
  header: readonly string[],
) {
  return [...header, '', ...events.map(formatEvent), ''].join('\n');
}
