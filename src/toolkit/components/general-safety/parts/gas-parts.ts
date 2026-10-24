import { signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import type { Readable } from '../../core/logic/world/components';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { show } from '../../core/parts/building-part-tools';
import {
  CHLORINE_SOUNDER,
  METHANE_SOUNDER,
  OZONE_SOUNDER,
} from '../../core/audio/part-loops';
import {
  accept,
  gasAlarms,
  gasDisplay,
  misdeliver,
  newGasState,
  reset,
  stepGas,
} from '../logic/gas-detection';
import type { GasParams, GasState } from '../logic/gas-detection';
import { createGasBeacon, createGasDetector } from '../views/gas-detection';
import type { BeaconLens } from '../views/gas-detection';

/**
 * One room's gas detection, working: the gas in its air and the
 * detector's alarms (`../logic/gas-detection.ts`), stepped a second at a
 * time, with what the room's buttons do to it. The beacon and detector
 * parts below show it.
 */
export function createGasZone(params: GasParams) {
  const state = signal<GasState>(newGasState());
  const leak = signal(0);
  const fan = signal(true);
  let pending = 0;
  return {
    params,
    state: state as ReadonlySignal<GasState>,
    /** A steady leak, g/h, and the extract fan's switch. */
    leak,
    fan,
    step(delta: number) {
      pending += delta;
      let s = state.value;
      while (pending >= 1) {
        pending -= 1;
        s = stepGas(params, s, { leak: leak.value, fan: fan.value }, 1);
      }
      if (s !== state.value) state.value = s;
    },
    misdeliver() {
      state.value = misdeliver(state.value);
    },
    accept() {
      state.value = accept(state.value);
    },
    reset() {
      state.value = reset(params, state.value);
    },
  };
}
export type GasZone = ReturnType<typeof createGasZone>;

const SOUNDERS = {
  amber: CHLORINE_SOUNDER,
  blue: OZONE_SOUNDER,
  red: METHANE_SOUNDER,
} as const;

/**
 * A gas sounder-beacon: it flashes while an alarm is latched and sounds
 * its gas's own invented alarm while the high alarm is unaccepted.
 */
export function gasBeacon(
  kit: PanelKit,
  props: {
    lens: BeaconLens;
    flashing: Readable<boolean>;
    sounding: Readable<boolean>;
  },
): Part {
  const a = beginPart(kit, 'gas sounder-beacon');
  const view = createGasBeacon(kit, props.lens);
  a.object.add(view.group);
  show(a, () => view.set(props.flashing.value));
  a.updates.push(view.update);
  a.holdWhile(props.sounding, SOUNDERS[props.lens]);
  return a.part();
}

/** A fixed gas detector, showing a room's reading and alarms. */
export function gasDetector(
  kit: PanelKit,
  props: { params: GasParams; state: Readable<GasState> },
): Part {
  const a = beginPart(kit, `${props.params.gas} detector`);
  const view = createGasDetector(kit, props.params.gas, props.params.range);
  a.object.add(view.group);
  show(a, () => {
    const s = props.state.value;
    view.show(gasDisplay(props.params, s), s.a1, s.a2);
  });
  a.updates.push(view.update);
  return a.part();
}

/** Whether a zone's beacon flashes and its sounder sounds. */
export const zoneAlarms = (zone: GasZone) => gasAlarms(zone.state.value);
