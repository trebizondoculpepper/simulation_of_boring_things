import {
  createAcidBoard,
  createCo2Station,
  createControllerPanel,
  createHypochloriteBoard,
  createInjectionRun,
  createTestShelf,
} from '../../../components/plant/views/dosing-equipment';
import type { PlantExhibit } from './exhibit';

/** What this plant room is for, printed on its title card. */
export const PURPOSE = 'Chlorine and pH control, sample cells and dosing pumps';

/**
 * The dosing room's equipment, in the order it is shown, each after a
 * real product (`doc/research/plant-products-chemicals-dosing.md`).
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Injection points on the return',
    reference:
      'After ProMinent PVT injection valves (PVDF, R½) on a DN150 PVC-U main',
    size: { w: 2.8, d: 0.9, h: 1.4, mount: 'floor' },
    build: createInjectionRun,
  },
  {
    title: 'CO₂ for pH (the alternative to acid)',
    reference: 'After a BOC pool CO₂ supply: two 34 kg cylinders (230 × 1460)',
    size: { w: 1.2, d: 0.7, h: 1.6, mount: 'floor' },
    build: createCo2Station,
  },
  {
    title: 'Hypochlorite dosing pumps',
    reference:
      'After ProMinent gamma/ X GMXa, duty and standby, with calibration column',
    size: { w: 1.2, d: 0.3, h: 1.0, mount: 'wall', y: 1.3 },
    build: createHypochloriteBoard,
  },
  {
    title: 'Acid dosing pump',
    reference: 'After Grundfos SMART Digital DDA 7.5-16',
    size: { w: 0.7, d: 0.35, h: 0.8, mount: 'wall', y: 1.3 },
    build: createAcidBoard,
  },
  {
    title: 'Controller and sample cells',
    reference:
      'After ProMinent DULCOMARIN 3 (430 × 290 × 150) over a DGMa sample armature',
    size: { w: 1.0, d: 0.25, h: 1.4, mount: 'wall', y: 1.35 },
    build: createControllerPanel,
  },
  {
    title: 'Test shelf and log',
    reference:
      'After Palintest Lumiso Pooltest photometer (163 × 70 × 45), DPD tablets',
    size: { w: 0.7, d: 0.25, h: 0.6, mount: 'wall', y: 1.3 },
    build: createTestShelf,
  },
];
