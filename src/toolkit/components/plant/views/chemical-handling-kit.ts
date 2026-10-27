import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { computed, signal } from '@preact/signals-core';
import type { ReadonlySignal, Signal } from '@preact/signals-core';
import {
  actOnTransfer,
  levelOf,
  newTransferTrial,
  pumpRunning,
  stepTransfer,
  valveOpen,
  describeTank,
  levelTrend,
} from '../../../../game/plant/chemical-transfer-demo';
import type {
  Hoa,
  TransferAction,
  TransferTrial,
} from '../../../../game/plant/chemical-transfer-demo';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import {
  createPartSet,
  keySwitch,
  pilotLight,
  pushButton,
  selector,
} from '../../core/parts/parts';
import {
  createPanelMeter,
  createRoundGauge,
} from '../../industrial-control/views/panel-instruments';
import { createAnnunciatorPanel } from '../../industrial-control/views/cabinet-fittings';
import { createAnnunciator } from '../../industrial-control/logic/annunciator';
import { plantTools } from './plant-tools';
import { createFramedChemicalTank } from './framed-chemical-tank';
import { createDoseBottle } from './dose-bottle';
import { chlorellaPlate } from './chlorella-plate';
import { hose } from './hose';
import { createPipeMarker } from './pipe-marker';
import { createPeristalticPump } from './peristaltic-pump';
import {
  bottleLevel,
  bottleSize,
  newDoseBottle,
  stepDoseBottle,
} from '../../../../game/plant/dose-bottle';
import {
  DAY_TANKS,
  dayTankSize,
} from '../../../../game/plant/chemical-distribution';

/**
 * Dev44's chemical handling equipment beyond the bulk tanks
 * (`framed-chemical-tank.ts`; prompt 086; the owner, 2026-10-26): each a
 * working model after a real kind of product, under the game's makers.
 *
 * - The transfer pump skid: duty and standby sealless magnetic-drive
 *   pumps, as chemical transfer uses, on a bunded skid.
 * - The day tank station: a translucent HDPE day tank in its bund with its
 *   level switches, actuated inlet, dosing pump and safety gear.
 * - The chemical pipes: a sample stand of each kind.
 * - The store's chemical handling panel and a plant room's day tank panel.
 *
 * Metres; each on the floor (or a wall) at the middle of its footprint,
 * its front toward +z.
 */

type Chemical = 'hypochlorite' | 'acid';
const PRODUCT: Record<Chemical, string> = {
  hypochlorite: 'SODIUM HYPOCHLORITE 14%',
  acid: 'HYDROCHLORIC ACID 10%',
};
/** The chemical's line colour (BS 1710: acids and alkalis violet), and its ident band. */
const BAND: Record<Chemical, string> = {
  hypochlorite: '#d2ae20',
  acid: '#b92b24',
};

function translucent(kit: PanelKit, colour: string, opacity: number) {
  const m = new MeshStandardMaterial({
    color: colour,
    roughness: 0.55,
    transparent: true,
    opacity,
    side: DoubleSide,
    depthWrite: false,
  });
  kit.materials.push(m);
  return m;
}

// ---- The trial's state ----------------------------------------------------

/**
 * The transfer trial's state (`chemical-transfer-demo.ts`), shared by the
 * pump skid and the day tank it fills; whoever made it steps it.
 */
export interface TransferStore {
  state: ReadonlySignal<TransferTrial>;
  act(a: TransferAction): void;
  step(seconds: number): void;
  /** Whether its pump runs, where more decides it than the trial knows (the world's store's low level). */
  pumpOn?: ReadonlySignal<boolean>;
}

export function createTransferStore(
  initial: TransferTrial = newTransferTrial(),
): TransferStore {
  const state = signal(initial);
  return {
    state,
    act: (a) => (state.value = actOnTransfer(state.value, a)),
    step: (seconds) => (state.value = stepTransfer(state.value, seconds)),
  };
}

const HOA: readonly Hoa[] = ['hand', 'off', 'auto'];

// ---- The transfer pump skid ----------------------------------------------

/**
 * The transfer pump, after the sealless magnetic-drive
 * centrifugal pumps chemical transfer uses (Iwaki MX class): a polypropylene
 * pump head close-coupled to its motor, no seal to leak. Grundflow's, on a
 * galvanised skid over its own drip tray. One pump, not a duty and
 * standby pair (the owner, 2026-10-26: light work beside the water pumps',
 * and one that fails is soon swapped). Its suction and discharge
 * ball valves, a non-return valve, a pressure gauge on a diaphragm seal
 * (the chemical never reaches the gauge), a relief valve back to the tank.
 * The local station beside it: the pump's HAND · OFF · AUTO, its RUN and
 * TRIP lamps, the transfer selector's HAND · AUTO and the trip reset.
 */
