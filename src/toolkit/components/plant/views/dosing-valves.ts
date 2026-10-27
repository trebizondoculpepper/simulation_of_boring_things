import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { beginPart, createPartSet } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { partAudio } from '../../core/audio/part-audio';
import { RELAY_CLICK, VALVE_STOP } from '../audio/actuated-valve';
import {
  motorLimits,
  newMotorisedValve,
  stepMotorisedValve,
} from '../logic/motorised-valve';
import { plantTools } from './plant-tools';
import { createChemicalBallValve } from './chemical-ball-valve';
import { describe } from './describe';

/**
 * The small valves of the chemical lines and dosing (the owner,
 * 2026-10-27: model them all), each real and working, each on a stub of
 * its own pipe along x, its middle at the origin:
 *
 * - `createMotorisedChemicalValve`: a DN15 PVC-U ball valve under a
 *   compact electric actuator (after GF's type 107): a position dial on
 *   top, OPEN and SHUT lamps, a hand-override knob; it travels a quarter
 *   turn when commanded and stops at its limit switches;
 * - `createSolenoidValve`: a DN10 PVDF direct-acting solenoid valve, its
 *   coil in a black housing with a lit DIN plug, energised to open;
 * - `createMultifunctionValve`: on a dosing pump's discharge (after
 *   ProMinent's): pressure relief back to the tank, anti-siphon, and a
 *   priming knob that bleeds the head;
 * - `createInjectionValve`: where the chemical enters the water, a spring
 *   check that opens only at dosing pressure; it can scale up and block;
 * - `createBackPressureValve`: holds the discharge at its set pressure so
 *   the pump doses true downhill, its knob setting it;
 * - `createFootValve`: the suction lance's end, a strainer and a check
 *   ball, down in its bottle;
 * - `createThreeWayValve`: a DN15 L-port ball valve sending a pump's
 *   suction from its tank or its calibration column.
 */

const PVC = '#6b6e70';
const PVDF = '#e8e6dc';
const RED = '#c8102e';

function stub(
  t: ReturnType<typeof plantTools>,
  parent: Group,
  r: number,
  len: number,
  colour = '#5a5f63',
) {
  t.cyl(parent, t.paint(colour, 0.55), r, len, 0, 0, 0, 'x', 16);
}

function lampMaterial(kit: PanelKit, colour: string) {
  const m = new MeshStandardMaterial({
    color: '#2b2f2e',
    emissive: colour,
    emissiveIntensity: 0,
    roughness: 0.4,
  });
  kit.materials.push(m);
  return m;
}

export interface MotorisedChemicalValve extends Part {
  readonly open: boolean;
  command(open: boolean): void;
}

export function createMotorisedChemicalValve(
  kit: PanelKit,
  {
    initial = false,
    dn = 15,
    name = `Motorised chemical valve, DN${dn}`,
  }: { initial?: boolean; dn?: 15 | 40; name?: string } = {},
): MotorisedChemicalValve {
  const t = plantTools(kit);
  const f = tools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  stub(t, g, dn === 40 ? 0.025 : 0.0105, dn === 40 ? 0.26 : 0.18);
  const body = createChemicalBallValve(kit, { dn });
  // A bigger body stands the actuator a little higher.
  const lift = dn === 40 ? 0.03 : 0;
  // Its manual handle hidden: the actuator turns this one; it is
  // described as the motorised valve, not as a manual one.
  delete body.object.userData.component;
  body.object.children.forEach((c) => c.userData.live && (c.visible = false));
  g.add(body.object);
  // The actuator: a grey cube on its bracket, a dial on top, lamps and the
  // override knob on its front.
  const act = new Group();
  act.position.y = lift;
  g.add(act);
  const housing = t.paint('#3e4447', 0.4);
  t.box(act, t.paint('#a9afaf', 0.38, 0.75), 0.03, 0.02, 0.03, 0, 0.04, 0);
  t.box(act, housing, 0.075, 0.07, 0.07, 0, 0.085, 0);
  const dial = new Group();
  dial.position.set(0, 0.121, 0);
  dial.userData.live = true;
  act.add(dial);
  t.cyl(dial, t.paint('#f2c500', 0.4), 0.018, 0.004, 0, 0, 0, 'y', 20);
  t.box(dial, t.paint('#111111', 0.5), 0.03, 0.005, 0.005, 0, 0.003, 0);
  const openLamp = lampMaterial(kit, '#3ee05a');
  const shutLamp = lampMaterial(kit, '#ff3a26');
  t.cyl(
    act,
    openLamp,
    0.003,
    0.003,
    -0.018,
    0.1,
    0.036,
    'z',
    10,
  ).userData.live = true;
  t.cyl(
    act,
    shutLamp,
    0.003,
    0.003,
    -0.006,
    0.1,
    0.036,
    'z',
    10,
  ).userData.live = true;
  f.label(act, 'OPEN SHUT', -0.012, 0.09, 0.0355, 0.0035, '#d8dde0');
  const knob = t.cyl(
    g,
    t.paint('#c8102e', 0.4),
    0.007,
    0.008,
    0.02,
    0.075,
    0.039,
    'z',
    12,
  );
  knob.userData.live = true;
  f.label(act, 'MAN', 0.02, 0.062, 0.0355, 0.0035, '#d8dde0');
  let state = newMotorisedValve(initial);
  let moving = false;
  a.uses.set(knob, () => (state = { ...state, command: !state.command }));
  a.updates.push((delta) => {
    const before = state.position;
    state = stepMotorisedValve(state, delta);
    const nowMoving = state.position !== before;
    if (moving && !nowMoving) partAudio.play(VALVE_STOP, g);
    moving = nowMoving;
    dial.rotation.y = -(1 - state.position) * (Math.PI / 2);
    const lim = motorLimits(state);
    openLamp.emissiveIntensity = lim.open ? 1.5 : 0;
    shutLamp.emissiveIntensity = lim.shut ? 1.5 : 0;
  });
  describe(g, name, () => {
    const lim = motorLimits(state);
    return lim.open
      ? 'Open'
      : lim.shut
        ? 'Shut'
        : state.command
          ? 'Opening'
          : 'Shutting';
  });
  const part = a.part();
  return Object.assign(part, {
    get open() {
      return motorLimits(state).open;
    },
    command(open: boolean) {
      state = { ...state, command: open };
    },
  });
}

