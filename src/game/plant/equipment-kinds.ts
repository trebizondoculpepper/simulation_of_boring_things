import type { BrandId } from '../../toolkit/components/core/logic/brands';

/**
 * The equipment kinds (prompt 060): every kind the inventory names, with
 * its tag code, its classification, its word in a description ("1st Pump
 * in PL2"), how its live status is put, and an engineering note of what
 * such a thing is for. One finite list, shared by the catalogue and the
 * descriptions (`component-descriptions.ts`), so no kind can be added
 * without its wording. Pure.
 */

export type Classification = 'plant' | 'non-plant' | 'decorative';

/**
 * How a kind's live status is put, given what the world says of the item
 * (`component-status.ts`): a motor On, Off or Tripped; a tank so full; a
 * pump set its pumps; a packaged cabinet what it is doing; a booster set
 * running or not; a switch On or Off; or none, when the world keeps no
 * reliable state for the item and the description stops at its location.
 */
export type StatusPolicy =
  | 'none'
  | 'motor'
  | 'level'
  | 'pump-set'
  | 'cabinet'
  | 'booster'
  | 'switch'
  /** A gas detector: its reading. */
  | 'gas'
  /** A UV unit: its lamp lit or not. */
  | 'uv';

/**
 * How a kind is described: an isolating valve by what it isolates, an
 * isolator by the power it isolates, anything else by its place, its type,
 * its room and its status.
 */
export type DescriptionTemplate = 'valve' | 'power' | 'equipment';

export interface EquipmentKind {
  /** The letters of its tag after the room's code (PL2-P1), for placed items. */
  code: string;
  class: Classification;
  /** Its word in a description, capitalised: "Pump", "Balance tank". */
  type: string;
  status: StatusPolicy;
  template?: DescriptionTemplate;
  /** What such a thing is for, as engineering documentation; not shown as an item's description. */
  purpose: string;
  /** Maker printed on the installed unit, when its model specifies one. */
  brand?: BrandId;
}

