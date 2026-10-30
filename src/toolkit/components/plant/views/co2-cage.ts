import {
  CanvasTexture,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createSafetySign } from '../../general-safety/views/safety-signs';
import type { DialGaugeView } from '../../industrial-control/views/dial-gauge';
import { BS1710_BASIC, plantTools } from './plant-tools';
import { CO2_MANIFOLD } from '../logic/co2-supply';
import type { Co2Bank, Co2Flag } from '../logic/co2-supply';

/**
 * The CO₂ supply's cage (mission 109, stage 1), drawing only: a galvanised
 * mesh cylinder cage with a mesh roof and a padlocked gate, after the
 * cylinder compounds of BCGA CP 44; in it, chained upright against its
 * back, two banks of four tall CO₂ cylinders (50 l, 34 kg; black with the
 * grey shoulder of BS EN 1089-3, their supplier's collar labels), each on
 * a pigtail to its bank's header; between the banks the two-bank automatic
 * changeover manifold and its regulator (after BOC's and Gas Arc's
 * lever-type manifolds): each bank's contents gauge and flag, the lever
 * that names the service bank, the outlet gauge; in front, the full spares
 * and the empties waiting for collection. The regulated line climbs out of
 * the cage's back and runs along the wall to the wall inlet port, its
 * emergency isolation valve just before the wall.
 *
 * In metres: the cage's floor at y = 0, its middle at x = 0, its back (the
 * building's wall side) at z = −`CO2_CAGE.d`/2 and its front facing +z;
 * the wall's face at z = −`CO2_CAGE.d`/2 − `CO2_CAGE.gap`.
 */

export const CO2_CAGE = {
  w: 3.4,
  d: 1.2,
  h: 2.2,
  /** From the cage's back to the wall's face. */
  gap: 0.08,
  /** The wall inlet port beyond the cage's right-hand end, x and height. */
  inletX: 2.05,
  inletY: 1.45,
} as const;

/** The 50 l cylinder: its body's radius and its height to the valve's top. */
export const CO2_BOTTLE = { r: 0.115, h: 1.58 } as const;

/** Where each bank's cylinders stand along the back, x. */
export const bankCylinderX = (bank: Co2Bank, i: number) =>
  (bank === 'left' ? -1 : 1) * (1.45 - i * 0.3);

/**
 * A CO₂ cylinder, 50 litres, 34 kg: a black body, its shoulder grey (BS EN
 * 1089-3's colour for carbon dioxide), its valve with a side outlet, its
 * supplier's collar label and a product label. Origin on the floor at its
 * middle; the labels face +z.
 */
export function createCo2Cylinder(kit: PanelKit, seed = 0) {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'CO₂ cylinder, 50 l, 34 kg';
  const R = CO2_BOTTLE.r;
  const black = t.paint('#18191a', 0.55, 0.2);
  const grey = t.paint('#8e9396', 0.5, 0.2);
  // The body, turned: a domed foot, straight sides to the shoulder.
  const body = new Mesh(
    new LatheGeometry(
      [
        [0, 0.0],
        [R * 0.8, 0.0],
        [R, 0.05],
        [R, 1.2],
        [0, 1.2],
      ].map(([r, y]) => new Vector2(r, y)),
      24,
    ),
    black,
  );
  g.add(body);
  const shoulder = new Mesh(
    new LatheGeometry(
      [
        [R, 1.2],
        [R * 0.97, 1.3],
        [R * 0.8, 1.38],
        [R * 0.45, 1.44],
        [0.03, 1.46],
        [0, 1.46],
      ].map(([r, y]) => new Vector2(r, y)),
      24,
    ),
    grey,
  );
  g.add(shoulder);
  // The valve: a brass body on the neck, its handwheel, its side outlet.
  const brass = t.paint('#b08d45', 0.35, 0.8);
  t.cyl(g, brass, 0.028, 0.09, 0, 1.5, 0, 'y', 12);
  t.cyl(g, brass, 0.013, 0.05, 0.035, 1.5, 0, 'x', 10);
  t.cyl(g, t.paint('#2a2a2a', 0.6), 0.032, 0.012, 0, CO2_BOTTLE.h - 0.01, 0);
  // The supplier's collar label and the product label, on the front.
  const collar = createMicroLabel(kit, 'CARBON DIOXIDE', {
    height: 0.022,
    ink: '#14181b',
    plate: '#f2f2ee',
  });
  collar.position.set(0, 1.08, R + 0.002);
  g.add(collar);
  const badge = createBrandBadge(kit, 'arncliffe', {
    height: 0.035,
    plate: '#f2f2ee',
  });
  badge.position.set(0, 1.02, R + 0.002);
  g.add(badge);
  const un = createMicroLabel(kit, 'UN 1013 · 2.2\nCO₂ 34 kg', {
    height: 0.016,
    ink: '#14181b',
    plate: '#f4d21f',
  });
  un.position.set(0, 0.96, R + 0.002);
  g.add(un);
  // A worn patch, as rented cylinders have.
  t.box(
    g,
    t.paint('#55585b', 0.8, 0.4),
    0.04,
    0.03,
    0.002,
    -0.04 + (seed % 3) * 0.03,
    0.3 + (seed % 4) * 0.12,
    R,
  );
  return g;
}

