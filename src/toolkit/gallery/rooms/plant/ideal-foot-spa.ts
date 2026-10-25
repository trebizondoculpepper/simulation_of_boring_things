import { BoxGeometry, Group, Mesh, MeshPhysicalMaterial } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import { createPartSet, selector } from '../../../components/core/parts/parts';
import { tools } from '../../../components/core/views/fitting-tools';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  createPoolInfoSign,
  markLive,
} from '../../../components/pool/views/pool-info-sign';
import { createSignState } from '../../../components/pool/logic/pool-info-sign';
import { createLine } from '../../../components/plant/views/pipe-line';
import type { PipeRequest } from '../../../components/core/logic/plumber';
import type { Vec3 } from '../../../components/core/logic/pipe-route';
import {
  createIdealFootSpaDemo,
  IDEAL_POOL,
} from '../../../../game/plant/ideal-pool';
import { spaPackDemoExhibit } from './spa-pack';

import { filtering, spaFilterLine } from '../../../../game/plant/spa-filter';

export const PURPOSE =
  'An isolated foot spa trial. Open MAKE-UP to fill the square ideal pool, turn on its Lidoluxe cabinet to heat and circulate it, then open DRAIN to empty it. The pool display and water quality sign read the same simulation.';
export const FINISH = { wall: '#cbd3d0', floor: '#929a97' };
export const START = { x: 0, z: 3.8, yaw: 0 };

let demo = createIdealFootSpaDemo();
export function prepareRoom() {
  demo = createIdealFootSpaDemo();
}
// For trying it from the console: `idealFootSpa.demo.filterAction({ act: 'wash-now' })`.
if (typeof window !== 'undefined')
  (window as unknown as { idealFootSpa?: unknown }).idealFootSpa = {
    get demo() {
      return demo;
    },
  };

const places = [
  { x: 0, z: -1.5, yaw: 0, y: 0 },
  { x: -3.5, z: 1.1, yaw: 0, y: 0 },
  { x: 3.3, z: 1.9, yaw: 0, y: 0 },
  { x: 3.3, z: 0.4, yaw: 0, y: 0 },
  { x: 3.3, z: -1.1, yaw: 0, y: 0 },
  { x: -3.7, z: -2.3, yaw: 0, y: 0 },
  { x: -4.9, z: 3, yaw: Math.PI / 2, y: 0 },
  { x: 4.6, z: -2.6, yaw: 0, y: 0 },
  { x: 4.6, z: 0.4, yaw: 0, y: 0 },
];
export function layoutRoom() {
  return {
    halfX: 6,
    halfZ: 5,
    height: 4,
    places,
    solids: [
      { minX: -1.16, maxX: 1.16, minZ: -2.66, maxZ: -0.34 },
      { minX: -4.55, maxX: -2.45, minZ: 0.15, maxZ: 2.05 },
      { minX: -5.3, maxX: -4.5, minZ: 2.3, maxZ: 3.7 },
    ],
  };
}

