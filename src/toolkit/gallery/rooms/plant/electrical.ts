import type { PlantExhibit } from './exhibit';
import { createPartSet } from '../../../components/core/parts/parts';
import { createSwitchFuse } from '../../../components/industrial-control/views/switch-fuse';
import {
  createCableTray,
  createCentralBattery,
  createDistributionBoard,
  createEarthBar,
  createGeneratorConnection,
  createIsolatorBoard,
  createMainSwitchboard,
  createMotorControlCentre,
  createVariableSpeedDrive,
} from '../../../components/plant/views/electrical-switchgear';

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Main switchboard, motor control centre, drives, UPS and distribution';

/** The room's equipment, in the order it is shown. */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'LV main switchboard',
    reference:
      'After Schneider Electric PrismaSeT P, 4 × 650 mm sections, 2000 × 600; MasterPact MTZ2 incomer, ComPacT NSX outgoing ways',
    size: { w: 2.62, d: 0.66, h: 2.0, mount: 'floor' },
    build: createMainSwitchboard,
  },
  {
    title: 'Motor control centre',
    reference: 'Form 4 type 6 MCC, 3 × 600 mm sections, 2000 × 500',
    size: { w: 1.82, d: 0.56, h: 2.0, mount: 'floor' },
    build: createMotorControlCentre,
  },
  {
    title: 'Variable-speed drive',
    reference:
      'After Danfoss VLT AQUA Drive FC 202, D1h enclosure about 901 × 325 × 378 mm, on a 400 mm pedestal',
    size: { w: 0.4, d: 0.42, h: 1.31, mount: 'floor' },
    build: createVariableSpeedDrive,
  },
  {
    title: 'Emergency lighting central battery',
    reference: 'After RP-Technik MultiControl MCS (EN 50171), 1800 × 600 × 450',
    size: { w: 0.62, d: 0.5, h: 1.8, mount: 'floor' },
    build: createCentralBattery,
  },
  {
    title: 'Cable tray and trunking',
    reference:
      'After Unitrunk MR300, 300 mm medium-duty return-flange tray; 100 × 100 trunking',
    size: { w: 2.2, d: 0.75, h: 1.3, mount: 'floor' },
    build: createCableTray,
  },
  {
    title: 'Distribution board',
    reference: 'After Hager JK112B, 12-way TPN 125 A, 850 × 465 × 132.5 mm',
    size: { w: 0.5, d: 0.35, h: 0.86, mount: 'wall', y: 1.5 },
    build: createDistributionBoard,
  },
  {
    title: 'Rotary isolators',
    reference: 'After Eaton P3 enclosed switch-disconnectors, 20–100 A',
    size: { w: 1.2, d: 0.2, h: 0.6, mount: 'wall', y: 1.4 },
    build: createIsolatorBoard,
  },
  {
    title: 'Switch-fuse, room supply',
    reference:
      'After MEM Memshield and Crabtree TP&N 63 A switch-fuses of around 2000, 200 × 300 × 150 mm: side handle, padlockable OFF, SUPPLY ON neon',
    size: { w: 0.3, d: 0.2, h: 0.4, mount: 'wall', y: 1.5 },
    maker: 'voltara',
    build(kit) {
      // Working: its handle switches it, its neon lit while it is on.
      const fuse = createSwitchFuse(kit, { legend: 'ROOM SUPPLY' });
      const parts = createPartSet();
      fuse.handle.traverse((o) => parts.uses.set(o, () => fuse.toggle()));
      return {
        object: fuse.group,
        parts,
        update: (delta) => fuse.update(delta),
      };
    },
  },
  {
    title: 'Generator connection point',
    reference: 'After Union Connector GCB 400 A, 762 × 610 × 254 mm',
    size: { w: 0.62, d: 0.4, h: 0.77, mount: 'wall', y: 1.3 },
    build: createGeneratorConnection,
  },
  {
    title: 'Main earthing terminal',
    reference: 'After Furse LK245-12, 750 mm 12-way copper bar with test link',
    size: { w: 0.76, d: 0.1, h: 0.6, mount: 'wall', y: 1.2 },
    build: createEarthBar,
  },
];
