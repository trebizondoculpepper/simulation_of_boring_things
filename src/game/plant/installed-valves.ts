/** Explicit identities of each installed room-pipework valve. Display tags may change;
 * asset IDs and save keys do not. Keyed by authored room, run and valve names. */
export const INSTALLED_VALVES: Readonly<
  Record<string, { assetId: string; tag: string; normal: 'open' | 'closed' }>
> = {
  'plant_pool_01|Filter 1 inlet drop|F1 inlet valve': {
    assetId: 'valve-0001',
    tag: 'PL1-F1-IV1',
    normal: 'open',
  },
  'plant_pool_01|Filter 1 backwash waste|F1 backwash valve': {
    assetId: 'valve-0002',
    tag: 'PL1-F1-BV1',
    normal: 'closed',
  },
  'plant_pool_01|Filter 1 outlet|F1 outlet valve': {
    assetId: 'valve-0003',
    tag: 'PL1-F1-IV2',
    normal: 'open',
  },
  'plant_pool_01|Filter 1 drain|F1 drain valve': {
    assetId: 'valve-0004',
    tag: 'PL1-F1-DV1',
    normal: 'closed',
  },
  'plant_pool_01|Filter 2 inlet drop|F2 inlet valve': {
    assetId: 'valve-0005',
    tag: 'PL1-F2-IV1',
    normal: 'open',
  },
  'plant_pool_01|Filter 2 backwash waste|F2 backwash valve': {
    assetId: 'valve-0006',
    tag: 'PL1-F2-BV1',
    normal: 'closed',
  },
  'plant_pool_01|Filter 2 outlet|F2 outlet valve': {
    assetId: 'valve-0007',
    tag: 'PL1-F2-IV2',
    normal: 'open',
  },
  'plant_pool_01|Filter 2 drain|F2 drain valve': {
    assetId: 'valve-0008',
    tag: 'PL1-F2-DV1',
    normal: 'closed',
  },
  'plant_pool_01|Balance tank drain to waste|Balance tank drain valve': {
    assetId: 'valve-0009',
    tag: 'PL1-T1-DV1',
    normal: 'closed',
  },
  'wet_hall|Town main to the break tank|Town main stop valve': {
    assetId: 'valve-0031',
    tag: 'WH-MU1-IV1',
    normal: 'open',
  },
  'wet_hall|Break tank to the booster set|Break tank outlet valve': {
    assetId: 'valve-0032',
    tag: 'WH-T1-IV1',
    normal: 'open',
  },
  'wet_hall|Make-up main to the pool plant rooms|Make-up main valve': {
    assetId: 'valve-0033',
    tag: 'WH-MU1-IV2',
    normal: 'open',
  },
  'wet_hall|Backwash discharge to the sewer|Backwash discharge valve': {
    assetId: 'valve-0034',
    tag: 'WH-DR1-DV1',
    normal: 'closed',
  },
  'wet_hall|Break tank drain|Break tank drain valve': {
    assetId: 'valve-0035',
    tag: 'WH-T1-DV1',
    normal: 'closed',
  },
  'wet_hall|Backwash tank drain|Backwash tank drain valve': {
    assetId: 'valve-0036',
    tag: 'WH-T2-DV1',
    normal: 'closed',
  },
  'boiler_house|B-501 gas drop|B-501 gas isolating valve': {
    assetId: 'valve-0037',
    tag: 'BH-B1-IV1',
    normal: 'open',
  },
  'boiler_house|B-502 gas drop|B-502 gas isolating valve': {
    assetId: 'valve-0038',
    tag: 'BH-B1-IV2',
    normal: 'open',
  },
  'boiler_house|B-503 gas drop|B-503 gas isolating valve': {
    assetId: 'valve-0039',
    tag: 'BH-B2-IV1',
    normal: 'open',
  },
  'boiler_house|B-504 gas drop|B-504 gas isolating valve': {
    assetId: 'valve-0040',
    tag: 'BH-B2-IV2',
    normal: 'open',
  },
  'boiler_house|B-505 gas drop|B-505 gas isolating valve': {
    assetId: 'valve-0041',
    tag: 'BH-B3-IV1',
    normal: 'open',
  },
  'boiler_house|B-506 gas drop|B-506 gas isolating valve': {
    assetId: 'valve-0042',
    tag: 'BH-B3-IV2',
    normal: 'open',
  },
  'boiler_house|LTHW flow riser|LTHW flow isolating valve': {
    assetId: 'valve-0043',
    tag: 'BH-HW1-IV1',
    normal: 'open',
  },
  // The Olympic pool's plant room, redone by the pipeline (prompt 033, 2026-10-23).
  'plant_pool_02|Suction A|Pump A suction valve': {
    assetId: 'valve-0044',
    tag: 'PL2-P1-IV1',
    normal: 'open',
  },
  'plant_pool_02|Suction B|Pump B suction valve': {
    assetId: 'valve-0045',
    tag: 'PL2-P1-IV2',
    normal: 'open',
  },
  'plant_pool_02|Discharge A|Pump A discharge valve': {
    assetId: 'valve-0046',
    tag: 'PL2-P1-IV3',
    normal: 'open',
  },
  'plant_pool_02|Discharge B|Pump B discharge valve': {
    assetId: 'valve-0047',
    tag: 'PL2-P1-IV4',
    normal: 'open',
  },
  'plant_pool_02|Filter 1 inlet|F1 inlet valve': {
    assetId: 'valve-0048',
    tag: 'PL2-F1-IV1',
    normal: 'open',
  },
  'plant_pool_02|Filter 1 outlet|F1 outlet valve': {
    assetId: 'valve-0049',
    tag: 'PL2-F1-IV2',
    normal: 'open',
  },
  'plant_pool_02|Filter 1 backwash|F1 backwash valve': {
    assetId: 'valve-0050',
    tag: 'PL2-F1-BV1',
    normal: 'closed',
  },
  'plant_pool_02|Filter 2 inlet|F2 inlet valve': {
    assetId: 'valve-0051',
    tag: 'PL2-F2-IV1',
    normal: 'open',
  },
  'plant_pool_02|Filter 2 outlet|F2 outlet valve': {
    assetId: 'valve-0052',
    tag: 'PL2-F2-IV2',
    normal: 'open',
  },
  'plant_pool_02|Filter 2 backwash|F2 backwash valve': {
    assetId: 'valve-0053',
    tag: 'PL2-F2-BV1',
    normal: 'closed',
  },
  'plant_pool_02|Filter 3 inlet|F3 inlet valve': {
    assetId: 'valve-0054',
    tag: 'PL2-F3-IV1',
    normal: 'open',
  },
  'plant_pool_02|Filter 3 outlet|F3 outlet valve': {
    assetId: 'valve-0055',
    tag: 'PL2-F3-IV2',
    normal: 'open',
  },
  'plant_pool_02|Filter 3 backwash|F3 backwash valve': {
    assetId: 'valve-0056',
    tag: 'PL2-F3-BV1',
    normal: 'closed',
  },
  'plant_pool_02|Filter 4 inlet|F4 inlet valve': {
    assetId: 'valve-0057',
    tag: 'PL2-F4-IV1',
    normal: 'open',
  },
  'plant_pool_02|Filter 4 outlet|F4 outlet valve': {
    assetId: 'valve-0058',
    tag: 'PL2-F4-IV2',
    normal: 'open',
  },
  'plant_pool_02|Filter 4 backwash|F4 backwash valve': {
    assetId: 'valve-0059',
    tag: 'PL2-F4-BV1',
    normal: 'closed',
  },
  'plant_pool_02|Filter 5 inlet|F5 inlet valve': {
    assetId: 'valve-0060',
    tag: 'PL2-F5-IV1',
    normal: 'open',
  },
  'plant_pool_02|Filter 5 outlet|F5 outlet valve': {
    assetId: 'valve-0061',
    tag: 'PL2-F5-IV2',
    normal: 'open',
  },
  'plant_pool_02|Filter 5 backwash|F5 backwash valve': {
    assetId: 'valve-0062',
    tag: 'PL2-F5-BV1',
    normal: 'closed',
  },
  'plant_pool_02|Outlet header|Side-stream regulating valve': {
    assetId: 'valve-0063',
    tag: 'PL2-F-RV1',
    normal: 'open',
  },
  'plant_pool_02|Dosing spool|UV outlet valve': {
    assetId: 'valve-0064',
    tag: 'PL2-UV1-IV1',
    normal: 'open',
  },
  'plant_pool_02|battery-to-contact|Contact tank inlet valve': {
    assetId: 'valve-0065',
    tag: 'PL2-T2-IV1',
    normal: 'open',
  },
  'plant_pool_02|contact-to-uv|Contact tank outlet valve': {
    assetId: 'valve-0066',
    tag: 'PL2-T2-IV2',
    normal: 'open',
  },
  'plant_pool_02|contact-to-uv|UV inlet valve': {
    assetId: 'valve-0067',
    tag: 'PL2-UV1-IV2',
    normal: 'open',
  },
  'plant_pool_02|hx-flow|HX pool flow valve': {
    assetId: 'valve-0068',
    tag: 'PL2-HX1-IV1',
    normal: 'open',
  },
  'plant_pool_02|hx-return|HX pool return valve': {
    assetId: 'valve-0069',
    tag: 'PL2-HX1-IV2',
    normal: 'open',
  },
  'plant_pool_02|heating-flow|HX primary flow valve': {
    assetId: 'valve-0070',
    tag: 'PL2-HX1-IV3',
    normal: 'open',
  },
  'plant_pool_02|heating-return|HX primary return valve': {
    assetId: 'valve-0071',
    tag: 'PL2-HX1-IV4',
    normal: 'open',
  },
};