export function createTransferPumpSkid(
  kit: PanelKit,
  chemical: Chemical,
  shared?: TransferStore,
) {
  const store = shared ?? createTransferStore();
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const parts = createPartSet();
  const maker = brandLivery(kit, 'grundflow');
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const pp = t.paint('#dcdcd2', 0.6);
  const pvc = t.paint('#5a5f63', 0.55);
  const dark = t.paint('#2a2f31', 0.6);
  const red = t.paint('#b8261f', 0.5);
  const band = t.paint(BAND[chemical], 0.5);

  // The skid and its tray.
  t.box(group, t.paint('#2b2d2e', 0.8), 1.5, 0.12, 0.9, 0, 0.06, 0);
  t.box(group, t.paint('#202223', 0.8), 1.42, 0.02, 0.82, 0, 0.125, 0);
  for (const z of [-0.4, 0.4]) t.box(group, galv, 1.4, 0.06, 0.06, 0, 0.17, z);

  const running = [
    store.pumpOn ?? computed(() => pumpRunning(store.state.value)),
  ];
  const tripped = computed(() => store.state.value.tripped);
  const gauges: ReturnType<typeof createRoundGauge>[] = [];
  const impellers: Group[] = [];

  for (const [i, x] of [[0, 0]] as const) {
    const p = new Group();
    p.position.set(x, 0.2, -0.05);
    group.add(p);
    // The motor: TEFC, finned, on its feet; the fan cowl at the back.
    t.box(p, galv, 0.24, 0.03, 0.2, 0, 0.015, -0.12);
    const motor = t.cyl(
      p,
      maker.paint.main,
      0.075,
      0.26,
      0,
      0.11,
      -0.13,
      'z',
      24,
    );
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      t.box(
        p,
        maker.paint.main,
        0.008,
        0.008,
        0.22,
        Math.cos(a) * 0.078,
        0.11 + Math.sin(a) * 0.078,
        -0.13,
      );
    }
    void motor;
    t.cyl(p, dark, 0.07, 0.04, 0, 0.11, -0.28, 'z', 24);
    t.box(p, maker.paint.main, 0.08, 0.06, 0.08, 0, 0.21, -0.1);
    // The bracket and the pump head: PP, axial suction to the front,
    // discharge up from the volute.
    t.cyl(p, galv, 0.06, 0.06, 0, 0.11, 0.03, 'z', 20);
    t.cyl(p, pp, 0.085, 0.07, 0, 0.11, 0.095, 'z', 28);
    const imp = new Group();
    imp.position.set(0, 0.11, 0.135);
    p.add(imp);
    for (let k = 0; k < 4; k++)
      t.box(imp, pp, 0.004, 0.06, 0.01, 0, 0, 0).rotation.z = (k * Math.PI) / 4;
    imp.traverse((o) => (o.userData.live = true));
    impellers.push(imp);
    t.cyl(p, pp, 0.03, 0.06, 0, 0.11, 0.15, 'z', 16);
    t.rod(p, pp, [0, 0.19, 0.095], [0, 0.3, 0.095], 0.022, 12);
    f.label(p, `P${i + 1}`, 0.1, 0.29, -0.02, 0.04, '#ffffff', '#2a2f31');
    f.label(
      p,
      'GRUNDFLOW MX-251 MAG DRIVE',
      0,
      0.06,
      -0.006 + 0.08,
      0.012,
      '#ffffff',
    );
    // Suction: from the header in front, its ball valve.
    t.rod(group, pvc, [x, 0.31, 0.15], [x, 0.31, 0.32], 0.025, 12);
    t.box(group, pvc, 0.08, 0.08, 0.08, x, 0.31, 0.25);
    t.box(group, red, 0.02, 0.015, 0.16, x, 0.37, 0.25).rotation.y =
      Math.PI / 2;
    // Discharge: up, its non-return valve, its gauge on a diaphragm seal,
    // its isolating valve, into the common main behind.
    const top = 0.2 + 0.3;
    t.cyl(group, pvc, 0.035, 0.09, x, top + 0.07, 0.045, 'y', 12);
    f.label(
      group,
      'NRV',
      x + 0.05,
      top + 0.07,
      0.045,
      0.014,
      '#ffffff',
      '#2a2f31',
    );
    t.rod(group, pvc, [x, top, 0.045], [x, top + 0.38, 0.045], 0.022, 12);
    t.cyl(
      group,
      t.paint('#c6cacb', 0.3, 0.7),
      0.03,
      0.03,
      x + 0.07,
      top + 0.2,
      0.045,
      'x',
      16,
    );
    t.rod(
      group,
      pvc,
      [x, top + 0.2, 0.045],
      [x + 0.06, top + 0.2, 0.045],
      0.012,
      8,
    );
    const g = createRoundGauge(kit, {
      radius: 0.045,
      label: 'bar',
      scaleMax: 6,
      redFrom: 0.75,
    });
    g.group.position.set(x + 0.12, top + 0.2, 0.045);
    g.group.rotation.y = 0;
    g.group.traverse((o) => (o.userData.live = true));
    group.add(g.group);
    gauges.push(g);
    t.box(group, pvc, 0.08, 0.08, 0.08, x, top + 0.3, 0.045);
    t.box(group, red, 0.16, 0.015, 0.02, x, top + 0.3, 0.1);
    t.rod(
      group,
      pvc,
      [x, top + 0.38, 0.045],
      [x, top + 0.38, -0.35],
      0.022,
      12,
    );
  }
  // The suction header and the common discharge main, banded by chemical;
  // the relief valve off the main, its return dropping back to the tank.
  t.rod(group, pvc, [-0.7, 0.31, 0.32], [0.7, 0.31, 0.32], 0.028, 12);
  t.rod(group, pvc, [-0.7, 0.88, -0.35], [0.7, 0.88, -0.35], 0.028, 12);
  for (const x of [-0.6, 0.6]) {
    t.cyl(group, band, 0.031, 0.05, x, 0.31, 0.32, 'x', 12);
    t.cyl(group, band, 0.031, 0.05, x, 0.88, -0.35, 'x', 12);
  }
  t.cyl(group, t.paint('#c9b437', 0.5), 0.03, 0.12, 0.55, 0.98, -0.35, 'y', 12);
  t.rod(group, pvc, [0.55, 1.04, -0.35], [0.66, 1.04, -0.35], 0.016, 8);
  t.rod(group, pvc, [0.66, 1.04, -0.35], [0.66, 0.2, -0.35], 0.016, 8);
  f.label(
    group,
    'PRV 4 bar → TANK',
    0.55,
    1.08,
    -0.31,
    0.016,
    '#1b1b1b',
    '#c9b437',
  );
  f.label(
    group,
    `${PRODUCT[chemical]} → DAY TANKS`,
    0,
    0.94,
    -0.31,
    0.02,
    '#ffffff',
    BAND[chemical],
  );
  f.label(
    group,
    `FROM BULK TANKS`,
    -0.45,
    0.37,
    0.36,
    0.018,
    '#ffffff',
    BAND[chemical],
  );

  // The local station on its post: the pump's HAND · OFF · AUTO (HAND runs
  // it for an outlet picked at the selector, AUTO for the day tanks'
  // calls, OFF never), its RUN and TRIP lamps, and the high-high trip's
  // reset. The selector's own mode is worked at the selector.
  const post = new Group();
  post.position.set(0.9, 0, 0.25);
  group.add(post);
  t.box(post, galv, 0.05, 1.3, 0.05, 0, 0.65, -0.05);
  const box = new Group();
  box.position.set(0, 1.25, 0);
  post.add(box);
  t.box(box, t.paint('#d9d4c4', 0.55), 0.32, 0.46, 0.12, 0, 0, 0);
  f.label(box, 'TRANSFER PUMP', 0, 0.2, 0.062, 0.018, '#1b1b1b');
  for (const i of [0]) {
    const y = 0.08 - i * 0.12;
    const sel = selector(kit, {
      positions: 3,
      legend: 'HAND · OFF · AUTO',
      bound: {
        get value() {
          return HOA.indexOf(store.state.value.hoa);
        },
        set: (n: number) => store.act({ act: 'hoa', to: HOA[n] }),
      },
    });
    sel.object.position.set(-0.08, y, 0.062);
    sel.object.scale.setScalar(0.8);
    box.add(sel.object);
    parts.add(sel);
    const run = pilotLight(kit, {
      colour: 'green',
      legend: 'RUN',
      drive: running[i],
    });
    run.object.position.set(0.05, y, 0.062);
    run.object.scale.setScalar(0.7);
    box.add(run.object);
    parts.add(run);
    const trip = pilotLight(kit, {
      colour: 'amber',
      legend: 'TRIP',
      drive: tripped,
    });
    trip.object.position.set(0.12, y, 0.062);
    trip.object.scale.setScalar(0.7);
    box.add(trip.object);
    parts.add(trip);
  }

  const stop = pushButton(kit, {
    colour: 'blue',
    legend: 'TRIP RESET',
    action: () => store.act({ act: 'reset' }),
  });
  stop.object.position.set(0, -0.1, 0.062);
  stop.object.scale.setScalar(0.7);
  box.add(stop.object);
  parts.add(stop);
  panelMakerMark(kit, box, { width: 0.32, height: 0.46, z: 0.061 });

  let spin = 0;
  // Chlorella's plate on the skid's front: they supply the skid, Grundflow the pump.
  const plate = chlorellaPlate(kit, 0.3, 'TRANSFER SKID · BUNDED');
  plate.position.set(0.45, 0.06, 0.451);
  group.add(plate);
  return {
    object: group,
    parts,
    update(delta: number) {
      if (!shared) store.step(delta);
      parts.update(delta);
      running.forEach((r, i) => {
        gauges[i].set(r.value ? 0.48 : 0.02);
        gauges[i].update(delta);
      });
      spin += delta * 30;
      impellers.forEach((imp, i) => {
        if (running[i].value) imp.rotation.z = spin;
      });
    },
    status: () =>
      `transfer pump ${running[0].value ? 'running' : 'stopped'}${store.state.value.tripped ? ', tripped' : ''}`,
  };
}

// ---- The duty and standby pump set (kept for later) ----------------------

/**
 * A duty and standby pair of the same magnetic-drive transfer pumps on one
 * skid, each with its own valves, non-return valve and diaphragm-seal
 * gauge into a common main; its station has each pump's HAND · OFF ·
 * AUTO with RUN and TRIP lamps, the duty selector, a DEMAND key and a
 * stop. Not used in dev44 (the owner, 2026-10-26: one pump will do for the
 * chemical transfer), kept for plant that does work hard enough to need a
 * standby. It runs on its own: the duty pump in AUTO while DEMAND is on.
 */
