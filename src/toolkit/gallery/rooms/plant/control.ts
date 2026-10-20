import type { PlantExhibit } from './exhibit';
import {
  createBmsOutstation,
  createCctvMonitor,
  createFireRepeater,
  createOperatorDesk,
  createPoolAlarm,
  createSchematicBoard,
  createWaterControllerDisplay,
  createWaterTestKit,
} from '../../../components/plant/views/control-room';

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Building management, alarm annunciation, CCTV and water testing';

/** The room's equipment, in the order it is shown. */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: "Plant operator's desk",
    reference:
      'SCADA on two 24-inch screens (about 540 × 320 mm), desk phone, plant logbook; desk 1800 × 800',
    size: { w: 1.8, d: 0.85, h: 1.25, mount: 'floor' },
    build: createOperatorDesk,
  },
  {
    title: 'Water-test kit',
    reference:
      'After Palintest Pooltest 25 photometer kit, case about 270 × 170 mm',
    size: { w: 0.8, d: 0.5, h: 1.1, mount: 'floor' },
    build: createWaterTestKit,
  },
  {
    title: 'BMS outstation',
    reference:
      'After Trend IQ4E controller and I/O in a Rittal AE 1076, 600 × 760 × 210 mm',
    size: { w: 0.62, d: 0.75, h: 0.78, mount: 'wall', y: 1.4 },
    build: createBmsOutstation,
  },
  {
    title: 'Pool water controller display',
    reference: 'After ProMinent DULCOMARIN 3, 430 × 290 × 150 mm',
    size: { w: 0.44, d: 0.16, h: 0.3, mount: 'wall', y: 1.5 },
    build: createWaterControllerDisplay,
  },
  {
    title: 'Fire alarm repeater',
    reference: 'After Kentec Syncro View, 330 × 255 × 90 mm',
    size: { w: 0.34, d: 0.1, h: 0.26, mount: 'wall', y: 1.5 },
    build: createFireRepeater,
  },
  {
    title: 'CCTV monitor',
    reference:
      '22-inch monitor on a wall bracket, about 510 × 300 mm, four cameras',
    size: { w: 0.52, d: 0.16, h: 0.31, mount: 'wall', y: 1.7 },
    build: createCctvMonitor,
  },
  {
    title: 'Poolside emergency alarm',
    reference:
      'After Hoyles Aidalarm A600 (receiver about 250 × 180 × 80 mm), call point and sounder',
    size: { w: 0.7, d: 0.1, h: 0.2, mount: 'wall', y: 1.4 },
    build: createPoolAlarm,
  },
  {
    title: 'Plant schematic',
    reference: 'Wall chart 1800 × 1000 mm, BS 1710 colours and control tags',
    size: { w: 1.84, d: 0.03, h: 1.04, mount: 'wall', y: 1.6 },
    build: createSchematicBoard,
  },
];
