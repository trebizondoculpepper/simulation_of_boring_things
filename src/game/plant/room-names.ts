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

export const ROOM_NAMES: Record<string, string> = {
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

/** A location in a sentence, keeping abbreviated codes on equipment tags only. */
export function descriptionLocation(location: string): string {
  const plant = /^PL([1-9]\d*)$/.exec(location);
  if (plant) return `Plant Room ${plant[1]}`;
  const room = Object.entries(EQUIPMENT_ROOM_CODES).find(
    ([, code]) => code === location,
  )?.[0];
  const name = ROOM_NAMES[room ?? location];
  return name ? `the ${name.toLowerCase()}` : location;
}
