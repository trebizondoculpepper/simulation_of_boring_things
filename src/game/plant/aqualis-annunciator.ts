import type { AlarmId } from './aqualis-types';
import { trioAlarms } from './aqualis-world';
import type { TrioPool, Trios } from './aqualis-world';

/**
 * The Trios' windows for their rooms' annunciators (mission 114,
 * `doc/plans/114/placement.md`, "Alarms, mimics and both control rooms";
 * decisions 9 and 10), as pure data and the logic that lights them, ready
 * for the boards to take: the Lounge's grows from 16 windows to 24, the
 * Olympic's from 24 to 30. Not yet on the boards (their views and their
 * window lists are the annunciator step's); each board's chlorine and pH
 * windows are to read the Trio's analyser (`trioWater`), so a frozen
 * sample hides the drift, as on real plant. Pure.
 */

export type TrioWindowId =
  | 'controller-fault'
  | 'sample-flow-low'
  | 'dosing-inhibit'
  | 'dosing-offline'
  | 'combined-high'
  | 'water-balance';

/** Each window's engraving, two short lines, as the boards' others. */
export const TRIO_WINDOW_TEXT: Record<TrioWindowId, string> = {
  'controller-fault': 'DOSING CTRL\nFAULT',
  'sample-flow-low': 'SAMPLE FLOW\nLOW',
  'dosing-inhibit': 'DOSING\nINHIBITED',
  'dosing-offline': 'DOSING\nOFF-LINE',
  'combined-high': 'COMBINED Cl\nHIGH',
  'water-balance': 'WATER\nBALANCE',
};

/**
 * The windows each board gains: the Lounge's six (and two spares to make
 * its 24), the Olympic's five (its DOSING INHIBITED it has already, to be
 * rebound to the Trio's inhibit; CONTROLLER FAULT in its old spare).
 */
export const TRIO_WINDOWS: Record<TrioPool, readonly TrioWindowId[]> = {
  pool_01: [
    'controller-fault',
    'sample-flow-low',
    'dosing-inhibit',
    'dosing-offline',
    'combined-high',
    'water-balance',
  ],
  pool_02: [
    'controller-fault',
    'sample-flow-low',
    'dosing-offline',
    'combined-high',
    'water-balance',
  ],
};

/** Which of its alarm contacts light each window. */
const FROM: Record<Exclude<TrioWindowId, 'dosing-inhibit'>, AlarmId[]> = {
  'controller-fault': ['controller-fault'],
  'sample-flow-low': ['sample-flow-low'],
  'dosing-offline': ['dosing-offline'],
  'combined-high': ['combined-high'],
  'water-balance': ['balance-aggressive', 'balance-scaling'],
};

/**
 * The Trio's windows present now, from its alarm contacts (none while its
 * computer is down, unless its watchdog has tripped: CONTROLLER FAULT) and
 * its inhibit (DOSING INHIBITED, while its software runs and holds every
 * output off: OFF, the sample lost, a First Aid pause).
 */
export function trioWindows(trios: Trios, pool: TrioPool): TrioWindowId[] {
  const t = trios[pool];
  const on = new Set(trioAlarms(t).map((a) => a.id));
  const lit = (Object.keys(FROM) as (keyof typeof FROM)[]).filter((w) =>
    FROM[w].some((id) => on.has(id)),
  );
  const inhibited =
    t.os.phase === 'running' &&
    (t.selector === 'off' ||
      (t.inhibit !== null && t.inhibit !== 'no-readings'));
  const out: TrioWindowId[] = [...lit];
  if (inhibited) out.push('dosing-inhibit');
  // DOSING INHIBITED is the Olympic's own window already, rebound to this.
  return out.filter(
    (w) => w === 'dosing-inhibit' || TRIO_WINDOWS[pool].includes(w),
  );
}

/** The water as the Trio's analyser reads it, for the boards' chlorine and pH windows (decision 10). */
export function trioWater(
  trios: Trios,
  pool: TrioPool,
): { freeChlorine: number; ph: number } {
  const r = trios[pool].readings;
  return { freeChlorine: r.freeChlorine, ph: r.ph };
}
