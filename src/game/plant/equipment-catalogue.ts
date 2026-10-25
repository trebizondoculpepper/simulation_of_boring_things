import {
  EQUIPPED_ROOMS,
  roomEquipment,
} from '../../toolkit/gallery/logic/room-equipment';
import type { Item } from '../../toolkit/gallery/logic/room-equipment';
import type { Block } from '../sim/blocks';
import { newIdentifiedPlant, walkIdentified } from './identification';
import { INSTALLED_ASSET_IDS } from './installed-asset-ids';
import { INSTALLED_VALVES, newInstalledValveStates } from './installed-valves';
import { ROOM_SWITCH_FUSES } from './installed-feeders';
import { INSTALLED_FIXTURES } from './installed-fixtures';
import { newPlantServices } from './services';
import type { ServiceRoom } from './services';
import type { BrandId } from '../../toolkit/components/core/logic/brands';
import { PLACED_KINDS } from './equipment-kinds';
import type { KindId } from './equipment-kinds';
import {
  POWER_FOR,
  STATUS_BINDINGS,
  describeComponent,
  placesByKind,
} from './component-descriptions';
import type {
  DescribedSubject,
  DescriptionContext,
} from './component-descriptions';
import { MODEL_VALVE_ENDS } from './valve-endpoints';
import type { Classification, EquipmentKind } from './equipment-kinds';

/** Room codes are fixed, so an equipment tag keeps its location in its name. */
export const EQUIPMENT_ROOM_CODES = {
  plant_pool_01: 'PL1',
  plant_pool_02: 'PL2',
  plant_pool_03: 'PL3',
  plant_pool_04: 'PL4',
  wet_hall: 'WH',
  boiler_house: 'BH',
  hypo_store: 'HS',
  acid_store: 'AS',
  loading_bay: 'LB',
  switch_room: 'SR',
  air_plant: 'AP',
  control_room: 'CR',
  engineers_office: 'EO',
} as const;

export interface CataloguedEquipment {
  assetId: string;
  id: string;
  room: string;
  key: string;
  name: string;
  kind: string;
  brand: BrandId | 'unbranded';
  class: Exclude<Classification, 'decorative'>;
  purpose: string;
}

export interface InventoryEntry {
  assetId?: string;
  id: string;
  name: string;
  /** Physical component family, separate from the broad plant classification. */
  kind: string;
  brand: BrandId | 'unbranded';
  class: 'plant' | 'non-plant';
  purpose: string;
  normal?: string;
  state?: unknown;
  depth: number;
  /** A saved control may still be awaiting a causal circuit connection. */
  source: 'model' | 'control' | 'placement';
}

const ROOM_NAMES: Record<string, string> = {
  plant_pool_01: 'Lounge pool plant room',
  plant_pool_02: 'Olympic pool plant room',
  plant_pool_03: 'Jacuzzi plant room',
  plant_pool_04: 'Footbath plant room',
  wet_hall: 'Wet hall',
  boiler_house: 'Boiler house',
  hypo_store: 'Hypochlorite store',
  acid_store: 'Acid store',
  loading_bay: 'Loading bay',
  switch_room: 'Electrical switch room',
  air_plant: 'Air plant',
  control_room: 'Plant control room',
  engineers_office: 'Engineers’ office',
};

/** Catalogues the actual placed item definitions; unknown keys fail loudly. */
export function equipmentCatalogue(): CataloguedEquipment[] {
  const result: CataloguedEquipment[] = [];
  for (const room of EQUIPPED_ROOMS) {
    const items = roomEquipment(room)?.items;
    if (!items) throw new Error(`Missing equipment room ${room}`);
    result.push(...catalogueItems(room, items));
  }
  return result;
}

export function catalogueItems(
  room: (typeof EQUIPPED_ROOMS)[number],
  items: readonly Item[],
): CataloguedEquipment[] {
  const result: CataloguedEquipment[] = [];
  for (const item of items) {
    const key = item.key.split(':')[0];
    if (key === 'sign') continue;
    const kind: EquipmentKind | undefined = Object.hasOwn(PLACED_KINDS, key)
      ? PLACED_KINDS[key as keyof typeof PLACED_KINDS]
      : undefined;
    if (!kind) throw new Error(`Unclassified equipment ${room}/${item.key}`);
    if (kind.class === 'decorative') continue;
    const installed = INSTALLED_ASSET_IDS[`${room}|${item.key}|${item.label}`];
    if (!installed)
      throw new Error(
        `Unregistered installed asset ${room}/${item.key}: ${item.label}`,
      );
    if (!installed.tag.startsWith(`${EQUIPMENT_ROOM_CODES[room]}-${kind.code}`))
      throw new Error(
        `Wrong designation ${installed.tag} for ${room}/${item.key}`,
      );
    result.push({
      assetId: installed.assetId,
      id: installed.tag,
      room,
      key: item.key,
      name: item.label,
      kind: key,
      brand: kind.brand ?? 'unbranded',
      class: kind.class,
      purpose: kind.purpose,
    });
  }
  return result;
}