export function createDualTransferPumpSkid(kit: PanelKit, chemical: Chemical) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const parts = createPartSet();
  const maker = brandLivery(kit, 'grundflow');
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const pp = t.paint('#dcdcd2', 0.6);
  const pvc = t.paint('#5a5f63', 0.55);
  const dark = t.paint('#2a2f31', 0.6);
  const red = t.paint('#b8261f', 0.5);
  const band = t.paint(BAND[chemical], 0.5);
  t.box(group, t.paint('#2b2d2e', 0.8), 1.5, 0.12, 0.9, 0, 0.06, 0);
  t.box(group, t.paint('#202223', 0.8), 1.42, 0.02, 0.82, 0, 0.125, 0);
  for (const z of [-0.4, 0.4]) t.box(group, galv, 1.4, 0.06, 0.06, 0, 0.17, z);
  const hoa = [signal(2), signal(2)];
  const duty = signal(0);
  const demand = signal(false);
  const stopped = signal(false);
  const running = [0, 1].map((i) =>
    computed(
      () =>
        !stopped.value &&
        (hoa[i].value === 0 ||
          (hoa[i].value === 2 && demand.value && duty.value === i)),
    ),
  );
  const gauges: ReturnType<typeof createRoundGauge>[] = [];
  const impellers: Group[] = [];
  for (const [i, x] of [
    [0, -0.36],
    [1, 0.36],
  ] as const) {
    const p = new Group();
    p.position.set(x, 0.2, -0.05);
    group.add(p);
    t.box(p, galv, 0.24, 0.03, 0.2, 0, 0.015, -0.12);
    t.cyl(p, maker.paint.main, 0.075, 0.26, 0, 0.11, -0.13, 'z', 24);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      t.box(
        p,
        maker.paint.main,
        0.008,
        0.008,
        0.22,
        Math.cos(a) * 0.078,
        0.11 + Math.sin(a) * 0.078,
        -0.13,
      );
    }
    t.cyl(p, dark, 0.07, 0.04, 0, 0.11, -0.28, 'z', 24);
    t.box(p, maker.paint.main, 0.08, 0.06, 0.08, 0, 0.21, -0.1);
    t.cyl(p, galv, 0.06, 0.06, 0, 0.11, 0.03, 'z', 20);
    t.cyl(p, pp, 0.085, 0.07, 0, 0.11, 0.095, 'z', 28);
    const imp = new Group();
    imp.position.set(0, 0.11, 0.135);
    p.add(imp);
    for (let k = 0; k < 4; k++)
      t.box(imp, pp, 0.004, 0.06, 0.01, 0, 0, 0).rotation.z = (k * Math.PI) / 4;
    imp.traverse((o) => (o.userData.live = true));
    impellers.push(imp);
    t.cyl(p, pp, 0.03, 0.06, 0, 0.11, 0.15, 'z', 16);
    t.rod(p, pp, [0, 0.19, 0.095], [0, 0.3, 0.095], 0.022, 12);
    f.label(p, `P${i + 1}`, 0, 0.29, -0.02, 0.04, '#ffffff', '#2a2f31');
    t.rod(group, pvc, [x, 0.31, 0.15], [x, 0.31, 0.32], 0.025, 12);
    t.box(group, pvc, 0.08, 0.08, 0.08, x, 0.31, 0.25);
    t.box(group, red, 0.02, 0.015, 0.16, x, 0.37, 0.25).rotation.y =
      Math.PI / 2;
    const top = 0.5;
    t.cyl(group, pvc, 0.035, 0.09, x, top + 0.07, 0.045, 'y', 12);
    t.rod(group, pvc, [x, top, 0.045], [x, top + 0.38, 0.045], 0.022, 12);
    t.rod(
      group,
      pvc,
      [x, top + 0.2, 0.045],
      [x + 0.06, top + 0.2, 0.045],
      0.012,
      8,
    );
    const g = createRoundGauge(kit, {
      radius: 0.045,
      label: 'bar',
      scaleMax: 6,
      redFrom: 0.75,
    });
    g.group.position.set(x + 0.12, top + 0.2, 0.045);
    g.group.traverse((o) => (o.userData.live = true));
    group.add(g.group);
    gauges.push(g);
    t.box(group, pvc, 0.08, 0.08, 0.08, x, top + 0.3, 0.045);
    t.box(group, red, 0.16, 0.015, 0.02, x, top + 0.3, 0.1);
    t.rod(
      group,
      pvc,
      [x, top + 0.38, 0.045],
      [x, top + 0.38, -0.35],
      0.022,
      12,
    );
  }
  t.rod(group, pvc, [-0.7, 0.31, 0.32], [0.7, 0.31, 0.32], 0.028, 12);
  t.rod(group, pvc, [-0.7, 0.88, -0.35], [0.7, 0.88, -0.35], 0.028, 12);
  for (const x of [-0.6, 0.6])
    t.cyl(group, band, 0.031, 0.05, x, 0.88, -0.35, 'x', 12);
  const box = new Group();
  box.position.set(0.9, 1.25, 0.25);
  group.add(box);
  t.box(group, galv, 0.05, 1.3, 0.05, 0.9, 0.65, 0.2);
  t.box(box, t.paint('#d9d4c4', 0.55), 0.32, 0.46, 0.12, 0, 0, 0);
  f.label(box, 'TRANSFER PUMPS', 0, 0.2, 0.062, 0.018, '#1b1b1b');
  for (const i of [0, 1]) {
    const y = 0.11 - i * 0.12;
    const sel = selector(kit, {
      positions: 3,
      legend: `P${i + 1} HAND · OFF · AUTO`,
      bound: {
        get value() {
          return hoa[i].value;
        },
        set: (n: number) => (hoa[i].value = n),
      },
    });
    sel.object.position.set(-0.08, y, 0.062);
    sel.object.scale.setScalar(0.8);
    box.add(sel.object);
    parts.add(sel);
    const run = pilotLight(kit, {
      colour: 'green',
      legend: 'RUN',
      drive: running[i],
    });
    run.object.position.set(0.05, y, 0.062);
    run.object.scale.setScalar(0.7);
    box.add(run.object);
    parts.add(run);
    const trip = pilotLight(kit, {
      colour: 'amber',
      legend: 'TRIP',
      drive: stopped,
    });
    trip.object.position.set(0.12, y, 0.062);
    trip.object.scale.setScalar(0.7);
    box.add(trip.object);
    parts.add(trip);
  }
  const dutySel = selector(kit, {
    positions: 2,
    legend: 'DUTY P1 · P2',
    bound: {
      get value() {
        return duty.value;
      },
      set: (n: number) => (duty.value = n),
    },
  });
  dutySel.object.position.set(-0.08, -0.15, 0.062);
  dutySel.object.scale.setScalar(0.8);
  box.add(dutySel.object);
  parts.add(dutySel);
  const call = keySwitch(kit, {
    legend: 'DEMAND',
    bound: {
      get value() {
        return demand.value;
      },
      set: (v: boolean) => (demand.value = v),
    },
  });
  call.object.position.set(0.08, -0.15, 0.062);
  call.object.scale.setScalar(0.8);
  box.add(call.object);
  parts.add(call);
  const stop = pushButton(kit, {
    colour: 'red',
    legend: 'STOP · RESET',
    action: () => (stopped.value = !stopped.value),
  });
  stop.object.position.set(0, -0.2, 0.062);
  stop.object.scale.setScalar(0.7);
  box.add(stop.object);
  parts.add(stop);
  panelMakerMark(kit, box, { width: 0.32, height: 0.46, z: 0.061 });
  let spin = 0;
  // Chlorella's plate on the skid's front.
  const plate = chlorellaPlate(kit, 0.3, 'DUTY/STANDBY TRANSFER SKID');
  plate.position.set(0.45, 0.06, 0.451);
  group.add(plate);
  return {
    object: group,
    parts,
    update(delta: number) {
      parts.update(delta);
      running.forEach((r, i) => {
        gauges[i].set(r.value ? 0.48 : 0.02);
        gauges[i].update(delta);
      });
      spin += delta * 30;
      impellers.forEach((imp, i) => {
        if (running[i].value) imp.rotation.z = spin;
      });
    },
    status: () =>
      running
        .map((r, i) => `P${i + 1} ${r.value ? 'running' : 'stopped'}`)
        .join('; '),
  };
}

// ---- The day tank station -----------------------------------------------

/**
 * A day tank, after the small framed tanks dosing plant uses: black HDPE
 * in a galvanised frame, as the bulk tanks are (`framed-chemical-tank.ts`),
 * standing in its own bund (a spill tray of 110%). Its level read by its
 * ultrasonic sensor on its display, and shown by its float indicator
 * through the lid; its low and high float switches; its actuated inlet
 * valve on a riser off its branch, open while it fills; its outlet to the
 * dosing. Beside it, as asked: its own dosing pump on a bracket (where the
 * room has none), and the safety gear of a chemical point (an eyewash
 * station, a visor and gauntlets, the never-mix notice).
 */
