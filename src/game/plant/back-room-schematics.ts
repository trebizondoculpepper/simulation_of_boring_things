import type { PlumbEdge } from './plumbing-expansion';
import type { RoomSchematic, SchematicNode } from './schematics';
import { link, roomElectrics, storeTransfer } from './schematic-parts';

/**
 * The schematics of the building's back rooms that hold no pipework of
 * their own (prompt 064; the owner, 2026-10-25: every room's design kept,
 * every component in the model): the chemical stores, the loading bay, the
 * air plant, the control room and the engineers' office. Each names its
 * machines as the room draws them, what links them to the rest of the
 * plant, and the room's electrics. The stores' safety showers, spill kits
 * and PPE cabinets, and the control room's water-test kit, are set
 * decoration by the owner's rulings and are not here. Pure.
 */

const machine = (id: string, kind: string, name: string): SchematicNode => ({
  id,
  kind,
  name,
});

/** A room's schematic: its nodes and links, with its electrics feeding `powered`. */
function backRoom(
  room: string,
  code: string,
  nodes: readonly SchematicNode[],
  links: readonly PlumbEdge[],
  powered: readonly SchematicNode[],
): RoomSchematic {
  const electrics = roomElectrics(room, powered);
  return {
    room,
    code,
    nodes: [...nodes, ...electrics.nodes],
    links: [...links, ...electrics.links],
    fittings: [],
    rules: { isolate: new Set(), pumps: new Set() },
  };
}

/**
 * A chemical store (plan 085): its bulk tanks filled from the loading
 * bay's fill point, drawn by its transfer pump into its main to the wet
 * hall's selector; and its extract.
 */
function chemicalStore(
  room: string,
  code: string,
  chemical: 'hypochlorite' | 'acid',
  tanks: readonly SchematicNode[],
): RoomSchematic {
  const name = chemical === 'acid' ? 'Acid' : 'Hypochlorite';
  const extract = machine(
    'extract',
    'store-extract',
    'Extract and chlorine detection',
  );
  const transfer = storeTransfer(
    chemical,
    tanks.map((t) => t.id),
  );
  return backRoom(
    room,
    code,
    [
      ...tanks,
      extract,
      machine('delivery', 'fill-line', `${name} delivery line`),
      ...transfer.nodes,
      machine('outside', 'atmosphere', 'Outside air'),
    ],
    [
      ...tanks.map((t) =>
        link(`${t.name} fill`, ['delivery', 'out'], [t.id, 'fill'], 'chemical'),
      ),
      ...transfer.links,
      link('Store extract', ['extract', 'out'], ['outside', 'in'], 'air'),
    ],
    [extract, transfer.nodes[0]],
  );
}

export const HYPO_STORE_SCHEMATIC = chemicalStore(
  'hypo_store',
  'HS',
  'hypochlorite',
  [1, 2, 3].map((n) =>
    machine(`tank-${n}`, 'chem-bulk', `Sodium hypochlorite bulk tank ${n}`),
  ),
);

export const ACID_STORE_SCHEMATIC = chemicalStore('acid_store', 'AS', 'acid', [
  machine('tank-1', 'chem-bulk', 'Hydrochloric acid bulk tank'),
]);

export const LOADING_BAY_SCHEMATIC = backRoom(
  'loading_bay',
  'LB',
  // No tanker stand: the tanker is a lorry backed into its channel in the
  // dock (prompt 073), connected in the yard (076, 080).
  [
    // One fill cabinet, its two inlets on incompatible couplings, by the
    // tanker's bay; the hired generator's connection cabinet by the other
    // (the owner, 2026-10-27).
    machine('fill', 'fill-cabinet', 'Delivery fill cabinet'),
    machine(
      'generator-point',
      'generator-point',
      'Generator connection cabinet',
    ),
    machine('hypo-store', 'chemical-store', 'Hypochlorite store'),
    machine('acid-store', 'chemical-store', 'Acid store'),
    // Each store's main passes through the bay on its way to the wet hall
    // (the owner, 2026-10-27).
    machine('hypo-main', 'chemical-main', 'Hypochlorite main to the wet hall'),
    machine('acid-main', 'chemical-main', 'Acid main to the wet hall'),
  ],
  [
    link(
      'Hypochlorite delivery line',
      ['fill', 'hypochlorite'],
      ['hypo-store', 'fill'],
      'chemical',
    ),
    link(
      'Acid delivery line',
      ['fill', 'acid'],
      ['acid-store', 'fill'],
      'chemical',
    ),
    link(
      'Generator cable to the switch room',
      ['generator-point', 'out'],
      // On the changeover switch's II side (prompt 089, item 6).
      ['switch-room', 'generator'],
      'power',
    ),
    link(
      'Hypochlorite main through the bay',
      ['hypo-store', 'main'],
      ['hypo-main', 'in'],
      'chemical',
    ),
    link(
      'Acid main through the bay',
      ['acid-store', 'main'],
      ['acid-main', 'in'],
      'chemical',
    ),
  ],
  [],
);

