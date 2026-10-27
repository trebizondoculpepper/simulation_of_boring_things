import { Group } from 'three';
import {
  Banner,
  Bar,
  Button,
  Diagram,
  Elbow,
  Frame,
  Gauge,
  Indicator,
  Label,
  List,
  PageStack,
  Place,
  Readout,
  Segmented,
  Stack,
  Toggle,
  Trend,
  pageButton,
} from '../../../ui2d';
import type { UiNode } from '../../../ui2d';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { tools } from '../../components/core/views/fitting-tools';
import { createTouchSurface } from '../../components/industrial-control/views/touch-surface';
import type { TouchSurfaceOptions } from '../../components/industrial-control/views/touch-surface';
import {
  polygonOutline,
  roundedOutline,
  screenGrid,
  trapeziumOutline,
} from '../../components/industrial-control/logic/touch-surface';
import type { Point2 } from '../../components/industrial-control/logic/touch-surface';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/**
 * Dev47's touch panels (mission 093; the owner, 2026-10-27: "I just want
 * to see a variety of different controls on a variety of different
 * shapes ... can we lay out LCARS things in a 2D space in a 3D world?"):
 * `ui2d` trees on touch surfaces of every shape the generic tools make,
 * filled with an assortment of the kit's widgets under pool-flavoured
 * nonsense. Nothing means anything: the read-outs wander on their own,
 * but every touch answers (lit and pressed states, toggles, selectors,
 * page changes and bleeps).
 */

/** What makes the nonsense move: each called with the seconds since the room began. */
type Animator = (seconds: number) => void;

/** A wandering value between `lo` and `hi`, its own pace. */
const wander = (seconds: number, lo: number, hi: number, k: number) =>
  lo +
  (hi - lo) *
    (0.5 +
      0.35 * Math.sin(seconds * (0.21 + 0.07 * k) + k * 1.7) +
      0.15 * Math.sin(seconds * (0.9 + 0.13 * k) + k));

let codes = 7;
/** A panel code for an elbow, as the style numbers everything. */
const code = () =>
  `${(codes = (codes * 37 + 11) % 97).toString().padStart(2, '0')}-${((codes * 131) % 9000) + 1000}`;

const BUTTON_COLOURS = [
  'golden-tanoi',
  'lilac',
  'blue-bell',
  'anakiwa',
  'orange-peel',
  'hopbush',
  'periwinkle',
  'chestnut-rose',
];

/** A grid of buttons, `cols` across, each a toggle or a plain button by turns. */
function buttonGrid(labels: readonly string[], cols: number): UiNode {
  const rows: UiNode[] = [];
  for (let r = 0; r * cols < labels.length; r++)
    rows.push(
      new Stack(
        'row',
        labels.slice(r * cols, r * cols + cols).map((label, i) =>
          (r + i) % 2
            ? new Toggle({
                label,
                colour: BUTTON_COLOURS[(r * cols + i) % BUTTON_COLOURS.length],
              })
            : new Button({
                label,
                colour: BUTTON_COLOURS[(r * cols + i) % BUTTON_COLOURS.length],
                caps: i === 0 ? 'left' : i === cols - 1 ? 'right' : 'none',
              }),
        ),
      ),
    );
  return new Stack('column', rows);
}

/** Bar gauges, wandering. */
function gauges(
  names: readonly string[],
  animate: Animator[],
  vertical = false,
): UiNode {
  const list = names.map(
    (n, i) =>
      new Gauge(n, {
        vertical,
        colour: BUTTON_COLOURS[(i + 3) % BUTTON_COLOURS.length],
        marks: [0.2, 0.85],
      }),
  );
  animate.push((t) =>
    list.forEach((g, i) => {
      const v = wander(t, 0.05, 0.98, i);
      g.set(v, `${Math.round(v * 100)}%`);
    }),
  );
  return new Stack(vertical ? 'row' : 'column', list);
}

/** Read-outs, wandering; one in a while out of range and flashing. */
function readouts(
  specs: readonly [string, string, number, number][],
  animate: Animator[],
): UiNode {
  const list = specs.map(([name, unit]) => new Readout(name, unit));
  animate.push((t) =>
    list.forEach((r, i) => {
      const [, , lo, hi] = specs[i];
      const v = wander(t, lo, hi, i + 2);
      r.set(v.toFixed(hi - lo < 10 ? 2 : 0), v > lo + (hi - lo) * 0.93);
    }),
  );
  return new Stack('column', list);
}

