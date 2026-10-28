import {
  acceptLocationAlarms,
  newLocationAnnunciator,
  resetLocationAlarms,
  senseLocationAlarms,
} from './location-annunciator';
import type { LocationAnnunciatorState } from './location-annunciator';
import { FILTER_SPEC, solveHall2 } from './museum-2-clean-water';
import { filterSizing } from './ideal-filter';
import { actOnHall3 } from './museum-3-dosing';
import { NOMINAL } from '../../toolkit/components/plant/logic/dosing-controller';
import {
  DRIFTED_AE1,
  NUDGED_AT,
  STRAINER_RATE,
  STUCK_AT,
  WINDOWS,
  actOnHall9Plant,
  hall9Alarms,
  newHall9Plant,
  stepHall9Plant,
  waterAsSolved,
} from './museum-9-plant';
import type { Hall9PlantAction, Hall9State } from './museum-9-plant';

/**
 * Hall 9's faults (107e): ten real pool-plant failures, each done to the
 * joined model only through its own inputs, each showing itself on the
 * plant's own instruments and annunciator, each cleared only by its fix at
 * its machine. And the hall round the plant: the annunciator's state (ISA
 * sequence M with first-out, `location-annunciator.ts`, read from this
 * hall's instruments, not the world's), the fault pedestal (a random
 * fault, never the last one again; or the attendant's choice on the key
 * switch), and the scoreboard (the fault's number, plant time to the
 * first ACCEPT and to put right, this visit's best). Pure.
 */

export const FAULTS = [
  { n: 1, id: 'strainer', name: 'Blocked strainer', where: 'ST1' },
  { n: 2, id: 'backwash', name: 'Filter needs a backwash', where: 'F1' },
  { n: 3, id: 'overload', name: 'Pump overload trip', where: 'P1 starter' },
  { n: 4, id: 'stuck', name: 'Stuck valve', where: 'F1-V2' },
  { n: 5, id: 'actuator', name: 'Heating valve failed shut', where: 'HX1-V2' },
  {
    n: 6,
    id: 'lockout',
    name: 'Boiler lockout on low gas',
    where: 'GS1-V1, B1',
  },
  { n: 7, id: 'empty', name: 'Out of chemical', where: 'DT1' },
  { n: 8, id: 'gaslock', name: 'Gas-locked pump', where: 'DP1' },
  { n: 9, id: 'sample', name: 'Sample flow fail', where: 'SC1-V2' },
  { n: 10, id: 'probe', name: 'Drifted chlorine probe', where: 'DC1' },
] as const;
export type FaultNo = (typeof FAULTS)[number]['n'];

/** The bed's dirt at which PDI1 reads 0.9 bar in service (fault 2), kg. */
export const BACKWASH_DIRT = (() => {
  const ref = filterSizing(FILTER_SPEC).dirtRef;
  const s = newHall9Plant(0);
  for (let k = 1; k < 2000; k++) {
    const dirt = (k / 50) * ref;
    const w = waterAsSolved({
      ...s,
      water: { ...s.water, bed: { ...s.water.bed, dirt } },
    });
    if (solveHall2(w).gauge['filter.pdi'] >= 0.9) return dirt;
  }
  return 40 * ref;
})();

