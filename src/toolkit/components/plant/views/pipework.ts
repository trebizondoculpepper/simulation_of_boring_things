import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { FINISH, PIPE_SERVICES, PIPE_SIZES, plantTools } from './plant-tools';
import type { DN } from './plant-tools';

/**
 * Pipework specimens, in metres, each on the floor at its origin facing
 * +z unless said otherwise:
 *
 * - the PVC-U pressure pipe sizes a pool plant uses, DN50 to DN300, each
 *   a short length with a PN16 flange (EN 1092-1) on a stand;
 * - a board of pipe identification bands (BS 1710) for each service;
 * - a length of LTHW heating pipe, steel under 40 mm of insulation with
 *   aluminium cladding, on its clips;
 * - pipe supports: a trapeze of 41 × 41 mm slotted channel on M10 drop
 *   rods, with pipe clamps;
 * - the valves: lever butterfly, handwheel gate, dual-plate check and a
 *   small lever ball valve, each on a run of pipe.
 */

const LABEL_INK = '#1f2b31';

/** A small printed label plate, facing +z at (x, y, z). */
function plate(
  t: ReturnType<typeof plantTools>,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  w = 0.24,
) {
  const lines = text.split('\n');
  const label = t.printed(
    w,
    0.035 * lines.length + 0.02,
    (c, cw, ch) => {
      c.fillStyle = '#eef0ea';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = LABEL_INK;
      c.font = `bold ${(ch / lines.length) * 0.55}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, i) =>
        c.fillText(line, cw / 2, (ch / lines.length) * (i + 0.5)),
      );
    },
    256,
  );
  label.mesh.position.set(x, y, z);
  parent.add(label.mesh);
  return label.mesh;
}

const SIZES: readonly DN[] = [50, 65, 80, 100, 125, 150, 200, 250, 300];

/** The width the pipe size rack takes, metres. */
export const PIPE_SIZE_RACK_WIDTH = SIZES.reduce(
  (n, dn) => n + PIPE_SIZES[dn].flange + 0.12,
  0,
);

/** Each pipe size, a 0.8 m stub on end, its flange on top, in a row. */
export function createPipeSizeRack(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const pvc = t.paint(FINISH.pvc, 0.45);
  t.box(
    group,
    t.paint('#5b5f61', 0.6),
    PIPE_SIZE_RACK_WIDTH,
    0.05,
    0.55,
    0,
    0.025,
    0,
  );
  let x = -PIPE_SIZE_RACK_WIDTH / 2;
  for (const dn of SIZES) {
    const s = PIPE_SIZES[dn];
    x += s.flange / 2 + 0.06;
    t.cyl(group, pvc, s.od / 2, 0.8, x, 0.45, 0, 'y', 24);
    t.flanges(group, dn, [x, 0.85 + s.t, 0], 'y');
    plate(
      t,
      group,
      `DN${dn}\n${Math.round(s.od * 1000)} mm`,
      x,
      0.25,
      s.flange / 2 + 0.02,
      Math.max(0.12, s.flange * 0.9),
    );
    x += s.flange / 2 + 0.06;
  }
  return group;
}

/**
 * The pipe identification board: a DN65 length for each service, its
 * basic colour in bands at each end and its code band between, its name
 * and flow arrow. A wall exhibit, 1.6 m wide.
 */
export function createPipeIdBoard(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const rows = PIPE_SERVICES.length;
  const h = rows * 0.22 + 0.2;
  t.box(group, t.paint('#d7dad3', 0.8), 1.6, h, 0.02, 0, 0, 0.01);
  PIPE_SERVICES.forEach((row, i) => {
    const y = h / 2 - 0.2 - i * 0.22;
    const z = 0.09;
    t.pipe(
      group,
      65,
      [
        [-0.55, y, z],
        [0.55, y, z],
      ],
      FINISH.galvanised,
    );
    for (const x of [-0.42, 0.42]) {
      t.band(group, 65, [x - 0.06, y, z], 'x', row.basic);
      if (row.code) t.band(group, 65, [x + 0.04, y, z], 'x', row.code);
      else t.band(group, 65, [x + 0.04, y, z], 'x', row.basic);
    }
    plate(t, group, row.service, 0, y + 0.075, 0.13, 0.36);
  });
  return group;
}

/** A 2 m length of DN80 LTHW pipe under clad insulation, on two clips and stands. */
export function createInsulatedPipe(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const steel = t.paint(FINISH.steel, 0.4, 0.6);
  const clad = t.paint('#c9ccce', 0.3, 0.8);
  const y = 0.9;
  // Steel pipe shown bare at its ends, clad between.
  t.rod(group, steel, [-1, y, 0], [1, y, 0], 0.0445, 20);
  t.rod(group, clad, [-0.85, y, 0], [0.85, y, 0], 0.0445 + 0.04, 24);
  for (const x of [-0.85, 0.85])
    t.rod(
      group,
      t.paint('#9fa3a5', 0.4, 0.7),
      [x - 0.005, y, 0],
      [x + 0.005, y, 0],
      0.0445 + 0.043,
      24,
    );
  for (const x of [-0.55, 0.55]) {
    t.rod(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      [x, 0, 0],
      [x, y - 0.09, 0],
      0.02,
    );
    t.box(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      0.04,
      0.012,
      0.22,
      x,
      y - 0.09,
      0,
    );
  }
  // Flow and return arrows and the BS 1710 heating bands.
  t.band(group, 80, [0.6, y, 0], 'x', PIPE_SERVICES[2].basic);
  plate(
    t,
    group,
    'LTHW FLOW 80 °C\nDN80 steel · 40 mm insulation',
    0,
    y + 0.18,
    0.1,
    0.5,
  );
  return group;
}

/**
 * A pipe support trapeze: 41 × 41 mm slotted channel across two M10 drop
 * rods from a 2.6 m frame, carrying a DN100 pool water pipe and a DN50
 * one in pipe clamps.
 */
export function createPipeSupport(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const galv = t.paint(FINISH.galvanised, 0.45, 0.6);
  const frameTop = 2.6;
  for (const x of [-0.7, 0.7])
    t.box(group, galv, 0.041, frameTop, 0.041, x, frameTop / 2, -0.3);
  t.box(group, galv, 1.44, 0.041, 0.041, 0, frameTop, -0.3);
  t.box(group, galv, 1.44, 0.041, 0.6, 0, frameTop, 0);
  const trapeze = 1.9;
  for (const x of [-0.45, 0.45])
    t.rod(group, galv, [x, frameTop, 0], [x, trapeze - 0.03, 0], 0.005, 8);
  t.box(group, galv, 1.1, 0.041, 0.041, 0, trapeze - 0.02, 0);
  for (const [dn, x] of [
    [100, -0.18],
    [50, 0.2],
  ] as const) {
    const r = PIPE_SIZES[dn].od / 2;
    t.pipe(group, dn, [
      [x, trapeze + r + 0.002, -0.9],
      [x, trapeze + r + 0.002, 0.9],
    ]);
    t.cyl(group, galv, r + 0.006, 0.03, x, trapeze + r, 0, 'z', 20);
  }
  plate(
    t,
    group,
    'Pipe support: 41 × 41 channel trapeze\nM10 drop rods, pipe clamps',
    0,
    1.5,
    0.05,
    0.5,
  );
  return group;
}

/** The valves a pool plant uses, each on its own run of DN100 pipe (the ball valve DN25). */
export function createValveRun(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const y = 0.8;
  const s = PIPE_SIZES[100];
  const iron = t.paint(FINISH.castIron, 0.5, 0.2);
  const red = t.paint('#c42b23', 0.5);
  const stand = (x: number) => {
    t.rod(
      group,
      t.paint(FINISH.galvanised, 0.4, 0.6),
      [x, 0, 0],
      [x, y - s.od / 2, 0],
      0.02,
    );
  };
  // Butterfly valve.
  t.pipe(group, 100, [
    [-2.1, y, 0],
    [-1.3, y, 0],
  ]);
  t.butterflyValve(group, 100, [-1.7, y, 0], 'x');
  stand(-2.0);
  stand(-1.4);
  plate(
    t,
    group,
    'Butterfly valve\nlever, wafer, DN100',
    -1.7,
    y - 0.3,
    0.15,
    0.3,
  );
  // Gate valve: flanged body 190 mm face to face, rising spindle, handwheel.
  t.pipe(group, 100, [
    [-1.0, y, 0],
    [-0.2, y, 0],
  ]);
  for (const x of [-0.695, -0.505])
    t.flanges(group, 100, [x, y, 0], 'x', FINISH.castIron);
  t.box(group, iron, 0.17, 0.26, 0.15, -0.6, y + 0.05, 0);
  t.rod(group, iron, [-0.6, y + 0.18, 0], [-0.6, y + 0.42, 0], 0.04);
  t.rod(
    group,
    t.paint(FINISH.steel, 0.3, 0.8),
    [-0.6, y + 0.42, 0],
    [-0.6, y + 0.5, 0],
    0.012,
  );
  t.cyl(group, red, 0.1, 0.018, -0.6, y + 0.5, 0, 'y', 28);
  stand(-0.9);
  stand(-0.3);
  plate(
    t,
    group,
    'Gate valve\nhandwheel, DN100 PN16',
    -0.6,
    y - 0.3,
    0.15,
    0.3,
  );
  // Dual-plate check valve, 54 mm face to face, flow arrow.
  t.pipe(group, 100, [
    [0.1, y, 0],
    [0.9, y, 0],
  ]);
  for (const x of [0.473, 0.527]) t.flanges(group, 100, [x, y, 0], 'x');
  t.cyl(
    group,
    t.paint('#2c4f8c', 0.45),
    s.flange * 0.42,
    0.054,
    0.5,
    y,
    0,
    'x',
    24,
  );
  plate(t, group, 'Check valve\ndual-plate, DN100 →', 0.5, y - 0.3, 0.15, 0.3);
  stand(0.2);
  stand(0.8);
  // Ball valve, DN25, threaded, on a small line.
  const small = t.paint(FINISH.brass, 0.35, 0.7);
  t.rod(group, t.paint(FINISH.pvc, 0.45), [1.2, y, 0], [2.0, y, 0], 0.016);
  t.cyl(group, small, 0.03, 0.08, 1.6, y, 0, 'x', 16);
  t.box(group, red, 0.012, 0.012, 0.14, 1.6, y + 0.045, 0.06);
  plate(t, group, 'Ball valve\nlever, DN25', 1.6, y - 0.3, 0.15, 0.3);
  stand(1.3);
  stand(1.9);
  return group;
}
