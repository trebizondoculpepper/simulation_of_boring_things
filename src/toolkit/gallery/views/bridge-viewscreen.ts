import { Group } from 'three';
import {
  Banner,
  Diagram,
  Frame,
  List,
  PageStack,
  Readout,
  Stack,
} from '../../../ui2d';
import type { DiagramLine, DiagramSymbol } from '../../../ui2d';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createTouchSurface } from '../../components/industrial-control/views/touch-surface';
import type { Annunciator } from '../../components/industrial-control/logic/annunciator';
import { createPartSet } from '../../components/core/parts/parts';
import { ALARM_TEXT, ANNUNCIATOR_ALARMS } from '../logic/control-room-demo';
import { BRIDGE_BINDINGS, viewscreenShows } from '../logic/bridge-bindings';
import type { BridgeContext } from '../logic/bridge-bindings';
import { CAPACITY } from '../../../game/bathers';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/**
 * The bridge's main viewscreen (mission 095, stage 4: a live overview for
 * now; its full modes are mission 093's stage 2): the main pool's circuit
 * as an animated schematic, the water moving while its pumps run, each
 * machine's state as the control room's main pool board has it
 * (`BRIDGE_BINDINGS['CR-MP1']`), with the pool's water and bathers
 * beside it; and, while any alarm on the bridge's annunciator is
 * unaccepted, the alarm list instead, flashing, each with the room to go
 * to, until it is accepted (at Central Control or the annunciator).
 * Shows only; nothing on it is touched. Repainted on change, its flows at
 * most ten times a second (the touch surface's).
 */
