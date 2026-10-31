import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart, potentiometer, selector } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { partAudio, recording } from '../../core/audio/part-audio';
import { plantTools } from './plant-tools';
import { describe } from './describe';
import { createChemicalBallValve } from './chemical-ball-valve';
import { CELL, cellFlow, flowOk } from '../logic/sample-cell';
import type { PhProbePlace, SampleCellState } from '../logic/sample-cell';

type Point = readonly [number, number, number];

/** A tap opening: a light plastic click. */
const TAP = recording(
  new URL('../../core/audio/assets/switch-click.wav', import.meta.url),
  0.05,
);

export const SAMPLE_PANEL = { w: 0.6, h: 0.62 } as const;

const PLACES: readonly PhProbePlace[] = ['cell', 7, 4];

/**
 * A dosing controller's sample cell on its panel (prompt 105; the owner,
 * 2026-10-28), after ProMinent's DGMa in-line probe housing on a white
 * polypropylene board: the sample line IN at the foot through its
 * isolating ball valve (DN15, `chemical-ball-valve.ts`), up its flow
 * regulator (a needle valve, its knob below) and rotameter, the float
 * riding at the flow (0 to 60 l/h; the flow switch's reed contact clamped
 * at 20 l/h); across a clear manifold past its probe holders, each probe
 * standing in its holder with its cable away to the controller (free
 * chlorine, total chlorine on the Olympic's, pH, redox, temperature; a
 * holder not used blanked); a manual sample tap at its end for the DPD
 * test (a click draws a sample); and OUT, down to the balance tank. Two
 * pH buffers stand on a shelf; the pH electrode lifts into either for its
 * calibration (the selector). Facing +z, its back at z = 0.
 */