export interface SolenoidValve extends Part {
  readonly open: boolean;
  set(energised: boolean): void;
}

export function createSolenoidValve(
  kit: PanelKit,
  { name = 'Solenoid valve, DN10' } = {},
): SolenoidValve {
  const t = plantTools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  stub(t, g, 0.008, 0.14);
  t.box(g, t.paint(PVDF, 0.4), 0.05, 0.03, 0.03, 0, 0, 0);
  t.cyl(g, t.paint('#b8bcc0', 0.3, 0.7), 0.008, 0.02, 0, 0.022, 0, 'y', 12);
  const coil = t.box(
    g,
    t.paint('#1e1e1e', 0.5),
    0.034,
    0.04,
    0.034,
    0,
    0.052,
    0,
  );
  coil.userData.live = true;
  // The DIN plug on the coil's side, its LED lit while energised.
  t.box(g, t.paint('#2a2f31', 0.6), 0.012, 0.03, 0.028, 0.023, 0.052, 0);
  const led = lampMaterial(kit, '#ffb21c');
  t.cyl(g, led, 0.003, 0.003, 0.03, 0.06, 0, 'x', 10).userData.live = true;
  let energised = false;
  a.uses.set(coil, () => {
    energised = !energised;
    partAudio.play(RELAY_CLICK, g);
  });
  a.updates.push(() => (led.emissiveIntensity = energised ? 1.6 : 0));
  describe(g, name, () =>
    energised ? 'Energised, open' : 'De-energised, shut',
  );
  const part = a.part();
  return Object.assign(part, {
    get open() {
      return energised;
    },
    set(on: boolean) {
      if (on !== energised) partAudio.play(RELAY_CLICK, g);
      energised = on;
    },
  });
}

export interface MultifunctionValve extends Part {
  readonly priming: boolean;
}

export function createMultifunctionValve(
  kit: PanelKit,
  { name = 'Multifunction valve' } = {},
): MultifunctionValve {
  const t = plantTools(kit);
  const f = tools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  stub(t, g, 0.006, 0.14, '#ece9dc');
  const pvdf = t.paint(PVDF, 0.4);
  t.cyl(g, pvdf, 0.016, 0.05, 0, 0.01, 0, 'y', 20);
  // The relief bonnet on top, and its return tube back to the tank.
  t.cyl(g, t.paint('#2f63a3', 0.45), 0.014, 0.03, 0, 0.05, 0, 'y', 20);
  t.cyl(g, pvdf, 0.004, 0.04, 0.018, 0.02, 0, 'x', 8);
  // The priming knob on its front: turned, it opens the bleed.
  const knob = new Group();
  knob.position.set(0, 0.012, 0.02);
  knob.userData.live = true;
  g.add(knob);
  const grip = t.cyl(
    knob,
    t.paint(RED, 0.4),
    0.009,
    0.012,
    0,
    0,
    0.006,
    'z',
    8,
  );
  grip.userData.live = true;
  t.box(knob, t.paint('#f2f2ee', 0.4), 0.002, 0.014, 0.002, 0, 0, 0.013);
  f.label(g, 'PRIME', 0, -0.012, 0.0165, 0.004, '#1b1b1b');
  let priming = false;
  a.uses.set(grip, () => (priming = !priming));
  a.updates.push(() => (knob.rotation.z = priming ? -Math.PI / 2 : 0));
  describe(g, name, () =>
    priming
      ? 'Priming knob open: bleeding the pump head'
      : 'Dosing; relief and anti-siphon set',
  );
  const part = a.part();
  return Object.assign(part, {
    get priming() {
      return priming;
    },
  });
}