/** A model part's kind for its description, by the letters of its code. */
const MODEL_PART_KINDS: readonly [RegExp, KindId][] = [
  [/^CAB\d+$/, 'spa-pack'],
  [/^SW\d+$/, 'cabinet-switch'],
  [/^P\d+$/, 'pump'],
  [/^F\d+$/, 'cartridge-filter'],
  [/^UV\d+$/, 'uv-unit'],
  [/^HX\d+$/, 'heat-exchanger'],
  [/^DP\d+$/, 'dosing-set'],
  [/^(?:PW|MU)\d+$/, 'pipework'],
  [/^(?:RV|DV|LCV|IV)\d+$/, 'valve'],
  [/^PL\d$/, 'plant-room'],
];

const modelPartKind = (id: string): KindId => {
  const code = id.split('-').at(-1) ?? id;
  const found = MODEL_PART_KINDS.find(([pattern]) => pattern.test(code));
  if (!found) throw new Error(`No description kind for model part ${id}`);
  return found[1];
};

const ROOM_BY_CODE = new Map<string, string>(
  Object.entries(EQUIPMENT_ROOM_CODES).map(([room, code]) => [code, room]),
);

/** "the jacuzzi plant room", for an isolator's description. */
const theRoom = (room: string) => `the ${ROOM_NAMES[room].toLowerCase()}`;

/** An inventory entry and what its description is built from. */
interface InventoryRecord {
  entry: InventoryEntry;
  subject: DescribedSubject;
}

const record = (
  entry: InventoryEntry,
  subject: Omit<DescribedSubject, 'key' | 'tag' | 'status'> &
    Partial<Pick<DescribedSubject, 'status'>>,
): InventoryRecord => ({
  entry,
  subject: {
    key: entry.assetId ?? entry.id,
    tag: entry.id,
    status: STATUS_BINDINGS[entry.id],
    ...(POWER_FOR[entry.id] ? { powerFor: POWER_FOR[entry.id] } : {}),
    ...subject,
  },
});

