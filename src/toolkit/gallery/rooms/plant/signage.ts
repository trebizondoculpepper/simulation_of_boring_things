import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { SANS } from '../../../components/core/views/fitting-tools';
import { plantTools } from '../../../components/plant/views/plant-tools';
import {
  createDymoLabel,
  createPipeTape,
  createTapeLabel,
  createTieTag,
} from '../../../components/core/views/hand-labels';
import {
  createBrassPlate,
  createEngravedPlate,
  createHandwrittenSheet,
  createLaminatedNotice,
  createStencilText,
  createValveTag,
} from '../../../components/core/views/plant-signs';
import {
  createEscapeSign,
  createFireDoorSign,
  createFirstAidSign,
} from '../../../components/general-safety/views/escape-signs';
import { createWarningSign } from '../../../components/general-safety/views/safety-fittings';
import {
  createEmergencySign,
  createHazardLabel,
  createMandatorySign,
} from '../../../components/plant/views/chemicals-signs';
import { createEndSuctionPump } from '../../../components/plant/views/pumps-plant';
import { PIPE_SIZES } from '../../../components/plant/views/plant-tools';
import type { PlantExhibit } from './exhibit';
import { SAFETY_EXHIBITS } from './safety-signage';
import { POOL_SIGN_POST, POOL_SIGN_WALL } from './pool-sign-demo';

/**
 * dev13: signage and labels, from the formal to the casual: the brass
 * plate the installer fitted with the maker's mark, engraved laminate
 * plates, stamped valve tags, Dymo tape, printed safety signs, laminated
 * notices, card tags on cable ties, and marker pen on duct tape and
 * masking tape where somebody needed to say something in a hurry.
 */
export const PURPOSE =
  'Signs and labels, from engraved brass to marker pen on duct tape';

type Tools = ReturnType<typeof plantTools>;

/** A painted board for wall exhibits, `w` × `h`, its face at z = 0.02. */
function board(t: Tools, parent: Object3D, w: number, h: number) {
  t.box(parent, t.paint('#c9ccc4', 0.85), w, h, 0.02, 0, 0, 0.01);
}