/** A trend, sampled every half second. */
function trend(
  name: string,
  k: number,
  animate: Animator[],
  colour = 'anakiwa',
): UiNode {
  const tr = new Trend(name, {
    min: 0,
    max: 1,
    band: [0.3, 0.7],
    capacity: 80,
    colour,
  });
  let next = 0;
  animate.push((t) => {
    if (t < next) return;
    next = t + 0.5;
    tr.push(wander(t, 0.05, 0.95, k));
  });
  return tr;
}

/** A list of nonsense, its first row flashing now and then. */
function nonsenseList(rows: readonly string[], animate: Animator[]): UiNode {
  const list = new List({ onRow: () => undefined });
  animate.push((t) =>
    list.set(
      rows.map((words, i) => ({
        words,
        right: `${Math.round(wander(t, 10, 99, i))}`,
        colour: BUTTON_COLOURS[i % BUTTON_COLOURS.length],
        flashing: i === 0 && Math.sin(t / 3) > 0.6,
      })),
    ),
  );
  return list;
}

/** A small line diagram of a nonsense circuit: its pump and valves touchable. */
function circuit(animate: Animator[]): UiNode {
  const d = new Diagram({
    bounds: { minX: -1, minY: -0.6, maxX: 1, maxY: 0.6 },
    lines: [
      {
        id: 'a',
        points: [
          [-0.8, -0.3],
          [-0.2, -0.3],
          [-0.2, 0.3],
          [0.6, 0.3],
        ],
        colour: 'anakiwa',
        flow: 'forward',
      },
      {
        id: 'b',
        points: [
          [0.6, 0.3],
          [0.8, 0.3],
          [0.8, -0.3],
          [0.2, -0.3],
        ],
        colour: 'anakiwa',
        flow: 'forward',
      },
      {
        id: 'c',
        points: [
          [0.2, -0.3],
          [0.2, -0.5],
        ],
        colour: 'sandy-brown',
        flow: 'still',
      },
    ],
    symbols: [],
    texts: [
      { words: 'FLUME RETURN', at: [0, 0.48], size: 0.08, colour: 'tertiary' },
    ],
  });
  const state = { pump: true, v1: true, v2: false };
  d.symbols.push(
    {
      id: 'pump',
      shape: 'circle',
      at: [-0.5, -0.3],
      size: 0.2,
      colour: 'lilac',
      label: 'P-47',
      state: 'on',
      onPress: () => void (state.pump = !state.pump),
    },
    {
      id: 'v1',
      shape: 'bowtie',
      at: [0.2, 0.3],
      size: 0.14,
      colour: 'golden-tanoi',
      label: 'V1',
      state: 'on',
      onPress: () => void (state.v1 = !state.v1),
    },
    {
      id: 'v2',
      shape: 'bowtie',
      at: [0.2, -0.42],
      size: 0.12,
      upright: true,
      colour: 'golden-tanoi',
      label: 'V2',
      state: 'off',
      onPress: () => void (state.v2 = !state.v2),
    },
    {
      id: 'filter',
      shape: 'capsule',
      at: [0.8, 0],
      size: 0.16,
      aspect: 1.8,
      colour: 'blue-bell',
      label: 'F1',
      state: 'on',
    },
    {
      id: 'tank',
      shape: 'box',
      at: [-0.8, -0.1],
      size: 0.22,
      aspect: 1.4,
      colour: 'mariner',
      label: 'TANK',
      state: 'on',
    },
  );
  animate.push(() => {
    const on = state.pump && state.v1;
    d.setSymbol('pump', state.pump ? 'on' : 'off');
    d.setSymbol('v1', state.v1 ? 'on' : 'off');
    d.setSymbol('v2', state.v2 ? 'on' : 'off');
    d.setFlow('a', on ? 'forward' : 'still');
    d.setFlow('b', on ? 'forward' : 'still');
    d.setFlow('c', on && state.v2 ? 'forward' : 'still');
  });
  return d;
}

/** A frame with pages and their buttons in its sidebar, and extra sidebar buttons below. */
function paged(
  title: string,
  pages: Record<string, UiNode>,
  colour = 'lilac',
  extra: UiNode[] = [],
): UiNode {
  const stack = new PageStack(pages);
  return new Frame({
    title,
    code: code(),
    footer: 'POOL SYSTEMS · DECK 2',
    colour,
    sidebar: [
      ...stack.ids.map((id, i) =>
        pageButton(stack, id, {
          colour: BUTTON_COLOURS[i % BUTTON_COLOURS.length],
        }),
      ),
      ...extra,
    ],
    content: stack,
  });
}

