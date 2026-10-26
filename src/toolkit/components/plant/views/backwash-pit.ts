import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { plantTools } from './plant-tools';
import { createGratingDeck } from './railings';
import { createUltrasonicLevel } from './ultrasonic-level';
import { createStaffGauge } from './staff-gauge';
import { createSafetySign } from '../../general-safety/views/safety-signs';
import { slabAround } from '../../../gallery/logic/slab-openings';

export interface BackwashPitSpec {
  /** Its inside, metres: length along x, width along z, depth floor to slab. */
  length: number;
  width: number;
  depth: number;
  /** Its top water level above its floor. */
  topWater: number;
  /** Its walls' thickness. */
  wall: number;
  /** Its settlement sump, in its floor under its pump. */
  sump: { length: number; width: number; depth: number };
}

/**
 * The wet hall's backwash pit (prompt 036; the owner, 2026-10-26): a
 * sealed cast concrete pit below the floor, serviced from above only. Its
 * board-marked walls and floor, the settlement sump in its floor's east
 * corner under its submersible pump; its opening covered by galvanised
 * gratings flush with the floor, walked over and seen through, with a
 * solid hatch over the sump (CONFINED SPACE, entry by permit only) and
 * beside it the pump's davit for lifting it out on its chain. Under the
 * gratings, a staff gauge on its north wall and the ultrasonic level
 * transmitter on its bracket, looking down at the water, which stands at
 * the world's level. Its own frame: the hall's floor at y = 0, its middle
 * on its axis, x along its length, +z south.
 */
export function createBackwashPit(kit: PanelKit, p: BackwashPitSpec) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Backwash pit';
  const concrete = t.paint('#9a9890', 0.95);
  const dark = t.paint('#6f6d66', 0.95);
  const L = p.length;
  const W = p.width;
  const D = p.depth;
  const w = p.wall;
  // Its walls, down from the floor.
  for (const side of [-1, 1]) {
    t.box(group, concrete, L + 2 * w, D, w, 0, -D / 2, side * (W / 2 + w / 2));
    t.box(group, concrete, w, D, W, side * (L / 2 + w / 2), -D / 2, 0);
  }
  // Its floor, round its sump in the south-east corner.
  const sump = {
    minX: L / 2 - p.sump.length,
    maxX: L / 2,
    minZ: W / 2 - p.sump.width,
    maxZ: W / 2,
  };
  for (const r of slabAround(L, W, [sump]))
    t.box(
      group,
      dark,
      r.maxX - r.minX,
      0.3,
      r.maxZ - r.minZ,
      (r.minX + r.maxX) / 2,
      -D - 0.15,
      (r.minZ + r.maxZ) / 2,
    );
  const sd = p.sump.depth;
  const sx = (sump.minX + sump.maxX) / 2;
  const sz = (sump.minZ + sump.maxZ) / 2;
  t.box(group, dark, p.sump.length, 0.3, p.sump.width, sx, -D - sd - 0.15, sz);
  t.box(group, dark, 0.2, sd, p.sump.width, sump.minX - 0.1, -D - sd / 2, sz);
  t.box(group, dark, p.sump.length, sd, 0.2, sx, -D - sd / 2, sump.minZ - 0.1);
  // Its water: dirty backwash, murky brown-green, at the world's level.
  const waterMaterial = new MeshStandardMaterial({
    color: '#5c5a3c',
    roughness: 0.35,
    transparent: true,
    opacity: 0.85,
  });
  kit.materials.push(waterMaterial);
  const water = new Mesh(new PlaneGeometry(L, W), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.name = 'Backwash in the pit';
  group.add(water);
  // Its staff gauge on its north wall, its zero at its floor.
  const gauge = createStaffGauge(kit, Math.ceil(D));
  gauge.position.set(-L / 2 + 0.6, -D, -W / 2 + 0.01);
  group.add(gauge);
  // The gratings over its opening, flush with the floor; a solid hatch
  // over its sump, and its kerb round them.
  const hatch = { length: 1.4, width: 1.4 };
  const hatchArea = {
    minX: L / 2 - hatch.length,
    maxX: L / 2,
    minZ: W / 2 - hatch.width,
    maxZ: W / 2,
  };
  for (const r of slabAround(L, W, [hatchArea])) {
    const deck = createGratingDeck(kit, r.maxX - r.minX, r.maxZ - r.minZ);
    deck.position.set((r.minX + r.maxX) / 2, -0.005, (r.minZ + r.maxZ) / 2);
    group.add(deck);
  }
  const steel = t.paint('#8d9392', 0.45, 0.6);
  t.box(
    group,
    t.paint('#d4b21e', 0.5),
    hatch.length,
    0.02,
    hatch.width,
    (hatchArea.minX + hatchArea.maxX) / 2,
    -0.01,
    (hatchArea.minZ + hatchArea.maxZ) / 2,
  );
  const sign = createSafetySign(
    kit,
    ['confined'],
    ['DANGER', 'Confined space', 'Entry by permit only'],
  );
  sign.rotation.x = -Math.PI / 2;
  sign.scale.setScalar(0.8);
  sign.position.set(
    (hatchArea.minX + hatchArea.maxX) / 2,
    0.002,
    (hatchArea.minZ + hatchArea.maxZ) / 2,
  );
  group.add(sign);
  for (const side of [-1, 1]) {
    t.box(group, steel, L + 0.1, 0.03, 0.05, 0, -0.015, side * (W / 2 + 0.025));
    t.box(group, steel, 0.05, 0.03, W, side * (L / 2 + 0.025), -0.015, 0);
  }
  // The pump's davit beside the hatch: a post, its arm over the sump.
  const davitX = hatchArea.minX - 0.25;
  const davitZ = (hatchArea.minZ + hatchArea.maxZ) / 2;
  t.cyl(group, steel, 0.05, 1.1, davitX, 0.55, davitZ, 'y', 12);
  t.box(group, steel, 0.9, 0.08, 0.08, davitX + 0.45, 1.1, davitZ);
  t.cyl(
    group,
    t.paint('#2b2e2f', 0.6),
    0.03,
    0.12,
    davitX + 0.85,
    1.0,
    davitZ,
    'y',
    10,
  );
  // The ultrasonic level transmitter on a bracket over a gap at its west
  // end, looking down at the water.
  const level = createUltrasonicLevel(kit);
  level.group.position.set(-L / 2 + 0.5, 0.25, 0);
  group.add(level.group);
  t.box(group, steel, 0.6, 0.05, 0.08, -L / 2 + 0.25, 0.22, 0);
  // Its name on its kerb.
  const name = createMicroLabel(kit, 'WH-T2  BACKWASH PIT', {
    height: 0.06,
    ink: '#151515',
    plate: '#e3b51f',
  });
  name.rotation.x = -Math.PI / 2;
  name.position.set(-L / 2 + 1.2, 0.003, W / 2 + 0.15);
  group.add(name);
  return {
    group,
    /** Its water's depth above its floor, metres. */
    setDepth(metres: number) {
      const d = Math.max(0.02, Math.min(p.topWater, metres));
      water.position.y = -D + d;
      water.visible = metres > 0.01;
      level.show(metres);
    },
  };
}
