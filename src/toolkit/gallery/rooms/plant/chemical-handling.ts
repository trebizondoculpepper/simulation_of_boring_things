import type { PlantExhibit } from './exhibit';
import { layoutSquarePlantRoom } from '../../logic/plant-room-layout';
import type { ExhibitSize } from '../../logic/plant-room-layout';
import { createDoseCellDemo } from '../../../components/plant/views/dose-cell-head';
import {
  createBulkTankDemo,
  createChemicalPipeSamples,
  createDayTankRange,
  createDistributionPanelDemo,
  createTransferPumpSkid,
  createTransferTrial,
} from '../../../components/plant/views/chemical-handling-kit';

/**
 * Dev44: the chemical distribution's components as worked out with the
 * owner (2026-10-26/27), each real and working: the stores' framed bulk
 * tanks, the transfer pump skids, the selector and day tanks in a trial,
 * every day tank size (the DoseCell bottles and the framed 1,000 l), the
 * DoseCell head alone, the distribution panel and the chemical pipes.
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
    title: 'Chemical distribution panel',
    reference:
      'The wet hall’s panel, Penfold Controls: each store and day tank on a meter, filling lamps, selector and pump lamps, an annunciator; run by its own trials',
    size: { w: 1.7, d: 0.6, h: 2.1, mount: 'floor' },
    build: (kit) => createDistributionPanelDemo(kit),
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