export function createSamplePanel(
  kit: PanelKit,
  {
    tag,
    state,
    change,
    sampled,
    holders,
  }: {
    tag: string;
    state: () => SampleCellState;
    change: (f: (c: SampleCellState) => SampleCellState) => void;
    /** A sample drawn at the tap. */
    sampled: () => void;
    /** Each holder's probe, left to right, or null for a blanked holder. */
    holders: readonly ({ name: string; colour: string; ph?: boolean } | null)[];
  },
) {
  const t = plantTools(kit);
  const object = new Group();
  object.name = `${tag} sample cell panel`;
  const P = SAMPLE_PANEL;
  const parts: Part[] = [];
  t.box(object, t.paint('#f1f1ec', 0.7), P.w, P.h, 0.012, 0, 0, 0.006);
  const z = 0.04;
  const clear = t.paint('#cfe6ee', 0.15);
  const pvc = t.paint('#5f6466', 0.5);
  const tube = t.paint('#2f6fb3', 0.45);
  const label = (text: string, x: number, y: number, h = 0.009) =>
    t.label(object, text, x, y, 0.0125, h, '#1b1b1b');
  const clip = (x: number, y: number) =>
    t.box(object, t.paint('#d0d0c8', 0.6), 0.02, 0.012, z, x, y, z / 2 + 0.006);
  // The sample line in, and its isolating valve.
  const inAt: Point = [-0.27, -0.31, z];
  t.rod(object, tube, inAt, [-0.27, -0.25, z], 0.006);
  t.rod(object, tube, [-0.27, -0.25, z], [-0.25, -0.25, z], 0.006);
  const valve = createChemicalBallValve(kit, {
    name: `${tag} sample isolating valve`,
    binding: {
      open: () => state().valveOpen,
      set: (open) => change((c) => ({ ...c, valveOpen: open })),
    },
  });
  valve.object.position.set(-0.2, -0.25, z);
  object.add(valve.object);
  parts.push(valve);
  label('SAMPLE\nISOLATING VALVE', -0.2, -0.2);
  // The regulator and rotameter.
  const rx = -0.13;
  t.rod(object, tube, [-0.15, -0.25, z], [rx, -0.25, z], 0.006);
  t.cyl(object, pvc, 0.012, 0.05, rx, -0.21, z, 'y', 16);
  const regulator = potentiometer(kit, {
    steps: 10,
    name: `${tag} sample flow regulator`,
    bound: {
      get value() {
        return Math.round(state().regulator * 10);
      },
      set: (n: number) => change((c) => ({ ...c, regulator: n / 10 })),
    },
  });
  regulator.object.position.set(rx + 0.045, -0.21, z - 0.03);
  object.add(regulator.object);
  parts.push(regulator);
  label('FLOW\nREGULATOR', rx + 0.045, -0.255);
  const tubeLo = -0.17;
  const tubeHi = 0.07;
  t.cyl(
    object,
    clear,
    0.011,
    tubeHi - tubeLo,
    rx,
    (tubeLo + tubeHi) / 2,
    z,
    'y',
    16,
  );
  for (let k = 0; k <= 6; k++) {
    const y = tubeLo + 0.01 + ((tubeHi - tubeLo - 0.02) * k) / 6;
    t.box(
      object,
      t.paint('#1b1b1b', 0.5),
      0.008,
      0.0012,
      0.001,
      rx - 0.016,
      y,
      z + 0.006,
    );
    if (k % 2 === 0) label(String(k * 10), rx - 0.032, y, 0.006);
  }
  label('l/h', rx - 0.032, tubeHi + 0.006, 0.006);
  const float = new Group();
  float.userData.live = true;
  t.cyl(float, t.paint('#c8261c', 0.4), 0.0125, 0.012, 0, 0, 0, 'y', 12);
  float.position.set(rx, tubeLo + 0.01, z);
  object.add(float);
  describe(
    float,
    `${tag}: rotameter float`,
    () => `${Math.round(cellFlow(state()))} l/h`,
  );
  // The flow switch: a reed contact clamped at its switch point.
  const swY = tubeLo + 0.01 + ((tubeHi - tubeLo - 0.02) * CELL.switchAt) / 60;
  const reed = t.box(
    object,
    t.paint('#202224', 0.6),
    0.014,
    0.02,
    0.016,
    rx + 0.02,
    swY,
    z,
  );
  describe(
    reed,
    `${tag}: sample flow switch (reed contact at ${CELL.switchAt} l/h)`,
  );
  label('FLOW\nSWITCH', rx + 0.05, swY);
  // Up and over to the manifold.
  const my = 0.12;
  t.rod(object, clear, [rx, tubeHi, z], [rx, my, z], 0.007);
  const mx0 = rx;
  const mx1 = 0.2;
  t.rod(object, clear, [mx0, my, z], [mx1, my, z], 0.012);
  clip(mx0 + 0.03, my);
  clip(mx1 - 0.02, my);
  // The holders and their probes.
  const n = holders.length;
  const probeAt: Point[] = [];
  const probes: Group[] = [];
  const phHome = new Group();
  let phProbe: Group | null = null;
  holders.forEach((h, i) => {
    const x = -0.07 + (i * 0.24) / Math.max(1, n - 1);
    t.cyl(object, clear, 0.016, 0.05, x, my + 0.035, z, 'y', 16);
    t.cyl(object, pvc, 0.018, 0.012, x, my + 0.066, z, 'y', 16);
    if (!h) {
      t.cyl(
        object,
        t.paint('#1b1b1b', 0.6),
        0.012,
        0.012,
        x,
        my + 0.078,
        z,
        'y',
        12,
      );
      label('BLANKED\n(spare)', x, my + 0.11, 0.007);
      return;
    }
    const probe = new Group();
    t.cyl(probe, t.paint(h.colour, 0.4), 0.006, 0.12, 0, 0.0, 0, 'y', 12);
    t.cyl(probe, t.paint('#1b1b1b', 0.5), 0.009, 0.02, 0, 0.065, 0, 'y', 12);
    probe.position.set(x, my + 0.06, z);
    if (h.ph) {
      probe.userData.live = true;
      phProbe = probe;
      phHome.position.copy(probe.position);
    }
    object.add(probe);
    describe(probe, `${tag}: ${h.name}`);
    probes.push(probe);
    probeAt.push([x, my + 0.14, z]);
    label(h.name.toUpperCase(), x, my + 0.17, 0.0065);
  });
  // The sample tap, and out.
  const tap = beginPart(kit, `${tag} manual sample tap`);
  const lever = t.box(
    tap.object,
    t.paint('#2f6fb3', 0.45),
    0.03,
    0.006,
    0.008,
    0.012,
    0,
    0.012,
  );
  t.cyl(tap.object, pvc, 0.008, 0.03, 0, -0.012, 0, 'y', 12);
  tap.object.position.set(mx1, my - 0.02, z);
  object.add(tap.object);
  let dip = 0;
  tap.uses.set(lever, () => {
    dip = 0.6;
    partAudio.play(TAP, tap.object);
    sampled();
  });
  tap.updates.push((delta) => {
    dip = Math.max(0, dip - delta);
    lever.rotation.z = dip > 0 ? -0.6 : 0;
  });
  tap.shows(() => 'a sample tap: click to draw a sample for the DPD test');
  const tapPart = tap.part();
  parts.push(tapPart);
  label('SAMPLE TAP\n(DPD test)', mx1 + 0.005, my - 0.06, 0.0075);
  const outAt: Point = [0.27, -0.31, z];
  t.rod(object, tube, [mx1, my, z], [0.27, my, z], 0.006);
  t.rod(object, tube, [0.27, my, z], outAt, 0.006);
  label('IN', -0.285, -0.3, 0.01);
  label('OUT', 0.27 - 0.025, -0.295, 0.01);
  // The buffers' shelf.
  const shelfY = -0.15;
  t.box(
    object,
    t.paint('#d0d0c8', 0.6),
    0.16,
    0.008,
    0.08,
    0.13,
    shelfY,
    0.046,
  );
  const beakers = [7, 4].map((b, i) => {
    const x = 0.09 + i * 0.07;
    t.cyl(object, clear, 0.022, 0.05, x, shelfY + 0.03, 0.05, 'y', 16);
    t.cyl(
      object,
      t.paint(b === 7 ? '#3d8bd9' : '#d93d3d', 0.3),
      0.02,
      0.03,
      x,
      shelfY + 0.02,
      0.05,
      'y',
      16,
    );
    label(`pH ${b}.00 BUFFER`, x, shelfY - 0.02, 0.006);
    return [x, shelfY + 0.08, 0.05] as const;
  });
  const place = selector(kit, {
    positions: 3,
    legend: 'CELL · pH 7 · pH 4',
    name: `${tag} pH electrode`,
    bound: {
      get value() {
        return PLACES.indexOf(state().phProbe);
      },
      set: (i: number) => change((c) => ({ ...c, phProbe: PLACES[i] })),
    },
  });
  place.object.position.set(0.01, -0.21, 0.012);
  object.add(place.object);
  parts.push(place);
  label('pH ELECTRODE IN', 0.01, -0.26, 0.007);
  const update = (delta: number) => {
    const c = state();
    const f = Math.min(1, cellFlow(c) / CELL.maxFlow);
    float.position.y = tubeLo + 0.01 + (tubeHi - tubeLo - 0.02) * f;
    const p = phProbe as Group | null;
    if (p) {
      if (c.phProbe === 'cell') p.position.copy(phHome.position);
      else {
        const [bx, by, bz] = beakers[c.phProbe === 7 ? 0 : 1];
        p.position.set(bx, by, bz);
      }
    }
    for (const part of parts) part.update(delta);
  };
  describe(object, `${tag}: sample cell`, () => {
    const c = state();
    return `${Math.round(cellFlow(c))} l/h${flowOk(c) ? '' : ', below its flow switch'}`;
  });
  return {
    object,
    parts,
    update,
    inAt,
    outAt,
    probeAt,
    /** Its working pieces, for a hall to bind each to its own model. */
    pieces: {
      valve: valve.object,
      regulator: regulator.object,
      flowSwitch: reed,
      rotameter: float,
      probes,
      tap: tap.object,
    },
  };
}
