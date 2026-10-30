import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShapeGeometry,
} from 'three';
import type { Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { markComponent } from '../../components/core/views/component-identity';
import {
  MUSEUM_WALL,
  emptyHallShape,
  hallKind,
  ringDistance,
  ringNeighbours,
  ringSide,
  sharedWall,
  MUSEUM_HALLS,
} from '../logic/museum-plan';
import type {
  HallWall,
  MuseumHallId,
  NeighbourDraw,
} from '../logic/museum-plan';
import {
  BLACK_BOX,
  FLOOR_TILE,
  hall0PosterGlowGeometry,
  hall0TrimGeometry,
  lifebuoyStickerGeometry,
  lifebuoyStickerMaterial,
  lifebuoyStickerTexture,
  paintedFloorTexture,
  placeOnLine,
  wallRun,
  windowShape,
} from './museum-hall';
import { HALL0_BANDS, hallBounds, isBlackBox } from '../logic/museum-plan';
import type { MuseumMaterials, Opening } from './museum-hall';

/**
 * The museum's empty halls (mission 107-1; the owner, 2026-10-28: "keep an
 * empty hall, corner and side as a component", and "anything more distant
 * should be rendered as a completely empty space (no decorations)"): a
 * hall's architecture only, floor, walls with their archway and window
 * openings, a plain ceiling and a flat light, with no signs, lighting
 * tracks, services ceiling, safety layer, benches or exhibits. Built from
 * the same plan and the same wall function as the full hall
 * (`museum-hall.ts`), so a hall seen empty two archways away stands
 * exactly where its full self would.
 *
 * Three shapes on the ring, all from the one generic empty hall
 * (`createEmptyHall`): the side hall (archways in line at both ends,
 * `createEmptySideHall`), the corner (archways on two adjacent walls,
 * `createEmptyCornerHall`) and Hall 0's own shape. Cheap: every hall's
 * geometry is merged by material, one draw call a material whatever the
 * number of halls, no shadows. The empty halls a hall's scene draws
 * beyond its neighbours (`createRingShells`) are grouped by the
 * neighbour they lie beyond, so they can stand aside (drawn only into
 * depth) while that neighbour's full room is drawn through its archway.
 * In the museum's coordinates, metres.
 */

/** What an empty hall is drawn with: the full hall's brick and concrete, a plain ceiling, glowing glass. */
export type EmptyPart =
  | 'paint'
  | 'rawBrick'
  | 'tile'
  | 'floor'
  | 'deck'
  | 'ceiling'
  | 'glass'
  | 'band0'
  | 'band1'
  | 'band2'
  | 'sticker'
  | 'glow'
  | 'black';

export interface EmptyHallMaterials {
  parts: Record<EmptyPart, Material>;
  /** Writes depth only: an empty hall standing aside while its full self is drawn through an archway. */
  occluder: Material;
  dispose(): void;
}

/**
 * Pushed a little back in depth, so where an empty hall's wall is the same
 * wall as the courtyard's far wall (drawn through the windows) the
 * courtyard's is seen.
 */
const behind = <M extends Material>(m: M): M => {
  m.polygonOffset = true;
  m.polygonOffsetFactor = 1;
  m.polygonOffsetUnits = 2;
  return m;
};

/** The empty halls' finishes: the full hall's own brick, concrete and tiles (their textures shared), and plain ceilings. */
export function createEmptyHallMaterials(
  base: MuseumMaterials,
): EmptyHallMaterials {
  // Hall 0's floor as its full self has it: the painted dry pool and the
  // tiled deck round it, the same painting at a lower resolution.
  const b0 = hallBounds('museum0');
  const deckTiles = paintedFloorTexture(
    b0.maxX - b0.minX,
    b0.maxZ - b0.minZ,
    40,
  );
  const stickerMap = lifebuoyStickerTexture();
  const band = (k: number) =>
    new MeshStandardMaterial({ color: HALL0_BANDS[k].colour, roughness: 0.25 });
  const parts: Record<EmptyPart, Material> = {
    paint: behind(base.paint.clone()),
    rawBrick: behind(base.rawBrick.clone()),
    tile: behind(base.tile.clone()),
    floor: behind(base.floor.clone()),
    // Its white pool and deck, darkened as the full hall is (2026-10-28).
    deck: behind(
      new MeshStandardMaterial({
        map: deckTiles,
        color: '#8d9496',
        roughness: 0.5,
      }),
    ),
    // The gentle warm cove light round its title wall, its only one (2026-10-28).
    glow: behind(new MeshBasicMaterial({ color: '#6e553c' })),
    band0: behind(band(0)),
    band1: behind(band(1)),
    band2: behind(band(2)),
    sticker: lifebuoyStickerMaterial(stickerMap),
    ceiling: behind(
      new MeshStandardMaterial({
        color: '#d8d5ce',
        emissive: '#3a3833',
        roughness: 0.95,
      }),
    ),
    // A black box's matt black walls, floor and roof deck (Halls 7 and 8).
    black: behind(
      new MeshStandardMaterial({ color: BLACK_BOX.walls, roughness: 0.95 }),
    ),
    glass: behind(
      new MeshStandardMaterial({
        color: '#dfe7ea',
        emissive: '#e8eff2',
        emissiveIntensity: 0.6,
        roughness: 0.6,
        side: DoubleSide,
      }),
    ),
  };
  const occluder = behind(
    new MeshBasicMaterial({ colorWrite: false, side: DoubleSide }),
  );
  return {
    parts,
    occluder,
    dispose() {
      for (const m of Object.values(parts)) m.dispose();
      occluder.dispose();
      deckTiles.dispose();
      stickerMap.dispose();
    },
  };
}

/** A non-indexed geometry's vertices from `start`, `count` of them: one of its material groups on its own. */
function slice(g: BufferGeometry, start: number, count: number) {
  const out = new BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.getAttribute(name);
    if (!a) continue;
    const n = a.itemSize;
    const array = (a.array as Float32Array).slice(
      start * n,
      (start + count) * n,
    );
    out.setAttribute(name, new BufferAttribute(array, n));
  }
  return out;
}

