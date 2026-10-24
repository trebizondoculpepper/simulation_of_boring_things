import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { airBox, airDucts, gantries, levelSolids } from '../logic/air-plant';
import type { Duct, Surface } from '../logic/air-plant';
import type { Placed } from '../logic/room-equipment';
import { AIR_UNITS } from '../logic/air-plant';
import { airMimicSpec, airMimicState } from '../logic/air-mimic';
import type { AirReading } from '../logic/air-mimic';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import {
  advanceAirPlant,
  airHouse,
  registerAirUnit,
} from '../../components/plant/views/pool-ahu';
import { ahuLamps } from '../../components/plant/logic/pool-ahu';
import type { Footprint } from '../../controls/logic/walk-collision';
import { mergeStatic } from '../../components/core/views/merge-static';

/**
 * The air plant's ductwork and its gantries (`logic/air-plant.ts`), in
 * metres on the room's floor at `floorY`:
 *
 * - each unit's four ducts, DW/144 rectangular galvanised sheet with
 *   flanged joints every 1.2 m: the hall's supply and extract lagged in
 *   white, the outside air and exhaust bare; each into the wall through a
 *   collar;
 * - the gantries along the west stacks, open steel grating on steel
 *   framing, on columns to the floor, with toe boards and double
 *   handrails at every open edge;
 * - the stair, two flights of steel treads between channel stringers.
 */
export function createAirPlantStructure(
  kit: PanelKit,
  placed: readonly Placed[],
  floorY = 0,
) {
  const group = new Group();
  group.name = 'air plant ductwork';
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
  const galv = paint('#aeb7b8', 0.45, 0.6);
  const lagged = paint('#e3e5e1', 0.7, 0.05);
  const flangeGalv = paint('#9da2a3', 0.45, 0.6);
  const collar = paint('#5d6366', 0.6, 0.3);

  // ---- The ducts -------------------------------------------------------
  const room = airBox();
  for (const d of airDucts(placed, room)) drawDuct(d);
  function drawDuct(d: Duct) {
    const warm = d.role === 'supply' || d.role === 'extract';
    const sheet = warm ? lagged : galv;
    const extra = warm ? 0.1 : 0;
    const w = d.w + extra;
    const h = d.h + extra;
    for (let i = 1; i < d.points.length; i++) {
      const a = d.points[i - 1];
      const b = d.points[i];
      const alongX = Math.abs(b[0] - a[0]) > 1e-9;
      const length = Math.abs(alongX ? b[0] - a[0] : b[2] - a[2]);
      // Each length runs on half a width past its corner, so corners meet.
      const lap = i < d.points.length - 1 ? w / 2 : 0;
      const sign = Math.sign(alongX ? b[0] - a[0] : b[2] - a[2]);
      const mid = alongX
        ? [(a[0] + b[0]) / 2 + (sign * lap) / 2, a[1], a[2]]
        : [a[0], a[1], (a[2] + b[2]) / 2 + (sign * lap) / 2];
      box(
        sheet,
        alongX ? length + lap : w,
        h,
        alongX ? w : length + lap,
        mid[0],
        mid[1],
        mid[2],
        d.name,
      );
      if (!warm)
        for (let s = 1.2; s < length; s += 1.2) {
          const at = alongX
            ? [a[0] + sign * s, a[1], a[2]]
            : [a[0], a[1], a[2] + sign * s];
          box(
            flangeGalv,
            alongX ? 0.03 : w + 0.06,
            h + 0.06,
            alongX ? w + 0.06 : 0.03,
            at[0],
            at[1],
            at[2],
          );
        }
    }
    // Its collar where it enters the wall.
    const end = d.points.at(-1)!;
    const prev = d.points.at(-2)!;
    const alongX = Math.abs(end[0] - prev[0]) > 1e-9;
    box(
      collar,
      alongX ? 0.06 : w + 0.16,
      h + 0.16,
      alongX ? w + 0.16 : 0.06,
      end[0] - (alongX ? Math.sign(end[0] - prev[0]) * 0.03 : 0),
      end[1],
      end[2] - (alongX ? 0 : Math.sign(end[2] - prev[2]) * 0.03),
    );
  }

  // ---- The gantries and the stair ------------------------------------------
  const steel = paint('#3c4a57', 0.55, 0.4);
  const grating = paint('#5f676b', 0.5, 0.6);
  const yellow = paint('#e3b51f', 0.5, 0.2);
  const surfaces = gantries(room);
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
  for (const p of gantryColumns(surfaces))
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
        yellow,
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
      st.rotation.x = Math.atan2(rise, f.at1 - f.at0);
      // Its handrail, each side (BS EN ISO 14122-3): a top rail 1 m over
      // the nosings' line and a knee rail, on posts at each end and the
      // middle, sloping with the flight.
      for (const [hy, th] of [
        [1.0, 0.05],
        [0.5, 0.04],
      ] as const) {
        const rail = box(
          yellow,
          th,
          th,
          len,
          x,
          (f.y0 + f.y1) / 2 + hy,
          (f.at0 + f.at1) / 2,
          'handrail',
        );
        rail.rotation.x = Math.atan2(rise, f.at1 - f.at0);
      }
      for (const t of [0.04, 0.5, 0.96]) {
        const pz = f.at0 + (f.at1 - f.at0) * t;
        const py = f.y0 + rise * t;
        box(yellow, 0.05, 1.0, 0.05, x, py + 0.5, pz, 'handrail post');
      }
    }
  }
  // The handrails: at each level, along its rails' lines, posts every
  // 1.5 m, a top rail at 1.1 m, a knee rail, and a toe board.
  const levels = [...new Set(decks.map((s) => s.y as number))];
  // Not along the stacks' fronts, where the units themselves are the
  // edge and their controllers stand at a hand's height over the deck.
  const stacksFront = Math.min(...decks.map((s) => s.area.minX));
  for (const y of levels)
    for (const r of levelSolids(surfaces, y))
      if (Math.abs(r.maxX - stacksFront) > 0.01 || r.maxZ - r.minZ < 0.1)
        drawRail(r, y);
  // Every duct, deck and rail is still: drawn in a few meshes, cell by
  // cell, so what is out of sight can be culled.
  group.updateMatrixWorld(true);
  mergeStatic(group, 6, new Set(), { share: true });
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
        yellow,
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
      box(yellow, 0.05, 1.1, 0.05, px, y + 0.55, pz);
    }
  }
  return group;
}

