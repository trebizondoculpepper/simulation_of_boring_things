import {
  CanvasTexture,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  BoxGeometry,
  CylinderGeometry,
  Plane,
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
  // The sky and the tarmac only beyond the building's outside wall: each
  // room is drawn on its own canvas over the next, and anything of this
  // room's that covered its doorways would hide the rooms beyond them
  // (the owner, 2026-10-26: the stores were invisible through their
  // doors). Clipped to the far side of the wall's plane, in world space.
  const outside = new Plane(new Vector3(0, 0, -1), 0);
  const wallPoint = new Vector3();
  const eyeAt = new Vector3();
  const placePlane = (
    renderer: { localClippingEnabled: boolean },
    camera: { getWorldPosition(v: Vector3): Vector3 },
  ) => {
    renderer.localClippingEnabled = true;
    group.updateWorldMatrix(true, false);
    wallPoint.set(0, 0, wallZ).applyMatrix4(group.matrixWorld);
    // Inside the building (the owner, 2026-10-26: a cheat), only beyond
    // the wall: -z + c >= 0, c the wall's z. Out in the yard, all of it,
    // the sky over the roof behind among it: the plane pushed far away.
    camera.getWorldPosition(eyeAt);
    outside.constant = eyeAt.z > wallPoint.z ? wallPoint.z : 1e9;
  };
  sky.dome.material.clippingPlanes = [outside];
  sky.dome.onBeforeRender = (r, _s, camera) => {
    placePlane(r, camera);
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
    // Fading before the building's wall does (the owner, 2026-10-26).
    grad.addColorStop(0.3, '#ffffff');
    grad.addColorStop(0.75, '#000000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const alphaMap = new CanvasTexture(fade);
    kit.textures.push(alphaMap);
    tarmac.alphaMap = alphaMap;
    tarmac.transparent = true;
  }
  tarmac.clippingPlanes = [outside];
  const ground = new Mesh(new CircleGeometry(69, 48), tarmac);
  ground.onBeforeRender = (r, _s, camera) => placePlane(r, camera);
  ground.rotation.x = -Math.PI / 2;
  // Centred on the foot of the steps from the pier door, the middle of
  // the yard the walker may cross (the owner, 2026-10-26).
  const foot = dockSteps({ wallZ: wallZ + thickness, thickness, doorX }).foot;
  ground.position.set(foot.x, YARD_LEVEL, foot.z);
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
    // Solid further out than the tarmac, fading after it.
    grad.addColorStop(0.5, '#ffffff');
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
  // Its roof (the owner, 2026-10-26): the utility block's shallow-pitched
  // roof of profiled steel, its trapezoidal ribs running down the slope
  // to a gutter at the eaves, a fascia over the wall's head; carried on
  // and faded with the wall.
  {
    const ribs = document.createElement('canvas');
    ribs.width = 64;
    ribs.height = 8;
    const g = ribs.getContext('2d')!;
    g.fillStyle = '#8d9496';
    g.fillRect(0, 0, 64, 8);
    g.fillStyle = '#6c7375';
    g.fillRect(0, 0, 10, 8);
    g.fillStyle = '#b1b7b9';
    g.fillRect(10, 0, 4, 8);
    g.fillRect(60, 0, 4, 8);
    const ribMap = new CanvasTexture(ribs);
    ribMap.colorSpace = SRGBColorSpace;
    ribMap.wrapS = ribMap.wrapT = RepeatWrapping;
    kit.textures.push(ribMap);
    const roofTop = 7.3;
    const depth = 24;
    const pitch = (4 * Math.PI) / 180;
    const run = 2 * 68;
    // Fading along the building as the wall does.
    const fade = document.createElement('canvas');
    fade.width = 256;
    fade.height = 4;
    const f = fade.getContext('2d')!;
    const grad = f.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.35, '#ffffff');
    grad.addColorStop(0.65, '#ffffff');
    grad.addColorStop(1, '#000000');
    f.fillStyle = grad;
    f.fillRect(0, 0, 256, 4);
    const alphaMap = new CanvasTexture(fade);
    kit.textures.push(alphaMap);
    const sheet = new MeshStandardMaterial({
      map: ribMap,
      roughness: 0.45,
      metalness: 0.55,
      alphaMap,
      transparent: true,
      depthWrite: false,
    });
    kit.materials.push(sheet);
    const roof = new Mesh(new PlaneGeometry(run, depth), sheet);
    // Its UVs: ribs every 0.333 m along the building, the fade once across.
    const uv = roof.geometry.attributes.uv;
    const pos = roof.geometry.attributes.position;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, pos.getX(k) / 0.333, 0);
    uv.needsUpdate = true;
    ribMap.repeat.set(1, 1);
    alphaMap.repeat.set(1 / (run / 0.333), 1);
    alphaMap.offset.set(0.5, 0);
    roof.rotation.x = -Math.PI / 2 - pitch;
    roof.position.set(
      0,
      roofTop + (depth / 2) * Math.sin(pitch) + 0.15,
      wallZ - 0.35 + depth / 2,
    );
    group.add(roof);
    const trimM = new MeshStandardMaterial({
      color: '#5f6b70',
      roughness: 0.5,
      metalness: 0.4,
      alphaMap,
      transparent: true,
      depthWrite: false,
    });
    kit.materials.push(trimM);
    const trim = (h: number, d: number, y: number, z: number) => {
      const m = new Mesh(new BoxGeometry(run, h, d), trimM);
      const u = m.geometry.attributes.uv;
      const p = m.geometry.attributes.position;
      for (let k = 0; k < u.count; k++) u.setXY(k, p.getX(k) / 0.333, 0);
      u.needsUpdate = true;
      m.position.set(0, y, z);
      group.add(m);
    };
    // The fascia over the wall's head, and the eaves gutter before it.
    trim(0.5, 0.06, roofTop, wallZ - 0.03);
    trim(0.15, 0.18, roofTop + 0.1, wallZ - 0.3);
  }
  // Its sign, over the openings (the owner, 2026-10-26).
  {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#123f5c';
    g.fillRect(0, 0, 2048, 256);
    g.fillStyle = '#f4c542';
    g.fillRect(0, 216, 2048, 16);
    g.fillStyle = '#ffffff';
    g.font = 'bold 104px sans-serif';
    g.textAlign = 'center';
    g.fillText('SUNNYSIDE LEISURE CENTRE', 1024, 118);
    g.font = 'bold 64px sans-serif';
    g.fillStyle = '#f4c542';
    g.fillText('UTILITY AREA C', 1024, 192);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    kit.textures.push(map);
    const m = new MeshStandardMaterial({ map, roughness: 0.5 });
    kit.materials.push(m);
    const sign = new Mesh(new BoxGeometry(7.2, 0.9, 0.05), m);
    sign.position.set(0, 6.05, wallZ - 0.03);
    sign.rotation.y = Math.PI;
    group.add(sign);
  }
  // In the distance, the boiler house's flue (the owner, 2026-10-26): its
  // gas condensing boilers' twin-wall stainless flues, clustered on a
  // galvanised lattice support, rising above the roof to their caps.
  {
    const flue = new Group();
    flue.name = 'Boiler house flue stack';
    const steel = new MeshStandardMaterial({
      color: '#c3c8ca',
      roughness: 0.3,
      metalness: 0.85,
    });
    const galv = new MeshStandardMaterial({
      color: '#9da3a3',
      roughness: 0.5,
      metalness: 0.6,
    });
    kit.materials.push(steel, galv);
    const base = 7.6;
    const top = 19;
    // Five flues, one a boiler, in a tight ring.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const x = Math.cos(a) * 0.45;
      const z = Math.sin(a) * 0.45;
      const h = top - base - (k % 2) * 0.6;
      const pipe = new Mesh(new CylinderGeometry(0.15, 0.15, h, 16), steel);
      pipe.position.set(x, base + h / 2, z);
      flue.add(pipe);
      // Its terminal cap, and a band at each joint.
      const cap = new Mesh(new CylinderGeometry(0.22, 0.16, 0.2, 16), steel);
      cap.position.set(x, base + h + 0.1, z);
      flue.add(cap);
      for (let y = base + 1; y < base + h; y += 1.2) {
        const band = new Mesh(
          new CylinderGeometry(0.165, 0.165, 0.05, 16),
          galv,
        );
        band.position.set(x, y, z);
        flue.add(band);
      }
    }
    // The lattice support: four legs and their bracing rings.
    const span = 0.9;
    for (const [x, z] of [
      [-span, -span],
      [span, -span],
      [span, span],
      [-span, span],
    ] as const) {
      const leg = new Mesh(new BoxGeometry(0.08, top - 1 - base, 0.08), galv);
      leg.position.set(x, base + (top - 1 - base) / 2, z);
      flue.add(leg);
    }
    for (let y = base + 0.5; y < top - 1; y += 1.6)
      for (const [w, d, x, z] of [
        [2 * span, 0.05, 0, -span],
        [2 * span, 0.05, 0, span],
        [0.05, 2 * span, -span, 0],
        [0.05, 2 * span, span, 0],
      ] as const) {
        const bar = new Mesh(new BoxGeometry(w, 0.05, d), galv);
        bar.position.set(x, y, z);
        flue.add(bar);
      }
    flue.position.set(14, 0, wallZ + 15);
    group.add(flue);
  }
  // On the roof, a medium rooftop 5G site (the owner, 2026-10-26): a short
  // galvanised mast on a ballasted frame, three panel antennas a sector
  // each, a remote radio unit behind each, a cable tray to two grey
  // equipment cabinets. Someone else's kit: set decoration.
  {
    const site = new Group();
    site.name = 'Rooftop 5G site';
    const galv = new MeshStandardMaterial({
      color: '#9da3a3',
      roughness: 0.5,
      metalness: 0.6,
    });
    const white = new MeshStandardMaterial({
      color: '#e6e7e3',
      roughness: 0.6,
    });
    const grey = new MeshStandardMaterial({
      color: '#7b8285',
      roughness: 0.55,
      metalness: 0.3,
    });
    const ballast = new MeshStandardMaterial({
      color: '#8c8e8a',
      roughness: 0.95,
    });
    kit.materials.push(galv, white, grey, ballast);
    const add = (
      geo: BoxGeometry | CylinderGeometry,
      m: MeshStandardMaterial,
      x: number,
      y: number,
      z: number,
    ) => {
      const mesh = new Mesh(geo, m);
      mesh.position.set(x, y, z);
      site.add(mesh);
      return mesh;
    };
    // The ballasted frame: a steel square on concrete blocks.
    for (const [x, z] of [
      [-1.2, -1.2],
      [1.2, -1.2],
      [1.2, 1.2],
      [-1.2, 1.2],
    ] as const)
      add(new BoxGeometry(0.5, 0.25, 0.5), ballast, x, 0.125, z);
    for (const z of [-1.2, 1.2])
      add(new BoxGeometry(2.9, 0.12, 0.12), galv, 0, 0.31, z);
    for (const x of [-1.2, 1.2])
      add(new BoxGeometry(0.12, 0.12, 2.9), galv, x, 0.31, 0);
    // The mast, and its head frame.
    add(new CylinderGeometry(0.09, 0.11, 5.5, 12), galv, 0, 0.37 + 2.75, 0);
    for (const dz of [-0.6, 0.6]) {
      const strut = add(
        new CylinderGeometry(0.03, 0.03, 1.6, 6),
        galv,
        0,
        1.0,
        dz * 0.6,
      );
      strut.rotation.x = dz > 0 ? -0.7 : 0.7;
    }
    const headY = 4.8;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
      const r = 0.55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // Its arm out from the mast.
      const arm = add(
        new BoxGeometry(r, 0.06, 0.06),
        galv,
        x / 2,
        headY,
        z / 2,
      );
      arm.rotation.y = -a;
      // The panel antenna, 1.5 m tall, facing outward.
      const panel = add(new BoxGeometry(0.32, 1.5, 0.12), white, x, headY, z);
      panel.rotation.y = -a + Math.PI / 2;
      // Its remote radio unit behind it, lower down.
      const rru = add(
        new BoxGeometry(0.3, 0.45, 0.16),
        grey,
        x * 0.7,
        headY - 1.2,
        z * 0.7,
      );
      rru.rotation.y = -a + Math.PI / 2;
    }
    // A cable tray to the cabinets.
    add(new BoxGeometry(0.2, 0.06, 3.5), galv, 0.3, 0.5, 2.9);
    for (const x of [-0.45, 0.45])
      add(new BoxGeometry(0.75, 1.6, 0.6), grey, x, 0.8 + 0.3, 5);
    // On the roof, set back from the edge, at the left of the frontage
    // seen from the yard (its slope's height there).
    const back = 4;
    site.position.set(
      -11,
      7.3 + 0.15 + back * Math.tan((4 * Math.PI) / 180),
      wallZ + back,
    );
    group.add(site);
  }
  return { group };
}