/** A touch surface as a live exhibit, its nonsense moving. */
function exhibit(
  kit: PanelKit,
  options: TouchSurfaceOptions,
  animate: Animator[],
  mount?: (g: Group) => Group,
): LiveExhibit {
  const surface = createTouchSurface(kit, options);
  const parts = createPartSet();
  parts.add(surface.part);
  let seconds = 0;
  for (const a of animate) a(0);
  // On a wall by default: its frame's body standing out from the wall's face.
  const object = mount
    ? mount(surface.group as Group)
    : (() => {
        const g = new Group();
        surface.group.position.z = options.depth || 0.02;
        g.add(surface.group);
        return g;
      })();
  return {
    object,
    parts,
    update(delta) {
      seconds += delta;
      for (const a of animate) a(seconds);
      parts.update(delta);
    },
    status: () => `${options.name ?? 'Touch surface'}: a touch screen`,
  };
}

// ---- The panels -------------------------------------------------------------

/** A wide rectangle, one screen, the sidebar frame with three pages. */
export function sidebarPanel(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const tree = paged(
    'FILTRATION',
    {
      STATUS: new Stack('row', [
        gauges(
          ['SAND BED', 'SKIMMER ARRAY', 'LANE ROPES', 'VERRUCA FIELD'],
          animate,
        ),
        readouts(
          [
            ['CHLORINE RESIDUAL', 'mg/l', 0.6, 3.4],
            ['PH', '', 6.9, 7.9],
            ['TURBIDITY', 'NTU', 0.1, 0.9],
          ],
          animate,
        ),
      ]),
      BACKWASH: new Stack('column', [
        new Label('BACKWASH SEQUENCE · STAND BY', {
          size: 40,
          colour: 'golden-tanoi',
        }),
        buttonGrid(
          ['ISOLATE', 'DRAIN', 'AIR SCOUR', 'REVERSE', 'RINSE', 'RESTORE'],
          3,
        ),
        trend('BACKWASH FLOW', 2, animate, 'sandy-brown'),
      ]),
      DOSING: new Stack('row', [
        gauges(['HYPO', 'ACID', 'FLOC'], animate, true),
        nonsenseList(
          [
            'CHLORINE DEMAND',
            'BATHER LOAD',
            'SUNCREAM INDEX',
            'ARMBAND COUNT',
            'WHISTLE BLASTS',
          ],
          animate,
        ),
      ]),
    },
    'lilac',
  );
  return exhibit(
    kit,
    {
      name: 'Sidebar frame panel',
      screens: [{ rect: { x: 0, y: 0, w: 1.8, h: 1.0 }, tree }],
    },
    animate,
  );
}

/** A rounded frame, three screens in a grid: a banner strip over gauges and a trend. */
export function threeScreenPanel(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const [top, left, right] = screenGrid(
    1.6,
    0.95,
    0.03,
    [[1], [1, 1.3]],
    [1, 4],
    0.03,
  );
  const banner = new Banner();
  animate.push((t) =>
    banner.set(
      Math.sin(t / 2) > 0 ? 'WAVE MACHINE ARMED' : 'ALL LANES NOMINAL',
      Math.sin(t / 2) > 0,
    ),
  );
  const strip = new Stack(
    'row',
    [
      new Bar('golden-tanoi', 'left', '', { size: 60 }),
      banner,
      new Bar('golden-tanoi', 'right', '', { size: 60 }),
    ],
    { gap: 8 },
  );
  const leftTree = new Frame({
    title: 'TEMPERATURES',
    code: code(),
    colour: 'anakiwa',
    content: gauges(['LEARNER', 'MAIN', 'SPA', 'FLUME', 'AIR'], animate),
    sidebar: [
      new Toggle({ label: 'HEAT', colour: 'orange-peel' }),
      new Toggle({ label: 'COOL', colour: 'anakiwa' }),
    ],
  });
  const rightTree = new Frame({
    title: 'TRENDS',
    code: code(),
    colour: 'blue-bell',
    content: new Stack('column', [
      trend('INLET', 1, animate),
      trend('OUTLET', 4, animate, 'lilac'),
    ]),
    sidebar: [
      new Button({ label: '1 H', colour: 'blue-bell' }),
      new Button({ label: '24 H', colour: 'blue-bell' }),
    ],
  });
  return exhibit(
    kit,
    {
      name: 'Three-screen rounded panel',
      outline: roundedOutline(1.6, 0.95, 0.12),
      bezel: 0.03,
      screens: [
        { rect: top, tree: strip },
        { rect: left, tree: leftTree },
        { rect: right, tree: rightTree },
      ],
    },
    animate,
  );
}