/** The kinds placed by the rooms' layouts (`roomEquipment`), including excluded scenery. */
export const PLACED_KINDS = {
  'balance-tank': {
    type: 'Balance tank',
    status: 'level',
    code: 'T',
    class: 'plant',
    purpose: 'Holds pool overflow and supplies the circulation pumps.',
  },
  'pump-pair': {
    type: 'Pump set',
    status: 'pump-set',
    code: 'P',
    class: 'plant',
    purpose: 'Circulates pool water with a duty and standby pump.',
    brand: 'grundflow',
  },
  'sand-filter': {
    type: 'Sand filter',
    status: 'none',
    code: 'F',
    class: 'plant',
    purpose: 'Removes suspended solids from circulating pool water.',
    brand: 'lidoluxe',
  },
  'uv-unit': {
    type: 'UV unit',
    status: 'uv',
    code: 'UV',
    class: 'plant',
    purpose: 'Disinfects circulating water with ultraviolet light.',
  },
  'pump-panel': {
    type: 'Control panel',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Controls and indicates the local circulation plant.',
  },
  'balance-tank-panel': {
    type: 'Control panel',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose:
      'Indicates the balance tank’s level and floats, and switches its make-up and the pumps.',
  },
  'heat-exchanger': {
    type: 'Heat exchanger',
    status: 'none',
    code: 'HX',
    class: 'plant',
    purpose: 'Transfers heat from the heating circuit into pool water.',
  },
  'ozone-monitor': {
    type: 'Ozone-in-air monitor',
    status: 'gas',
    code: 'GD',
    class: 'plant',
    purpose: 'Monitors room air for ozone and raises a warning and alarm.',
    brand: 'warden',
  },
  'ozone-generator': {
    type: 'Ozone generator',
    status: 'none',
    code: 'OZ',
    class: 'plant',
    purpose: 'Generates ozone for water treatment.',
    brand: 'trioxa',
  },
  'contact-tank': {
    type: 'Contact tank',
    status: 'none',
    code: 'T',
    class: 'plant',
    purpose: 'Holds ozonated water for its required contact time.',
  },
  'dosing-controller': {
    type: 'Dosing controller',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Measures water samples and commands chemical dosing.',
  },
  'hypo-pumps': {
    type: 'Dosing pump set',
    status: 'none',
    code: 'DP',
    class: 'plant',
    purpose: 'Meters hypochlorite into the treatment circuit.',
  },
  'acid-pump': {
    type: 'Dosing pump',
    status: 'none',
    code: 'DP',
    class: 'plant',
    purpose: 'Meters acid to control pool-water pH.',
  },
  'jacuzzi-pack': {
    type: 'Packaged cabinet',
    status: 'cabinet',
    code: 'CAB',
    class: 'plant',
    purpose: 'Contains the Jacuzzi circulation and treatment equipment.',
  },
  'spa-pack': {
    type: 'Packaged cabinet',
    status: 'none',
    code: 'CAB',
    class: 'plant',
    purpose: 'Contains the footbath circulation and treatment equipment.',
  },
  'break-tank': {
    type: 'Break tank',
    status: 'level',
    code: 'T',
    class: 'plant',
    purpose: 'Separates the incoming main from pool make-up water.',
  },
  'booster-set': {
    type: 'Booster set',
    status: 'booster',
    code: 'P',
    class: 'plant',
    purpose: 'Pressurises make-up water with duty and standby pumps.',
    brand: 'grundflow',
  },
  'water-meter': {
    type: 'Water meter',
    status: 'none',
    code: 'G',
    class: 'plant',
    purpose: 'Measures incoming make-up water volume.',
  },
  'backwash-tank': {
    type: 'Backwash tank',
    status: 'level',
    code: 'T',
    class: 'plant',
    purpose: 'Holds filter backwash water before discharge.',
  },
  'make-up-flowmeter': {
    type: 'Electromagnetic flowmeter',
    status: 'none',
    code: 'FT',
    class: 'plant',
    purpose:
      'Measures the make-up water sent to the pools, for the plant’s own controls and records.',
  },
  'make-up-recorder': {
    type: 'Flow recorder',
    status: 'none',
    code: 'FQR',
    class: 'plant',
    purpose: 'Records the make-up water used, from the meter’s pulses.',
  },
  'sewer-monitor': {
    type: 'Flow monitor and chart recorder',
    status: 'none',
    code: 'FQR',
    class: 'plant',
    purpose:
      'Measures and records the flow to the foul sewer against the discharge consent.',
  },
  'mimic-wet': {
    type: 'Mimic panel',
    status: 'none',
    code: 'MP',
    class: 'plant',
    purpose: 'Shows wet hall equipment and water levels.',
  },
  boiler: {
    type: 'Boiler',
    status: 'none',
    code: 'B',
    class: 'plant',
    purpose: 'Heats the shared low-temperature heating circuit.',
    brand: 'hamwarmy',
  },
  'boiler-cascade': {
    type: 'Boiler cascade',
    status: 'none',
    code: 'B',
    class: 'plant',
    purpose: 'Produces heat for the shared low-temperature heating circuit.',
    brand: 'hamwarmy',
  },
  'low-loss-header': {
    type: 'Low-loss header',
    status: 'none',
    code: 'HW',
    class: 'plant',
    purpose: 'Hydraulically separates boiler and distribution flows.',
  },
  'lthw-pumps': {
    type: 'Pump set',
    status: 'none',
    code: 'P',
    class: 'plant',
    purpose: 'Circulates low-temperature heating water.',
  },
  pressurisation: {
    type: 'Pressurisation unit',
    status: 'none',
    code: 'T',
    class: 'plant',
    purpose: 'Maintains heating circuit pressure and expansion volume.',
  },
  calorifier: {
    type: 'Calorifier',
    status: 'none',
    code: 'T',
    class: 'plant',
    purpose: 'Stores domestic hot water heated by the boiler plant.',
  },
  'gas-train': {
    type: 'Gas train',
    status: 'none',
    code: 'G',
    class: 'plant',
    purpose: 'Isolates and regulates the boiler gas supply.',
  },
  'dosing-pot': {
    type: 'Dosing pot',
    status: 'none',
    code: 'DP',
    class: 'plant',
    purpose: 'Introduces treatment chemical to the heating circuit.',
  },
  'gas-safety': {
    type: 'Gas safety panel',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Detects gas and shuts down unsafe gas supply.',
  },
  'mimic-gas': {
    type: 'Mimic panel',
    status: 'none',
    code: 'MP',
    class: 'plant',
    purpose: 'Shows the boiler-house gas safety circuit.',
  },
  'mimic-boiler-heat': {
    type: 'Mimic panel',
    status: 'none',
    code: 'MP',
    class: 'plant',
    purpose: 'Shows boiler status and heat output.',
  },
  'combustion-panel': {
    type: 'Control panel',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Indicates combustion and ventilation status.',
  },
  'hypo-tank': {
    type: 'Chemical tank',
    status: 'none',
    code: 'T',
    class: 'plant',
    purpose: 'Stores bulk sodium hypochlorite for pool dosing.',
  },
  'acid-ibc': {
    type: 'Chemical container',
    status: 'none',
    code: 'T',
    class: 'plant',
    purpose: 'Stores acid for pool dosing on a spill pallet.',
  },
  'safety-shower': {
    type: 'Safety shower',
    status: 'none',
    code: 'FX',
    class: 'non-plant',
    purpose: 'Provides emergency drenching and eyewash after exposure.',
  },
  'spill-kit': {
    type: 'Spill kit',
    status: 'none',
    code: 'FX',
    class: 'non-plant',
    purpose: 'Contains materials for a chemical spill response.',
  },
  'ppe-cabinet': {
    type: 'PPE cabinet',
    status: 'none',
    code: 'FX',
    class: 'non-plant',
    purpose: 'Stores protective equipment for chemical work.',
  },
  'store-extract': {
    type: 'Extract unit',
    status: 'none',
    code: 'AHU',
    class: 'plant',
    purpose: 'Extracts store air and monitors for hazardous gas.',
  },
  'store-signs': {
    type: 'Sign',
    status: 'none',
    code: 'FX',
    class: 'decorative',
    purpose: 'Displays room safety notices.',
  },
  'tanker-stand': {
    type: 'Tanker stand',
    status: 'none',
    code: 'FX',
    class: 'non-plant',
    purpose: 'Marks the delivery vehicle standing area.',
  },
  'fill-cabinet': {
    type: 'Fill cabinet',
    status: 'none',
    code: 'CAB',
    class: 'plant',
    purpose: 'Provides a segregated bulk chemical delivery connection.',
  },
  'lv-switchboard': {
    type: 'Switchboard',
    status: 'none',
    code: 'DB',
    class: 'plant',
    purpose: 'Distributes the incoming low-voltage supply.',
    brand: 'voltara',
  },
  mcc: {
    type: 'Motor control centre',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Starts and protects plant motors.',
  },
  'main-switch': {
    type: 'Main switch',
    status: 'none',
    code: 'IS',
    class: 'plant',
    purpose: 'Isolates the incoming electrical supply.',
    brand: 'voltara',
  },
  'central-battery': {
    type: 'Central battery',
    status: 'none',
    code: 'DB',
    class: 'plant',
    purpose: 'Supplies emergency lighting when mains power fails.',
  },
  'distribution-board': {
    type: 'Distribution board',
    status: 'none',
    code: 'DB',
    class: 'plant',
    purpose: 'Distributes power to final circuits.',
    brand: 'voltara',
  },
  'rotary-isolators': {
    type: 'Isolator bank',
    status: 'none',
    code: 'IS',
    class: 'plant',
    purpose: 'Locally isolates plant electrical circuits.',
    brand: 'voltara',
  },
  'lighting-board': {
    type: 'Lighting board',
    status: 'none',
    code: 'DB',
    class: 'plant',
    purpose: 'Distributes and protects lighting-zone circuits.',
    brand: 'voltara',
  },
  'generator-point': {
    type: 'Generator connection',
    status: 'none',
    code: 'FX',
    class: 'plant',
    purpose: 'Accepts a temporary generator connection.',
  },
  'earthing-terminal': {
    type: 'Earthing terminal',
    status: 'none',
    code: 'FX',
    class: 'plant',
    purpose: 'Bonds the electrical installation to earth.',
  },
  'ahu-stack': {
    type: 'Air-handling unit',
    status: 'none',
    code: 'AHU',
    class: 'plant',
    purpose: 'Conditions and moves air for the pool halls.',
  },
  'mimic-air': {
    type: 'Mimic panel',
    status: 'none',
    code: 'MP',
    class: 'plant',
    purpose: 'Shows air-handling plant status.',
  },
  'operator-desk': {
    type: 'Operator desk',
    status: 'none',
    code: 'FX',
    class: 'non-plant',
    purpose: 'Provides the operator workstation.',
  },
  'alarm-printer': {
    type: 'Alarm printer',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Prints plant alarm records.',
  },
  'water-test-kit': {
    type: 'Water test kit',
    status: 'none',
    code: 'FX',
    class: 'non-plant',
    purpose: 'Holds equipment for manual pool-water testing.',
  },
  'mimic-pool': {
    type: 'Mimic panel',
    status: 'none',
    code: 'MP',
    class: 'plant',
    purpose: 'Shows the main pool treatment circuit.',
  },
  'mimic-heating': {
    type: 'Mimic panel',
    status: 'none',
    code: 'MP',
    class: 'plant',
    purpose: 'Shows the heating circuit.',
  },
  annunciator: {
    type: 'Annunciator',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Indicates and acknowledges plant alarms.',
  },
  'chart-recorders': {
    type: 'Chart recorder bank',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Records operating measurements over time.',
  },
  'readout-board': {
    type: 'Readout board',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Displays live plant measurements.',
  },
  'bms-outstation': {
    type: 'BMS outstation',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Collects plant signals for building controls.',
  },
  'fire-repeater': {
    type: 'Fire alarm repeater',
    status: 'none',
    code: 'CP',
    class: 'non-plant',
    purpose: 'Repeats the building fire-alarm status.',
  },
  cctv: {
    type: 'CCTV monitor',
    status: 'none',
    code: 'FX',
    class: 'non-plant',
    purpose: 'Displays security camera views.',
  },
  desk: {
    type: 'Desk',
    status: 'none',
    code: 'FX',
    class: 'decorative',
    purpose: 'Furnishes the engineer’s office.',
  },
  filing: {
    type: 'Filing cabinet',
    status: 'none',
    code: 'FX',
    class: 'decorative',
    purpose: 'Stores paper records and spares.',
  },
  'storage-cupboard': {
    code: 'FX',
    class: 'decorative',
    type: 'Storage cupboard',
    status: 'none',
    purpose: 'Stores the engineers’ parts and test equipment.',
  },
  'scenario-simulator': {
    type: 'Scenario simulator',
    status: 'none',
    code: 'CP',
    class: 'plant',
    purpose: 'Runs the plant scenario simulation.',
  },
} as const satisfies Record<string, EquipmentKind>;

