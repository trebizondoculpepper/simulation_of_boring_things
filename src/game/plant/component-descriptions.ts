import type { MotorTag } from './motor-starters';
import type { PoolId } from './pools';
import { equipmentKind } from './equipment-kinds';
import type { KindId, StatusPolicy } from './equipment-kinds';
import { endpointLabel } from './valve-endpoints';
import type { ValveEnds } from './valve-endpoints';

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
 * A rare authored purpose replaces the inferred one; with neither, there is
 * no description, never a generic filler. Pure: live status comes in
 * through the context (`component-status.ts` reads it from the world).
 */

/** Where in the world an item's live state is kept, for its status. */
export type StatusBinding =
  | { motor: MotorTag }
  | { motors: readonly MotorTag[] }
  | { pool: PoolId }
  | { wetHallTank: 'breakTank' | 'backwashTank' }
  | { booster: true }
  | { cabinet: 'jacuzzi' }
  | { part: string };

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
  | { policy: 'switch'; on: boolean };

/** What a description is built from: one per described component. */
export interface DescribedSubject {
  /** Its stable key: its asset id, or its tag where it has none. */
  key: string;
  tag: string;
  kind: KindId;
  /** Its room's code as printed (PL2); none for a thing not in a room. */
  location?: string;
  /** A valve's ends. */
  ends?: ValveEnds;
  /** An isolator's destination: "the jacuzzi plant room". */
  powerFor?: string;
  /** A rare authored description, in place of the inferred one. */
  purpose?: string;
  /** Where its live state is kept. */
  status?: StatusBinding;
  /** Left out of the ordinals: a room, which is not equipment in a room. */
  unranked?: boolean;
}

/** What a description may know beyond its subject: the world's state now. */
export interface DescriptionContext {
  status?(subject: DescribedSubject): ResolvedStatus | undefined;
}

/**
 * The live state the world keeps for particular items, by tag: instance
 * data, each naming the existing model address; the wording is the kind's.
 */
export const STATUS_BINDINGS: Readonly<Record<string, StatusBinding>> = {
  'P-101A': { motor: 'P-101A' },
  'P-101B': { motor: 'P-101B' },
  'P-201A': { motor: 'P-201A' },
  'P-201B': { motor: 'P-201B' },
  'PL1-P1': { motors: ['P-201A', 'P-201B'] },
  'PL2-P1': { motors: ['P-101A', 'P-101B'] },
  'PL1-T1': { pool: 'pool_01' },
  'PL2-T1': { pool: 'pool_02' },
  'PL3-BT1': { pool: 'pool_03' },
  'WH-T1': { wetHallTank: 'breakTank' },
  'WH-T2': { wetHallTank: 'backwashTank' },
  'WH-P1': { booster: true },
  'PL3-CAB1': { cabinet: 'jacuzzi' },
  'PL4-CAB1-SW1': { part: 'PL4-CAB1-SW1' },
};

/** Isolators named by tag with what they isolate, beyond the rooms' switch-fuses. */
export const POWER_FOR: Readonly<Record<string, string>> = {
  'SR-IS1': 'the whole leisure centre',
};

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
  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (a, b) =>
        naturalCompare(a.tag, b.tag) ||
        (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0) ||
        (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    );
    sorted.forEach((s, i) => places.set(s.key, i + 1));
  }
  return places;
}

/** A valve's description: authored, or from its ends, or none. */
export function valvePurpose(valve: {
  purpose?: string;
  ends?: ValveEnds;
}): string | undefined {
  if (valve.purpose) return valve.purpose;
  if (!valve.ends) return undefined;
  const { from, to, medium } = valve.ends;
  return `Isolates ${medium} flowing from ${endpointLabel(from)} to ${endpointLabel(to)}.`;
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
): string {
  const line = `${ordinal(place)} ${type} in ${location}`;
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
  if (subject.purpose) return subject.purpose;
  const kind = equipmentKind(subject.kind);
  const template = kind.template ?? 'equipment';
  if (template === 'valve') return valvePurpose(subject) ?? '';
  if (template === 'power' || subject.powerFor)
    return subject.powerFor ? powerPurpose(subject.powerFor) : '';
  const place = places.get(subject.key);
  if (subject.unranked || !subject.location || !place) return '';
  const status =
    kind.status === 'none'
      ? undefined
      : formatStatus(kind.status, context.status?.(subject));
  return equipmentLine(place, kind.type, subject.location, status);
}
