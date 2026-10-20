import { expect, it } from 'vite-plus/test';
import { createColumnCove } from './column-cove';

it('wraps all four column faces and corners with an outward-facing floor cove', () => {
  const geometry = createColumnCove(0.6, 0.14);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  expect(bounds.min.x).toBeCloseTo(-0.44);
  expect(bounds.max.x).toBeCloseTo(0.44);
  expect(bounds.min.z).toBeCloseTo(-0.44);
  expect(bounds.max.z).toBeCloseTo(0.44);
  expect(bounds.min.y).toBeCloseTo(0);
  expect(bounds.max.y).toBeCloseTo(0.14);
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  for (let i = 0; i < position.count; i++) {
    expect(normal.getY(i)).toBeGreaterThanOrEqual(-0.001);
    expect(
      normal.getX(i) * position.getX(i) + normal.getZ(i) * position.getZ(i),
    ).toBeGreaterThanOrEqual(-0.001);
  }
  geometry.dispose();
});