/** The parts of one empty hall, each a list of geometries to merge with others of its kind. */
type Parts = Map<EmptyPart, BufferGeometry[]>;
const add = (parts: Parts, key: EmptyPart, g: BufferGeometry) => {
  const list = parts.get(key) ?? [];
  list.push(g);
  parts.set(key, list);
};

/**
 * One empty hall's geometry, in the museum's coordinates, added to
 * `parts`: its floor out to its wall lines (the concrete's saw cuts laid
 * from the museum's origin, as the full hall's), a plain ceiling under the
 * roof deck (Hall 0's lower), and each of its walls `builds` lets it build
 * (the walls it shares with the hall whose scene it is drawn in, or with a
 * nearer empty hall, are built by those), with its archways and its
 * windows, glazed with glowing glass.
 */
export function emptyHallParts(
  id: MuseumHallId,
  parts: Parts,
  builds: (wall: HallWall) => boolean = () => true,
) {
  const shape = emptyHallShape(id);
  const b = shape.bounds;
  const welcome = shape.kind === 'welcome';
  // A black box keeps its finish seen from afar (the owner, 2026-10-30).
  const dark = isBlackBox(id);
  const t = MUSEUM_WALL;
  const floor = new PlaneGeometry(b.maxX - b.minX, b.maxZ - b.minZ);
  floor.rotateX(-Math.PI / 2);
  floor.translate((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
  const pos = floor.attributes.position;
  const uv = floor.attributes.uv;
  // Hall 0's painted floor spans it once (the plane's own UVs).
  if (!welcome)
    for (let i = 0; i < pos.count; i++)
      uv.setXY(i, pos.getX(i) / FLOOR_TILE, -pos.getZ(i) / FLOOR_TILE);
  add(parts, dark ? 'black' : welcome ? 'deck' : 'floor', floor);
  const lid = new PlaneGeometry(b.maxX - b.minX - t, b.maxZ - b.minZ - t);
  lid.rotateX(Math.PI / 2);
  lid.translate((b.minX + b.maxX) / 2, shape.h, (b.minZ + b.maxZ) / 2);
  add(parts, dark ? 'black' : 'ceiling', lid);
  for (const { wall, windows } of shape.walls) {
    if (!builds(wall)) continue;
    const openings: Opening[] = shape.arches
      .filter(
        (a) =>
          a.axis === wall.axis &&
          Math.abs((wall.axis === 'x' ? a.at.z : a.at.x) - wall.line) < 1e-9,
      )
      .map((arch) => ({ arch, u: wall.axis === 'x' ? arch.at.x : arch.at.z }));
    // The materials are only labels here: the faces and the reveals are split apart below.
    const mesh = wallRun(
      wall.axis,
      wall.line,
      wall.from - t / 2,
      wall.to + t / 2,
      openings,
      windows,
      undefined as unknown as Material,
      undefined as unknown as Material,
    );
    mesh.updateMatrix();
    // An extrusion's vertices are not shared: its groups are runs of them.
    const g = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry;
    g.applyMatrix4(mesh.matrix);
    for (const group of g.groups)
      add(
        parts,
        group.materialIndex === 0
          ? welcome
            ? 'tile'
            : dark
              ? 'black'
              : 'paint'
          : welcome && openings.length === 0
            ? 'tile'
            : 'rawBrick',
        slice(g, group.start, group.count),
      );
    g.dispose();
    mesh.geometry.dispose();
    for (const w of windows) {
      const pane = new Mesh(new ShapeGeometry(windowShape(w)));
      placeOnLine(pane, wall.axis, wall.line);
      pane.updateMatrix();
      pane.geometry.applyMatrix4(pane.matrix);
      add(parts, 'glass', pane.geometry);
    }
  }
  if (welcome) {
    // Its pool-hall trim, as the full hall's: bands and the tiled cove.
    const trim = hall0TrimGeometry();
    trim.bands.forEach((list, k) => {
      for (const g of list) add(parts, `band${k}` as EmptyPart, g);
    });
    for (const g of trim.coves) add(parts, 'tile', g);
    add(parts, 'sticker', lifebuoyStickerGeometry());
    for (const g of hall0PosterGlowGeometry()) add(parts, 'glow', g);
  }
}

/** Merge `parts` into one mesh a material. */
function meshes(parts: Parts, materials: EmptyHallMaterials, name: string) {
  const group = new Group();
  group.name = name;
  for (const [key, list] of parts) {
    if (!list.length) continue;
    const merged = mergeGeometries(
      list.map((g) => (g.index ? g.toNonIndexed() : g)),
    );
    for (const g of list) g.dispose();
    const mesh = new Mesh(merged, materials.parts[key]);
    mesh.name = `${name}: ${key}`;
    mesh.userData.part = key;
    if (key === 'sticker') mesh.renderOrder = 1;
    group.add(mesh);
  }
  markComponent(group, { decorative: true });
  return group;
}

/** An empty hall or several, merged by material: a group, drawn or standing aside, and what frees it. */
export interface EmptyHalls {
  group: Group;
  /** Stand aside (true: depth only, nothing drawn) or be seen. */
  setOccluding(on: boolean): void;
  dispose(): void;
}

/** Drawn before everything else while standing aside, so it hides what lies behind it whatever the draw order; else as built. */
export const OCCLUDER_RENDER_ORDER = -10;
export const occluderRenderOrder = (on: boolean, part: EmptyPart) =>
  on ? OCCLUDER_RENDER_ORDER : part === 'sticker' ? 1 : 0;

function emptyHalls(group: Group, materials: EmptyHallMaterials): EmptyHalls {
  return {
    group,
    setOccluding(on) {
      group.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        o.material = on
          ? materials.occluder
          : materials.parts[o.userData.part as EmptyPart];
        // A depth-only occluder hides only what is drawn after it: drawn
        // first, or the empty halls beyond it, drawn earlier, show
        // through its walls (the owner, 2026-10-28: Halls 3 and 4 seen
        // through Hall 9 from Hall 0).
        o.renderOrder = occluderRenderOrder(on, o.userData.part as EmptyPart);
      });
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
    },
  };
}

