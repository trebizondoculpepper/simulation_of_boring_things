import type { PlantExhibit } from './exhibit';
import { layoutSquarePlantRoom } from '../../logic/plant-room-layout';
import type { ExhibitSize } from '../../logic/plant-room-layout';
import { createPeristalticDemo } from '../../../components/plant/views/peristaltic-pump';
import { createLevelInstrumentsDemo } from '../../../components/plant/views/level-instruments';
import { createChemicalValveDemo } from '../../../components/plant/views/chemical-ball-valve';
import { createDosingValvesDemo } from '../../../components/plant/views/dosing-valves';
import { createLeakDetectionDemo } from '../../../components/plant/views/leak-detection';
import { createDoseCellDemo } from '../../../components/plant/views/dose-cell-head';
import { createChemControlPrototype } from '../../../components/plant/views/chem-control-prototype';
import { createBundMarkingDemo } from '../../views/bund-marking';
import {
  createBulkTankDemo,
  createChemicalPipeSamples,
  createDayTankRange,
  createTransferPumpSkid,
  createTransferTrial,
} from '../../../components/plant/views/chemical-handling-kit';

/**
 * Dev44: the chemical distribution's components as worked out with the
 * owner (2026-10-26/27), each real and working: the stores' framed bulk
 * tanks, the transfer pump skids, the selector and day tanks in a trial,
 * every day tank size (the DoseCell bottles and the framed 1,000 l), the
 * DoseCell head alone, the distribution panel (today's WH-CP1 beside its
 * replacement on trial, prompt 091) and the chemical pipes.
 */
export const PURPOSE =
  'The chemical distribution: bulk tanks, transfer pumps, selectors, dose bottles and their panel';
