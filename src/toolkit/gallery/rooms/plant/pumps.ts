import { Group } from 'three';
import { createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { createWaterButterflyValve } from '../../../components/plant/views/water-butterfly-valve';
import {
  PIPE_SIZES,
  plantTools,
} from '../../../components/plant/views/plant-tools';
import { machinePorts } from '../../logic/machine-ports';
import type { Item } from '../../logic/room-equipment';
import type { Object3D } from 'three';
import { PUMP_PANEL_EXHIBIT } from './pump-panel';
import {
  JACUZZI_PACK_EXHIBIT,
  SPA_PACK_EXHIBIT,
  SPA_PARTS_EXHIBIT,
} from './spa-pack';
import { createPumpDrive } from '../../../components/plant/parts/pump-drive';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { currentPlant } from './live-plant';
import { partAudio } from '../../../components/core/audio/part-audio';
import { pumpSound } from '../../../components/plant/views/pump-sound';
import type { PoolId } from '../../../../game/plant/pools';
import {
  createAirBlower,
  createFlowMeter,
  createJetPump,
  createPlateHeatExchanger,
  createPumpPair,
  createSandFilter,
  createUvUnit,
} from '../../../components/plant/views/pumps-plant';

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Circulation pumps, sand filters, UV and pool heat exchangers';

/** `model` moved by (x, z), so that its footprint is centred on the origin. */
const shifted = (model: Object3D, x: number, z = 0) => {
  const group = new Group();
  model.position.x += x;
  model.position.z += z;
  group.add(model);
  return group;
};

/**
 * A sand filter as an exhibit, with the face pipework a plant room gives
 * it (`room-pipes.ts`), short: at each of its ports (`machine-ports.ts`,
 * the one source of their places) a flanged nozzle, a length of PVC out
 * along the port's direction and a working butterfly valve on it, so the
 * development room still shows how a filter is piped. `z` is how far the
 * vessel stands forward; the ports are given for 0.1 m.
 */
function filterWithFacePipes(
  kit: Parameters<PlantExhibit['build']>[0],
  options: { dia: number; shell: number; dn: 80 | 150 | 200; label: string },
  z: number,
): LiveExhibit {
  const object = shifted(createSandFilter(kit, options), 0, z);
  const parts = createPartSet();
  const t = plantTools(kit);
  const item = {
    key: `sand-filter:${options.dia}`,
    label: options.label,
    w: 0,
    d: 0,
    h: 0,
    mount: 'floor',
  } as unknown as Item;
  for (const port of machinePorts(item)) {
    const dn = port.name === 'drain' ? 80 : options.dn;
    const od = PIPE_SIZES[dn].od;
    const dir = port.outward;
    const at = (k: number): [number, number, number] => [
      port.at[0] + dir[0] * k,
      port.at[1] + dir[1] * k,
      port.at[2] + (z - 0.1) + dir[2] * k,
    ];
    t.pipe(object, dn, [at(-0.12), at(0)]);
    t.flanges(object, dn, at(0), 'z');
    object.add(createPipe('pvc-pressure', od, [at(0), at(0.7)]));
    const valve = parts.add(
      createWaterButterflyValve(kit, dn, 'z', `Filter ${port.name} valve`),
    );
    valve.object.position.set(...at(0.4));
    object.add(valve.object);
  }
  return { object, parts };
}

/**
 * The circulation pumps, duty and standby, showing `pool`'s plant: the
 * pump the world runs is the one that runs here.
 */
export function pumpPairExhibit(pool: PoolId = 'pool_02'): PlantExhibit {
  return {
    title: 'Circulation pumps, duty and standby',
    reference:
      'After Grundfos NK 150-315, 30 kW 4-pole; DN200/150; hair-and-lint strainers after AstralPool Aral Ø330',
    size: { w: 3.2, d: 2.4, h: 1.9, mount: 'floor' },
    build(kit): LiveExhibit {
      // Whichever pump the plant runs (`live-plant.ts`): its gauges at
      // their running pressures and its sound held at it, running up as it
      // starts and coasting down as it stops; the other sits with its
      // gauges at the suction's static head, silent.
      const pair = createPumpPair(kit);
      const sound = pumpSound();
      const heard = [false, false];
      return {
        object: pair,
        update(delta) {
          const plant = currentPlant(pool);
          const worst = Math.max(...plant.filterDp);
          const running = [plant.pumps.p1, plant.pumps.p2];
          pair.pumps.forEach((pump, i) => {
            if (running[i]) {
              pump.gauges.suction.set(0.18 - (plant.flow - 600) * 0.001);
              pump.gauges.discharge.set(2.1 + 0.3 * (worst - 0.4));
            } else {
              pump.gauges.suction.set(0.22);
              pump.gauges.discharge.set(0.22);
            }
            pump.gauges.suction.update(delta);
            pump.gauges.discharge.update(delta);
            if (running[i] !== heard[i]) {
              heard[i] = running[i];
              partAudio.hold(pump, running[i] ? sound : null, pump);
            }
          });
        },
        dispose() {
          for (const pump of pair.pumps) partAudio.hold(pump, null);
        },
      };
    },
  };
}

/** The room's equipment, in the order it is shown. */
export const EXHIBITS: readonly PlantExhibit[] = [
  pumpPairExhibit(),
  {
    title: 'Pressure sand filter, main pool',
    reference:
      'After the Waterco SMDD range, scaled to 2.8 m dia. (one of four); DN200 face pipework from its ports',
    size: { w: 3.4, d: 3.6, h: 3.3, mount: 'floor' },
    build: (kit) =>
      filterWithFacePipes(
        kit,
        { dia: 2.8, shell: 1.6, dn: 200, label: 'SMD 2800  6.2 m²' },
        0.1,
      ),
  },
  {
    title: 'Pressure sand filter, learner pool',
    reference:
      'After Waterco SMDD2000: Ø2042 × 2398 mm, 3.14 m², 94 m³/h, 6090 kg sand; DN150',
    size: { w: 2.7, d: 2.8, h: 2.7, mount: 'floor' },
    build: (kit) =>
      filterWithFacePipes(
        kit,
        { dia: 2.042, shell: 1.38, dn: 150, label: 'SMDD 2000  3.14 m²' },
        0.12,
      ),
  },
  {
    title: 'Pressure sand filter, spa',
    reference:
      'After the Waterco SMDD range, 1.4 m dia.; DN80 face pipework from its ports',
    size: { w: 2.0, d: 2.2, h: 2.2, mount: 'floor' },
    build: (kit) =>
      filterWithFacePipes(
        kit,
        { dia: 1.4, shell: 1.0, dn: 80, label: 'SMDD 1400  1.5 m²' },
        0.12,
      ),
  },
  {
    title: 'UV unit',
    reference:
      'After VGE Pro type 2000-219: 316L chamber Ø219 mm, DN200, one 2 kW medium-pressure lamp',
    size: { w: 1.7, d: 1.6, h: 1.7, mount: 'floor' },
    build: (kit) => shifted(createUvUnit(kit), 0, -0.3),
  },
  {
    title: 'Plate heat exchanger',
    reference:
      'After Alfa Laval M10-BFG: frame 1084 × 470 mm; LTHW to pool water; DN100 ports',
    size: { w: 1.5, d: 0.7, h: 1.2, mount: 'floor' },
    build: (kit) => shifted(createPlateHeatExchanger(kit), -0.4),
  },
  {
    title: 'Electromagnetic flow meter',
    reference: 'After Endress+Hauser Proline Promag W 400, DN150 flanged',
    size: { w: 1.6, d: 0.4, h: 1.3, mount: 'floor' },
    build: createFlowMeter,
  },
  {
    title: 'Spa jet pump',
    reference: 'After Speck BADU 90/40: 2.2 kW, 795 mm long, with pre-filter',
    size: { w: 1.0, d: 0.45, h: 0.8, mount: 'floor' },
    build: createJetPump,
  },
  {
    title: 'Spa air blower',
    reference:
      'After a 2.2 kW side-channel blower (Siemens Elmo-G 2BH6 class), 430 × 370 × 380 mm',
    size: { w: 0.9, d: 0.5, h: 1.5, mount: 'floor' },
    build: (kit) => shifted(createAirBlower(kit), -0.1, 0.15),
  },
  {
    title: 'Variable-speed drive',
    reference: 'After Danfoss VLT AQUA Drive FC 202, 30 kW, IP55 frame B2',
    size: { w: 0.9, d: 0.3, h: 0.8, mount: 'wall', y: 1.5 },
    build: createPumpDrive,
  },
  PUMP_PANEL_EXHIBIT,
  SPA_PACK_EXHIBIT,
  JACUZZI_PACK_EXHIBIT,
  SPA_PARTS_EXHIBIT,
];