export interface InstalledValve {
  assetId: string;
  tag: string;
  normal: 'open' | 'closed';
}

export const installedValveKey = (room: string, run: string, name: string) =>
  `${room}|${run}|${name}`;

export function installedValveFor(
  room: string,
  run: string,
  name: string,
): InstalledValve {
  const found = INSTALLED_VALVES[installedValveKey(room, run, name)];
  if (!found) throw new Error(`Unregistered valve ${room}/${run}/${name}`);
  return found;
}

const VALVE_BY_COMMAND_ID = new Map<string, InstalledValve>();
for (const valve of Object.values(INSTALLED_VALVES)) {
  for (const id of [valve.assetId, valve.tag]) {
    if (VALVE_BY_COMMAND_ID.has(id))
      throw new Error(`Duplicate installed valve identifier ${id}`);
    VALVE_BY_COMMAND_ID.set(id, valve);
  }
}

/** Accept permanent asset IDs; display tags remain aliases for older callers. */
export function installedValveByCommandId(
  id: string,
): InstalledValve | undefined {
  return VALVE_BY_COMMAND_ID.get(id);
}

export function newInstalledValveStates(): Record<string, boolean> {
  return Object.fromEntries(
    Object.values(INSTALLED_VALVES).map((valve) => [
      valve.assetId,
      valve.normal === 'open',
    ]),
  );
}
