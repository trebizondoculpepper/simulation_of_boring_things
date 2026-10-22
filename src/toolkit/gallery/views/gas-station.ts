import { computed } from '@preact/signals-core';
import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet, pushButton } from '../../components/core/parts/parts';
import type { Readable } from '../../components/core/logic/world/components';
import {
  gasBeacon,
  gasDetector,
} from '../../components/general-safety/parts/gas-parts';
import { gasAlarms } from '../../components/general-safety/logic/gas-detection';
import type {
  GasParams,
  GasState,
} from '../../components/general-safety/logic/gas-detection';
import type { BeaconLens } from '../../components/general-safety/views/gas-detection';
import type { Point } from '../../components/plant/views/plant-tools';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/** A room's gas detection as its station shows it, and what its buttons do. */
export interface GasStationBinding {
  params: GasParams;
  state: Readable<GasState>;
  lens: BeaconLens;
  accept(): void;
  reset(): void;
}

/** Where a station's working parts go on its model, metres. */
export interface GasStationPoints {
  detector: Point;
  beacon: Point;
  accept: Point;
  reset: Point;
}

/**
 * A room's gas detection station: `base` (the extract and its notice, or
 * nothing) with the working detector, sounder-beacon, ACCEPT and RESET
 * added at `points`, bound to `binding`.
 */
export function createGasStation(
  kit: PanelKit,
  base: Object3D | null,
  points: GasStationPoints,
  binding: GasStationBinding,
  /** A set to add its parts to, a machine's it is mounted on; else its own. */
  into?: ReturnType<typeof createPartSet>,
): LiveExhibit {
  const object = new Group();
  object.name = `${binding.params.gas} detection`;
  if (base) object.add(base);
  const parts = into ?? createPartSet();
  const at = (part: { object: Object3D }, [x, y, z]: Point) => {
    part.object.position.set(x, y, z);
    object.add(part.object);
  };
  at(
    parts.add(
      gasDetector(kit, { params: binding.params, state: binding.state }),
    ),
    points.detector,
  );
  const alarms = computed(() => gasAlarms(binding.state.value));
  at(
    parts.add(
      gasBeacon(kit, {
        lens: binding.lens,
        flashing: computed(() => alarms.value.beacon),
        sounding: computed(() => alarms.value.sounder),
      }),
    ),
    points.beacon,
  );
  at(
    parts.add(
      pushButton(kit, {
        colour: 'yellow',
        legend: 'ACCEPT',
        action: binding.accept,
      }),
    ),
    points.accept,
  );
  at(
    parts.add(
      pushButton(kit, {
        colour: 'blue',
        legend: 'RESET',
        action: binding.reset,
      }),
    ),
    points.reset,
  );
  return { object, parts };
}