export function createDayTankStation(
  kit: PanelKit,
  chemical: Chemical,
  shared?: TransferStore,
  /** Which of the trial's day tanks this is. */
  index = 0,
  {
    litres = 300,
    tag,
    withPump = true,
    withGear = true,
    centred = false,
  }: {
    litres?: number;
    tag?: string;
    withPump?: boolean;
    withGear?: boolean;
    /** Centred on its footprint (`dayTankFootprint`), as a room places it. */
    centred?: boolean;
  } = {},
) {
  const store = shared ?? createTransferStore();
  const root = new Group();
  const group = new Group();
  root.add(group);
  const t = plantTools(kit);
  const f = tools(kit);
  const parts = createPartSet();
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const pvc = t.paint('#5a5f63', 0.55);
  const dark = t.paint('#2a2f31', 0.6);
  const size = dayTankSize(litres);
  const { L, W, H } = size;
  // The bund: a black PE spill tray, 110% of the tank, its outlet in it.
  const tray = t.paint('#202223', 0.8);
  const bw = L + 0.4;
  const bd = W + 0.6;
  const bz = 0.05;
  const wallH = Math.min(0.3, Math.max(0.12, H * 0.35));
  t.box(group, tray, bw, 0.04, bd, 0, 0.02, bz);
  for (const [w, d, x, z] of [
    [bw, 0.04, 0, bz + bd / 2 - 0.02],
    [bw, 0.04, 0, bz - bd / 2 + 0.02],
    [0.04, bd, bw / 2 - 0.02, bz],
    [0.04, bd, -bw / 2 + 0.02, bz],
  ] as const)
    t.box(group, tray, w, wallH, d, x, wallH / 2, z);
  const tankTag = tag ?? `${chemical === 'acid' ? 'ADT' : 'HDT'}${index + 1}`;
  const tankZ = -0.2;
  const tank = createFramedChemicalTank(kit, {
    tag: tankTag,
    product: PRODUCT[chemical],
    litres,
    acid: chemical === 'acid',
    size,
    floatGauge: true,
    fillLine: false,
    outletSide: 1,
  });
  tank.object.position.set(0, 0.04, tankZ);
  group.add(tank.object);
  const top = 0.04 + 0.12 + H;
  const fill = computed(() => valveOpen(store.state.value, index));
  const level = computed(() => levelOf(store.state.value.tanks[index]));
  // Low and high switches: float switches in the lid, their cables.
  for (const [z, name] of [
    [-W * 0.22, 'LSL'],
    [W * 0.15, 'LSH'],
  ] as const) {
    const x = L / 2 - 0.08;
    t.cyl(
      group,
      t.paint('#d4a017', 0.5),
      0.018,
      0.05,
      x,
      top + 0.035,
      tankZ + z,
      'y',
      10,
    );
    t.cyl(group, dark, 0.007, 0.03, x, top + 0.075, tankZ + z, 'y', 6);
    f.label(group, name, x, top + 0.11, tankZ + z, 0.014, '#1b1b1b', '#d4a017');
  }
  // The inlet off its branch: a riser into the lid, its actuated valve, a
  // grey actuator with its yellow position dome, open while filling.
  const ix = -0.05;
  const iz = tankZ - W * 0.25;
  const riser = Math.max(1.65, top + 0.5);
  t.rod(group, pvc, [ix, top, iz], [ix, riser, iz], 0.02, 10);
  t.rod(group, pvc, [ix, riser, iz], [ix, riser, -bd / 2 - 0.1], 0.02, 10);
  const vy = Math.max(top + 0.25, 1.3);
  t.box(group, pvc, 0.08, 0.08, 0.08, ix, vy, iz);
  t.box(group, t.paint('#7b8285', 0.5), 0.12, 0.1, 0.1, ix, vy + 0.1, iz);
  t.cyl(
    group,
    t.paint('#e5c43a', 0.4),
    0.03,
    0.03,
    ix,
    vy + 0.165,
    iz,
    'y',
    12,
  );
  const pointer = t.box(group, dark, 0.05, 0.008, 0.008, ix, vy + 0.185, iz);
  pointer.userData.live = true;
  const trend = levelTrend();
  f.label(
    group,
    `${tankTag}-XV`,
    ix,
    vy,
    iz + 0.045,
    0.016,
    '#ffffff',
    '#2a2f31',
  );
  // Its outlet's draw-off, out to the dosing.
  const oy = 0.04 + 0.12 + Math.min(0.18, H * 0.3);
  const oz = tankZ + W / 2 + 0.38;
  const ox = -L / 2 + Math.min(0.45, L * 0.3) + 0.4;
  const px = bw / 2 + 0.27;
  let pump: ReturnType<typeof createPeristalticPump> | null = null;
  if (withPump) {
    // The dosing pump on its bracket beside the bund, fed from the outlet.
    t.box(group, galv, 0.04, 0.72, 0.04, px, 0.36, -0.2);
    t.box(group, galv, 0.3, 0.02, 0.24, px, 0.7, -0.2);
    pump = createPeristalticPump(
      kit,
      `${tag ?? chemical.toUpperCase()} DOSING`,
    );
    pump.object.position.set(px, 0.71, -0.2);
    group.add(pump.object);
    for (const [o, use] of pump.parts.uses) parts.uses.set(o, use);
    // A short rigid stub from the outlet valve, then a soft reinforced
    // PVC hose looping up to the pump's suction.
    t.rod(group, pvc, [ox, oy, oz], [ox + 0.12, oy, oz], 0.015, 10);
    hose(
      group,
      t.paint('#d9dcd2', 0.35),
      [
        [ox + 0.12, oy, oz],
        [px - 0.15, oy + 0.05, oz - 0.05],
        [
          px + pump.suctionAt[0],
          0.71 + pump.suctionAt[1],
          -0.2 + pump.suctionAt[2],
        ],
      ],
      0.006,
      0.05,
    );
  } else {
    // To the room's dosing pumps: up the bund's side and away at high level.
    t.rod(group, pvc, [ox, oy, oz], [bw / 2 - 0.1, oy, oz], 0.015, 10);
    t.rod(
      group,
      pvc,
      [bw / 2 - 0.1, oy, oz],
      [bw / 2 - 0.1, riser - 0.15, oz],
      0.012,
      8,
    );
    t.rod(
      group,
      pvc,
      [bw / 2 - 0.1, riser - 0.15, oz],
      [bw / 2 - 0.1, riser - 0.15, -bd / 2 - 0.1],
      0.012,
      8,
    );
  }
  if (withGear) {
    // The safety gear: the eyewash station on the wall, the visor and
    // gauntlets, the never-mix notice.
    const gear = new Group();
    gear.position.set(-bw / 2 - 0.3, 0, -bd / 2 + 0.05);
    group.add(gear);
    t.box(gear, t.paint('#2f8f4e', 0.5), 0.26, 0.36, 0.08, 0, 1.35, 0);
    for (const x of [-0.06, 0.06]) {
      t.cyl(gear, t.paint('#f2f2ee', 0.4), 0.035, 0.2, x, 1.33, 0.06, 'y', 16);
      t.cyl(gear, t.paint('#2f8f4e', 0.5), 0.02, 0.04, x, 1.45, 0.06, 'y', 12);
    }
    f.label(gear, 'EYE WASH', 0, 1.55, 0.045, 0.03, '#ffffff', '#2f8f4e');
    t.cyl(gear, galv, 0.008, 0.06, -0.08, 0.95, 0.03, 'z', 6);
    t.box(
      gear,
      translucent(kit, '#cfe7ef', 0.5),
      0.2,
      0.22,
      0.01,
      -0.08,
      0.84,
      0.065,
    );
    t.box(gear, t.paint('#2b2b2b', 0.6), 0.2, 0.03, 0.02, -0.08, 0.95, 0.065);
    t.cyl(gear, galv, 0.008, 0.06, 0.1, 0.95, 0.03, 'z', 6);
    for (const x of [0.07, 0.13])
      t.box(gear, t.paint('#3a7d3a', 0.7), 0.05, 0.3, 0.03, x, 0.8, 0.06);
    f.label(
      gear,
      'NEVER MIX ACID AND HYPOCHLORITE',
      0,
      1.7,
      0.01,
      0.022,
      '#1b1b1b',
      '#e5c43a',
    );
  }
  const fillLamp = pilotLight(kit, {
    colour: 'amber',
    legend: 'FILLING',
    drive: fill,
  });
  fillLamp.object.position.set(ix + 0.1, vy + 0.1, iz + 0.05);
  fillLamp.object.scale.setScalar(0.6);
  group.add(fillLamp.object);
  parts.add(fillLamp);
  // Centred on its footprint: the bund, with the pump's room to its right
  // and the gear's to its left.
  if (centred) {
    const left = bw / 2 + (withGear ? 0.55 : 0);
    const right = bw / 2 + (withPump ? 0.55 : 0);
    group.position.set((left - right) / 2, 0, -bz);
  }
  return {
    object: root,
    parts,
    level,
    update(delta: number) {
      if (!shared) store.step(delta);
      parts.update(delta);
      const tk = store.state.value.tanks[index];
      pump?.update(delta, tk.litres > 0 && tk.doseLpm > 0);
      tank.setLevel(level.value);
      pointer.rotation.y = fill.value ? Math.PI / 2 : 0;
      trend.sample(store.state.value.tanks[index].litres, delta);
    },
    status: () =>
      describeTank(
        `${chemical === 'acid' ? 'Hydrochloric acid' : 'Sodium hypochlorite'} day tank ${tankTag}`,
        level.value,
        trend.lpm(),
      ),
  };
}

// ---- The pipe samples ---------------------------------------------------

/**
 * The chemical lines, a sample of each on a stand, cut back so their
 * make-up shows:
 *
 * - double-contained ABS: a carrier pipe in a containment pipe on
 *   spacers, its leak detection port at the low point with its sensor;
 *   for every fill line and transfer main through the building;
 * - solvent-welded ABS chemical pipe, rigid runs inside a room, its
 *   fittings and ident bands;
 * - polyethylene dosing tube, clipped in square runs, pump to injection.
 */
