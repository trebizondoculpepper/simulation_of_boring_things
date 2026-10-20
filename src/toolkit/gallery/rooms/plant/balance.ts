import { Group } from 'three';
import type { Object3D } from 'three';
import type { PlantExhibit } from './exhibit';
import {
  createBackwashTank,
  createBalanceTank,
  createBreakTank,
  createLevelInstruments,
  createWaterMeter,
} from '../../../components/plant/views/balance-plant';

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Balance tanks, make-up water, level control and drain valves';

/** `model` moved by (x, z), so that its footprint is centred on the origin. */
const shifted = (model: Object3D, x: number, z = 0) => {
  const group = new Group();
  model.position.x += x;
  model.position.z += z;
  group.add(model);
  return group;
};

/** The room's equipment, in the order it is shown. */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Balance tank, main pool',
    reference:
      'After GRP sectional tanks (Dutypoint, Tanks Direct): 1000 mm panels, 6 × 3 × 2 m, 36 m³',
    size: { w: 6.4, d: 4.2, h: 3.5, mount: 'floor' },
    build: (kit) => shifted(createBalanceTank(kit), 0, -0.4),
  },
  {
    title: 'Make-up break tank',
    reference:
      'After the Tanks Direct 2250 L Type AB air-gap tank, 1650 × 1450 × 1750 mm',
    size: { w: 2.2, d: 1.9, h: 2.5, mount: 'floor' },
    build: (kit) => shifted(createBreakTank(kit), -0.1, -0.17),
  },
  {
    title: 'Make-up water meter',
    reference:
      'After Elster Helix 4000 DN50 Woltmann meter, 200 mm; strainer, double check valve',
    size: { w: 1.6, d: 0.3, h: 1.2, mount: 'floor' },
    build: createWaterMeter,
  },
  {
    title: 'Backwash holding tank',
    reference:
      'Sectional, 3 × 2 × 2 m; discharge pump after Grundfos SL1.50.65, 544 mm high',
    size: { w: 4.5, d: 2.6, h: 2.4, mount: 'floor' },
    build: (kit) => shifted(createBackwashTank(kit), 0.12, -0.1),
  },
  {
    title: 'Level instruments',
    reference:
      'Probe after Endress+Hauser Waterpilot FMX21 (Ø22 mm); floats after Flygt ENM-10',
    size: { w: 1.2, d: 0.2, h: 1.6, mount: 'wall', y: 1.4 },
    build: createLevelInstruments,
  },
];
