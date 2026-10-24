import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { deckRails } from '../logic/stair-run';
import type { StairFinish, Surface } from '../logic/stair-run';
import type { Footprint } from '../../controls/logic/walk-collision';

/** Each finish's colours: [colour, roughness, metalness]. */
const FINISHES: Record<
  StairFinish,
  Record<'frame' | 'grating' | 'rail' | 'nosing', [string, number, number]>
> = {
  // Painted mild steel: grey-blue framing, galvanised grating, safety
  // yellow rails and nosings.
  painted: {
    frame: ['#3c4a57', 0.55, 0.4],
    grating: ['#5f676b', 0.5, 0.6],
    rail: ['#e3b51f', 0.5, 0.2],
    nosing: ['#e3b51f', 0.5, 0.2],
  },
  // Grade 316 stainless: brushed framing and grating, polished rails,
  // black anti-slip nosings. Pale and only a little metallic, since the
  // rooms have no environment map for a true metal to reflect: one
  // would render near black.
  stainless: {
    frame: ['#d3d8db', 0.32, 0.3],
    grating: ['#c2c8cb', 0.38, 0.3],
    rail: ['#f1f3f4', 0.18, 0.35],
    nosing: ['#1d2124', 0.8, 0.1],
  },
};

/**
 * Decks and their stair (`logic/stair-run.ts`), in metres on a floor at
 * `floorY`: open grating on framing, on columns to the floor, with toe
 * boards and double handrails at every open edge but the decks' back (a
 * wall, or the machines they serve, on `side`); the flights of treads
 * between channel stringers, a handrail each side sloping with them. In
 * painted mild steel, or stainless.
 */
export interface StairLook {
  /** The wall its decks stand against (`StairRun.side`). */
  side?: 'west' | 'east';
  finish?: StairFinish;
}

