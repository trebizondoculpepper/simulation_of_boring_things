import { Box3, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vite-plus/test';
import {
  MUSEUM_HALLS,
  MUSEUM_WALL,
  hallBounds,
  hallInterior,
} from '../logic/museum-plan';
import type { MuseumHallId } from '../logic/museum-plan';
import {
  OCCLUDER_RENDER_ORDER,
  createEmptyHall,
  createRingShells,
} from './museum-empty-hall';
import type { EmptyHallMaterials, EmptyPart } from './museum-empty-hall';

const fakeMaterials = (): EmptyHallMaterials => {
  const parts = new Proxy({} as Record<EmptyPart, MeshBasicMaterial>, {
    get: (t, k: string) =>
      (t[k as EmptyPart] ??= new MeshBasicMaterial({ name: k })),
  });
  return { parts, occluder: new MeshBasicMaterial(), dispose() {} };
};

const box = (id: MuseumHallId) => {
  const h = createEmptyHall([id], fakeMaterials());
  h.group.updateMatrixWorld(true);
  return new Box3().setFromObject(h.group);
};

describe('the empty halls (107-1)', () => {
  it.each(MUSEUM_HALLS)(
    '%s lies wholly within its own bounds and overlaps no other hall',
    (id) => {
      const b = box(id);
      const own = hallBounds(id);
      const t = MUSEUM_WALL / 2 + 1e-6;
      expect(b.min.x).toBeGreaterThanOrEqual(own.minX - t);
      expect(b.max.x).toBeLessThanOrEqual(own.maxX + t);
      expect(b.min.z).toBeGreaterThanOrEqual(own.minZ - t);
      expect(b.max.z).toBeLessThanOrEqual(own.maxZ + t);
      for (const other of MUSEUM_HALLS) {
        if (other === id) continue;
        const r = hallInterior(other);
        const overlaps =
          b.min.x < r.maxX - 1e-6 &&
          b.max.x > r.minX + 1e-6 &&
          b.min.z < r.maxZ - 1e-6 &&
          b.max.z > r.minZ + 1e-6;
        expect(overlaps, `${id} pokes into ${other}`).toBe(false);
      }
    },
  );

  // The owner's bug (2026-10-28): from Hall 0, Halls 3 and 4 were seen
  // through Hall 9, its empty hall standing aside as a depth-only
  // occluder drawn after them. It must be drawn before anything else.
  it('an empty hall standing aside is drawn before everything else, and as built again after', () => {
    const shells = createRingShells('museum0', fakeMaterials());
    const meshesOf = () => {
      const out: Mesh[] = [];
      shells.group.traverse((o) => {
        if (o instanceof Mesh) out.push(o);
      });
      return out;
    };
    shells.show('museum9', 'under');
    const occluding = meshesOf().filter(
      (m) => m.renderOrder === OCCLUDER_RENDER_ORDER,
    );
    const seen = meshesOf().filter(
      (m) => m.renderOrder !== OCCLUDER_RENDER_ORDER,
    );
    expect(occluding.length).toBeGreaterThan(0);
    expect(seen.length).toBeGreaterThan(0);
    for (const m of seen)
      expect(m.renderOrder).toBeGreaterThan(OCCLUDER_RENDER_ORDER);
    shells.show('museum9', 'full');
    for (const m of meshesOf())
      expect(m.renderOrder).toBe(m.userData.part === 'sticker' ? 1 : 0);
  });
});
