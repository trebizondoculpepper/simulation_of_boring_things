import { markComponent } from '../../core/views/component-identity';
import {
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';

/** A suspended globe shade, centred on its equator in metre units. */
export function createMetalGlobeLight(radius = 1.5): Group {
  const metal = new MeshStandardMaterial({
    color: '#d6dfe0',
    metalness: 0.36,
    roughness: 0.16,
  });
  const diffuser = new MeshPhysicalMaterial({
    color: '#fff8e9',
    emissive: '#ffe8c8',
    emissiveIntensity: 0.9,
    roughness: 0.48,
    transmission: 0.2,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: DoubleSide,
  });
  const fitting = new Group();
  fitting.name = 'metal and translucent globe';
  // A light: electrical, working, not scenery (prompt 064).
  markComponent(fitting, { name: 'Globe light' });
  const upper = new Mesh(
    new SphereGeometry(radius, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    metal,
  );
  upper.name = 'reflective upper hemisphere';
  fitting.add(upper);
  const lower = new Mesh(
    new SphereGeometry(
      radius,
      48,
      16,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    diffuser,
  );
  lower.name = 'translucent lower hemisphere';
  fitting.add(lower);
  const seam = new Mesh(new TorusGeometry(radius, 0.022, 8, 48), metal);
  seam.rotation.x = Math.PI / 2;
  fitting.add(seam);
  return fitting;
}
