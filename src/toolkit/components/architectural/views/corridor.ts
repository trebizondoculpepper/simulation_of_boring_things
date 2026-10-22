import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Shape,
  TorusGeometry,
  Vector2,
} from 'three';
import type { Material } from 'three';
import { COVE_RADIUS, coveStrip } from './room-coves';
import { createRotunda } from './rotunda';
import { flight, pieceLength, STAIR } from '../logic/corridor-path';
import type { PlacedPiece } from '../logic/corridor-path';

/**
 * The game's corridor (`AGENTS.md`): 1.2 m wide, 2.5 m tall, rectangular,
 * every junction of wall and floor or wall and ceiling filleted, so that
 * any two corridors join. Built along +x from 0 to `length`, its floor at
 * y = 0, its middle on z = 0; its walls `WALL` thick outside that. Its
 * ends are open, to be joined. One wall may have round windows through
 * it (the Olympic pool's viewing gallery's, into the water): `windows`
 * on the +z wall, which is then `windows.thick` thick. The other (−z)
 * wall may have doorways through it to the floor (`doorways`: each one's
 * middle along x, its width and its height), its floor fillet stopping
 * either side of each, turned round the jambs' corners.
 */
export const CORRIDOR = { width: 1.2, height: 2.5, wall: 0.2 } as const;

export interface CorridorWindows {
  /** Their middles along x, their radius, and their middles' height. */
  at: readonly number[];
  r: number;
  y: number;
  /** The windowed wall's thickness. */
  thick: number;
  /**
   * What its far face is finished in, if not the corridor's: a skin, the
   * windows cut through it too (the pool's own wet tile, in the gallery).
   */
  farFace?: Material;
}

export interface CorridorDoorway {
  at: number;
  w: number;
  h: number;
}

