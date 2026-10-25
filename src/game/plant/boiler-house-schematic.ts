import type {
  RoomSchematic,
  SchematicFitting,
  SchematicNode,
} from './schematics';
import { link, roomElectrics } from './schematic-parts';

/**
 * The boiler house's schematic (prompt 064; the owner, 2026-10-25: every
 * room's design kept, every component in the model): its three cascades
 * of two condensing boilers each, their flues and gas, the flow and return
 * headers to the low-loss header, the circulator and the LTHW to the
 * building and the calorifier, the pressurisation, the hot water, its
 * panels and mimics, and the room's electrics. Its valves are the world's
 * installed valves, under their asset ids and plates. Pure.
 */

const room = 'boiler_house';
const machine = (id: string, kind: string, name: string): SchematicNode => ({
  id,
  kind,
  name,
});

const cascades = [1, 2, 3].map((n) =>
  machine(`cascade-${n}`, 'boiler-cascade', `Condensing boilers, cascade ${n}`),
);
/** Each cascade's two boilers, B-501 to B-506, as the world numbers them. */
const boilers = [1, 2, 3, 4, 5, 6].map((k) =>
  machine(`B-50${k}`, 'boiler', `Boiler B-50${k}`),
);
const circulator = machine(
  'circulator',
  'lthw-pumps',
  'Twin-head LTHW circulator',
);
const calorifier = machine('calorifier', 'calorifier', 'Hot-water calorifier');
const pressurisation = machine(
  'pressurisation',
  'pressurisation',
  'Pressurisation unit and expansion vessel',
);
const gasSafety = machine(
  'gas-safety',
  'gas-safety',
  'Gas detection and emergency stop',
);
const mimicGas = machine('mimic-gas', 'mimic-gas', 'Mimic: boiler house gas');
const mimicHeat = machine(
  'mimic-heat',
  'mimic-boiler-heat',
  'Mimic: boiler status and heat output',
);
const combustion = machine(
  'combustion',
  'combustion-panel',
  'Combustion and ventilation panel',
);
const electrics = roomElectrics(room, [
  ...cascades,
  circulator,
  pressurisation,
  gasSafety,
  mimicGas,
  mimicHeat,
  combustion,
]);

const valve = (id: string, edge: string, role: string): SchematicFitting => ({
  id,
  kind: 'isolating-valve',
  edge,
  end: 'source',
  normally: 'open',
  role,
  keptBy: 'register',
});

export const BOILER_HOUSE_SCHEMATIC: RoomSchematic = {
  room,
  code: 'BH',
  nodes: [
    ...cascades,
    ...boilers,
    ...[1, 2, 3].map((n) =>
      machine(`stack-${n}`, 'flue-stack', `Cascade ${n} flue stack`),
    ),
    machine('low-loss', 'low-loss-header', 'Low-loss header'),
    circulator,
    calorifier,
    pressurisation,
    machine('gas-train', 'gas-train', 'Gas train'),
    machine('dosing-pot', 'dosing-pot', 'Dosing pot'),
    gasSafety,
    mimicGas,
    mimicHeat,
    combustion,
    machine('gas-header', 'header', 'Gas header'),
    machine('flow-header', 'header', 'Boiler flow header'),
    machine('return-header', 'header', 'Boiler return header'),
    machine('flow-tee', 'header', 'LTHW flow manifold'),
    machine('return-tee', 'header', 'LTHW return manifold'),
    machine('gas-supply', 'gas-supply', 'Gas supply'),
    machine('building', 'building-heating', 'Building heating'),
    machine('water', 'water-service', 'Water service'),
    machine('hot-water', 'building-hot-water', 'Building hot water'),
    ...electrics.nodes,
  ],
  links: [
    ...[1, 2, 3].flatMap((n) =>
      (['A', 'B'] as const).map((side, i) =>
        link(
          `Cascade ${n} flue connector ${side}`,
          [`B-50${2 * n - 1 + i}`, 'flue'],
          [`stack-${n}`, `in-${side}`],
          'flue',
        ),
      ),
    ),
    link('Gas service', ['gas-supply', 'out'], ['gas-train', 'in'], 'gas'),
    link('Gas main', ['gas-train', 'out'], ['gas-header', 'in'], 'gas'),
    ...[1, 2, 3, 4, 5, 6].flatMap((k) => [
      link(
        `B-50${k} gas drop`,
        ['gas-header', `out-${k}`],
        [`B-50${k}`, 'gas'],
        'gas',
      ),
      link(
        `B-50${k} flow`,
        [`B-50${k}`, 'flow'],
        ['flow-header', `in-${k}`],
        'water',
      ),
      link(
        `B-50${k} return`,
        ['return-header', `out-${k}`],
        [`B-50${k}`, 'return'],
        'water',
      ),
    ]),
    link(
      'Boiler flow to the low-loss header',
      ['flow-header', 'out'],
      ['low-loss', 'boiler-flow'],
      'water',
    ),
    link(
      'Boiler return from the low-loss header',
      ['low-loss', 'boiler-return'],
      ['return-header', 'in'],
      'water',
    ),
    link(
      'LTHW system flow',
      ['low-loss', 'system-flow'],
      ['circulator', 'suction'],
      'water',
    ),
    link(
      'LTHW flow riser',
      ['circulator', 'discharge'],
      ['flow-tee', 'in'],
      'water',
    ),
    link(
      'LTHW flow to building',
      ['flow-tee', 'building'],
      ['building', 'flow'],
      'water',
    ),
    link(
      'Calorifier primary flow',
      ['flow-tee', 'calorifier'],
      ['calorifier', 'primary-flow'],
      'water',
    ),
    link(
      'LTHW return from building',
      ['building', 'return'],
      ['return-tee', 'building'],
      'water',
    ),
    link(
      'Calorifier primary return',
      ['calorifier', 'primary-return'],
      ['return-tee', 'calorifier'],
      'water',
    ),
    link(
      'LTHW return main',
      ['return-tee', 'out'],
      ['low-loss', 'system-return'],
      'water',
    ),
    link(
      'Pressurisation fill',
      ['pressurisation', 'out'],
      ['return-tee', 'fill'],
      'water',
    ),
    link(
      'Calorifier cold feed',
      ['water', 'out'],
      ['calorifier', 'cold'],
      'water',
    ),
    link(
      'Hot water flow',
      ['calorifier', 'hot'],
      ['hot-water', 'flow'],
      'water',
    ),
    link(
      'Hot water secondary return',
      ['hot-water', 'return'],
      ['calorifier', 'secondary-return'],
      'water',
    ),
    link(
      'Heating circuit dosing',
      ['dosing-pot', 'out'],
      ['return-tee', 'dose'],
      'chemical',
    ),
    ...electrics.links,
  ],
  fittings: [
    ...[1, 2, 3, 4, 5, 6].map((k) =>
      valve(`valve-00${36 + k}`, `B-50${k} gas drop`, `gas${k}`),
    ),
    valve('valve-0043', 'LTHW flow riser', 'lthwFlow'),
  ],
  rules: { isolate: new Set(), pumps: new Set() },
};