/** A trapezium, narrow at its head: a selector above, a field of buttons below. */
export function trapeziumPanel(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const selector = new Place();
  selector.put(
    new Label('INFLATABLE DEPLOYMENT', { colour: 'golden-tanoi' }),
    0,
    0,
    1,
    0.3,
  );
  selector.put(
    new Segmented({
      options: ['HAND', 'OFF', 'AUTO'],
      selected: 2,
      colour: 'blue-bell',
    }),
    0,
    0.38,
    1,
    0.55,
  );
  const field = new Stack('row', [
    new Elbow('nw', 'lilac', code(), { size: 160 }),
    buttonGrid(
      ['FLOAT', 'NOODLE', 'RING', 'WHALE', 'MAT', 'KAYAK', 'DUCK', 'TUBE'],
      4,
    ),
  ]);
  return exhibit(
    kit,
    {
      name: 'Trapezium panel',
      outline: trapeziumOutline(1.4, 0.9, 0.9),
      screens: [
        { rect: { x: 0, y: 0.2, w: 0.78, h: 0.3 }, tree: selector },
        { rect: { x: 0, y: -0.2, w: 1.1, h: 0.36 }, tree: field },
      ],
    },
    animate,
  );
}

/** An L, concave: a tall screen and a low one round the notch. */
export function lPanel(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const l: Point2[] = [
    [-0.8, -0.5],
    [0.8, -0.5],
    [0.8, 0.05],
    [0.2, 0.05],
    [0.2, 0.5],
    [-0.8, 0.5],
  ];
  const tall = paged(
    'LANE CONTROL',
    {
      LANES: buttonGrid(
        [
          'LANE 1',
          'LANE 2',
          'LANE 3',
          'LANE 4',
          'LANE 5',
          'LANE 6',
          'LANE 7',
          'LANE 8',
        ],
        2,
      ),
      LOG: nonsenseList(
        ['LENGTHS SWUM', 'SPLASHES', 'BOMBS', 'NO PETTING'],
        animate,
      ),
    },
    'orange-peel',
  );
  const low = new Frame({
    title: 'FLUME',
    code: code(),
    colour: 'blue-bell',
    content: circuit(animate),
    sidebar: [new Toggle({ label: 'FLUME', on: true, colour: 'lilac' })],
  });
  return exhibit(
    kit,
    {
      name: 'L-shaped panel',
      outline: l,
      screens: [
        { rect: { x: -0.45, y: 0, w: 0.66, h: 0.96 }, tree: tall },
        { rect: { x: 0.35, y: -0.26, w: 0.86, h: 0.44 }, tree: low },
      ],
    },
    animate,
  );
}

/** Bezel-less: a long strip of bars, elbows and a banner, its frame flush with its screen. */
export function bezellessStrip(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const banner = new Banner();
  animate.push((t) =>
    banner.set(
      'BACKWASH SEQUENCE ENGAGED',
      Math.floor(t / 4) % 2 === 0,
      'orange-peel',
    ),
  );
  const tree = new Stack('row', [
    new Elbow('sw', 'golden-tanoi', code(), { size: 220 }),
    new Stack('column', [
      new Bar('golden-tanoi', 'none', 'AQUATICS'),
      new Stack('row', [
        banner,
        new Indicator({ label: 'DECK', colour: 'lilac', size: 140 }),
        new Button({ label: 'ACK', colour: 'hopbush', size: 120 }),
      ]),
      new Bar('lilac', 'right'),
    ]),
  ]);
  return exhibit(
    kit,
    {
      name: 'Bezel-less strip',
      bezel: 0,
      screens: [{ rect: { x: 0, y: 0, w: 2.4, h: 0.32 }, tree }],
    },
    animate,
  );
}