/**
 * The generic empty hall: the halls `ids`, each with whatever archways the
 * plan gives it, merged by material into one group. `builds` says which of
 * a hall's walls it builds (all, by default).
 */
export function createEmptyHall(
  ids: readonly MuseumHallId[],
  materials: EmptyHallMaterials,
  builds: (id: MuseumHallId, wall: HallWall) => boolean = () => true,
  name = `Empty ${ids.join(', ')}`,
): EmptyHalls {
  const parts: Parts = new Map();
  for (const id of ids) emptyHallParts(id, parts, (w) => builds(id, w));
  return emptyHalls(meshes(parts, materials, name), materials);
}

/** An empty side hall: a straight hall on a side of the ring, its archways in line at both ends. */
export function createEmptySideHall(
  id: MuseumHallId,
  materials: EmptyHallMaterials,
) {
  if (hallKind(id) !== 'side') throw new Error(`${id} is not a side hall`);
  return createEmptyHall([id], materials);
}

/** An empty corner hall: a corner of the ring, its archways on two adjacent walls. */
export function createEmptyCornerHall(
  id: MuseumHallId,
  materials: EmptyHallMaterials,
) {
  if (hallKind(id) !== 'corner') throw new Error(`${id} is not a corner hall`);
  return createEmptyHall([id], materials);
}

