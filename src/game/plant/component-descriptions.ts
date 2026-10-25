import { GAS_ZONES } from './gas';
import type { GasZoneId } from './gas';
import { MOTORS, POOL_MOTORS } from './motor-starters';
import type { MotorTag } from './motor-starters';
import { POOL_IDS } from './pools';
import type { PoolId } from './pools';
import { equipmentKind } from './equipment-kinds';
import type { KindId, StatusPolicy } from './equipment-kinds';

/**
 * What each component is for, inferred rather than written item by item
 * (prompt 060; the owner, 2026-10-25: "Most of the time purpose should be
 * inferred"). One description for the information overlay, the inventory
 * (and the printed manual) and the console's `status`:
 *
 * - a valve: "Isolates <medium> flowing from <source> to <destination>.";
 * - an isolator: "Isolates power for <destination>.";
 * - anything else: "<Nth> <type> in <room>, currently <status>", the
 *   status only where the world keeps it for that item.
 *
 * Everything is derived from the game's model, nothing written item by
 * item (the owner, 2026-10-25: "Everything has to derive from the actual
 * game model … derived algorithmically"): a valve's route is its link in
 * its room's enhanced network (the plumber's expanded port graph), so a
 * valve in a room not yet built through the plumber has no description;
 * an item's live status is found from its kind and its room. Where nothing
 * is known there is no description, never a generic filler. Pure: live
 * status comes in through the context (`component-status.ts`).
 */

/** Where in the world an item's live state is kept, for its status. */
export type StatusBinding =
  | { motor: MotorTag }
  | { motors: readonly MotorTag[] }
  | { pool: PoolId }
  | { wetHallTank: 'breakTank' | 'backwashTank' }
  | { booster: true }
  | { cabinet: 'jacuzzi' }
  | { part: string }
  /** A valve, by its tag. */
  | { valve: string }
  /** A gas detector, by its room's gas zone. */
  | { gasZone: GasZoneId }
  /** A UV unit, by its pool. */
  | { uv: PoolId };

/** An item's live state, resolved from the world, ready for its kind's wording. */
export type ResolvedStatus =
  | { policy: 'motor'; running: boolean; tripped: boolean }
  | { policy: 'level'; fraction: number }
  | {
      policy: 'pump-set';
      pumps: readonly { tag: string; running: boolean; tripped: boolean }[];
    }
  | {
      policy: 'cabinet';
      state: 'tripped' | 'circulating' | 'no-flow' | 'off' | 'no-power';
    }
  | { policy: 'booster'; running: boolean; tripped: boolean }
  | { policy: 'switch'; on: boolean }
  | { policy: 'valve'; open: boolean; partly?: true }
  | { policy: 'gas'; shown: string }
  | { policy: 'uv'; lit: boolean };

/** What a valve's link in its room's enhanced network says it isolates, in a description's words. */
export interface ValveRoute {
  from: string;
  to: string;
  medium: 'water' | 'heating water' | 'air' | 'gas';
}

/** What a description is built from: one per described component. */
export interface DescribedSubject {
  /** Its stable key: its asset id, or its tag where it has none. */
  key: string;
  tag: string;
  kind: KindId;
  /** Its room's code as printed (PL2); none for a thing not in a room. */
  location?: string;
  /** Its room, as the game knows it (plant_pool_02). */
  room?: string;
  /** A valve's route, from its room's enhanced network. */
  route?: ValveRoute;
  /** An isolator's destination, from its register: "the jacuzzi plant room". */
  powerFor?: string;
  /** Left out of the ordinals: a room, which is not equipment in a room. */
  unranked?: boolean;
}

/** What a description may know beyond its subject: the world's state now. */
export interface DescriptionContext {
  status?(subject: DescribedSubject): ResolvedStatus | undefined;
}

/** The pool a pool plant room serves (plant_pool_02 → pool_02), if any. */
const poolOfRoom = (room: string | undefined): PoolId | undefined => {
  const pool = room?.replace(/^plant_/, '');
  return POOL_IDS.find((p) => p === pool);
};

const isMotor = (tag: string): tag is MotorTag => Object.hasOwn(MOTORS, tag);

/**
 * Where the world keeps an item's live state, found from its kind, its room
 * and its tag, never listed item by item: a pump by its own starter, a pump
 * set by its pool's, a balance tank by its pool, the wet hall's tanks and
 * booster set by the wet hall, the jacuzzi's cabinet by the jacuzzi, a
 * model switch by its own part.
 */
export function statusBindingFor(subject: {
  tag: string;
  kind: KindId;
  room?: string;
}): StatusBinding | undefined {
  const pool = poolOfRoom(subject.room);
  switch (subject.kind) {
    case 'pump':
      return isMotor(subject.tag) ? { motor: subject.tag } : undefined;
    case 'pump-pair': {
      const motors = pool ? POOL_MOTORS(pool) : [];
      return motors.length ? { motors } : undefined;
    }
    case 'balance-tank':
      return pool ? { pool } : undefined;
    case 'break-tank':
      return { wetHallTank: 'breakTank' };
    case 'backwash-tank':
      return { wetHallTank: 'backwashTank' };
    case 'booster-set':
      return { booster: true };
    case 'jacuzzi-pack':
      return { cabinet: 'jacuzzi' };
    case 'butterfly-valve':
    case 'gas-ball-valve':
    case 'valve':
      return { valve: subject.tag };
    case 'uv-unit':
      return pool ? { uv: pool } : undefined;
    case 'ozone-monitor':
      return subject.room && subject.room in GAS_ZONES
        ? { gasZone: subject.room as GasZoneId }
        : undefined;
    case 'cabinet-switch':
      return { part: subject.tag };
    default:
      return undefined;
  }
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 101st. */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ??
        'th');
  return `${n}${suffix}`;
}

