import { readings as chemistryReadings } from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import type {
  AqualisReadings,
  SampleInput,
  SampleStatus,
} from './aqualis-types';

/**
 * The Aqualis analyser's sampler (mission 114, `doc/plans/114/`): the water
 * at its tapping, through its flow cell, into every reading. The cell's
 * water follows the sample's with a first-order lag of about a minute (the
 * world's controller's `CONTROLLER.sampleLag`, `water-treatment.ts`; about
 * half a litre turned over by ~30 l/h, as the retired `sampling.ts`'s flow cell).
 * Below its flow switch's setting the sample is lost: the cell's water
 * stands, its free chlorine slowly consumed (hours, as the flow cell's
 * `stagnant`), everything else frozen. Pure; cheap enough to step every
 * chemistry tick.
 */

export const SAMPLER = {
  /** The cell's lag behind the sample while it flows: its time constant, s. */
  lag: 60,
  /** Its flow switch: sample flow below this is lost, l/h (as `FLOW_CELL`'s `switchAt`). */
  switchAt: 21,
  /** Standing water's free chlorine consumed with this time constant, s (as `FLOW_CELL`'s `stagnant`). */
  stagnant: 3 * 3600,
} as const;

/** What the sampler keeps: the water in its cell, and how long its flow has been lost. */
export interface SamplerState {
  /** The cell's water. */
  water: PoolChemistry;
  /** The cell's water's temperature, °C. */
  temperature: number;
  /** Seconds the sample flow has been lost (0 while it flows). */
  lostFor: number;
}

export interface SamplerStep {
  state: SamplerState;
  readings: AqualisReadings;
  status: SampleStatus;
}

const flowing = (flowLh: number) => flowLh >= SAMPLER.switchAt;

/** A sampler whose cell already holds the sample's water (settled), its flow as the input's. */
export function newSampler(input: SampleInput): SamplerState {
  return {
    water: { ...input.water },
    temperature: input.temperature,
    lostFor: 0,
  };
}

/** Every reading of the water in the cell. */
export function samplerReadings(state: SamplerState): AqualisReadings {
  const w = state.water;
  const r = chemistryReadings(w, state.temperature);
  return {
    freeChlorine: w.freeChlorine,
    combinedChlorine: r.combinedChlorine,
    totalChlorine: r.totalChlorine,
    ph: r.ph,
    alkalinity: w.alkalinity,
    calciumHardness: w.hardness,
    lsi: r.langelier,
    tds: w.tds,
    sulphate: w.sulphate,
    temperature: state.temperature,
  };
}

/** The sample's health, for the controller's inhibit and the alarms. */
export function samplerStatus(
  state: SamplerState,
  input: SampleInput,
): SampleStatus {
  return {
    flowing: flowing(input.flowLh),
    flowLh: input.flowLh,
    lostFor: state.lostFor,
  };
}

/**
 * The sampler `dt` seconds on: while the sample flows, the cell's water
 * (every field, and its temperature) moves towards the sample's by
 * `1 − e^(−dt/lag)`; while it is lost, the cell's water stands, only its
 * free chlorine decaying, and `lostFor` counts up.
 */
export function stepSampler(
  state: SamplerState,
  input: SampleInput,
  dt: number,
): SamplerStep {
  const step = Math.max(0, dt);
  let next: SamplerState;
  if (flowing(input.flowLh)) {
    const f = 1 - Math.exp(-step / SAMPLER.lag);
    const water = { ...state.water };
    for (const key of Object.keys(water) as (keyof PoolChemistry)[]) {
      water[key] += (input.water[key] - water[key]) * f;
    }
    next = {
      water,
      temperature:
        state.temperature + (input.temperature - state.temperature) * f,
      lostFor: 0,
    };
  } else {
    next = {
      water: {
        ...state.water,
        freeChlorine:
          state.water.freeChlorine * Math.exp(-step / SAMPLER.stagnant),
      },
      temperature: state.temperature,
      lostFor: state.lostFor + step,
    };
  }
  return {
    state: next,
    readings: samplerReadings(next),
    status: samplerStatus(next, input),
  };
}
