import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createMeshCagePart } from '../../architectural/parts/mesh-cage';
import type { MeshCagePart } from '../../architectural/parts/mesh-cage';
import type { MeshCageSpec } from '../../architectural/logic/mesh-cage';
import { createLpgCylinder } from '../views/yard-kit';

/** The propane cage: 1.5 × 0.8 × 1.8 m, its door the middle of its front. */
export const LPG_CAGE_SPEC: MeshCageSpec = {
  w: 1.5,
  d: 0.8,
  h: 1.8,
  door: { side: 'front', at: 0, width: 0.7, hinge: 'left', opens: 'out' },
  roof: true,
  base: 'plates',
};

/**
 * A locked mesh cage of forklift propane cylinders (18 kg, the forklift
 * kind, red), the spent ones for collection: the shared welded-mesh cage
 * (`architectural/parts/mesh-cage.ts`), its door working, its sign on the
 * door. Origin on the floor at its middle, its front facing +z.
 */
export function createLpgCagePart(kit: PanelKit): MeshCagePart {
  const part = createMeshCagePart(kit, LPG_CAGE_SPEC, {
    name: 'LPG cylinder cage',
  });
  const D = LPG_CAGE_SPEC.d;
  // The cylinders: two rows of three, each turned as a real 18 kg forklift
  // cylinder is (the owner, 2026-10-26: the first were terrible).
  for (let i = 0; i < 6; i++) {
    const c = createLpgCylinder(kit, i);
    c.position.set(
      -0.45 + (i % 3) * 0.45,
      0.01,
      i < 3 ? -D / 4 + 0.02 : D / 4 - 0.07,
    );
    c.rotation.y = i * 1.3;
    part.object.add(c);
  }
  const sign = createMicroLabel(
    kit,
    'LPG · HIGHLY FLAMMABLE\nNO SMOKING · EMPTIES',
    {
      height: 0.05,
      ink: '#111111',
      plate: '#e0b81c',
    },
  );
  sign.position.set(LPG_CAGE_SPEC.door.width / 2, 1.45, 0.015);
  part.view.doorLeaf.add(sign);
  return part;
}
