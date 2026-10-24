import {
  resetGasHouse,
  settleGasHouse,
} from '../../toolkit/components/plant/logic/boiler-house';
import type { PlantServices } from './services';

/**
 * The boiler house's gas safety, in the world: the incoming emergency
 * control valve (ECV), the emergency stop by the door, the methane
 * detector, and the automatic safety shut-off valve (SSOV) they hold
 * open between them (`boiler-house.ts`'s gas house rules: the SSOV trips
 * shut when its permit goes, stays shut after the stop is pulled out or
 * the gas clears, and reopens only on GAS RESET with every permit made).
 *
 * With the SSOV or the ECV shut no gas reaches the boilers: they cannot
 * fire, and the heating they give the pools and their halls stops
 * (`heatingPlant`). The boilers' own controllers stay in the boiler
 * house's room; the gas they share is here, so the stop's state survives
 * a reload and the control room sees it. Pure.
 */
export interface BoilerGasState {
  /** The incoming emergency control valve, at the meter. */
  ecvOpen: boolean;
  /** The boiler house's emergency stop: struck in (latched) or out. */
  stopPressed: boolean;
  /** Gas detected by the methane head. */
  gasDetected: boolean;
  /** The SSOV: open only while all is well, and shut until reset once tripped. */
  ssovOpen: boolean;
  /** Seconds left of the detector's TEST, which simulates gas at its head. */
  testing: number;
}

/** How long the detector's TEST holds its simulated gas, seconds. */
export const GAS_TEST_SECONDS = 8;

export function newBoilerGas(): BoilerGasState {
  return {
    ecvOpen: true,
    stopPressed: false,
    gasDetected: false,
    ssovOpen: true,
    testing: 0,
  };
}

/** What a hand may do to the boiler house's gas safety. */
export type BoilerGasAction =
  | { act: 'stop'; pressed: boolean }
  | { act: 'reset' }
  | { act: 'ecv'; open: boolean }
  | { act: 'test' };

/** The gas house's rules, on the world's slice (no isolators: they are the boilers'). */
const settle = (g: BoilerGasState): BoilerGasState => {
  const ssovOpen = settleGasHouse({ ...g, isolators: [] }).ssovOpen;
  return ssovOpen === g.ssovOpen ? g : { ...g, ssovOpen };
};

export function actOnBoilerGas(
  gas: BoilerGasState,
  action: BoilerGasAction,
): BoilerGasState {
  switch (action.act) {
    case 'stop':
      return gas.stopPressed === action.pressed
        ? gas
        : settle({ ...gas, stopPressed: action.pressed });
    case 'ecv':
      return gas.ecvOpen === action.open
        ? gas
        : settle({ ...gas, ecvOpen: action.open });
    case 'test':
      return settle({
        ...gas,
        testing: GAS_TEST_SECONDS,
        gasDetected: true,
      });
    case 'reset': {
      // Reopened only with every permit made; refused otherwise.
      const ssovOpen = resetGasHouse({ ...gas, isolators: [] }).ssovOpen;
      return ssovOpen === gas.ssovOpen ? gas : { ...gas, ssovOpen };
    }
  }
}

/** The gas safety `delta` seconds on: the detector's TEST running out. */
export function stepBoilerGas(
  gas: BoilerGasState,
  delta: number,
): BoilerGasState {
  if (gas.testing <= 0 && !gas.gasDetected) return gas;
  const testing = Math.max(0, gas.testing - delta);
  return settle({ ...gas, testing, gasDetected: testing > 0 });
}

/** Whether gas reaches the boilers' own isolators: the ECV and the SSOV open. */
export const boilerGasOn = (gas: BoilerGasState) => gas.ecvOpen && gas.ssovOpen;

/**
 * The plant as the heating sees it: without gas the boilers cannot fire,
 * so heat is to be had nowhere (`services.ts`' `heat`), whatever the
 * boiler house's feeder.
 */
export function heatingPlant(
  plant: PlantServices,
  gas: BoilerGasState,
): PlantServices {
  if (boilerGasOn(gas) || !plant.sources.heat) return plant;
  return { ...plant, sources: { ...plant.sources, heat: false } };
}