/** A small printed caption under an item, facing +z. */
function caption(
  t: Tools,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
) {
  const label = t.printed(
    0.24,
    0.03,
    (c, cw, ch) => {
      c.fillStyle = '#eef0ea';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#1f2b31';
      c.font = `bold ${ch * 0.55}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, cw / 2, ch / 2, cw * 0.95);
    },
    256,
  );
  label.mesh.position.set(x, y, 0.021);
  parent.add(label.mesh);
}

/** Put `item` on the board at (x, y), just off its face. */
const at = (parent: Object3D, item: Object3D, x: number, y: number) => {
  item.position.set(x, y, 0.022);
  parent.add(item);
  return item;
};

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'From formal to casual',
    reference:
      'One pump, P-101, as it might be labelled: by the maker, the installer, the contractor, the staff',
    size: { w: 2.7, d: 0.06, h: 0.8, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 2.7, 0.8);
      const items: [Object3D, string][] = [
        [
          createBrassPlate(kit, 'grundflow', [
            'P-101',
            'MAIN POOL CIRCULATION',
          ]),
          'Engraved brass, maker',
        ],
        [
          createEngravedPlate(kit, ['P-101', 'MAIN POOL CIRC PUMP', 'DUTY']),
          'Engraved laminate',
        ],
        [createValveTag(kit, 'P101'), 'Stamped brass tag'],
        [
          createDymoLabel(kit, 'P101 DUTY PUMP', { colour: 'blue' }),
          'Dymo tape',
        ],
        [
          createTieTag(kit, 'P-101\nSEAL CHANGED\n12/99 JB', {
            ink: 'black',
            card: '#f3eccf',
          }),
          'Card tag',
        ],
        [
          createTapeLabel(kit, 'DUTY', { tape: 'masking', width: 0.12 }),
          'Masking tape',
        ],
        [
          createTapeLabel(kit, 'P1 — DO NOT\nRUN DRY!!', {
            tape: 'duct',
            height: 0.07,
            ink: 'red',
            seed: 4,
          }),
          'Duct tape',
        ],
      ];
      items.forEach(([item, name], i) => {
        const x = -1.12 + i * 0.37;
        at(group, item, x, 0.08);
        caption(t, group, name, x, -0.28);
      });
      return group;
    },
  },
  {
    title: 'Tape and marker',
    reference:
      'Duct tape, masking tape and electrical tape, written on in marker; torn off the roll, stuck on crooked',
    size: { w: 1.6, d: 0.06, h: 0.9, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 1.6, 0.9);
      const labels: [string, Parameters<typeof createTapeLabel>[2]][] = [
        ['P2 — DO NOT RUN DRY!', { tape: 'duct', ink: 'red', seed: 2 }],
        ['STANDBY (BEARING NOISY)', { tape: 'duct', seed: 3, width: 0.3 }],
        ['F3 BACKWASH → V3', { tape: 'masking', seed: 5 }],
        ['MAINS OFF @ DB2 WAY 7', { tape: 'masking', seed: 6, width: 0.26 }],
        [
          'SPARE',
          { tape: 'electrical-yellow', width: 0.1, height: 0.019, seed: 7 },
        ],
        ['L1', { tape: 'electrical-red', width: 0.05, height: 0.019, seed: 8 }],
        [
          'PUMP 3 TRIP?? RING ALAN',
          { tape: 'duct', ink: 'blue', seed: 9, width: 0.3 },
        ],
        [
          'DON’T TOUCH',
          { tape: 'electrical-black', width: 0.16, height: 0.019, seed: 10 },
        ],
      ];
      labels.forEach(([text, options], i) => {
        const col = i % 2,
          row = Math.floor(i / 2);
        at(
          group,
          createTapeLabel(kit, text, options),
          -0.38 + col * 0.76,
          0.3 - row * 0.2,
        );
      });
      return group;
    },
  },
  {
    title: 'Dymo labels',
    reference:
      'Embossed plastic tape, 9 mm: raised white capitals, the period’s office label',
    size: { w: 1.0, d: 0.06, h: 0.6, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 1.0, 0.6);
      const strips: [string, 'red' | 'black' | 'blue' | 'green'][] = [
        ['P1 ISOLATOR', 'black'],
        ['BMS OUTSTATION 2', 'blue'],
        ['ACID DOSE PUMP', 'red'],
        ['DO NOT SWITCH OFF', 'red'],
        ['CCTV PSU', 'green'],
        ['SPARE WAY', 'black'],
      ];
      strips.forEach(([text, colour], i) => {
        const label = createDymoLabel(kit, text, { colour, seed: i + 1 });
        label.scale.setScalar(2.2);
        at(
          group,
          label,
          -0.22 + (i % 2) * 0.44,
          0.18 - Math.floor(i / 2) * 0.17,
        );
      });
      caption(t, group, 'Shown twice life size', 0, -0.26);
      return group;
    },
  },
  {
    title: 'Engraved plates',
    reference:
      'Laminate engraved through to its core, and the maker’s brass plates, screwed on',
    size: { w: 1.5, d: 0.06, h: 0.8, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 1.5, 0.8);
      at(
        group,
        createEngravedPlate(kit, [
          'DB-3',
          'LOCAL DISTRIBUTION BOARD',
          'FED FROM MSB WAY 4',
        ]),
        -0.45,
        0.24,
      );
      at(
        group,
        createEngravedPlate(kit, ['EMERGENCY STOP'], {
          colour: 'red',
          width: 0.16,
          height: 0.04,
        }),
        0.05,
        0.27,
      );
      at(
        group,
        createEngravedPlate(
          kit,
          ['ISOLATE ELSEWHERE', 'BEFORE REMOVING COVER'],
          { colour: 'yellow' },
        ),
        0.45,
        0.24,
      );
      at(
        group,
        createEngravedPlate(kit, ['CL-01', 'HYPOCHLORITE DOSING'], {
          colour: 'white',
        }),
        -0.45,
        0.0,
      );
      at(
        group,
        createEngravedPlate(kit, ['MCC-1', 'POOL PLANT MOTOR CONTROL CENTRE'], {
          colour: 'blue',
        }),
        0.25,
        0.0,
      );
      at(
        group,
        createBrassPlate(kit, 'hamwarmy', [
          'B-1  BOILER 300 kW',
          'SERIAL 99/1147  1999',
        ]),
        -0.4,
        -0.24,
      );
      at(
        group,
        createBrassPlate(kit, 'mistral', [
          'AHU-1  POOL HALL',
          'SUPPLY 6.2 m³/s',
        ]),
        0.2,
        -0.24,
      );
      return group;
    },
  },
  {
    title: 'Safety signs',
    reference:
      'Printed signs to BS EN ISO 7010: escape, fire door, first aid, warning, mandatory, emergency, hazard',
    size: { w: 2.2, d: 0.06, h: 1.0, mount: 'wall', y: 1.6 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 2.2, 1.0);
      at(group, createEscapeSign(kit, 'right', true), -0.75, 0.3);
      at(group, createFireDoorSign(kit), -0.2, 0.3);
      at(group, createFirstAidSign(kit), 0.2, 0.3);
      at(
        group,
        createWarningSign(kit, ['DANGER', '400 VOLTS'], 0.25, 0.18),
        0.65,
        0.3,
      );
      at(
        group,
        createMandatorySign(t, 0.3, 0.2, ['gloves', 'visor'], 'WEAR PPE'),
        -0.65,
        -0.18,
      );
      at(
        group,
        createEmergencySign(t, 0.2, 0.2, 'eyewash', 'EYE WASH'),
        -0.2,
        -0.18,
      );
      at(
        group,
        createHazardLabel(
          t,
          0.36,
          0.2,
          'SODIUM HYPOCHLORITE',
          'Causes severe burns',
          ['corrosive', 'environment'],
        ),
        0.35,
        -0.18,
      );
      return group;
    },
  },
  {
    title: 'Notices',
    reference:
      'A laminated printed notice on Blu Tack, a sheet of A4 in marker, and a strip of masking tape',
    size: { w: 1.5, d: 0.08, h: 0.7, mount: 'wall', y: 1.5 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      board(t, group, 1.5, 0.7);
      at(
        group,
        createLaminatedNotice(kit, 'PLANT ROOM', [
          'Authorised persons only.',
          'Ear defenders must be worn',
          'when the pumps are running.',
          '',
          'Report faults to the Duty',
          'Manager, ext. 214.',
        ]),
        -0.5,
        0.0,
      );
      at(
        group,
        createHandwrittenSheet(kit, [
          'OUT OF ORDER',
          'USE OTHER SHOWER',
          '— Mgmt',
        ]),
        0.12,
        0.08,
      );
      at(
        group,
        createTapeLabel(kit, 'PLEASE CLOSE DOOR!!', {
          tape: 'masking',
          width: 0.26,
          seed: 12,
        }),
        0.5,
        -0.22,
      );
      return group;
    },
  },
  {
    title: 'Stencil lettering',
    reference:
      'Spray paint through a card stencil: tank and room numbers, warnings, floor markings',
    size: { w: 2.2, d: 0.06, h: 1.1, mount: 'wall', y: 1.4 },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      // A length of painted blockwork to spray on.
      t.box(group, t.paint('#d9d6c8', 0.9), 2.2, 1.1, 0.02, 0, 0, 0.01);
      at(
        group,
        createStencilText(kit, 'BT-1', { height: 0.2, seed: 1 }),
        -0.6,
        0.25,
      );
      at(
        group,
        createStencilText(kit, '36 M3', { height: 0.08, seed: 2 }),
        -0.6,
        0.0,
      );
      at(
        group,
        createStencilText(kit, 'NO SMOKING', {
          height: 0.1,
          colour: '#b5221b',
          seed: 3,
        }),
        0.4,
        0.3,
      );
      at(
        group,
        createStencilText(kit, 'DANGER\nCHLORINE', {
          height: 0.08,
          colour: '#b5221b',
          seed: 4,
        }),
        0.4,
        0.0,
      );
      at(
        group,
        createStencilText(kit, 'P1  P2', {
          height: 0.12,
          colour: '#1f4f9a',
          seed: 5,
        }),
        -0.6,
        -0.33,
      );
      at(
        group,
        createStencilText(kit, 'FIRE POINT', {
          height: 0.07,
          colour: '#b5221b',
          seed: 6,
          drips: false,
        }),
        0.4,
        -0.33,
      );
      return group;
    },
  },
  {
    title: 'A pump, as labelled',
    reference:
      'The maker’s brass plate, the installer’s laminate, a staff note on duct tape and a service tag',
    size: { w: 1.9, d: 0.9, h: 1.2, mount: 'floor' },
    build(kit) {
      const group = new Group();
      const pump = createEndSuctionPump(kit);
      group.add(pump);
      at(
        group,
        createBrassPlate(
          kit,
          'grundflow',
          ['NK 150-315  30 kW', 'No. 99/0331'],
          { width: 0.12, height: 0.06 },
        ),
        0.2,
        0.62,
      ).position.z = 0.33;
      at(
        group,
        createEngravedPlate(kit, ['P-101', 'MAIN POOL CIRC PUMP']),
        -0.3,
        0.12,
      ).position.z = 0.36;
      at(
        group,
        createTapeLabel(kit, 'DUTY — CHECK SEAL WEEKLY', {
          tape: 'duct',
          width: 0.28,
          seed: 14,
        }),
        0.35,
        0.12,
      ).position.z = 0.36;
      const tag = createTieTag(kit, 'SERVICED\n11/99 JB', {
        ink: 'black',
        card: '#f3eccf',
        seed: 15,
      });
      tag.position.set(-0.55, 0.8, 0.2);
      group.add(tag);
      return group;
    },
  },
  {
    title: 'Pipework, as labelled',
    reference:
      'Flow tape with a hand-drawn arrow on a DN100 return; electrical tape on a DN50; a valve with its brass tag and a card tag',
    size: { w: 2.2, d: 0.7, h: 1.3, mount: 'floor' },
    build(kit) {
      const t = plantTools(kit);
      const group = new Group();
      const galv = t.paint('#a9afae', 0.45, 0.6);
      // Two posts with cross-arms at each pipe's height, nothing above.
      for (const x of [-0.9, 0.9]) {
        t.rod(group, galv, [x, 0, -0.12], [x, 1.0, -0.12], 0.02);
        for (const y of [0.9 - 0.06, 0.55 - 0.035])
          t.box(group, galv, 0.04, 0.03, 0.26, x, y, 0);
      }
      const big = PIPE_SIZES[100].od / 2;
      t.pipe(group, 100, [
        [-1.0, 0.9, 0],
        [1.0, 0.9, 0],
      ]);
      t.butterflyValve(group, 100, [0.45, 0.9, 0], 'x');
      for (const [x, dir, seed] of [
        [-0.6, 1, 21],
        [-0.1, 1, 22],
      ] as const) {
        const tape = createPipeTape(kit, 'POOL RETURN', {
          radius: big,
          direction: dir,
          seed,
        });
        tape.rotation.z = -Math.PI / 2;
        tape.position.set(x, 0.9, 0);
        group.add(tape);
      }
      const small = PIPE_SIZES[50].od / 2;
      t.pipe(group, 50, [
        [-1.0, 0.55, 0],
        [1.0, 0.55, 0],
      ]);
      const band = createPipeTape(kit, 'ACID', {
        radius: small,
        direction: -1,
        tape: 'electrical-red',
        ink: 'white',
        width: 0.16,
        seed: 23,
      });
      band.rotation.z = -Math.PI / 2;
      band.position.set(-0.3, 0.55, 0);
      group.add(band);
      const brass = createValveTag(kit, 'V12');
      brass.position.set(0.45, 1.06, 0.06);
      group.add(brass);
      const card = createTieTag(kit, 'OUT OF SERVICE\nDO NOT USE\n14/10 SF', {
        seed: 24,
      });
      card.position.set(0.5, 1.02, 0.08);
      group.add(card);
      return group;
    },
  },
  // The poolside information sign, tried here and on dev0's boards.
  POOL_SIGN_WALL,
  POOL_SIGN_POST,
  // The building's modern safety signs and notices (`safety-signage.ts`).
  ...SAFETY_EXHIBITS,
];

/** For the room's test: a kit, so the exhibits can be built in tests. */
export type { PanelKit };
