import type { ParodySpec } from './parody-trial';

/**
 * The game's panels, boards and mimics, each reinterpreted as a
 * 24th-century touch screen for dev48 (mission 093; the owner,
 * 2026-10-27): the same controls, lamps and read-outs as the original,
 * renamed with all the grandeur a swimming pool does not deserve. Each
 * names the original it parodies. Data only; `parody-panel.ts` builds
 * them and `parody-trial.ts` runs them.
 */
/** A Dr Aqualis Trio's panel on the bridge (mission 114): what its cabinet reads and does, shown; nothing worked. */
function trioSpec(code: string, pool: string, title: string): ParodySpec {
  return {
    original: `THE ${pool} POOL'S DR AQUALIS TRIO (DOSING CONTROLLER)`,
    title,
    code,
    shape: 'rounded',
    pages: [
      {
        name: 'MEASURE',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['FREE CHLORINE', 'mg/l', 0.8, 2.4],
                ['COMBINED CL', 'mg/l', 0, 0.5],
                ['PH', '', 7.1, 7.7],
                ['LSI', '', -0.3, 0.3],
                ['WATER', '°C', 27, 30],
              ],
            },
          ],
          [
            { kind: 'trend', name: 'CHLORINE RESIDUAL' },
            { kind: 'trend', name: 'PH' },
          ],
        ],
      },
      {
        name: 'PUMPS',
        columns: [
          [
            { kind: 'gauges', items: ['HYPO DEMAND', 'ACID DEMAND'] },
            {
              kind: 'lamps',
              labels: ['HYPO DOSING', 'ACID DOSING', 'SAMPLE FLOW LOW'],
            },
            {
              kind: 'lamps',
              labels: ['AUTO', 'HAND', 'OFF', 'DOSING INHIBITED'],
            },
          ],
        ],
      },
      {
        name: 'STATUS',
        columns: [
          [
            {
              kind: 'list',
              rows: ['CONTROLLER', 'HYPOCHLORITE', 'ACID', 'CO2', 'ALARMS'],
            },
            { kind: 'lamps', labels: ['CONTROLLER FAULT', 'ALARM'] },
          ],
        ],
      },
    ],
  };
}

