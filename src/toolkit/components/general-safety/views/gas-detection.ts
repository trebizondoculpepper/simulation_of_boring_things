import { Color, Group, Mesh, SphereGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitGlow } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';

/**
 * Gas detection's fittings, in metres, each facing +z from its wall with
 * its back at z = 0: the sounder-beacon over a room's door and the fixed
 * detector low on its wall. Drawing only (`../logic/gas-detection.ts`).
 */

/** A beacon's lens colour: amber for chlorine, blue for ozone, red for the boiler house's gas. */
export const BEACON_LENS = {
  amber: '#ffa21f',
  blue: '#3f8cff',
  red: '#ff3b2a',
} as const;
export type BeaconLens = keyof typeof BEACON_LENS;

/**
 * A wall sounder-beacon, after the Klaxon Sonos: a round white base
 * 113 mm across and 50 mm deep with its sounder's ring of holes, under a
 * domed xenon lens 75 mm across. `update` flashes it: a xenon strobe, one
 * short flash a second, while `set(true)`.
 */
export function createGasBeacon(kit: PanelKit, lens: BeaconLens) {
  const t = tools(kit);
  const group = new Group();
  const base = t.paint('#ecebe5', 0.45);
  t.cyl(group, base, 0.0565, 0.05, 0, 0, 0.025, 'z', 32);
  // The sounder's ring of holes round the lens.
  const hole = t.paint('#2a2b2c', 0.7);
  for (let n = 0; n < 16; n++) {
    const a = (n / 16) * Math.PI * 2;
    t.cyl(
      group,
      hole,
      0.0035,
      0.002,
      Math.cos(a) * 0.048,
      Math.sin(a) * 0.048,
      0.0505,
      'z',
      8,
    );
  }
  const colour = new Color(BEACON_LENS[lens]);
  const glass = kitGlow(kit, BEACON_LENS[lens]);
  glass.transparent = true;
  glass.opacity = 0.85;
  const dome = new Mesh(
    new SphereGeometry(0.0375, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
  );
  dome.rotation.x = Math.PI / 2;
  dome.position.z = 0.05;
  dome.userData.live = true;
  group.add(dome);
  // The xenon tube inside, seen through the lens.
  t.cyl(group, t.paint('#d9d6cf', 0.3), 0.004, 0.03, 0, 0, 0.065, 'y', 8);
  const badge = createBrandBadge(kit, 'warden', { height: 0.008 });
  badge.position.set(0, -0.046, 0.0505);
  group.add(badge);
  const dark = colour.clone().multiplyScalar(0.18);
  glass.color.copy(dark);
  let time = 0;
  let flashing = false;
  return {
    group,
    set(on: boolean) {
      flashing = on;
    },
    update(delta: number) {
      time += delta;
      // A strobe: bright for 80 ms of each second, with a short afterglow.
      const into = time % 1;
      const level = !flashing
        ? 0
        : into < 0.08
          ? 1
          : Math.max(0, 1 - (into - 0.08) / 0.12) * 0.35;
      glass.color.copy(dark).lerp(colour, level);
    },
  };
}

/**
 * A fixed toxic gas detector, after the Crowcon Xgard Bright: a grey
 * 160 × 200 × 100 mm housing, its backlit display reading the gas in ppm,
 * green, A1 and A2 lamps beside it, and its electrochemical sensor
 * pointing down beneath (`gas` and `range` engraved on its label).
 */
export function createGasDetector(kit: PanelKit, gas: string, range: number) {
  const t = tools(kit);
  const group = new Group();
  const W = 0.16;
  const H = 0.2;
  const D = 0.1;
  t.box(group, t.paint('#9da3a6', 0.5), W, H, D, 0, 0, D / 2);
  t.box(
    group,
    t.paint('#33383b', 0.6),
    W - 0.02,
    0.07,
    0.004,
    0,
    0.04,
    D + 0.002,
  );
  // The sensor, in its weatherproof head, pointing down.
  t.cyl(
    group,
    t.paint('#585e61', 0.5),
    0.022,
    0.05,
    0,
    -H / 2 - 0.025,
    D / 2,
    'y',
    20,
  );
  t.cyl(
    group,
    t.paint('#202224', 0.8),
    0.016,
    0.004,
    0,
    -H / 2 - 0.051,
    D / 2,
    'y',
    16,
  );
  // The display: green backlit LCD, black digits.
  const screen = t.printed(0.11, 0.045, () => undefined, 256, true);
  screen.mesh.position.set(0, 0.045, D + 0.0045);
  screen.mesh.userData.live = true;
  group.add(screen.mesh);
  const draw = (text: string, lit: boolean) => {
    const c = screen.context;
    const { width: cw, height: ch } = c.canvas;
    c.fillStyle = lit ? '#9fd26a' : '#3d4a33';
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#152010';
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.font = `bold ${ch * 0.72}px "Courier New", monospace`;
    c.fillText(text, cw * 0.74, ch * 0.54);
    c.font = `bold ${ch * 0.26}px ${SANS}`;
    c.textAlign = 'left';
    c.fillText('ppm', cw * 0.77, ch * 0.62);
    c.fillText(gas, cw * 0.77, ch * 0.3);
    screen.texture.needsUpdate = true;
  };
  draw('', false);
  const ok = t.led(group, '#3ddc4a', 0.005, -0.05, -0.005, D + 0.002);
  const a1 = t.led(group, '#ff3b2a', 0.005, 0, -0.005, D + 0.002);
  const a2 = t.led(group, '#ff3b2a', 0.005, 0.05, -0.005, D + 0.002);
  t.label(group, 'OK', -0.05, -0.02, D + 0.002, 0.008, '#f2f2ee');
  t.label(group, 'A1', 0, -0.02, D + 0.002, 0.008, '#f2f2ee');
  t.label(group, 'A2', 0.05, -0.02, D + 0.002, 0.008, '#f2f2ee');
  t.label(
    group,
    `${gas} 0–${range} ppm`,
    0,
    -0.06,
    D + 0.002,
    0.009,
    '#1b1b1b',
    '#f1efe6',
  );
  const badge = createBrandBadge(kit, 'warden', { height: 0.012 });
  badge.position.set(0, 0.088, D + 0.002);
  group.add(badge);
  let shown = '';
  let time = 0;
  let alarms = { a1: false, a2: false };
  return {
    group,
    show(text: string, a1On: boolean, a2On: boolean) {
      alarms = { a1: a1On, a2: a2On };
      if (text !== shown) {
        shown = text;
        draw(text, true);
      }
    },
    update(delta: number) {
      time += delta;
      // Latched alarms flash their lamps; the green lamp is steady.
      const flash = time % 0.6 < 0.3;
      ok.set(true);
      a1.set(alarms.a1 && flash);
      a2.set(alarms.a2 && flash);
    },
  };
}

/**
 * A placeholder for a machine not yet built: a plain grey box with its
 * name stencilled on it, which the room's buttons make give off gas.
 */
export function createGasSourcePlaceholder(
  kit: PanelKit,
  name: string,
  w = 0.8,
  h = 1.2,
  d = 0.5,
) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#8d9290', 0.7), w, h, d, 0, h / 2, 0);
  const face = t.printed(
    w * 0.9,
    0.22,
    (c, cw, ch) => {
      c.fillStyle = '#e8e6dc';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#1b1b1b';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `bold ${ch * 0.3}px ${SANS}`;
      c.fillText(name, cw / 2, ch * 0.38);
      c.font = `${ch * 0.2}px ${SANS}`;
      c.fillText(
        'PLACEHOLDER · gives off gas for the detectors',
        cw / 2,
        ch * 0.74,
      );
    },
    512,
  );
  face.mesh.position.set(0, h - 0.2, d / 2 + 0.002);
  face.mesh.userData.unpowered = true;
  group.add(face.mesh);
  return group;
}
