import { Group } from 'three';
import type { Material, Object3D } from 'three';
import { slabPieces } from '../../logic/pool-room-plan';
import type { Opening } from '../../logic/pool-room-plan';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { SANS } from '../../../components/core/views/fitting-tools';
import { METRE } from '../../../components/core/logic/units';
import { plantTools } from '../../../components/plant/views/plant-tools';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../../components/pool/views/pool-surfaces';
import {
  createDeckGully,
  createFloorInlet,
  createMainDrain,
  createOverflowGrating,
  createPoolLight,
  createSkimmer,
  createVacuumPoint,
  createWallInlet,
  fittingMaterials,
  place,
} from '../../../components/pool/views/pool-fittings';
import type { PlantExhibit } from './exhibit';
import { AMENITY_EXHIBITS } from './pool-amenities';

/**
 * dev12: the pool fittings (`components/pool/views/pool-fittings.ts`),
 * each set in a sample of the pools' own glazed tile, with cut-aways
 * where what is under the floor matters. Out of the water here; the same
 * components are set into the pools in dev11.
 */
export const PURPOSE =
  'Drains, inlets, overflow, gullies and wall fittings, set in pool tile; the shower, the footbath and the jacuzzi with its controller';

type Tools = ReturnType<typeof plantTools>;

/** The pools' tile, dry (no water line, no caustics). */
const tileFor = (kit: PanelKit) => {
  const uniforms = createPoolUniforms(METRE, -100, []);
  uniforms.caustics.value = uniforms.reflected.value = 0;
  const material = createTileMaterial(uniforms);
  kit.materials.push(material);
  return material;
};

