import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import { COURTYARD_HALF, COURTYARD_WALLS } from '../game/courtyard-join';
import { LOOP_SIDES } from '../game/dev-corridor-plan';
import type { LoopSide } from '../game/dev-corridor-plan';
import {
  createMicroLabel,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import { createPs1Material } from '../toolkit/components/core/parts/ps1-material';
import { createPartSet } from '../toolkit/components/core/parts/parts';
import { mergeStatic } from '../toolkit/components/core/views/merge-static';
import { springDoor } from '../toolkit/components/architectural/parts/building-parts';
import { SPRING_OPENING } from '../toolkit/components/architectural/views/spring-door';
import { createBulkheadLight } from '../toolkit/components/architectural/views/building-fittings';
import {
  LANTERN_HEIGHT,
  createBench,
  createBistroChair,
  createLampPost,
  createLitterBin,
  createPedestalAshtray,
  createPlanter,
} from '../toolkit/components/site-dressing/views/courtyard-props';
import { LOOP_STRIPES } from './dev-corridor';

/** Where the lamp post stands. */
export const LAMP_POST = { x: -3.5, z: 0 };

export { COURTYARD_HALF, COURTYARD_WALLS };

/** Its storeys, ground first, and its height to the parapet's top. */
export const COURTYARD_STOREYS = [3.6, 3.4, 3.4];
export const COURTYARD_HEIGHT =
  COURTYARD_STOREYS.reduce((a, b) => a + b, 0) + 0.7;

/**
 * dev_courtyard: the light well in the middle of the office block that
 * dev_corridor loops round, an 18 m square three storeys deep and open to
 * the sky, where the staff go out to smoke. Its four walls are the
 * building's inner facades, blank buff brick on the ground floor (the
 * corridor behind it has no windows) with a spring door in the middle of
 * each back to its side of the corridor (under the side's letter, on its
 * stripe's colour; the room that joins it to the corridor puts the
 * corridor behind it), and two storeys of office windows above, a parapet at the top and a rainwater pipe at each corner.
 * Paving underfoot with a drain; planters, pedestal ashtrays under a
 * SMOKING AREA sign, bistro chairs, benches and a bin. The room above it
 * is the sky (`sky-dome.ts`). In metres; the room scales it.
 */
export function createDevCourtyard(kit: PanelKit) {
  const group = new Group();
  group.name = 'dev_courtyard';
  const still = new Group();
  group.add(still);
  const parts = createPartSet();
  const H = COURTYARD_HALF;

  const box = (
    parent: Object3D,
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ---- Paving ------------------------------------------------------------
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#a7a59c';
  c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#7f7d76';
  c.lineWidth = 3;
  c.strokeRect(1.5, 1.5, 125, 125);
  const slabs = new CanvasTexture(canvas);
  slabs.colorSpace = SRGBColorSpace;
  slabs.wrapS = slabs.wrapT = RepeatWrapping;
  // A 600 mm slab per repeat.
  slabs.repeat.set((2 * H) / 0.6, (2 * H) / 0.6);
  kit.textures.push(slabs);
  const paving = createPs1Material({ map: slabs, roughness: 0.9 });
  kit.materials.push(paving);
  const ground = new Mesh(new PlaneGeometry(2 * H, 2 * H), paving);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  still.add(ground);
  box(still, kitPaint(kit, '#3a3c3d', 0.6), 0.45, 0.01, 0.45, 0, 0.005, 0);

  // ---- The four facades --------------------------------------------------
  const brick = kitPaint(kit, '#b89b72', 0.85);
  const render = kitPaint(kit, '#dcd6c6', 0.8);
  const glass = kitPaint(kit, '#2c3a44', 0.15);
  const frame = kitPaint(kit, '#8b9193', 0.4);
  const blind = kitPaint(kit, '#e3dfd2', 0.7);
  const coping = kitPaint(kit, '#9c9a93', 0.6);
  const pipe = kitPaint(kit, '#2f3436', 0.5);
  const doors: { side: LoopSide; part: ReturnType<typeof springDoor> }[] = [];
  /** The courtyard's lights: a bulkhead a wall and the lamp post. */
  const lamps: { set(lit: boolean): void }[] = [];
  /** Where each casts its light from, metres. */
  const lights: Vector3[] = [];
  /** Where each wall's light switch goes, in the wall's own frame. */
  const switchSpots: { wall: Group; x: number; y: number }[] = [];
  COURTYARD_WALLS.forEach((side, i) => {
    // Each wall in its own frame: its face at z = 0 facing +z, into the
    // courtyard; the north wall first, then round clockwise.
    const wall = new Group();
    const yaw = [0, -Math.PI / 2, Math.PI, Math.PI / 2][i];
    wall.rotation.y = yaw;
    wall.position.set([0, H, 0, -H][i], 0, [-H, 0, H, 0][i]);
    group.add(wall);
    const face = new Group();
    wall.add(face);
    const [g, s1, s2] = COURTYARD_STOREYS;
    // Ground floor: brick, with a gap for the door.
    const gap = SPRING_OPENING.width / 2 + 0.08;
    box(face, brick, H - gap, g, 0.3, -(H + gap) / 2, g / 2, -0.15);
    box(face, brick, H - gap, g, 0.3, (H + gap) / 2, g / 2, -0.15);
    box(
      face,
      brick,
      2 * gap,
      g - SPRING_OPENING.height - 0.06,
      0.3,
      0,
      (g + SPRING_OPENING.height + 0.06) / 2,
      -0.15,
    );
    // Two upper storeys of render with a band of windows each.
    box(
      face,
      render,
      2 * H,
      s1 + s2 + 0.7,
      0.3,
      0,
      g + (s1 + s2 + 0.7) / 2,
      -0.15,
    );
    box(
      face,
      coping,
      2 * H + 0.1,
      0.12,
      0.42,
      0,
      COURTYARD_HEIGHT + 0.06,
      -0.15,
    );
    // Windows: five a floor on the two upper storeys. The ground floor has
    // none: behind it is the corridor, which has no windows onto the
    // courtyard.
    const windows: [number, number, number][] = [];
    for (const [floor, base] of [
      [1, g + 0.9],
      [2, g + s1 + 0.9],
    ] as const) {
      void floor;
      for (const x of [-7, -3.5, 0, 3.5, 7])
        windows.push([x, base + 0.75, 1.5]);
    }
    windows.forEach(([x, y, h], n) => {
      box(face, frame, 1.9, h + 0.1, 0.06, x, y, 0.01);
      box(face, glass, 1.8, h, 0.04, x, y, 0.04);
      // A blind drawn down here and there.
      if ((n + i) % 3 === 0)
        box(face, blind, 1.76, h * 0.45, 0.01, x, y + h * 0.27, 0.065);
      box(face, coping, 2.0, 0.06, 0.16, x, y - h / 2 - 0.08, 0.06);
    });
    // A rainwater pipe down the wall's left end.
    const down = box(
      face,
      pipe,
      0.1,
      COURTYARD_HEIGHT,
      0.1,
      -H + 0.3,
      COURTYARD_HEIGHT / 2,
      0.08,
    );
    down.castShadow = false;
    // The door back to the corridor, under its side's letter. It faces
    // into the courtyard and, as the corridor's door it stands for, opens
    // into the courtyard: pulled from here.
    const part = parts.add(
      springDoor(kit, {
        name: `CORRIDOR ${LOOP_SIDES[side].letter} door`,
        opens: -1,
      }),
    );
    wall.add(part.object);
    doors.push({ side, part });
    // A bulkhead light on the wall beside the door, and a light switch on
    // the door's other side, at the usual 1.1 m.
    const bulkhead = createBulkheadLight(kit);
    bulkhead.group.position.set(1.6, 2.7, 0.01);
    wall.add(bulkhead.group);
    lamps.push(bulkhead);
    const light = new Vector3(1.6, 2.7, 0.35);
    wall.updateMatrix();
    lights.push(light.applyMatrix4(wall.matrix));
    switchSpots.push({ wall, x: -1.0, y: 1.1 });
    const sign = createMicroLabel(kit, `CORRIDOR ${LOOP_SIDES[side].letter}`, {
      height: 0.09,
      ink: '#ffffff',
      plate: LOOP_STRIPES[side],
    });
    sign.position.set(0, SPRING_OPENING.height + 0.3, 0.02);
    wall.add(sign);
  });

  // ---- Where the staff smoke --------------------------------------------
  const place = (object: Object3D, x: number, z: number, yaw = 0) => {
    object.position.set(x, 0, z);
    object.rotation.y = yaw;
    object.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    still.add(object);
  };
  const sign = createMicroLabel(kit, 'SMOKING AREA', {
    height: 0.11,
    ink: '#ffffff',
    plate: '#2f6a3a',
  });
  sign.position.set(-H + 4.5, 2.2, -H + 0.02);
  still.add(sign);
  place(createPedestalAshtray(kit), -H + 3.5, -H + 1.2);
  place(createPedestalAshtray(kit), -H + 5.5, -H + 1.2);
  place(createBench(kit), -H + 4.5, -H + 2.2);
  for (const [x, z, yaw] of [
    [-H + 2.3, -H + 3.6, 0.4],
    [-H + 3.2, -H + 4.3, -0.3],
    [-H + 6.2, -H + 3.9, 0.9],
  ] as const)
    place(createBistroChair(kit), x, z, yaw);
  place(createLitterBin(kit), -H + 7, -H + 0.7);
  place(createBench(kit), H - 4.5, H - 1.4, Math.PI);
  // Planters round the walls and two in the middle.
  [
    [-H + 0.6, -H + 0.6],
    [H - 0.6, -H + 0.6],
    [H - 0.6, H - 0.6],
    [-H + 0.6, H - 0.6],
    [-2.5, 2.5],
    [2.5, -2.5],
    [H - 0.6, -2.5],
    [-H + 0.6, 2.5],
  ].forEach(([x, z], seed) => place(createPlanter(kit, seed), x, z));

  // A lamp post with a Victorian-style lantern, west of the middle.
  const post = createLampPost(kit);
  post.group.position.set(LAMP_POST.x, 0, LAMP_POST.z);
  post.group.traverse((o) => {
    o.castShadow = true;
  });
  group.add(post.group);
  lamps.push(post);
  lights.push(new Vector3(LAMP_POST.x, LANTERN_HEIGHT, LAMP_POST.z));

  const batches = mergeStatic(still, Infinity, new Set(), { share: true });
  for (const mesh of batches) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  group.traverse((o) => {
    if (o instanceof Mesh && !batches.includes(o) && o.parent !== still)
      o.castShadow = o.receiveShadow = true;
  });
  return {
    group,
    parts,
    doors,
    batches,
    /** All the courtyard's lights, on one circuit: `set` them together. */
    lamps,
    lights,
    switchSpots,
  };
}