function idealPool(kit: PanelKit): LiveExhibit {
  const group = new Group();
  group.name = 'Ideal pool';
  group.userData.graphNodeId = 'demo.pool';
  const t = tools(kit);
  const { side, height } = IDEAL_POOL;
  const grey = new MeshPhysicalMaterial({
    color: '#a9b4b6',
    transparent: true,
    opacity: 0.32,
    roughness: 0.35,
    metalness: 0.08,
    depthWrite: false,
    side: 2,
  });
  const blue = new MeshPhysicalMaterial({
    color: '#38a8bf',
    transparent: true,
    opacity: 0.6,
    roughness: 0.16,
    transmission: 0.15,
    depthWrite: false,
  });
  kit.materials.push(grey, blue);
  const shell = new Mesh(new BoxGeometry(side, height, side), grey);
  shell.position.y = height / 2;
  group.add(shell);
  const water = new Mesh(new BoxGeometry(side - 0.08, 1, side - 0.08), blue);
  water.userData.live = true;
  group.add(water);
  const face = new Group();
  face.position.set(0, height * 0.55, side / 2 + 0.016);
  group.add(face);
  t.box(face, t.paint('#31383b', 0.55), 0.58, 0.25, 0.035, 0, 0, 0);
  const lcd = createCharacterLcd(kit, {
    columns: 20,
    rows: 2,
    cell: 0.012,
    backlight: true,
  });
  lcd.group.position.z = 0.024;
  face.add(lcd.group);
  const name = createMicroLabel(kit, 'IDEAL POOL · A4 RATIO', {
    height: 0.027,
    maxWidth: 0.9,
    ink: '#172b31',
  });
  name.position.set(0, height - 0.12, side / 2 + 0.02);
  group.add(name);
  for (const [x, z, title] of [
    [-0.75, -side / 2, 'MAKE-UP'],
    [-0.25, -side / 2, 'RETURN'],
    [0.25, -side / 2, 'SUCTION'],
    [0.75, -side / 2, 'DRAIN'],
  ] as const) {
    t.cyl(group, t.paint('#607d81', 0.4), 0.045, 0.13, x, 0.42, z, 'z');
    const label = createMicroLabel(kit, title, {
      height: 0.018,
      maxWidth: 0.36,
      ink: '#172b31',
    });
    label.position.set(x, 0.53, z - 0.08);
    label.rotation.y = Math.PI;
    group.add(label);
  }
  markLive(group);
  let shown = '';
  return {
    object: group,
    update() {
      const state = demo.state;
      const level = state.litres / IDEAL_POOL.capacityLitres;
      water.visible = level > 0.001;
      water.scale.y = Math.max(0.001, (height - 0.05) * level);
      water.position.y = water.scale.y / 2 + 0.025;
      const lines = [
        `WATER ${state.celsius.toFixed(1)} C`,
        `VOLUME ${state.litres.toFixed(0)} L`,
      ];
      const key = lines.join('|');
      if (shown !== key) {
        shown = key;
        lcd.show(lines);
      }
    },
  };
}

function source(
  kit: PanelKit,
  which: 'makeup' | 'heat' | 'mains',
): LiveExhibit {
  const terminal = demo.sources[which];
  const view = createExperimentalSourceView(kit, terminal);
  view.group.userData.graphNodeId =
    which === 'heat' ? 'demo.heating' : `demo.${which}`;
  return { object: view.group, update: () => view.update() };
}

function sink(kit: PanelKit, which: 'drain' | 'heatSink'): LiveExhibit {
  const view = createExperimentalSourceView(kit, demo.sinks[which]);
  view.group.userData.graphNodeId = `demo.${which}`;
  return { object: view.group, update: () => view.update() };
}

function qualitySign(kit: PanelKit): LiveExhibit {
  const sign = createPoolInfoSign(kit, 'post');
  const state = createSignState('IDEAL FOOT SPA');
  sign.object.userData.graphNodeId = 'demo.sign';
  markLive(sign.object);
  let seconds = 0;
  return {
    object: sign.object,
    update(delta) {
      seconds += delta;
      const s = demo.state;
      state.power = demo.sources.mains.remaining() > 0;
      state.clock = Math.floor(seconds) % 86400;
      state.readings.water = {
        value: s.litres ? s.celsius : null,
        at: seconds,
      };
      state.readings.ph = { value: s.litres ? s.ph : null, at: seconds };
      state.readings.free = {
        value: s.litres ? s.chlorine : null,
        at: seconds,
      };
      sign.show(state, seconds);
      sign.update(seconds);
    },
  };
}

