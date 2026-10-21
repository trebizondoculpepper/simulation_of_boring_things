import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
} from 'three';
import type { Object3D } from 'three';
import type { Footprint } from '../../controls/logic/walk-collision';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import {
  createPipe,
  nearestSize,
  PIPE_KINDS,
} from '../../components/core/views/pipe-kinds';
import type { PipeKindId } from '../../components/core/views/pipe-kinds';
import {
  createDampers,
  createInsulatedDuct,
  createRectangularDuct,
  createSpiralDuct,
} from '../../components/plant/views/ductwork';
import { createServiceCeiling } from '../../components/site-dressing/views/service-ceiling';

/**
 * pipes_n_dreams ("Pipes'n Dreams"): a development room showing every
 * kind of pipe and duct the game knows, each on its own stand with its
 * name and what it carries: the pipe kinds (`pipe-kinds.ts`), each run
 * rising and turning in two planes so its bends and joints show, the
 * flexible tubes and hoses, and the plant's ductwork specimens; and over
 * it all a generated services ceiling, built with the same pipe helper.
 * 28 m × 16 m, the deck 7 m up. Metres, the room's middle at the origin.
 */
export const PIPES_ROOM = { w: 28, d: 16, deckY: 7, wall: 0.2 } as const;
const R = PIPES_ROOM;

/** Each stand: 2.6 m wide, 1.2 m deep, along the north and south walls. */
const STAND = { w: 2.6, d: 1.2, h: 0.25 } as const;
const NORTH_Z = -R.d / 2 + 1.6;
const SOUTH_Z = R.d / 2 - 1.6;
const xs = (n: number) =>
  Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 2.9);

const KIND_ORDER: readonly PipeKindId[] = [
  'pvc-pressure',
  'pvc-drain',
  'abs-chemical',
  'copper',
  'steel-screwed',
  'steel-flanged',
  'grooved-fire',
  'stainless',
  'lagged-heating',
  'flue',
  'twin-wall-flue',
  'chemical-tube',
  'pressure-hose',
];

/** The stands' footprints, for walking collision. */
export function pipesRoomSolids(): Footprint[] {
  const hx = R.w / 2;
  const hz = R.d / 2;
  const t = R.wall;
  const stand = (x: number, z: number): Footprint => ({
    minX: x - STAND.w / 2,
    maxX: x + STAND.w / 2,
    minZ: z - STAND.d / 2,
    maxZ: z + STAND.d / 2,
  });
  return [
    { minX: -hx - t, maxX: hx + t, minZ: -hz - t, maxZ: -hz },
    { minX: -hx - t, maxX: hx + t, minZ: hz, maxZ: hz + t },
    { minX: -hx - t, maxX: -hx, minZ: -hz, maxZ: hz },
    { minX: hx, maxX: hx + t, minZ: -hz, maxZ: hz },
    ...xs(9).map((x) => stand(x, NORTH_Z)),
    ...xs(9).map((x) => stand(x, SOUTH_Z)),
  ];
}

/** A printed card, `w` × `h` m, its title and a line under it, facing +z. */
function card(title: string, line: string, w = 2.3, h = 0.32) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round((1024 * h) / w);
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#f1efe6';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#1d2125';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `bold ${Math.round(canvas.height * 0.32)}px Arial, Helvetica, sans-serif`;
  c.fillText(
    title,
    canvas.width / 2,
    canvas.height * 0.36,
    canvas.width * 0.94,
  );
  c.font = `${Math.round(canvas.height * 0.22)}px Arial, Helvetica, sans-serif`;
  c.fillText(line, canvas.width / 2, canvas.height * 0.74, canvas.width * 0.94);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return new Mesh(
    new PlaneGeometry(w, h),
    new MeshBasicMaterial({ map: texture }),
  );
}