export function createChemicalPipeSamples(kit: PanelKit) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const abs = t.paint('#4b4f53', 0.5);
  const clear = translucent(kit, '#cfd6d8', 0.35);
  // The stand: two uprights and three arms.
  for (const x of [-0.9, 0.9])
    t.box(group, galv, 0.05, 1.5, 0.05, x, 0.75, -0.15);
  for (const y of [0.5, 0.95, 1.4])
    t.box(group, galv, 1.9, 0.04, 0.04, 0, y, -0.15);
  // Double-contained: the outer clear here, cut away, so the carrier and
  // its spacers show; its detection port and sensor at the end.
  const y1 = 1.4 + 0.09;
  const outer = new Mesh(
    new CylinderGeometry(0.055, 0.055, 1.2, 28, 1, true),
    clear,
  );
  outer.rotation.z = Math.PI / 2;
  outer.position.set(-0.2, y1, -0.1);
  group.add(outer);
  t.cyl(group, abs, 0.057, 0.4, 0.6, y1, -0.1, 'x', 28);
  const dc = createPipeMarker(kit, {
    r: 0.057,
    chemical: 'hypochlorite',
    contained: true,
  });
  dc.object.position.set(0.6, y1, -0.1);
  dc.object.scale.x = Math.min(1, 0.38 / dc.length);
  group.add(dc.object);
  t.cyl(group, t.paint('#3b3e41', 0.5), 0.03, 1.7, 0, y1, -0.1, 'x', 20);
  for (const x of [-0.6, -0.2, 0.2])
    t.cyl(group, t.paint('#e5c43a', 0.5), 0.053, 0.02, x, y1, -0.1, 'x', 16);
  t.cyl(group, abs, 0.018, 0.12, 0.6, y1 - 0.1, -0.1, 'y', 10);
  t.box(group, t.paint('#2f63a3', 0.5), 0.05, 0.06, 0.05, 0.6, y1 - 0.19, -0.1);
  f.label(
    group,
    'LEAK SENSOR',
    0.6,
    y1 - 0.26,
    -0.07,
    0.018,
    '#ffffff',
    '#2f63a3',
  );
  f.label(
    group,
    'DOUBLE-CONTAINED ABS · DN25 IN DN63 · FILL LINES AND TRANSFER MAINS',
    0,
    y1 + 0.1,
    -0.08,
    0.022,
    '#1b1b1b',
    '#f4f3ee',
  );
  // Solvent-welded ABS: a run with a tee, an elbow and a union, its bands.
  const y2 = 0.95 + 0.06;
  t.rod(group, abs, [-0.8, y2, -0.1], [0.5, y2, -0.1], 0.025, 16);
  t.box(group, abs, 0.08, 0.08, 0.08, -0.2, y2, -0.1);
  t.rod(group, abs, [-0.2, y2, -0.1], [-0.2, y2 + 0.2, -0.1], 0.025, 16);
  t.cyl(group, abs, 0.04, 0.06, 0.2, y2, -0.1, 'x', 8);
  t.rod(group, abs, [0.5, y2, -0.1], [0.5, y2 + 0.25, -0.1], 0.025, 16);
  // Its identification markers (BS 1710): an acid line and a hypochlorite
  // line, each with its flow.
  for (const [x, chemical, flow] of [
    [-0.5, 'acid', 1],
    [0.15, 'hypochlorite', -1],
  ] as const) {
    const m = createPipeMarker(kit, { r: 0.025, chemical, flow });
    m.object.position.set(x, y2, -0.1);
    group.add(m.object);
  }
  f.label(
    group,
    'ABS CHEMICAL PIPE, SOLVENT-WELDED · DN25',
    0,
    y2 + 0.32,
    -0.08,
    0.022,
    '#1b1b1b',
    '#f4f3ee',
  );
  // PE dosing tube: 6 × 4 mm, clipped in square runs on a board.
  const y3 = 0.5 + 0.08;
  t.box(group, t.paint('#d5d1c4', 0.7), 1.6, 0.25, 0.02, 0, y3 + 0.02, -0.12);
  const tube = t.paint('#e8e5da', 0.4);
  const run: [number, number][] = [
    [-0.7, 0.08],
    [-0.2, 0.08],
    [-0.2, -0.05],
    [0.4, -0.05],
    [0.4, 0.08],
    [0.7, 0.08],
  ];
  for (let i = 0; i < run.length - 1; i++)
    t.rod(
      group,
      tube,
      [run[i][0], y3 + run[i][1], -0.1],
      [run[i + 1][0], y3 + run[i + 1][1], -0.1],
      0.004,
      6,
    );
  for (const [x, dy] of [
    [-0.5, 0.08],
    [0.1, -0.05],
    [0.55, 0.08],
  ] as const)
    t.box(group, t.paint('#2b2b2b', 0.6), 0.02, 0.025, 0.012, x, y3 + dy, -0.1);
  f.label(
    group,
    'PE DOSING TUBE 6 × 4 mm · PUMP TO INJECTION',
    0,
    y3 - 0.13,
    -0.1,
    0.02,
    '#1b1b1b',
    '#f4f3ee',
  );
  return group;
}

// ---- The panels ---------------------------------------------------------

/**
 * The chemical store's handling panel, Penfold Controls': a wall cabinet
 * with each bulk tank's contents on a moving-coil meter in percent, the
 * store's annunciator (high level, high-high and overfill valve shut, bund
 * leak, pipe leak, transfer pump trip, gas detected, delivery in
 * progress), ACCEPT, RESET and LAMP TEST, and a TEST key that raises each
 * alarm in turn, for trying it. Local: nothing here is worked from the
 * control room.
 */
export function createStoreHandlingPanel(kit: PanelKit, chemical: Chemical) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const parts = createPartSet();
  const W = 0.8;
  const H = 1.0;
  t.box(group, t.paint('#d9d4c4', 0.55), W, H, 0.22, 0, 0, 0.11);
  t.box(group, t.paint('#cfcabb', 0.55), W - 0.04, H - 0.04, 0.01, 0, 0, 0.225);
  f.label(
    group,
    `${chemical === 'acid' ? 'ACID' : 'HYPOCHLORITE'} STORE · CHEMICAL HANDLING`,
    0,
    H / 2 - 0.06,
    0.232,
    0.026,
    '#1b1b1b',
    '#f4f3ee',
  );
  const z = 0.232;
  const tanks = chemical === 'acid' ? 1 : 3;
  const levels = Array.from({ length: tanks }, (_, i) => 0.35 + i * 0.18);
  const meters = levels.map((_, i) => {
    const m = createPanelMeter(kit, '%', {
      width: 0.1,
      scaleMax: 100,
      redFrom: 0.9,
    });
    m.group.position.set((i - (tanks - 1) / 2) * 0.16, 0.3, z);
    m.group.traverse((o) => (o.userData.live = true));
    group.add(m.group);
    f.label(
      group,
      `${chemical === 'acid' ? 'AS' : 'HS'}-T${i + 1}`,
      (i - (tanks - 1) / 2) * 0.16,
      0.22,
      z,
      0.018,
      '#1b1b1b',
      '#f4f3ee',
    );
    return m;
  });
  const labels = [
    'HIGH LEVEL',
    'HIGH-HIGH OVERFILL SHUT',
    'BUND LEAK',
    'PIPE LEAK',
    'PUMP TRIP',
    'GAS DETECTED',
    'DELIVERY ON',
    'SUPPLY FAIL',
  ];
  const panel = createAnnunciatorPanel(kit, labels, { columns: 4, cell: 0.13 });
  panel.group.position.set(0, 0.0, z);
  panel.group.traverse((o) => (o.userData.live = true));
  group.add(panel.group);
  const logic = createAnnunciator(labels.length, { manualReset: true });
  const alarms = labels.map(() => false);
  let testing = -1;
  const button = (
    legend: string,
    colour: 'black' | 'white' | 'red',
    x: number,
    action: () => void,
  ) => {
    const p = pushButton(kit, { colour, legend, action });
    p.object.position.set(x, -0.25, z);
    p.object.traverse((o) => (o.userData.live = true));
    group.add(p.object);
    parts.add(p);
  };
  button('ACCEPT', 'black', -0.24, () => logic.acknowledge());
  button('RESET', 'black', -0.08, () => logic.reset());
  let lampTest = 0;
  button('LAMP TEST', 'white', 0.08, () => (lampTest = 2));
  button('TEST NEXT', 'red', 0.24, () => {
    if (testing >= 0) alarms[testing] = false;
    testing = (testing + 1) % (labels.length + 1);
    if (testing === labels.length) testing = -1;
    else alarms[testing] = true;
  });
  panelMakerMark(kit, group, {
    width: W,
    height: H,
    z: z,
    corner: 'bottom-right',
  });
  let time = 0;
  return {
    object: group,
    parts,
    update(delta: number) {
      time += delta;
      parts.update(delta);
      logic.sense(alarms);
      lampTest = Math.max(0, lampTest - delta);
      panel.set(lampTest > 0 ? labels.map(() => true) : logic.lit(time));
      meters.forEach((m, i) => {
        m.set(levels[i]);
        m.update(delta);
      });
    },
    status: () =>
      `alarms: ${labels.filter((_, i) => alarms[i]).join(', ') || 'none'}`,
  };
}

/**
 * A plant room's day tank panel, Penfold's: each day tank's level on a
 * meter, its FILLING and LOW lamps, its inlet valve's OPEN and SHUT, the
 * CIRCULATION PROVEN lamp that the dosing waits on, and a key to inhibit
 * the dosing for maintenance.
 */
export function createDayTankPanel(kit: PanelKit) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const parts = createPartSet();
  const W = 0.6;
  const H = 0.7;
  t.box(group, t.paint('#d9d4c4', 0.55), W, H, 0.18, 0, 0, 0.09);
  const z = 0.182;
  f.label(
    group,
    'DAY TANKS · DOSING',
    0,
    H / 2 - 0.05,
    z,
    0.024,
    '#1b1b1b',
    '#f4f3ee',
  );
  const level = [signal(0.6), signal(0.3)];
  const filling = [signal(false), signal(true)];
  const proven = signal(true);
  const inhibit = signal(false);
  const meters = ['HYPO', 'ACID'].map((name, i) => {
    const x = i ? 0.14 : -0.14;
    const m = createPanelMeter(kit, '%', { width: 0.09, scaleMax: 100 });
    m.group.position.set(x, 0.17, z);
    m.group.traverse((o) => (o.userData.live = true));
    group.add(m.group);
    f.label(group, `${name} DAY TANK`, x, 0.1, z, 0.016, '#1b1b1b', '#f4f3ee');
    const lamp = (
      legend: string,
      colour: 'amber' | 'red' | 'green' | 'white',
      dx: number,
      dy: number,
      drive: { value: boolean },
    ) => {
      const l = pilotLight(kit, { colour, legend, drive: drive as never });
      l.object.position.set(x + dx, dy, z);
      l.object.scale.setScalar(0.6);
      group.add(l.object);
      parts.add(l);
    };
    lamp('FILLING', 'amber', -0.05, 0.02, filling[i]);
    lamp(
      'LOW',
      'red',
      0.05,
      0.02,
      computed(() => level[i].value < 0.2),
    );
    lamp('XV OPEN', 'green', -0.05, -0.07, filling[i]);
    lamp(
      'XV SHUT',
      'white',
      0.05,
      -0.07,
      computed(() => !filling[i].value),
    );
    return m;
  });
  const circ = pilotLight(kit, {
    colour: 'green',
    legend: 'CIRCULATION PROVEN',
    drive: proven,
  });
  circ.object.position.set(-0.12, -0.2, z);
  circ.object.scale.setScalar(0.7);
  group.add(circ.object);
  parts.add(circ);
  const key = keySwitch(kit, {
    legend: 'DOSING INHIBIT',
    bound: {
      get value() {
        return inhibit.value;
      },
      set: (v: boolean) => (inhibit.value = v),
    },
  });
  key.object.position.set(0.12, -0.2, z);
  key.object.scale.setScalar(0.8);
  group.add(key.object);
  parts.add(key);
  panelMakerMark(kit, group, {
    width: W,
    height: H,
    z,
    corner: 'bottom-right',
  });
  return {
    object: group,
    parts,
    update(delta: number) {
      parts.update(delta);
      for (const i of [0, 1]) {
        const dosing = proven.value && !inhibit.value;
        if (filling[i].value) {
          level[i].value = Math.min(1, level[i].value + delta * 0.03);
          if (level[i].value >= 0.9) filling[i].value = false;
        } else if (dosing) {
          level[i].value = Math.max(
            0,
            level[i].value - delta * (i ? 0.006 : 0.01),
          );
          if (level[i].value <= 0.2) filling[i].value = true;
        }
        meters[i].set(level[i].value);
        meters[i].update(delta);
      }
    },
    status: () =>
      `hypo ${Math.round(level[0].value * 100)}%, acid ${Math.round(level[1].value * 100)}%${inhibit.value ? '; dosing inhibited' : ''}`,
  };
}