/**
 * Tags in natural order, each run of digits compared as a number (P2
 * before P10), letters as letters (A before B).
 */
export function naturalCompare(a: string, b: string): number {
  const split = (s: string) => s.match(/\d+|\D+/g) ?? [];
  const x = split(a);
  const y = split(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const p = x[i];
    const q = y[i];
    if (p === q) continue;
    const pn = /^\d/.test(p);
    const qn = /^\d/.test(q);
    if (pn && qn && Number(p) !== Number(q)) return Number(p) - Number(q);
    return p < q ? -1 : 1;
  }
  return x.length - y.length;
}

/**
 * Each subject's place among its room's items of the same kind, from 1,
 * in natural tag order, ties broken by key: the "1st" of "1st Pump in PL2".
 * Rooms and things outside a room are not ranked.
 */
export function placesByKind(
  subjects: readonly DescribedSubject[],
): Map<string, number> {
  const groups = new Map<string, DescribedSubject[]>();
  for (const s of subjects) {
    if (s.unranked || !s.location) continue;
    const group = `${s.location}|${s.kind}`;
    groups.set(group, [...(groups.get(group) ?? []), s]);
  }
  const places = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (a, b) =>
        naturalCompare(a.tag, b.tag) ||
        (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0) ||
        (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    );
    sorted.forEach((s, i) => {
      places.set(s.key, i + 1);
      counts.set(s.key, sorted.length);
    });
  }
  ofKind.set(places, counts);
  return places;
}

/** How many of each subject's kind its room has, by the places map they were ranked in. */
const ofKind = new WeakMap<ReadonlyMap<string, number>, Map<string, number>>();

/** A valve's description, from its route in the enhanced network, or none. */
export function valvePurpose(
  route: ValveRoute | undefined,
): string | undefined {
  if (!route) return undefined;
  return `Isolates ${route.medium} flowing from ${route.from} to ${route.to}.`;
}

/** An isolator's description. */
export const powerPurpose = (destination: string) =>
  `Isolates power for ${destination}.`;

/** Any other equipment's description; the status clause only with a status. */
export function equipmentLine(
  place: number,
  type: string,
  location: string,
  status?: string,
  /** How many of its kind its room has: one alone is "the only" (the owner, 2026-10-25). */
  of?: number,
): string {
  const line =
    of === 1
      ? `The only ${type} in ${location}`
      : `${ordinal(place)} ${type} in ${location}`;
  return status ? `${line}, currently ${status}` : line;
}

const onOff = (on: boolean) => (on ? 'On' : 'Off');

/** A resolved state in its kind's words, or none where the two do not match. */
export function formatStatus(
  policy: StatusPolicy,
  resolved: ResolvedStatus | undefined,
): string | undefined {
  if (!resolved || resolved.policy !== policy) return undefined;
  switch (resolved.policy) {
    case 'motor':
    case 'booster':
      return resolved.tripped ? 'Tripped' : onOff(resolved.running);
    case 'level': {
      const share = Math.min(1, Math.max(0, resolved.fraction));
      return `${Math.round(share * 100)} % full`;
    }
    case 'pump-set':
      return resolved.pumps
        .map((p) => `${p.tag} ${p.tripped ? 'Tripped' : onOff(p.running)}`)
        .join(', ');
    case 'cabinet':
      return {
        tripped: 'Tripped',
        circulating: 'Circulating',
        'no-flow': 'Running, no flow',
        off: 'Off',
        'no-power': 'Off, no power',
      }[resolved.state];
    case 'switch':
      return onOff(resolved.on);
    case 'uv':
      // On or Off: no fault is modelled, so never operational, tripped or
      // faulty (the owner, 2026-10-25: those words only for things that can fail).
      return onOff(resolved.lit);
    case 'gas':
      // As its detector's display shows it: ppm, or O-R over its range.
      return resolved.shown === 'O-R'
        ? 'reading over its range (O-R)'
        : `reading ${resolved.shown} ppm`;
  }
}

/**
 * A component's description, or '' where nothing is known of its purpose
 * (an item with no ends recorded, a room): never a generic filler.
 */
export function describeComponent(
  subject: DescribedSubject,
  places: ReadonlyMap<string, number>,
  context: DescriptionContext = {},
): string {
  const kind = equipmentKind(subject.kind);
  const template = kind.template ?? 'equipment';
  if (template === 'valve') {
    // What it isolates, and whether it is open now (the owner, 2026-10-25:
    // a thing that can be in several states says which).
    const purpose = valvePurpose(subject.route) ?? '';
    const state = context.status?.(subject);
    const now =
      state?.policy === 'valve'
        ? `Currently ${state.partly ? 'part open' : state.open ? 'open' : 'shut'}.`
        : '';
    return [purpose, now].filter(Boolean).join(' ');
  }
  if (template === 'power' || subject.powerFor)
    return subject.powerFor ? powerPurpose(subject.powerFor) : '';
  const place = places.get(subject.key);
  if (subject.unranked || !subject.location || !place) return '';
  const status =
    kind.status === 'none'
      ? undefined
      : formatStatus(kind.status, context.status?.(subject));
  return equipmentLine(
    place,
    kind.type,
    subject.location,
    status,
    ofKind.get(places)?.get(subject.key),
  );
}
