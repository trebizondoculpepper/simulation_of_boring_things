import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  TorusGeometry,
  Vector2,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { FINISH, plantTools } from './plant-tools';

/**
 * Chemical delivery couplings (Hall 8 and the stores' fill cabinets; the
 * owner, 2026-10-30): the hose ends a tanker driver connects, modelled to
 * their real proportions, each turned on a lathe profile.
 *
 * - The camlock (cam and groove, after EN 14420-7 / MIL-C-27487): the
 *   male adaptor, its groove round it, its hex and threaded tail; the
 *   female coupler, two ears with a cam arm on a pin either side, each
 *   arm's ring to pull it open, its barbed hose shank; and the dust cap,
 *   a coupler with no shank. The arms swing out to open (`setOpen`).
 * - The Guillemin (NF E 29-572): symmetrical halves, each a locking ring
 *   with two hooked lugs and a flat face seal; two halves turned a
 *   quarter to each other lock together. Its blank is its cap.
 * - A hose end: the hose, the crimped ferrule over its shank, a band in
 *   its chemical's colour.
 *
 * Sizes in inches (2" the hypochlorite's, 1½" the acid's); models in
 * metres, built along +z, the mating face towards +z and the tail at the
 * origin. Set decoration unless a room drives the arms.
 */

/** What a coupling is made of. */
export type CouplingMaterial = 'brass' | 'stainless' | 'polypropylene';

const COLOUR: Record<CouplingMaterial, [string, number, number]> = {
  brass: [FINISH.brass, 0.35, 0.75],
  stainless: [FINISH.stainless, 0.3, 0.85],
  // Glass-filled polypropylene, as hypochlorite and acid couplings are.
  polypropylene: ['#3b3f42', 0.6, 0],
};

/** A coupling's parts, built along y, turned onto z. */
function along(name: string) {
  const outer = new Group();
  outer.name = name;
  const inner = new Group();
  // y (the lathe's axis) onto z: the mating face towards +z.
  inner.rotation.x = Math.PI / 2;
  outer.add(inner);
  return { outer, inner };
}

/** A solid of revolution about y through `points` ([radius, y] pairs, metres). */
function lathe(
  parent: Object3D,
  material: Material,
  points: readonly (readonly [number, number])[],
  segments = 28,
) {
  const mesh = new Mesh(
    new LatheGeometry(
      points.map(([r, y]) => new Vector2(r, y)),
      segments,
    ),
    material,
  );
  parent.add(mesh);
  return mesh;
}

/** A barbed hose shank from y 0 to `length`, radius `r`: `barbs` ridges. */
function shank(r: number, length: number, barbs = 4): [number, number][] {
  const pts: [number, number][] = [[r * 0.72, 0]];
  const step = length / barbs;
  for (let k = 0; k < barbs; k++) {
    pts.push([r * 0.92, k * step + step * 0.1]);
    pts.push([r, k * step + step * 0.85]);
    pts.push([r * 0.92, k * step + step * 0.9]);
  }
  pts.push([r * 0.92, length]);
  return pts;
}

/**
 * A camlock's male adaptor (a type F, its thread into a valve): its
 * threaded tail, its hex, its body with the cam groove round it, and its
 * bore. `size` in inches.
 */
export function createCamlockAdaptor(
  kit: PanelKit,
  { size = 2, material = 'brass' as CouplingMaterial } = {},
) {
  const t = plantTools(kit);
  const s = size / 2;
  const m = t.paint(...COLOUR[material]);
  const { outer, inner } = along(`${size}" camlock adaptor`);
  // The thread: a run of ridges.
  const thread: [number, number][] = [[0.022 * s, 0]];
  for (let k = 0; k < 6; k++) {
    thread.push([0.03 * s, (k + 0.3) * 0.004 * s]);
    thread.push([0.027 * s, (k + 0.8) * 0.004 * s]);
  }
  thread.push([0.027 * s, 0.026 * s]);
  // The body, the groove at its middle, a chamfer to its face, its bore back.
  lathe(inner, m, [
    ...thread,
    [0.0335 * s, 0.041 * s],
    [0.0335 * s, 0.05 * s],
    [0.0285 * s, 0.053 * s],
    [0.0285 * s, 0.059 * s],
    [0.0335 * s, 0.062 * s],
    [0.0335 * s, 0.075 * s],
    [0.03 * s, 0.079 * s],
    [0.024 * s, 0.079 * s],
    [0.024 * s, 0],
    [0.022 * s, 0],
  ]);
  // The hex, to tighten it.
  const hex = new Mesh(
    new CylinderGeometry(0.041 * s, 0.041 * s, 0.014 * s, 6),
    m,
  );
  hex.position.y = 0.033 * s;
  inner.add(hex);
  return outer;
}