export const FINISH = { wall: '#bfc6c2', floor: '#777c7b', blockwork: true };

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Hypochlorite bulk tank',
    reference:
      'A 4,000 L framed black HDPE tank after DENIOS, ultrasonic level, local display, high-high switch, vent',
    size: { w: 3.0, d: 2.0, h: 2.6, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createBulkTankDemo(kit, 'hypochlorite'),
  },
  {
    title: 'Acid bulk tank',
    reference:
      'The same tank for 10% hydrochloric acid: 80 GHz radar level, carbon vent filter',
    size: { w: 3.0, d: 2.0, h: 2.6, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createBulkTankDemo(kit, 'acid'),
  },
  {
    title: 'Hypochlorite transfer pump',
    reference:
      'A sealless magnetic-drive transfer pump (Iwaki MX class) on a bunded skid; diaphragm-seal gauge, NRV, relief to tank',
    size: { w: 2.1, d: 1.2, h: 1.8, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createTransferPumpSkid(kit, 'hypochlorite'),
  },
  {
    title: 'Acid transfer pump',
    reference:
      'A sealless magnetic-drive transfer pump for 10% hydrochloric acid on a bunded skid',
    size: { w: 2.1, d: 1.2, h: 1.8, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createTransferPumpSkid(kit, 'acid'),
  },
  {
    title: 'DoseCell head, hypochlorite',
    reference:
      'Chlorella DoseCell: the powered head on every dose bottle; ultrasonic level, high and low switches, dosing pump, 16 × 2 LCD and HI, LO, CALL and PUMP lamps; yellow band',
    size: { w: 0.6, d: 0.6, h: 1.3, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createDoseCellDemo(kit, { acid: false }),
  },
  {
    title: 'DoseCell head, acid',
    reference: 'The same head on an acid bottle, its band red',
    size: { w: 0.6, d: 0.6, h: 1.3, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createDoseCellDemo(kit, { acid: true }),
  },
  {
    title: 'Peristaltic dosing pump',
    reference:
      'Grundflow PERI 30, after the Watson-Marlow Qdos: a roller pump head under a clear guard, a colour TFT and membrane keys (START, STOP, ▲, ▼) that work',
    size: { w: 0.6, d: 0.6, h: 1.3, mount: 'floor' },
    maker: 'grundflow',
    build: (kit) => createPeristalticDemo(kit),
  },
  {
    title: 'Day tank sizes',
    reference:
      'Every day tank the building uses, smallest to largest: Chlorella DoseCell bottles of 15 to 500 L (sensor, switches, pump and display in one powered head), and the framed 1,000 L tank',
    size: { w: 11.2, d: 1.6, h: 2.0, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createDayTankRange(kit),
  },
  {
    title: 'Transfer trial: ideal source, selector, four day tanks',
    reference:
      'An ideal hypochlorite source, the transfer pump, a six-way transfer selector (two outlets blanked) and four day tanks on one tested state, run ten times fast',
    size: { w: 15.6, d: 2.0, h: 2.4, mount: 'floor' },
    build: (kit) => createTransferTrial(kit, 'hypochlorite'),
  },
  {
    title: 'Chemical distribution panels, today’s and the new',
    reference:
      'WH-CP1 as the wet hall has it today, and its replacement on trial (prompt 091): Penfold OT-216 terminals for hypochlorite and acid (16 × 2 LCD, F1 MON, F2 SET, F3 CMD, ESC, ENTER, cursor keys, LOCAL ACCESS key) and their control box (isolator, MCB, PLC after a LOGO! 8), all on one trial of both lines ten times fast, with a trial station for the local controls and faults',
    size: { w: 4.7, d: 0.8, h: 2.3, mount: 'floor' },
    build: (kit) => createChemControlPrototype(kit, { oldPanel: true }),
  },
  {
    // Prompt 089, item 3: tried here before the plant rooms.
    title: 'Bund floor markings',
    reference:
      'A 50 mm yellow-and-black hazard stripe a short way out round each bund, giving way to walls and machines, the chemical stencilled before it',
    size: { w: 3.2, d: 2.2, h: 1.2, mount: 'floor' },
    build: (kit) => createBundMarkingDemo(kit),
  },
  {
    title: 'Level instruments',
    reference:
      'The bulk tanks’ level transmitters, ultrasonic (after Siemens Probe LU) and 80 GHz radar (after VEGAPULS C 21), and the Kessler-Moody LI-5 field indicator they drive',
    size: { w: 0.7, d: 0.7, h: 1.4, mount: 'floor' },
    build: (kit) => createLevelInstrumentsDemo(kit),
  },
  {
    title: 'Chemical isolation valves',
    reference:
      'PVC-U true-union ball valves after GF type 546, DN15 for small lines and DN40 at the bulk tanks; red quarter-turn handles that turn',
    size: { w: 0.6, d: 0.6, h: 1.3, mount: 'floor' },
    build: (kit) => createChemicalValveDemo(kit),
  },
  {
    title: 'Dosing valves',
    reference:
      'The small valves of the chemical lines, each working: a motorised DN15 ball valve (after GF type 107), a DN10 solenoid valve, a multifunction valve (relief, anti-siphon, priming), an injection valve that scales up, a back-pressure valve, a foot valve and strainer, and a three-way valve to the calibration column',
    size: { w: 2.1, d: 0.7, h: 1.3, mount: 'floor' },
    build: (kit) => createDosingValvesDemo(kit),
  },
  {
    title: 'Leak detection',
    reference:
      'A double-contained line’s low point (drain valve, sight tube, conductivity probe after the Raychem TT-MINI-PROBE) and a four-zone monitor after GF’s 918Q: a seep every few minutes; drain it and RESET',
    size: { w: 1.6, d: 0.6, h: 1.6, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createLeakDetectionDemo(kit),
  },
  {
    title: 'Chemical pipes',
    reference:
      'Double-contained ABS (DN25 in DN63) with leak detection; solvent-welded ABS; PE dosing tube 6 × 4 mm',
    size: { w: 2.0, d: 0.5, h: 1.7, mount: 'floor' },
    build: (kit) => createChemicalPipeSamples(kit),
  },
];

/** A square room, its exhibits round all four walls, so less walking (the owner, 2026-10-27). */
export const layoutRoom = (sizes: readonly ExhibitSize[]) =>
  layoutSquarePlantRoom(sizes);