/** The wall of `id` that lies on the line it shares with `other`, if any. */
const onShared = (id: MuseumHallId, other: MuseumHallId, wall: HallWall) => {
  const e = sharedWall(id, other);
  return !!e && e.axis === wall.axis && Math.abs(e.line - wall.line) < 1e-9;
};

/** The empty halls drawn in one hall's scene: its two neighbours, each on its own, and the halls beyond each. */
export interface RingShells {
  group: Group;
  /**
   * How the neighbour `to` is drawn (`neighbourDraw`): `under`, through
   * its archway, its empty hall and those beyond it standing aside;
   * `full`, by a full copy in this scene, its empty hall put away;
   * `empty`, its empty hall seen.
   */
  show(to: MuseumHallId, how: NeighbourDraw): void;
  /** The empty halls on `to`'s side: `to`'s own, and those beyond it. */
  parts(to: MuseumHallId): { near: Group; beyond: Group } | null;
  dispose(): void;
}

/**
 * Every other hall of the ring as its empty component, in the scene of
 * hall `visitor` (the owner, 2026-10-28: the hall the visitor is in and
 * its neighbours in full, every hall further away empty). Each neighbour's
 * empty hall is seen through its archway until its full room is drawn
 * there (`door-joins.ts`), and then stands aside with the halls beyond
 * it, still hiding what is behind them but drawing nothing, so the full
 * room shows through; the room drawn through the archway carries on with
 * its own empty halls beyond. Every wall is built once: a wall shared
 * with the visitor's hall by the visitor's hall itself, else by the
 * nearer of the two halls that share it.
 */
export function createRingShells(
  visitor: MuseumHallId,
  materials: EmptyHallMaterials,
): RingShells {
  const group = new Group();
  group.name = `Empty halls seen from ${visitor}`;
  const builds = (id: MuseumHallId, wall: HallWall) =>
    !MUSEUM_HALLS.some(
      (other) =>
        other !== id &&
        onShared(id, other, wall) &&
        (other === visitor ||
          ringDistance(visitor, other) < ringDistance(visitor, id)),
    );
  const [back, on] = ringNeighbours(visitor);
  const sides = new Map<MuseumHallId, EmptyHalls[]>();
  for (const [neighbour, side] of [
    [back, 'back'],
    [on, 'onward'],
  ] as const) {
    const near = createEmptyHall([neighbour], materials, builds);
    const beyond = createEmptyHall(
      MUSEUM_HALLS.filter(
        (h) => ringDistance(visitor, h) > 1 && ringSide(visitor, h) === side,
      ),
      materials,
      builds,
      `Empty halls beyond ${neighbour}`,
    );
    group.add(near.group, beyond.group);
    sides.set(neighbour, [near, beyond]);
  }
  return {
    group,
    show(to, how) {
      const [near, beyond] = sides.get(to) ?? [];
      if (!near || !beyond) return;
      near.setOccluding(how === 'under');
      beyond.setOccluding(how === 'under');
      near.group.visible = how !== 'full';
    },
    parts(to) {
      const [near, beyond] = sides.get(to) ?? [];
      return near && beyond ? { near: near.group, beyond: beyond.group } : null;
    },
    dispose() {
      for (const list of sides.values()) for (const h of list) h.dispose();
    },
  };
}
