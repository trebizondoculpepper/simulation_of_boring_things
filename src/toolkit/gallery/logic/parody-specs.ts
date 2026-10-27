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
];