/** Every inventory entry with its description's subject, purposes not yet filled. */
function inventoryRecords(
  root: Block,
  valveStates: Readonly<Record<string, boolean>>,
  feederStates: Readonly<Record<ServiceRoom, boolean>>,
): InventoryRecord[] {
  const model = walkIdentified(root).map((part) => {
    const kind = modelPartKind(part.id);
    return record(
      {
        id: part.id,
        name: part.name,
        kind: part.kind,
        brand: 'unbranded',
        class: part.class,
        purpose: '',
        normal: part.normal,
        state: part.state,
        depth: part.depth,
        source: 'model',
      },
      {
        kind,
        location: part.id.split('-')[0],
        unranked: kind === 'plant-room',
        ends: MODEL_VALVE_ENDS[part.id],
      },
    );
  });
  const placed = equipmentCatalogue().filter(
    (part) => part.room !== 'plant_pool_04',
  );
  const rooms = EQUIPPED_ROOMS.filter((room) => room !== 'plant_pool_04').map(
    (room) =>
      record(
        {
          id: EQUIPMENT_ROOM_CODES[room],
          name: ROOM_NAMES[room],
          kind: 'plant-room',
          brand: 'unbranded',
          class: 'plant',
          purpose: '',
          depth: 0,
          source: 'placement',
        },
        { kind: 'plant-room', unranked: true },
      ),
  );
  const records: InventoryRecord[] = [
    ...model,
    ...rooms,
    ...placed.map((part) =>
      record(
        {
          assetId: part.assetId,
          id: part.id,
          name: part.name,
          kind: part.kind,
          brand: part.brand,
          class: part.class,
          purpose: '',
          depth: 1,
          source: 'placement',
        },
        {
          kind: part.kind as KindId,
          location:
            EQUIPMENT_ROOM_CODES[
              part.room as keyof typeof EQUIPMENT_ROOM_CODES
            ],
        },
      ),
    ),
    // Installed equipment drawn outside the rooms' layouts.
    ...Object.entries(INSTALLED_FIXTURES).map(([tag, fixture]) =>
      record(
        {
          assetId: fixture.assetId,
          id: tag,
          name: fixture.name,
          kind: fixture.kind,
          brand: fixture.brand,
          class: 'plant',
          purpose: '',
          depth: 1,
          source: 'placement',
        },
        {
          kind: fixture.kind,
          location:
            EQUIPMENT_ROOM_CODES[
              fixture.room as keyof typeof EQUIPMENT_ROOM_CODES
            ],
        },
      ),
    ),
    ...Object.entries(ROOM_SWITCH_FUSES).map(([room, switchFuse]) =>
      record(
        {
          assetId: switchFuse.assetId,
          id: switchFuse.tag,
          name: `${ROOM_NAMES[room]} supply switch-fuse`,
          kind: 'switch-fuse',
          brand: 'voltara',
          class: 'plant',
          purpose: '',
          normal: 'on',
          state: { on: feederStates[room as ServiceRoom] },
          depth: 1,
          source: 'model',
        },
        {
          kind: 'switch-fuse',
          location: EQUIPMENT_ROOM_CODES[room as ServiceRoom],
          powerFor: theRoom(room),
        },
      ),
    ),
    ...(
      [
        ['WH-MU1', 'Wet hall make-up pipework'],
        ['WH-DR1', 'Wet hall discharge pipework'],
      ] as const
    ).map(([id, name]) =>
      record(
        {
          id,
          name,
          kind: 'pipework',
          brand: 'unbranded',
          class: 'plant',
          purpose: '',
          depth: 1,
          source: 'placement',
        },
        { kind: 'pipework', location: 'WH' },
      ),
    ),
    ...Object.entries(INSTALLED_VALVES).map(([key, valve]) => {
      const name = key.split('|')[2];
      const kind: KindId = /gas/i.test(name)
        ? 'gas-ball-valve'
        : 'butterfly-valve';
      return record(
        {
          assetId: valve.assetId,
          id: valve.tag,
          name,
          kind,
          brand: 'unbranded',
          class: 'plant',
          purpose: '',
          normal: valve.normal,
          state: { open: valveStates[valve.assetId] },
          depth: 2,
          source: 'control',
        },
        {
          kind,
          location:
            EQUIPMENT_ROOM_CODES[
              key.split('|')[0] as keyof typeof EQUIPMENT_ROOM_CODES
            ],
          ends: valve.ends,
          purpose: valve.purpose,
        },
      );
    }),
  ];
  if (new Set(records.map((r) => r.entry.id)).size !== records.length)
    throw new Error('Duplicate plant inventory identifier');
  return records;
}

/**
 * The described components, every one in the inventory, and their places
 * among their rooms' items of a kind: built once, the plant's layout being
 * fixed while the game runs (its states are not needed).
 */
let described:
  | { subjects: Map<string, DescribedSubject>; places: Map<string, number> }
  | undefined;
export function describedComponents() {
  if (!described) {
    const records = inventoryRecords(
      newIdentifiedPlant(),
      newInstalledValveStates(),
      newPlantServices().feeders,
    );
    described = {
      subjects: new Map(records.map((r) => [r.entry.id, r.subject])),
      places: placesByKind(records.map((r) => r.subject)),
    };
  }
  return described;
}

/** One component's description by its tag, or '' where none is known. */
export function componentDescription(
  tag: string,
  context: DescriptionContext = {},
): string {
  const { subjects, places } = describedComponents();
  const subject = subjects.get(tag);
  return subject ? describeComponent(subject, places, context) : '';
}

/**
 * One bill for the web and PDF, retaining which records have live model
 * state; each entry's purpose is its description (prompt 060), with live
 * status only where `context` brings the world's state.
 */
export function plantInventory(
  root: Block = newIdentifiedPlant(),
  valveStates: Readonly<Record<string, boolean>> = newInstalledValveStates(),
  feederStates: Readonly<Record<ServiceRoom, boolean>> = newPlantServices()
    .feeders,
  context: DescriptionContext = {},
): InventoryEntry[] {
  const records = inventoryRecords(root, valveStates, feederStates);
  const places = describedComponents().places;
  return records.map(({ entry, subject }) => ({
    ...entry,
    purpose: describeComponent(subject, places, context),
  }));
}

/** The room a tag's code names, for a tag like PL3-BT1. */
export const roomOfTag = (tag: string): string | undefined =>
  ROOM_BY_CODE.get(tag.split('-')[0]);