/** The air plant's stacks: their units and the hall they serve (`air_plant`'s layout). */
const AHUS: readonly [string, readonly number[], string][] = [
  ['ahu-802', [802, 803, 804], 'olympic'],
  ['ahu-805', [805, 806, 807], 'olympic'],
  ['ahu-808', [808, 809, 810], 'olympic'],
  ['ahu-801', [801], 'lounge'],
  ['ahu-811', [811], 'jacuzzi'],
  ['ahu-812', [812], 'footbath'],
];
const HALL_NAMES: Record<string, string> = {
  olympic: 'OLYMPIC POOL HALL',
  lounge: 'LOUNGE POOL HALL',
  jacuzzi: 'JACUZZI ROOM',
  footbath: 'FOOTBATH PASSAGE',
};
const ahus = AHUS.map(([id, units, hall]) =>
  machine(
    id,
    'ahu-stack',
    units.length > 1
      ? `Air handling units ${units.map((u) => `AHU-${u}`).join(', ')}: ${HALL_NAMES[hall]}`
      : `Air handling unit AHU-${units[0]}: ${HALL_NAMES[hall]}`,
  ),
);
const mimicAir = machine('mimic-air', 'mimic-air', 'Mimic: air handling plant');
/** Each unit's four ducts, named as the room draws them: outdoor air in, exhaust out, supply to its hall, extract from it. */
const ductLinks = AHUS.flatMap(([id, units, hall]) =>
  units.flatMap((u) => [
    link(
      `AHU-${u} outdoor duct`,
      ['outside', 'intake'],
      [id, `outdoor-${u}`],
      'air',
    ),
    link(
      `AHU-${u} exhaust duct`,
      [id, `exhaust-${u}`],
      ['outside', 'discharge'],
      'air',
    ),
    link(
      `AHU-${u} supply duct`,
      [id, `supply-${u}`],
      [`hall-${hall}`, 'supply'],
      'air',
    ),
    link(
      `AHU-${u} extract duct`,
      [`hall-${hall}`, 'extract'],
      [id, `extract-${u}`],
      'air',
    ),
  ]),
);
export const AIR_PLANT_SCHEMATIC = backRoom(
  'air_plant',
  'AP',
  [
    ...ahus,
    mimicAir,
    machine('outside', 'atmosphere', 'Outside air'),
    ...Object.entries(HALL_NAMES).map(([h, name]) =>
      machine(`hall-${h}`, 'hall-air', `${name} air`),
    ),
  ],
  [
    ...ductLinks,
    ...ahus.map((a) =>
      link(
        `${a.name} to the mimic`,
        [a.id, 'status'],
        ['mimic-air', 'in'],
        'control',
      ),
    ),
  ],
  [...ahus, mimicAir],
);

/** The control room's instruments, each fed the plant's signals. */
const instruments = [
  machine('operator-desk', 'operator-desk', "Operator's desk, POOLMON"),
  machine('alarm-printer', 'alarm-printer', 'Alarm printer'),
  machine('mimic-pool', 'mimic-pool', 'Mimic: main pool circuit'),
  machine('mimic-heating', 'mimic-heating', 'Mimic: heating'),
  machine('mimic-air', 'mimic-air', 'Mimic: air handling'),
  machine('annunciator', 'annunciator', 'Alarm annunciator'),
  machine('chart-recorders', 'chart-recorders', 'Chart recorders'),
  machine('readout-board', 'readout-board', 'Readout board'),
  machine('bms-outstation', 'bms-outstation', 'BMS outstation'),
  machine('fire-repeater', 'fire-repeater', 'Fire alarm repeater'),
  machine('cctv', 'cctv', 'CCTV monitor'),
];
export const CONTROL_ROOM_SCHEMATIC = backRoom(
  'control_room',
  'CR',
  [...instruments, machine('plant', 'plant-signals', 'The plant’s signals')],
  instruments.map((i) =>
    link(`Signals to the ${i.name}`, ['plant', 'out'], [i.id, 'in'], 'control'),
  ),
  instruments,
);

const simulator = machine(
  'simulator',
  'scenario-simulator',
  'Hyperplasc Scenario Simulator',
);
/** The office's own wiring: a ring main from its switch-fuse, three twin sockets on it, and its PIR light switch. */
const ring = machine('ring', 'ring-main', 'Office ring main');
const sockets = ['Desk', 'East wall', 'South wall'].map((w) =>
  machine(
    `socket-${w.split(' ')[0].toLowerCase()}`,
    'twin-socket',
    `${w} twin socket`,
  ),
);
const pir = machine('pir', 'pir-switch', 'Office PIR light switch');
export const ENGINEERS_OFFICE_SCHEMATIC = backRoom(
  'engineers_office',
  'EO',
  [
    simulator,
    ring,
    ...sockets,
    pir,
    machine('lights', 'lighting-zone', 'Office lights'),
  ],
  [
    link(
      'Office 240 V ring main',
      ['switch-fuse', 'ring'],
      ['ring', 'in'],
      'power',
    ),
    ...sockets.map((k) =>
      link(`${k.name} conduit`, ['ring', 'out'], [k.id, 'in'], 'power'),
    ),
    link(
      'Office PIR control conduit',
      ['pir', 'out'],
      ['lights', 'control'],
      'control',
    ),
  ],
  [simulator],
);
