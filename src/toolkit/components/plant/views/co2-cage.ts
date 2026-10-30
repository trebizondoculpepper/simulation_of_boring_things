import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createSafetySign } from '../../general-safety/views/safety-signs';
import type { DialGaugeView } from '../../industrial-control/views/dial-gauge';
import { BS1710_BASIC, plantTools } from './plant-tools';
import { markPipe } from './pipe-markers';
import { CO2_MANIFOLD } from '../logic/co2-supply';
import type { MeshCageSpec } from '../../architectural/logic/mesh-cage';
import type { Co2Bank, Co2Flag } from '../logic/co2-supply';
import { createGasCylinder } from './gas-cylinder';
import type { GasCylinderView } from './gas-cylinder';
import type { Contents } from '../logic/gas-cylinders';

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
  w: 5.7,
  d: 1.2,
  h: 2.2,
  /** The bays' partitions either side of the connected banks, x: full bay west, empty bay east. */
  bay: 1.7,
  /** From the cage's back to the wall's face. */
  gap: 0.08,
  /** The wall inlet port beyond the cage's right-hand end, x and height. */
  inletX: 3.3,
  inletY: 1.45,
} as const;

/** The cage: the shared welded-mesh cage, its door in the middle section right of the manifold, its full and empty bays closed off by partitions. */
export const CO2_CAGE_SPEC: MeshCageSpec = {
  w: CO2_CAGE.w,
  d: CO2_CAGE.d,
  h: CO2_CAGE.h,
  door: { side: 'front', at: 0.95, width: 1.0, hinge: 'left', opens: 'out' },
  partitions: [-CO2_CAGE.bay, CO2_CAGE.bay],
  roof: true,
  base: 'plates',
};

/** The 50 l cylinder: its body's radius and its height to the valve's top. */
export const CO2_BOTTLE = { r: 0.115, h: 1.55 } as const;

/** Where each bank's cylinders stand along the back, x. */
export const bankCylinderX = (bank: Co2Bank, i: number) =>
  (bank === 'left' ? -1 : 1) * (1.45 - i * 0.3);

/**
 * A CO₂ cylinder, 50 litres, 34 kg, from the shared cylinder builder
 * (`gas-cylinder.ts`): black, its shoulder grey (BS EN 1089-3), its
 * labels, valve, guard and tags. Origin on the floor at its middle; the
 * labels face +z.
 */
export const createCo2Cylinder = (kit: PanelKit, contents: Contents = 'full') =>
  createGasCylinder(kit, { gas: 'co2', size: 'L50', contents });

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
  /** The connected cylinders, each bank's in order along the manifold: their tags show their contents. */
  bankCylinders: Record<Co2Bank, GasCylinderView[]>;
}

