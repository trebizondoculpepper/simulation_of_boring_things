import type { ParodySpec } from './parody-trial';

/**
 * The game's panels, boards and mimics, each reinterpreted as a
 * 24th-century touch screen for dev48 (mission 093; the owner,
 * 2026-10-27): the same controls, lamps and read-outs as the original,
 * renamed with all the grandeur a swimming pool does not deserve. Each
 * names the original it parodies. Data only; `parody-panel.ts` builds
 * them and `parody-trial.ts` runs them.
 */
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
    code: 'MIMIC 01',
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
    code: 'MIMIC 02',
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
    original: 'THE AIR HANDLING MIMIC (CONTROL ROOM)',
    title: 'ATMOSPHERIC PROCESSING · POOL HALL',
    code: 'MIMIC 03',
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
    code: 'MIMIC 04',
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
    code: 'ANN 01',
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
    original: 'WH-CP1, THE CHEMICAL DISTRIBUTION PANEL (WET HALL)',
    title: 'MOLECULAR DISTRIBUTION NEXUS',
    code: 'WH-CP1',
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
    code: 'XFER 01',
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
  {
    original: 'THE DOSING CONTROLLER AND SAMPLE CELLS (AFTER DULCOMARIN)',
    title: 'WATER CHEMISTRY ORACLE',
    code: 'DOSE 01',
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
                ['PH', '', 7.1, 7.7],
                ['REDOX', 'mV', 680, 780],
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
            { kind: 'gauges', items: ['HYPO STROKE RATE', 'ACID STROKE RATE'] },
            {
              kind: 'lamps',
              labels: ['HYPO DOSING', 'ACID DOSING', 'SAMPLE FLOW FAULT'],
            },
            { kind: 'buttons', labels: ['STOP', 'START', 'RESET'] },
          ],
        ],
      },
      {
        name: 'MENU',
        columns: [
          [
            { kind: 'buttons', labels: ['▲', '▼', 'BACK', 'OK'] },
            {
              kind: 'list',
              rows: [
                'CALIBRATE PH',
                'CALIBRATE CL',
                'SET POINTS',
                'LIMITS',
                'LOG',
              ],
            },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE DELIVERY FILL CABINET (CHEMICAL STORE)',
    title: 'TANKER DOCKING PORT',
    code: 'FILL 01',
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
    code: 'GAS 01',
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
    code: 'O3 01',
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
    code: 'GAS 02',
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
    code: 'COMB 01',
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
    code: 'MIMIC 05',
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
    title: 'MAIN POWER DISTRIBUTION MATRIX',
    code: 'MSB 01',
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
    code: 'CBS 01',
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
    code: 'GEN 01',
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
    code: 'REC 01',
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
    code: 'RDO 01',
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
    code: 'BMS 01',
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
    code: 'FIRE 01',
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
            { kind: 'buttons', labels: ['SILENCE BUZZER', 'LAMP TEST'] },
          ],
        ],
      },
    ],
  },
  {
    original: 'THE CCTV MONITOR (FOUR CAMERAS IN QUARTERS)',
    title: 'VISUAL SURVEILLANCE ARRAY',
    code: 'CCTV 01',
    size: { w: 1.3, h: 0.9 },
    shape: 'hexagon',
    pages: [
      {
        name: 'QUAD',
        columns: [
          [
            { kind: 'banner', words: 'CAM 1 · DEEP END' },
            { kind: 'banner', words: 'CAM 2 · FLUME' },
          ],
          [
            { kind: 'banner', words: 'CAM 3 · RECEPTION' },
            { kind: 'banner', words: 'CAM 4 · VENDING' },
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
];