/** Cause fault `n`: only the model's inputs change. */
export function causeFault(s: Hall9State, n: FaultNo): Hall9State {
  switch (n) {
    case 1:
      return { ...s, strainerRate: STRAINER_RATE.blocked };
    case 2:
      return {
        ...s,
        water: { ...s.water, bed: { ...s.water.bed, dirt: BACKWASH_DIRT } },
      };
    case 3:
      return { ...s, starter: { ...s.starter, tripped: true } };
    case 4:
      return {
        ...s,
        stuck: true,
        water: {
          ...s.water,
          opening: { ...s.water.opening, 'filter.outlet.iso': STUCK_AT },
        },
      };
    case 5:
      return { ...s, actuatorFailed: true, override: false };
    case 6:
      return {
        ...s,
        heat: {
          ...s.heat,
          opening: { ...s.heat.opening, 'gas.ecv': NUDGED_AT },
        },
      };
    case 7:
      return {
        ...s,
        chem: {
          ...s.chem,
          tanks: {
            ...s.chem.tanks,
            hypochlorite: { ...s.chem.tanks.hypochlorite, litres: 0 },
          },
        },
      };
    case 8:
      return { ...s, chem: actOnHall3(s.chem, { type: 'air' }) };
    case 9:
      return { ...s, needleBlocked: true };
    case 10:
      return {
        ...s,
        chem: {
          ...s.chem,
          cell: {
            ...s.chem.cell,
            probes: { ...s.chem.cell.probes, ...DRIFTED_AE1 },
          },
        },
      };
  }
}

/** Whether fault `n`'s cause has gone: true only once its fix is done. */
export function faultCleared(s: Hall9State, n: FaultNo): boolean {
  switch (n) {
    case 1:
      return s.strainer < 0.2 && s.strainerRate === STRAINER_RATE.normal;
    case 2:
      return s.water.bed.dirt < BACKWASH_DIRT * 0.4;
    case 3:
      return !s.starter.tripped;
    case 4:
      return !s.stuck;
    case 5:
      return !s.actuatorFailed;
    case 6:
      return (
        s.heat.opening['gas.ecv'] >= 0.999 && s.heat.boiler.lockout === null
      );
    case 7:
      return (
        s.chem.tanks.hypochlorite.litres >= 6 &&
        s.chem.pumps.hypochlorite.fault === null
      );
    case 8:
      return !s.chem.airFault;
    case 9:
      return !s.needleBlocked;
    case 10:
      return (
        Math.abs(
          s.chem.controller.cal.free.slopeUa /
            (NOMINAL.chlorineUa * s.chem.cell.probes.freeSensitivity) -
            1,
        ) < 0.15
      );
  }
}

/** A random fault, never the last one again; `r` in [0, 1). */
export function drawFault(last: FaultNo | null, r: number): FaultNo {
  const pool = FAULTS.map((f) => f.n).filter((n) => n !== last);
  return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))];
}

// ---- The hall: the plant, its annunciator, its pedestal and scoreboard ------------

export interface Score {
  fault: FaultNo;
  /** Plant seconds: when it was caused, first accepted, put right. */
  causedAt: number;
  acceptedAt: number | null;
  fixedAt: number | null;
}

export interface Hall9 {
  plant: Hall9State;
  annunciator: LocationAnnunciatorState<string>;
  fault: FaultNo | null;
  last: FaultNo | null;
  score: Score | null;
  /** This visit's best time to put right, plant seconds. */
  best: number | null;
  /** The attendant's key switch, and the fault its selector is on. */
  key: boolean;
  selected: FaultNo;
}

export function newHall9(now = 0): Hall9 {
  return {
    plant: newHall9Plant(now),
    annunciator: newLocationAnnunciator(WINDOWS),
    fault: null,
    last: null,
    score: null,
    best: null,
    key: false,
    selected: 1,
  };
}

/** Every window dark. */
export const allClear = (h: Hall9) =>
  WINDOWS.every((w) => h.annunciator.windows[w] === 'off');

export function stepHall9(h0: Hall9, dt: number): Hall9 {
  if (!(dt > 0)) return h0;
  const plant = stepHall9Plant(h0.plant, dt);
  const annunciator = senseLocationAlarms(
    WINDOWS,
    h0.annunciator,
    hall9Alarms(plant),
  );
  let h: Hall9 = { ...h0, plant, annunciator };
  const sc = h.score;
  if (
    sc &&
    sc.fixedAt === null &&
    h.fault !== null &&
    faultCleared(plant, h.fault) &&
    allClear(h)
  ) {
    const took = plant.seconds - sc.causedAt;
    h = {
      ...h,
      fault: null,
      score: { ...sc, fixedAt: plant.seconds },
      best: h.best === null ? took : Math.min(h.best, took),
    };
  }
  return h;
}

