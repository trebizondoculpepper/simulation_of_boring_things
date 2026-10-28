import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPartSet, pushButton, selector } from '../../core/parts/parts';
import { plantTools } from './plant-tools';
import { createDistributionPanel } from './chemical-handling-kit';
import type { DistributionReading } from './chemical-handling-kit';
import { createOt216Terminal } from '../../industrial-control/views/ot216-terminal';
import { createChemControlBox } from './chem-control-box';
import {
  CONTROL,
  TRIAL_CHEMICALS,
  actOnChemControl,
  boxLive,
  controllerRunning,
  newChemControlTrial,
  pumpRuns,
  stepChemControl,
  terminalComms,
  terminalFeed,
} from '../logic/chem-control-trial';
import type {
  ChemControlTrial,
  Hoa,
  TrialAction,
} from '../logic/chem-control-trial';
import type { Chemical } from '../../../../game/plant/chemicals';

/** Each chemical's band, its terminal's title and its tag (prototype tags, until the wet hall's model gives them). */
const TERMINALS: Record<
  Chemical,
  { title: string; band: string; tag: string }
> = {
  hypochlorite: { title: 'HYPOCHLORITE', band: '#d2ae20', tag: 'PROTO-OT1' },
  acid: { title: 'ACID', band: '#b92b24', tag: 'PROTO-OT2' },
};
const BOX_TAG = 'PROTO-CB1';
const HOA: readonly Hoa[] = ['hand', 'off', 'auto'];

/**
 * Dev44's prototype of WH-CP1's replacement (prompt 091; the owner,
 * 2026-10-27): the hypochlorite and acid OT-216 terminals and the control
 * box, run by a trial of their own (`chem-control-trial.ts`) ten times
 * fast, with a trial station beside them to work the lines' local
 * controls (each selector's AUTO and HAND and its pick, each pump's HAND
 * · OFF · AUTO and trip RESET) and to make the faults the arrangement
 * gives (the wet hall's power, the MCB tripped, the controller hung, a
 * terminal's link broken, a day tank overfilled to high-high). With
 * `oldPanel`, today's WH-CP1 beside them, driven by the same trial, so
 * old and new can be compared side by side.
 *
 * On the floor at the middle of its footprint, a wall section behind,
 * its front toward +z.
 */