function controls(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.userData.graphNodeId = 'demo.panel';
  const t = tools(kit);
  t.box(object, t.paint('#424c50', 0.6), 1.2, 1.6, 0.3, 0, 1.45, 0);
  const plate = createMicroLabel(kit, 'IDEAL FOOT SPA · TEST VALVES', {
    height: 0.038,
    maxWidth: 1.1,
    ink: '#ffffff',
    plate: '#344049',
  });
  plate.position.set(0, 2.06, 0.17);
  object.add(plate);
  const parts = createPartSet();
  const choices = [
    ['MAKE-UP', () => demo.state.fillOpen, demo.setFill],
    ['DRAIN', () => demo.state.drainOpen, demo.setDrain],
  ] as const;
  choices.forEach(([legend, get, set], i) => {
    const control = parts.add(
      selector(kit, {
        positions: 2,
        legend: `${legend} SHUT · OPEN`,
        name: `${legend} valve command`,
        bound: {
          get value() {
            return get() ? 1 : 0;
          },
          set: (v: number) => set(v === 1),
        },
      }),
    );
    control.object.position.set(0, 1.72 - i * 0.36, 0.17);
    control.object.scale.setScalar(1.8);
    object.add(control.object);
    const tag = createMicroLabel(kit, `${legend}    SHUT / OPEN`, {
      height: 0.033,
      maxWidth: 0.9,
      ink: '#ffffff',
      plate: '#344049',
    });
    tag.position.set(0, 1.88 - i * 0.36, 0.17);
    object.add(tag);
  });
  markLive(object);
  return {
    object,
    parts,
    update(delta) {
      demo.step(delta);
    },
  };
}

const make = (
  graphNodeId: string,
  title: string,
  reference: string,
  w: number,
  d: number,
  h: number,
  build: PlantExhibit['build'],
): PlantExhibit => ({
  graphNodeId,
  title,
  reference,
  size: { w, d, h, mount: 'floor' },
  build,
});
export const EXHIBITS: readonly PlantExhibit[] = [
  make(
    'demo.pool',
    'Ideal foot spa pool',
    'Square top, A4 width-to-height proportion; visual fill and live temperature/volume display',
    2.32,
    2.32,
    IDEAL_POOL.height,
    idealPool,
  ),
  spaPackDemoExhibit({
    state: () => demo.state,
    setPower: (on) => demo.setPower(on),
    setSetpoint: (v) => demo.setSetpoint(v),
    // Its filter's wash programme: the same as the jacuzzi's (`spa-filter.ts`).
    filter: {
      line: () => spaFilterLine(demo.state.filter),
      washing: () => !filtering(demo.state.filter),
      mode: () => demo.filterAction({ act: 'mode' }),
    },
  }),
  make(
    'demo.makeup',
    'Ideal mains water',
    'Unlimited 3 bar water source',
    0.7,
    0.7,
    1.2,
    (kit) => source(kit, 'makeup'),
  ),
  make(
    'demo.heating',
    'Ideal heating water',
    'Unlimited warm water source',
    0.7,
    0.7,
    1.2,
    (kit) => source(kit, 'heat'),
  ),
  make(
    'demo.mains',
    'Ideal 230 V supply',
    'Unlimited electrical source',
    0.7,
    0.7,
    1.2,
    (kit) => source(kit, 'mains'),
  ),
  make(
    'demo.sign',
    'Foot spa water quality sign',
    'Powered, live readings from the ideal pool',
    0.8,
    0.6,
    2.65,
    qualitySign,
  ),
  make(
    'demo.panel',
    'Foot spa test valves',
    'MAKE-UP and DRAIN commands',
    1.3,
    0.7,
    2.3,
    controls,
  ),
  make(
    'demo.drain',
    'Ideal drain',
    'Unlimited receiver for spa drain water',
    0.7,
    0.7,
    1.2,
    (kit) => sink(kit, 'drain'),
  ),
  make(
    'demo.heatSink',
    'Ideal heating return',
    'Unlimited receiver for primary heating water',
    0.7,
    0.7,
    1.2,
    (kit) => sink(kit, 'heatSink'),
  ),
];

