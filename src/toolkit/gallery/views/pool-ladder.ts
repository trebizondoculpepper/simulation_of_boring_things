import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import type { LadderZone } from '../../controls/logic/ladder-zone';

/**
 * A deck-mounted stainless pool ladder, as on most pools: two 42 mm grab
 * rails anchored in the deck behind the edge, arching up over it and
 * straight down into the water close to the pool's wall, with treads
 * between them under the water. Metres, in its own frame: the pool's edge
 * along z at x = 0, the water toward +x, the deck at y = 0; `depth` the
 * pool's depth there.
 */
export function createPoolLadder(depth: number, width = 0.5) {
  const group = new Group();
  group.name = 'pool ladder';
  group.userData.ladderDepth = depth;
  const steel = new MeshStandardMaterial({
    color: '#d6dcdd',
    metalness: 0.9,
    roughness: 0.18,
  });
  // Each rail's line: from its deck anchor, up, over the edge, and down to
  // a little above the pool's floor.
  const out = 0.16;
  const rail = new CatmullRomCurve3(
    [
      [-0.36, 0],
      [-0.36, 0.5],
      [-0.3, 0.78],
      [-0.12, 0.9],
      [0.06, 0.86],
      [out, 0.66],
      [out, 0.35],
      [out, 0],
      [out, -depth + 0.12],
    ].map(([x, y]) => new Vector3(x, y, 0)),
    false,
    'catmullrom',
    0.2,
  );
  for (const z of [-width / 2, width / 2]) {
    const tube = new Mesh(new TubeGeometry(rail, 64, 0.021, 10), steel);
    tube.name = 'pool ladder rail';
    tube.position.z = z;
    // The anchor's cover plate on the deck.
    const plate = new Mesh(
      new CylinderGeometry(0.045, 0.045, 0.008, 20),
      steel,
    );
    plate.name = 'pool ladder anchor plate';
    plate.position.set(-0.36, 0.004, z);
    group.add(tube, plate);
  }
  // Treads, every 0.27 m down from just under the water's surface.
  for (let y = -0.25; y > -depth + 0.15; y -= 0.27) {
    const tread = new Mesh(new BoxGeometry(0.075, 0.025, width), steel);
    tread.name = 'pool ladder tread';
    tread.position.set(out - 0.01, y, 0);
    group.add(tread);
  }
  return group;
}

/** Match every visible pool ladder to the shared Use/W/S movement model. */
export function poolLadderZones(
  root: Group,
  floorAt: (x: number, z: number) => number,
): LadderZone[] {
  root.updateWorldMatrix(true, true);
  const zones: LadderZone[] = [];
  root.traverse((object) => {
    if (object.name !== 'pool ladder') return;
    const depth = object.userData.ladderDepth as number | undefined;
    if (depth === undefined) return;
    const point = (x: number) => {
      const p = object.localToWorld(new Vector3(x, 0, 0));
      return { x: p.x, z: p.z };
    };
    const bottomExit = point(0.42);
    const topExit = point(-0.46);
    const rung = point(0.16);
    const baseY = object.localToWorld(new Vector3()).y;
    const lower = floorAt(bottomExit.x, bottomExit.z);
    zones.push({
      minX: Math.min(bottomExit.x, topExit.x) - 0.3,
      maxX: Math.max(bottomExit.x, topExit.x) + 0.3,
      minZ: Math.min(bottomExit.z, topExit.z) - 0.3,
      maxZ: Math.max(bottomExit.z, topExit.z) + 0.3,
      bottom: Number.isFinite(lower) ? lower : baseY - depth,
      top: baseY,
      bottomExit,
      topExit,
      rung,
    });
  });
  return zones;
}
