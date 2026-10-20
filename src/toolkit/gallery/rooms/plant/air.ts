import type { PlantExhibit } from './exhibit';
import {
  createAttenuator,
  createExtractFan,
  createPoolHallAhu,
  createWeatherLouvre,
} from '../../../components/plant/views/air-handling';

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Pool hall air handling, dehumidification, heat recovery and extract';

/**
 * The room's equipment, in the order it is shown: each after a real
 * product (`doc/research/plant-products-boiler-air.md`).
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Pool hall air handling unit',
    reference:
      'After Dantherm DanX 3/6 XWPS: plate HX and heat pump, 4135 × 1960 × 880 mm',
    size: { w: 4.6, d: 1.4, h: 2.8, mount: 'floor' },
    build: createPoolHallAhu,
  },
  {
    title: 'Splitter attenuator',
    reference:
      '1200 mm long, 800 × 600 duct, 100 mm splitters (typical, cut away)',
    size: { w: 1.3, d: 0.9, h: 1.2, mount: 'floor' },
    build: createAttenuator,
  },
  {
    title: 'Changing area extract fan',
    reference:
      'After Systemair MUB 062 630D4, about 720 mm square, Ø630 connections',
    size: { w: 1.4, d: 0.8, h: 1.4, mount: 'floor' },
    build: createExtractFan,
  },
  {
    title: 'Weather louvre',
    reference: 'After Gilberts WG75: 75 mm pitch, 45° blades, 100 mm frame',
    size: { w: 1.6, d: 0.15, h: 1.2, mount: 'wall', y: 1.6 },
    build: (kit) => createWeatherLouvre(kit),
  },
];
