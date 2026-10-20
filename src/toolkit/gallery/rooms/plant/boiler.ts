import type { PlantExhibit } from './exhibit';
import {
  createBoilerCascade,
  createCalorifier,
  createDosingPot,
  createGasSafetyBoard,
  createGasTrain,
  createLowLossHeader,
  createPressurisation,
  createTwinHeadPump,
} from '../../../components/plant/views/boiler-plant';

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Boilers, low-loss header, heating pumps, pressurisation and gas safety';

/**
 * The room's equipment, in the order it is shown: each after a real
 * product (`doc/research/plant-products-boiler-air.md`).
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Condensing boilers in cascade',
    reference:
      'After 2 × Remeha Gas 220 Ace 300 kW (800 × 1662 × 657 mm), common flue',
    size: { w: 2.4, d: 1.0, h: 3.2, mount: 'floor' },
    build: createBoilerCascade,
  },
  {
    title: 'Low-loss header',
    reference: 'After Hamworthy sizing: DN200, length 4 × diameter, < 0.5 m/s',
    size: { w: 1.0, d: 0.5, h: 1.7, mount: 'floor' },
    build: createLowLossHeader,
  },
  {
    title: 'Twin-head LTHW circulator',
    reference: 'After Grundfos MAGNA3 D 65-120 F, DN65, 340 mm port to port',
    size: { w: 1.6, d: 0.8, h: 1.3, mount: 'floor' },
    build: createTwinHeadPump,
  },
  {
    title: 'Pressurisation unit and expansion vessel',
    reference:
      'After Reflex G 300 (Ø634 × 1272 mm) and Mikrofill MIDI (504 × 415 × 270 mm)',
    size: { w: 1.4, d: 0.7, h: 1.6, mount: 'floor' },
    build: createPressurisation,
  },
  {
    title: 'Hot-water calorifier',
    reference: 'After ICS Cool Energy Calorifier 1000, Ø1000 × 1850 mm',
    size: { w: 1.7, d: 1.2, h: 2.3, mount: 'floor' },
    build: createCalorifier,
  },
  {
    title: 'Gas train',
    reference:
      'After Itron G25 meter (280 mm centres) and Elektrogas VMR6 2" safety valve',
    size: { w: 2.2, d: 0.6, h: 1.7, mount: 'floor' },
    build: createGasTrain,
  },
  {
    title: 'Dosing pot',
    reference: 'After Flamco 11 litre, Ø215 × 935 mm, ¾", 16 bar',
    size: { w: 0.7, d: 0.3, h: 1.2, mount: 'wall', y: 1.2 },
    build: createDosingPot,
  },
  {
    title: 'Gas detection and emergency stop',
    reference: 'After Crowcon Gasflag (210 × 145 × 46 mm); boiler house stop',
    size: { w: 1.4, d: 0.15, h: 1.8, mount: 'wall', y: 1.6 },
    build: createGasSafetyBoard,
  },
];
