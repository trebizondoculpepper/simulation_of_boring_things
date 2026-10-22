import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createAhuStack } from '../../../components/plant/views/pool-ahu';
import { DANX_XWPS } from '../../../../game/plant-sizing/ahu-range';

const ahuSize = (model: string) => DANX_XWPS.find((s) => s.model === model)!;
import {
  createAttenuator,
  createExtractFan,
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
      'After Dantherm DanX 9/18 XWPS: plate HX and heat pump, 4660 × 2250 × 1800 mm, 20,000 m³/h; working controller',
    size: { w: 5.2, d: 2.4, h: 2.4, mount: 'floor' },
    build: (kit): LiveExhibit =>
      createAhuStack(kit, [
        {
          tag: 'AHU-DEV1',
          serves: 'DEVELOPMENT',
          hall: 'dev',
          size: ahuSize('9/18'),
          airflow: 19200,
        },
      ]),
  },
  {
    title: 'Air handling units, stacked',
    reference:
      'Two DanX 2/4 XWPS (3665 × 1660 × 880 mm) on a steel frame, as the air plant stacks them',
    size: { w: 4.2, d: 1.5, h: 3.6, mount: 'floor' },
    build: (kit): LiveExhibit =>
      createAhuStack(
        kit,
        ['AHU-DEV2', 'AHU-DEV3'].map((tag) => ({
          tag,
          serves: 'DEVELOPMENT',
          hall: 'dev',
          size: ahuSize('2/4'),
          airflow: 3000,
        })),
      ),
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
