import {
  EQUIPPED_ROOMS,
  roomEquipment,
} from '../../toolkit/gallery/logic/room-equipment';
import type { Item } from '../../toolkit/gallery/logic/room-equipment';
import type { Block } from '../sim/blocks';
import { newIdentifiedPlant, walkIdentified } from './identification';
import { INSTALLED_ASSET_IDS } from './installed-asset-ids';
import { INSTALLED_VALVES, newInstalledValveStates } from './installed-valves';

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

type Classification = 'plant' | 'non-plant' | 'decorative';
interface EquipmentKind {
  code: string;
  class: Classification;
  purpose: string;
}

/** Every key used by roomEquipment is classified here, including excluded scenery. */
const KINDS: Record<string, EquipmentKind> = {
  'balance-tank': {
    code: 'T',
    class: 'plant',
    purpose: 'Holds pool overflow and supplies the circulation pumps.',
  },
  'pump-pair': {
    code: 'P',
    class: 'plant',
    purpose: 'Circulates pool water with a duty and standby pump.',
  },
  'sand-filter': {
    code: 'F',
    class: 'plant',
    purpose: 'Removes suspended solids from circulating pool water.',
  },
  'uv-unit': {
    code: 'UV',
    class: 'plant',
    purpose: 'Disinfects circulating water with ultraviolet light.',
  },
  'pump-panel': {
    code: 'CP',
    class: 'plant',
    purpose: 'Controls and indicates the local circulation plant.',
  },
  'heat-exchanger': {
    code: 'HX',
    class: 'plant',
    purpose: 'Transfers heat from the heating circuit into pool water.',
  },
  'ozone-generator': {
    code: 'OZ',
    class: 'plant',
    purpose: 'Generates ozone for water treatment.',
  },
  'contact-tank': {
    code: 'T',
    class: 'plant',
    purpose: 'Holds ozonated water for its required contact time.',
  },
  'dosing-controller': {
    code: 'CP',
    class: 'plant',
    purpose: 'Measures water samples and commands chemical dosing.',
  },
  'hypo-pumps': {
    code: 'DP',
    class: 'plant',
    purpose: 'Meters hypochlorite into the treatment circuit.',
  },
  'acid-pump': {
    code: 'DP',
    class: 'plant',
    purpose: 'Meters acid to control pool-water pH.',
  },
  'jacuzzi-pack': {
    code: 'CAB',
    class: 'plant',
    purpose: 'Contains the Jacuzzi circulation and treatment equipment.',
  },
  'spa-pack': {
    code: 'CAB',
    class: 'plant',
    purpose: 'Contains the footbath circulation and treatment equipment.',
  },
  'break-tank': {
    code: 'T',
    class: 'plant',
    purpose: 'Separates the incoming main from pool make-up water.',
  },
  'booster-set': {
    code: 'P',
    class: 'plant',
    purpose: 'Pressurises make-up water with duty and standby pumps.',
  },
  'water-meter': {
    code: 'G',
    class: 'plant',
    purpose: 'Measures incoming make-up water volume.',
  },
  'backwash-tank': {
    code: 'T',
    class: 'plant',
    purpose: 'Holds filter backwash water before discharge.',
  },
  'mimic-wet': {
    code: 'MP',
    class: 'plant',
    purpose: 'Shows wet hall equipment and water levels.',
  },
  'boiler-cascade': {
    code: 'B',
    class: 'plant',
    purpose: 'Produces heat for the shared low-temperature heating circuit.',
  },
  'low-loss-header': {
    code: 'HW',
    class: 'plant',
    purpose: 'Hydraulically separates boiler and distribution flows.',
  },
  'lthw-pumps': {
    code: 'P',
    class: 'plant',
    purpose: 'Circulates low-temperature heating water.',
  },
  pressurisation: {
    code: 'T',
    class: 'plant',
    purpose: 'Maintains heating circuit pressure and expansion volume.',
  },
  calorifier: {
    code: 'T',
    class: 'plant',
    purpose: 'Stores domestic hot water heated by the boiler plant.',
  },
  'gas-train': {
    code: 'G',
    class: 'plant',
    purpose: 'Isolates and regulates the boiler gas supply.',
  },
  'dosing-pot': {
    code: 'DP',
    class: 'plant',
    purpose: 'Introduces treatment chemical to the heating circuit.',
  },
  'gas-safety': {
    code: 'CP',
    class: 'plant',
    purpose: 'Detects gas and shuts down unsafe gas supply.',
  },
  'mimic-gas': {
    code: 'MP',
    class: 'plant',
    purpose: 'Shows the boiler-house gas safety circuit.',
  },
  'mimic-boiler-heat': {
    code: 'MP',
    class: 'plant',
    purpose: 'Shows boiler status and heat output.',
  },
  'combustion-panel': {
    code: 'CP',
    class: 'plant',
    purpose: 'Indicates combustion and ventilation status.',
  },
  'hypo-tank': {
    code: 'T',
    class: 'plant',
    purpose: 'Stores bulk sodium hypochlorite for pool dosing.',
  },
  'acid-ibc': {
    code: 'T',
    class: 'plant',
    purpose: 'Stores acid for pool dosing on a spill pallet.',
  },
  'safety-shower': {
    code: 'FX',
    class: 'non-plant',
    purpose: 'Provides emergency drenching and eyewash after exposure.',
  },
  'spill-kit': {
    code: 'FX',
    class: 'non-plant',
    purpose: 'Contains materials for a chemical spill response.',
  },
  'ppe-cabinet': {
    code: 'FX',
    class: 'non-plant',
    purpose: 'Stores protective equipment for chemical work.',
  },
  'store-extract': {
    code: 'AHU',
    class: 'plant',
    purpose: 'Extracts store air and monitors for hazardous gas.',
  },
  'store-signs': {
    code: 'FX',
    class: 'decorative',
    purpose: 'Displays room safety notices.',
  },
  'tanker-stand': {
    code: 'FX',
    class: 'non-plant',
    purpose: 'Marks the delivery vehicle standing area.',
  },
  'fill-cabinet': {
    code: 'CAB',
    class: 'plant',
    purpose: 'Provides a segregated bulk chemical delivery connection.',
  },
  'lv-switchboard': {
    code: 'DB',
    class: 'plant',
    purpose: 'Distributes the incoming low-voltage supply.',
  },
  mcc: {
    code: 'CP',
    class: 'plant',
    purpose: 'Starts and protects plant motors.',
  },
  'main-switch': {
    code: 'IS',
    class: 'plant',
    purpose: 'Isolates the incoming electrical supply.',
  },
  'central-battery': {
    code: 'DB',
    class: 'plant',
    purpose: 'Supplies emergency lighting when mains power fails.',
  },
  'distribution-board': {
    code: 'DB',
    class: 'plant',
    purpose: 'Distributes power to final circuits.',
  },
  'rotary-isolators': {
    code: 'IS',
    class: 'plant',
    purpose: 'Locally isolates plant electrical circuits.',
  },
  'lighting-board': {
    code: 'DB',
    class: 'plant',
    purpose: 'Distributes and protects lighting-zone circuits.',
  },
  'generator-point': {
    code: 'FX',
    class: 'plant',
    purpose: 'Accepts a temporary generator connection.',
  },
  'earthing-terminal': {
    code: 'FX',
    class: 'plant',
    purpose: 'Bonds the electrical installation to earth.',
  },
  'ahu-stack': {
    code: 'AHU',
    class: 'plant',
    purpose: 'Conditions and moves air for the pool halls.',
  },
  'mimic-air': {
    code: 'MP',
    class: 'plant',
    purpose: 'Shows air-handling plant status.',
  },
  'operator-desk': {
    code: 'FX',
    class: 'non-plant',
    purpose: 'Provides the operator workstation.',
  },
  'alarm-printer': {
    code: 'CP',
    class: 'plant',
    purpose: 'Prints plant alarm records.',
  },
  'water-test-kit': {
    code: 'FX',
    class: 'non-plant',
    purpose: 'Holds equipment for manual pool-water testing.',
  },
  'mimic-pool': {
    code: 'MP',
    class: 'plant',
    purpose: 'Shows the main pool treatment circuit.',
  },
  'mimic-heating': {
    code: 'MP',
    class: 'plant',
    purpose: 'Shows the heating circuit.',
  },
  annunciator: {
    code: 'CP',
    class: 'plant',
    purpose: 'Indicates and acknowledges plant alarms.',
  },
  'chart-recorders': {
    code: 'CP',
    class: 'plant',
    purpose: 'Records operating measurements over time.',
  },
  'readout-board': {
    code: 'CP',
    class: 'plant',
    purpose: 'Displays live plant measurements.',
  },
  'bms-outstation': {
    code: 'CP',
    class: 'plant',
    purpose: 'Collects plant signals for building controls.',
  },
  'fire-repeater': {
    code: 'CP',
    class: 'non-plant',
    purpose: 'Repeats the building fire-alarm status.',
  },
  cctv: {
    code: 'FX',
    class: 'non-plant',
    purpose: 'Displays security camera views.',
  },
  desk: {
    code: 'FX',
    class: 'decorative',
    purpose: 'Furnishes the engineer’s office.',
  },
  filing: {
    code: 'FX',
    class: 'decorative',
    purpose: 'Stores paper records and spares.',
  },
  'scenario-simulator': {
    code: 'CP',
    class: 'plant',
    purpose: 'Runs the plant scenario simulation.',
  },
};