export function createChemControlPrototype(
  kit: PanelKit,
  { oldPanel = false }: { oldPanel?: boolean } = {},
) {
  let state: ChemControlTrial = newChemControlTrial();
  const act = (a: TrialAction) => (state = actOnChemControl(state, a));
  const root = new Group();
  const parts = createPartSet();
  const t = tools(kit);
  const p = plantTools(kit);
  const width = oldPanel ? 4.6 : 2.9;
  const wallZ = -0.25;
  t.box(
    root,
    t.paint('#bfc4bf', 0.8),
    width,
    2.3,
    0.05,
    0,
    1.15,
    wallZ - 0.025,
  );
  let x = -width / 2 + 0.2;

  // Today's panel, if wanted, on the left.
  let old: ReturnType<typeof createDistributionPanel> | null = null;
  if (oldPanel) {
    const read = (): Record<Chemical, DistributionReading> | null => {
      if (!state.hallPower) return null;
      const line = (c: Chemical): DistributionReading => {
        const l = state.lines[c];
        return {
          store: l.store / CONTROL.storeLitres,
          days: l.tanks.map((k) => k.litres / k.capacity),
          serving: l.serving,
          mode: l.mode,
          running: pumpRuns(state, c),
          tripped: l.tripped,
          inAuto: l.hoa === 'auto',
        };
      };
      return { hypochlorite: line('hypochlorite'), acid: line('acid') };
    };
    old = createDistributionPanel(kit, read);
    old.object.position.set(x + 0.8, 1.5, wallZ);
    root.add(old.object);
    for (const [o, use] of old.parts.uses) parts.uses.set(o, use);
    t.label(
      root,
      'TODAY: WH-CP1, CHEMICAL DISTRIBUTION PANEL',
      x + 0.8,
      0.85,
      wallZ + 0.002,
      0.03,
      '#1b1b1b',
      '#f4f3ee',
    );
    x += 1.9;
  }

  // The two terminals, side by side at eye height.
  const terminals = TRIAL_CHEMICALS.map((c, i) => {
    const spec = TERMINALS[c];
    const term = createOt216Terminal(kit, {
      ...spec,
      read: () => ({
        feed: terminalFeed(state, c),
        link: { powered: boxLive(state), comms: terminalComms(state, c) },
      }),
      send: (command) =>
        act({ act: 'terminal', chemical: c, tag: spec.tag, command }),
    });
    const tx = x + 0.15 + i * 0.32;
    term.object.position.set(tx, 1.55, wallZ);
    root.add(term.object);
    for (const [o, use] of term.parts.uses) parts.uses.set(o, use);
    t.label(
      root,
      `${spec.tag}\n${spec.title}`,
      tx,
      1.69,
      wallZ + 0.002,
      0.016,
      '#1b1b1b',
      '#f4f3ee',
    );
    return { c, term, x: tx };
  });
  t.label(
    root,
    'NEW: OT-216 TERMINALS AND CONTROL BOX',
    x + 0.6,
    1.88,
    wallZ + 0.002,
    0.03,
    '#1b1b1b',
    '#f4f3ee',
  );
  x += 0.75;

  // The control box, beside them.
  const box = createChemControlBox(kit, {
    tag: BOX_TAG,
    read: () => {
      const running = controllerRunning(state);
      const h = state.lines.hypochlorite;
      const a = state.lines.acid;
      const outlets = (l: typeof h) =>
        [0, 1, 2, 3].map((i) => l.mode === 'auto' && l.serving === i);
      const run = (c: Chemical) => {
        const l = state.lines[c];
        return l.serving !== null && l.mode === 'auto' && !l.tripped;
      };
      return {
        live: boxLive(state),
        running,
        hung: state.box.hung,
        inputs: [
          h.mode === 'auto',
          h.hoa === 'auto',
          !h.tripped,
          a.mode === 'auto',
          a.hoa === 'auto',
          !a.tripped,
        ],
        outputs: [
          run('hypochlorite'),
          ...outlets(h),
          run('acid'),
          ...outlets(a),
        ],
        links: [state.box.links.hypochlorite, state.box.links.acid],
      };
    },
  });
  const boxX = x + 0.4;
  box.object.position.set(boxX, 1.4, wallZ);
  root.add(box.object);
  for (const [o, use] of box.parts.uses) parts.uses.set(o, use);
  t.label(root, BOX_TAG, boxX, 1.65, wallZ + 0.002, 0.02, '#1b1b1b', '#f4f3ee');
  // Each terminal's cable in conduit, down and along to the box's glands.
  const conduit = p.paint('#5d6265', 0.6);
  terminals.forEach(({ x: tx }, i) => {
    const gx = tx + 0.06;
    const y = 1.05 - i * 0.04;
    const bx = boxX - 0.2 + i * 0.1;
    const z = wallZ + 0.025;
    p.rod(root, conduit, [gx, 1.35, z], [gx, y, z], 0.01, 8);
    p.rod(root, conduit, [gx, y, z], [bx, y, z], 0.01, 8);
    p.rod(root, conduit, [bx, y, z], [bx, 1.19, z], 0.01, 8);
  });
  x += 0.85;

  // The trial station: the lines' local controls, and the faults.
  const station = new Group();
  station.position.set(x + 0.4, 1.2, wallZ);
  root.add(station);
  t.box(station, t.paint('#d9d4c4', 0.55), 0.8, 0.9, 0.04, 0, 0, 0.02);
  t.label(
    station,
    'TRIAL STATION\n(the stores’ and selectors’ local controls; faults)',
    0,
    0.4,
    0.041,
    0.018,
    '#1b1b1b',
    '#f4f3ee',
  );
  const place = <P extends { object: Group | import('three').Object3D }>(
    part: P,
    px: number,
    py: number,
    caption: string,
  ) => {
    part.object.position.set(px, py, 0.042);
    station.add(part.object);
    // Printed under it, large enough to read from the floor.
    t.label(
      station,
      caption,
      px,
      py - 0.07,
      0.041,
      0.011,
      '#1b1b1b',
      '#f4f3ee',
    );
    return part;
  };
  type Synced = () => void;
  const syncs: Synced[] = [];
  TRIAL_CHEMICALS.forEach((c, i) => {
    const y = 0.22 - i * 0.24;
    t.label(
      station,
      c === 'acid' ? 'ACID' : 'HYPO',
      -0.36,
      y,
      0.041,
      0.018,
      '#ffffff',
      TERMINALS[c].band,
    );
    const sel = parts.add(
      place(
        selector(kit, {
          positions: 2,
          initial: 1,
          legend: 'SEL HAND  AUTO',
          name: `${c} selector HAND · AUTO`,
        }),
        -0.22,
        y,
        'SELECTOR\nHAND · AUTO',
      ),
    );
    const pick = parts.add(
      place(
        selector(kit, {
          positions: 4,
          initial: 0,
          legend: 'PICK PL1-4',
          name: `${c} selector pick`,
        }),
        -0.08,
        y,
        'SELECTOR\nPICK PL1–4',
      ),
    );
    const hoa = parts.add(
      place(
        selector(kit, {
          positions: 3,
          initial: 2,
          legend: 'PUMP HAND OFF AUTO',
          name: `${c} pump HAND · OFF · AUTO`,
        }),
        0.08,
        y,
        'PUMP\nHAND·OFF·AUTO',
      ),
    );
    parts.add(
      place(
        pushButton(kit, {
          colour: 'blue',
          legend: 'RESET',
          name: `${c} trip reset`,
          action: () => act({ act: 'reset', chemical: c }),
        }),
        0.2,
        y,
        'PUMP TRIP\nRESET',
      ),
    );
    const link = parts.add(
      place(
        selector(kit, {
          positions: 2,
          initial: 1,
          legend: 'LINK CUT  OK',
          name: `${c} terminal link`,
        }),
        0.33,
        y,
        'TERMINAL\nLINK CUT · OK',
      ),
    );
    syncs.push(() => {
      const l = state.lines[c];
      const mode = sel.position.value === 0 ? 'hand' : 'auto';
      if (l.mode !== mode) act({ act: 'selector', chemical: c, to: mode });
      if (l.pick !== pick.position.value)
        act({ act: 'pick', chemical: c, tank: pick.position.value });
      const to = HOA[hoa.position.value];
      if (l.hoa !== to) act({ act: 'hoa', chemical: c, to });
      const ok = link.position.value === 1;
      if (state.box.links[c] !== ok) act({ act: 'link', chemical: c, ok });
    });
  });
  const faultY = -0.3;
  const power = parts.add(
    place(
      selector(kit, {
        positions: 2,
        initial: 1,
        legend: 'WET HALL POWER',
        name: 'wet hall power',
      }),
      -0.3,
      faultY,
      'WET HALL\nPOWER',
    ),
  );
  syncs.push(() => {
    const on = power.position.value === 1;
    if (state.hallPower !== on) act({ act: 'hall-power', on });
  });
  parts.add(
    place(
      pushButton(kit, {
        colour: 'red',
        legend: 'TRIP MCB',
        name: 'trip the box MCB',
        action: () => box.mcb.trip(),
      }),
      -0.12,
      faultY,
      'TRIP\nBOX MCB',
    ),
  );
  parts.add(
    place(
      pushButton(kit, {
        colour: 'black',
        legend: 'HANG PLC',
        name: 'hang the controller',
        action: () => act({ act: 'hang' }),
      }),
      0.04,
      faultY,
      'HANG\nCONTROLLER',
    ),
  );
  parts.add(
    place(
      pushButton(kit, {
        colour: 'white',
        legend: 'PL4 HI-HI',
        name: 'overfill hypochlorite PL4',
        action: () =>
          act({ act: 'level', chemical: 'hypochlorite', tank: 3, share: 0.99 }),
      }),
      0.2,
      faultY,
      'OVERFILL\nHYPO PL4',
    ),
  );
  // The box's own isolator and MCB drive the trial.
  syncs.push(() => {
    const on = box.isolator.on.value;
    if (state.box.isolator !== on) act({ act: 'isolator', on });
    const tripped = box.mcb.position.value !== 'on';
    if (state.box.mcbTripped !== tripped) act({ act: 'mcb', tripped });
  });

  // For a script in the browser (development only): the trial now, and
  // the terminals' keys and access keys, as clicks would work them.
  if (typeof window !== 'undefined')
    Object.assign(window, {
      chemControlTrial: () => state,
      chemControlTerminals: Object.fromEntries(
        terminals.map(({ c, term }) => [
          c,
          { press: term.press, turnKey: term.turnKey, status: term.status },
        ]),
      ),
      chemControlBox: { open: (to = true) => box.setOpen(to) },
    });

  return {
    object: root,
    parts,
    /** The trial now, for a script or a test in the browser. */
    trial: () => state,
    terminals: terminals.map(({ term }) => term),
    box,
    update(delta: number) {
      parts.update(delta);
      for (const sync of syncs) sync();
      state = stepChemControl(state, delta * 10);
      for (const { term } of terminals) term.update(delta);
      box.update(delta);
      old?.update(delta);
    },
    status() {
      const said = [
        ...terminals.map(({ term }) => term.status()),
        box.status(),
        ...state.log.slice(0, 3),
      ];
      return said.join('; ');
    },
  };
}
