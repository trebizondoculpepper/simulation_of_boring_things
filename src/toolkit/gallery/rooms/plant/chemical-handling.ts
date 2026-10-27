import type { PlantExhibit } from './exhibit';
import { createChemicalDeliveryRig } from '../../../components/plant/views/chemical-delivery-rig';
import { EXHIBITS as STORE_EXHIBITS } from './chemicals';
import {
  createChemicalPipeSamples,
  createDayTankRange,
  createDayTankStation,
  createTransferPumpSkid,
  createTransferTrial,
} from '../../../components/plant/views/chemical-handling-kit';

/** Dev44: the live, isolated trial before chemical deliveries reach the site. */
export const PURPOSE =
  'Pre-connected chemical tanker hoses, separate bulk stores, supervised transfer and overfill trips';
export const FINISH = { wall: '#bfc6c2', floor: '#777c7b', blockwork: true };

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Hypochlorite bulk delivery trial',
    reference:
      'Three 4,000 L Enduramaxx CTB4000-style bunded tanks; dedicated DN50 fill point; 100 L/min demonstration transfer',
    size: { w: 9.0, d: 8.5, h: 2.8, mount: 'floor' },
    build: (kit) => createChemicalDeliveryRig(kit, 'hypochlorite'),
  },
  {
    title: 'Acid bulk delivery trial',
    reference:
      'One 4,000 L Enduramaxx CTB4000-style bunded tank for 10% hydrochloric acid; dedicated DN40 fill point; 60 L/min demonstration transfer',
    size: { w: 6.0, d: 8.5, h: 2.8, mount: 'floor' },
    build: (kit) => createChemicalDeliveryRig(kit, 'acid'),
  },
  {
    title: 'Hypochlorite transfer pump',
    reference:
      'A sealless magnetic-drive transfer pump (Iwaki MX class) on a bunded skid; diaphragm-seal gauge, NRV, relief to tank',
    size: { w: 2.1, d: 1.2, h: 1.8, mount: 'floor' },
    maker: 'grundflow',
    build: (kit) => createTransferPumpSkid(kit, 'hypochlorite'),
  },
  {
    title: 'Acid transfer pump',
    reference:
      'A sealless magnetic-drive transfer pump for 10% hydrochloric acid on a bunded skid',
    size: { w: 2.1, d: 1.2, h: 1.8, mount: 'floor' },
    maker: 'grundflow',
    build: (kit) => createTransferPumpSkid(kit, 'acid'),
  },
  {
    title: 'Hypochlorite day tank',
    reference:
      '300 L framed HDPE day tank in its bund; low and high switches, actuated inlet, dosing pump, eyewash and PPE',
    size: { w: 1.9, d: 1.1, h: 2.0, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createDayTankStation(kit, 'hypochlorite'),
  },
  {
    title: 'Acid day tank',
    reference:
      '300 L framed HDPE day tank for 10% hydrochloric acid in its bund, with its switches, inlet, dosing pump and safety gear',
    size: { w: 1.9, d: 1.1, h: 2.0, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createDayTankStation(kit, 'acid'),
  },
  {
    title: 'Day tank sizes',
    reference:
      'Every framed day tank the building uses, smallest to largest: 15, 30, 60, 200, 300, 500 and 1,000 L, each labelled with the pools it serves',
    size: { w: 11.2, d: 1.6, h: 2.0, mount: 'floor' },
    maker: 'chlorella',
    build: (kit) => createDayTankRange(kit),
  },
  {
    title: 'Transfer trial: ideal source, selector, four day tanks',
    reference:
      'An ideal hypochlorite source, the transfer pumps, a six-way transfer selector (two outlets blanked) and four day tanks on one tested state, run ten times fast',
    size: { w: 15.6, d: 2.0, h: 2.4, mount: 'floor' },
    build: (kit) => createTransferTrial(kit, 'hypochlorite'),
  },
  {
    title: 'Chemical pipes',
    reference:
      'Double-contained ABS (DN25 in DN63) with leak detection; solvent-welded ABS; PE dosing tube 6 × 4 mm',
    size: { w: 2.0, d: 0.5, h: 1.7, mount: 'floor' },
    build: (kit) => createChemicalPipeSamples(kit),
  },
  ...STORE_EXHIBITS.filter((item) =>
    [
      'Chemical spill kit',
      'Safety shower and eyewash',
      'PPE cabinet',
      'Extract and chlorine detection',
      'Store signs',
    ].includes(item.title),
  ),
];
