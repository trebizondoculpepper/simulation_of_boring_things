import type { ServiceRoom } from './services';

/** One permanent asset per installed room supply switch-fuse. */
export const ROOM_SWITCH_FUSES = {
  plant_pool_01: { assetId: 'feeder-0001', tag: 'PL1-SF1' },
  plant_pool_02: { assetId: 'feeder-0002', tag: 'PL2-SF1' },
  plant_pool_03: { assetId: 'feeder-0003', tag: 'PL3-SF1' },
  plant_pool_04: { assetId: 'feeder-0004', tag: 'PL4-SF1' },
  wet_hall: { assetId: 'feeder-0005', tag: 'WH-SF1' },
  boiler_house: { assetId: 'feeder-0006', tag: 'BH-SF1' },
  hypo_store: { assetId: 'feeder-0007', tag: 'HS-SF1' },
  acid_store: { assetId: 'feeder-0008', tag: 'AS-SF1' },
  loading_bay: { assetId: 'feeder-0009', tag: 'LB-SF1' },
  switch_room: { assetId: 'feeder-0010', tag: 'SR-SF1' },
  air_plant: { assetId: 'feeder-0011', tag: 'AP-SF1' },
  control_room: { assetId: 'feeder-0012', tag: 'CR-SF1' },
  engineers_office: { assetId: 'feeder-0013', tag: 'EO-SF1' },
} as const satisfies Record<ServiceRoom, { assetId: string; tag: string }>;
