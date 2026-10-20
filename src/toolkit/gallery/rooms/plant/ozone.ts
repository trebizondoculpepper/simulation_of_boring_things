import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import {
  createAirDryer,
  createContactTank,
  createDeozoniser,
  createFaultSimulator,
  createInjectorSkid,
  createOffGasDestructor,
  createOzoneGenerator,
  createOzoneMonitor,
} from '../../../components/plant/views/ozone-plant';
import type { OzoneMachineView } from '../../../components/plant/views/ozone-plant';
import { ozoneRoom } from '../../../components/plant/logic/ozone-room';

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Ozone: air dryer, generator, injector, contact tank, deozoniser and monitor';

/**
 * The ozone room, working: one ozone plant (`src/game/plant/ozone.ts`),
 * stepped once a frame by the generator's exhibit, which every machine
 * shows and works. Its circulation flow, cooling water and power are the
 * plant's at rest, for now; the room's machines are each after a real
 * product (`doc/research/ozone-plant.md`).
 */
const room = ozoneRoom();

// A development handle for the console: the ozone room's plant.
if (typeof window !== 'undefined')
  (window as unknown as { ozoneRoom: unknown }).ozoneRoom = room;

/** A machine that only shows the plant. */
const showing =
  (make: (kit: PanelKit) => OzoneMachineView) =>
  (kit: PanelKit): LiveExhibit => {
    const view = make(kit);
    return {
      object: view.group,
      parts: view.parts,
      update: (delta) => view.show(room.shown(), delta),
    };
  };

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Ozone generator',
    reference:
      'After ProMinent Bono Zon BONa 2D: 160 g/h corona discharge, 1600 × 1950 × 500 mm, water cooled',
    size: { w: 1.6, d: 0.5, h: 1.95, mount: 'floor' },
    build(kit): LiveExhibit {
      const view = createOzoneGenerator(kit, room.generatorControls);
      return {
        object: view.group,
        parts: view.parts,
        update(delta) {
          room.step(delta);
          view.show(room.shown(), delta);
        },
      };
    },
  },
  {
    title: 'Air dryer',
    reference:
      'Twin-tower heatless desiccant dryer and oil-free compressor, dew point −60 °C',
    size: { w: 0.9, d: 0.6, h: 1.65, mount: 'floor' },
    build: showing(createAirDryer),
  },
  {
    title: 'Booster pump and venturi injector',
    reference:
      'Close-coupled booster and PVC-U venturi on a side stream of the filtered main',
    size: { w: 1.7, d: 0.6, h: 1.8, mount: 'floor' },
    build: (kit) => {
      const view = createInjectorSkid(kit, { hoa: room.booster });
      return {
        object: view.group,
        parts: view.parts,
        update: (delta) => view.show(room.shown(), delta),
      };
    },
  },
  {
    title: 'Contact tank',
    reference:
      'GRP vessel, Ø1.8 × 2.2 m: two minutes of 160 m³/h (PWTAG: 2 min at 1 g/m³)',
    size: { w: 2.0, d: 2.0, h: 3.05, mount: 'floor' },
    build: showing(createContactTank),
  },
  {
    title: 'Activated carbon deozoniser',
    reference:
      'Steel pressure vessel, Ø1.5 m, of granular activated carbon; DIN 19643: 0.05 mg/l of ozone at most after it',
    size: { w: 1.9, d: 1.7, h: 2.75, mount: 'floor' },
    build: showing(createDeozoniser),
  },
  {
    title: 'Off-gas destructor',
    reference:
      'Heated catalytic destructor on the contact tank’s vent, 0.55 × 0.42 × 0.3 m',
    size: { w: 0.6, d: 0.32, h: 0.75, mount: 'wall', y: 2.1 },
    build: showing(createOffGasDestructor),
  },
  {
    title: 'Ozone in air monitor',
    reference:
      'Electrochemical monitor, sampling head 0.35 m above the floor (PWTAG); EH40: 0.2 ppm over 15 min',
    size: { w: 0.4, d: 0.15, h: 1.6, mount: 'wall', y: 1.1 },
    build: (kit) => {
      const view = createOzoneMonitor(kit, room.monitorControls);
      return {
        object: view.group,
        parts: view.parts,
        update: (delta) => view.show(room.shown(), delta),
      };
    },
  },
  {
    title: 'Fault simulator',
    reference:
      'Commissioning key switches: each puts one of the faults PWTAG says must stop the plant on it',
    size: { w: 1.1, d: 0.15, h: 0.4, mount: 'wall', y: 1.4 },
    build: (kit) => {
      const view = createFaultSimulator(kit, [
        {
          legend: 'NO FLOW',
          set: (on) => room.fault('circulationStopped', on),
        },
        { legend: 'COOLING', set: (on) => room.fault('coolingShut', on) },
        { legend: 'DRYER', set: (on) => room.fault('dryerHeater', on) },
        { legend: 'DOOR', set: (on) => room.fault('doorOpen', on) },
        { legend: 'LEAK', set: (on) => room.fault('leak', on) },
        { legend: 'DESTRUCTOR', set: (on) => room.fault('destructor', on) },
      ]);
      return {
        object: view.group,
        parts: view.parts,
        update: (delta) => view.show(room.shown(), delta),
      };
    },
  },
];
