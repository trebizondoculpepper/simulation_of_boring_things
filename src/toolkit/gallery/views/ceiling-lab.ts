import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
} from 'three';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createServiceCeiling } from '../../components/site-dressing/views/service-ceiling';
import {
  createServiceSpecimenTable,
  specimenTableFootprint,
} from '../../components/site-dressing/views/service-specimens';

/**
 * ceiling_lab: a bare industrial room for trying the procedural services
 * ceiling (set decoration: `AGENTS.md`). 20 m × 12 m, the deck's underside
 * 6 m up. The link's `seed` and `density` choose the ceiling (with no seed
 * it is seed 1), and `acoustic=1` hangs the felt grid under it. Metres, the room's middle at the origin.
 */
export const CEILING_LAB = { w: 20, d: 12, deckY: 6, wall: 0.2 } as const;
const c = CEILING_LAB;

export function ceilingLabSolids(): Footprint[] {
  const hx = c.w / 2;
  const hz = c.d / 2;
  const t = c.wall;
  return [
    { minX: -hx - t, maxX: hx + t, minZ: -hz - t, maxZ: -hz },
    { minX: -hx - t, maxX: hx + t, minZ: hz, maxZ: hz + t },
    { minX: -hx - t, maxX: -hx, minZ: -hz, maxZ: hz },
    { minX: hx, maxX: hx + t, minZ: -hz, maxZ: hz },
    specimenTableFootprint(0, 0),
  ];
}

/** The ceiling's seed and density, from the link. */
export function ceilingLabSettings(search: string) {
  const params = new URLSearchParams(search);
  const seed = Number(params.get('seed') ?? '1');
  const density = Number(params.get('density') ?? '1');
  return {
    acoustic: params.get('acoustic') === '1',
    seed: Number.isFinite(seed) ? seed : 1,
    density: Number.isFinite(density) ? Math.min(2, Math.max(0, density)) : 1,
  };
}

export function createCeilingLab(metre: number, search = '') {
  const group = new Group();
  group.name = 'ceiling_lab';
  group.scale.setScalar(metre);
  const hx = c.w / 2;
  const hz = c.d / 2;
  const box = (
    material: MeshStandardMaterial,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  // A power-floated concrete floor and painted blockwork walls.
  const floor = new MeshStandardMaterial({ color: '#8f918d', roughness: 0.55 });
  const paint = new MeshStandardMaterial({ color: '#d9d8d2', roughness: 0.85 });
  box(floor, c.w, 0.1, c.d, 0, -0.05, 0);
  const h = c.deckY + 0.2;
  box(paint, c.w + 2 * c.wall, h, c.wall, 0, h / 2, -hz - c.wall / 2);
  box(paint, c.w + 2 * c.wall, h, c.wall, 0, h / 2, hz + c.wall / 2);
  box(paint, c.wall, h, c.d, -hx - c.wall / 2, h / 2, 0);
  box(paint, c.wall, h, c.d, hx + c.wall / 2, h / 2, 0);
  const { seed, density, acoustic } = ceilingLabSettings(search);
  const { group: ceiling } = createServiceCeiling(
    { minX: -hx, maxX: hx, minZ: -hz, maxZ: hz, deckY: c.deckY },
    { seed, density, acoustic },
  );
  group.add(ceiling);
  // A table with one of each of the ceiling's parts on it.
  group.add(createServiceSpecimenTable());
  // Work lights on the walls, throwing light up into the services.
  for (const x of [-6, 0, 6])
    for (const z of [-hz + 0.6, hz - 0.6]) {
      const light = new PointLight('#fff4e2', 9 * metre * metre, 16 * metre, 2);
      light.position.set(x, 3.2, z);
      group.add(light);
    }
  return group;
}