/** A small printed tag naming a part, facing +z at (x, y, z). */
function tag(
  t: Tools,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  w = 0.36,
) {
  const lines = text.split('\n');
  const label = t.printed(
    w,
    0.035 * lines.length + 0.02,
    (c, cw, ch) => {
      c.fillStyle = '#eef0ea';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#1f2b31';
      c.font = `bold ${(ch / lines.length) * 0.5}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, i) =>
        c.fillText(line, cw / 2, (ch / lines.length) * (i + 0.5)),
      );
    },
    384,
  );
  label.mesh.position.set(x, y, z);
  parent.add(label.mesh);
}

/**
 * A tiled slab `w` × `d`, `h` thick with its top at `top`, cut open at
 * `openings` (so a cover's slots show the dark sump below).
 */
function tiledSlab(
  t: Tools,
  parent: Object3D,
  material: Material,
  w: number,
  d: number,
  h: number,
  top: number,
  openings: readonly Opening[],
  x = 0,
) {
  for (const piece of slabPieces(w, d, openings))
    t.box(
      parent,
      material,
      piece.w,
      h,
      piece.d,
      x + piece.x,
      top - h / 2,
      piece.z,
    );
}

/** A stand of four legs under a slab `w` × `d` whose underside is at `y`. */
function legs(t: Tools, parent: Object3D, w: number, d: number, y: number) {
  const steel = t.paint('#5b5f61', 0.6);
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05])
    for (const z of [-d / 2 + 0.05, d / 2 - 0.05])
      t.box(parent, steel, 0.04, y, 0.04, x, y / 2, z);
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Main drains',
    reference:
      'A pair 2 m apart, 500 mm anti-vortex covers, 8 mm slots (BS EN 13451-3)',
    size: { w: 2.8, d: 1.3, h: 0.6, mount: 'floor' },
    build(kit) {
      const t = plantTools(kit);
      const m = fittingMaterials(kit);
      const group = new Group();
      const sumps = [-1, 1].map((x) => ({ x, z: 0, w: 0.44, d: 0.44 }));
      tiledSlab(t, group, tileFor(kit), 2.8, 1.2, 0.45, 0.45, sumps);
      for (const { x } of sumps)
        place(group, createMainDrain(t, m, { body: true }), x, 0.45, 0);
      tag(
        t,
        group,
        'Pool floor, deepest point\n≥ 2 m between the pair',
        0,
        0.3,
        0.61,
        0.5,
      );
      return group;
    },
  },
  {
    title: 'Main drain, cut away',
    reference: 'Cover, sump and DN150 outlet to the balance tank',
    size: { w: 1.2, d: 1.4, h: 1.0, mount: 'floor' },
    build(kit) {
      const t = plantTools(kit);
      const m = fittingMaterials(kit);
      const group = new Group();
      legs(t, group, 0.7, 0.7, 0.5);
      place(group, createMainDrain(t, m, { body: true }), 0, 0.9, -0.2);
      tag(
        t,
        group,
        'Sump under the cover\nOutlet to balance tank',
        0,
        0.25,
        0.4,
      );
      return group;
    },
  },
  {
    title: 'Floor inlets',
    reference: 'Ø160 mm, returning treated water upward (vertical flow)',
    size: { w: 1.8, d: 1.2, h: 1.0, mount: 'floor' },
    build(kit) {
      const t = plantTools(kit);
      const m = fittingMaterials(kit);
      const group = new Group();
      t.box(group, tileFor(kit), 1.0, 0.45, 1.0, -0.4, 0.225, 0);
      for (const z of [-0.25, 0.25])
        place(group, createFloorInlet(t, m), -0.4, 0.45, z);
      // One lifted out, on a stand, with its body and pipe.
      legs(t, group, 0.4, 0.4, 0.55);
      t.box(group, t.paint('#5b5f61', 0.6), 0.4, 0.02, 0.4, 0.55, 0.56, 0);
      place(group, createFloorInlet(t, m, { body: true }), 0.55, 0.95, 0);
      tag(t, group, 'Flush in the floor', -0.4, 0.3, 0.51);
      tag(t, group, 'Body and DN50 feed', 0.55, 0.3, 0.25);
      return group;
    },
  },
  {
    title: 'Deck-level overflow',
    reference:
      '245 mm finger grating, 8 mm slots, over a tiled channel (cut away)',
    size: { w: 1.6, d: 1.3, h: 1.1, mount: 'floor' },
    build(kit) {
      const t = plantTools(kit);
      const m = fittingMaterials(kit);
      const tile = tileFor(kit);
      const group = new Group();
      const L = 1.4,
        top = 1.0,
        width = 0.245;
      // The pool wall, its face toward the viewer (the water side).
      t.box(group, tile, L, top, 0.3, 0, top / 2, 0.35);
      // The channel: its floor and back wall; the deck behind it.
      const back = 0.2 - width;
      t.box(
        group,
        tile,
        L,
        top - 0.2,
        width,
        0,
        (top - 0.2) / 2,
        back + width / 2,
      );
      t.box(group, tile, L, top, 0.55, 0, top / 2, back - 0.275);
      // The water in the channel, and the grating over it.
      t.box(group, m.cavity, L, 0.004, width, 0, top - 0.17, back + width / 2);
      place(
        group,
        createOverflowGrating(t, m, L, width),
        0,
        top,
        back + width / 2,
      );
      tag(
        t,
        group,
        'Pool water spills over the edge\ninto the channel, to the balance tank',
        0,
        0.45,
        0.51,
        0.62,
      );
      return group;
    },
  },
  {
    title: 'Deck gully',
    reference: '150 mm stainless slotted grating, trapped body, DN50 to waste',
    size: { w: 1.0, d: 1.0, h: 0.8, mount: 'floor' },
    build(kit) {
      const t = plantTools(kit);
      const m = fittingMaterials(kit);
      const group = new Group();
      const y = 0.75;
      legs(t, group, 0.8, 0.8, y - 0.06);
      tiledSlab(t, group, tileFor(kit), 0.8, 0.8, 0.06, y, [
        { x: 0, z: 0, w: 0.13, d: 0.13 },
      ]);
      place(group, createDeckGully(t, m, { body: true }), 0, y, 0);
      tag(
        t,
        group,
        'Splash and wash-down water\nto drain, not back to the pool',
        0,
        0.3,
        0.41,
        0.5,
      );
      return group;
    },
  },
  {
    title: 'Skimmer',
    reference:
      'For the spa: weir at the water line, basket under a Ø250 mm deck lid',
    size: { w: 1.0, d: 0.9, h: 0.9, mount: 'floor' },
    build(kit) {
      const t = plantTools(kit);
      const m = fittingMaterials(kit);
      const group = new Group();
      const water = 0.7,
        deck = 0.85;
      t.box(group, tileFor(kit), 1.0, deck, 0.7, 0, deck / 2, 0);
      place(
        group,
        createSkimmer(t, m, { deck: deck - water, behind: 0.35 }),
        0,
        water,
        0.35,
      );
      tag(t, group, 'Water line', 0, 0.35, 0.36, 0.24);
      return group;
    },
  },
  {
    title: 'Wall fittings',
    reference: 'Eyeball inlet, vacuum point, underwater light',
    size: { w: 2.4, d: 0.15, h: 1.0, mount: 'wall', y: 1.3 },
    build(kit) {
      const t = plantTools(kit);
      const m = fittingMaterials(kit);
      const group = new Group();
      t.box(group, tileFor(kit), 2.4, 1.0, 0.1, 0, 0, 0.05);
      const face = 0.1;
      place(group, createWallInlet(t, m), -0.8, 0.1, face);
      place(group, createVacuumPoint(t, m), 0, 0.1, face);
      place(group, createPoolLight(t, m), 0.8, 0.1, face);
      tag(t, group, 'Wall inlet\nØ50 eyeball', -0.8, -0.25, face + 0.01, 0.3);
      tag(t, group, 'Vacuum point\nDN50, capped', 0, -0.25, face + 0.01, 0.3);
      tag(t, group, 'Underwater light\nØ300', 0.8, -0.25, face + 0.01, 0.3);
      return group;
    },
  },
  ...AMENITY_EXHIBITS,
];