/**
 * A camlock's female coupler (a type C, on a hose's shank), or its dust
 * cap (`cap`, no shank, closed): the socket the adaptor goes into, two
 * ears either side, a cam arm on a pin in each with its pull ring, lying
 * along the body shut and swung out open. `setOpen(k)`, 0 shut to 1
 * open. Its face at the top of the socket, `face` metres along z.
 */
export function createCamlockCoupler(
  kit: PanelKit,
  {
    size = 2,
    material = 'brass' as CouplingMaterial,
    cap = false,
    /** The cap's colour, if it is a cap in a chemical's colour. */
    colour = null as string | null,
  } = {},
) {
  const t = plantTools(kit);
  const s = size / 2;
  const m = colour ? t.paint(colour, 0.5) : t.paint(...COLOUR[material]);
  const metal = t.paint(
    ...COLOUR[material === 'polypropylene' ? 'stainless' : material],
  );
  const name = cap ? `${size}" camlock dust cap` : `${size}" camlock coupler`;
  const { outer, inner } = along(name);
  const base = cap ? 0 : 0.06 * s;
  const face = base + 0.055 * s;
  // The hose shank, a collar, the socket and its bore (a cap closed).
  lathe(inner, m, [
    ...(cap ? [[0, 0] as [number, number]] : shank(0.027 * s, base)),
    [0.034 * s, base],
    [0.034 * s, base + 0.008 * s],
    [0.042 * s, base + 0.012 * s],
    [0.042 * s, face - 0.002 * s],
    [0.039 * s, face],
    [0.0345 * s, face],
    [0.0345 * s, base + 0.02 * s],
    [cap ? 0 : 0.022 * s, base + 0.02 * s],
    ...(cap ? [] : [[0.022 * s, 0] as [number, number]]),
  ]);
  // The gasket at the bottom of the socket.
  const gasket = new Mesh(
    new TorusGeometry(0.029 * s, 0.003 * s, 6, 24),
    t.paint('#151515', 0.9),
  );
  gasket.rotation.x = Math.PI / 2;
  gasket.position.y = base + 0.022 * s;
  inner.add(gasket);
  // The ears and the arms, either side (x).
  const pivotY = face - 0.012 * s;
  const arms: Group[] = [];
  for (const side of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const ear = new Mesh(new BoxGeometry(0.014 * s, 0.026 * s, 0.005 * s), m);
      ear.position.set(side * 0.048 * s, pivotY, dz * 0.008 * s);
      inner.add(ear);
    }
    const pin = new Mesh(
      new CylinderGeometry(0.0025 * s, 0.0025 * s, 0.024 * s, 8),
      metal,
    );
    pin.rotation.x = Math.PI / 2;
    pin.position.set(side * 0.05 * s, pivotY, 0);
    inner.add(pin);
    // The arm: its cam at the pin, then down along the body to its ring.
    const arm = new Group();
    arm.position.set(side * 0.05 * s, pivotY, 0);
    inner.add(arm);
    const cam = new Mesh(
      new CylinderGeometry(0.008 * s, 0.008 * s, 0.01 * s, 12),
      metal,
    );
    cam.rotation.x = Math.PI / 2;
    arm.add(cam);
    const lever = new Mesh(
      new BoxGeometry(0.008 * s, 0.075 * s, 0.009 * s),
      metal,
    );
    lever.position.set(side * 0.004 * s, -0.04 * s, 0);
    arm.add(lever);
    const ring = new Mesh(
      new TorusGeometry(0.011 * s, 0.0022 * s, 6, 16),
      metal,
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 0.006 * s, -0.085 * s, 0);
    arm.add(ring);
    arm.userData.side = side;
    arms.push(arm);
  }
  const setOpen = (k: number) => {
    const a = Math.max(0, Math.min(1, k)) * 1.9;
    for (const arm of arms) arm.rotation.z = (arm.userData.side as number) * a;
  };
  setOpen(0);
  outer.userData.face = face;
  /** Its hose shank's length, for its hose (`createHoseEnd`). */
  const hoseShank = base;
  return { object: outer, setOpen, face, shank: hoseShank };
}

