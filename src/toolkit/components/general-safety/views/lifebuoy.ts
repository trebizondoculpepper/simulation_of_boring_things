import { Group, Mesh, TorusGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';

/**
 * A lifebuoy on its wall holder, by Poolguard: a 750 mm orange ring
 * (after the SOLAS-pattern rings fitted at open water), four reflective
 * bands on it and its grab line looped round it, hung on a red steel
 * bracket over a bag holding its 30 m floating throw line, under a green
 * LIFEBUOY sign. Set decoration in the game's terms: it is there to be
 * seen where it would be needed.
 *
 * Its own frame: the wall at z = 0, its face toward +z, the ring's middle
 * at the origin.
 */
export function createLifebuoy(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Poolguard lifebuoy';
  const red = t.paint('#b3201e', 0.5, 0.2);
  // The bracket: a back plate and two hooks it hangs on.
  t.box(group, red, 0.12, 0.5, 0.01, 0, 0.18, 0.005);
  for (const x of [-0.18, 0.18])
    t.box(group, red, 0.03, 0.03, 0.12, x, 0.3, 0.06);
  t.box(group, red, 0.4, 0.03, 0.03, 0, 0.3, 0.06);
  // The ring.
  const ring = new Mesh(
    new TorusGeometry(0.3, 0.065, 12, 40),
    t.paint('#ec5b13', 0.6),
  );
  ring.position.z = 0.11;
  group.add(ring);
  const white = t.paint('#f2f2ee', 0.35);
  for (let i = 0; i < 4; i++) {
    const band = new Mesh(new TorusGeometry(0.3, 0.067, 10, 6, 0.16), white);
    band.rotation.z = (i / 4) * Math.PI * 2 + Math.PI / 4 - 0.08;
    band.position.z = 0.11;
    group.add(band);
  }
  // Its grab line, festooned in four loops.
  const rope = t.paint('#e8e1c9', 0.8);
  for (let i = 0; i < 4; i++) {
    const loop = new Mesh(new TorusGeometry(0.37, 0.006, 6, 16, 1.1), rope);
    loop.rotation.z = (i / 4) * Math.PI * 2 + 0.2;
    loop.position.z = 0.11;
    group.add(loop);
  }
  // The throw line's bag, below.
  t.box(group, t.paint('#c9a21a', 0.7), 0.2, 0.28, 0.12, 0, -0.55, 0.07);
  t.box(group, red, 0.24, 0.02, 0.13, 0, -0.4, 0.07);
  // Its sign, above.
  const sign = t.printed(0.3, 0.12, (c, w, h) => {
    c.fillStyle = '#008855';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.font = `bold ${h * 0.42}px ${SANS}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('LIFEBUOY', w / 2, h / 2);
  });
  sign.mesh.position.set(0, 0.55, 0.003);
  group.add(sign.mesh);
  const note = createMicroLabel(kit, 'THROW, DO NOT GO', {
    height: 0.025,
    ink: '#ffffff',
    plate: '#008855',
  });
  note.position.set(0, 0.46, 0.004);
  group.add(note);
  const badge = createBrandBadge(kit, 'poolguard', { height: 0.02 });
  badge.position.set(0, 0.05, 0.011);
  group.add(badge);
  return group;
}