export function createStairStructure(
  kit: PanelKit,
  surfaces: readonly Surface[],
  floorY = 0,
  { side = 'west', finish = 'painted' }: StairLook = {},
) {
  const group = new Group();
  group.name = 'decks and stair';
  const paint = (color: string, roughness = 0.6, metalness = 0.4) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const box = (
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    name = '',
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, floorY + y, z);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  const look = FINISHES[finish];
  const steel = paint(...look.frame);
  const grating = paint(...look.grating);
  const railing = paint(...look.rail);
  const nosing = paint(...look.nosing);
  const decks = surfaces.filter((s) => typeof s.y === 'number');
  for (const s of decks) {
    const a = s.area;
    const y = s.y as number;
    const w = a.maxX - a.minX;
    const d = a.maxZ - a.minZ;
    const cx = (a.minX + a.maxX) / 2;
    const cz = (a.minZ + a.maxZ) / 2;
    box(grating, w, 0.04, d, cx, y - 0.02, cz, s.name);
    // Its framing under the grating.
    for (const x of [a.minX + 0.05, a.maxX - 0.05])
      box(steel, 0.1, 0.18, d, x, y - 0.13, cz);
    for (let z = a.minZ + 0.05; z < a.maxZ; z += 1.5)
      box(steel, w, 0.12, 0.08, cx, y - 0.1, z);
  }
  // Columns to the floor, along each deck's open edge, every 3 m.
  for (const p of gantryColumns(surfaces, side))
    box(steel, 0.12, p.top, 0.12, p.x, p.top / 2, p.z, 'gantry column');
  // The flights: channel stringers, treads every 250 mm.
  for (const s of surfaces.filter((x) => typeof x.y !== 'number')) {
    const a = s.area;
    const f = s.y as Exclude<Surface['y'], number>;
    const run = Math.abs(f.at1 - f.at0);
    const rise = f.y1 - f.y0;
    const steps = Math.round(run / 0.25);
    for (let k = 0; k < steps; k++) {
      const z = f.at0 + ((f.at1 - f.at0) * (k + 0.5)) / steps;
      const y = f.y0 + (rise * (k + 1)) / steps;
      box(
        grating,
        a.maxX - a.minX - 0.12,
        0.04,
        0.24,
        (a.minX + a.maxX) / 2,
        y - 0.02,
        z,
        `${s.name} tread`,
      );
      // The nosing, yellow.
      box(
        nosing,
        a.maxX - a.minX - 0.12,
        0.02,
        0.04,
        (a.minX + a.maxX) / 2,
        y - 0.005,
        z - Math.sign(f.at1 - f.at0) * 0.1,
      );
    }
    for (const x of [a.minX + 0.03, a.maxX - 0.03]) {
      const len = Math.hypot(run, rise);
      const st = box(
        steel,
        0.06,
        0.25,
        len,
        x,
        (f.y0 + f.y1) / 2 - 0.1,
        (f.at0 + f.at1) / 2,
        `${s.name} stringer`,
      );
      st.rotation.x = Math.atan2(-rise, f.at1 - f.at0);
      // Its handrail, each side (BS EN ISO 14122-3): a top rail 1 m over
      // the nosings' line and a knee rail, on posts at each end and the
      // middle, sloping with the flight.
      for (const [hy, th] of [
        [1.0, 0.05],
        [0.5, 0.04],
      ] as const) {
        const rail = box(
          railing,
          th,
          th,
          len,
          x,
          (f.y0 + f.y1) / 2 + hy,
          (f.at0 + f.at1) / 2,
          'handrail',
        );
        rail.rotation.x = Math.atan2(-rise, f.at1 - f.at0);
      }
      for (const t of [0.04, 0.5, 0.96]) {
        const pz = f.at0 + (f.at1 - f.at0) * t;
        const py = f.y0 + rise * t;
        box(railing, 0.05, 1.0, 0.05, x, py + 0.5, pz, 'handrail post');
      }
    }
  }
  // The handrails: at each level, along its rails' lines, posts every
  // 1.5 m, a top rail at 1.1 m, a knee rail, and a toe board.
  const levels = [...new Set(decks.map((s) => s.y as number))];
  // Not along the decks' backs: a wall, or the machines they serve (the
  // air plant's units, their controllers at a hand's height over the deck).
  const back =
    side === 'west'
      ? Math.min(...decks.map((s) => s.area.minX))
      : Math.max(...decks.map((s) => s.area.maxX));
  for (const y of levels)
    for (const r of deckRails(surfaces, y))
      if (
        Math.abs((side === 'west' ? r.maxX : r.minX) - back) > 0.01 ||
        r.maxZ - r.minZ < 0.1
      )
        drawRail(r, y);
  function drawRail(r: Footprint, y: number) {
    const alongX = r.maxX - r.minX > r.maxZ - r.minZ;
    const length = alongX ? r.maxX - r.minX : r.maxZ - r.minZ;
    if (length < 0.05) return;
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    for (const [hy, th] of [
      [1.1, 0.05],
      [0.55, 0.04],
    ] as const)
      box(
        railing,
        alongX ? length : th,
        th,
        alongX ? th : length,
        cx,
        y + hy,
        cz,
        'handrail',
      );
    box(
      steel,
      alongX ? length : 0.02,
      0.15,
      alongX ? 0.02 : length,
      cx,
      y + 0.075,
      cz,
    );
    for (let s = 0; s <= length + 1e-6; s += Math.min(1.5, length)) {
      const px = alongX ? r.minX + s : cx;
      const pz = alongX ? cz : r.minZ + s;
      box(railing, 0.05, 1.1, 0.05, px, y + 0.55, pz);
    }
  }
  return group;
}

/** The gantries' columns: along each level deck's east edge every 3 m, from the floor to under it. */
export function gantryColumns(
  surfaces: readonly Surface[],
  side: 'west' | 'east' = 'west',
) {
  const out: { x: number; z: number; top: number }[] = [];
  for (const s of surfaces) {
    if (typeof s.y !== 'number') continue;
    const a = s.area;
    // Along its room side, away from the wall.
    const x = side === 'west' ? a.maxX - 0.06 : a.minX + 0.06;
    for (let z = a.minZ + 0.1; z <= a.maxZ - 0.05; z += 3)
      out.push({ x, z, top: s.y - 0.22 });
    out.push({ x, z: a.maxZ - 0.1, top: s.y - 0.22 });
  }
  // One column for each place, the tallest.
  const by = new Map<string, { x: number; z: number; top: number }>();
  for (const c of out) {
    const k = `${c.x.toFixed(2)},${c.z.toFixed(2)}`;
    if ((by.get(k)?.top ?? -1) < c.top) by.set(k, c);
  }
  return [...by.values()];
}

/** The columns' feet, to walk round on the floor. */
export const gantryColumnFeet = (
  surfaces: readonly Surface[],
  side: 'west' | 'east' = 'west',
): Footprint[] =>
  gantryColumns(surfaces, side).map((c) => ({
    minX: c.x - 0.06,
    maxX: c.x + 0.06,
    minZ: c.z - 0.06,
    maxZ: c.z + 0.06,
  }));
