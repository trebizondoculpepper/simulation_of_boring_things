import { describe, expect, it } from "vite-plus/test";
import {
  LOUNGE_SIZE,
  NO_PORT_FLOW,
  filterActivity,
  newIdealFilter,
  portFlows,
  processPorts,
  stepFilter,
  stepFilterBed,
} from "./ideal-filter";
import type { FilterActivity, FilterPorts } from "./ideal-filter";
import { filterConditionOf } from "./filter-condition";
import { newWorld } from "../world";
import { LOUNGE_VALVES, loungeValveFlows } from "./lounge-valves";
import { installedValveByCommandId } from "./installed-valves";
import { olympicBatteryFlows } from "./olympic-battery";
import { SPA_FILTERS, newSpaFilter, spaFilterPorts } from "./spa-filter";
import type { FilterPhase } from "./spa-filter";

/**
 * The shared filter model (the owner, 2026-10-30): every discrete filter
 * is given the flows at its ports by its plumbing, and its bed and its
 * status follow from them by the same rules.
 */
const ports = (p: Partial<FilterPorts>): FilterPorts => ({
  ...NO_PORT_FLOW,
  ...p,
});

describe("the shared filter model, by its ports", () => {
  it("reads each process from its ports", () => {
    expect(filterActivity(processPorts("service", 45))).toBe("filtering");
    expect(filterActivity(processPorts("backwash", 34))).toBe("backwashing");
    expect(filterActivity(processPorts("rinse", 45))).toBe("rinsing");
    expect(filterActivity(processPorts("off", 45))).toBe("standing");
  });

  it("keeps filtering with a little drawn off to waste below, the return open", () => {
    expect(filterActivity(ports({ inlet: 48, outlet: 45, rinse: 3 }))).toBe(
      "filtering",
    );
  });

  it("stands while its vessel only drains down, and while an open inlet dumps straight to waste", () => {
    const drain = ports({ rinse: 3 });
    expect(portFlows(drain).bed).toBe(0);
    expect(portFlows(drain).drainDown).toBe(3);
    expect(filterActivity(drain)).toBe("standing");
    const dump = ports({ inlet: 5, backwashOut: 5 });
    expect(portFlows(dump).bed).toBe(0);
    expect(filterActivity(dump)).toBe("standing");
  });

  it("steps the bed as the ideal filter does with the flow through it", () => {
    const bed = { ...newIdealFilter(), dirt: 1 };
    for (const p of ["service", "backwash", "rinse", "off"] as const) {
      const at = processPorts(p, p === "backwash" ? 34 : 45);
      expect(stepFilter(LOUNGE_SIZE, bed, at, 2, 60)).toEqual(
        stepFilterBed(LOUNGE_SIZE, bed, portFlows(at).bed, 2, 60),
      );
    }
  });

  it("loads in service and washes clean in a backwash", () => {
    let bed = newIdealFilter();
    for (let t = 0; t < 3600; t += 10)
      bed = stepFilter(LOUNGE_SIZE, bed, processPorts("service", 45), 5, 10);
    expect(bed.dirt).toBeGreaterThan(0);
    const loaded = bed.dirt;
    for (let t = 0; t < 600; t += 1)
      bed = stepFilter(LOUNGE_SIZE, bed, processPorts("backwash", 34), 0, 1);
    expect(bed.dirt).toBeLessThan(loaded * 0.01);
    expect(bed.unsettled).toBe(1);
    for (let t = 0; t < 600; t += 1)
      bed = stepFilter(LOUNGE_SIZE, bed, processPorts("rinse", 45), 0, 1);
    expect(bed.unsettled).toBeLessThan(0.01);
  });
});

describe("every installation reports its processes by the same rules", () => {
  const activityOf = (spec: typeof LOUNGE_SIZE, p: FilterPorts) =>
    filterConditionOf(spec, newIdealFilter(), p).activity;

  it("the lounge’s IV1, IV2, BV1 and DV1", () => {
    const lounge = (set: Record<string, number>): FilterActivity => {
      const positions = { ...newWorld().loungeValvePositions };
      for (const [tag, open] of Object.entries(set))
        positions[LOUNGE_VALVES.find((v) => v.tag === tag)!.assetId] = open;
      return activityOf(
        LOUNGE_SIZE,
        loungeValveFlows(positions, true).ports[1],
      );
    };
    expect(lounge({})).toBe("filtering");
    expect(lounge({ "PL1-F2-IV1": 0, "PL1-F2-BV1": 1 })).toBe("backwashing");
    expect(lounge({ "PL1-F2-IV2": 0, "PL1-F2-DV1": 1 })).toBe("rinsing");
    expect(lounge({ "PL1-F2-IV1": 0, "PL1-F2-IV2": 0 })).toBe("standing");
    // Drained down, its inlet shut: standing, not rinsing.
    expect(lounge({ "PL1-F2-IV1": 0, "PL1-F2-IV2": 0, "PL1-F2-DV1": 1 })).toBe(
      "standing",
    );
  });

  it("the Olympic’s V1 to V5", () => {
    const olympic = (open: number[]): FilterActivity => {
      const valves = { ...newWorld().installedValves };
      for (let k = 1; k <= 5; k++)
        valves[installedValveByCommandId(`PL2-F1-V${k}`)!.assetId] =
          open.includes(k);
      return activityOf(
        { diameter: 3 },
        olympicBatteryFlows(valves).filters[0].ports,
      );
    };
    expect(olympic([1, 2])).toBe("filtering");
    expect(olympic([3, 4])).toBe("backwashing");
    expect(olympic([1, 5])).toBe("rinsing");
    expect(olympic([])).toBe("standing");
  });

  it("the jacuzzi’s and the footbath’s cabinet programmes", () => {
    const want: Record<FilterPhase, FilterActivity> = {
      filter: "filtering",
      stopping: "standing",
      backwash: "backwashing",
      rinse: "rinsing",
    };
    for (const spec of [SPA_FILTERS.jacuzzi, SPA_FILTERS.footSpa])
      for (const phase of Object.keys(want) as FilterPhase[]) {
        const f = { ...newSpaFilter(spec), phase };
        expect(activityOf(spec, spaFilterPorts(f, 8))).toBe(want[phase]);
        // Its pump stopped: standing, whatever its phase.
        expect(activityOf(spec, spaFilterPorts(f, 0))).toBe("standing");
      }
  });
});
