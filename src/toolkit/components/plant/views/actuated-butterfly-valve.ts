import { Group } from 'three';
import { signal } from '@preact/signals-core';
import { partAudio } from '../../core/audio/part-audio';
import {
  PNEUMATIC_STROKE,
  RELAY_CLICK,
  SOLENOID_CLICK,
  VALVE_STOP,
} from '../audio/actuated-valve';
import { machineTone } from '../../sound/audio/machine-tones';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import { createBrandBadge } from '../../core/views/brand-badge';
import { PIPE_SIZES, plantTools } from './plant-tools';
import type { DN } from './plant-tools';
import {
  energised,
  limits,
  newActuatedValve,
  stepActuatedValve,
  strokeTime,
  target,
} from '../logic/actuated-valve';

/**
 * A solenoid-operated butterfly valve by Grundflow (`logic/actuated-valve.ts`),
 * after a wafer butterfly valve on a spring-return rack-and-pinion
 * pneumatic actuator with a NAMUR solenoid pilot and a limit switch box:
 * the valve's body between its flanges as the room's lever valves have it
 * (`plantTools.butterflyValve`); on its stem a yoke, the actuator's
 * anodised body with its end caps (its springs inside), on top the switch
 * box with its yellow visual indicator turning a quarter as the disc does;
 * on the actuator's side the solenoid valve, its coil and DIN plug (its
 * lamp lit while energised), its red manual override, and its air line.
 *
 * Driven by `binding` (the world's state of the valve: open or shut, as
 * the panel commands); its override, pressed, toggles it, as a fitter
 * works one by hand. Its own frame: its pipe along `axis` through the
 * origin, its actuator up (or, on a vertical pipe, toward +z).
 */