/** A curved strip, wrapping round the viewer. */
export function curvedStrip(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const tree = new Frame({
    title: 'OBSERVATION',
    code: code(),
    colour: 'anakiwa',
    unit: 64,
    sidebar: [
      new Toggle({ label: 'WAVES', colour: 'anakiwa' }),
      new Toggle({ label: 'BUBBLES', colour: 'lilac' }),
    ],
    content: new Stack('row', [
      nonsenseList(
        ['DIVING BOARD', 'TOWEL STOCK', 'LOCKER 47', 'CAFE QUEUE'],
        animate,
      ),
      trend('SPLASH INDEX', 3, animate, 'golden-tanoi'),
      gauges(['DEEP', 'SHALLOW'], animate),
    ]),
  });
  return exhibit(
    kit,
    {
      name: 'Curved strip',
      curve: 2.0,
      depth: 0,
      screens: [{ rect: { x: 0, y: 0, w: 2.2, h: 0.6 }, tree }],
    },
    animate,
  );
}

/** A hexagon holding a circuit. */
export function hexagonPanel(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const tree = new Stack('column', [
    new Bar('mariner', 'both', 'RECIRCULATION', { size: 40 }),
    circuit(animate),
  ]);
  return exhibit(
    kit,
    {
      name: 'Hexagonal panel',
      outline: polygonOutline(6, 0.55),
      screens: [{ rect: { x: 0, y: 0, w: 0.7, h: 0.6 }, tree }],
    },
    animate,
  );
}

/**
 * A freestanding console, its top raked toward the operator: a trapezium
 * outline with two screens, on a dark pedestal.
 */
export function rakedConsole(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const t = tools(kit);
  const left = paged(
    'CHEMICAL DOSING',
    {
      PUMPS: buttonGrid(['HYPO', 'ACID', 'CO2', 'FLOC', 'PRIME', 'PURGE'], 3),
      LEVELS: gauges(['HYPO', 'ACID', 'CO2'], animate, true),
    },
    'golden-tanoi',
  );
  const right = new Frame({
    title: 'MODE',
    code: code(),
    colour: 'lilac',
    sidebar: [
      new Toggle({ label: 'ALERT', colour: 'red-damask', litColour: 'alert' }),
    ],
    content: new Stack('column', [
      new Segmented({ options: ['I', '0', 'II'], colour: 'blue-bell' }),
      readouts(
        [
          ['BATHERS', '', 0, 240],
          ['FLOW', 'm³/h', 40, 95],
        ],
        animate,
      ),
    ]),
  });
  const deep = 0.6;
  return exhibit(
    kit,
    {
      name: 'Raked console',
      outline: trapeziumOutline(1.5, 1.2, deep),
      screens: [
        { rect: { x: -0.25, y: 0, w: 0.78, h: 0.5 }, tree: left },
        { rect: { x: 0.43, y: -0.02, w: 0.46, h: 0.42 }, tree: right },
      ],
    },
    animate,
    (surface) => {
      const g = new Group();
      // The pedestal, and the top raked 25° up from the operator's side.
      t.box(g, t.paint('#3a3836', 0.6), 1.3, 0.85, 0.5, 0, 0.425, -0.05);
      surface.rotation.x = -Math.PI / 2 + (25 * Math.PI) / 180;
      surface.position.set(0, 1.0, 0);
      g.add(surface);
      return g;
    },
  );
}

/** A lectern: a portrait rounded panel on a post, a keypad and a read-out. */
export function lectern(kit: PanelKit): LiveExhibit {
  const animate: Animator[] = [];
  const t = tools(kit);
  const tree = new Frame({
    title: 'ACCESS',
    code: code(),
    colour: 'orange-peel',
    unit: 52,
    content: new Stack('column', [
      readouts([['LOCKER', '', 1, 240]], animate),
      buttonGrid(
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'ENT'],
        3,
      ),
    ]),
    sidebar: [
      new Button({ label: 'SWIM', colour: 'anakiwa' }),
      new Button({ label: 'GYM', colour: 'lilac' }),
      new Button({ label: 'SPA', colour: 'hopbush' }),
    ],
  });
  return exhibit(
    kit,
    {
      name: 'Lectern',
      outline: roundedOutline(0.56, 0.82, 0.06),
      screens: [{ rect: { x: 0, y: 0, w: 0.5, h: 0.76 }, tree }],
    },
    animate,
    (surface) => {
      const g = new Group();
      t.box(g, t.paint('#2c2b2a', 0.6), 0.1, 1.0, 0.1, 0, 0.5, -0.05);
      t.box(g, t.paint('#2c2b2a', 0.6), 0.5, 0.04, 0.4, 0, 0.02, -0.05);
      surface.rotation.x = -(20 * Math.PI) / 180;
      surface.position.set(0, 1.35, 0);
      g.add(surface);
      return g;
    },
  );
}