/** The gantries' columns: along each level deck's east edge every 3 m, from the floor to under it. */
export function gantryColumns(surfaces: readonly Surface[]) {
  const out: { x: number; z: number; top: number }[] = [];
  for (const s of surfaces) {
    if (typeof s.y !== 'number') continue;
    const a = s.area;
    for (let z = a.minZ + 0.1; z <= a.maxZ - 0.05; z += 3)
      out.push({ x: a.maxX - 0.06, z, top: s.y - 0.22 });
    out.push({ x: a.maxX - 0.06, z: a.maxZ - 0.1, top: s.y - 0.22 });
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
export const gantryColumnFeet = (surfaces: readonly Surface[]): Footprint[] =>
  gantryColumns(surfaces).map((c) => ({
    minX: c.x - 0.06,
    maxX: c.x + 0.06,
    minZ: c.z - 0.06,
    maxZ: c.z + 0.06,
  }));

/**
 * The air plant's mimic and control panel (`logic/air-mimic.ts`), by
 * Penfold Controls: every unit's lamps and each hall's air, live from
 * the air plant (`airHouse`); each hall's OCCUPIED and UNOCCUPIED
 * buttons set its time programme, which its units follow in AUTO.
 */
export function createAirMimic(kit: PanelKit) {
  for (const u of AIR_UNITS) registerAirUnit(u);
  const board = createMimicBoard(kit, airMimicSpec(), {
    press: (id) => {
      const [hall, what] = id.split('-');
      if (what === 'on' || what === 'off')
        airHouse.occupied.set(hall, what === 'on');
    },
  });
  return {
    object: board.group,
    parts: board.parts,
    update() {
      advanceAirPlant(performance.now() / 1000);
      const units: AirReading['units'] = Object.fromEntries(
        AIR_UNITS.map((u) => {
          const s = airHouse.units.get(u.tag)!;
          const l = ahuLamps(s);
          return [u.tag, { ...l, speed: s.speed, hallRh: s.hallRh }];
        }),
      );
      board.show(
        airMimicState({
          units,
          occupied: Object.fromEntries(airHouse.occupied),
        }),
      );
    },
  };
}
