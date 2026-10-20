import {
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { SECTION } from '../logic/edge-profiles';
import type { EdgeProfile, Point } from '../logic/edge-profiles';

/**
 * A pool edge built as a full-size cut-away (`edge-profiles.ts`): its
 * profile extruded `length` metres along the edge, the cut face toward
 * +z in raw concrete, the pool-facing and deck surfaces in `tile`, the
 * water in it at its level (the pool's, and any lying in the gutter), and
 * the grating over its channel. The deck's level is y = 0, the wall's
 * face x = 0, the pool toward −x.
 */
export function createPoolEdge(
  kit: PanelKit,
  profile: EdgeProfile,
  tile: Material,
  length = 1.4,
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `Pool edge: ${profile.era} ${profile.name}`;
  const outline = (points: readonly Point[]) => {
    const shape = new Shape();
    points.forEach(([x, y], i) =>
      i ? shape.lineTo(x, y) : shape.moveTo(x, y),
    );
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, -length / 2);
    return geometry;
  };
  // The structure: its cut faces concrete, the rest tiled.
  const concrete = t.paint('#a3a198', 0.95);
  group.add(new Mesh(outline(profile.solid), [concrete, tile]));
  // The water, glassy and clear.
  const water = new MeshStandardMaterial({
    color: '#3fb3c8',
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  kit.materials.push(water);
  for (const w of profile.water) {
    const mesh = new Mesh(outline(w), water);
    mesh.renderOrder = 1;
    group.add(mesh);
  }
  // The grating: bars across the channel, at their pitch along the edge.
  const g = profile.grating;
  if (g) {
    const bar = t.paint(g.colour, 0.45);
    const span = g.to - g.from;
    const geometry = new BoxGeometry(span, g.depth, g.bar);
    const bars = Math.floor(length / g.pitch);
    for (let i = 0; i < bars; i++) {
      const mesh = new Mesh(geometry, bar);
      mesh.position.set(
        (g.from + g.to) / 2,
        g.top - g.depth / 2,
        -length / 2 + g.pitch / 2 + i * g.pitch,
      );
      group.add(mesh);
    }
    // Its two side rails.
    for (const x of [g.from + 0.006, g.to - 0.006])
      t.box(group, bar, 0.012, g.depth, length, x, g.top - g.depth / 2, 0);
  }
  if (profile.marker)
    t.box(
      group,
      t.paint(profile.marker.colour, 0.3),
      profile.marker.to - profile.marker.from,
      0.003,
      length,
      (profile.marker.from + profile.marker.to) / 2,
      0.0015,
      0,
    );
  return group;
}

/** The section's span across, metres: from the pool's far side to the deck's end. */
export const EDGE_SPAN = { from: -SECTION.pool, to: SECTION.deck };