export interface InjectionValve extends Part {
  /** 0 clean to 1 blocked with scale. */
  scale: number;
  opening(pressureBar: number): boolean;
}

export function createInjectionValve(
  kit: PanelKit,
  { name = 'Injection valve' } = {},
): InjectionValve {
  const t = plantTools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  // The process pipe it screws into, and the valve body up out of it.
  stub(t, g, 0.025, 0.2, '#4b4f53');
  t.cyl(g, t.paint('#4b4f53', 0.5), 0.02, 0.02, 0, 0.03, 0, 'y', 16);
  const body = t.cyl(g, t.paint(PVDF, 0.4), 0.011, 0.06, 0, 0.065, 0, 'y', 6);
  body.userData.live = true;
  t.cyl(g, t.paint('#ece9dc', 0.5), 0.004, 0.05, 0, 0.12, 0, 'y', 8);
  // Scale: a crust that grows at its tip.
  const crust = t.cyl(
    g,
    t.paint('#d9d6c8', 0.9),
    0.014,
    0.012,
    0,
    0.042,
    0,
    'y',
    12,
  );
  crust.userData.live = true;
  const view = { scale: 0 };
  // A click cleans it, as descaling in acid does.
  a.uses.set(body, () => (view.scale = 0));
  a.updates.push(() => {
    crust.visible = view.scale > 0.05;
    crust.scale.set(
      0.6 + view.scale * 0.6,
      0.4 + view.scale,
      0.6 + view.scale * 0.6,
    );
  });
  describe(g, name, () =>
    view.scale >= 0.95
      ? 'Blocked with scale'
      : view.scale > 0.3
        ? 'Scaling up'
        : 'Clean',
  );
  const part = a.part();
  return Object.assign(part, {
    get scale() {
      return view.scale;
    },
    set scale(v: number) {
      view.scale = Math.max(0, Math.min(1, v));
    },
    /** It opens at about 0.5 bar, more as scale stiffens it; blocked, never. */
    opening(bar: number) {
      return view.scale < 0.95 && bar > 0.5 + view.scale * 6;
    },
  });
}

export interface BackPressureValve extends Part {
  readonly setBar: number;
}

const SETTINGS = [1.5, 3, 5] as const;

export function createBackPressureValve(
  kit: PanelKit,
  { name = 'Back-pressure valve' } = {},
): BackPressureValve {
  const t = plantTools(kit);
  const f = tools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  stub(t, g, 0.006, 0.14, '#ece9dc');
  t.cyl(g, t.paint(PVDF, 0.4), 0.017, 0.03, 0, 0.005, 0, 'y', 20);
  t.cyl(g, t.paint(PVDF, 0.4), 0.012, 0.03, 0, 0.035, 0, 'y', 20);
  const knob = new Group();
  knob.position.set(0, 0.058, 0);
  knob.userData.live = true;
  g.add(knob);
  const cap = t.cyl(
    knob,
    t.paint('#2a2f31', 0.5),
    0.014,
    0.014,
    0,
    0,
    0,
    'y',
    16,
  );
  cap.userData.live = true;
  t.box(knob, t.paint('#f2f2ee', 0.4), 0.002, 0.002, 0.012, 0, 0.008, 0.006);
  f.label(g, '1.5  3  5 bar', 0, 0.03, 0.0175, 0.0035, '#1b1b1b');
  let k = 1;
  a.uses.set(cap, () => (k = (k + 1) % SETTINGS.length));
  a.updates.push(() => (knob.rotation.y = -k * (Math.PI / 3)));
  describe(g, name, () => `Set at ${SETTINGS[k]} bar`);
  const part = a.part();
  return Object.assign(part, {
    get setBar() {
      return SETTINGS[k];
    },
  });
}

