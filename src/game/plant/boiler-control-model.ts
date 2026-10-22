import {
  newBoiler,
  pressBoiler,
  setBoilerSetpoint,
} from '../../toolkit/components/plant/logic/boiler-house';
import type {
  BoilerKey,
  BoilerState,
} from '../../toolkit/components/plant/logic/boiler-house';

/** Discrete boiler controls; the port graph remains the sole physical solver. */
export class BoilerControlModel {
  state: BoilerState = newBoiler();

  press(key: BoilerKey) {
    this.state = pressBoiler(this.state, key);
  }

  setSetpoint(celsius: number) {
    this.state = setBoilerSetpoint(this.state, celsius);
  }

  /** Project physical readings onto the panel without running a second boiler simulation. */
  showPhysical(readings: {
    powered: boolean;
    firing: boolean;
    flowing: boolean;
    waterC: number;
    rate: number;
    deltaSeconds: number;
  }) {
    const previousCode = this.state.code;
    const code = !readings.powered
      ? 0
      : !readings.flowing
        ? 9
        : readings.firing
          ? 3
          : 0;
    this.state = {
      ...this.state,
      code,
      timer:
        code === previousCode ? this.state.timer + readings.deltaSeconds : 0,
      rate: readings.firing ? readings.rate : 0,
      flow: readings.waterC + (readings.firing ? 5 * readings.rate : 0),
      return: readings.waterC,
      pressure: readings.flowing ? 2.4 : 0.5,
    };
  }
}