/** Physical graph edges, routed in separate overhead lanes for inspection. */
export const IDEAL_PHYSICAL_ROUTES: readonly {
  edge: string;
  request: PipeRequest;
  points: readonly Vec3[];
}[] = [
  {
    edge: 'makeup',
    request: { commodity: 'mains-water', flow: 60 },
    points: [
      [3.3, 1.18, 1.9],
      [4.9, 1.18, 1.9],
      [4.9, 3.1, 1.9],
      [4.9, 3.1, -2.62],
      [-0.75, 3.1, -2.62],
      [-0.75, 0.42, -2.62],
    ],
  },
  {
    edge: 'suction',
    request: { commodity: 'pool-water', flow: 8, role: 'suction' },
    points: [
      [0.25, 0.42, -2.62],
      [0.25, 0.42, -3.3],
      [0.25, 2.6, -3.3],
      [-4.16, 2.6, -3.3],
      [-4.16, 2.6, 0.205],
      [-4.16, 1.16, 0.205],
    ],
  },
  {
    edge: 'return',
    request: { commodity: 'pool-water', flow: 8 },
    points: [
      [-2.98, 0.24, 0.205],
      [-2.98, 2.85, 0.205],
      [-2.98, 2.85, -3.45],
      [-0.25, 2.85, -3.45],
      [-0.25, 0.42, -3.45],
      [-0.25, 0.42, -2.62],
    ],
  },
  {
    edge: 'heating-flow',
    request: { commodity: 'lthw', flow: 1 },
    points: [
      [3.3, 1.18, 0.4],
      [3.3, 3.35, 0.4],
      [-3.185, 3.35, 0.4],
      [-3.185, 1.16, 0.4],
      [-3.185, 1.16, 0.205],
    ],
  },
  {
    edge: 'heating-return',
    request: { commodity: 'lthw', flow: 1 },
    points: [
      [-3.3, 1.26, 0.205],
      [-3.3, 3.55, 0.205],
      [4.6, 3.55, 0.205],
      [4.6, 3.55, 0.4],
      [4.6, 1.18, 0.4],
    ],
  },
  {
    edge: 'drain',
    request: { commodity: 'drainage', flow: 60 },
    points: [
      [0.75, 0.42, -2.62],
      [0.75, 0.42, -3.65],
      [0.75, 0.3, -3.65],
      [4.6, 0.3, -3.65],
      [4.6, 0.3, -2.6],
      [4.6, 1.18, -2.6],
    ],
  },
  {
    edge: 'cabinet-power',
    request: { commodity: 'ac-230v', current: 5 },
    points: [
      [3.18, 1.18, -1.1],
      [3.18, 1.18, -1.35],
      [3.18, 3.65, -1.35],
      [-4.25, 3.65, -1.35],
      [-4.25, 3.65, 0.38],
      [-4.25, 2.13, 0.38],
    ],
  },
  {
    edge: 'sign-power',
    request: { commodity: 'ac-230v', current: 1, lighting: true },
    points: [
      [3.3, 1.18, -1.1],
      [3.3, 3.75, -1.1],
      [-3.7, 3.75, -1.1],
      [-3.7, 3.75, -2.3],
      [-3.7, 2.55, -2.3],
    ],
  },
  {
    edge: 'panel-power',
    request: { commodity: 'ac-230v', current: 1 },
    points: [
      [3.42, 1.18, -1.1],
      [3.42, 1.18, -0.85],
      [3.42, 3.85, -0.85],
      [-5.1, 3.85, -0.85],
      [-5.1, 3.85, 3],
      [-5.1, 2.2, 3],
    ],
  },
];

export function buildRoomServices(kit: PanelKit): Group {
  const group = new Group();
  for (const route of IDEAL_PHYSICAL_ROUTES) {
    const line = createLine(kit, route.request, route.points, {
      ends: ['open', 'open'],
      label: route.edge,
    }).group;
    line.userData.graphEdgeId = route.edge;
    group.add(line);
  }
  return group;
}