// ---- The transfer selector ----------------------------------------------

/** The selector's six outlets: four plant rooms now, two blanked for the pools to come. */
export const SELECTOR_OUTLETS: readonly (string | null)[] = [
  'LOUNGE PL1',
  'OLYMPIC PL2',
  'JACUZZI PL3',
  'FOOTBATH PL4',
  null,
  null,
];

/**
 * The transfer selector (the owner, 2026-10-26: one transfer set per
 * chemical, sent to each plant room's day tank in turn; six ways, two
 * blanked for the pools to come): a PVC-U header on a galvanised frame
 * over its drip tray, fed at its left end from the transfer pumps; six
 * outlets up off it, each a manual isolating valve and an actuated ball
 * valve (grey actuator, yellow position dome, its pointer across the pipe
 * while shut) and its plant room's plate; a spare one a blind flange,
 * bolted, tagged SPARE. Its station: HAND · AUTO, and a lit button for
 * each outlet, lit while that outlet is served; in HAND, pressing one
 * sends the chemical there. Outlet `i` serves the trial's tank `i`.
 */
export function createTransferSelector(
  kit: PanelKit,
  chemical: Chemical,
  store: TransferStore,
  outlets: readonly (string | null)[] = SELECTOR_OUTLETS,
) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const parts = createPartSet();
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const pvc = t.paint('#5a5f63', 0.55);
  const dark = t.paint('#2a2f31', 0.6);
  const red = t.paint('#b8261f', 0.5);
  const band = t.paint(BAND[chemical], 0.5);
  const pitch = 0.32;
  const n = outlets.length;
  const x0 = -((n - 1) * pitch) / 2;
  const hy = 0.75;
  // The frame and tray.
  const w = n * pitch + 0.3;
  t.box(group, t.paint('#202223', 0.8), w, 0.05, 0.6, 0, 0.025, 0);
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) {
    t.box(group, galv, 0.04, 1.5, 0.04, x, 0.75, -0.15);
    t.box(group, galv, 0.04, 0.04, 0.5, x, 0.05, -0.05);
  }
  t.box(group, galv, w - 0.1, 0.04, 0.04, 0, hy - 0.06, -0.15);
  t.box(group, galv, w - 0.1, 0.04, 0.04, 0, 1.45, -0.15);
  // The header, its feed at the left end, its banding and blanked far end.
  t.rod(group, pvc, [-w / 2 - 0.2, hy, 0], [w / 2 - 0.15, hy, 0], 0.032, 14);
  t.cyl(group, galv, 0.06, 0.02, w / 2 - 0.15, hy, 0, 'x', 20);
  for (const x of [-w / 2 + 0.05, 0])
    t.cyl(group, band, 0.035, 0.06, x, hy, 0, 'x', 14);
  f.label(
    group,
    `${PRODUCT[chemical]} · TRANSFER SELECTOR`,
    0,
    hy - 0.15,
    0.04,
    0.026,
    '#ffffff',
    BAND[chemical],
  );
  const pointers: Mesh[] = [];
  outlets.forEach((name, i) => {
    const x = x0 + i * pitch;
    t.rod(group, pvc, [x, hy, 0], [x, hy + 0.12, 0], 0.022, 12);
    if (!name) {
      // A spare: its tee blanked with a bolted blind flange, tagged.
      t.cyl(group, galv, 0.055, 0.025, x, hy + 0.13, 0, 'y', 20);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        t.cyl(
          group,
          dark,
          0.007,
          0.04,
          x + Math.cos(a) * 0.04,
          hy + 0.13,
          Math.sin(a) * 0.04,
          'y',
          6,
        );
      }
      f.label(
        group,
        `OUTLET ${i + 1} · SPARE`,
        x,
        hy + 0.25,
        0.01,
        0.02,
        '#1b1b1b',
        '#e5c43a',
      );
      return;
    }
    // The manual isolating valve, its red lever along the pipe while open.
    t.box(group, pvc, 0.07, 0.07, 0.07, x, hy + 0.17, 0);
    t.box(group, red, 0.015, 0.14, 0.012, x, hy + 0.17, 0.05);
    // The actuated valve: its body, its actuator, its dome and pointer.
    t.rod(group, pvc, [x, hy + 0.2, 0], [x, hy + 0.5, 0], 0.022, 12);
    t.box(group, pvc, 0.075, 0.075, 0.075, x, hy + 0.36, 0);
    t.box(group, t.paint('#7b8285', 0.5), 0.1, 0.09, 0.09, x, hy + 0.36, 0.08);
    t.cyl(
      group,
      t.paint('#e5c43a', 0.4),
      0.025,
      0.025,
      x,
      hy + 0.36,
      0.137,
      'z',
      12,
    );
    const p = t.box(group, dark, 0.008, 0.045, 0.006, x, hy + 0.36, 0.152);
    p.userData.live = true;
    pointers.push(p);
    // Up to its outlet, banded, its plate.
    t.rod(group, pvc, [x, hy + 0.5, 0], [x, 1.75, 0], 0.022, 12);
    t.cyl(group, band, 0.025, 0.05, x, 1.3, 0, 'y', 12);
    f.label(
      group,
      `${i + 1} · ${name}`,
      x,
      hy + 0.58,
      0.03,
      0.019,
      '#ffffff',
      '#2a2f31',
    );
  });
  // The station on the right upright.
  const box = new Group();
  box.position.set(w / 2 + 0.25, 1.25, 0);
  group.add(box);
  t.box(group, galv, 0.04, 1.25, 0.04, w / 2 + 0.25, 0.625, -0.08);
  t.box(box, t.paint('#d9d4c4', 0.55), 0.3, 0.5, 0.1, 0, 0, 0);
  f.label(box, 'DESTINATION', 0, 0.22, 0.051, 0.018, '#1b1b1b');
  const mode = selector(kit, {
    positions: 2,
    legend: 'HAND · AUTO',
    bound: {
      get value() {
        return store.state.value.mode === 'auto' ? 1 : 0;
      },
      set: (v: number) => store.act({ act: 'mode', to: v ? 'auto' : 'hand' }),
    },
  });
  mode.object.position.set(0, 0.12, 0.051);
  mode.object.scale.setScalar(0.75);
  box.add(mode.object);
  parts.add(mode);
  outlets.forEach((name, i) => {
    const b = pushButton(kit, {
      colour: name ? 'white' : 'black',
      head: 'illuminated',
      legend: name ? (name.split(' ').pop() ?? `${i + 1}`) : 'SPARE',
      lamp: computed(() => !!name && store.state.value.serving === i),
      action: () => {
        if (name) store.act({ act: 'pick', tank: i });
      },
    });
    b.object.position.set(
      -0.08 + (i % 3) * 0.08,
      -0.03 - Math.floor(i / 3) * 0.12,
      0.051,
    );
    b.object.scale.setScalar(0.6);
    box.add(b.object);
    parts.add(b);
  });
  panelMakerMark(kit, box, {
    width: 0.3,
    height: 0.5,
    z: 0.05,
    corner: 'bottom-right',
  });
  // Chlorella's plate on its back rail.
  const plate = chlorellaPlate(
    kit,
    0.42,
    `TRANSFER SELECTOR · ${n}-WAY · PVC-U`,
  );
  plate.position.set(0, 1.38, -0.125);
  group.add(plate);
  return {
    object: group,
    parts,
    /** Outlet `i`'s top, in the selector's frame, to pipe on from. */
    outletTop: (i: number) => [x0 + i * pitch, 1.75, 0] as const,
    /** Where its header takes its feed. */
    inlet: [-w / 2 - 0.2, hy, 0] as const,
    update(delta: number) {
      parts.update(delta);
      let k = 0;
      outlets.forEach((name, i) => {
        if (!name) return;
        pointers[k++].rotation.z = valveOpen(store.state.value, i)
          ? 0
          : Math.PI / 2;
      });
    },
    status: () => {
      const s = store.state.value;
      const at =
        s.serving === null
          ? 'none'
          : `${s.serving + 1} (${outlets[s.serving]})`;
      return `${s.mode === 'auto' ? 'AUTO' : 'HAND'}; serving outlet ${at}`;
    },
  };
}

