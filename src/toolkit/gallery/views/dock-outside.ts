import {
  CanvasTexture,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  BoxGeometry,
  CylinderGeometry,
  PlaneGeometry,
  RepeatWrapping,
  Vector3,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createSkyDome } from '../../../scene/sky-dome';
import { createSkyChanger } from '../../../game/skies';
import { createBreezeBlockTextures } from '../../../scene/breeze-block-texture';
import { YARD, dockFloorAt, dockSteps } from '../logic/dock-yard';

/**
 * What the loading dock's openings look out on (prompt 073): tarmac as far
 * as the eye can see, about 1.2 m below the dock's floor, under a plain
 * overcast sky (the standard sky dome); the dock's outside wall carried
 * down to the tarmac below its openings. No buildings: the roadways
 * beyond are another plane of existence. Nothing here is walked on until
 * the goods yard (prompt 080). Metres, the dock's middle at the origin,
 * its floor at y = 0, its outside wall at z = `wallZ` (north, −z).
 */
export const YARD_LEVEL = YARD.level;

/**
 * The roadways' tarmac, grey and faintly speckled, `repeat` times across
 * its surface's UVs; it runs into the dock's channels too (the owner,
 * 2026-10-26). Its texture is kept in `kit`; its material is the caller's.
 */
export function tarmacMaterial(kit: PanelKit, repeat: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#6a6b6d';
  g.fillRect(0, 0, 256, 256);
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000; i++) {
    const v = 80 + Math.floor(rnd() * 60);
    g.fillStyle = `rgb(${v},${v},${v + 2})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(repeat, repeat);
  kit.textures.push(map);
  // Lit by the day, not by the dock's lamps: drawn at its daylight shade.
  return new MeshBasicMaterial({ map, color: '#c9c9c9' });
}

export function createDockOutside(
  kit: PanelKit,
  {
    wallZ,
    width,
    thickness,
    openings = [],
    doorX = 0,
  }: {
    wallZ: number;
    width: number;
    thickness: number;
    /** The lorry openings, each its middle and width along the wall. */
    openings?: readonly { at: number; w: number }[];
    /** The pier door's middle along the wall, where the steps go down. */
    doorX?: number;
  },
) {
  const group = new Group();
  group.name = 'the goods yard, seen from the dock';
  // The sky: the standard dome, inside the camera's 80 m reach, overcast.
  const sky = createSkyDome(70);
  sky.set(createSkyChanger('overcast').step(0), 0, 0);
  group.add(sky.dome);
  // Kept round the camera, wherever it is: a skybox never comes nearer
  // or goes beyond the camera's reach (the owner, 2026-10-26: a black
  // hole showed where its far side passed the camera's 80 m).
  const eye = new Vector3();
  sky.dome.onBeforeRender = (_r, _s, camera) => {
    camera.getWorldPosition(eye);
    sky.dome.matrixWorld.setPosition(eye);
  };
  sky.dome.frustumCulled = false;
  const tarmac = tarmacMaterial(kit, 60);
  // It yields to whatever stands on it, the steps among them.
  tarmac.polygonOffset = true;
  tarmac.polygonOffsetFactor = 1;
  tarmac.polygonOffsetUnits = 2;
  kit.materials.push(tarmac);
  kit.materials.push(tarmac);
  // Fading out into the overcast toward its edge, a little beyond where
  // the building's wall fades (the owner, 2026-10-26).
  {
    const fade = document.createElement('canvas');
    fade.width = fade.height = 256;
    const g = fade.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, '#ffffff');
    grad.addColorStop(0.97, '#000000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const alphaMap = new CanvasTexture(fade);
    kit.textures.push(alphaMap);
    tarmac.alphaMap = alphaMap;
    tarmac.transparent = true;
  }
  const ground = new Mesh(new CircleGeometry(69, 48), tarmac);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, YARD_LEVEL, wallZ - 30);
  group.add(ground);
  // The dock's outside wall below its floor, down to the tarmac: brick
  // red engineering brick under the openings, the dock's face.
  const brick = new MeshStandardMaterial({ color: '#6b4a3c', roughness: 0.9 });
  kit.materials.push(brick);
  // In pieces, round the channels' openings down to the tarmac.
  const cuts = [...openings].sort((p, q) => p.at - q.at);
  let from = -width / 2 - thickness;
  for (const o of [...cuts, { at: width / 2 + thickness, w: 0 }]) {
    const to = o.at - o.w / 2;
    if (to - from > 0.01) {
      const face = new Mesh(
        new BoxGeometry(to - from, -YARD_LEVEL, thickness),
        brick,
      );
      face.position.set((from + to) / 2, YARD_LEVEL / 2, wallZ + thickness / 2);
      group.add(face);
    }
    from = o.at + o.w / 2;
  }
  // The landing outside the pier door and its flight of steps down to
  // the tarmac, concrete, a galvanised handrail each side (prompt 080).
  const { landing, flight } = dockSteps({
    wallZ: wallZ + thickness,
    thickness,
    doorX,
  });
  const concrete = new MeshStandardMaterial({
    color: '#8a8c88',
    roughness: 0.95,
  });
  const galv = new MeshStandardMaterial({
    color: '#a9aeae',
    roughness: 0.45,
    metalness: 0.6,
  });
  kit.materials.push(concrete, galv);
  const w = landing.maxX - landing.minX;
  const slab = new Mesh(
    new BoxGeometry(w, -YARD_LEVEL, landing.maxZ - landing.minZ),
    concrete,
  );
  slab.position.set(doorX, YARD_LEVEL / 2, (landing.minZ + landing.maxZ) / 2);
  group.add(slab);
  for (let k = 0; k < YARD.risers; k++) {
    const top = -((k + 1) * -YARD_LEVEL) / YARD.risers;
    const z0 = flight.maxZ - (k + 1) * YARD.going;
    const step = new Mesh(
      new BoxGeometry(w, top - YARD_LEVEL, YARD.going),
      concrete,
    );
    step.position.set(doorX, (top + YARD_LEVEL) / 2, z0 + YARD.going / 2);
    group.add(step);
  }
  for (const x of [landing.minX + 0.03, landing.maxX - 0.03]) {
    // Posts, and a rail 0.9 m over the pitch line.
    for (const z of [landing.maxZ - 0.1, landing.minZ, flight.minZ + 0.3]) {
      const y0 = dockFloorAt(
        { wallZ: wallZ + thickness, thickness, doorX },
        x,
        z - 0.01,
      );
      const post = new Mesh(new BoxGeometry(0.05, 1.0, 0.05), galv);
      post.position.set(x, y0 + 0.5, z);
      group.add(post);
    }
    const a = new Vector3(x, 1.0, landing.maxZ - 0.1);
    const b = new Vector3(x, 1.0, landing.minZ);
    const c = new Vector3(
      x,
      YARD_LEVEL + 1.0 + (0.3 / (YARD.risers * YARD.going)) * -YARD_LEVEL,
      flight.minZ + 0.3,
    );
    for (const [p, q] of [
      [a, b],
      [b, c],
    ] as const) {
      const d = q.clone().sub(p);
      const rail = new Mesh(
        new CylinderGeometry(0.024, 0.024, d.length(), 8),
        galv,
      );
      rail.position.copy(p).add(q).multiplyScalar(0.5);
      rail.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d.normalize());
      group.add(rail);
    }
  }
  // The building's outside wall, carried on east and west far past where
  // one can walk, fading into the overcast (the owner, 2026-10-26): the
  // rest of the building, never reached.
  {
    const fade = document.createElement('canvas');
    fade.width = 256;
    fade.height = 4;
    const g = fade.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffffff');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 4);
    // In the dock's blockwork, its courses on the dock's own.
    const blocks = createBreezeBlockTextures();
    kit.textures.push(blocks.map, blocks.normalMap, blocks.roughnessMap);
    const far = 68;
    const top = 7.3;
    const from = width / 2 + thickness;
    const len = far - from;
    for (const side of [-1, 1]) {
      const alphaMap = new CanvasTexture(fade);
      // Opaque near the dock, fading outward: along u, the wall's x.
      alphaMap.repeat.set(side / len, 1);
      alphaMap.offset.set(-from / len, 0);
      kit.textures.push(alphaMap);
      const m = new MeshStandardMaterial({
        map: blocks.map,
        normalMap: blocks.normalMap,
        roughnessMap: blocks.roughnessMap,
        roughness: 1,
        alphaMap,
        transparent: true,
        depthWrite: false,
      });
      kit.materials.push(m);
      const wall = new Mesh(new PlaneGeometry(len, top - YARD_LEVEL), m);
      wall.position.set(
        side * (from + len / 2),
        (top + YARD_LEVEL) / 2,
        wallZ - 0.001,
      );
      wall.rotation.y = Math.PI;
      // UVs in metres as the dock's walls have them: u its x, v its height
      // over the dock's floor in 0.4 m courses.
      const uv = wall.geometry.attributes.uv;
      const pos = wall.geometry.attributes.position;
      for (let k = 0; k < uv.count; k++) {
        const x = side * (from + len / 2) - pos.getX(k);
        const y = (top + YARD_LEVEL) / 2 + pos.getY(k);
        uv.setXY(k, x, y / 0.4);
      }
      uv.needsUpdate = true;
      group.add(wall);
    }
  }
  return { group };
}
