import type { Chemical } from './chemicals';
import { CHEMICALS } from './chemicals';
import { DAY_TANKS } from './chemical-distribution';
import type { DayTankSite } from './chemical-distribution';
import { MODEL_VALVES } from './model-valves';
import type { ModelValve } from './model-valves';

/**
 * The chemical distribution's valves (plan 085), as the schematics give
 * them (`schematic-parts.ts`, `back-room-schematics.ts`): each one's model
 * valve, found by the machine and line it sits on, for the machines that
 * draw their own valves to bind to (a bulk tank's fill and outlet valves,
 * a transfer pump's skid, a selector's outlets, a framed day tank's); and
 * whether each chemical's way from its store to each day tank is open,
 * for the distribution to move chemical only where its valves let it.
 * Pure.
 */

const STORE: Record<Chemical, { room: string; code: string }> = {
  hypochlorite: { room: 'hypo_store', code: 'HS' },
  acid: { room: 'acid_store', code: 'AS' },
};

/** A model valve by its id; one the schematics do not give is an error. */
function valve(id: string): ModelValve {
  const found = MODEL_VALVES.find((v) => v.id === id);
  if (!found) throw new Error(`No model valve ${id}`);
  return found;
}

/** A store's bulk tank `n` (from 1): its fill line's inlet valve, overfill valve and draw-off's outlet valve. */
export function bulkTankValves(c: Chemical, n: number) {
  const { code } = STORE[c];
  return {
    fill: valve(`${code}.tank-${n}.fill.iso`),
    overfill: valve(`${code}.tank-${n}.fill.overfill`),
    outlet: valve(`${code}.tank-${n}.out.iso`),
  };
}

/** A store's transfer pump's suction and discharge isolating valves and its non-return valve. */
export function transferPumpValves(c: Chemical) {
  const { code } = STORE[c];
  return {
    suction: valve(`${code}.transfer.in.iso`),
    check: valve(`${code}.transfer.out.nrv`),
    discharge: valve(`${code}.transfer.out.iso`),
  };
}

/** A selector's outlet `i` (from 0, the distribution's): its manual isolating valve and its actuated valve. */
export function selectorValves(c: Chemical, i: number) {
  return {
    isolation: valve(`WH.${c}-selector.outlet-${i + 1}.iso`),
    actuated: valve(`WH.${c}-selector.outlet-${i + 1}.actuated`),
  };
}

/**
 * A day tank's valves, those its room's schematic gives: its inlet
 * isolating valve, its actuated inlet (a framed tank's), its outlet
 * isolating valve.
 */
export function dayTankValves(c: Chemical, site: DayTankSite) {
  const room = `PL${site.slice(-1)}`;
  const find = (what: string) =>
    MODEL_VALVES.find((v) => v.id === `${room}.${c}-day.${what}`);
  return {
    inlet: find('fill.iso'),
    actuated: find('fill.actuated'),
    outlet: find('out.iso'),
  };
}

/** Bulk tanks in each store. */
const BULK: Record<Chemical, number> = { hypochlorite: 3, acid: 1 };

/**
 * The valves the chemical machines draw on themselves, bound to the model
 * (the rest are set in the pipe runs by their rooms' plumbing): every bulk
 * tank's fill and outlet valves, every transfer skid's, every selector
 * outlet's, and a framed day tank's actuated inlet and outlet valves.
 */
export const EQUIPMENT_VALVES: ReadonlySet<string> = new Set(
  CHEMICALS.flatMap((c) => [
    ...Array.from({ length: BULK[c] }, (_, k) => {
      const v = bulkTankValves(c, k + 1);
      return [v.fill.id, v.outlet.id];
    }).flat(),
    ...Object.values(transferPumpValves(c)).map((v) => v.id),
    ...DAY_TANKS[c].flatMap((_, i) =>
      Object.values(selectorValves(c, i)).map((v) => v.id),
    ),
    ...DAY_TANKS[c].flatMap((t) => {
      const v = dayTankValves(c, t.site);
      return v.actuated && v.inlet && v.outlet
        ? [v.actuated.id, v.inlet.id, v.outlet.id]
        : [];
    }),
  ]),
);

/** How each chemical's way through its valves stands: out of its store, and on to each day tank. */
export interface DistributionPaths {
  /** Out of the store: a bulk tank's outlet open, the pump's suction and discharge open. */
  store: boolean;
  /** On to day tank `i`: its selector outlet's isolating valve and its inlet isolating valve open. */
  outlets: readonly boolean[];
}

/** The ways through the chemical valves as the world keeps them (`installedValves`; a valve it does not keep at its normal). */
export function distributionPaths(
  valves: Readonly<Record<string, boolean>>,
): Record<Chemical, DistributionPaths> {
  const open = (v: ModelValve | undefined) =>
    !v || (valves[v.id] ?? v.normal === 'open');
  const line = (c: Chemical): DistributionPaths => {
    const pump = transferPumpValves(c);
    return {
      store:
        Array.from({ length: BULK[c] }, (_, k) =>
          open(bulkTankValves(c, k + 1).outlet),
        ).some(Boolean) &&
        open(pump.suction) &&
        open(pump.discharge),
      outlets: DAY_TANKS[c].map(
        (t, i) =>
          open(selectorValves(c, i).isolation) &&
          open(dayTankValves(c, t.site).inlet),
      ),
    };
  };
  return { hypochlorite: line('hypochlorite'), acid: line('acid') };
}
