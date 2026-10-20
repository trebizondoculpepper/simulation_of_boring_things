import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
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
  if (g) group.add(createGrating(kit, g, path));
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

/**
 * A grating over a channel: one plate swept along the path, its bars and
 * slots drawn in a texture laid along the edge, the slots cut out by its
 * transparency (so the channel and its water show through) and the bars
 * rounded and ridged for grip by its bump map. Mapped along the edge, the
 * bars fan round a mitred corner as a corner piece's do.
 */
function createGrating(
  kit: PanelKit,
  g: NonNullable<EdgeProfile['grating']>,
  path: PlanPath,
) {
  // One tile of the pattern: four bars and their slots along the edge.
  const px = 256;
  const bars = 4;
  const cell = px / bars;
  const share = g.bar / g.pitch;
  const draw = (paint: (c: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = px;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('No 2D canvas context.');
    paint(c);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    // UVs are metres: one tile spans four pitches along, and the same across.
    texture.repeat.set(1 / (g.pitch * bars), 1 / (g.pitch * bars));
    // Bars this fine shimmer at a distance unless filtered steeply.
    texture.anisotropy = 16;
    kit.textures.push(texture);
    return texture;
  };
  // Transparency: white where a bar is, black in the slots.
  const alpha = draw((c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, px, px);
    c.fillStyle = '#fff';
    for (let i = 0; i < bars; i++) c.fillRect(i * cell, 0, cell * share, px);
  });
  // Height: each bar's top rounded, with fine ridges across it for grip.
  const bump = draw((c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, px, px);
    for (let i = 0; i < bars; i++) {
      const x0 = i * cell,
        w = cell * share;
      const round = c.createLinearGradient(x0, 0, x0 + w, 0);
      round.addColorStop(0, '#303030');
      round.addColorStop(0.5, '#d8d8d8');
      round.addColorStop(1, '#303030');
      c.fillStyle = round;
      c.fillRect(x0, 0, w, px);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = 0; y < px; y += 16) c.fillRect(x0, y, w, 4);
    }
  });
  const material = new MeshStandardMaterial({
    color: g.colour,
    roughness: 0.55,
    alphaMap: alpha,
    // The slots cut by multisampled coverage, not a hard alpha test: close
    // to, crisp edges; far off, the bars blend instead of shimmering.
    alphaToCoverage: true,
    bumpMap: bump,
    bumpScale: 0.8,
    side: DoubleSide,
  });
  kit.materials.push(material);
  // A sheet at the grating's top: its bars' depth is in the bump map, so
  // the slots read as one layer rather than two.
  const plate: Point[] = [
    [g.from, g.top - 0.002],
    [g.to, g.top - 0.002],
    [g.to, g.top],
    [g.from, g.top],
  ];
  const group = new Group();
  group.name = 'Channel grating';
  group.add(new Mesh(sweepProfile(plate, path), material));
  // The channel lies in the deck's shade: a dim veil a little below the
  // bars, so the slots read dark against them, as on a real deck, while
  // the channel and its water still show through.
  const veil = new MeshStandardMaterial({
    color: '#1d2427',
    roughness: 1,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    side: DoubleSide,
  });
  kit.materials.push(veil);
  const under: Point[] = [
    [g.from, g.top - g.depth - 0.002],
    [g.to, g.top - g.depth - 0.002],
    [g.to, g.top - g.depth],
    [g.from, g.top - g.depth],
  ];
  group.add(new Mesh(sweepProfile(under, path), veil));
  return group;
}