/** The kinds of things registered outside the layouts: valves, fixtures, feeders, model parts. */
export const OTHER_KINDS = {
  penstock: {
    code: 'DV',
    class: 'plant',
    type: 'Drain penstock',
    status: 'none',
    template: 'valve',
    purpose:
      'Opens or shuts a tank outlet, worked by an extended spindle from above.',
    brand: 'grundflow',
  },
  'level-transmitter': {
    code: 'LT',
    class: 'plant',
    type: 'Level transmitter',
    status: 'none',
    purpose:
      'Measures water depth and sends its level signal to the tank control panel.',
    brand: 'trager-feinstein',
  },
  pump: {
    code: 'P',
    class: 'plant',
    type: 'Pump',
    status: 'motor',
    purpose: 'Circulates water, driven by its own motor and starter.',
    brand: 'grundflow',
  },
  flowmeter: {
    code: 'FT',
    class: 'plant',
    type: 'Flowmeter',
    status: 'none',
    purpose: 'Measures the flow in its pipe.',
  },
  'switch-fuse': {
    code: 'SF',
    class: 'plant',
    type: 'Switch-fuse',
    status: 'none',
    template: 'power',
    purpose: 'Isolates and fuses the electrical supply to a room.',
    brand: 'voltara',
  },
  pipework: {
    code: 'PW',
    class: 'plant',
    type: 'Pipework run',
    status: 'none',
    purpose: 'Carries a service between pieces of plant.',
  },
  'butterfly-valve': {
    code: 'IV',
    class: 'plant',
    type: 'Butterfly valve',
    status: 'none',
    template: 'valve',
    purpose: 'Isolates or admits flow in its pipe run.',
  },
  'gas-ball-valve': {
    code: 'IV',
    class: 'plant',
    type: 'Gas ball valve',
    status: 'none',
    template: 'valve',
    purpose: 'Isolates gas to a boiler.',
  },
  valve: {
    code: 'V',
    class: 'plant',
    type: 'Valve',
    status: 'none',
    template: 'valve',
    purpose: 'Isolates or admits flow in its pipe run.',
  },
  'plant-room': {
    code: 'PL',
    class: 'plant',
    type: 'Plant room',
    status: 'none',
    purpose: 'Houses plant.',
  },
  'cabinet-switch': {
    code: 'SW',
    class: 'plant',
    type: 'Switch',
    status: 'switch',
    purpose: 'Starts or stops a packaged set when its isolator is on.',
  },
  'cartridge-filter': {
    code: 'F',
    class: 'plant',
    type: 'Cartridge filter',
    status: 'none',
    purpose: 'Removes suspended solids from circulating water.',
  },
  'dosing-set': {
    code: 'DP',
    class: 'plant',
    type: 'Dosing set',
    status: 'none',
    purpose: 'Controls chemical addition to the return water.',
  },
} as const satisfies Record<string, EquipmentKind>;

export const EQUIPMENT_KINDS = { ...PLACED_KINDS, ...OTHER_KINDS } as const;
export type PlacedKindId = keyof typeof PLACED_KINDS;
export type KindId = keyof typeof EQUIPMENT_KINDS;

export const isKindId = (kind: string): kind is KindId =>
  Object.hasOwn(EQUIPMENT_KINDS, kind);

/** A kind by its id; unknown ids fail loudly. */
export function equipmentKind(kind: string): EquipmentKind {
  if (!isKindId(kind)) throw new Error(`Unknown equipment kind ${kind}`);
  return EQUIPMENT_KINDS[kind];
}