export interface CataloguedEquipment {
  assetId: string;
  id: string;
  room: string;
  key: string;
  name: string;
  class: Exclude<Classification, 'decorative'>;
  purpose: string;
}

export interface InventoryEntry {
  assetId?: string;
  id: string;
  name: string;
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
    const kind = KINDS[key];
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
      class: kind.class,
      purpose: kind.purpose,
    });
  }
  return result;
}

/** One bill for the web and PDF, retaining which records have live model state. */
export function plantInventory(
  root: Block = newIdentifiedPlant(),
  valveStates: Readonly<Record<string, boolean>> = newInstalledValveStates(),
): InventoryEntry[] {
  const model: InventoryEntry[] = walkIdentified(root).map((part) => ({
    id: part.id,
    name: part.name,
    class: part.class,
    purpose: part.purpose,
    normal: part.normal,
    state: part.state,
    depth: part.depth,
    source: 'model',
  }));
  const placed = equipmentCatalogue().filter(
    (part) => part.room !== 'plant_pool_04',
  );
  const rooms: InventoryEntry[] = EQUIPPED_ROOMS.filter(
    (room) => room !== 'plant_pool_04',
  ).map((room) => ({
    id: EQUIPMENT_ROOM_CODES[room],
    name: ROOM_NAMES[room],
    class: 'plant',
    purpose: `Houses the catalogued equipment of ${ROOM_NAMES[room].toLowerCase()}.`,
    depth: 0,
    source: 'placement',
  }));
  const entries = [
    ...model,
    ...rooms,
    ...placed.map((part): InventoryEntry => ({
      assetId: part.assetId,
      id: part.id,
      name: part.name,
      class: part.class,
      purpose: part.purpose,
      depth: 1,
      source: 'placement',
    })),
    {
      id: 'WH-MU1',
      name: 'Wet hall make-up pipework',
      class: 'plant',
      purpose: 'Carries incoming and boosted make-up water.',
      depth: 1,
      source: 'placement',
    } as InventoryEntry,
    {
      id: 'WH-DR1',
      name: 'Wet hall discharge pipework',
      class: 'plant',
      purpose: 'Carries backwash and tank drainage to waste.',
      depth: 1,
      source: 'placement',
    } as InventoryEntry,
    ...Object.entries(INSTALLED_VALVES).map(([key, valve]): InventoryEntry => {
      const name = key.split('|')[2];
      return {
        assetId: valve.assetId,
        id: valve.tag,
        name,
        class: 'plant',
        purpose: /backwash/i.test(name)
          ? 'Opens the filter backwash or discharge route.'
          : /drain/i.test(name)
            ? 'Opens a drain route to waste.'
            : /gas/i.test(name)
              ? 'Isolates gas to the named boiler.'
              : 'Isolates or admits flow in the named pipe run.',
        normal: valve.normal,
        state: { open: valveStates[valve.assetId] },
        depth: 2,
        source: 'control',
      };
    }),
  ];
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length)
    throw new Error('Duplicate plant inventory identifier');
  return entries;
}