export function createPipesRoom(metre: number) {
  const group = new Group();
  group.name = 'pipes_n_dreams';
  group.scale.setScalar(metre);
  const hx = R.w / 2;
  const hz = R.d / 2;
  const box = (
    material: MeshStandardMaterial,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    parent: Object3D = group,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const floor = new MeshStandardMaterial({ color: '#8f918d', roughness: 0.55 });
  const paint = new MeshStandardMaterial({ color: '#dedcd5', roughness: 0.85 });
  const plinth = new MeshStandardMaterial({ color: '#4d5250', roughness: 0.8 });
  const frame = new MeshStandardMaterial({
    color: '#b9bec0',
    roughness: 0.45,
    metalness: 0.5,
  });
  box(floor, R.w, 0.1, R.d, 0, -0.05, 0);
  const h = R.deckY + 0.2;
  box(paint, R.w + 2 * R.wall, h, R.wall, 0, h / 2, -hz - R.wall / 2);
  box(paint, R.w + 2 * R.wall, h, R.wall, 0, h / 2, hz + R.wall / 2);
  box(paint, R.wall, h, R.d, -hx - R.wall / 2, h / 2, 0);
  box(paint, R.wall, h, R.d, hx + R.wall / 2, h / 2, 0);

  /** A stand at (x, z), facing the room's middle line. */
  const stand = (x: number, z: number, title: string, line: string) => {
    const s = new Group();
    s.position.set(x, 0, z);
    // Stands on the south wall face north, toward the aisle.
    s.rotation.y = z > 0 ? Math.PI : 0;
    group.add(s);
    box(plinth, STAND.w, STAND.h, STAND.d, 0, STAND.h / 2, 0, s);
    // Two strut posts at the back, as a run is fixed to a wall.
    for (const px of [-1, 1])
      box(
        frame,
        0.041,
        1.6,
        0.041,
        px * 1.1,
        STAND.h + 0.8,
        -STAND.d / 2 + 0.08,
        s,
      );
    const label = card(title, line);
    label.position.set(0, STAND.h / 2, STAND.d / 2 + 0.002);
    label.scale.setScalar(0.9);
    s.add(label);
    return s;
  };

  // ---- The pipe kinds, one a stand -----------------------------------------
  const slots = [
    ...xs(9).map((x) => [x, NORTH_Z] as const),
    ...xs(9).map((x) => [x, SOUTH_Z] as const),
  ];
  KIND_ORDER.forEach((id, i) => {
    const kind = PIPE_KINDS[id];
    const [x, z] = slots[i];
    const od = nearestSize(
      id,
      kind.flexible
        ? 0.012
        : id === 'pvc-drain'
          ? 0.11
          : id.includes('flue')
            ? 0.2
            : 0.06,
    );
    const s = stand(
      x,
      z,
      kind.name,
      `${Math.round(od * 1000)} mm · ${kind.carries}`,
    );
    const y0 = STAND.h + 0.35;
    // Along, up, back, along: bends in two planes, joints along the lengths.
    const route: Vec3[] = kind.flexible
      ? [
          [-1.0, y0, 0.1],
          [-0.4, y0 + 0.6, 0.15],
          [0.2, y0 + 0.2, 0],
          [0.7, y0 + 0.9, -0.2],
          [1.0, y0 + 0.5, -0.1],
        ]
      : [
          [-1.05, y0, 0.15],
          [0.05, y0, 0.15],
          [0.05, y0 + 0.9, 0.15],
          [0.05, y0 + 0.9, -0.25],
          [1.05, y0 + 0.9, -0.25],
        ];
    const run = createPipe(id, od, route, { lengths: 0.55 });
    // Short pipes are joined in the demonstration, to show the joints.
    s.add(run);
  });

  // ---- Ductwork: the plant's duct specimens ---------------------------------
  const kit = createPanelKit();
  const ducts: [string, string, (k: typeof kit) => Object3D][] = [
    [
      'Rectangular ductwork',
      'galvanised, with flanged joints',
      createRectangularDuct,
    ],
    ['Spiral-wound duct', 'galvanised, round', createSpiralDuct],
    ['Insulated duct', 'foil-faced lagging', createInsulatedDuct],
  ];
  ducts.forEach(([title, line, make], k) => {
    const [x, z] = slots[KIND_ORDER.length + k];
    const s = stand(x, z, title, line);
    const model = make(kit);
    model.position.y = STAND.h;
    model.scale.setScalar(0.7);
    s.add(model);
  });
  // The dampers on the last stand.
  {
    const [x, z] = slots[KIND_ORDER.length + ducts.length];
    const s = stand(x, z, 'Duct dampers', 'volume and fire dampers');
    const model = createDampers(kit);
    model.position.y = STAND.h;
    model.scale.setScalar(0.7);
    s.add(model);
  }

  // ---- Overhead: a generated services ceiling --------------------------------
  group.add(
    createServiceCeiling(
      { minX: -hx, maxX: hx, minZ: -hz, maxZ: hz, deckY: R.deckY },
      { seed: 7, density: 0.8 },
    ).group,
  );
  // Work lights along the middle, under the services.
  for (const x of [-8, 0, 8])
    for (const z of [-3, 3]) {
      const light = new PointLight(
        '#fff4e2',
        10 * metre * metre,
        16 * metre,
        2,
      );
      light.position.set(x, 3.6, z);
      group.add(light);
    }
  return group;
}
