import {
  CO2_PORT_IDS,
  newCo2Distribution,
  portPressure,
  stepCo2Distribution,
  tripMaster,
} from './co2-distribution';
import type { Co2Distribution, Co2PortId } from './co2-distribution';
import {
  CO2_DOSERS,
  co2Draw,
  newCo2Doser,
  stepCo2Doser,
  trioSignal,
} from './co2-dosing';
import type { Co2Doser, Co2DoserInputs } from './co2-dosing';
import {
  CO2_ROOMS,
  CO2_ROOM_IDS,
  dosingInterlock,
  masterInterlock,
  newCo2Detector,
  stepCo2Detector,
} from './co2-detection';
import type { Co2DetectorState, Co2RoomId } from './co2-detection';

/**
 * The CO₂ system as one (CO₂ dosing, `doc/plans/co2-system.md`): the
 * distribution from the loading bay, each plant room's valve controller,
 * and the detectors, with their interlocks wired. The seam for the world:
 * it can hold a `Co2Plant` and call `stepCo2Plant` each step with what the
 * Trios ask and whether each room's water is moving, and add each room's
 * grams to its pool's `Additions.co2`. Pure.
 *
 * Each step, in order: the detectors' interlocks from the last step (a
 * room's alarm shuts its dosing valve; any high alarm trips the master
 * valve); each panel's draw at its wall port's pressure; the distribution
 * gives what it can; each panel steps, and what it delivers is no more
 * than the line gave it; the leaks go into the rooms' air and the
 * detectors step.
 */

export interface Co2Plant {
  distribution: Co2Distribution;
  dosers: Record<Co2PortId, Co2Doser>;
  detectors: Record<Co2RoomId, Co2DetectorState>;
}

export function newCo2Plant(ambient = 15): Co2Plant {
  return {
    distribution: newCo2Distribution(ambient),
    dosers: {
      plant_pool_01: newCo2Doser(CO2_DOSERS.plant_pool_01),
      plant_pool_02: newCo2Doser(CO2_DOSERS.plant_pool_02),
    },
    detectors: Object.fromEntries(
      CO2_ROOM_IDS.map((id) => [id, newCo2Detector(CO2_ROOMS[id])]),
    ) as Record<Co2RoomId, Co2DetectorState>,
  };
}

/** What each plant room gives its CO₂ system this step. */
export interface Co2RoomDrive {
  /** The Trio's CO₂ demand, 0 to 1, and whether its control cable is connected. */
  demand: number;
  connected: boolean;
  /** Water moving at the injection point. */
  waterFlowing: boolean;
}

export interface Co2PlantInputs {
  rooms: Record<Co2PortId, Co2RoomDrive>;
  /** Each room's extract running (default: running). */
  fans?: Partial<Record<Co2RoomId, boolean>>;
}

export interface Co2PlantStep {
  state: Co2Plant;
  /** CO₂ into each pool's water this step, g. */
  grams: Record<Co2PortId, number>;
  /** CO₂ leaked into each room's air this step, g. */
  leaked: Record<Co2RoomId, number>;
}

/** The CO₂ system `dt` seconds on. */
export function stepCo2Plant(
  p: Co2Plant,
  i: Co2PlantInputs,
  dt: number,
): Co2PlantStep {
  let distribution = p.distribution;
  if (CO2_ROOM_IDS.some((id) => masterInterlock(p.detectors[id])))
    distribution = tripMaster(distribution);

  const inputs = {} as Record<Co2PortId, Co2DoserInputs>;
  const draws = {} as Record<Co2PortId, number>;
  for (const id of CO2_PORT_IDS) {
    const r = i.rooms[id];
    inputs[id] = {
      ...trioSignal(r.demand, r.connected),
      inletBar: portPressure(distribution, id),
      waterFlowing: r.waterFlowing,
      gasAlarm: dosingInterlock(p.detectors[id]),
    };
    draws[id] = co2Draw(p.dosers[id], inputs[id], dt);
  }
  const line = stepCo2Distribution(distribution, draws, dt);

  const dosers = { ...p.dosers };
  const grams = { plant_pool_01: 0, plant_pool_02: 0 };
  for (const id of CO2_PORT_IDS) {
    const step = stepCo2Doser(p.dosers[id], inputs[id], dt);
    // The line may have given less than was drawn (it ran out mid-step).
    grams[id] = Math.min(step.grams, line.delivered[id]);
    dosers[id] =
      grams[id] < step.grams
        ? { ...step.state, delivering: (grams[id] * 3600) / dt }
        : step.state;
  }

  const detectors = { ...p.detectors };
  for (const id of CO2_ROOM_IDS) {
    detectors[id] = stepCo2Detector(
      CO2_ROOMS[id],
      p.detectors[id],
      {
        leakGh: dt > 0 ? (line.leaked[id] * 3600) / dt : 0,
        fan: i.fans?.[id] ?? true,
      },
      dt,
    );
  }
  return {
    state: { distribution: line.state, dosers, detectors },
    grams,
    leaked: line.leaked,
  };
}
