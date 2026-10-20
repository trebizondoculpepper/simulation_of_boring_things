import { CylinderGeometry, Group, Mesh } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { FINISH, plantTools } from './plant-tools';

/**
 * Ductwork specimens, in metres, on the floor at their origin facing +z
 * unless said otherwise. Galvanised sheet ductwork after the DW/144
 * specification: rectangular duct with flanged joints, spiral-wound
 * circular duct, insulated supply duct, a fire damper and a volume
 * control damper; and a board of grilles and diffusers.
 */

const GALV = '#b5babb';

function caption(
  t: ReturnType<typeof plantTools>,
  parent: Group,
  text: string,
  x: number,
  y: number,
  z: number,
  w = 0.5,
) {
  const lines = text.split('\n');
  const label = t.printed(
    w,
    0.035 * lines.length + 0.02,
    (c, cw, ch) => {
      c.fillStyle = '#eef0ea';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#1f2b31';
      c.font = `bold ${(ch / lines.length) * 0.5}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, i) =>
        c.fillText(line, cw / 2, (ch / lines.length) * (i + 0.5)),
      );
    },
    384,
  );
  label.mesh.position.set(x, y, z);
  parent.add(label.mesh);
}

/** A rectangular duct along x, `w` wide and `h` high, its flanged joints every 1.2 m. */
function rectDuct(
  t: ReturnType<typeof plantTools>,
  parent: Group,
  from: number,
  to: number,
  w: number,
  h: number,
  y: number,
  insulated = false,
) {
  const sheet = t.paint(
    insulated ? '#d9dbd6' : GALV,
    insulated ? 0.35 : 0.4,
    insulated ? 0.7 : 0.6,
  );
  const extra = insulated ? 0.1 : 0;
  t.box(parent, sheet, to - from, h + extra, w + extra, (from + to) / 2, y, 0);
  if (insulated) return;
  const flange = t.paint('#9da2a3', 0.45, 0.6);
  for (let x = from; x <= to + 1e-6; x += 1.2)
    t.box(parent, flange, 0.03, h + 0.06, w + 0.06, x, y, 0);
}

/** A 2.4 m run of 1000 × 500 mm rectangular duct with a 90° bend upward. */
export function createRectangularDuct(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const y = 0.75;
  rectDuct(t, group, -1.5, 0.9, 0.5, 0.5, y);
  // The bend: a radiused 90° bend, drawn as five segments.
  const sheet = t.paint(GALV, 0.4, 0.6);
  const r = 0.5;
  for (let i = 0; i < 5; i++) {
    const a = ((i + 0.5) / 5) * (Math.PI / 2);
    const seg = t.box(
      group,
      sheet,
      0.33,
      0.5,
      0.5,
      0.9 + Math.sin(a) * r,
      y + r - Math.cos(a) * r,
      0,
    );
    seg.rotation.z = a;
  }
  t.box(group, sheet, 0.5, 0.6, 0.5, 0.9 + r, y + r + 0.3, 0);
  // Stands.
  for (const x of [-1.2, 0.3])
    t.box(
      group,
      t.paint(FINISH.galvanised, 0.45, 0.6),
      0.6,
      0.04,
      0.6,
      x,
      y - 0.27,
      0,
    );
  for (const x of [-1.2, 0.3])
    t.box(
      group,
      t.paint(FINISH.galvanised, 0.45, 0.6),
      0.04,
      y - 0.29,
      0.04,
      x,
      (y - 0.29) / 2,
      0,
    );
  caption(
    t,
    group,
    'Rectangular duct 500 × 500\n0.8 mm galvanised, flanged joints (DW/144)',
    -0.3,
    1.25,
    0.3,
    0.6,
  );
  return group;
}

/** Spiral-wound circular duct, Ø315 and Ø500, with its seams, on stands. */
export function createSpiralDuct(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const sheet = t.paint(GALV, 0.38, 0.65);
  const seam = t.paint('#9ea3a4', 0.4, 0.6);
  for (const [d, z] of [
    [0.315, -0.3],
    [0.5, 0.35],
  ] as const) {
    const y = 0.4 + d / 2;
    t.rod(group, sheet, [-1.2, y, z], [1.2, y, z], d / 2, 32);
    // The spiral lock seam, every 137 mm, drawn as rings.
    for (let x = -1.15; x < 1.2; x += 0.137) {
      const ring = new Mesh(
        new CylinderGeometry(d / 2 + 0.003, d / 2 + 0.003, 0.006, 32),
        seam,
      );
      ring.rotation.z = Math.PI / 2;
      ring.position.set(x, y, z);
      group.add(ring);
    }
    for (const x of [-0.8, 0.8])
      t.box(
        group,
        t.paint(FINISH.galvanised, 0.45, 0.6),
        0.04,
        0.4,
        0.04,
        x,
        0.2,
        z,
      );
  }
  caption(
    t,
    group,
    'Spiral duct Ø315 and Ø500\ngalvanised, lock-seamed',
    0,
    1.25,
    0.65,
    0.5,
  );
  return group;
}

/** Insulated supply duct: 600 × 400 under 50 mm foil-faced insulation. */
export function createInsulatedDuct(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const y = 0.7;
  rectDuct(t, group, -1.2, 1.2, 0.6, 0.4, y, true);
  const tape = t.paint('#b8babb', 0.3, 0.8);
  for (let x = -1.0; x <= 1.0; x += 0.5)
    t.box(group, tape, 0.05, 0.505, 0.705, x, y, 0);
  for (const x of [-0.8, 0.8])
    t.box(
      group,
      t.paint(FINISH.galvanised, 0.45, 0.6),
      0.04,
      y - 0.25,
      0.04,
      x,
      (y - 0.25) / 2,
      0,
    );
  caption(
    t,
    group,
    'Supply duct 600 × 400\n50 mm foil-faced insulation',
    0,
    1.15,
    0.36,
    0.5,
  );
  return group;
}

/** A fire damper with its access door and label, and a volume control damper with its quadrant. */
export function createDampers(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const y = 0.75;
  rectDuct(t, group, -1.4, -0.2, 0.5, 0.5, y);
  rectDuct(t, group, 0.2, 1.4, 0.5, 0.5, y);
  const casing = t.paint('#a4a9aa', 0.45, 0.6);
  // Fire damper: deeper casing, access door, FIRE DAMPER label.
  t.box(group, casing, 0.35, 0.62, 0.62, -0.8, y, 0);
  t.box(group, t.paint('#7b8082', 0.45, 0.6), 0.25, 0.3, 0.01, -0.8, y, 0.316);
  const label = t.printed(
    0.25,
    0.06,
    (c, w, h) => {
      c.fillStyle = '#c4231c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.55}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('FIRE DAMPER', w / 2, h / 2);
    },
    256,
  );
  label.mesh.position.set(-0.8, y + 0.22, 0.317);
  group.add(label.mesh);
  // Volume control damper: blade spindle and locking quadrant handle.
  t.box(group, casing, 0.2, 0.56, 0.56, 0.8, y, 0);
  t.box(group, t.paint('#d2a12a', 0.5), 0.03, 0.18, 0.02, 0.8, y + 0.05, 0.3);
  t.cyl(
    group,
    t.paint(FINISH.steel, 0.3, 0.8),
    0.06,
    0.01,
    0.8,
    y,
    0.29,
    'z',
    16,
  );
  for (const x of [-0.8, 0.8])
    t.box(
      group,
      t.paint(FINISH.galvanised, 0.45, 0.6),
      0.04,
      y - 0.31,
      0.04,
      x,
      (y - 0.31) / 2,
      0,
    );
  caption(
    t,
    group,
    'Fire damper (BS EN 15650)          Volume control damper',
    0,
    1.25,
    0.32,
    1.2,
  );
  return group;
}

/**
 * A board of grilles and diffusers, 2.4 m wide, a wall exhibit: a double
 * deflection supply grille 600 × 300, an egg-crate extract grille 600 ×
 * 600, a four-way square ceiling diffuser and a swirl diffuser, each
 * 600 × 600 ceiling tile size.
 */
export function createGrilleBoard(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  t.box(group, t.paint('#d7dad3', 0.8), 2.8, 1.0, 0.02, 0, 0, 0.01);
  const white = t.paint('#f1f1ec', 0.45);
  const slot = t.paint('#3a3d3f', 0.6);
  const faces: [number, number, number, string][] = [
    [-1.05, 0.6, 0.3, 'Supply grille\ndouble deflection'],
    [-0.35, 0.6, 0.6, 'Extract grille\negg-crate'],
    [0.35, 0.6, 0.6, 'Square diffuser\nfour-way'],
    [1.05, 0.6, 0.6, 'Swirl diffuser'],
  ];
  faces.forEach(([x, w, h, name], i) => {
    const y = 0.05;
    t.box(group, white, w, h, 0.03, x, y, 0.035);
    if (i === 0)
      for (let k = 0; k < 9; k++)
        t.box(
          group,
          slot,
          w - 0.04,
          0.006,
          0.01,
          x,
          y - h / 2 + 0.03 + k * 0.03,
          0.052,
        );
    if (i === 1)
      for (let k = 0; k < 15; k++) {
        t.box(
          group,
          slot,
          w - 0.04,
          0.003,
          0.01,
          x,
          y - h / 2 + 0.02 + k * 0.04,
          0.052,
        );
        t.box(
          group,
          slot,
          0.003,
          h - 0.04,
          0.01,
          x - w / 2 + 0.02 + k * 0.04,
          y,
          0.052,
        );
      }
    if (i === 2)
      for (let k = 1; k < 5; k++) {
        const s = w * (1 - k * 0.18);
        t.box(group, slot, s, s, 0.004, x, y, 0.051 + k * 0.004);
        t.box(group, white, s - 0.02, s - 0.02, 0.004, x, y, 0.053 + k * 0.004);
      }
    if (i === 3) {
      t.cyl(group, slot, 0.26, 0.004, x, y, 0.051, 'z', 32);
      t.cyl(group, white, 0.24, 0.006, x, y, 0.053, 'z', 32);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const vane = t.box(
          group,
          slot,
          0.16,
          0.012,
          0.006,
          x + Math.cos(a) * 0.14,
          y + Math.sin(a) * 0.14,
          0.058,
        );
        vane.rotation.z = a + 0.7;
      }
    }
    caption(t, group, name, x, -0.4, 0.035, 0.6);
  });
  return group;
}