// ---- The transfer trial -------------------------------------------------

/**
 * The transfer trial (the owner, 2026-10-26: pipe an idealised source into
 * the tanks and see them fill): an endless source standing in for the bulk
 * tanks, the transfer pump skid, the six-way transfer selector, and the
 * four plant rooms' day tanks off its live outlets, all on one tested
 * state (`chemical-transfer-demo.ts`). The first tank starts low, so the
 * selector opens its outlet and the duty pump fills it; as the others
 * dose down and call, each is served in turn. Run ten times fast.
 */
export function createTransferTrial(kit: PanelKit, chemical: Chemical) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const first = newTransferTrial();
  const store = createTransferStore({
    ...first,
    tanks: first.tanks.map((tk, i) => (i ? tk : { ...tk, litres: 50 })),
  });
  const pvc = t.paint('#5a5f63', 0.55);
  // The source: a plain blue block, plainly not real plant.
  const sx = -5.2;
  t.box(group, t.paint('#3567a8', 0.5), 0.8, 1.2, 0.8, sx, 0.6, 0.2);
  f.label(group, 'IDEAL SOURCE', sx, 1.0, 0.61, 0.05, '#ffffff', '#3567a8');
  f.label(
    group,
    `${PRODUCT[chemical]} · UNLIMITED`,
    sx,
    0.88,
    0.61,
    0.025,
    '#ffffff',
    '#3567a8',
  );
  f.label(group, 'TRIAL ×10', sx, 1.32, 0.2, 0.06, '#1b1b1b', '#e5c43a');
  const kx = -3.3;
  t.rod(group, pvc, [sx + 0.4, 0.31, 0.32], [kx - 0.7, 0.31, 0.32], 0.028, 12);
  const skid = createTransferPumpSkid(kit, chemical, store);
  skid.object.position.x = kx;
  group.add(skid.object);
  const sel = createTransferSelector(kit, chemical, store);
  const mx = -0.6;
  const mz = -0.3;
  sel.object.position.set(mx, 0, mz);
  group.add(sel.object);
  // The skid's main into the selector's header.
  const [ix, iy, iz] = sel.inlet;
  const main: [number, number, number][] = [
    [kx + 0.7, 0.88, -0.35],
    [kx + 1.2, 0.88, -0.35],
    [kx + 1.2, iy, mz + iz],
    [mx + ix, iy, mz + iz],
  ];
  for (let i = 0; i < main.length - 1; i++)
    t.rod(group, pvc, main[i], main[i + 1], 0.022, 12);
  // The four day tanks, each piped from its outlet over the top.
  const tanks = [0, 1, 2, 3].map((i) => {
    const tx = 2.2 + i * 2.4;
    const tank = createDayTankStation(kit, chemical, store, i);
    tank.object.position.set(tx, 0, 0);
    group.add(tank.object);
    const [ox, oy, oz] = sel.outletTop(i);
    const h = 2.0 + i * 0.09;
    const run: [number, number, number][] = [
      [mx + ox, oy, mz + oz],
      [mx + ox, h, mz + oz],
      [mx + ox, h, -0.9],
      [tx - 0.05, h, -0.9],
      [tx - 0.05, 1.65, -0.9],
      [tx - 0.05, 1.65, -0.6],
    ];
    for (let k = 0; k < run.length - 1; k++)
      t.rod(group, pvc, run[k], run[k + 1], 0.02, 10);
    f.label(
      group,
      `${i + 1} · ${SELECTOR_OUTLETS[i]}`,
      tx,
      2.25,
      0,
      0.05,
      '#ffffff',
      '#2a2f31',
    );
    return tank;
  });
  const parts = createPartSet();
  for (const p of [skid.parts, sel.parts, ...tanks.map((k) => k.parts)])
    for (const [o, use] of p.uses) parts.uses.set(o, use);
  // Its footprint runs from the source's left (−5.6) to the last bund's
  // right (10.4): centred on its middle, as an exhibit is.
  const root = new Group();
  group.position.x = -2.4;
  root.add(group);
  return {
    object: root,
    parts,
    update(delta: number) {
      store.step(delta * 10);
      skid.update(delta);
      sel.update(delta);
      for (const k of tanks) k.update(delta);
    },
    status: () => `${skid.status()}; selector ${sel.status()}`,
  };
}

// ---- The chemical distribution panel --------------------------------------

/** What the distribution panel shows of one chemical's line. */
export interface DistributionReading {
  /** The store's contents, a share of full. */
  store: number;
  /** Each day tank's level, a share of full, in outlet order. */
  days: readonly number[];
  serving: number | null;
  mode: 'auto' | 'hand';
  running: boolean;
  tripped: boolean;
  /** Its transfer pump in AUTO at its store. */
  inAuto: boolean;
}

/**
 * The wet hall's chemical distribution panel (plan 085), Penfold
 * Controls': a wall cabinet with a section per chemical, each its store's
 * contents and its four day tanks' levels on moving-coil meters, a lamp
 * for each outlet lit while it is served, the selector's AUTO and HAND,
 * its pump's RUN, IN AUTO and TRIP; and an annunciator across the top (a
 * day tank low, a line tripped, a store low), ACCEPT, RESET and LAMP TEST.
 * It shows; the pumps' selectors and their trip resets stay at the stores.
 */
