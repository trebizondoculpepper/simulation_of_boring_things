import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { SECTION } from '../logic/edge-profiles';
import type { EdgeProfile, Point } from '../logic/edge-profiles';
import { sweepProfile } from './profile-sweep';
import { insetPolygon, trimPath } from '../logic/plan-path';

/**
 * A pool edge built full size (`edge-profiles.ts`): its profile swept
 * along `path` in plan (`profile-sweep.ts`), mitred at the corners, its
 * cut ends in raw concrete, the pool-facing and deck surfaces in `tile`,
 * the water at its level (the pool's, and any lying in the gutter), and
 * the grating over its channel. The deck's level is y = 0; the deck lies
 * to the path's right as it is walked, the pool to its left.
 */

export type PlanPath = readonly (readonly [number, number])[];

/** A straight run, 1.4 m, along −z. */
export const STRAIGHT: PlanPath = [
  [0, 0.7],
  [0, -0.7],
];

/**
 * A stepped run: an edge, a concave corner (the deck juts into the pool:
 * the water's outline turns through 270°), more edge, a convex corner
 * (the pool's ordinary corner), and edge again.
 */
export const STEPPED: PlanPath = [
  [0, 1.5],
  [0, 0],
  [1.5, 0],
  [1.5, -1.5],
];

export function createPoolEdge(
  kit: PanelKit,
  profile: EdgeProfile,
  tile: Material,
  path: PlanPath = STRAIGHT,
  /** How far below the deck the plinth reaches (to the floor), metres. */
  plinth = 0,
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `Pool edge: ${profile.era} ${profile.name}`;
  const twoSided = (m: Material) => {
    m.side = DoubleSide;
    return m;
  };
  const concrete = twoSided(t.paint('#a3a198', 0.95));
  twoSided(tile);
  // The section's back, underside and the pool floor's far end are cut,
  // like its ends.
  const bottom = -SECTION.depth - SECTION.slab;
  const cut = (a: Point, b: Point) =>
    (a[0] === b[0] && (a[0] === SECTION.deck || a[0] === -SECTION.pool)) ||
    (a[1] === b[1] && a[1] === bottom);
  group.add(new Mesh(sweepProfile(profile.solid, path, cut), [tile, concrete]));
  // The water, glassy and clear.
  const water = new MeshStandardMaterial({
    color: '#3fb3c8',
    roughness: 0.04,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: DoubleSide,
  });
  kit.materials.push(water);
  // Each water shape a millimetre clear of the tiles and cut ends it lies
  // against, so the surfaces never share a plane and flicker.
  const clear = 0.001;
  const waterPath = trimPath(path, clear);
  for (const w of profile.water) {
    const mesh = new Mesh(
      sweepProfile(insetPolygon(w, clear), waterPath),
      water,
    );
    mesh.renderOrder = 1;
    group.add(mesh);
  }
  const rect = (
    from: number,
    to: number,
    bottom: number,
    top: number,
  ): Point[] => [
    [from, bottom],
    [to, bottom],
    [to, top],
    [from, top],
  ];
  const g = profile.grating;
  if (g) {
    // Its frame and the dark of the channel under it, swept round the
    // corners; the bars across it on the straight runs.
    const under = twoSided(t.paint('#2c3133', 0.8));
    group.add(
      new Mesh(
        sweepProfile(
          rect(g.from, g.to, g.top - g.depth, g.top - g.depth + 0.004),
          path,
        ),
        under,
      ),
    );
    const bar = twoSided(t.paint(g.colour, 0.45));
    for (const edge of [g.from, g.to - 0.012])
      group.add(
        new Mesh(
          sweepProfile(rect(edge, edge + 0.012, g.top - g.depth, g.top), path),
          bar,
        ),
      );
    // A mitred corner piece over each corner, as the gratings are made.
    const clear = g.to + 0.02;
    for (let i = 1; i < path.length - 1; i++) {
      const at = (j: number, toward: number) => {
        const [ax, az] = path[i],
          [bx, bz] = path[j];
        const len = Math.hypot(bx - ax, bz - az);
        return [
          ax + ((bx - ax) / len) * toward,
          az + ((bz - az) / len) * toward,
        ] as const;
      };
      const piece = [at(i - 1, clear), path[i], at(i + 1, clear)];
      group.add(
        new Mesh(
          sweepProfile(
            rect(g.from + 0.012, g.to - 0.012, g.top - 0.008, g.top),
            piece,
          ),
          bar,
        ),
      );
    }
    const geometry = new BoxGeometry(g.to - g.from - 0.024, g.depth, g.bar);
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i],
        [bx, bz] = path[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / len,
        dz = (bz - az) / len;
      const nx = -dz,
        nz = dx;
      // Clear of the mitred corners, where only the frame runs.
      const start = i > 0 ? g.to + 0.02 : g.pitch / 2;
      const end = i < path.length - 2 ? len - g.to - 0.02 : len - g.pitch / 2;
      for (let s = start; s <= end; s += g.pitch) {
        const mesh = new Mesh(geometry, bar);
        const across = (g.from + g.to) / 2;
        mesh.position.set(
          ax + dx * s + nx * across,
          g.top - g.depth / 2,
          az + dz * s + nz * across,
        );
        mesh.rotation.y = Math.atan2(-nz, nx);
        group.add(mesh);
      }
    }
  }
  if (profile.marker)
    group.add(
      new Mesh(
        sweepProfile(
          rect(profile.marker.from, profile.marker.to, 0, 0.003),
          path,
        ),
        twoSided(t.paint(profile.marker.colour, 0.3)),
      ),
    );
  if (plinth > 0)
    group.add(
      new Mesh(
        sweepProfile(rect(-SECTION.pool, SECTION.deck, -plinth, bottom), path),
        twoSided(t.paint('#3a3d40', 0.8)),
      ),
    );
  return group;
}

/** The section's span across, metres: from the pool's far side to the deck's end. */
export const EDGE_SPAN = { from: -SECTION.pool, to: SECTION.deck };