export function createViewscreen(
  kit: PanelKit,
  size: { w: number; h: number },
  context: () => BridgeContext | null,
  annunciator: Annunciator,
): LiveExhibit {
  const mimic = BRIDGE_BINDINGS['CR-MP1'];
  // The circuit, left to right along the foot, up and back along the top.
  const at: Record<string, [number, number]> = {
    'BALANCE TANK': [-1.55, -0.45],
    P1: [-0.95, -0.62],
    P2: [-0.95, -0.28],
    F1: [-0.25, -0.45],
    F2: [0.15, -0.45],
    DOSE: [0.75, -0.45],
    HX: [1.25, -0.45],
  };
  const kinds: Record<string, DiagramSymbol['shape']> = {
    'BALANCE TANK': 'box',
    P1: 'circle',
    P2: 'circle',
    F1: 'capsule',
    F2: 'capsule',
    DOSE: 'bowtie',
    HX: 'box',
  };
  const symbols: DiagramSymbol[] = Object.entries(at).map(([label, p]) => ({
    id: label,
    shape: kinds[label],
    at: p,
    size: label === 'DOSE' ? 0.1 : label.startsWith('P') ? 0.16 : 0.2,
    aspect: label.startsWith('F') ? 1.5 : label === 'BALANCE TANK' ? 1 : 1,
    colour:
      label === 'HX'
        ? 'orange-peel'
        : label === 'DOSE'
          ? 'golden-tanoi'
          : label.startsWith('P')
            ? 'lilac'
            : 'blue-bell',
    label,
    state: 'on',
  }));
  symbols.push({
    id: 'POOL',
    shape: 'box',
    at: [0, 0.45],
    size: 1.1,
    aspect: 0.3,
    colour: 'anakiwa',
    label: 'OLYMPIC POOL',
    state: 'on',
  });
  const lines: DiagramLine[] = [
    {
      id: 'suction',
      points: [
        [-1.55, -0.45],
        [-1.2, -0.45],
        [-1.2, -0.62],
        [-0.95, -0.62],
      ],
      colour: 'anakiwa',
    },
    {
      id: 'suction-2',
      points: [
        [-1.2, -0.45],
        [-1.2, -0.28],
        [-0.95, -0.28],
      ],
      colour: 'anakiwa',
    },
    {
      id: 'discharge',
      points: [
        [-0.95, -0.62],
        [-0.6, -0.62],
        [-0.6, -0.45],
        [1.25, -0.45],
        [1.6, -0.45],
        [1.6, 0.45],
        [0.6, 0.45],
      ],
      colour: 'anakiwa',
    },
    {
      id: 'discharge-2',
      points: [
        [-0.95, -0.28],
        [-0.6, -0.28],
        [-0.6, -0.45],
      ],
      colour: 'anakiwa',
    },
    {
      id: 'return',
      points: [
        [-0.6, 0.45],
        [-1.55, 0.45],
        [-1.55, -0.45],
      ],
      colour: 'blue-bell',
    },
  ];
  const diagram = new Diagram({
    bounds: { minX: -1.8, minY: -0.8, maxX: 1.8, maxY: 0.75 },
    lines,
    symbols,
  });
  const readouts = [
    new Readout('CIRCULATION', 'm³/h', { colour: 'anakiwa' }),
    new Readout('FREE CHLORINE', 'mg/l', { colour: 'golden-tanoi' }),
    new Readout('PH', '', { colour: 'lilac' }),
    new Readout('WATER', '°C', { colour: 'orange-peel' }),
    new Readout('BATHERS', `/ ${CAPACITY.pool_02}`, { colour: 'periwinkle' }),
  ];
  const schematic = new Stack(
    'row',
    [diagram, new Stack('column', readouts, { size: 520 })],
    { gap: 24 },
  );
  const banner = new Banner({ size: 90 });
  const list = new List({ rowHeight: 56 });
  const alarms = new Stack('column', [banner, list]);
  const pages = new PageStack({ SCHEMATIC: schematic, ALARMS: alarms });
  const frame = new Frame({
    title: 'MAIN VIEWER · OLYMPIC CIRCULATION',
    code: 'VS-01',
    footer: 'LIVE · THE PLANT AS THE WORLD HAS IT',
    colour: 'golden-tanoi',
    sidebar: [],
    content: pages,
  });
  const surface = createTouchSurface(kit, {
    name: 'Main viewscreen',
    bezel: 0.02,
    radius: 0.1,
    // Coarse for its size: it is seen from across the room.
    screens: [
      { rect: { x: 0, y: 0, ...size }, tree: frame, pixelsPerMetre: 64 },
    ],
  });
  const parts = createPartSet();
  parts.add(surface.part);
  const object = new Group();
  object.add(surface.group);
  let next = 0;
  let seconds = 0;
  const read = () => {
    const c = context();
    if (!c) return;
    // The alarms the annunciator senses, as its board's.
    annunciator.sense(
      ANNUNCIATOR_ALARMS.map((id) => c.reading.alarms.includes(id)),
    );
    const flashing = ANNUNCIATOR_ALARMS.filter(
      (_, i) => annunciator.states[i] === 'flashing',
    );
    const mode = viewscreenShows(flashing.length);
    pages.show(mode);
    frame.topBar.setTitle(
      mode === 'ALARMS'
        ? 'MAIN VIEWER · ALERT'
        : 'MAIN VIEWER · OLYMPIC CIRCULATION',
    );
    if (mode === 'ALARMS') {
      banner.set(
        `ALERT · ${flashing.length} ALARM${flashing.length > 1 ? 'S' : ''} UNACCEPTED · ACCEPT AT CENTRAL CONTROL`,
        true,
      );
      list.set(
        ANNUNCIATOR_ALARMS.filter((id) => c.reading.alarms.includes(id)).map(
          (id) => ({
            words: ALARM_TEXT[id].window.replace('\n', ' '),
            right: `GO TO ${ALARM_TEXT[id].room}`,
            colour: flashing.includes(id) ? 'alert' : 'golden-tanoi',
            flashing: flashing.includes(id),
          }),
        ),
      );
      return;
    }
    for (const [label, s] of Object.entries(mimic.symbols ?? {}))
      diagram.setSymbol(label, s.state(c));
    const moving = mimic.flow?.(c) ? 'forward' : 'still';
    for (const l of lines) diagram.setFlow(l.id!, moving);
    const p = c.world.pools.pool_02;
    readouts[0].set(c.world.pools.pool_02.flow.toFixed(0));
    readouts[1].set(
      p.freeChlorine.toFixed(2),
      p.freeChlorine < 1 || p.freeChlorine > 3,
    );
    readouts[2].set(p.ph.toFixed(2), p.ph < 7 || p.ph > 7.8);
    readouts[3].set(p.temperature.toFixed(1));
    readouts[4].set(String(c.world.bathers.pools.pool_02.now));
  };
  return {
    object,
    parts,
    update(delta) {
      seconds += delta;
      if (seconds >= next) {
        next = seconds + 0.5;
        read();
      }
      parts.update(delta);
    },
    status: () => 'The main viewscreen: the Olympic circulation, or the alarms',
  };
}
