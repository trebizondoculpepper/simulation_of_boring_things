import { Group } from 'three';
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

  let state = newActuatedValve(binding?.open() ?? true);
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
        air: binding.air?.() ?? state.air,
      };
    state = binding?.position
      ? { ...state, position: binding.position() }
      : stepActuatedValve(state, delta, stroke);
    indicator.rotation.y = (1 - state.position) * (Math.PI / 2);
    lamp.set(energised(state));
  });
  const part = Object.assign(a.part(), {
    /** Its supplies: the solenoid's power, the actuator's air. */
    setSupplies(power: boolean, air: boolean) {
      state = { ...state, power, air };
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