/** A cardboard cylinder tag on a string: FULL, IN USE or EMPTY. */
function cylinderTag(kit: PanelKit, text: string, colour: string) {
  const tag = createMicroLabel(kit, text, {
    height: 0.03,
    ink: '#111111',
    plate: colour,
  });
  return tag;
}

/** A panel's flag window: green IN USE, grey STANDBY, red EMPTY. */
const FLAG_COLOURS: Record<
  Co2Flag,
  { ground: string; ink: string; text: string }
> = {
  'in-use': { ground: '#2f8f3a', ink: '#f2f2ee', text: 'IN USE' },
  standby: { ground: '#d8d8d0', ink: '#1b1b1b', text: 'STANDBY' },
  empty: { ground: '#c42b23', ink: '#f2f2ee', text: 'EMPTY' },
};

export interface Co2CageView {
  group: Group;
  /** Each bank's contents gauge, bar. */
  bankGauges: Record<Co2Bank, DialGaugeView>;
  /** The regulator's outlet gauge, and the line's beyond the isolation valve, bar. */
  outletGauge: DialGaugeView;
  lineGauge: DialGaugeView;
  /** Show each bank's flag (redrawn only when it changes). */
  setFlag(bank: Co2Bank, flag: Co2Flag): void;
  /** The lever, turned to the service bank. */
  lever: Group;
  setLever(service: Co2Bank): void;
  /** The emergency isolation valve's lever, along the pipe when open. */
  isolation: Group;
  setIsolation(open: boolean): void;
  /** What a click works: the lever's and the isolation valve's handles. */
  leverHandle: Object3D;
  isolationHandle: Object3D;
}

