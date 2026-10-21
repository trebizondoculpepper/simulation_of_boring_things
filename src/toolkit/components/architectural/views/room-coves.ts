import {
  Curve,
  ExtrudeGeometry,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';

/**
 * Coved junctions for tiled pool rooms: a concave quarter-round fillet
 * wherever an upright wall meets another or meets the deck, so no corner
 * in the room is sharp. The new pool rooms are coved by default
 * (`CLAUDE.md`). Metres.
 */

/** The fillet's radius in the new pool rooms. */
export const COVE_RADIUS = 0.25;

/**
 * The fillet's section, in its own plane: the corner at the origin, one
 * face along +x and the other along +y, the quarter round between them.
 */
export function coveProfile(r: number = COVE_RADIUS) {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(r, 0);
  s.absarc(r, r, r, -Math.PI / 2, Math.PI, true);
  s.lineTo(0, 0);
  return s;
}

/** A straight fillet `length` long along z, centred on z = 0. */
export function coveStrip(length: number, r: number = COVE_RADIUS) {
  return new ExtrudeGeometry(coveProfile(r), {
    depth: length,
    bevelEnabled: false,
    curveSegments: 8,
  }).translate(0, 0, -length / 2);
}

export interface CovedBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** The deck's level, and the walls' top. */
  floorY: number;
  height: number;
}

/**
 * Cove a rectangular room inside: a fillet along the foot of each wall,
 * one up each corner, and where three meet, an eighth of a sphere, so the
 * junctions run into each other with no seam or gap.
 */
export function addBoxRoomCoves(
  parent: Object3D,
  material: Material,
  room: CovedBox,
  r: number = COVE_RADIUS,
) {
  const { minX, maxX, minZ, maxZ, floorY, height } = room;
  const add = (geometry: BufferGeometry, name: string) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const alongX = maxX - minX - 2 * r;
  const alongZ = maxZ - minZ - 2 * r;
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  // Along the foot of each wall: the profile's x into the room, y up.
  add(coveStrip(alongZ, r).translate(minX, floorY, midZ), 'cove west wall');
  add(
    coveStrip(alongZ, r).rotateY(Math.PI).translate(maxX, floorY, midZ),
    'cove east wall',
  );
  add(
    coveStrip(alongX, r)
      .rotateY(-Math.PI / 2)
      .translate(midX, floorY, minZ),
    'cove north wall',
  );
  add(
    coveStrip(alongX, r)
      .rotateY(Math.PI / 2)
      .translate(midX, floorY, maxZ),
    'cove south wall',
  );
  addCornerCoves(parent, material, room, floorY + r, height, r);
  for (const [x, z, sx, sz, turn] of CORNERS(room)) {
    // The corner's foot: the eighth of a sphere the three fillets share,
    // the part toward the corner and the floor.
    add(
      new SphereGeometry(
        r,
        10,
        6,
        -Math.PI / 2,
        Math.PI / 2,
        Math.PI / 2,
        Math.PI / 2,
      )
        .rotateY(turn)
        .translate(x + sx * r, floorY + r, z + sz * r),
      'cove corner foot',
    );
  }
}

/**
 * The room's inside corners: where, which way into the room (sx, sz), and
 * the turn about y that takes the north-west corner's pieces there. The
 * pieces are turned, never mirrored: a mirror turns a mesh inside out.
 */
const CORNERS = ({ minX, maxX, minZ, maxZ }: CovedBox) =>
  [
    [minX, minZ, 1, 1, 0],
    [maxX, minZ, -1, 1, -Math.PI / 2],
    [maxX, maxZ, -1, -1, Math.PI],
    [minX, maxZ, 1, -1, Math.PI / 2],
  ] as const;

/**
 * Fillets up a rectangular room's four inside corners, from `from` to
 * `to`: for a room whose walls change finish part of the way up.
 */
export function addCornerCoves(
  parent: Object3D,
  material: Material,
  room: CovedBox,
  from: number,
  to: number,
  r: number = COVE_RADIUS,
) {
  const rise = to - from;
  for (const [x, z, , , turn] of CORNERS(room)) {
    // The profile laid flat, its faces along the walls.
    const mesh = new Mesh(
      coveStrip(rise, r)
        .rotateX(Math.PI / 2)
        .rotateY(turn)
        .translate(x, from + rise / 2, z),
      material,
    );
    mesh.name = 'cove corner';
    parent.add(mesh);
  }
}

/**
 * A fillet round the foot of a round column of `radius`, standing on the
 * deck at `floorY`.
 */
export function addColumnFootCove(
  parent: Object3D,
  material: Material,
  radius: number,
  floorY: number,
  r: number = COVE_RADIUS,
) {
  const points: Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    // From the column's face down to the deck, round the fillet's centre.
    points.push(
      new Vector2(radius + r - r * Math.cos(t), floorY + r - r * Math.sin(t)),
    );
  }
  const mesh = new Mesh(new LatheGeometry(points, 96), material);
  mesh.name = 'cove column foot';
  parent.add(mesh);
  return mesh;
}

/** A path in plan (x, z) lifted to a level `y`, as a 3D curve. */
class LevelCurve extends Curve<Vector3> {
  constructor(
    private readonly path: Path,
    private readonly y: number,
  ) {
    super();
  }
  override getPoint(t: number, target = new Vector3()) {
    const p = this.path.getPointAt(t);
    return target.set(p.x, this.y, p.y);
  }
}

/**
 * The stainless tile trim where a room's tiling stops part of the way up
 * its walls (`y`): a 12.5 mm quadrant strip bedded under the last row
 * of tiles, its round nose over their cut edge, running round the walls
 * and round the coves in the corners. `trim` its material.
 */
export function addTileEdgeTrim(
  parent: Object3D,
  trim: Material,
  room: CovedBox,
  y: number,
  r: number = COVE_RADIUS,
) {
  const { minX, maxX, minZ, maxZ } = room;
  // The tiled face's line in plan: the walls, rounded at each corner by
  // the cove's curve.
  const path = new Path();
  path.moveTo(minX + r, minZ);
  path.lineTo(maxX - r, minZ);
  path.absarc(maxX - r, minZ + r, r, -Math.PI / 2, 0, false);
  path.lineTo(maxX, maxZ - r);
  path.absarc(maxX - r, maxZ - r, r, 0, Math.PI / 2, false);
  path.lineTo(minX + r, maxZ);
  path.absarc(minX + r, maxZ - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(minX, minZ + r);
  path.absarc(minX + r, minZ + r, r, Math.PI, (3 * Math.PI) / 2, false);
  const length = path.getLength();
  const mesh = new Mesh(
    new TubeGeometry(
      new LevelCurve(path, y),
      Math.ceil(length / 0.05),
      0.0125,
      8,
      true,
    ),
    trim,
  );
  mesh.name = 'tile edge trim';
  parent.add(mesh);
  return mesh;
}

/** The same trim as a ring round a round column of `radius`, at `y`. */
export function addColumnTileTrim(
  parent: Object3D,
  trim: Material,
  radius: number,
  y: number,
) {
  const mesh = new Mesh(new TorusGeometry(radius, 0.0125, 8, 128), trim);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  mesh.name = 'column tile edge trim';
  parent.add(mesh);
  return mesh;
}

/** Brushed stainless steel, for tile trims. */
export const tileTrimSteel = () =>
  new MeshStandardMaterial({
    color: '#dfe3e5',
    metalness: 0.55,
    roughness: 0.32,
  });