export type Hall9Action =
  | { type: 'plant'; action: Hall9PlantAction }
  | { type: 'accept' }
  | { type: 'reset-alarms' }
  | { type: 'cause'; r: number }
  | { type: 'key'; on: boolean }
  | { type: 'select'; fault: FaultNo }
  | { type: 'reset'; now: number };

export function actOnHall9(h: Hall9, a: Hall9Action): Hall9 {
  switch (a.type) {
    case 'plant':
      return { ...h, plant: actOnHall9Plant(h.plant, a.action) };
    case 'accept': {
      const flashing = WINDOWS.some(
        (w) => h.annunciator.windows[w] === 'flashing',
      );
      const sc = h.score;
      return {
        ...h,
        annunciator: acceptLocationAlarms(WINDOWS, h.annunciator),
        score:
          sc && flashing && sc.acceptedAt === null && sc.fixedAt === null
            ? { ...sc, acceptedAt: h.plant.seconds }
            : sc,
      };
    }
    case 'reset-alarms':
      return {
        ...h,
        annunciator: resetLocationAlarms(WINDOWS, h.annunciator),
      };
    case 'cause': {
      // One fault at a time: the button does nothing until it is put right.
      if (h.fault !== null) return h;
      const n = h.key ? h.selected : drawFault(h.last, a.r);
      return {
        ...h,
        plant: causeFault(h.plant, n),
        fault: n,
        last: n,
        score: {
          fault: n,
          causedAt: h.plant.seconds,
          acceptedAt: null,
          fixedAt: null,
        },
      };
    }
    case 'key':
      return { ...h, key: a.on };
    case 'select':
      return { ...h, selected: a.fault };
    case 'reset':
      return newHall9(a.now);
  }
}

export function runHall9(h: Hall9, seconds: number): Hall9 {
  let out = h;
  let left = seconds;
  while (left > 1e-9) {
    const dt = Math.min(0.5, left);
    out = stepHall9(out, dt);
    left -= dt;
  }
  return out;
}

/** The hall's model, as the museum's clock drives it. */
export const HALL9_MODEL = {
  reset: (now: number) => newHall9(now),
  step: stepHall9,
};

/** mm:ss of plant time, or dashes. */
export function minutesText(seconds: number | null) {
  if (seconds === null) return '--:--';
  const m = Math.min(99, Math.floor(seconds / 60));
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** hh:mm of plant time, or dashes. */
export function hoursText(seconds: number | null) {
  if (seconds === null) return '--:--';
  const h = Math.min(99, Math.floor(seconds / 3600));
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** The scoreboard's lines: FAULT n, TO ACCEPT mm:ss, TO FIX hh:mm, BEST hh:mm. */
export function scoreboard(h: Hall9) {
  const sc = h.score;
  const now = h.plant.seconds;
  return {
    fault: sc ? String(sc.fault).padStart(2, ' ') : '--',
    toAccept: minutesText(
      !sc
        ? null
        : sc.acceptedAt !== null
          ? sc.acceptedAt - sc.causedAt
          : sc.fixedAt === null
            ? now - sc.causedAt
            : null,
    ),
    toFix: hoursText(sc ? (sc.fixedAt ?? now) - sc.causedAt : null),
    best: hoursText(h.best),
  };
}

/** The station clock: PLANT TIME hh:mm DAY n. */
export function stationClock(h: Hall9) {
  const t = h.plant.start + h.plant.seconds;
  const day = Math.floor(t / 86400) + 1;
  const tod = Math.floor(t % 86400);
  const two = (n: number) => String(n).padStart(2, '0');
  return {
    time: `${two(Math.floor(tod / 3600))}:${two(Math.floor(tod / 60) % 60)}`,
    day,
  };
}
