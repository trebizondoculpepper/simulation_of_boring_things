import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createServiceCeiling } from '../../components/site-dressing/views/service-ceiling';
import {
  EQUIPMENT_DOORS,
  equipmentDoors,
} from '../../components/architectural/parts/equipment-doors';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import {
  addWallBatten,
  createWallBattenMaterials,
} from '../../../scene/wall-batten';
import {
  CORRIDOR_DOORS,
  corridorWalls,
  doorPlace,
  MAIN_CORRIDOR,
} from '../logic/main-corridor';
import type { CorridorDoor, CorridorWall } from '../logic/main-corridor';
import { POOL_HALLS } from '../logic/pool-halls';

/**
 * The main corridor (`logic/main-corridor.ts`): an L of painted blockwork
 * with a green dado, a grey epoxy floor, two storeys high under a
 * generated services ceiling, lit by sealed wall battens; in its walls,
 * the standard equipment doors (`equipment-doors.ts`), pushed open from
 * the corridor into the rooms beyond, each with its sign over it on the
 * corridor side. Metres, scaled by `metre`.
 */
export function createMainCorridor(metre: number, kit: PanelKit) {
  const C = MAIN_CORRIDOR;
  const group = new Group();
  group.name = 'main corridor';
  group.scale.setScalar(metre);
  const paint = (color: string, roughness = 0.85, metalness = 0) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const block = paint('#d4d5cf');
  const dado = paint('#6d7a6f');
  const epoxy = paint('#7c8482', 0.55);
  const dark = paint('#0b0d0d', 1);
  const box = (
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    parent: Object3D = group,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const w = C.width;
  const L = C.leg;
  const t = C.wall;
  const H = C.height;
  const openingH = EQUIPMENT_DOORS.h + 2 * EQUIPMENT_DOORS.frame;
  const half = C.opening / 2;
  // The floor and the roof, over both legs.
  for (const [x0, x1, z0, z1] of [
    [0, L, 0, w],
    [0, w, w, L],
  ]) {
    box(epoxy, x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, -0.05, (z0 + z1) / 2);
    box(
      block,
      x1 - x0 + 2 * t,
      0.3,
      z1 - z0 + 2 * t,
      (x0 + x1) / 2,
      H + 0.15,
      (z0 + z1) / 2,
    );
  }
  // The walls, each round its doorways, a header over each; the dado.
  const walls = corridorWalls();
  for (const wall of ['north', 'south', 'west', 'east'] as const) {
    const { line, from, to } = walls[wall];
    const outer = wall === 'north' || wall === 'west';
    const doors = CORRIDOR_DOORS.filter((d) => d.wall === wall)
      .map((d) => d.at)
      .sort((a, b) => a - b);
    let start = from - (outer ? t : 0);
    const pieces: [number, number][] = [];
    for (const at of doors) {
      pieces.push([start, at - half]);
      start = at + half;
    }
    pieces.push([start, to + t]);
    const mid = outer ? line - t / 2 : line + t / 2;
    const face = outer ? line + 0.005 : line - 0.005;
    const along = (
      a: number,
      b: number,
      y0: number,
      y1: number,
      m: Material,
      depth: number = t,
      at: number = mid,
    ) =>
      wall === 'north' || wall === 'south'
        ? box(m, b - a, y1 - y0, depth, (a + b) / 2, (y0 + y1) / 2, at)
        : box(m, depth, y1 - y0, b - a, at, (y0 + y1) / 2, (a + b) / 2);
    for (const [a, b] of pieces) {
      along(a, b, 0, H, block);
      along(Math.max(a, from), Math.min(b, to), 0, 1.2, dado, 0.01, face);
    }
    for (const at of doors) along(at - half, at + half, openingH, H, block);
  }
  // The legs' end walls.
  box(block, t, H, w + 2 * t, L + t / 2, H / 2, w / 2);
  box(block, w + 2 * t, H, t, w / 2, H / 2, L + t / 2);
  box(dado, 0.01, 1.2, w, L - 0.005, 0.6, w / 2);
  box(dado, w, 1.2, 0.01, w / 2, 0.6, L - 0.005);

  // The doors: each pushed from the corridor, so its pull side (+z)
  // faces away, into the room beyond; a dark lobby behind it until that
  // room is seen through it; its sign over it, on this side.
  const turn: Record<CorridorWall, number> = {
    north: Math.PI,
    south: 0,
    west: -Math.PI / 2,
    east: Math.PI / 2,
  };
  const doors = CORRIDOR_DOORS.map((d) => {
    const p = doorPlace(d);
    const part = equipmentDoors(kit, signFor(d));
    // At the wall's far face, its frame in the wall, its push side seen
    // from the corridor at the back of the reveal.
    part.object.position.set(p.x - p.into[0] * t, 0, p.z - p.into[1] * t);
    part.object.rotation.y = turn[d.wall];
    group.add(part.object);
    const lobby = new Group();
    lobby.position.set(p.x, 0, p.z);
    lobby.rotation.y = turn[d.wall];
    group.add(lobby);
    box(dark, C.opening, openingH, 0.05, 0, openingH / 2, 1.2, lobby);
    const sign = card(1.8, 0.24, signFor(d));
    sign.position.set(
      p.x + p.into[0] * 0.01,
      openingH + 0.35,
      p.z + p.into[1] * 0.01,
    );
    sign.rotation.y = turn[d.wall] + Math.PI;
    group.add(sign);
    return { door: d, part, lobby };
  });

  // The services ceiling over each leg, and the wall battens and lights.
  for (const [minX, maxX, minZ, maxZ, seed] of [
    [0, L, 0, w, 41],
    [0, w, w, L, 43],
  ])
    group.add(
      createServiceCeiling(
        { minX, maxX, minZ, maxZ, deckY: H },
        { seed, density: 0.85 },
      ).group,
    );
  const battens = createWallBattenMaterials();
  kit.materials.push(...Object.values(battens));
  for (let s = 4; s < L - 1; s += 6) {
    // On the outer walls, facing in, clear of the doors.
    if (CORRIDOR_DOORS.some((d) => Math.abs(d.at - s) < 1.6)) s += 1.8;
    addWallBatten(group, battens, s, 3.1, 0.05, 'x', 1);
    addWallBatten(group, battens, 0.05, 3.1, s, 'z', 1);
  }
  for (const [x, z] of [
    [w / 2, w / 2],
    [L * 0.6, w / 2],
    [w / 2, L * 0.6],
  ]) {
    const light = new PointLight('#f2f4ee', 5 * metre * metre, 16 * metre, 2);
    light.position.set(x, 3.2, z);
    group.add(light);
  }
  // ---- What makes it a working plant corridor -----------------------------
  const yellow = paint('#e3b51f', 0.55);
  const galv = paint('#a9aeae', 0.45, 0.6);
  const hatch = hatchMaterial();
  kit.materials.push(hatch);
  if (hatch.map) kit.textures.push(hatch.map);
  /** A strip of floor paint, flush on the floor. */
  const paintStrip = (
    m: Material,
    x0: number,
    x1: number,
    z0: number,
    z1: number,
  ) => box(m, x1 - x0, 0.004, z1 - z0, (x0 + x1) / 2, 0.002, (z0 + z1) / 2);
  // Yellow walkway lines, 0.6 m in from every wall, round the L.
  const inset = 0.6;
  const lw = 0.08;
  paintStrip(yellow, inset, L - 0.3, inset - lw / 2, inset + lw / 2);
  paintStrip(
    yellow,
    w - inset,
    L - 0.3,
    w - inset - lw / 2,
    w - inset + lw / 2,
  );
  paintStrip(yellow, inset - lw / 2, inset + lw / 2, inset, L - 0.3);
  paintStrip(
    yellow,
    w - inset - lw / 2,
    w - inset + lw / 2,
    w - inset,
    L - 0.3,
  );
  // A hatched keep-clear zone in front of every pair of doors.
  for (const d of CORRIDOR_DOORS) {
    const p = doorPlace(d);
    const depth = 1.2;
    const ax = d.wall === 'north' || d.wall === 'south';
    const cx = p.x + p.into[0] * (depth / 2 + 0.02);
    const cz = p.z + p.into[1] * (depth / 2 + 0.02);
    const sx = ax ? C.opening : depth;
    const sz = ax ? depth : C.opening;
    const zone = box(hatch, sx, 0.005, sz, cx, 0.0025, cz);
    const uv = zone.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, (uv.getX(i) * sx) / 0.6, (uv.getY(i) * sz) / 0.6);
    uv.needsUpdate = true;
  }
  // A galvanised buffer rail along the walls at trolley height, on
  // stand-offs, broken at each doorway and stopping short of the ends.
  for (const wall of ['north', 'south', 'west', 'east'] as const) {
    const { line, from, to } = walls[wall];
    const inward = wall === 'north' || wall === 'west' ? 1 : -1;
    const at = line + inward * 0.12;
    const cuts = CORRIDOR_DOORS.filter((d) => d.wall === wall).map((d) => d.at);
    let start = from + 0.4;
    const runs: [number, number][] = [];
    for (const c of cuts.sort((a, b) => a - b)) {
      runs.push([start, c - half - 0.3]);
      start = c + half + 0.3;
    }
    runs.push([start, to - 0.4]);
    for (const [a, b] of runs) {
      if (b - a < 0.5) continue;
      const len = b - a;
      if (wall === 'north' || wall === 'south') {
        box(galv, len, 0.15, 0.04, (a + b) / 2, 0.45, at);
        for (let s = a + 0.1; s <= b; s += 1.5)
          box(galv, 0.06, 0.06, 0.1, s, 0.45, line + inward * 0.06);
      } else {
        box(galv, 0.04, 0.15, len, at, 0.45, (a + b) / 2);
        for (let s = a + 0.1; s <= b; s += 1.5)
          box(galv, 0.1, 0.06, 0.06, line + inward * 0.06, 0.45, s);
      }
    }
  }
  // A yellow and black corner guard on the inside corner of the L.
  const guard = new Mesh(new BoxGeometry(0.12, 1.4, 0.12), hatch);
  guard.position.set(w + 0.06, 0.7, w + 0.06);
  group.add(guard);
  // Direction signs at the corner, on the end walls' corner faces.
  const ahead = card(1.6, 0.3, 'PLANT ROOMS 1 · 2  →');
  ahead.position.set(0.006, 2.4, w / 2);
  ahead.rotation.y = Math.PI / 2;
  group.add(ahead);
  const down = card(1.6, 0.3, 'PLANT ROOMS 3 · 4  →');
  down.position.set(w / 2, 2.4, 0.006);
  group.add(down);

  const title = card(1.6, 0.36, 'MAIN CORRIDOR');
  title.position.set(0.005, 3.0, w / 2);
  title.rotation.y = Math.PI / 2;
  group.add(title);

  function card(cw: number, ch: number, text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round((512 * ch) / cw);
    const c = canvas.getContext('2d');
    if (c) {
      c.fillStyle = '#f4f2ea';
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = '#16191a';
      c.font = `bold ${canvas.height * 0.42}px Arial, Helvetica, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(
        text,
        canvas.width / 2,
        canvas.height * 0.54,
        canvas.width * 0.92,
      );
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    kit.textures.push(map);
    const material = new MeshBasicMaterial({ map });
    kit.materials.push(material);
    return new Mesh(new PlaneGeometry(cw, ch), material);
  }
  return {
    group,
    doors: doors as {
      door: CorridorDoor;
      part: EquipmentDoorsPart;
      lobby: Group;
    }[],
  };
}

/** What a corridor door's sign says: the plant room's number and pool, or WET HALL. */
export function signFor(d: CorridorDoor) {
  if (d.to === 'wet_hall') return 'WET HALL';
  const hall = d.to.replace('plant_', '') as keyof typeof POOL_HALLS;
  return `PLANT ROOM ${Number(hall.slice(-2))} – ${POOL_HALLS[hall].title.toUpperCase()}`;
}

/** Yellow and black hazard hatching, diagonal, repeating. */
function hatchMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#1b1c1c';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#e3b51f';
    for (let k = -2; k < 4; k++) {
      c.beginPath();
      c.moveTo(k * 64, 0);
      c.lineTo(k * 64 + 32, 0);
      c.lineTo(k * 64 + 32 + 128, 128);
      c.lineTo(k * 64 + 128, 128);
      c.closePath();
      c.fill();
    }
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  return new MeshStandardMaterial({ map, roughness: 0.7 });
}