/**
 * A Guillemin half (or, `blank`, its cap): symmetrical, so either half
 * meets the other turned a quarter round: its barbed hose shank, its body,
 * its locking ring with two lugs, each hooked to catch the other half's,
 * and its flat face seal. Its face `face` metres along z.
 */
export function createGuilleminHalf(
  kit: PanelKit,
  {
    size = 1.5,
    material = 'polypropylene' as CouplingMaterial,
    blank = false,
    colour = null as string | null,
  } = {},
) {
  const t = plantTools(kit);
  const s = size / 1.5;
  const m = colour ? t.paint(colour, 0.5) : t.paint(...COLOUR[material]);
  const { outer, inner } = along(
    blank ? `${size}" Guillemin blank` : `${size}" Guillemin half`,
  );
  const base = blank ? 0 : 0.05 * s;
  const face = base + 0.04 * s;
  lathe(inner, m, [
    ...(blank ? [[0, 0] as [number, number]] : shank(0.021 * s, base)),
    [0.03 * s, base],
    [0.03 * s, base + 0.018 * s],
    [0.043 * s, base + 0.021 * s],
    [0.043 * s, face - 0.002 * s],
    [0.04 * s, face],
    [blank ? 0 : 0.019 * s, face],
    ...(blank ? [] : [[0.017 * s, 0] as [number, number]]),
  ]);
  // The face seal.
  const seal = new Mesh(
    new TorusGeometry(0.027 * s, 0.0028 * s, 6, 24),
    t.paint('#151515', 0.9),
  );
  seal.rotation.x = Math.PI / 2;
  seal.position.y = face + 0.001 * s;
  inner.add(seal);
  // Two lugs, opposite: each a tongue standing past the face, its hook
  // turned the same way round, so two halves twisted together lock.
  for (const side of [-1, 1]) {
    const lug = new Mesh(new BoxGeometry(0.012 * s, 0.022 * s, 0.024 * s), m);
    lug.position.set(side * 0.047 * s, face + 0.002 * s, 0);
    inner.add(lug);
    const hook = new Mesh(new BoxGeometry(0.008 * s, 0.006 * s, 0.014 * s), m);
    hook.position.set(side * 0.042 * s, face + 0.011 * s, side * 0.006 * s);
    inner.add(hook);
  }
  outer.userData.face = face;
  return { object: outer, face, shank: base };
}

/**
 * A hose's end: pushed over its coupling's barbed shank (`shank` metres
 * long, from the coupling's tail at the origin along +z) and `length` of
 * hose back along −z, a crimped ferrule round it over the shank, a band in
 * its chemical's colour. `bore` in inches.
 */
export function createHoseEnd(
  kit: PanelKit,
  {
    bore = 2,
    length = 0.4,
    colour = null as string | null,
    shank = null as number | null,
  } = {},
) {
  const t = plantTools(kit);
  const s = bore / 2;
  const over = shank ?? 0.06 * s;
  const group = new Group();
  group.name = `${bore}" chemical hose end`;
  const rubber = t.paint(FINISH.rubber, 0.85);
  const r = 0.031 * s;
  t.rod(group, rubber, [0, 0, -length], [0, 0, over - 0.004], r, 20);
  // The ferrule, crimped: a sleeve with its ridges.
  const ferrule = t.paint(FINISH.stainless, 0.35, 0.8);
  // Its profile along y, 0 at the shank's end back to its tail and a
  // little more: turned onto −z from there.
  const long = over + 0.006 * s;
  const crimps: [number, number][] = [
    [r * 0.95, 0],
    [r * 1.12, 0],
  ];
  for (let k = 0; k < 5; k++) {
    crimps.push([r * 1.1, ((k + 0.45) * long) / 5]);
    crimps.push([r * 1.16, ((k + 0.85) * long) / 5]);
  }
  crimps.push([r * 0.95, long]);
  const sleeve = new Group();
  sleeve.position.z = over;
  sleeve.rotation.x = -Math.PI / 2;
  lathe(sleeve, ferrule, crimps);
  group.add(sleeve);
  // Its chemical's colour, a band round the hose.
  if (colour) {
    const band = new Mesh(
      new CylinderGeometry(r * 1.06, r * 1.06, 0.04 * s, 20),
      t.paint(colour, 0.6),
    );
    band.rotation.x = Math.PI / 2;
    band.position.z = -0.1 * s;
    group.add(band);
  }
  return group;
}