export function createCorridor(
  length: number,
  material: Material,
  {
    windows,
    ceiling = material,
    doorways = [],
  }: {
    windows?: CorridorWindows;
    ceiling?: Material;
    doorways?: readonly CorridorDoorway[];
  } = {},
) {
  const group = new Group();
  group.name = 'corridor';
  const { width, height, wall } = CORRIDOR;
  const hw = width / 2;
  const box = (
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const mid = length / 2;
  box(material, length, wall, width + 2 * wall, mid, -wall / 2, 0);
  box(ceiling, length, wall, width + 2 * wall, mid, height + wall / 2, 0);
  // The −z wall, in runs between its doorways, a head over each.
  const cuts = [...doorways].sort((a, b) => a.at - b.at);
  const runs: [number, number][] = [];
  let start = 0;
  for (const d of cuts) {
    runs.push([start, d.at - d.w / 2]);
    start = d.at + d.w / 2;
  }
  runs.push([start, length]);
  for (const [a, b] of runs)
    box(material, b - a, height, wall, (a + b) / 2, height / 2, -hw - wall / 2);
  for (const d of cuts)
    box(
      material,
      d.w,
      height - d.h,
      wall,
      d.at,
      (height + d.h) / 2,
      -hw - wall / 2,
    );
  if (windows) {
    // The windowed wall, drawn in its own plane (x along, y up) and
    // pushed out to +z.
    const face = new Shape();
    face.moveTo(0, 0);
    face.lineTo(length, 0);
    face.lineTo(length, height);
    face.lineTo(0, height);
    face.closePath();
    for (const x of windows.at)
      face.holes.push(
        new Path().absarc(x, windows.y, windows.r, 0, Math.PI * 2, true),
      );
    const wallMesh = new Mesh(
      new ExtrudeGeometry(face, {
        depth: windows.thick,
        bevelEnabled: false,
        curveSegments: 32,
      }).translate(0, 0, hw),
      material,
    );
    group.add(wallMesh);
    if (windows.farFace) {
      const skin = new Mesh(
        new ExtrudeGeometry(face, {
          depth: 0.004,
          bevelEnabled: false,
          curveSegments: 32,
        }).translate(0, 0, hw + windows.thick - 0.002),
        windows.farFace,
      );
      skin.name = 'corridor window wall far face';
      group.add(skin);
    }
    // Each window: thick glass, a stainless ring on the corridor's face.
    const glass = new MeshPhysicalMaterial({
      color: '#bfe9ea',
      transparent: true,
      opacity: 0.18,
      roughness: 0.05,
      side: DoubleSide,
      depthWrite: false,
    });
    const steel = new MeshStandardMaterial({
      color: '#c9cdcf',
      metalness: 0.9,
      roughness: 0.25,
    });
    for (const x of windows.at) {
      const pane = new Mesh(new CircleGeometry(windows.r, 40), glass);
      pane.name = 'gallery window glass';
      pane.position.set(x, windows.y, hw + windows.thick / 2);
      group.add(pane);
      const ring = new Mesh(
        new TorusGeometry(windows.r + 0.03, 0.035, 10, 48),
        steel,
      );
      ring.position.set(x, windows.y, hw + 0.01);
      group.add(ring);
    }
  } else box(material, length, height, wall, mid, height / 2, hw + wall / 2);
  // The fillets, along all four junctions: turned, never mirrored.
  const r = COVE_RADIUS;
  for (const [y, z, turn] of [
    [0, hw, 0],
    [0, -hw, Math.PI / 2],
    [height, -hw, Math.PI],
    [height, hw, -Math.PI / 2],
  ] as const) {
    // The −z wall's foot, only along its runs.
    const along = y === 0 && z < 0 ? runs : ([[0, length]] as const);
    for (const [a, b] of along) {
      if (b - a <= 0) continue;
      // The strip runs along z, its faces along +x and +y: laid along x it
      // fits the +z wall's foot; turned about x, each other junction.
      const fillet = new Mesh(
        coveStrip(b - a, r)
          .rotateY(Math.PI / 2)
          .rotateX(turn)
          .translate((a + b) / 2, y, z),
        material,
      );
      fillet.name = 'corridor fillet';
      group.add(fillet);
    }
  }
  // At each doorway's jambs, the floor fillet turned round the corner.
  for (const d of cuts)
    for (const [x, phi] of [
      [d.at - d.w / 2, 0],
      [d.at + d.w / 2, -Math.PI / 2],
    ] as const) {
      const corner = createCornerFillet(material, phi);
      corner.position.set(x, 0, -hw);
      group.add(corner);
    }
  return group;
}

/**
 * A turn, left or right, of the corridor's section: a 1.2 m square, built
 * heading east (+x) with its entry's middle at the origin, leaving north
 * (−z) for a left turn and south (+z) for a right. Its outer wall is a
 * quarter round about the inner corner, so the floor's and ceiling's
 * fillets sweep round it unbroken; at the inner corner, where the two
 * runs' inside walls meet, their fillets are joined by a quarter turned
 * about the corner.
 */
export function createCorridorTurn(side: 'left' | 'right', material: Material) {
  const group = new Group();
  group.name = `corridor ${side} turn`;
  const { width: R, height: H } = CORRIDOR;
  const hw = R / 2;
  const c = COVE_RADIUS;
  // The inner corner, and the quarter of directions from it the turn fills
  // (a lathe's angle: x = r sin φ, z = r cos φ).
  const pz = side === 'left' ? -hw : hw;
  const phiStart = side === 'left' ? 0 : Math.PI / 2;
  const quarter = Math.PI / 2;
  const turned = (points: readonly (readonly [number, number])[]) => {
    const mesh = new Mesh(
      new LatheGeometry(
        points.map(([r, y]) => new Vector2(r, y)),
        16,
        phiStart,
        quarter,
      ),
      material,
    );
    mesh.position.set(0, 0, pz);
    group.add(mesh);
    return mesh;
  };
  const arc = (
    centre: readonly [number, number],
    r: number,
    from: number,
    to: number,
  ) =>
    Array.from({ length: 9 }, (_, i) => {
      const t = from + ((to - from) * i) / 8;
      return [
        centre[0] + r * Math.cos(t),
        centre[1] + r * Math.sin(t),
      ] as const;
    });
  // The floor and ceiling, quarter discs, and the outer wall between their
  // fillets, all one turned section.
  turned([
    [0, 0],
    [R - c, 0],
    ...arc([R - c, c], c, -Math.PI / 2, 0),
    [R, H - c],
    ...arc([R - c, H - c], c, 0, Math.PI / 2),
    [0, H],
  ]);
  // The inner corner's fillets, at the floor and the ceiling.
  turned(arc([c, c], c, Math.PI, (3 * Math.PI) / 2).reverse());
  turned(arc([c, H - c], c, Math.PI / 2, Math.PI));
  return group;
}

/**
 * A flight of stairs of the corridor's section, built rising east (+x)
 * from its foot at the origin: `steps` treads of `going`, each `riser`
 * up, the first riser at the foot; tiled treads filleted to the walls;
 * walls and a ceiling that rise with the pitch, so the headroom is the
 * corridor's all the way up; a stainless handrail on the south (+z) wall.
 * Going down is the same flight met from its head (`createCorridorRun`
 * turns it round).
 */
export function createCorridorStairs(
  steps: number,
  riser: number,
  going: number,
  material: Material,
) {
  const group = new Group();
  group.name = 'corridor stairs';
  const { width, height: H, wall } = CORRIDOR;
  const hw = width / 2;
  const L = steps * going;
  const rise = steps * riser;
  const pitch = Math.atan2(rise, L);
  const slant = Math.hypot(L, rise);
  // The treads, each a block from under the floor up to its top.
  for (let k = 0; k < steps; k++) {
    const top = (k + 1) * riser;
    const tread = new Mesh(new BoxGeometry(going, top + wall, width), material);
    tread.position.set((k + 0.5) * going, (top - wall) / 2, 0);
    group.add(tread);
    // Each tread's fillets along both walls.
    for (const [z, turn] of [
      [hw, 0],
      [-hw, Math.PI / 2],
    ] as const) {
      const fillet = new Mesh(
        coveStrip(going)
          .rotateY(Math.PI / 2)
          .rotateX(turn)
          .translate((k + 0.5) * going, top, z),
        material,
      );
      fillet.name = 'stair fillet';
      group.add(fillet);
    }
  }
  // The walls, drawn in their plane (x along, y up): from under the floor
  // to over the ceiling, which rises from H at the foot to H + rise.
  const face = new Shape();
  face.moveTo(0, -wall);
  face.lineTo(L, -wall);
  face.lineTo(L, rise + H + wall);
  face.lineTo(0, H + wall);
  face.closePath();
  for (const z of [hw, -hw - wall]) {
    const side = new Mesh(
      new ExtrudeGeometry(face, { depth: wall, bevelEnabled: false }).translate(
        0,
        0,
        z,
      ),
      material,
    );
    group.add(side);
  }
  // The ceiling, on the pitch, and its fillets along both walls.
  const ceiling = new Mesh(
    new BoxGeometry(slant, wall, width + 2 * wall),
    material,
  );
  ceiling.rotation.z = pitch;
  // Laid on the pitch, its underside through the slope's line.
  ceiling.position.set(
    L / 2 - (wall / 2) * Math.sin(pitch),
    H + rise / 2 + (wall / 2) * Math.cos(pitch),
    0,
  );
  group.add(ceiling);
  for (const [z, turn] of [
    [-hw, Math.PI],
    [hw, -Math.PI / 2],
  ] as const) {
    const fillet = new Mesh(
      coveStrip(slant)
        .rotateY(Math.PI / 2)
        .rotateX(turn)
        .rotateZ(pitch)
        .translate(L / 2, H + rise / 2, z),
      material,
    );
    fillet.name = 'stair ceiling fillet';
    group.add(fillet);
  }
  // A handrail at 0.9 m over the nosings, on brackets from the south wall.
  const steel = new MeshStandardMaterial({
    color: '#c9cdcf',
    metalness: 0.9,
    roughness: 0.25,
  });
  const rail = new Mesh(
    new CylinderGeometry(0.021, 0.021, slant, 12).rotateZ(Math.PI / 2),
    steel,
  );
  rail.rotation.z = pitch;
  rail.position.set(L / 2, 0.9 + rise / 2 + riser / 2, hw - 0.07);
  group.add(rail);
  for (const t of [0.1, 0.5, 0.9]) {
    const bracket = new Mesh(new BoxGeometry(0.02, 0.02, 0.07), steel);
    bracket.position.set(L * t, 0.9 + rise * t + riser / 2, hw - 0.035);
    group.add(bracket);
  }
  return group;
}

/**
 * A whole corridor from its laid-out pieces (`logic/corridor-path.ts`):
 * straights and turns, each set in its place and turned to its heading.
 */
export function createCorridorRun(
  placed: readonly PlacedPiece[],
  material: Material,
  /** Where pieces with working parts (the rotunda's spurs) put them. */
  parts?: Parameters<typeof createRotunda>[2],
) {
  const group = new Group();
  group.name = 'corridor run';
  for (const p of placed) {
    const piece =
      p.piece.kind === 'straight'
        ? createCorridor(p.piece.length, material)
        : p.piece.kind === 'stairs'
          ? (() => {
              const f = flight(p.piece.rise);
              return createCorridorStairs(
                f.steps,
                f.riser,
                STAIR.going,
                material,
              );
            })()
          : p.piece.kind === 'rotunda'
            ? createRotunda(material, undefined, parts)
            : createCorridorTurn(p.piece.kind, material);
    piece.position.set(p.x, p.y, p.z);
    piece.rotation.y = p.yaw;
    // A flight down is the flight up, met from its head: turned round, its
    // foot at the far end, a flight's rise below.
    if (p.piece.kind === 'stairs' && p.piece.rise < 0) {
      const length = pieceLength(p.piece);
      piece.position.set(
        p.x + Math.cos(p.yaw) * length,
        p.y + p.piece.rise,
        p.z - Math.sin(p.yaw) * length,
      );
      piece.rotation.y = p.yaw + Math.PI;
    }
    group.add(piece);
  }
  return group;
}

/**
 * The fillet round the foot of a convex corner, where two walls' fillets
 * meet at an outside corner (a doorway's jamb, a turn's inner corner):
 * the cove's section turned a quarter about the corner's upright, from
 * `phiStart` (a lathe's angle: x = r sin φ, z = r cos φ). At the origin,
 * on the floor.
 */
export function createCornerFillet(material: Material, phiStart: number) {
  const c = COVE_RADIUS;
  const points = Array.from({ length: 9 }, (_, i) => {
    const t = Math.PI + ((Math.PI / 2) * i) / 8;
    return new Vector2(c + c * Math.cos(t), c + c * Math.sin(t));
  }).reverse();
  const mesh = new Mesh(
    new LatheGeometry(points, 12, phiStart, Math.PI / 2),
    material,
  );
  mesh.name = 'corner fillet';
  return mesh;
}
