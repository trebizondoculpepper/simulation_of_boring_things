import type { World } from '../world';
import type { GameEvent } from './game-event';
import type { EventCause, EventSource } from './event-sources';
import { INSTALLED_VALVES } from '../plant/installed-valves';
import { MODEL_VALVES } from '../plant/model-valves';
import { LOUNGE_VALVES } from '../plant/lounge-valves';
import { FILTER_VALVES } from '../plant/wash-o-tron';
import { walkIdentified } from '../plant/identification';

/**
 * Every valve opening or closing, as the log has it (the owner,
 * 2026-10-31): found by comparing the world's valves before and after
 * each step and each action, so a valve is logged however it moved, by
 * hand, by the console, by a controller or by its actuator's spring.
 * Each says its tag and name, OPENED or CLOSED, and who did it where the
 * world knows. A valve with an actuator (the lounge's) is logged by its
 * travel: once as it leaves an end, once as it reaches the other.
 * Cheap: a step that leaves the valves' records alone costs a reference
 * comparison each, and only a change allocates. Pure.
 */

interface ValveLabel {
  tag: string;
  name: string;
  normal: boolean;
}

/** Each valve the world keeps in `installedValves`, by its key there. */
const LABELS = new Map<string, ValveLabel>();
for (const [key, v] of Object.entries(INSTALLED_VALVES))
  LABELS.set(v.assetId, {
    tag: v.tag,
    name: key.split('|')[2] ?? v.tag,
    normal: v.normal === 'open',
  });
// The model's valves kept there too: the chemical distribution's.
for (const v of MODEL_VALVES)
  if (!LABELS.has(v.id))
    LABELS.set(v.id, {
      tag: v.tag || v.id,
      name: v.name,
      normal: v.normal === 'open',
    });

/** The actuated valves, whose travel the world keeps beside their command. */
const ACTUATED = new Set(LOUNGE_VALVES.map((v) => v.assetId));
const ACTUATED_IDS = LOUNGE_VALVES.map((v) => v.assetId);

/** The Olympic's filters' valves the Wash-O-Tron drives: asset id to filter. */
const WASHED = new Map<string, number>();
for (let n = 0; n < 5; n++)
  for (const v of FILTER_VALVES) {
    const found = Object.values(INSTALLED_VALVES).find(
      (x) => x.tag === `PL2-F${n + 1}-${v}`,
    );
    if (found) WASHED.set(found.assetId, n);
  }

/** Ends of travel: the position indicator's (`component-status.ts`). */
const SHUT_BELOW = 0.02;
const OPEN_ABOVE = 0.98;
type Travel = 'shut' | 'moving' | 'open';
const travelOf = (x: number): Travel =>
  x <= SHUT_BELOW ? 'shut' : x >= OPEN_ABOVE ? 'open' : 'moving';

const line = (
  after: World,
  label: { tag: string; name: string },
  text: string,
  by: string | undefined,
): GameEvent => ({
  time: after.time,
  kind: 'plant',
  severity: 'info',
  subject: label.tag,
  text: `${label.name}: ${text}`,
  ...(by ? { by } : {}),
});

/** Who changed an installed valve in a step: the controller that drives it, or AUTO. */
function automation(after: World, id: string): string {
  const n = WASHED.get(id);
  if (n !== undefined) {
    const wot = after.washOTron;
    return wot.washing === n
      ? 'AUTO, Wash-O-Tron wash'
      : 'Wash-O-Tron, at its mode keys';
  }
  return 'AUTO';
}

/** The installed valves' records: each plain valve's change, each actuated one's command. */
function installed(
  before: World,
  after: World,
  cause: EventCause | undefined,
  out: GameEvent[],
) {
  const was = before.installedValves;
  const now = after.installedValves;
  if (was === now) return;
  for (const id in now) {
    const label = LABELS.get(id);
    const normal = label?.normal ?? true;
    const open = now[id] ?? normal;
    if ((was[id] ?? normal) === open) continue;
    const by = cause?.by ?? automation(after, id);
    const named = label ?? { tag: id, name: id };
    // An actuated valve's command: its travel follows, and is logged as it goes.
    if (ACTUATED.has(id))
      out.push(
        line(after, named, open ? 'OPEN commanded' : 'SHUT commanded', by),
      );
    else out.push(line(after, named, open ? 'OPENED' : 'CLOSED', by));
  }
}

/** The actuated valves' travel: once leaving an end, once reaching one. */
function travel(before: World, after: World, out: GameEvent[]) {
  const was = before.loungeValvePositions;
  const now = after.loungeValvePositions;
  if (was === now) return;
  for (const id of ACTUATED_IDS) {
    const label = LABELS.get(id)!;
    const rest = label.normal ? 1 : 0;
    const a = was[id] ?? rest;
    const b = now[id] ?? rest;
    if (a === b) continue;
    const from = travelOf(a);
    const to = travelOf(b);
    if (from === to) continue;
    // Moving against its command: sprung shut, its actuator unpowered.
    const commanded = after.installedValves[id] ?? label.normal;
    const sprung = b < a && commanded;
    const by = sprung ? 'spring return, actuator unpowered' : 'its actuator';
    const text =
      to === 'open'
        ? 'OPENED'
        : to === 'shut'
          ? 'CLOSED'
          : b > a
            ? 'opening'
            : 'closing';
    out.push(line(after, label, text, by));
  }
}

/** The identified plant's valves, which only actions move. */
function identified(
  before: World,
  after: World,
  cause: EventCause | undefined,
  out: GameEvent[],
) {
  if (before.identifiedPlant === after.identifiedPlant) return;
  const open = (p: { state: unknown }) =>
    (p.state as { open?: unknown } | undefined)?.open === true;
  const was = new Map<string, boolean>();
  for (const p of walkIdentified(before.identifiedPlant))
    if (p.kind === 'valve') was.set(p.id, open(p));
  for (const p of walkIdentified(after.identifiedPlant)) {
    if (p.kind !== 'valve') continue;
    const now = open(p);
    const prior = was.get(p.id);
    if (prior === undefined || prior === now) continue;
    out.push(
      line(
        after,
        { tag: p.id, name: p.name },
        now ? 'OPENED' : 'CLOSED',
        cause?.by ?? 'AUTO',
      ),
    );
  }
}

/** Every valve's change of state from `before` to `after`. */
export const valveEvents: EventSource = (before, after, cause, out) => {
  installed(before, after, cause, out);
  travel(before, after, out);
  identified(before, after, cause, out);
};
