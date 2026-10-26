import { Group, LatheGeometry, Mesh, Vector2 } from 'three';
import type { Material } from 'three';

/** An open annular inlet, mouth at y=0 and pipe neck below it. No disc across the bore. */
export function createPipeBellmouth(
  material: Material,
  od: number,
  radius: number,
  depth: number,
) {
  const group = new Group();
  group.name = 'Open pipe bellmouth';
  const wall = 0.008;
  const points = [
    [od / 2, -depth],
    [radius, 0],
    [radius - wall, 0],
    [od / 2 - wall, -depth],
    [od / 2, -depth],
  ].map(([x, y]) => new Vector2(x, y));
  group.add(new Mesh(new LatheGeometry(points, 32), material));
  return group;
}