export const PARODY_SPECS: readonly ParodySpec[] = [
  // ---- Pumps and filtration ----------------------------------------------------
  {
    original: 'PL2-CP1, THE FILTER PUMPS’ LOCAL CONTROL PANEL',
    title: 'PRIMARY CIRCULATION COMMAND',
    code: 'PL2-CP1',
    pages: [
      {
        name: 'PUMPS',
        columns: [
          [
            {
              kind: 'lamps',
              labels: ['P1 RUNNING', 'P1 STOPPED', 'P1 TRIPPED'],
            },
            { kind: 'readouts', items: [['P1 MOTOR CURRENT', 'A', 30, 42]] },
            {
              kind: 'selector',
              label: 'P1 MODE',
              options: ['HAND', 'OFF', 'AUTO'],
              selected: 2,
            },
            { kind: 'buttons', labels: ['P1 START', 'P1 STOP', 'P1 RESET'] },
          ],
          [
            {
              kind: 'lamps',
              labels: ['P2 RUNNING', 'P2 STOPPED', 'P2 TRIPPED'],
            },
            { kind: 'readouts', items: [['P2 MOTOR CURRENT', 'A', 0, 40]] },
            {
              kind: 'selector',
              label: 'P2 MODE',
              options: ['HAND', 'OFF', 'AUTO'],
              selected: 2,
            },
            { kind: 'buttons', labels: ['P2 START', 'P2 STOP', 'P2 RESET'] },
          ],
        ],
      },
      {
        name: 'MIMIC',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'tank', label: 'BALANCE' },
                { kind: 'pump', label: 'P1' },
                { kind: 'pump', label: 'P2' },
                { kind: 'filter', label: 'F1–F4' },
                { kind: 'valve', label: 'UV' },
                { kind: 'boiler', label: 'HX' },
              ],
            },
          ],
        ],
      },
      {
        name: 'SAFETY',
        columns: [
          [
            { kind: 'lamps', labels: ['SUPPLY ON'] },
            { kind: 'buttons', labels: ['EMERGENCY STOP'], latch: true },
            { kind: 'banner', words: 'ALL HANDS: SWIMMERS IN THE WATER' },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE MAIN POOL MIMIC (CONTROL ROOM)',
    title: 'OLYMPIC HYDRODYNAMIC OVERVIEW',
    code: 'CR-MP1',
    size: { w: 2.0, h: 1.0 },
    pages: [
      {
        name: 'CIRCUIT',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'tank', label: 'BALANCE TANK' },
                { kind: 'pump', label: 'P1' },
                { kind: 'pump', label: 'P2' },
                { kind: 'filter', label: 'F1' },
                { kind: 'filter', label: 'F2' },
                { kind: 'valve', label: 'DOSE' },
                { kind: 'boiler', label: 'HX' },
              ],
            },
          ],
          [
            {
              kind: 'readouts',
              items: [
                ['CIRCULATION', 'm³/h', 560, 640],
                ['WORST FILTER DP', 'bar', 0.3, 0.8],
                ['FREE CHLORINE', 'mg/l', 0.8, 2.2],
                ['POOL', '°C', 27.5, 29],
              ],
            },
          ],
        ],
      },
      {
        name: 'MODES',
        columns: [
          [
            {
              kind: 'buttons',
              labels: ['FLOW', 'PRESS', 'TEMP', 'WATER'],
              latch: true,
            },
            {
              kind: 'lamps',
              labels: ['MAKE-UP', 'LEVEL LOW', 'UV ON', 'DOSING'],
            },
          ],
        ],
      },
    ],
  },

  {
    original: 'THE HEATING MIMIC, LTHW (CONTROL ROOM)',
    title: 'THERMAL WARP CORE · LOW TEMPERATURE HOT WATER',
    code: 'CR-MP2',
    shape: 'rounded',
    pages: [
      {
        name: 'CORE',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'boiler', label: 'B1 300 kW' },
                { kind: 'boiler', label: 'B2 300 kW' },
                { kind: 'tank', label: 'HEADER' },
                { kind: 'pump', label: 'P5' },
                { kind: 'boiler', label: 'POOL HX' },
                { kind: 'tank', label: 'CALORIFIER' },
                { kind: 'valve', label: 'GAS ESV' },
              ],
            },
          ],
          [
            { kind: 'lamps', labels: ['B1 FIRE', 'B1 LOCKOUT'] },
            { kind: 'lamps', labels: ['B2 FIRE', 'B2 LOCKOUT'] },
            { kind: 'lamps', labels: ['ESV OPEN', 'P5 RUN'] },
            {
              kind: 'readouts',
              items: [
                ['FLOW', '°C', 74, 82],
                ['SYSTEM', 'bar', 2.2, 2.6],
              ],
            },
          ],
        ],
      },
      {
        name: 'MODES',
        columns: [
          [
            { kind: 'buttons', labels: ['TEMP', 'PRESS', 'FLOW'], latch: true },
            { kind: 'trend', name: 'CALORIFIER STORE' },
          ],
        ],
      },
    ],
  },
  {
    original: 'AP-MP1 AND CR-MP3, THE AIR HANDLING MIMIC (AHU-801 TO 812)',
    title: 'ATMOSPHERIC PROCESSING · POOL HALL',
    code: 'CR-MP3',
    pages: [
      {
        name: 'ATMOSPHERE',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'valve', label: 'FRESH' },
                { kind: 'filter', label: 'FILTER' },
                { kind: 'boiler', label: 'PLATE HX' },
                { kind: 'pump', label: 'HEAT PUMP' },
                { kind: 'fan', label: 'SUPPLY' },
                { kind: 'fan', label: 'EXTRACT' },
                { kind: 'valve', label: 'EXHAUST' },
              ],
            },
          ],
          [
            { kind: 'lamps', labels: ['SUPPLY RUN', 'EXTRACT RUN'] },
            {
              kind: 'lamps',
              labels: ['HEAT PUMP ON', 'FILTER DIRTY', 'RH HIGH'],
            },
            {
              kind: 'readouts',
              items: [
                ['HALL', '°C', 29, 31],
                ['HALL HUMIDITY', '%RH', 52, 66],
              ],
            },
          ],
        ],
      },
      {
        name: 'MODES',
        columns: [
          [
            { kind: 'buttons', labels: ['TEMP', 'RH', 'FANS'], latch: true },
            { kind: 'gauges', items: ['OUTSIDE', 'SUPPLY', 'HALL', 'EXTRACT'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE BOILER HOUSE GAS MIMIC',
    title: 'PLASMA CONDUIT SAFETY · NATURAL GAS',
    code: 'BH-MP1',
    shape: 'trapezium',
    pages: [
      {
        name: 'CONDUIT',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'valve', label: 'ECV' },
                { kind: 'tank', label: 'METER G25' },
                { kind: 'valve', label: 'SSOV-701' },
                { kind: 'valve', label: 'ISOL 1' },
                { kind: 'boiler', label: 'B-501' },
                { kind: 'boiler', label: 'B-502' },
                { kind: 'valve', label: 'ISOL 2' },
              ],
            },
          ],
          [
            { kind: 'lamps', labels: ['ECV OPEN', 'SSOV OPEN', 'SSOV SHUT'] },
            {
              kind: 'lamps',
              labels: ['B-501 FIRE', 'B-501 LOCK', 'B-502 FIRE', 'B-502 LOCK'],
            },
            { kind: 'lamps', labels: ['GAS DETECTED'] },
            { kind: 'buttons', labels: ['SSOV OPEN', 'SSOV SHUT'] },
            { kind: 'buttons', labels: ['EMERGENCY STOP', 'RESET'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE CONTROL ROOM ALARM ANNUNCIATOR',
    title: 'CONDITION RED · AQUATIC ALERT MATRIX',
    code: 'CR-CP2',
    size: { w: 1.8, h: 1.05 },
    colour: 'red-damask',
    pages: [
      {
        name: 'MATRIX',
        columns: [
          [
            {
              kind: 'annunciator',
              columns: 6,
              windows: [
                'BAL TANK LOW',
                'PUMP P1 TRIP',
                'PUMP P2 TRIP',
                'CIRC FLOW LOW',
                'FILTER HIGH DP',
                'UV LAMP FAIL',
                'CL LOW',
                'CL HIGH',
                'PH OUT RANGE',
                'CHEM STORE LEAK',
                'CHLORINE GAS',
                'DOSING INHIBITED',
                'BOILER LOCKOUT',
                'GAS DETECTED',
                'LTHW LOW PRESS',
                'POOL TEMP LOW',
                'AHU FAULT',
                'HALL RH HIGH',
                'POOL ALARM',
                'FIRE ALARM',
                'MAINS FAIL',
                'GEN RUNNING',
                'BACKWASH TANK HIGH',
                'MAKE-UP RUNNING',
                'CHLORINE GAS HIGH',
                'OZONE GAS',
                'OZONE GAS HIGH',
                'GAS EXTRACT PURGING',
                'GAS EXTRACT NO SUPPLY',
                'SPARE',
              ],
            },
          ],
        ],
      },
      {
        name: 'GO TO',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                'PUMP ROOM',
                'DOSING ROOM',
                'CHEMICAL STORE',
                'BOILER ROOM',
                'AIR HANDLING',
                'SWITCH ROOM',
                'BALANCE TANKS',
              ],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'WH-CP3, THE CHEMICAL TRANSFER CONTROL BOX (WET HALL)',
    title: 'MOLECULAR DISTRIBUTION NEXUS',
    code: 'WH-CP3',
    pages: [
      {
        name: 'HYPOCHLORITE',
        columns: [
          [
            {
              kind: 'gauges',
              items: [
                'BULK STORE',
                'PL1 LOUNGE',
                'PL2 OLYMPIC',
                'PL3 JACUZZI',
                'PL4 FOOTBATH',
              ],
            },
            {
              kind: 'lamps',
              labels: [
                'SEL AUTO',
                'SEL HAND',
                'PUMP RUN',
                'PUMP AUTO',
                'HH TRIP',
              ],
            },
          ],
        ],
      },
      {
        name: 'ACID',
        columns: [
          [
            {
              kind: 'gauges',
              items: [
                'BULK STORE',
                'PL1 LOUNGE',
                'PL2 OLYMPIC',
                'PL3 JACUZZI',
                'PL4 FOOTBATH',
              ],
            },
            {
              kind: 'lamps',
              labels: [
                'SEL AUTO',
                'SEL HAND',
                'PUMP RUN',
                'PUMP AUTO',
                'HH TRIP',
              ],
            },
          ],
        ],
      },
      {
        name: 'ALARMS',
        columns: [
          [
            {
              kind: 'annunciator',
              columns: 4,
              windows: [
                'HYPO DAY LOW LOW',
                'HYPO TRIPPED',
                'HYPO STORE LOW',
                'HYPO NOT AUTO',
                'ACID DAY LOW LOW',
                'ACID TRIPPED',
                'ACID STORE LOW',
                'ACID NOT AUTO',
              ],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE OT-216 OPERATOR TERMINALS (HYPOCHLORITE AND ACID)',
    title: 'SUBSPACE DOSING INTERFACE',
    code: 'PROTO-OT1',
    size: { w: 1.3, h: 0.9 },
    shape: 'hexagon',
    pages: [
      {
        name: 'MON',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                'FILL 142L/300L',
                'PL1 LOUNGE',
                'PL2 OLYMPIC',
                'PL3 JACUZZI',
                'PL4 FOOTBATH',
              ],
            },
            { kind: 'lamps', labels: ['RUN', 'CALL', 'ALARM'] },
          ],
        ],
      },
      {
        name: 'SET',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['LOW LEVEL', 'L', 40, 80],
                ['HIGH LEVEL', 'L', 240, 290],
              ],
            },
            { kind: 'buttons', labels: ['◀', '▲', '▼', '▶'] },
          ],
        ],
      },
      {
        name: 'CMD',
        columns: [
          [
            { kind: 'buttons', labels: ['FILL NOW', 'STOP', 'RESUME'] },
            { kind: 'buttons', labels: ['ESC', 'ENTER'] },
            {
              kind: 'selector',
              label: 'LOCAL ACCESS',
              options: ['LOCKED', 'ACCESS'],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE MAINS/GENERATOR CHANGEOVER SWITCH (SWITCH ROOM)',
    title: 'PRIMARY POWER TRANSFER CONDUIT',
    code: 'SR-IS3',
    size: { w: 1.3, h: 0.85 },
    colour: 'orange-peel',
    pages: [
      {
        name: 'TRANSFER',
        columns: [
          [
            { kind: 'banner', words: 'ONE SUPPLY ONLY · BREAK BEFORE MAKE' },
            {
              kind: 'selector',
              label: 'SUPPLY',
              options: ['I · MAINS', '0 · OFF', 'II · GENERATOR'],
            },
            {
              kind: 'lamps',
              labels: ['MAINS AVAILABLE', 'GENERATOR AVAILABLE'],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'PL1-CP1 AND THE LOUNGE FILTER MIMIC',
    title: 'LOUNGE POOL · FILTRATION ARRAY',
    code: 'PL1-CP1',
    size: { w: 1.9, h: 1.0 },
    pages: [
      {
        name: 'ARRAY',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'tank', label: 'BALANCE TANK' },
                { kind: 'pump', label: 'P-201A' },
                { kind: 'pump', label: 'P-201B' },
                { kind: 'valve', label: 'F1-IV1' },
                { kind: 'filter', label: 'FILTER 1' },
                { kind: 'valve', label: 'F2-IV1' },
                { kind: 'filter', label: 'FILTER 2' },
                { kind: 'valve', label: 'F1-BV1' },
              ],
            },
          ],
          [
            {
              kind: 'readouts',
              items: [
                ['F1 FLOW', 'm³/h', 40, 46],
                ['F2 FLOW', 'm³/h', 40, 46],
              ],
            },
          ],
        ],
      },
      {
        name: 'PUMPS',
        columns: [
          [
            { kind: 'lamps', labels: ['P-201A RUN', 'TRIP', 'NOT AUTO'] },
            { kind: 'readouts', items: [['P-201A', 'A', 9, 12]] },
            {
              kind: 'selector',
              label: 'P-201A',
              options: ['HAND', 'OFF', 'AUTO'],
              selected: 2,
            },
            { kind: 'buttons', labels: ['START', 'STOP', 'RESET'] },
          ],
          [
            { kind: 'lamps', labels: ['P-201B RUN', 'TRIP', 'NOT AUTO'] },
            { kind: 'readouts', items: [['P-201B', 'A', 0, 12]] },
            {
              kind: 'selector',
              label: 'P-201B',
              options: ['HAND', 'OFF', 'AUTO'],
              selected: 2,
            },
            { kind: 'buttons', labels: ['START', 'STOP', 'RESET'] },
          ],
        ],
      },
      {
        name: 'BACKWASH',
        columns: [
          [
            { kind: 'banner', words: 'BACKWASH SEQUENCE STANDING BY' },
            {
              kind: 'buttons',
              labels: [
                'F1-IV1 SHUT',
                'F1-BV1 OPEN',
                'F1-IV2 OPEN',
                'F1-DV1 SHUT',
              ],
            },
            { kind: 'trend', name: 'BACKWASH FLOW' },
          ],
        ],
      },
    ],
  },

  // ---- Chemicals and dosing --------------------------------------------------
  // The Dr Aqualis Trios (mission 114): readings and status only, every
  // control local, at its cabinet.
  trioSpec('PL2-CP2', 'OLYMPIC', 'WATER CHEMISTRY ORACLE'),
  trioSpec('PL1-CP2', 'LOUNGE', 'LOUNGE CHEMISTRY ORACLE'),
  {
    original: 'THE DELIVERY FILL CABINET (CHEMICAL STORE)',
    title: 'TANKER DOCKING PORT',
    code: 'LB-CAB1',
    size: { w: 1.3, h: 0.9 },
    pages: [
      {
        name: 'DOCK',
        columns: [
          [
            { kind: 'banner', words: 'COUPLE 2" HYPO · 1½" ACID' },
            { kind: 'gauges', items: ['HYPO TANK', 'ACID IBC'] },
            {
              kind: 'lamps',
              labels: ['TANK FULL ALARM', 'FILLING', 'DOOR UNLOCKED'],
            },
            { kind: 'buttons', labels: ['HORN SILENCE', 'LAMP TEST'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE CHEMICAL STORE’S EXTRACT AND CHLORINE DETECTION',
    title: 'TOXIC ATMOSPHERE CONTAINMENT FIELD',
    code: 'HS-AHU1',
    colour: 'red-damask',
    pages: [
      {
        name: 'FIELD',
        columns: [
          [
            { kind: 'readouts', items: [['CHLORINE IN AIR', 'ppm', 0, 0.6]] },
            {
              kind: 'lamps',
              labels: [
                'EXTRACT RUN',
                'ALARM 1',
                'ALARM 2 HIGH',
                'DETECTOR FAULT',
              ],
            },
            {
              kind: 'buttons',
              labels: ['EXTRACT BOOST', 'EXTRACT STOP', 'ACCEPT', 'RESET'],
            },
          ],
          [{ kind: 'trend', name: 'CL₂ PPM' }],
        ],
      },
    ],
  },
  {
    original: 'THE OZONE GENERATOR (AFTER BONOZON)',
    title: 'TRIATOMIC OXYGEN REACTOR',
    code: 'PL2-OZ1',
    shape: 'hexagon',
    pages: [
      {
        name: 'REACTOR',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['OZONE OUTPUT', 'g/h', 120, 160],
                ['COOLING WATER', 'l/h', 180, 240],
                ['FEED AIR DEW POINT', '°C', -62, -48],
              ],
            },
            {
              kind: 'lamps',
              labels: ['GENERATOR ON', 'COOLING FAULT', 'OZONE LEAK'],
            },
            { kind: 'buttons', labels: ['START', 'STOP', 'RESET'] },
          ],
        ],
      },
    ],
  },
  // ---- Heating, boilers and gas ----------------------------------------------
  {
    original:
      'THE BOILER HOUSE GAS DETECTION AND EMERGENCY STOP (AFTER GASFLAG)',
    title: 'METHANE INCURSION DEFENCE GRID',
    code: 'BH-CP1',
    size: { w: 1.4, h: 0.9 },
    colour: 'red-damask',
    pages: [
      {
        name: 'GRID',
        columns: [
          [
            {
              kind: 'lamps',
              labels: [
                'POWER',
                'GAS LEVEL 1',
                'GAS LEVEL 2',
                'DETECTOR FAULT',
                'VALVE SHUT',
              ],
            },
            { kind: 'readouts', items: [['METHANE', '%LEL', 0, 12]] },
            { kind: 'buttons', labels: ['ACCEPT', 'RESET'] },
            { kind: 'buttons', labels: ['EMERGENCY STOP'], latch: true },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE COMBUSTION AND VENTILATION PANEL',
    title: 'COMBUSTION REACTION MONITOR',
    code: 'BH-CP2',
    pages: [
      {
        name: 'FLUE',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['B-501 FLUE', '°C', 58, 74],
                ['B-502 FLUE', '°C', 58, 74],
                ['CARBON MONOXIDE', 'ppm', 0, 30],
              ],
            },
          ],
          [
            {
              kind: 'lamps',
              labels: [
                'AIR FAN RUN',
                'AIR PROVED',
                'INTERLOCK HEALTHY',
                'CO ALARM',
              ],
            },
            { kind: 'buttons', labels: ['FAN START', 'FAN STOP', 'RESET'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE BOILER STATUS AND HEAT OUTPUT MIMIC',
    title: 'HEAT OUTPUT · WARP FACTOR',
    code: 'BH-MP2',
    shape: 'trapezium',
    pages: [
      {
        name: 'OUTPUT',
        columns: [
          [
            {
              kind: 'gauges',
              items: ['B-501 kW', 'B-502 kW', 'TOTAL'],
              vertical: true,
            },
          ],
          [
            {
              kind: 'lamps',
              labels: ['B-501 READY', 'B-501 FIRING', 'B-501 FAULT'],
            },
            {
              kind: 'lamps',
              labels: ['B-502 READY', 'B-502 FIRING', 'B-502 FAULT'],
            },
            { kind: 'readouts', items: [['ESTIMATED OUTPUT', 'kW', 180, 600]] },
          ],
        ],
      },
    ],
  },
  // ---- Electrical ----------------------------------------------------------------
  {
    original: 'THE LV MAIN SWITCHBOARD (AFTER PRISMASET)',
    title: 'MAIN POWER DISTRIBUTION MATRIX · MSB-1',
    code: 'SR-DB1',
    size: { w: 2.0, h: 1.0 },
    colour: 'orange-peel',
    pages: [
      {
        name: 'INCOMER',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['L1', 'A', 380, 460],
                ['L2', 'A', 380, 460],
                ['L3', 'A', 380, 460],
              ],
            },
          ],
          [
            {
              kind: 'readouts',
              items: [
                ['VOLTAGE', 'V', 396, 412],
                ['FREQUENCY', 'Hz', 49.9, 50.1],
              ],
            },
            {
              kind: 'lamps',
              labels: ['INCOMER ON', 'INCOMER OFF', 'INCOMER TRIP'],
            },
            { kind: 'buttons', labels: ['INCOMER ON', 'INCOMER OFF', 'RESET'] },
          ],
        ],
      },
      {
        name: 'WAYS',
        columns: [
          [
            {
              kind: 'buttons',
              labels: ['MCC', 'LIGHTING', 'BOILERS', 'AIR PLANT'],
              latch: true,
            },
            {
              kind: 'buttons',
              labels: ['WET HALL', 'POOL 1', 'POOL 2', 'SPARE'],
              latch: true,
            },
            { kind: 'gauges', items: ['LOAD'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE MOTOR CONTROL CENTRE',
    title: 'PROPULSION CONTROL CENTRE',
    code: 'MCC 01',
    size: { w: 1.8, h: 1.0 },
    pages: [
      {
        name: 'DRIVES',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                'P-101A FILTER PUMP',
                'P-101B FILTER PUMP',
                'P-201A',
                'P-201B',
                'AHU SUPPLY FAN',
                'AHU EXTRACT FAN',
                'P5 LTHW',
              ],
            },
          ],
          [
            { kind: 'lamps', labels: ['RUN', 'STOPPED', 'OVERLOAD TRIP'] },
            { kind: 'buttons', labels: ['START', 'STOP', 'RESET'] },
            { kind: 'readouts', items: [['SELECTED DRIVE', 'A', 8, 40]] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE EMERGENCY LIGHTING CENTRAL BATTERY',
    title: 'AUXILIARY POWER RESERVE',
    code: 'SR-DB2',
    size: { w: 1.2, h: 1.0 },
    pages: [
      {
        name: 'RESERVE',
        columns: [
          [
            { kind: 'gauges', items: ['BATTERY CHARGE'] },
            {
              kind: 'lamps',
              labels: [
                'MAINS HEALTHY',
                'CHARGING',
                'ON BATTERY',
                'SYSTEM FAULT',
              ],
            },
            {
              kind: 'buttons',
              labels: ['FUNCTION TEST', 'DURATION TEST', 'RESET'],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE DISTRIBUTION BOARD (AFTER HAGER, 12-WAY TPN)',
    title: 'CIRCUIT PROTECTION LATTICE',
    code: 'DB 01',
    size: { w: 1.2, h: 1.0 },
    pages: [
      {
        name: 'WAYS',
        columns: [
          [
            {
              kind: 'buttons',
              labels: ['1L1', '1L2', '1L3', '2L1'],
              latch: true,
            },
            {
              kind: 'buttons',
              labels: ['2L2', '2L3', '3L1', '3L2'],
              latch: true,
            },
            {
              kind: 'buttons',
              labels: ['3L3', '4L1', '4L2', '4L3'],
              latch: true,
            },
            { kind: 'buttons', labels: ['MAIN SWITCH ON', 'MAIN SWITCH OFF'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE ROTARY ISOLATORS',
    title: 'LOCAL ISOLATION ARRAY',
    code: 'ISO 01',
    size: { w: 1.4, h: 0.7 },
    pages: [
      {
        name: 'ISOLATORS',
        columns: [
          [
            {
              kind: 'selector',
              label: 'P1',
              options: ['OFF', 'ON'],
              selected: 1,
            },
            {
              kind: 'selector',
              label: 'P2',
              options: ['OFF', 'ON'],
              selected: 1,
            },
          ],
          [
            {
              kind: 'selector',
              label: 'UV',
              options: ['OFF', 'ON'],
              selected: 1,
            },
            {
              kind: 'selector',
              label: 'FAN',
              options: ['OFF', 'ON'],
              selected: 1,
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE GENERATOR CONNECTION POINT (LOADING BAY)',
    title: 'EXTERNAL POWER DOCKING CLAMP',
    code: 'LB-FX1',
    size: { w: 1.2, h: 0.8 },
    shape: 'trapezium',
    pages: [
      {
        name: 'DOCK',
        columns: [
          [
            {
              kind: 'lamps',
              labels: [
                'GENERATOR CONNECTED',
                'PHASE ROTATION OK',
                'EARTH HEALTHY',
              ],
            },
            { kind: 'readouts', items: [['GENERATOR', 'V', 0, 415]] },
            { kind: 'banner', words: 'DO NOT DISCONNECT ON LOAD' },
          ],
        ],
      },
    ],
  },
  // ---- The control room ------------------------------------------------------
  {
    original: 'THE OPERATOR’S DESK, POOLMON (BBC MICRO)',
    title: 'CENTRAL COMPUTER CORE · POOLMON',
    code: 'POOLMON',
    size: { w: 1.8, h: 1.05 },
    colour: 'blue-bell',
    pages: [
      {
        name: 'SUMMARY',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                'MAIN POOL',
                'LEARNER POOL',
                'SPA',
                'HALL AIR',
                'LTHW FLOW',
                'BALANCE TANK',
              ],
            },
          ],
          [{ kind: 'trend', name: 'PAGE 2 · TEMPERATURES' }],
        ],
      },
      {
        name: 'ALARMS',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                '14:02 CL LOW',
                '14:07 FILTER HIGH DP',
                '14:11 HALL RH HIGH',
                '14:15 MAKE-UP RUNNING',
              ],
            },
            { kind: 'buttons', labels: ['ACCEPT', 'PRINT'] },
          ],
        ],
      },
      {
        name: 'KEYS',
        columns: [
          [
            { kind: 'buttons', labels: ['F0', 'F1', 'F2', 'F3', 'F4'] },
            { kind: 'buttons', labels: ['F5', 'F6', 'F7', 'F8', 'F9'] },
            { kind: 'buttons', labels: ['BREAK', 'RETURN'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE CHART RECORDERS',
    title: 'TEMPORAL DATA ARCHIVE',
    code: 'CR-CP3',
    size: { w: 1.8, h: 0.9 },
    pages: [
      {
        name: 'CHARTS',
        columns: [
          [{ kind: 'trend', name: 'POOL TEMPERATURES' }],
          [{ kind: 'trend', name: 'CHLORINE AND PH' }],
          [{ kind: 'trend', name: 'HALL AIR · 7 DAYS' }],
        ],
      },
    ],
  },
  {
    original: 'THE READOUT BOARD (LED INDICATORS AND AMMETERS)',
    title: 'SYSTEMS STATUS BOARD',
    code: 'CR-CP4',
    size: { w: 1.8, h: 0.8 },
    pages: [
      {
        name: 'STATUS',
        columns: [
          [
            {
              kind: 'lamps',
              labels: ['P1 RUN', 'P2 RUN', 'UV ON', 'DOSING', 'BOILERS', 'AHU'],
            },
            {
              kind: 'readouts',
              items: [
                ['P1', 'A', 34, 40],
                ['SUPPLY FAN', 'A', 26, 30],
              ],
            },
          ],
          [
            {
              kind: 'readouts',
              items: [
                ['EXTRACT FAN', 'A', 24, 29],
                ['BOILERS', 'A', 3, 20],
              ],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE BMS OUTSTATION (AFTER TREND IQ4)',
    title: 'AUTONOMOUS BUILDING INTELLIGENCE',
    code: 'CR-CP5',
    shape: 'rounded',
    pages: [
      {
        name: 'POINTS',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                'S1 OUTSIDE AIR',
                'S2 HALL AIR',
                'S3 HALL RH',
                'K1 SUPPLY FAN',
                'K2 EXTRACT FAN',
                'D1 FRESH AIR DAMPER',
              ],
            },
          ],
          [
            { kind: 'lamps', labels: ['CPU RUN', 'COMMS', 'BATTERY LOW'] },
            {
              kind: 'buttons',
              labels: ['OCCUPIED', 'UNOCCUPIED'],
              latch: true,
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE FIRE ALARM REPEATER (AFTER SYNCRO VIEW)',
    title: 'COMBUSTION EVENT REPEATER',
    code: 'CR-CP6',
    size: { w: 1.2, h: 0.85 },
    colour: 'red-damask',
    pages: [
      {
        name: 'REPEATER',
        columns: [
          [
            {
              kind: 'lamps',
              labels: ['FIRE', 'FAULT', 'DISABLEMENT', 'TEST', 'POWER'],
            },
            {
              kind: 'list',
              rows: ['ZONE 1 POOL HALL', 'ZONE 2 PLANT', 'ZONE 3 CHANGING'],
            },
            {
              kind: 'buttons',
              labels: ['SILENCE', 'RESOUND', 'RESET', 'MUTE'],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE CCTV MONITOR (FOUR CAMERAS IN QUARTERS)',
    title: 'VISUAL SURVEILLANCE ARRAY',
    code: 'CR-FX3',
    size: { w: 1.3, h: 0.9 },
    shape: 'hexagon',
    pages: [
      {
        name: 'QUAD',
        columns: [
          [
            { kind: 'banner', words: 'CAM 1 · POOL HALL' },
            { kind: 'banner', words: 'CAM 2 · RECEPTION' },
          ],
          [
            { kind: 'banner', words: 'CAM 3 · PLANT CORRIDOR' },
            { kind: 'banner', words: 'CAM 4 · MALL DOOR' },
          ],
        ],
      },
      {
        name: 'SELECT',
        columns: [
          [
            {
              kind: 'buttons',
              labels: ['CAM 1', 'CAM 2', 'CAM 3', 'CAM 4'],
              latch: true,
            },
            { kind: 'buttons', labels: ['QUAD', 'SEQUENCE'] },
          ],
        ],
      },
    ],
  },

  // ---- Batch three: the rest of the inventory ----------------------------------
  {
    original: 'THE LIDOLUXE WASH-O-TRON 5 FILTER WASH CONTROLLER (WOT-5)',
    title: 'AUTOMATED SAND PURIFICATION SEQUENCER',
    code: 'WOT-5',
    size: { w: 2.0, h: 1.05 },
    colour: 'hopbush',
    pages: [
      {
        name: 'VESSELS',
        columns: [
          [
            {
              kind: 'buttons',
              labels: ['F1', 'F2', 'F3', 'F4', 'F5'],
              latch: true,
            },
            {
              kind: 'buttons',
              labels: ['FILTER', 'BACKWASH', 'RINSE', 'ISOLATE', 'DRAIN'],
            },
            {
              kind: 'buttons',
              labels: ['AUTO', 'LOCKOUT', 'AIR SCOUR · NOT FITTED'],
            },
            {
              kind: 'lamps',
              labels: [
                'F1 FAULT',
                'F2 FAULT',
                'F3 FAULT',
                'F4 FAULT',
                'F5 FAULT',
              ],
            },
          ],
        ],
      },
      {
        name: 'PROGRAMME',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                'STEP 1 DRAIN DOWN',
                'STEP 2 BACKWASH',
                'STEP 3 SETTLE',
                'STEP 4 RINSE',
                'STEP 5 RETURN TO SERVICE',
              ],
            },
          ],
          [
            { kind: 'buttons', labels: ['MODE', '−', '+', 'ENTER'] },
            { kind: 'buttons', labels: ['PROGRAMME', 'WASH NOW'] },
            { kind: 'buttons', labels: ['HOLD', 'STEP', 'SKIP'] },
          ],
        ],
      },
      {
        name: 'ALARMS',
        columns: [
          [
            {
              kind: 'annunciator',
              columns: 2,
              windows: [
                'STEP OVERRUN',
                'VALVE FAULT',
                'PIT INHIBIT',
                'LOW CIRC',
              ],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'PL2-CP3, THE OLYMPIC BALANCE TANK PANEL',
    title: 'RESERVOIR EQUILIBRIUM CONTROL',
    code: 'PL2-CP3',
    shape: 'rounded',
    pages: [
      {
        name: 'RESERVOIR',
        columns: [
          [{ kind: 'gauges', items: ['TANK LEVEL'], vertical: true }],
          [
            {
              kind: 'readouts',
              items: [
                ['LEVEL', 'm', 1.1, 1.6],
                ['VOLUME', 'm³', 60, 90],
                ['IN', 'm³/h', 580, 640],
                ['OUT', 'm³/h', 580, 640],
              ],
            },
          ],
          [
            {
              kind: 'lamps',
              labels: [
                'HIGH LEVEL',
                'OVERFLOW',
                'MAKE-UP',
                'LOW LEVEL',
                'LOW LOW TRIP',
                'PUMPS RUN',
              ],
            },
            {
              kind: 'selector',
              label: 'MAKE-UP',
              options: ['OFF', 'AUTO', 'HAND'],
              selected: 1,
            },
            { kind: 'buttons', labels: ['PUMPS START', 'PUMPS STOP'] },
          ],
        ],
      },
      {
        name: 'BATHERS',
        columns: [
          [
            {
              kind: 'selector',
              label: 'BATHER LOAD',
              options: ['CLOSED', 'QUIET', 'PUBLIC', 'GALA'],
              selected: 2,
            },
            { kind: 'trend', name: 'DISPLACEMENT' },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE UV UNIT CONTROLLER (PL1-UV1, PL2-UV1)',
    title: 'ULTRAVIOLET STERILISATION BEAM',
    code: 'PL2-UV1',
    size: { w: 1.2, h: 0.8 },
    shape: 'hexagon',
    pages: [
      {
        name: 'BEAM',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['IRRADIANCE', 'W/m²', 38, 52],
                ['LAMP HOURS', 'h', 4100, 4200],
              ],
            },
            { kind: 'lamps', labels: ['LAMP ON', 'UV FAIL'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE HYPOCHLORITE DOSING SET, DP-101A DUTY AND DP-101B STANDBY',
    title: 'CHLORINE INJECTION THRUSTERS',
    code: 'PL2-DP1',
    pages: [
      {
        name: 'DP-101A',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['RATE', 'l/h', 2, 9],
                ['STROKES', '/min', 40, 120],
              ],
            },
            { kind: 'lamps', labels: ['STROKE', 'WARN', 'ERROR'] },
            { kind: 'buttons', labels: ['START', 'STOP', '▲', '▼'] },
          ],
        ],
      },
      {
        name: 'DP-101B',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['RATE', 'l/h', 0, 2],
                ['STROKES', '/min', 0, 10],
              ],
            },
            { kind: 'lamps', labels: ['STROKE', 'WARN', 'ERROR'] },
            { kind: 'buttons', labels: ['START', 'STOP', '▲', '▼'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'DP-102, THE ACID DOSING PUMP (pH CORRECTION)',
    title: 'ACIDITY RECALIBRATION INJECTOR',
    code: 'PL2-DP2',
    size: { w: 1.2, h: 0.85 },
    shape: 'trapezium',
    pages: [
      {
        name: 'INJECTOR',
        columns: [
          [
            { kind: 'readouts', items: [['RATE', 'l/h', 0.2, 1.4]] },
            { kind: 'lamps', labels: ['STROKE', 'WARN', 'ERROR'] },
            { kind: 'buttons', labels: ['START', 'STOP', '▲', '▼'] },
          ],
        ],
      },
    ],
  },
  {
    original:
      'THE TRANSFER SELECTORS, 6-WAY (WH-XS1 HYPOCHLORITE, WH-XS2 ACID)',
    title: 'CHEMICAL ROUTING JUNCTION',
    code: 'WH-XS1',
    pages: [
      {
        name: 'DESTINATION',
        columns: [
          [
            {
              kind: 'selector',
              label: 'MODE',
              options: ['HAND', 'AUTO'],
              selected: 1,
            },
            { kind: 'buttons', labels: ['PL1', 'PL2', 'PL3'], latch: true },
            { kind: 'buttons', labels: ['PL4', 'SPARE', 'SPARE'], latch: true },
            { kind: 'banner', words: 'ONE DESTINATION AT A TIME' },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE TRANSFER PUMP SKID CONTROL BOX (HS-P1, AS-P1)',
    title: 'BULK TRANSFER PROPULSION',
    code: 'HS-P1',
    size: { w: 1.2, h: 0.8 },
    pages: [
      {
        name: 'PUMP',
        columns: [
          [
            {
              kind: 'selector',
              label: 'PUMP',
              options: ['HAND', 'OFF', 'AUTO'],
              selected: 2,
            },
            { kind: 'lamps', labels: ['RUN', 'TRIP'] },
            { kind: 'buttons', labels: ['TRIP RESET'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE DOSECELL HEAD ON THE DAY-TANK DOSE BOTTLES',
    title: 'DOSE VESSEL INTELLIGENCE',
    code: 'PL1-DT1',
    size: { w: 1.0, h: 0.8 },
    shape: 'hexagon',
    pages: [
      {
        name: 'LEVEL',
        columns: [
          [
            { kind: 'gauges', items: ['BOTTLE'] },
            { kind: 'readouts', items: [['CONTENTS', 'L', 12, 55]] },
            { kind: 'lamps', labels: ['HI', 'LO', 'CALL', 'PUMP'] },
          ],
        ],
      },
      {
        name: 'SWITCHES',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                'HIGH SWITCH',
                'LOW SWITCH',
                'CALLING FILL',
                'DOSING PUMP',
              ],
            },
            { kind: 'buttons', labels: ['◄', '►', 'TEST'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE FRAMED DAY-TANK STATION (PL2-DT1, 1,000 L)',
    title: 'PRIMARY CHLORINE RESERVOIR',
    code: 'PL2-DT1',
    size: { w: 1.0, h: 0.9 },
    pages: [
      {
        name: 'TANK',
        columns: [
          [{ kind: 'gauges', items: ['1000 L'], vertical: true }],
          [
            { kind: 'lamps', labels: ['FILLING', 'LSL', 'LSH'] },
            { kind: 'buttons', labels: ['INLET OPEN', 'INLET SHUT'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE BOILER CONTROL PANEL (EACH OF B-501 TO B-506)',
    title: 'INDIVIDUAL REACTOR CONTROL',
    code: 'B-501',
    size: { w: 1.3, h: 0.85 },
    colour: 'orange-peel',
    pages: [
      {
        name: 'REACTOR',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['FLOW', '°C', 70, 82],
                ['WATER PRESSURE', 'bar', 1.4, 1.8],
              ],
            },
            { kind: 'lamps', labels: ['BURNER', 'LOCKOUT', 'PUMP', 'MANUAL'] },
          ],
          [
            { kind: 'buttons', labels: ['ON', 'OFF'] },
            { kind: 'buttons', labels: ['MODE', 'STEP', '−', '+'] },
            { kind: 'buttons', labels: ['STORE', 'RESET', 'MANUAL'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE PRESSURISATION UNIT (BH-T1)',
    title: 'HYDRAULIC PRESSURE STABILISER',
    code: 'BH-T1',
    size: { w: 1.0, h: 0.7 },
    pages: [
      {
        name: 'PRESSURE',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['SYSTEM', 'bar', 1.4, 1.6],
                ['SET', 'bar', 1.5, 1.5],
              ],
            },
            { kind: 'banner', words: 'PRESSURISATION NOMINAL' },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE AHU CONTROLLERS (AHU-801 TO AHU-812)',
    title: 'LIFE SUPPORT · ATMOSPHERIC UNIT',
    code: 'AHU-801',
    pages: [
      {
        name: 'UNIT',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['AIRFLOW', 'm³/h', 5200, 6400],
                ['HUMIDITY', '%RH', 52, 64],
                ['FILTER', 'Pa', 80, 240],
              ],
            },
          ],
          [
            { kind: 'lamps', labels: ['RUN', 'HEAT PUMP', 'FILTER', 'FAULT'] },
            {
              kind: 'selector',
              label: 'MODE',
              options: ['HAND', 'OFF', 'AUTO'],
              selected: 2,
            },
            { kind: 'buttons', labels: ['RESET', 'FILTERS CHANGED'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'SR-IS1, THE MAIN INCOMING SWITCH',
    title: 'SITE POWER INTAKE GATE',
    code: 'SR-IS1',
    size: { w: 1.2, h: 0.8 },
    shape: 'trapezium',
    colour: 'orange-peel',
    pages: [
      {
        name: 'INTAKE',
        columns: [
          [
            { kind: 'banner', words: 'SITE INCOMER · 400 V 3 PH 50 Hz' },
            {
              kind: 'selector',
              label: 'HANDLE',
              options: ['OFF', 'ON'],
              selected: 1,
            },
            { kind: 'lamps', labels: ['SUPPLY ON', 'DANGER 400 V'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'DB-L1, THE LIGHTING DISTRIBUTION BOARD',
    title: 'ILLUMINATION GRID',
    code: 'SR-DB4',
    size: { w: 1.8, h: 1.0 },
    pages: [
      {
        name: 'HALLS',
        columns: [
          [
            {
              kind: 'buttons',
              labels: ['CORRIDORS', 'LOUNGE', 'OLYMPIC', 'JACUZZI', 'FOOTBATH'],
              latch: true,
            },
            {
              kind: 'buttons',
              labels: ['PLANT 1', 'PLANT 2', 'PLANT 3', 'PLANT 4', 'WET HALL'],
              latch: true,
            },
          ],
        ],
      },
      {
        name: 'ROOMS',
        columns: [
          [
            {
              kind: 'buttons',
              labels: ['BOILERS', 'AIR PLANT', 'SWITCH ROOM', 'CONTROL'],
              latch: true,
            },
            {
              kind: 'buttons',
              labels: ['OFFICE', 'HYPO STORE', 'ACID STORE', 'LOADING BAY'],
              latch: true,
            },
          ],
        ],
      },
      {
        name: 'MAIN',
        columns: [
          [
            { kind: 'buttons', labels: ['MAIN SWITCH ON', 'MAIN SWITCH OFF'] },
            { kind: 'lamps', labels: ['RCBO TRIP', 'SUPPLY ON'] },
            { kind: 'buttons', labels: ['RCBO TEST', 'RESET'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE ROOMS’ SUPPLY SWITCH-FUSES (PL1-SF1 AND EVERY ROOM’S)',
    title: 'COMPARTMENT POWER COUPLING',
    code: 'PL1-SF1',
    size: { w: 1.0, h: 0.8 },
    pages: [
      {
        name: 'COUPLING',
        columns: [
          [
            {
              kind: 'selector',
              label: 'HANDLE',
              options: ['OFF', 'ON'],
              selected: 1,
            },
            { kind: 'lamps', labels: ['SUPPLY ON'] },
            { kind: 'list', rows: ['FUSE L1', 'FUSE L2', 'FUSE L3'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE SPA CABINET POWER ISOLATORS',
    title: 'SPA POWER SEVERANCE',
    code: 'ISO 02',
    size: { w: 0.9, h: 0.7 },
    shape: 'hexagon',
    pages: [
      {
        name: 'POWER',
        columns: [
          [
            {
              kind: 'selector',
              label: 'POWER',
              options: ['OFF', 'ON'],
              selected: 1,
            },
            { kind: 'lamps', labels: ['CABINET POWER'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE ELECTRICITY METERING CABINET (YARD INTAKE)',
    title: 'ENERGY CONSUMPTION LEDGER',
    code: 'METER 01',
    size: { w: 1.2, h: 0.8 },
    pages: [
      {
        name: 'LEDGER',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['IMPORT', 'kWh', 841200, 841400],
                ['DEMAND', 'kW', 180, 320],
              ],
            },
            { kind: 'lamps', labels: ['MODEM ONLINE', 'TAMPER'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'CR-CP1, THE ALARM PRINTER',
    title: 'HARD COPY ALARM CHRONICLE',
    code: 'CR-CP1',
    size: { w: 1.3, h: 0.9 },
    pages: [
      {
        name: 'LOG',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                '14:02 IN CL LOW · DOSING ROOM',
                '14:03 ACC CL LOW',
                '14:07 IN FILTER HIGH DP · PUMP ROOM',
                '14:11 IN HALL RH HIGH · AIR',
                '14:20 CLR CL LOW',
              ],
            },
            { kind: 'buttons', labels: ['FORM FEED', 'ON LINE'] },
          ],
        ],
      },
    ],
  },
  {
    original:
      'THE SPA CABINETS (PL3-CAB1 JACUZZI, PL4-CAB1 FOOTBATH) AND THEIR MIMIC',
    title: 'HOT TUB LIFE SUPPORT POD',
    code: 'PL3-CAB1',
    size: { w: 1.8, h: 1.0 },
    colour: 'hopbush',
    pages: [
      {
        name: 'CIRCUIT',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'tank', label: 'SPA' },
                { kind: 'pump', label: 'PUMP' },
                { kind: 'filter', label: 'FILTER' },
                { kind: 'valve', label: 'UV' },
                { kind: 'boiler', label: 'HEAT' },
                { kind: 'valve', label: 'DRAIN' },
              ],
            },
          ],
          [
            {
              kind: 'lamps',
              labels: ['PUMP RUN', 'UV ON', 'DOOR OPEN', 'NO FLOW'],
            },
            { kind: 'readouts', items: [['WATER', '°C', 36, 38]] },
          ],
        ],
      },
      {
        name: 'CONTROLS',
        columns: [
          [
            {
              kind: 'selector',
              label: 'POWER',
              options: ['0', '1'],
              selected: 1,
            },
            { kind: 'buttons', labels: ['▲', '▼', 'DISPLAY'] },
            { kind: 'buttons', labels: ['WASH MODE', 'WASH NOW', 'RESET'] },
            { kind: 'buttons', labels: ['JETS', 'AIR'], latch: true },
          ],
        ],
      },
    ],
  },
  {
    original: 'DC1, THE SPA DOSING CONTROLLER',
    title: 'MICRO-DOSING NANOCONTROLLER',
    code: 'DC1',
    size: { w: 1.0, h: 0.75 },
    shape: 'rounded',
    pages: [
      {
        name: 'DOSE',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['FREE CL', 'mg/l', 2, 4],
                ['PH', '', 7.1, 7.6],
              ],
            },
            { kind: 'lamps', labels: ['HYPO DOSING', 'ACID DOSING'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE MOTORISED VALVE PANELS (JACUZZI VALVES, FOOT SPA VALVES)',
    title: 'HYDRAULIC GATE ARRAY',
    code: 'VALVES 01',
    pages: [
      {
        name: 'GATES',
        columns: [
          [
            { kind: 'buttons', labels: ['SUCTION OPEN', 'SUCTION SHUT'] },
            { kind: 'buttons', labels: ['RETURN OPEN', 'RETURN SHUT'] },
            { kind: 'buttons', labels: ['DRAIN OPEN', 'DRAIN SHUT'] },
            { kind: 'buttons', labels: ['MAKE-UP OPEN', 'MAKE-UP SHUT'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE JACUZZI WATER CIRCUIT MIMIC',
    title: 'BUBBLE DYNAMICS OVERVIEW',
    code: 'MIMIC 06',
    shape: 'hexagon',
    pages: [
      {
        name: 'BUBBLES',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'tank', label: 'SPA' },
                { kind: 'pump', label: 'PUMP' },
                { kind: 'filter', label: 'FILTER' },
                { kind: 'valve', label: 'UV' },
                { kind: 'boiler', label: 'HEAT' },
              ],
            },
            { kind: 'lamps', labels: ['PUMP RUN', 'UV ON'] },
            { kind: 'buttons', labels: ['TEMP', 'FLOW'], latch: true },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE SPA FIBRE ILLUMINATOR',
    title: 'STARFIELD PROJECTOR · SPA',
    code: 'FIBRE 01',
    size: { w: 1.2, h: 0.8 },
    colour: 'melrose',
    pages: [
      {
        name: 'STARS',
        columns: [
          [
            { kind: 'buttons', labels: ['ON', 'OFF'] },
            { kind: 'selector', label: 'COLOUR', options: ['WHITE', 'COLOUR'] },
            { kind: 'gauges', items: ['BRIGHTNESS', 'TWINKLE'] },
            { kind: 'lamps', labels: ['ON'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE JACUZZI MUSIC CABINET (SYNCLEX)',
    title: 'AMBIENT HARMONIC GENERATOR',
    code: 'MUSIC 01',
    size: { w: 1.3, h: 0.8 },
    colour: 'lavender-purple',
    pages: [
      {
        name: 'HARMONICS',
        columns: [
          [
            {
              kind: 'list',
              rows: [
                'BAMBOO AND MORNING MIST',
                'GLASS WATER GARDEN',
                'PAVILION AT FIRST LIGHT',
              ],
            },
            { kind: 'buttons', labels: ['NEXT', 'ON', 'OFF'] },
            { kind: 'gauges', items: ['VOLUME'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE POOLSIDE JACUZZI CONTROL PLATE',
    title: 'BATHER JET AUTHORISATION',
    code: 'JETS 01',
    size: { w: 1.0, h: 0.7 },
    shape: 'hexagon',
    pages: [
      {
        name: 'JETS',
        columns: [
          [
            { kind: 'buttons', labels: ['START', 'STOP', 'LIGHT'] },
            { kind: 'banner', words: 'TEN MINUTES OF BUBBLES' },
          ],
        ],
      },
    ],
  },
  {
    original: 'WH-MP1, THE WET HALL MIMIC (MAKE-UP AND BACKWASH)',
    title: 'MUNICIPAL WATER INTAKE · BACKWASH RECLAMATION',
    code: 'WH-MP1',
    size: { w: 2.0, h: 1.0 },
    pages: [
      {
        name: 'INTAKE',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'valve', label: 'MAINS IN' },
                { kind: 'tank', label: 'BREAK TANK' },
                { kind: 'valve', label: 'IV1' },
                { kind: 'pump', label: 'BOOSTER' },
                { kind: 'valve', label: 'IV2' },
                { kind: 'tank', label: 'BACKWASH TANK' },
                { kind: 'pump', label: 'P-601' },
              ],
            },
          ],
          [
            {
              kind: 'lamps',
              labels: [
                'MAINS',
                'BREAK LOW',
                'BOOSTER RUN',
                'LOW WATER',
                'BACKWASH HIGH',
              ],
            },
            { kind: 'buttons', labels: ['SUCTION OPEN', 'SUCTION SHUT'] },
            { kind: 'buttons', labels: ['DISCHARGE OPEN', 'DISCHARGE SHUT'] },
            { kind: 'buttons', labels: ['BOOSTER RESET'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'WH-P1, THE MAKE-UP BOOSTER SET CONTROLLER',
    title: 'PRESSURE AMPLIFICATION ENGINES',
    code: 'WH-P1',
    pages: [
      {
        name: 'ENGINES',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['DISCHARGE', 'bar', 3.8, 4.6],
                ['SUCTION', 'bar', 1.2, 2.0],
                ['P1 FLOW', 'm³/h', 0, 6],
              ],
            },
          ],
          [
            {
              kind: 'lamps',
              labels: ['POWER', 'PUMP 1 RUN', 'PUMP 2 RUN', 'LOW WATER'],
            },
            { kind: 'buttons', labels: ['DUTY 1', 'DUTY 2'], latch: true },
            { kind: 'buttons', labels: ['RUN', 'STOP', 'BOOST', 'RESET'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE BACKWASH PIT PUMP PANEL (P-601, P-602)',
    title: 'WASTE EVACUATION PUMPS',
    code: 'WH-T2',
    shape: 'trapezium',
    pages: [
      {
        name: 'PIT',
        columns: [
          [{ kind: 'gauges', items: ['PIT DEPTH'], vertical: true }],
          [
            {
              kind: 'selector',
              label: 'P-601',
              options: ['HAND', 'OFF', 'AUTO'],
              selected: 2,
            },
            {
              kind: 'selector',
              label: 'P-602',
              options: ['HAND', 'OFF', 'AUTO'],
              selected: 2,
            },
            { kind: 'buttons', labels: ['DUTY 1', 'DUTY 2'], latch: true },
            {
              kind: 'lamps',
              labels: ['P1 RUN', 'P2 RUN', 'HIGH LEVEL', 'HI-HI'],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'WH-FQR1, THE SEWER OUTFALL MONITOR',
    title: 'EFFLUENT DISCHARGE SURVEILLANCE',
    code: 'WH-FQR1',
    pages: [
      {
        name: 'OUTFALL',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['FLOW', 'm³/h', 0, 38],
                ['TOTAL', 'm³', 18420, 18460],
              ],
            },
            { kind: 'lamps', labels: ['OVER CONSENT'] },
          ],
          [{ kind: 'trend', name: 'OUTFALL m³/h · CONSENT RULED IN RED' }],
        ],
      },
    ],
  },
  {
    original: 'WH-FQR2, THE MAKE-UP WATER RECORDER',
    title: 'TOWN MAIN CONSUMPTION CHRONOGRAPH',
    code: 'WH-FQR2',
    size: { w: 1.4, h: 0.85 },
    pages: [
      {
        name: 'RECORD',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['FLOW', 'm³/h', 0, 20],
                ['TOTAL', 'm³', 9200, 9240],
              ],
            },
          ],
          [{ kind: 'trend', name: 'MAKE-UP m³/h' }],
        ],
      },
    ],
  },
  {
    original: 'WH-FT1, THE MAKE-UP FLOWMETER CONVERTER',
    title: 'ELECTROMAGNETIC FLOW SENSOR',
    code: 'WH-FT1',
    size: { w: 0.9, h: 0.7 },
    shape: 'hexagon',
    pages: [
      {
        name: 'FLOW',
        columns: [[{ kind: 'readouts', items: [['MAKE-UP', 'm³/h', 0, 12]] }]],
      },
    ],
  },
  {
    original: 'THE OZONE ALARM ENCLOSURES (PL1-GD1, PL2-GD1)',
    title: 'TRIATOMIC LEAK SENTRY',
    code: 'PL2-GD1',
    size: { w: 1.0, h: 0.8 },
    colour: 'red-damask',
    pages: [
      {
        name: 'SENTRY',
        columns: [
          [
            { kind: 'readouts', items: [['OZONE', 'ppm', 0, 0.12]] },
            { kind: 'lamps', labels: ['DETECTOR OK', 'A1 ALARM', 'A2 ALARM'] },
            { kind: 'buttons', labels: ['ACCEPT', 'RESET'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'EO-CP1, THE HYPERPLASC SCENARIO SIMULATOR',
    title: 'MULTIVERSE SCENARIO ENGINE',
    code: 'EO-CP1',
    size: { w: 1.4, h: 0.9 },
    colour: 'eggplant',
    pages: [
      {
        name: 'SCENARIOS',
        columns: [
          [
            { kind: 'buttons', labels: ['FULL OFF', 'FULL ON', 'SLOW START'] },
            { kind: 'banner', words: 'POWERED FROM BRANCHING UNIVERSES' },
            { kind: 'lamps', labels: ['STATUS', 'SCENARIO RUNNING'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE DUTY/STANDBY PUMP PANEL (DEV ROOM)',
    title: 'REDUNDANT PROPULSION SELECTOR',
    code: 'DUTY 01',
    pages: [
      {
        name: 'DUTY',
        columns: [
          [
            { kind: 'selector', label: 'DUTY', options: ['P1', 'P2'] },
            { kind: 'buttons', labels: ['START', 'STOP', 'RESET'] },
            {
              kind: 'lamps',
              labels: ['P1 RUN', 'P1 FAULT', 'DUTY FAIL', 'P2 FAULT', 'P2 RUN'],
            },
          ],
          [
            {
              kind: 'readouts',
              items: [
                ['FLOW', 'm³/h', 280, 320],
                ['DISCHARGE', 'bar', 1.8, 2.4],
              ],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE FILTER BACKWASH PANEL, FILTER 1 (FIVE-VALVE DEV ROOM)',
    title: 'SINGLE VESSEL PURGE CONTROL',
    code: 'FILTER 01',
    pages: [
      {
        name: 'PURGE',
        columns: [
          [
            {
              kind: 'selector',
              label: 'MODE',
              options: ['OFF', 'SERVICE', 'BACKWASH', 'RINSE'],
              selected: 1,
            },
            { kind: 'buttons', labels: ['START', 'STOP'] },
            { kind: 'lamps', labels: ['V1', 'V2', 'V3', 'V4', 'V5'] },
            {
              kind: 'lamps',
              labels: ['SUPPLY ON', 'VALVES MOVING', 'BACKWASH DUE'],
            },
          ],
        ],
      },
      {
        name: 'READINGS',
        columns: [
          [
            {
              kind: 'readouts',
              items: [
                ['FT1 IN', 'm³/h', 140, 160],
                ['FT5 RINSE', 'm³/h', 0, 20],
                ['BED DP', 'bar', 0.2, 0.7],
              ],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE POOL HEATING MIMIC, BOILER B-1 AND HX-1 (DEV ROOM)',
    title: 'THERMAL TRANSFER REGULATOR',
    code: 'HX-1',
    shape: 'rounded',
    pages: [
      {
        name: 'TRANSFER',
        columns: [
          [
            {
              kind: 'circuit',
              symbols: [
                { kind: 'boiler', label: 'B-1' },
                { kind: 'pump', label: 'P-1' },
                { kind: 'valve', label: 'TV-1' },
                { kind: 'boiler', label: 'HX-1' },
                { kind: 'tank', label: 'POOL' },
              ],
            },
          ],
          [
            {
              kind: 'selector',
              label: 'TV-1',
              options: ['MAN', 'AUTO'],
              selected: 1,
            },
            { kind: 'buttons', labels: ['SET +', 'CLOSE', 'STOP', 'OPEN'] },
            { kind: 'lamps', labels: ['BURNER', 'LOCKOUT', 'P-1 RUN'] },
            { kind: 'readouts', items: [['DUTY', 'kW', 60, 140]] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE PUMP LOCAL PANEL (BATTERY-BACKED PUMP)',
    title: 'UNINTERRUPTIBLE PROPULSION INDICATOR',
    code: 'PUMP 01',
    size: { w: 1.0, h: 0.7 },
    pages: [
      {
        name: 'PUMP',
        columns: [
          [
            { kind: 'lamps', labels: ['RUNNING'] },
            { kind: 'readouts', items: [['FLOW', 'm³/h', 250, 310]] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE LM4 LEAK MONITOR (DEV44)',
    title: 'HULL BREACH DETECTION',
    code: 'LM4',
    size: { w: 1.2, h: 0.8 },
    colour: 'red-damask',
    pages: [
      {
        name: 'ZONES',
        columns: [
          [
            {
              kind: 'lamps',
              labels: [
                'POWER',
                'ZONE 1 LEAK',
                'ZONE 2 LEAK',
                'ZONE 3 LEAK',
                'FAULT',
              ],
            },
            { kind: 'buttons', labels: ['TEST', 'SILENCE', 'RESET'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE JACUZZI TRIAL CONSOLE (DEV38)',
    title: 'EXPERIMENTAL HOT TUB TEST STAND',
    code: 'TRIAL 01',
    pages: [
      {
        name: 'VALVES',
        columns: [
          [
            {
              kind: 'buttons',
              labels: ['V1 OPEN', 'V1 SHUT', 'V2 OPEN', 'V2 SHUT'],
            },
            {
              kind: 'buttons',
              labels: ['V3 OPEN', 'V3 SHUT', 'V4 OPEN', 'V4 SHUT'],
            },
            {
              kind: 'buttons',
              labels: ['POWER', 'WATER', 'HEAT', 'BATHERS'],
              latch: true,
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE SECURITY OFFICE CCTV MONITOR (DEV18)',
    title: 'DEEP SPACE SURVEILLANCE · DEV16 POOL',
    code: 'CAM 01',
    size: { w: 1.2, h: 0.85 },
    shape: 'rounded',
    pages: [
      {
        name: 'MONITOR',
        columns: [
          [
            { kind: 'banner', words: 'CAM 1 · DEV16 POOL' },
            { kind: 'buttons', labels: ['POWER'], latch: true },
            { kind: 'gauges', items: ['BRIGHT', 'CONTRAST'] },
          ],
        ],
      },
    ],
  },
];