export function createCo2Cage(kit: PanelKit): Co2CageView {
  const t = plantTools(kit);
  const g = new Group();
  g.name = 'CO₂ cylinder cage';
  const { w: W, d: D, h: H } = CO2_CAGE;
  const back = -D / 2;
  const galv = t.paint('#a9aeae', 0.45, 0.6);

  // The cage itself is the shared welded-mesh cage (`CO2_CAGE_SPEC`),
  // built with its working door by the part; here, its signs.
  const notice = createMicroLabel(
    kit,
    'CARBON DIOXIDE · COMPRESSED GAS\nRISK OF ASPHYXIATION\nAUTHORISED PERSONS ONLY · KEEP LOCKED\nARNCLIFFE GASES 24 h: 0800 111 333',
    { height: 0.03, ink: '#111111', plate: '#f2f2ee' },
  );
  notice.position.set(-0.75, 1.5, D / 2 + 0.035);
  g.add(notice);
  const noSmoking = createSafetySign(kit, ['no-smoking'], ['No smoking']);
  noSmoking.position.set(1.95, 1.6, D / 2 + 0.035);
  g.add(noSmoking);
  // A level concrete base, a little proud of the tarmac.
  t.box(g, t.paint('#9d9a92', 0.95), W + 0.3, 0.08, D + 0.2, 0, -0.03, 0);

  // ---- The connected cylinders, chained, on their pigtails ----------------
  const rowZ = back + 0.2;
  const header = 1.86;
  const copper = t.paint('#b06a3a', 0.35, 0.7);
  const hose = t.paint('#1e1e1e', 0.7);
  const bankCylinders: Record<Co2Bank, GasCylinderView[]> = {
    left: [],
    right: [],
  };
  for (const bank of ['left', 'right'] as const) {
    const xs = Array.from({ length: CO2_MANIFOLD.perBank }, (_, i) =>
      bankCylinderX(bank, i),
    );
    for (const x of xs) {
      const cyl = createCo2Cylinder(kit);
      cyl.group.position.set(x, 0.05, rowZ);
      g.add(cyl.group);
      bankCylinders[bank].push(cyl);
      // Its pigtail: a short armoured hose from its outlet up to the header.
      t.rod(
        g,
        hose,
        [x + 0.06, 1.55, rowZ],
        [x + 0.06, header, rowZ - 0.05],
        0.008,
        6,
      );
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
    // The bank's header: copper, along the cylinders' heads to the manifold,
    // at the cylinders' full pressure: its legend says so.
    t.rod(
      g,
      copper,
      [sx * outer, header, rowZ - 0.05],
      [sx * 0.33, header, rowZ - 0.05],
      0.011,
      8,
    );
    g.add(
      markPipe(
        kit,
        [
          [sx * outer, header, rowZ - 0.05],
          [sx * 0.33, header, rowZ - 0.05],
        ],
        {
          radius: 0.011,
          service: 'gas',
          text: 'CO₂ HIGH PRESSURE 60 bar',
          lettering: 'stencil',
          ink: '#111111',
        },
      ),
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
  // 15 mm galvanised steel tube, its bends swept; identified to BS 1710
  // by yellow ochre bands (gases other than air, BS 4800 08 C 35) and
  // legends, never red (fire fighting's) nor the cylinders' grey.
  const tube = t.paint('#a9aeae', 0.45, 0.6);
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
  // Its identification (BS 1710:2014): bands on every straight run of
  // over a metre, 0.4 m from each end and at most 4 m apart (`markPipe`),
  // its legend on the longest run with an arrow the way it flows; and
  // bands of their own at the manifold's outlet, either side of the
  // isolation valve and at the wall.
  const runs: [number, number, number][] = [
    [0, 1.1, back - 0.04],
    [0, 1.1, runZ],
    [0, lineY, runZ],
    [CO2_CAGE.inletX, lineY, runZ],
    [CO2_CAGE.inletX, CO2_CAGE.inletY, runZ],
  ];
  g.add(
    markPipe(kit, runs, {
      radius: 0.011,
      service: 'gas',
      text: 'CARBON DIOXIDE · CO₂ 4 bar',
    }),
  );
  const ochre = t.paint(BS1710_BASIC.gases, 0.6);
  const band = (at: [number, number, number], axis: 'x' | 'y' | 'z') =>
    t.cyl(g, ochre, 0.014, 0.15, ...at, axis, 16);
  band([0, 1.1, back - 0.12], 'z');
  band([CO2_CAGE.inletX, CO2_CAGE.inletY + 0.55, runZ], 'y');
  band([CO2_CAGE.inletX, CO2_CAGE.inletY + 0.21, runZ], 'y');
  // The emergency isolation valve: a lever ball valve, its handle red.
  const isolation = new Group();
  isolation.position.set(CO2_CAGE.inletX, CO2_CAGE.inletY + 0.35, runZ);
  g.add(isolation);
  t.cyl(isolation, brass, 0.03, 0.08, 0, 0, 0, 'y', 16);
  const isoLever = new Group();
  isoLever.position.set(0, 0, 0.04);
  isolation.add(isoLever);
  // Its handle yellow, as gas isolation valves' are (red is fire fighting's).
  const isoHandle = t.box(
    isoLever,
    t.paint('#e5c43a', 0.5),
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
    ink: '#111111',
    plate: '#f2f2ee',
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
  band([CO2_CAGE.inletX, CO2_CAGE.inletY, runZ - 0.0], 'z');
  const port = createMicroLabel(kit, 'CO₂ INLET', {
    height: 0.03,
    ink: '#111111',
    plate: '#c99a2e',
  });
  port.position.set(CO2_CAGE.inletX, CO2_CAGE.inletY - 0.1, wallZ + 0.005);
  g.add(port);

  // ---- The full bay (west) and the empty bay (east) ---------------------
  // Free-standing, chained upright, on no pigtail: a full cylinder joins a
  // bank only when it is exchanged for a spent one.
  const chain = t.paint('#4a4a4a', 0.5, 0.7);
  const bay = (
    side: -1 | 1,
    count: number,
    tagText: string,
    colour: string,
    ink: string,
    contents: Contents,
  ) => {
    const mid = (side * (CO2_CAGE.bay + W / 2)) / 2;
    const xs = [mid - 0.27, mid + 0.27];
    for (let i = 0; i < count; i++) {
      const x = xs[i % 2];
      const z = back + 0.2 + Math.floor(i / 2) * 0.42;
      const cyl = createCo2Cylinder(kit, contents);
      cyl.group.position.set(x, 0.05, z);
      if (side > 0) cyl.group.rotation.y = 0.5 * (i + 1);
      g.add(cyl.group);
      // Each row's chain across, between the bay's partition and its end.
      if (i % 2 === 0)
        t.box(
          g,
          chain,
          W / 2 - CO2_CAGE.bay - 0.1,
          0.012,
          0.012,
          mid,
          1.0,
          z + CO2_BOTTLE.r + 0.012,
        );
    }
    const sign = createMicroLabel(kit, tagText, {
      height: 0.06,
      ink,
      plate: colour,
    });
    sign.position.set(mid, 2.0, D / 2 + 0.03);
    g.add(sign);
  };
  bay(-1, 4, 'FULL', '#3f9b3a', '#111111', 'full');
  bay(1, 2, 'EMPTY', '#c42b23', '#f2f2ee', 'empty');
  const banks = createMicroLabel(kit, 'CONNECTED · LEFT BANK | RIGHT BANK', {
    height: 0.035,
    ink: '#f2f2ee',
    plate: '#1f5f8b',
  });
  banks.position.set(-0.75, 2.0, D / 2 + 0.03);
  g.add(banks);

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
    bankCylinders,
  };
}
