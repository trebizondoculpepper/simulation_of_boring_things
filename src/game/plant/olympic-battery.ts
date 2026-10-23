import { BIG_FILTER, VALVES, faceFlows } from './five-valve-filter';
import type { FiveValveFlows, ValveName } from './five-valve-filter';
import { installedValveByCommandId } from './installed-valves';

/**
 * The Olympic plant room's filter battery as its valves stand in the world
 * (`world.installedValves`): five 3 m filters on their five-valve faces
 * (V1 inlet, V2 outlet, V3 backwash in, V4 backwash out, V5 rinse; tags
 * `PL2-F<n>-V<k>`), fed by the pump pair. Each valve is commanded on its
 * own, from either of its panels (the local and the control room's, bound
 * to the same state: the owner, 2026-10-23), so the faces' flows follow
 * from the valves alone (`faceFlows`), with no controller between.
 *
 * What the room's flowmeters read: each filter's outlet riser, between its
 * underdrain and its backwash-in and outlet valves, signed out of the
 * filter (+ in service, − in a backwash; a rinse goes to waste below it),
 * and the pumps' common discharge. Pure; flows in m³/h.
 */

export const FILTERS = 5;

/** Whether a valve stands open in the world, by its tag (its normal state if the world has not moved it). */
function opener(installedValves: Readonly<Record<string, boolean>>) {
  return (tag: string) => {
    const v = installedValveByCommandId(tag);
    if (!v) return false;
    return installedValves[v.assetId] ?? v.normal === 'open';
  };
}

export interface BatteryFlows {
  /** Whether a pump has a way through: its suction and discharge valves open. */
  pumping: boolean;
  filters: (FiveValveFlows & { riser: number })[];
  /** Through the pumps' common discharge. */
  discharge: number;
}

export function olympicBatteryFlows(
  installedValves: Readonly<Record<string, boolean>>,
): BatteryFlows {
  const open = opener(installedValves);
  // Pump A's suction and discharge are IV1 and IV3; pump B's IV2 and IV4.
  const pumping =
    (open('PL2-P1-IV1') && open('PL2-P1-IV3')) ||
    (open('PL2-P1-IV2') && open('PL2-P1-IV4'));
  const filters = Array.from({ length: FILTERS }, (_, i) => {
    const opening = Object.fromEntries(
      VALVES.map((v, k) => [v, open(`PL2-F${i + 1}-V${k + 1}`) ? 1 : 0]),
    ) as Record<ValveName, number>;
    // The dirt the battery is left with mid-season (Dev26's start).
    const f = faceFlows(opening, 1.6 * BIG_FILTER.dirtRef, pumping);
    // Up the riser: to the return, less what a backwash sends down it.
    return { ...f, riser: f.valve.v2 - f.valve.v3 };
  });
  return {
    pumping,
    filters,
    discharge: filters.reduce((sum, f) => sum + f.valve.v1 + f.valve.v3, 0),
  };
}

/** Each flowmeter's reading, by what it reads (`Meter.reads`): `filter-<n>`, `pumps`. */
export function olympicMeterReadings(
  installedValves: Readonly<Record<string, boolean>>,
): Record<string, number> {
  const b = olympicBatteryFlows(installedValves);
  return {
    pumps: b.discharge,
    ...Object.fromEntries(
      b.filters.map((f, i) => [`filter-${i + 1}`, f.riser]),
    ),
  };
}
