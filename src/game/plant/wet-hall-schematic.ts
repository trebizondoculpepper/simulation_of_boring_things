import type {
  RoomSchematic,
  SchematicFitting,
  SchematicNode,
} from './schematics';
import { link, roomElectrics } from './schematic-parts';

/**
 * The wet hall's schematic (prompt 064; the owner, 2026-10-25: every
 * room's design kept, every component in the model): the make-up from the
 * town main through the break tank, the booster set and the meter to the
 * pool plant rooms; the backwash from them to the holding tank and on to
 * the sewer; the tanks' overflows and drains; the mimic; and the room's
 * electrics. Its valves are the world's installed valves, under their
 * asset ids and plates. Pure.
 */

const room = 'wet_hall';
const machine = (id: string, kind: string, name: string): SchematicNode => ({
  id,
  kind,
  name,
});

const breakTank = machine(
  'break-tank',
  'break-tank',
  'Make-up break tank (Category 5)',
);
const booster = machine(
  'booster',
  'booster-set',
  'Make-up booster set, duty and standby',
);
const meter = machine('meter', 'water-meter', 'Make-up water meter');
// Our own flowmeter, straight after the utility's meter (the owner,
// 2026-10-26), wired to the make-up recorder.
const flowmeter = machine(
  'flowmeter',
  'make-up-flowmeter',
  'Make-up flowmeter',
);
const holding = machine('holding', 'backwash-tank', 'Backwash holding tank');
const mimic = machine('mimic', 'mimic-wet', 'Mimic: wet hall');
// The sewer outfall's monitor (the owner, 2026-10-26): its flowmeter's
// converter and its chart recorder, on the wall.
const outfall = machine(
  'outfall-monitor',
  'sewer-monitor',
  'Sewer outfall monitor',
);
// The make-up water's recorder (the owner, 2026-10-26): a pen plotter of
// the water used, from the meter's pulses.
const makeUpRecorder = machine(
  'make-up-recorder',
  'make-up-recorder',
  'Make-up water recorder',
);
const electrics = roomElectrics(room, [
  booster,
  flowmeter,
  mimic,
  outfall,
  makeUpRecorder,
]);

const valve = (
  id: string,
  edge: string,
  end: 'source' | 'target',
  normally: 'open' | 'closed',
  role: string,
): SchematicFitting => ({
  id,
  kind: 'isolating-valve',
  edge,
  end,
  normally,
  role,
  keptBy: 'register',
});

export const WET_HALL_SCHEMATIC: RoomSchematic = {
  room,
  code: 'WH',
  nodes: [
    breakTank,
    booster,
    meter,
    flowmeter,
    holding,
    mimic,
    outfall,
    makeUpRecorder,
    machine('town-main', 'water-main', 'Town main'),
    machine('plant-rooms', 'pool-plant-rooms', 'Pool plant rooms'),
    machine('sewer', 'sewer', 'Sewer'),
    machine('waste', 'gully', 'Drain to waste'),
    ...electrics.nodes,
  ],
  links: [
    link(
      'Town main to the break tank',
      ['town-main', 'out'],
      ['break-tank', 'inlet'],
      'water',
    ),
    // The make-up line (the owner, 2026-10-26): the break tank's outlet,
    // the utility's meter, our own flowmeter, the booster set's suction;
    // its discharge the make-up main to the pools.
    link(
      'Break tank to the meter',
      ['break-tank', 'outlet'],
      ['meter', 'inlet'],
      'water',
    ),
    link(
      'Meter to the flowmeter',
      ['meter', 'outlet'],
      ['flowmeter', 'inlet'],
      'water',
    ),
    link(
      'Flowmeter to the booster set',
      ['flowmeter', 'outlet'],
      ['booster', 'suction'],
      'water',
    ),
    link(
      'Make-up main to the pool plant rooms',
      ['booster', 'discharge'],
      ['plant-rooms', 'make-up'],
      'water',
    ),
    link(
      'Backwash main to the holding tank',
      ['plant-rooms', 'backwash'],
      ['holding', 'inlet'],
      'water',
    ),
    link(
      'Backwash discharge to the sewer',
      ['holding', 'outlet'],
      ['sewer', 'in'],
      'water',
    ),
    link(
      'Break tank overflow',
      ['break-tank', 'overflow'],
      ['waste', 'in'],
      'water',
    ),
    link('Break tank drain', ['break-tank', 'drain'], ['waste', 'in'], 'water'),
    link(
      'Backwash tank overflow',
      ['holding', 'overflow'],
      ['waste', 'in'],
      'water',
    ),
    link('Backwash tank drain', ['holding', 'drain'], ['waste', 'in'], 'water'),
    link(
      'Make-up flow to its recorder',
      ['flowmeter', 'signal'],
      ['make-up-recorder', 'flow'],
      'control',
    ),
    link(
      'Outfall flow to its monitor',
      ['holding', 'outfall-flow'],
      ['outfall-monitor', 'flow'],
      'control',
    ),
    link(
      'Wet hall signals to the mimic',
      ['booster', 'status'],
      ['mimic', 'control'],
      'control',
    ),
    ...electrics.links,
  ],
  fittings: [
    valve(
      'valve-0031',
      'Town main to the break tank',
      'source',
      'open',
      'townMainStop',
    ),
    valve(
      'valve-0032',
      'Break tank to the meter',
      'source',
      'open',
      'breakTankOutlet',
    ),
    valve(
      'valve-0033',
      'Make-up main to the pool plant rooms',
      'source',
      'open',
      'makeUpMain',
    ),
    valve(
      'valve-0034',
      'Backwash discharge to the sewer',
      'source',
      'closed',
      'backwashDischarge',
    ),
    valve(
      'valve-0035',
      'Break tank drain',
      'source',
      'closed',
      'breakTankDrain',
    ),
    valve(
      'valve-0036',
      'Backwash tank drain',
      'source',
      'closed',
      'backwashTankDrain',
    ),
  ],
  rules: { isolate: new Set(), pumps: new Set() },
};
