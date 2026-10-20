import { expect, it } from 'vite-plus/test';
import { createCrtSurface } from './crt-surface';

it('curves the tube inward at its edges with the picture following the same surface', () => {
  const tube = createCrtSurface(0.304, 0.246);
  const picture = createCrtSurface(0.276, 0.207);
  const p = tube.attributes.position;
  expect(p.getZ(0)).toBeCloseTo(-0.014);
  expect(p.getZ(71)).toBeCloseTo(0);
  expect(picture.attributes.position.getZ(0)).toBeGreaterThan(p.getZ(0));
  tube.dispose();
  picture.dispose();
});