export function createFootValve(
  kit: PanelKit,
  { name = 'Foot valve and strainer' } = {},
): Part {
  const t = plantTools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  // Shown upright in a clear section of bottle, the liquid round it.
  const clear = new MeshStandardMaterial({
    color: '#dfecee',
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
    depthWrite: false,
  });
  kit.materials.push(clear);
  const jar = new Mesh(
    new CylinderGeometry(0.05, 0.05, 0.16, 24, 1, true),
    clear,
  );
  jar.position.y = 0.08;
  g.add(jar);
  const liquid = new MeshStandardMaterial({
    color: '#d8e47a',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  kit.materials.push(liquid);
  const fill = new Mesh(new CylinderGeometry(0.048, 0.048, 0.11, 24), liquid);
  fill.position.y = 0.055;
  g.add(fill);
  const pvdf = t.paint(PVDF, 0.4);
  t.cyl(g, pvdf, 0.004, 0.14, 0, 0.11, 0, 'y', 8);
  t.cyl(g, pvdf, 0.012, 0.025, 0, 0.03, 0, 'y', 16);
  // The strainer: a ribbed cage below the check ball's body.
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    t.box(
      g,
      pvdf,
      0.002,
      0.02,
      0.002,
      Math.cos(ang) * 0.011,
      0.008,
      Math.sin(ang) * 0.011,
    );
  }
  t.cyl(g, pvdf, 0.012, 0.003, 0, 0.0, 0, 'y', 16);
  // Its weight ring, so the lance hangs plumb.
  t.cyl(g, t.paint('#b8bcc0', 0.3, 0.7), 0.014, 0.008, 0, 0.05, 0, 'y', 16);
  describe(g, name, () => 'Suction lance end: strainer and check ball');
  return a.part();
}

export interface ThreeWayValve extends Part {
  /** Where the pump's suction comes from. */
  readonly from: 'tank' | 'column';
}

export function createThreeWayValve(
  kit: PanelKit,
  { name = 'Three-way valve, DN15' } = {},
): ThreeWayValve {
  const t = plantTools(kit);
  const f = tools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  stub(t, g, 0.0105, 0.18);
  t.rod(g, t.paint('#5a5f63', 0.55), [0, 0, 0], [0, -0.09, 0], 0.0105, 16);
  const grey = t.paint(PVC, 0.45);
  t.cyl(g, grey, 0.024, 0.05, 0, 0, 0, 'x', 24);
  t.cyl(g, grey, 0.02, 0.04, 0, -0.025, 0, 'y', 20);
  const lever = new Group();
  lever.position.y = 0.03;
  lever.userData.live = true;
  g.add(lever);
  const red = t.paint(RED, 0.4);
  const arm = t.box(lever, red, 0.06, 0.006, 0.012, 0.025, 0, 0);
  arm.userData.live = true;
  t.cyl(lever, red, 0.01, 0.008, 0, 0, 0, 'y', 14);
  f.label(g, 'TANK', -0.07, 0.02, 0, 0.005, '#1b1b1b', '#f4f3ee');
  f.label(g, 'COLUMN', 0.012, -0.08, 0.012, 0.005, '#1b1b1b', '#f4f3ee');
  let column = false;
  let angle = 0;
  a.uses.set(arm, () => (column = !column));
  a.updates.push((delta) => {
    const target = column ? -Math.PI / 2 : Math.PI;
    angle += (target - angle) * Math.min(1, delta * 8);
    lever.rotation.y = angle;
  });
  describe(g, name, () =>
    column ? 'Suction from the calibration column' : 'Suction from the tank',
  );
  const part = a.part();
  return Object.assign(part, {
    get from() {
      return column ? ('column' as const) : ('tank' as const);
    },
  });
}

/**
 * The dosing valves on a row of plinths' worth, one bench, each working:
 * the motorised valve cycling open and shut every 20 s (its override knob
 * takes over), the solenoid clicked open and shut, the multifunction
 * valve's priming knob, the injection valve slowly scaling (click it to
 * clean it), the back-pressure valve's setting, the foot valve, and the
 * three-way valve's lever.
 */
export function createDosingValvesDemo(kit: PanelKit) {
  const t = plantTools(kit);
  const f = tools(kit);
  const group = new Group();
  const parts = createPartSet();
  const bench = new Group();
  t.box(bench, t.paint('#8d9290', 0.7), 1.9, 0.9, 0.45, 0, 0.45, 0);
  t.box(bench, t.paint('#6f7472', 0.6), 1.94, 0.04, 0.49, 0, 0.92, 0);
  group.add(bench);
  const mv = createMotorisedChemicalValve(kit);
  const sv = createSolenoidValve(kit);
  const mf = createMultifunctionValve(kit);
  const iv = createInjectionValve(kit);
  const bp = createBackPressureValve(kit);
  const fv = createFootValve(kit);
  const tw = createThreeWayValve(kit);
  const items: [Part, string, number][] = [
    [mv, 'MOTORISED DN15', 0.05],
    [sv, 'SOLENOID DN10', 0.03],
    [mf, 'MULTIFUNCTION', 0.03],
    [iv, 'INJECTION', 0.03],
    [bp, 'BACK-PRESSURE', 0.03],
    [fv, 'FOOT VALVE', 0.0],
    [tw, 'THREE-WAY', 0.1],
  ];
  items.forEach(([p, title, lift], i) => {
    const x = -0.8 + i * 0.265;
    p.object.position.set(x, 0.94 + lift, 0);
    group.add(p.object);
    parts.add(p);
    f.label(group, title, x, 0.9, 0.247, 0.016, '#1b1b1b', '#f4f3ee');
  });
  let time = 0;
  return {
    object: group,
    parts,
    update(delta: number) {
      time += delta;
      if (Math.floor(time / 20) !== Math.floor((time - delta) / 20))
        mv.command(!mv.open);
      iv.scale = Math.min(1, iv.scale + delta / 300);
      parts.update(delta);
    },
    status: () =>
      `Dosing valves: motorised ${mv.open ? 'open' : 'shut'}; solenoid ${sv.open ? 'open' : 'shut'}; multifunction ${mf.priming ? 'priming' : 'dosing'}; injection ${Math.round(iv.scale * 100)}% scaled; back-pressure ${bp.setBar} bar; three-way from ${tw.from}`,
  };
}

export interface CheckValve extends Part {
  /** Whether flow holds it open now. */
  flowing: boolean;
}

/**
 * A PVC-U ball check valve (non-return), after GF type 561: a grey union
 * body, a flow arrow moulded on it, its ball lifted while flow passes and
 * seated when it stops. Along x, flow toward +x.
 */
export function createCheckValve(
  kit: PanelKit,
  {
    dn = 40,
    name = `Non-return valve, DN${dn}`,
  }: { dn?: 15 | 40; name?: string } = {},
): CheckValve {
  const t = plantTools(kit);
  const f = tools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  const r = dn === 40 ? 0.025 : 0.0105;
  const grey = t.paint(PVC, 0.45);
  const darker = t.paint('#55585a', 0.5);
  t.cyl(g, grey, r * 1.9, r * 3.2, 0, 0, 0, 'x', 24);
  for (const side of [-1, 1])
    t.cyl(g, darker, r * 1.75, r * 1.2, side * r * 2.4, 0, 0, 'x', 6);
  f.label(g, '→', 0, r * 1.95, 0, r * 1.2, '#1b1b1b').rotation.x = -Math.PI / 2;
  const view = { flowing: false };
  describe(g, name, () => (view.flowing ? 'Flow passing' : 'Seated, no flow'));
  const part = a.part();
  return Object.assign(part, {
    get flowing() {
      return view.flowing;
    },
    set flowing(v: boolean) {
      view.flowing = v;
    },
  });
}

export interface ReliefValve extends Part {
  readonly setBar: number;
  /** Whether it is lifting, passing back to the tank. */
  lifting: boolean;
}

/**
 * A pressure relief valve on a chemical main (after GF type V786): a grey
 * body, its spring bonnet in yellow, an adjusting screw on top, the
 * return out of its side; it lifts above its set pressure.
 */
export function createReliefValve(
  kit: PanelKit,
  {
    setBar = 4,
    name = `Pressure relief valve, ${setBar} bar`,
  }: { setBar?: number; name?: string } = {},
): ReliefValve {
  const t = plantTools(kit);
  const a = beginPart(kit, name);
  const g = a.object;
  t.cyl(g, t.paint(PVC, 0.45), 0.03, 0.06, 0, 0.03, 0, 'y', 20);
  t.cyl(g, t.paint('#c9b437', 0.5), 0.024, 0.07, 0, 0.095, 0, 'y', 20);
  t.cyl(g, t.paint('#2a2f31', 0.5), 0.008, 0.02, 0, 0.14, 0, 'y', 8);
  t.cyl(g, t.paint(PVC, 0.45), 0.014, 0.04, 0.035, 0.03, 0, 'x', 12);
  const view = { lifting: false };
  describe(g, name, () =>
    view.lifting ? 'Lifting, passing back to tank' : 'Seated',
  );
  const part = a.part();
  return Object.assign(part, {
    setBar,
    get lifting() {
      return view.lifting;
    },
    set lifting(v: boolean) {
      view.lifting = v;
    },
  });
}
