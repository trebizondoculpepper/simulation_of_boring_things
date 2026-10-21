/** Shared utilities and the rooms that consume them. This is the current
 * gallery layout, rather than the older five-attraction sizing study. */
export type Utility = 'power' | 'water' | 'heat' | 'air' | 'chemical';

export const ROOM_SERVICES = {
  plant_pool_01: ['power', 'water', 'heat', 'air', 'chemical'],
  plant_pool_02: ['power', 'water', 'heat', 'air', 'chemical'],
  plant_pool_03: ['power', 'water', 'heat', 'air', 'chemical'],
  plant_pool_04: ['power', 'water', 'heat', 'chemical'],
  wet_hall: ['power', 'water'],
  boiler_house: ['power', 'water', 'air'],
  hypo_store: ['power', 'air', 'chemical'],
  acid_store: ['power', 'air', 'chemical'],
  loading_bay: ['power'],
  switch_room: ['power'],
  air_plant: ['power', 'water', 'heat', 'air'],
  control_room: ['power'],
  engineers_office: ['power'],
} as const satisfies Record<string, readonly Utility[]>;

export type ServiceRoom = keyof typeof ROOM_SERVICES;

/** The physical supply rooms. A room can only run if its upstream supply
 * is on as well as its own feeder. */
export const UTILITY_SOURCE: Record<Utility, ServiceRoom> = {
  power: 'switch_room',
  water: 'wet_hall',
  heat: 'boiler_house',
  air: 'air_plant',
  chemical: 'hypo_store',
};

export const UTILITIES: readonly Utility[] = [
  'power',
  'water',
  'heat',
  'air',
  'chemical',
];

export interface PlantServices {
  sources: Record<Utility, boolean>;
  /** A room's electrical feeder; a source room can lose its own supply. */
  feeders: Record<ServiceRoom, boolean>;
}

export function newPlantServices(): PlantServices {
  return {
    sources: {
      power: true,
      water: true,
      heat: true,
      air: true,
      chemical: true,
    },
    feeders: Object.fromEntries(
      Object.keys(ROOM_SERVICES).map((room) => [room, true]),
    ) as Record<ServiceRoom, boolean>,
  };
}

export function serviceAvailable(
  plant: PlantServices,
  room: ServiceRoom,
  utility: Utility,
): boolean {
  if (!(ROOM_SERVICES[room] as readonly Utility[]).includes(utility))
    return false;
  if (!plant.sources.power || !plant.feeders[room]) return false;
  if (!plant.sources[utility]) return false;
  if (utility === 'chemical' && !plant.feeders.acid_store) return false;
  const source = UTILITY_SOURCE[utility];
  return source === room || plant.feeders[source];
}

export function roomRunning(plant: PlantServices, room: ServiceRoom): boolean {
  return ROOM_SERVICES[room].every((utility) =>
    serviceAvailable(plant, room, utility),
  );
}
