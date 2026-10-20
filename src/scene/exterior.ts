import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import { ROOFLIGHTS, WINDOWS } from '../game/daylight-plan';

/** A modest site around the glazed east entrance, in world metres. */
export function createExterior() {
  const group = new Group();
  const shell = new Group();
  shell.name = 'distant-building-massing';
  group.add(shell);
  group.name = 'leisure-centre-exterior';
  const grass = new MeshStandardMaterial({ color: '#648261', roughness: 1 });
  const paving = new MeshStandardMaterial({
    color: '#bdc3bf',
    roughness: 0.95,
  });
  const road = new MeshStandardMaterial({ color: '#505c60', roughness: 1 });
  const stripe = new MeshStandardMaterial({ color: '#e6e8dd', roughness: 1 });
  const building = new MeshStandardMaterial({
    color: '#b6b7ad',
    roughness: 0.9,
  });
  const roof = new MeshStandardMaterial({ color: '#61727a', roughness: 0.85 });
  const bark = new MeshStandardMaterial({ color: '#635b4a', roughness: 1 });
  const leaves = new MeshStandardMaterial({ color: '#537a55', roughness: 1 });
  const metal = new MeshStandardMaterial({
    color: '#55656a',
    metalness: 0.5,
    roughness: 0.45,
  });
  const windowGlass = new MeshStandardMaterial({
    color: '#80b5ce',
    metalness: 0.15,
    roughness: 0.15,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const windowFrame = new MeshStandardMaterial({
    color: '#455a63',
    metalness: 0.5,
    roughness: 0.4,
  });
  const lens = new MeshStandardMaterial({
    color: '#ecf0de',
    emissive: '#c6d3a6',
    emissiveIntensity: 0.25,
  });
  const materials = [
    grass,
    paving,
    road,
    stripe,
    building,
    roof,
    bark,
    leaves,
    metal,
    lens,
    windowGlass,
    windowFrame,
  ];
  function block(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: Material,
  ) {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  // From outside, simple masses complete the building silhouette. They are
  // hidden indoors so the independent room models remain visible there.
  for (const [x, z, w, d, h] of [
    [40, 25, 80, 50, 12],
    [88, 25, 16, 30, 3],
    [48, -10, 96, 20, 4],
    [100, -8, 8, 8, 3],
  ]) {
    const mass = new Mesh(new BoxGeometry(w, h, d), building);
    mass.position.set(x, h / 2, z);
    shell.add(mass);
    const cap = new Mesh(new BoxGeometry(w + 0.4, 0.18, d + 0.4), roof);
    cap.position.set(x, h + 0.1, z);
    shell.add(cap);
  }
  // Outside views of the same clerestory rhythm and barrel rooflights.
  for (const window of WINDOWS) {
    const along = window.side === 'north' || window.side === 'south';
    const width = window.to - window.from;
    const height = window.top - window.bottom;
    const y = (window.bottom + window.top) / 2;
    const line =
      window.room === 'hall'
        ? window.side === 'north'
          ? -0.11
          : 50.11
        : window.room === 'changing'
          ? 40.11
          : window.room === 'boiler'
            ? -20.11
            : 104.11;
    const pane = new Mesh(
      new BoxGeometry(along ? width : 0.05, height, along ? 0.05 : width),
      windowGlass,
    );
    pane.position.set(
      along ? (window.from + window.to) / 2 : line,
      y,
      along ? line : (window.from + window.to) / 2,
    );
    shell.add(pane);
    const frame = new Mesh(
      new BoxGeometry(
        along ? width + 0.12 : 0.1,
        height + 0.12,
        along ? 0.1 : width + 0.12,
      ),
      windowFrame,
    );
    frame.position.copy(pane.position);
    frame.position.y = window.bottom - 0.04;
    frame.scale.y = 0.08 / (height + 0.12);
    shell.add(frame);
  }
  for (const light of ROOFLIGHTS) {
    const width = light.maxX - light.minX;
    const depth = light.maxZ - light.minZ;
    const x = (light.minX + light.maxX) / 2;
    const z = (light.minZ + light.maxZ) / 2;
    // Shallow raised segments match the interior barrel profile.
    for (let i = 0; i < 12; i++) {
      const t = (i + 0.5) / 12;
      const pane = new Mesh(
        new BoxGeometry(width / 12 + 0.01, 0.06, depth),
        windowGlass,
      );
      pane.position.set(
        light.minX + width * t,
        12.15 + 0.75 * Math.sin(Math.PI * t),
        z,
      );
      shell.add(pane);
    }
    for (const edgeZ of [light.minZ, light.maxZ]) {
      const end = new Mesh(
        new BoxGeometry(width + 0.15, 0.12, 0.08),
        windowFrame,
      );
      end.position.set(x, 12.15, edgeZ);
      shell.add(end);
    }
    // Ends and longitudinal rails stay attached to the exterior shell.
    for (const edgeX of [light.minX, light.maxX]) {
      const rail = new Mesh(new BoxGeometry(0.1, 0.2, depth), windowFrame);
      rail.position.set(edgeX, 12.17, z);
      shell.add(rail);
    }
  }
  // Site and entrance forecourt: the interior floor meets this paving at y=0.
  block(150, 0.08, 150, 160, -0.09, 25, grass);
  block(38, 0.04, 32, 131, -0.025, 25, paving);
  block(20, 0.045, 4, 156, -0.02, 25, paving);
  block(12, 0.035, 150, 173, -0.035, 25, road);
  for (let z = -40; z <= 90; z += 12)
    block(0.12, 0.012, 5, 173, -0.008, z, stripe);
  // Low buildings give the entrance a believable suburban setting.
  for (const [x, z, w, d, h] of [
    [194, -10, 25, 29, 8],
    [198, 53, 31, 25, 10],
    [126, -39, 24, 16, 6],
  ]) {
    block(w, h, d, x, h / 2, z, building);
    block(w + 0.6, 0.35, d + 0.6, x, h + 0.2, z, roof);
  }
  // Entrance canopy and the clear pedestrian route to the road.
  block(6, 0.16, 11, 115, 3.4, 25, roof);
  for (const z of [20, 30]) block(0.16, 3.3, 0.16, 118, 1.65, z, metal);
  for (const [x, z] of [
    [125, 3],
    [126, 47],
    [149, -18],
    [149, 68],
    [188, 29],
  ]) {
    const trunk = new Mesh(new CylinderGeometry(0.18, 0.28, 3.6, 8), bark);
    trunk.position.set(x, 1.8, z);
    group.add(trunk);
    const crown = new Mesh(new SphereGeometry(2.4, 10, 8), leaves);
    crown.scale.set(1, 0.85, 1);
    crown.position.set(x, 4.6, z);
    group.add(crown);
  }
  for (const z of [7, 43]) {
    block(0.12, 4.5, 0.12, 144, 2.25, z, metal);
    block(0.7, 0.18, 0.7, 144, 4.55, z, lens);
  }
  return {
    group,
    shell,
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) (o.geometry as BufferGeometry).dispose();
      });
      for (const material of materials) material.dispose();
    },
  };
}
