import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { airBox, airDucts, gantries } from '../logic/air-plant';
import type { Duct } from '../logic/air-plant';
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
import { mergeStatic } from '../../components/core/views/merge-static';
import { createStairStructure } from './stair-run';
export { gantryColumnFeet, gantryColumns } from './stair-run';

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

  // ---- The gantries and the stair (`stair-run.ts`) -------------------------
  group.add(createStairStructure(kit, gantries(room), floorY));
  // Every duct, deck and rail is still: drawn in a few meshes, cell by
  // cell, so what is out of sight can be culled.
  group.updateMatrixWorld(true);
  mergeStatic(group, 6, new Set(), { share: true });
  return group;
}

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
