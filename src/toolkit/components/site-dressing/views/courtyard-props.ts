import { Color, Group, IcosahedronGeometry, Mesh } from 'three';
import { kitGlow } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';

/**
 * An office courtyard's furniture, where the staff go out to smoke:
 * placeholders at true size after common UK products, to be improved
 * later. Each stands on the ground at y = 0, facing +z; they only draw.
 */

/**
 * A square planter (a 600 mm fibreglass cube in dark grey) with a clipped
 * shrub in it, `seed` making each shrub a little different.
 */
export function createPlanter(kit: PanelKit, seed = 0) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#3d4245', 0.6), 0.6, 0.6, 0.6, 0, 0.3, 0);
  t.box(group, t.paint('#4a3a2c', 0.9), 0.54, 0.02, 0.54, 0, 0.6, 0);
  const leaves = t.paint(['#3e6a35', '#4a7a3a', '#365e30'][seed % 3], 0.8);
  const shrub = (r: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(new IcosahedronGeometry(r, 1), leaves);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  const tall = 0.15 * (seed % 4);
  shrub(0.34, 0, 0.92 + tall / 2, 0);
  shrub(0.24, 0.12, 1.18 + tall, -0.05);
  shrub(0.2, -0.12, 1.1 + tall, 0.08);
  return group;
}

/**
 * A pedestal ashtray, after a stainless steel outdoor cigarette bin: a
 * column about 1 m tall and 250 mm across, a domed snuffer top with its
 * slots, on a weighted base.
 */
export function createPedestalAshtray(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const steel = t.paint('#b9bec0', 0.3, 0.85);
  t.cyl(group, t.paint('#2f3335', 0.5, 0.5), 0.17, 0.04, 0, 0.02, 0, 'y', 24);
  t.cyl(group, steel, 0.12, 0.9, 0, 0.49, 0, 'y', 24);
  t.cyl(group, steel, 0.13, 0.06, 0, 0.97, 0, 'y', 24);
  t.cyl(group, t.paint('#2a2c2d', 0.6), 0.05, 0.012, 0, 1.0, 0, 'y', 16);
  return group;
}

/**
 * A stacking bistro chair: a powder-coated steel frame and a slatted
 * seat and back, 450 mm seat height.
 */
export function createBistroChair(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const frame = t.paint('#2b3133', 0.5, 0.4);
  for (const x of [-0.2, 0.2])
    for (const z of [-0.2, 0.2])
      t.box(group, frame, 0.025, 0.45, 0.025, x, 0.225, z);
  for (let i = 0; i < 5; i++)
    t.box(group, frame, 0.44, 0.02, 0.07, 0, 0.45, -0.17 + i * 0.085);
  for (const x of [-0.2, 0.2])
    t.box(group, frame, 0.025, 0.42, 0.025, x, 0.66, -0.21);
  for (let i = 0; i < 3; i++)
    t.box(group, frame, 0.42, 0.06, 0.02, 0, 0.6 + i * 0.1, -0.21);
  return group;
}

/** A slatted timber bench on steel legs, 1.8 m long. */
export function createBench(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const timber = t.paint('#8a6a45', 0.8);
  const steel = t.paint('#3a3f41', 0.5, 0.4);
  for (const x of [-0.75, 0.75])
    t.box(group, steel, 0.05, 0.43, 0.42, x, 0.215, 0);
  for (let i = 0; i < 4; i++)
    t.box(group, timber, 1.8, 0.035, 0.09, 0, 0.45, -0.15 + i * 0.1);
  return group;
}

/** A round steel litter bin with a liner, 800 mm tall. */
export function createLitterBin(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint('#2e4a3c', 0.5, 0.3), 0.2, 0.8, 0, 0.4, 0, 'y', 20);
  t.cyl(group, t.paint('#1a1c1d', 0.6), 0.16, 0.02, 0, 0.8, 0, 'y', 20);
  return group;
}

/**
 * A lamp post with a fake Victorian lantern on top: a black cast-style
 * column 3.2 m tall on a fluted base, a ladder bar, and a four-sided
 * lantern with a cap and finial, its panes cool white when lit (an LED in
 * a heritage case). `set(lit)`; its lantern's middle is at `LANTERN_HEIGHT`.
 */
export const LANTERN_HEIGHT = 3.35;
export function createLampPost(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const black = t.paint('#1c1f20', 0.45, 0.3);
  t.cyl(group, black, 0.17, 0.5, 0, 0.25, 0, 'y', 16);
  t.cyl(group, black, 0.11, 0.12, 0, 0.56, 0, 'y', 16);
  t.cyl(group, black, 0.06, 2.4, 0, 1.8, 0, 'y', 12);
  t.box(group, black, 0.5, 0.03, 0.03, 0, 2.9, 0);
  t.cyl(group, black, 0.1, 0.1, 0, 3.05, 0, 'y', 12);
  // The lantern: four panes in a frame, widening upward, a cap and finial.
  const pane = kitGlow(kit, '#eef3ff');
  const on = new Color('#eef3ff');
  const off = new Color('#7d8389');
  for (let i = 0; i < 4; i++) {
    const side = new Group();
    side.rotation.y = (i * Math.PI) / 2;
    group.add(side);
    const glass = t.box(side, pane, 0.26, 0.36, 0.01, 0, LANTERN_HEIGHT, 0.15);
    glass.rotation.x = -0.12;
    t.box(side, black, 0.03, 0.4, 0.03, 0.15, LANTERN_HEIGHT, 0.15);
  }
  t.box(group, black, 0.42, 0.04, 0.42, 0, LANTERN_HEIGHT + 0.2, 0);
  const cap = new Mesh(new IcosahedronGeometry(0.17, 0), black);
  cap.scale.y = 0.5;
  cap.position.y = LANTERN_HEIGHT + 0.26;
  group.add(cap);
  t.cyl(group, black, 0.015, 0.16, 0, LANTERN_HEIGHT + 0.42, 0, 'y', 8);
  t.box(group, black, 0.24, 0.04, 0.24, 0, LANTERN_HEIGHT - 0.2, 0);
  return {
    group,
    set(lit: boolean) {
      pane.color.copy(lit ? on : off);
    },
  };
}