export function createActuatedButterflyValve(
  kit: PanelKit,
  dn: DN,
  axis: 'x' | 'y' | 'z',
  name: string,
  binding?: {
    open(): boolean;
    set(open: boolean): void;
    position?(): number;
    power?(): boolean;
    air?(): boolean;
  },
  {
    drive = 'pneumatic',
  }: {
    /** How it is driven: by air, piloted by its solenoid, or by an electric motor. */
    drive?: 'pneumatic' | 'electric';
  } = {},
) {
  const a = beginPart(kit, name);
  const t = plantTools(kit);
  // The valve's body, without a lever: its stem and boss stand for the drive.
  t.butterflyValve(a.object, dn, [0, 0, 0], axis, 'chain');
  const s = PIPE_SIZES[dn];
  const neckTop = s.flange * 0.42 + Math.max(0.08, s.od * 0.6);
  // The actuator's assembly, built up +y, turned to face out of a vertical pipe.
  const head = new Group();
  // On an upright pipe swing the actuator sideways without tilting its
  // front-facing solenoid override toward the floor.
  if (axis === 'y') head.rotation.z = -Math.PI / 2;
  a.object.add(head);
  /** The pneumatic drive: the actuator's body, its switch box and its solenoid pilot. */
  const pneumatic = () => {
    const L = Math.min(0.6, Math.max(0.16, s.od * 1.5));
    const H = Math.min(0.2, Math.max(0.07, s.od * 0.45));
    const aluminium = t.paint('#c9ced2', 0.35, 0.7);
    const cap = t.paint('#2f3a46', 0.5, 0.2);
    const y0 = neckTop + 0.01;
    // The yoke, the body, its two end caps.
    t.box(
      head,
      t.paint('#5c6166', 0.5, 0.5),
      H * 0.8,
      0.03,
      H * 0.8,
      0,
      y0 + 0.015,
      0,
    );
    t.box(head, aluminium, L, H, H, 0, y0 + 0.03 + H / 2, 0);
    for (const k of [-1, 1])
      t.box(
        head,
        cap,
        0.025,
        H * 1.04,
        H * 1.04,
        (k * (L + 0.025)) / 2,
        y0 + 0.03 + H / 2,
        0,
      );
    const top = y0 + 0.03 + H;
    // The limit switch box, and its indicator, turning a quarter with the disc.
    const box = Math.max(0.09, H * 0.9);
    t.box(
      head,
      t.paint('#20262b', 0.55),
      box,
      box * 0.7,
      box,
      0,
      top + (box * 0.7) / 2,
      0,
    );
    const indicator = new Group();
    indicator.position.set(0, top + box * 0.7, 0);
    indicator.userData.live = true;
    head.add(indicator);
    t.cyl(
      indicator,
      t.paint('#f2c230', 0.4),
      box * 0.38,
      0.03,
      0,
      0.015,
      0,
      'y',
      20,
    );
    t.box(
      indicator,
      t.paint('#1b1b1b', 0.5),
      box * 0.7,
      0.008,
      box * 0.12,
      0,
      0.032,
      0,
    );
    // The solenoid pilot on the actuator's +z side (NAMUR), its coil, DIN plug, lamp and override.
    const side = H / 2 + 0.005;
    const sol = new Group();
    sol.position.set(L * 0.2, y0 + 0.03 + H / 2, side);
    head.add(sol);
    t.box(sol, t.paint('#3a3d40', 0.5, 0.4), 0.05, 0.04, 0.03, 0, 0, 0.015);
    t.box(sol, t.paint('#16181a', 0.6), 0.045, 0.055, 0.045, 0, 0.045, 0.02);
    t.box(sol, t.paint('#26292b', 0.5), 0.04, 0.03, 0.025, 0, 0.045, 0.055);
    const lamp = t.led(sol, '#ffb020', 0.006, 0, 0.055, 0.068);
    lamp.mesh.userData.live = true;
    const override = t.cyl(
      sol,
      t.paint('#c42b23', 0.5),
      0.01,
      0.012,
      -0.02,
      0,
      0.034,
      'z',
      12,
    );
    // Its air line, away along the actuator.
    t.rod(
      head,
      t.paint('#2e5a8a', 0.6),
      [L * 0.2 - 0.03, y0 + 0.03 + H / 2, side + 0.02],
      [-L / 2, y0 + 0.03 + H / 2, side + 0.02],
      0.004,
      8,
    );
    const badge = createBrandBadge(kit, 'grundflow', {
      height: Math.min(0.03, H * 0.25),
    });
    badge.position.set(-L * 0.2, y0 + 0.03 + H / 2, H / 2 + 0.002);
    head.add(badge);
    return { indicator, lamp, override, pilot: sol };
  };
  /**
   * The electric drive: a spring-return quarter-turn actuator, a motor and
   * gearbox in a grey cast housing square on the stem, its spring inside
   * to shut the valve when its power goes; on top its domed position
   * indicator, the same yellow pointer turning a quarter; on its front its
   * power lamp and red manual override; its cable in by a gland at its end.
   */
  const electric = () => {
    const W = Math.min(0.24, Math.max(0.1, s.od * 0.7));
    const D = W * 0.8;
    const y0 = neckTop + 0.01;
    const housing = t.paint('#6f7a82', 0.45, 0.35);
    t.box(
      head,
      t.paint('#5c6166', 0.5, 0.5),
      D * 0.6,
      0.03,
      D * 0.6,
      0,
      y0 + 0.015,
      0,
    );
    t.box(head, housing, W, D, D, 0, y0 + 0.03 + D / 2, 0);
    // Its cover, a shade darker, a little proud of the housing's top.
    t.box(
      head,
      t.paint('#59636a', 0.5, 0.3),
      W * 0.94,
      0.012,
      D * 0.94,
      0,
      y0 + 0.03 + D + 0.006,
      0,
    );
    const top = y0 + 0.03 + D + 0.012;
    const indicator = new Group();
    indicator.position.set(0, top, 0);
    indicator.userData.live = true;
    head.add(indicator);
    t.cyl(
      indicator,
      t.paint('#d8dcdf', 0.2, 0.1),
      D * 0.3,
      0.02,
      0,
      0.01,
      0,
      'y',
      20,
    );
    t.box(
      indicator,
      t.paint('#f2c230', 0.4),
      D * 0.5,
      0.006,
      D * 0.09,
      0,
      0.022,
      0,
    );
    // The front: its power lamp and its override, a red push.
    const front = D / 2 + 0.001;
    const mid = y0 + 0.03 + D / 2;
    const lamp = t.led(
      head,
      '#3cdc5a',
      0.006,
      W * 0.28,
      mid + D * 0.2,
      front + 0.004,
    );
    lamp.mesh.userData.live = true;
    const override = t.cyl(
      head,
      t.paint('#c42b23', 0.5),
      0.012,
      0.012,
      W * 0.28,
      mid - D * 0.15,
      front + 0.006,
      'z',
      12,
    );
    // Its cable gland, and the cable away from it.
    t.cyl(
      head,
      t.paint('#1d1f21', 0.6),
      0.009,
      0.018,
      -W / 2 - 0.009,
      mid,
      0,
      'x',
      10,
    );
    t.rod(
      head,
      t.paint('#2a2b2c', 0.7),
      [-W / 2 - 0.018, mid, 0],
      [-W / 2 - 0.06, mid - 0.05, 0],
      0.004,
      8,
    );
    const badge = createBrandBadge(kit, 'grundflow', {
      height: Math.min(0.03, D * 0.22),
    });
    badge.position.set(-W * 0.15, mid, front + 0.001);
    head.add(badge);
    return { indicator, lamp, override, pilot: head };
  };
  const { indicator, lamp, override, pilot } =
    drive === 'electric' ? electric() : pneumatic();
  let state = newActuatedValve(binding?.open() ?? true);
  if (drive === 'electric') state.air = true;
  if (binding?.position) state.position = binding.position();
  const moving = signal(false);
  // Moving, the air exhausting from its cylinder; or its geared motor
  // running up, steady, and running down (`gear-motor`), a little higher
  // driving open than its spring's unwinding shut.
  const electricDrive = drive === 'electric';
  const pitch = signal(1);
  a.holdWhile(
    moving,
    electricDrive ? machineTone('gear-motor', pitch, 0.1) : PNEUMATIC_STROKE,
    head,
  );
  let audible = true;
  let prime = true;
  let wasEnergised = energised(state);
  let wasMoving = false;
  const stroke = strokeTime(s.od);
  const toggle = () => {
    if (binding) binding.set(!binding.open());
    else state = { ...state, command: !state.command };
  };
  a.uses.set(override, toggle);
  a.updates.push((delta) => {
    if (binding)
      state = {
        ...state,
        command: binding.open(),
        power: binding.power?.() ?? state.power,
        // An electric drive needs no air.
        air: electricDrive || (binding.air?.() ?? state.air),
      };
    state = binding?.position
      ? { ...state, position: binding.position() }
      : stepActuatedValve(state, delta, stroke);
    indicator.rotation.y = (1 - state.position) * (Math.PI / 2);
    lamp.set(energised(state));
    const travelling = Math.abs(state.position - target(state)) > 1e-6;
    const coil = energised(state);
    if (audible && !prime) {
      if (coil !== wasEnergised)
        partAudio.play(electricDrive ? RELAY_CLICK : SOLENOID_CLICK, pilot);
      if (wasMoving && !travelling) partAudio.play(VALVE_STOP, head);
    }
    pitch.value = target(state) > state.position ? 1 : 0.9;
    moving.value = audible && travelling;
    wasEnergised = coil;
    wasMoving = travelling;
    prime = false;
  });
  const base = a.part();
  const setAudible = base.setAudible;
  const part = Object.assign(base, {
    setAudible(on: boolean) {
      if (on !== audible) {
        moving.value = false;
        prime = true;
      }
      audible = on;
      setAudible(on);
    },
    /** Its supplies: the solenoid's power, the actuator's air. */
    setSupplies(power: boolean, air: boolean) {
      state = { ...state, power, air: electricDrive || air };
    },
    /** How open it stands, and what its limit switches say. */
    position: () => state.position,
    limits: () => limits(state),
    /** Whether its solenoid is energised. */
    energised: () => energised(state),
  });
  return Object.defineProperty(part, 'open', {
    get: () => binding?.open() ?? state.command,
  }) as typeof part & { readonly open: boolean };
}
