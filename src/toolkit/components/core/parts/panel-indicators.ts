import { computed } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { Group } from 'three';
import type { PanelKit } from '../views/eighties-controls';
import { createMicroLabel } from '../views/eighties-controls';
import { tools } from '../views/fitting-tools';
import { createEngravedPlate } from '../views/plant-signs';
import type { OperatorColour } from '../../industrial-control/views/industrial-controls';
import { createPartSet, pilotLight } from './parts';
import type { Part } from './parts';
import type { Readable } from '../logic/world/components';

/**
 * A 3-gang tri-state indicator: three 30 mm push-to-test pilot lamps in a
 * row on a black strip, one lit to say which of three states a device is
 * in, with an engraved white plate below naming the device, as control
 * panel builders set them over each breaker, pump or valve on a mimic
 * (after the clusters in Benfield Control Systems' breaker panels; see
 * `doc/research/benfield-mimic-annunciator-reference.md`). Unlit lamps
 * keep a dim tint of their colour, so the eye reads which slot is lit.
 * In metres, facing +z, its mounting face at z = 0.
 */

/** One lamp of the three: its colour and the state it names. */
export interface TriStateLamp {
  colour: OperatorColour;
  legend: string;
}

/** Common sets of three, in the usual British order and colours. */
export const TRI_STATES = {
  /** A circuit breaker: red closed (live), green open, amber tripped. */
  breaker: [
    { colour: 'red', legend: 'CLOSED' },
    { colour: 'green', legend: 'OPEN' },
    { colour: 'amber', legend: 'TRIPPED' },
  ],
  /** A pump or fan: running, stopped, faulted. */
  motor: [
    { colour: 'red', legend: 'RUN' },
    { colour: 'green', legend: 'STOP' },
    { colour: 'amber', legend: 'FAULT' },
  ],
  /** A motorised valve: open, shut, or in travel or faulted. */
  valve: [
    { colour: 'red', legend: 'OPEN' },
    { colour: 'green', legend: 'SHUT' },
    { colour: 'amber', legend: 'TRAVEL' },
  ],
} as const satisfies Record<string, readonly TriStateLamp[]>;

/** The centres of its lamps, metres apart. */
export const TRI_STATE_PITCH = 0.04;

export function triStateIndicator(
  kit: PanelKit,
  {
    lamps,
    state,
    title,
    power,
    name,
  }: {
    lamps: readonly TriStateLamp[];
    /** Which lamp is lit (0, 1 or 2), or `null` for none. */
    state: Readable<number | null>;
    /** The device it reports, on its engraved plate: "P-101 FILTER PUMP 1". */
    title: string;
    /** Whether its lamps have their supply; dark without it. */
    power?: Readable<boolean>;
    name?: string;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = name ?? `${title} indicator`;
  const set = createPartSet();
  const w = TRI_STATE_PITCH * 3 + 0.012;
  t.box(group, t.paint('#16181a', 0.55), w, 0.06, 0.003, 0, 0.004, 0.0015);
  const parts: Part[] = [];
  const lit: ReadonlySignal<boolean>[] = lamps.map((lamp, i) => {
    const x = (i - 1) * TRI_STATE_PITCH;
    const part = pilotLight(kit, {
      colour: lamp.colour,
      drive: computed(() => state.value === i),
      power,
      name: `${title}: ${lamp.legend} lamp`,
    });
    part.object.position.set(x, 0.01, 0.003);
    group.add(part.object);
    set.add(part);
    parts.push(part);
    const label = createMicroLabel(kit, lamp.legend, {
      height: 0.0075,
      ink: '#f2f1ea',
    });
    label.position.set(x, -0.016, 0.0032);
    group.add(label);
    return part.lit;
  });
  const plate = createEngravedPlate(kit, [title], {
    colour: 'white',
    width: w,
    height: 0.024,
  });
  plate.position.set(0, -0.044, 0.002);
  group.add(plate);
  return {
    group,
    parts: set,
    /** Its three lamps, to add to another part set instead. */
    lamps: parts,
    /** Whether each lamp is lit now. */
    lit,
  };
}