export function createDistributionPanel(
  kit: PanelKit,
  read: () => Record<Chemical, DistributionReading> | null,
) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const parts = createPartSet();
  const W = 1.6;
  const H = 1.1;
  t.box(group, t.paint('#d9d4c4', 0.55), W, H, 0.22, 0, 0, 0.11);
  const z = 0.222;
  f.label(
    group,
    'CHEMICAL DISTRIBUTION',
    0,
    H / 2 - 0.05,
    z,
    0.03,
    '#1b1b1b',
    '#f4f3ee',
  );
  const labels = [
    'HYPO DAY\nLOW LOW',
    'HYPO\nTRIPPED',
    'HYPO\nSTORE LOW',
    'HYPO\nNOT AUTO',
    'ACID DAY\nLOW LOW',
    'ACID\nTRIPPED',
    'ACID\nSTORE LOW',
    'ACID\nNOT AUTO',
  ];
  const panel = createAnnunciatorPanel(kit, labels, { columns: 8, cell: 0.14 });
  panel.group.position.set(0, H / 2 - 0.17, z);
  panel.group.traverse((o) => (o.userData.live = true));
  group.add(panel.group);
  const logic = createAnnunciator(labels.length, { manualReset: true });
  let lampTest = 0;
  (
    [
      ['ACCEPT', 'black', () => logic.acknowledge()],
      ['RESET', 'black', () => logic.reset()],
      ['LAMP TEST', 'white', () => (lampTest = 2)],
    ] as const
  ).forEach(([legend, colour, action], i) => {
    const p = pushButton(kit, { colour, legend, action });
    p.object.position.set(W / 2 - 0.32 + i * 0.1, -H / 2 + 0.1, z);
    p.object.scale.setScalar(0.7);
    p.object.traverse((o) => (o.userData.live = true));
    group.add(p.object);
    parts.add(p);
  });
  type Section = {
    meters: ReturnType<typeof createPanelMeter>[];
    outlets: Signal<boolean>[];
    auto: Signal<boolean>;
    hand: Signal<boolean>;
    run: Signal<boolean>;
    inAuto: Signal<boolean>;
    trip: Signal<boolean>;
  };
  const sections = {} as Record<Chemical, Section>;
  (['hypochlorite', 'acid'] as const).forEach((c, s) => {
    const x0 = s ? 0.05 : -W / 2 + 0.05;
    const sec: Section = {
      meters: [],
      outlets: [0, 1, 2, 3].map(() => signal(false)),
      auto: signal(false),
      hand: signal(false),
      run: signal(false),
      inAuto: signal(false),
      trip: signal(false),
    };
    f.label(
      group,
      c === 'acid' ? 'ACID 10%' : 'HYPOCHLORITE 14%',
      x0 + 0.35,
      0.14,
      z,
      0.022,
      '#ffffff',
      BAND[c],
    );
    ['STORE', 'PL1', 'PL2', 'PL3', 'PL4'].forEach((name, i) => {
      const m = createPanelMeter(kit, '%', {
        width: 0.11,
        scaleMax: 100,
        redFrom: 0.95,
      });
      const x = x0 + 0.07 + i * 0.14;
      m.group.position.set(x, 0.04, z);
      m.group.traverse((o) => (o.userData.live = true));
      group.add(m.group);
      sec.meters.push(m);
      f.label(group, name, x, -0.04, z, 0.016, '#1b1b1b', '#f4f3ee');
      if (i > 0) {
        const lamp = pilotLight(kit, {
          colour: 'amber',
          legend: 'FILLING',
          drive: sec.outlets[i - 1],
        });
        lamp.object.position.set(x, -0.12, z);
        lamp.object.scale.setScalar(0.55);
        group.add(lamp.object);
        parts.add(lamp);
        f.label(group, 'FILLING', x, -0.17, z, 0.013, '#1b1b1b', '#f4f3ee');
      }
    });
    (
      [
        ['SELECTOR\nAUTO', 'white', sec.auto],
        ['SELECTOR\nHAND', 'amber', sec.hand],
        ['PUMP\nRUN', 'green', sec.run],
        ['PUMP\nIN AUTO', 'white', sec.inAuto],
        ['HIGH-HIGH\nTRIP', 'red', sec.trip],
      ] as const
    ).forEach(([legend, colour, drive], i) => {
      const lamp = pilotLight(kit, { colour, legend, drive });
      lamp.object.position.set(x0 + 0.07 + i * 0.14, -0.3, z);
      lamp.object.scale.setScalar(0.6);
      group.add(lamp.object);
      parts.add(lamp);
      f.label(
        group,
        legend.replace('\n', ' '),
        x0 + 0.07 + i * 0.14,
        -0.36,
        z,
        0.015,
        '#1b1b1b',
        '#f4f3ee',
      );
    });
    sections[c] = sec;
  });
  panelMakerMark(kit, group, {
    width: W,
    height: H,
    z,
    corner: 'bottom-right',
  });
  let time = 0;
  return {
    object: group,
    parts,
    update(delta: number) {
      time += delta;
      parts.update(delta);
      const r = read();
      if (r) {
        const alarms: boolean[] = [];
        for (const c of ['hypochlorite', 'acid'] as const) {
          const line = r[c];
          const sec = sections[c];
          sec.meters[0].set(line.store);
          line.days.forEach((v, i) => sec.meters[i + 1]?.set(v));
          sec.outlets.forEach((o, i) => (o.value = line.serving === i));
          sec.auto.value = line.mode === 'auto';
          sec.hand.value = line.mode === 'hand';
          sec.run.value = line.running;
          sec.inAuto.value = line.inAuto;
          sec.trip.value = line.tripped;
          alarms.push(
            // Below its call point and still falling: its fill is failing.
            line.days.some((v) => v <= 0.1),
            line.tripped,
            line.store <= 0.1,
            !line.inAuto,
          );
        }
        logic.sense(alarms);
      }
      for (const c of ['hypochlorite', 'acid'] as const)
        for (const m of sections[c].meters) m.update(delta);
      lampTest = Math.max(0, lampTest - delta);
      panel.set(lampTest > 0 ? labels.map(() => true) : logic.lit(time));
    },
    status: () => {
      const r = read();
      if (!r) return 'Chemical distribution panel';
      const say = (c: Chemical) => {
        const l = r[c];
        const at = l.serving === null ? 'idle' : `filling PL${l.serving + 1}`;
        return `${c === 'acid' ? 'acid' : 'hypochlorite'} ${l.tripped ? 'TRIPPED' : at}`;
      };
      return `${say('hypochlorite')}; ${say('acid')}`;
    },
  };
}

const POOL_NAME: Record<string, string> = {
  pool_01: 'Lounge',
  pool_02: 'Olympic',
  pool_03: 'Jacuzzi',
  pool_04: 'Footbath',
};

/**
 * Every day tank the building uses (`DAY_TANKS`), smallest to largest, in
 * a row: each its own station without its pump or safety gear, labelled
 * with its size and the pools it serves.
 */
export function createDayTankRange(kit: PanelKit) {
  const sizes = new Map<number, { chemical: Chemical; uses: string[] }>();
  for (const chemical of ['hypochlorite', 'acid'] as const)
    for (const { site, litres } of DAY_TANKS[chemical]) {
      const entry = sizes.get(litres) ?? { chemical, uses: [] };
      entry.uses.push(
        `${POOL_NAME[site] ?? site} ${chemical === 'acid' ? 'acid' : 'hypo'}`,
      );
      sizes.set(litres, entry);
    }
  const list = [...sizes.entries()].sort(([a], [b]) => a - b);
  const gap = 0.35;
  // Below 1,000 l a dose bottle; the largest keeps its framed tank.
  const isBottle = (litres: number) => litres < 1000;
  const widths = list.map(([litres]) =>
    isBottle(litres)
      ? Math.max(0.6, bottleSize(litres).d + 0.45)
      : dayTankSize(litres).L + 0.4,
  );
  const total = widths.reduce((s, w) => s + w, 0) + gap * (widths.length - 1);
  const root = new Group();
  const parts = createPartSet();
  let x = -total / 2;
  const stations = list.map(([litres, { chemical, uses }], i) => {
    const cx = x + widths[i] / 2;
    x += widths[i] + gap;
    if (!isBottle(litres)) {
      const s = createDayTankStation(kit, chemical, undefined, 0, {
        litres,
        tag: `${litres} L`,
        withPump: false,
        withGear: false,
        centred: true,
      });
      s.object.position.x = cx;
      root.add(s.object);
      for (const [o, use] of s.parts.uses) parts.uses.set(o, use);
      return s;
    }
    // An ideal line keeps the bottle topped up whenever it calls; its pump
    // doses fast enough that a fill comes round every few minutes.
    const bottle = createDoseBottle(kit, {
      tag: `${litres} L`,
      product: PRODUCT[chemical],
      litres,
      acid: chemical === 'acid',
    });
    bottle.object.position.x = cx;
    root.add(bottle.object);
    for (const [o, use] of bottle.parts.uses) parts.uses.set(o, use);
    let state = newDoseBottle(litres, 0.25 + 0.1 * i);
    const trend = levelTrend();
    return {
      update(delta: number) {
        state = stepDoseBottle(
          state,
          {
            fillLpm: state.calling ? litres * 0.6 : 0,
            doseLpm: litres * 0.25,
          },
          delta,
        );
        bottle.show(state, true, delta);
        trend.sample(state.litres, delta);
      },
      status: () =>
        describeTank(
          `Dose bottle, ${litres} L (${uses.join(', ')})`,
          bottleLevel(state),
          trend.lpm(),
        ),
    };
  });
  return {
    object: root,
    parts,
    update(delta: number) {
      for (const s of stations) s.update(delta);
    },
  };
}

/**
 * The wet hall's distribution panel on a dev room's wall, run by two
 * trials of its own (an ideal store each, its pump, selector and four day
 * tanks) ten times fast, so its meters, lamps and annunciator work.
 */
export function createDistributionPanelDemo(kit: PanelKit) {
  const stores = {
    hypochlorite: createTransferStore(),
    acid: createTransferStore(),
  };
  const read = () => {
    const line = (c: Chemical): DistributionReading => {
      const s = stores[c].state.value;
      return {
        store: 1 - ((s.delivered / 4000) % 0.9),
        days: s.tanks.map((k) => k.litres / k.capacity),
        serving: s.serving,
        mode: s.mode,
        running: pumpRunning(s),
        tripped: s.tripped,
        inAuto: s.hoa === 'auto',
      };
    };
    return { hypochlorite: line('hypochlorite'), acid: line('acid') };
  };
  const panel = createDistributionPanel(kit, read);
  // Stood on two galvanised posts and a foot, its middle at eye height.
  const t = plantTools(kit);
  const galv = t.paint('#a9afaf', 0.38, 0.75);
  const object = new Group();
  panel.object.position.set(0, 1.5, -0.1);
  object.add(panel.object);
  for (const x of [-0.6, 0.6]) {
    t.box(object, galv, 0.05, 1.0, 0.05, x, 0.5, -0.05);
    t.box(object, galv, 0.08, 0.02, 0.5, x, 0.01, 0.05);
  }
  return {
    ...panel,
    object,
    update(delta: number) {
      stores.hypochlorite.step(delta * 10);
      stores.acid.step(delta * 10);
      panel.update(delta);
    },
  };
}

/**
 * A store's framed bulk tank on its own, for trying it: its level drawn
 * down by an unseen transfer and topped up by an unseen delivery, slowly,
 * so its display and float read.
 */
export function createBulkTankDemo(kit: PanelKit, chemical: Chemical) {
  const litres = 4000;
  const tag = chemical === 'acid' ? 'AS-T1' : 'HS-T1';
  const tank = createFramedChemicalTank(kit, {
    tag,
    product: PRODUCT[chemical],
    litres,
    acid: chemical === 'acid',
  });
  const trend = levelTrend();
  let time = chemical === 'acid' ? 200 : 0;
  const level = () => 0.55 + 0.35 * Math.sin(time / 90);
  return {
    object: tank.object,
    update(delta: number) {
      time += delta;
      tank.setLevel(level());
      trend.sample(level() * litres, delta);
    },
    status: () =>
      describeTank(
        `${chemical === 'acid' ? 'Hydrochloric acid' : 'Sodium hypochlorite'} bulk tank ${tag}`,
        level(),
        trend.lpm(),
      ),
  };
}