export function createCo2Cage(kit: PanelKit): Co2CageView {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'CO₂ cylinder cage';
  const { w: W, d: D, h: H } = CO2_CAGE;
  const back = -D / 2;
  const galv = t.paint('#a9aeae', 0.45, 0.6);

  // ---- The cage: its frame, its mesh, its roof, its gate ----------------
  for (const [x, zs] of [
    [-W / 2, [-D / 2, D / 2]],
    [0, [-D / 2]],
    [W / 2, [-D / 2, D / 2]],
  ] as const)
    for (const z of zs) t.box(g, galv, 0.05, H, 0.05, x, H / 2, z);
  for (const y of [0.05, H]) {
    for (const z of [-D / 2, D / 2]) t.box(g, galv, W, 0.05, 0.05, 0, y, z);
    for (const x of [-W / 2, W / 2]) t.box(g, galv, 0.05, 0.05, D, x, y, 0);
  }
  // Its mesh: a 50 mm weld mesh, drawn on a canvas, see-through.
  const art = document.createElement('canvas');
  art.width = art.height = 64;
  const c = art.getContext('2d')!;
  c.clearRect(0, 0, 64, 64);
  c.strokeStyle = '#b4b9b9';
  c.lineWidth = 4;
  c.strokeRect(2, 2, 60, 60);
  const mesh = new CanvasTexture(art);
  mesh.wrapS = mesh.wrapT = RepeatWrapping;
  kit.textures.push(mesh);
  const meshMaterial = (u: number, v: number) => {
    const map = mesh.clone();
    map.repeat.set(u / 0.05, v / 0.05);
    map.needsUpdate = true;
    kit.textures.push(map);
    const m = new MeshStandardMaterial({
      map,
      alphaTest: 0.5,
      transparent: false,
      side: DoubleSide,
      metalness: 0.5,
      roughness: 0.5,
    });
    kit.materials.push(m);
    return m;
  };
  const panel = (
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch = 0,
  ) => {
    const p = new Mesh(new PlaneGeometry(w, h), meshMaterial(w, h));
    p.position.set(x, y, z);
    p.rotation.set(pitch, yaw, 0);
    g.add(p);
    return p;
  };
  const gateW = 1.0;
  // The front, but for the gate at its right-hand end.
  panel(W - gateW, H - 0.1, -gateW / 2, H / 2 + 0.05, D / 2, 0);
  for (const s of [-1, 1])
    panel(D, H - 0.1, (s * W) / 2, H / 2 + 0.05, 0, Math.PI / 2);
  panel(W, D, 0, H, 0, 0, -Math.PI / 2);
  // The gate, shut, its padlock and hasp.
  const gate = new Group();
  gate.position.set(W / 2 - gateW, 0, D / 2 + 0.03);
  g.add(gate);
  t.box(gate, galv, 0.04, H - 0.15, 0.04, 0.02, H / 2, 0);
  t.box(gate, galv, 0.04, H - 0.15, 0.04, gateW - 0.04, H / 2, 0);
  for (const y of [0.12, H / 2, H - 0.1])
    t.box(gate, galv, gateW, 0.04, 0.04, gateW / 2, y, 0);
  const gm = new Mesh(
    new PlaneGeometry(gateW, H - 0.2),
    meshMaterial(gateW, H - 0.2),
  );
  gm.position.set(gateW / 2, H / 2, 0);
  gate.add(gm);
  t.box(
    gate,
    t.paint('#c9a227', 0.35, 0.8),
    0.045,
    0.055,
    0.02,
    0.06,
    1.1,
    0.03,
  );
  t.box(
    gate,
    t.paint('#3a3a3a', 0.5, 0.6),
    0.06,
    0.02,
    0.02,
    0.03,
    1.15,
    0.025,
  );
  // The gate's signs: compressed gas, asphyxiant, keep locked.
  const notice = createMicroLabel(
    kit,
    'CARBON DIOXIDE · COMPRESSED GAS\nRISK OF ASPHYXIATION\nAUTHORISED PERSONS ONLY · KEEP LOCKED\nARNCLIFFE GASES 24 h: 0800 111 333',
    { height: 0.03, ink: '#111111', plate: '#f2f2ee' },
  );
  notice.position.set(gateW / 2, 1.55, 0.03);
  gate.add(notice);
  const noSmoking = createSafetySign(kit, ['no-smoking'], ['No smoking']);
  noSmoking.position.set(-0.35, 1.95, D / 2 + 0.03);
  g.add(noSmoking);
  // A level concrete base, a little proud of the tarmac.
  t.box(g, t.paint('#9d9a92', 0.95), W + 0.3, 0.08, D + 0.2, 0, -0.03, 0);

  // ---- The connected cylinders, chained, on their pigtails ----------------
  const rowZ = back + 0.2;
  const header = 1.86;
  const steel = BS1710_BASIC.gases;
  const copper = t.paint('#b06a3a', 0.35, 0.7);
  const hose = t.paint('#1e1e1e', 0.7);
  let seed = 0;
  for (const bank of ['left', 'right'] as const) {
    const xs = Array.from({ length: CO2_MANIFOLD.perBank }, (_, i) =>
      bankCylinderX(bank, i),
    );
    for (const x of xs) {
      const cyl = createCo2Cylinder(kit, seed++);
      cyl.position.set(x, 0.05, rowZ);
      g.add(cyl);
      // Its pigtail: a short armoured hose from its outlet up to the header.
      t.rod(
        g,
        hose,
        [x + 0.06, 1.55, rowZ],
        [x + 0.06, header, rowZ - 0.05],
        0.008,
        6,
      );
      const tag = cylinderTag(kit, 'IN USE', '#e5c43a');
      tag.position.set(x, 1.3, rowZ + CO2_BOTTLE.r + 0.004);
      g.add(tag);
    }
    // The bank's chain rail on the back posts, its chain across the cylinders.
    const inner = Math.min(...xs.map(Math.abs)) - 0.15;
    const outer = Math.max(...xs.map(Math.abs)) + 0.15;
    const sx = bank === 'left' ? -1 : 1;
    for (const y of [0.55, 1.15]) {
      t.box(
        g,
        galv,
        outer - inner,
        0.04,
        0.03,
        (sx * (inner + outer)) / 2,
        y,
        back + 0.03,
      );
      t.box(
        g,
        t.paint('#4a4a4a', 0.5, 0.7),
        outer - inner,
        0.012,
        0.012,
        (sx * (inner + outer)) / 2,
        y,
        rowZ + CO2_BOTTLE.r + 0.012,
      );
    }
    // The bank's header: copper, along the cylinders' heads to the manifold.
    t.rod(
      g,
      copper,
      [sx * outer, header, rowZ - 0.05],
      [sx * 0.33, header, rowZ - 0.05],
      0.011,
      8,
    );
  }

  // ---- The changeover manifold and its regulator -------------------------
  const board = new Group();
  board.position.set(0, 0, back + 0.06);
  g.add(board);
  t.box(board, t.paint('#1f5f8b', 0.5, 0.2), 0.62, 0.95, 0.02, 0, 1.55, 0);
  for (const s of [-1, 1])
    t.box(board, galv, 0.05, 2.0, 0.05, s * 0.33, 1.0, -0.02);
  const badge = createBrandBadge(kit, 'arncliffe', { height: 0.03 });
  badge.position.set(0.17, 1.99, 0.012);
  board.add(badge);
  const title = createMicroLabel(kit, 'CO₂ AUTOMATIC CHANGEOVER', {
    height: 0.022,
    ink: '#f2f2ee',
  });
  title.position.set(-0.06, 1.99, 0.012);
  board.add(title);
  const bankGauges = {} as Record<Co2Bank, DialGaugeView>;
  const flags = {} as Record<
    Co2Bank,
    { draw: (f: Co2Flag) => void; shown: Co2Flag | null }
  >;
  for (const bank of ['left', 'right'] as const) {
    const sx = bank === 'left' ? -1 : 1;
    // The bank's inlet: its header into a check valve and its gauge.
    t.cyl(
      board,
      t.paint('#b08d45', 0.35, 0.8),
      0.022,
      0.08,
      sx * 0.2,
      1.86,
      0.04,
      'x',
      10,
    );
    bankGauges[bank] = t.pressureGauge(board, [sx * 0.17, 1.74, 0.06], {
      dia: 0.1,
      max: 100,
      legend: bank === 'left' ? 'LEFT BANK' : 'RIGHT BANK',
      red: { from: 0, to: CO2_MANIFOLD.changeover },
    });
    // Its flag window.
    const face = t.printed(0.13, 0.05, () => {}, 128);
    face.mesh.position.set(sx * 0.17, 1.6, 0.013);
    board.add(face.mesh);
    const draw = (f: Co2Flag) => {
      const ctx = face.context;
      const { width, height } = ctx.canvas;
      const k = FLAG_COLOURS[f];
      ctx.fillStyle = k.ground;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = k.ink;
      ctx.font = `700 ${height * 0.62}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(k.text, width / 2, height / 2 + 1, width * 0.92);
      face.texture.needsUpdate = true;
    };
    flags[bank] = { draw, shown: null };
  }
  // The changeover body and its lever, between the banks.
  const brass = t.paint('#b08d45', 0.35, 0.8);
  t.cyl(board, brass, 0.05, 0.05, 0, 1.6, 0.03, 'z', 20);
  const lever = new Group();
  lever.position.set(0, 1.6, 0.06);
  board.add(lever);
  const handle = t.box(
    lever,
    t.paint('#c42b23', 0.5),
    0.025,
    0.16,
    0.02,
    0,
    0.08,
    0,
  );
  handle.name = 'Changeover lever';
  t.cyl(lever, t.paint('#c42b23', 0.5), 0.022, 0.03, 0, 0, 0, 'z', 16);
  const leverLegend = createMicroLabel(kit, '◀ SERVICE BANK ▶', {
    height: 0.016,
    ink: '#f2f2ee',
  });
  leverLegend.position.set(0, 1.5, 0.012);
  board.add(leverLegend);
  // The regulator below: its body, bonnet and knob, its outlet gauge.
  t.cyl(board, brass, 0.045, 0.09, 0, 1.33, 0.05, 'y', 20);
  t.cyl(board, t.paint('#1b1b1b', 0.6), 0.03, 0.05, 0, 1.25, 0.05, 'y', 16);
  const outletGauge = t.pressureGauge(board, [0.15, 1.36, 0.06], {
    dia: 0.063,
    max: 10,
    legend: 'OUTLET',
  });
  const regLabel = createMicroLabel(
    kit,
    `REGULATOR · SET ${CO2_MANIFOLD.outlet} bar`,
    {
      height: 0.016,
      ink: '#f2f2ee',
    },
  );
  regLabel.position.set(0, 1.15, 0.012);
  board.add(regLabel);
  // The outlet: down from the regulator, out through the cage's back.
  t.rod(board, copper, [0, 1.28, 0.05], [0, 1.1, 0.05], 0.009, 8);
  t.rod(board, copper, [0, 1.1, 0.05], [0, 1.1, -0.1], 0.009, 8);

  // ---- The low-pressure line to the wall inlet port ----------------------
  const wallZ = back - CO2_CAGE.gap;
  const runZ = wallZ + 0.05;
  const lineY = H + 0.25;
  // 15 mm steel tube, painted gas yellow ochre (BS 1710), its bends swept.
  const tube = t.paint(steel, 0.5, 0.3);
  const pipe = (pts: [number, number, number][]) => {
    for (let i = 0; i < pts.length - 1; i++)
      t.rod(g, tube, pts[i], pts[i + 1], 0.011, 8);
    for (let i = 1; i < pts.length - 1; i++)
      t.cyl(g, tube, 0.013, 0.026, ...pts[i], 'y', 8);
  };
  pipe([
    [0, 1.1, back - 0.04],
    [0, 1.1, runZ],
    [0, lineY, runZ],
    [CO2_CAGE.inletX, lineY, runZ],
    [CO2_CAGE.inletX, CO2_CAGE.inletY, runZ],
  ]);
  // Its identification: gas yellow ochre, "CO₂", every run.
  const ident = createMicroLabel(kit, 'CO₂ · 4 bar ▶', {
    height: 0.03,
    ink: '#111111',
    plate: '#c99a2e',
  });
  ident.position.set(1.0, lineY - 0.05, runZ + 0.025);
  g.add(ident);
  // The emergency isolation valve: a lever ball valve, its handle red.
  const isolation = new Group();
  isolation.position.set(CO2_CAGE.inletX, CO2_CAGE.inletY + 0.35, runZ);
  g.add(isolation);
  t.cyl(isolation, brass, 0.03, 0.08, 0, 0, 0, 'y', 16);
  const isoLever = new Group();
  isoLever.position.set(0, 0, 0.04);
  isolation.add(isoLever);
  const isoHandle = t.box(
    isoLever,
    t.paint('#c42b23', 0.5),
    0.02,
    0.15,
    0.015,
    0,
    0.065,
    0.01,
  );
  isoHandle.name = 'CO₂ emergency isolation valve';
  const isoSign = createMicroLabel(kit, 'CO₂ EMERGENCY\nISOLATION VALVE', {
    height: 0.035,
    ink: '#f2f2ee',
    plate: '#c42b23',
  });
  isoSign.position.set(
    CO2_CAGE.inletX + 0.32,
    CO2_CAGE.inletY + 0.4,
    wallZ + 0.005,
  );
  g.add(isoSign);
  // The line's own gauge past the valve, and the wall inlet port's sleeve.
  const lineGauge = t.pressureGauge(
    g,
    [CO2_CAGE.inletX, CO2_CAGE.inletY + 0.12, runZ + 0.03],
    {
      dia: 0.063,
      max: 10,
      legend: 'CO₂ LINE',
    },
  );
  t.cyl(
    g,
    t.paint('#6f7274', 0.6, 0.4),
    0.04,
    0.06,
    CO2_CAGE.inletX,
    CO2_CAGE.inletY,
    wallZ + 0.02,
    'z',
    16,
  );
  pipe([
    [CO2_CAGE.inletX, CO2_CAGE.inletY, runZ],
    [CO2_CAGE.inletX, CO2_CAGE.inletY, wallZ - 0.1],
  ]);
  const port = createMicroLabel(kit, 'CO₂ INLET', {
    height: 0.03,
    ink: '#111111',
    plate: '#c99a2e',
  });
  port.position.set(CO2_CAGE.inletX, CO2_CAGE.inletY - 0.1, wallZ + 0.005);
  g.add(port);

  // ---- In front: the full spares and the empties -------------------------
  for (let i = 0; i < 4; i++) {
    const x = -1.45 + i * 0.3;
    const cyl = createCo2Cylinder(kit, seed++);
    cyl.position.set(x, 0.05, 0.25);
    g.add(cyl);
    const tag = cylinderTag(kit, 'FULL', '#3f9b3a');
    tag.position.set(x, 1.3, 0.25 + CO2_BOTTLE.r + 0.004);
    g.add(tag);
  }
  for (let i = 0; i < 2; i++) {
    const x = 0.8 + i * 0.3;
    const cyl = createCo2Cylinder(kit, seed++);
    cyl.position.set(x, 0.05, 0.25);
    cyl.rotation.y = 0.4 * (i + 1);
    g.add(cyl);
    const tag = cylinderTag(kit, 'EMPTY', '#c42b23');
    tag.position.set(x, 1.3, 0.25 + CO2_BOTTLE.r + 0.004);
    g.add(tag);
  }
  // The front row's chain rail across the cage's front posts.
  t.box(
    g,
    t.paint('#4a4a4a', 0.5, 0.7),
    2.0,
    0.012,
    0.012,
    -0.65,
    1.0,
    0.25 + CO2_BOTTLE.r + 0.012,
  );
  const rows = createMicroLabel(kit, 'FULL', {
    height: 0.05,
    ink: '#111111',
    plate: '#3f9b3a',
  });
  rows.position.set(-1.0, 2.0, D / 2 + 0.03);
  g.add(rows);
  const rowsE = createMicroLabel(kit, 'EMPTY', {
    height: 0.05,
    ink: '#f2f2ee',
    plate: '#c42b23',
  });
  rowsE.position.set(1.1, 2.0, D / 2 + 0.03);
  g.add(rowsE);

  return {
    group: g,
    bankGauges,
    outletGauge,
    lineGauge,
    setFlag(bank, flag) {
      const f = flags[bank];
      if (f.shown === flag) return;
      f.shown = flag;
      f.draw(flag);
    },
    lever,
    setLever(service) {
      lever.rotation.z = service === 'left' ? Math.PI / 4 : -Math.PI / 4;
    },
    isolation: isoLever,
    setIsolation(open) {
      // Along the pipe (up) when open, across it when shut.
      isoLever.rotation.z = open ? 0 : -Math.PI / 2;
    },
    leverHandle: handle,
    isolationHandle: isoHandle,
  };
}
