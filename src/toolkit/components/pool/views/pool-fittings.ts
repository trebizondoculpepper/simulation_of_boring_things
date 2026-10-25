import { markComponent } from '../../core/views/component-identity';
import {
  CanvasTexture,
  Group,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { plantTools } from '../../plant/views/plant-tools';

/**
 * The fittings a public swimming pool's water passes through, in metres,
 * modelled at true size from typical commercial products. The water is
 * drawn off at the surface over a deck-level overflow (most of it) and
 * through main drains in the deepest floor, filtered and treated in the
 * plant rooms, and returned through inlets spread over the pool floor
 * (vertical flow, as the PWTAG Code of Practice prefers for public pools)
 * or in the walls. Deck gullies take splashed and cleaning water off the
 * surround to waste; a vacuum point takes the pool cleaner's hose.
 *
 * Covers and gratings follow the entrapment rules of BS EN 13451-3: slots
 * no wider than 8 mm, outlets in pairs so that no one can be held by the
 * suction of one, and big enough that the water passes slowly. (The
 * figures are from general knowledge of the standards, to be checked
 * against current editions.)
 *
 * Each fitting is built at its origin. A floor fitting's top is flush at
 * y = 0 with its body below; a wall fitting's face is at z = 0, facing +z,
 * its middle at y = 0.
 */

/** The materials a fitting is made of, so a pool can tint them under water. */
export interface PoolFittingMaterials {
  /** White ABS, the usual body and cover. */
  abs: Material;
  /** Stainless steel (316): rims, gully gratings. */
  steel: Material;
  /** What is seen through a slot: a dark wet cavity. */
  cavity: Material;
  /** A grey PVC-U body, below the floor. */
  pvc: Material;
  /** The lens of an underwater light, glowing. */
  lens: Material;
}

type Tools = ReturnType<typeof plantTools>;

/** Plain painted materials, for showing fittings out of the water. */
export function fittingMaterials(kit: PanelKit): PoolFittingMaterials {
  const t = plantTools(kit);
  return {
    abs: t.paint('#f2f3ef', 0.35),
    steel: t.paint('#c9cdcf', 0.28, 0.9),
    cavity: t.paint('#123236', 0.6),
    pvc: t.paint('#8c9295', 0.55),
    lens: t.paint('#fbfff8', 0.2),
  };
}

/**
 * A main drain: a 500 mm square anti-vortex cover, flush in the floor,
 * its slots 8 mm wide between 12 mm bars, over a sump and a DN150 outlet.
 * Fit them in pairs at least 2 m apart.
 */
export function createMainDrain(
  t: Tools,
  m: PoolFittingMaterials,
  { size = 0.5, body = false } = {},
) {
  const group = new Group();
  group.name = 'Main drain';
  const frame = 0.03;
  // The frame round the grille, flush with the tiles.
  for (const [w, d, x, z] of [
    [size, frame, 0, -size / 2 + frame / 2],
    [size, frame, 0, size / 2 - frame / 2],
    [frame, size - 2 * frame, -size / 2 + frame / 2, 0],
    [frame, size - 2 * frame, size / 2 - frame / 2, 0],
  ] as const)
    t.box(group, m.abs, w, 0.012, d, x, -0.006, z);
  // Bars across, 12 mm wide with 8 mm slots between.
  const inner = size - 2 * frame;
  const pitch = 0.02;
  const bars = Math.floor(inner / pitch);
  for (let i = 0; i < bars; i++)
    t.box(
      group,
      m.abs,
      inner,
      0.01,
      0.012,
      0,
      -0.005,
      -inner / 2 + pitch * (i + 0.5),
    );
  // The dark sump seen through the slots.
  t.box(group, m.cavity, inner, 0.004, inner, 0, -0.03, 0);
  if (body) {
    t.box(group, m.pvc, size, 0.35, size, 0, -0.2, 0);
    t.rod(group, m.pvc, [0, -0.3, 0], [0, -0.3, size / 2 + 0.4], 0.084, 20);
  }
  return group;
}

/**
 * A floor inlet: a Ø160 mm flush disc returning treated water upward,
 * its flow through a ring of radial slots round an adjustable centre cap.
 */
export function createFloorInlet(
  t: Tools,
  m: PoolFittingMaterials,
  { body = false } = {},
) {
  const group = new Group();
  group.name = 'Floor inlet';
  t.cyl(group, m.abs, 0.08, 0.008, 0, -0.002, 0, 'y', 32);
  t.cyl(group, m.cavity, 0.068, 0.004, 0, 0.0025, 0, 'y', 32);
  t.cyl(group, m.abs, 0.032, 0.008, 0, 0.003, 0, 'y', 24);
  // Webs between the slots.
  for (let i = 0; i < 12; i++) {
    const web = t.box(group, m.abs, 0.038, 0.006, 0.008, 0, 0.0035, 0);
    const a = (i / 12) * Math.PI * 2;
    web.position.set(Math.cos(a) * 0.05, 0.0035, Math.sin(a) * 0.05);
    web.rotation.y = -a;
  }
  if (body) {
    t.cyl(group, m.pvc, 0.07, 0.14, 0, -0.075, 0, 'y', 24);
    t.rod(group, m.pvc, [0, -0.15, 0], [0, -0.45, 0], 0.025, 16);
  }
  return group;
}

/**
 * A wall inlet: an "eyeball" return jet, a Ø110 mm flange with a Ø50 mm
 * ball that turns to aim the flow, for the shallower pools and the spa.
 */
export function createWallInlet(t: Tools, m: PoolFittingMaterials) {
  const group = new Group();
  group.name = 'Wall inlet';
  t.cyl(group, m.abs, 0.055, 0.012, 0, 0, 0.006, 'z', 32);
  const ball = t.cyl(group, m.abs, 0.025, 0.03, 0, 0, 0.02, 'z', 24);
  ball.scale.set(1, 1, 1);
  t.cyl(group, m.cavity, 0.011, 0.004, 0.003, 0.002, 0.036, 'z', 16);
  return group;
}

/**
 * A vacuum point: the wall socket a pool cleaner's hose plugs into, a
 * Ø130 mm flange round a DN50 socket, closed by a cap on a lanyard.
 */
export function createVacuumPoint(t: Tools, m: PoolFittingMaterials) {
  const group = new Group();
  group.name = 'Vacuum point';
  t.cyl(group, m.abs, 0.065, 0.012, 0, 0, 0.006, 'z', 32);
  t.cyl(group, m.abs, 0.038, 0.03, 0, 0, 0.02, 'z', 24);
  // The cap's grip lugs.
  for (const x of [-0.025, 0.025])
    t.box(group, m.abs, 0.008, 0.03, 0.012, x, 0, 0.04);
  // The lanyard's eye on the flange.
  t.cyl(group, m.steel, 0.005, 0.006, 0, -0.055, 0.014, 'z', 10);
  return group;
}

/**
 * A deck gully: a 150 mm square stainless slotted grating flush in the
 * surround, over a trapped body and a DN50 outlet to waste. Splash and
 * wash-down water goes to drain, not back to the pool.
 */
export function createDeckGully(
  t: Tools,
  m: PoolFittingMaterials,
  { body = false } = {},
) {
  const group = new Group();
  group.name = 'Deck gully';
  // A working drain fitting, not scenery: named for itself (prompt 064).
  markComponent(group, { name: 'Deck gully' });
  const s = 0.15;
  t.box(group, m.steel, s, 0.006, 0.012, 0, -0.003, -s / 2 + 0.006);
  t.box(group, m.steel, s, 0.006, 0.012, 0, -0.003, s / 2 - 0.006);
  t.box(group, m.steel, 0.012, 0.006, s, -s / 2 + 0.006, -0.003, 0);
  t.box(group, m.steel, 0.012, 0.006, s, s / 2 - 0.006, -0.003, 0);
  for (let i = 0; i < 7; i++)
    t.box(
      group,
      m.steel,
      0.006,
      0.005,
      s - 0.02,
      -0.054 + i * 0.018,
      -0.003,
      0,
    );
  t.box(group, m.cavity, s - 0.02, 0.003, s - 0.02, 0, -0.02, 0);
  if (body) {
    t.box(group, m.pvc, 0.17, 0.16, 0.17, 0, -0.1, 0);
    t.rod(group, m.pvc, [0, -0.13, 0], [0.4, -0.13, 0], 0.028, 16);
  }
  return group;
}

/**
 * An underwater light set in the pool wall: a Ø300 mm stainless rim round
 * a glowing lens, in its niche.
 */
export function createPoolLight(t: Tools, m: PoolFittingMaterials) {
  const group = new Group();
  group.name = 'Underwater light';
  t.cyl(group, m.steel, 0.15, 0.012, 0, 0, 0.006, 'z', 40);
  t.cyl(group, m.lens, 0.128, 0.016, 0, 0, 0.01, 'z', 40);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    t.cyl(
      group,
      m.steel,
      0.006,
      0.006,
      Math.cos(a) * 0.14,
      Math.sin(a) * 0.14,
      0.014,
      'z',
      8,
    );
  }
  return group;
}

/**
 * A skimmer, for a small pool (the spa) whose water stands below its
 * edge: a mouth at the water line with a floating weir flap, a basket
 * behind that traps leaves and hair, under a Ø250 mm lid in the deck.
 * Its face is at z = 0 with the water line at y = 0; its lid is set back
 * `behind` metres in the deck at `deck` metres above the water.
 */
export function createSkimmer(
  t: Tools,
  m: PoolFittingMaterials,
  { deck = 0.15, behind = 0.35 } = {},
) {
  const group = new Group();
  group.name = 'Skimmer';
  const w = 0.24,
    h = 0.16;
  // The faceplate round the mouth, and the mouth's dark opening.
  t.box(group, m.abs, w + 0.06, 0.03, 0.012, 0, h / 2 + 0.015, 0.006);
  t.box(group, m.abs, w + 0.06, 0.03, 0.012, 0, -h / 2 - 0.015, 0.006);
  t.box(group, m.abs, 0.03, h, 0.012, -w / 2 - 0.015, 0, 0.006);
  t.box(group, m.abs, 0.03, h, 0.012, w / 2 + 0.015, 0, 0.006);
  t.box(group, m.cavity, w, h, 0.004, 0, 0, -0.06);
  // The weir flap, tipped in a little by the flow.
  const weir = t.box(group, m.abs, w - 0.01, 0.07, 0.006, 0, -0.04, -0.02);
  weir.rotation.x = -0.25;
  // The lid in the deck.
  t.cyl(group, m.abs, 0.125, 0.01, 0, deck - 0.005, -behind, 'y', 32);
  t.cyl(group, m.abs, 0.02, 0.004, 0, deck + 0.002, -behind, 'y', 16);
  return group;
}

/** The deck-level overflow's grating: bars across it, 8 mm apart. */
const GRATING_PITCH = 0.016;

/**
 * A short length of the deck-level overflow, modelled bar by bar: a
 * 245 mm wide finger grating of white PVC bars across a tiled channel.
 * The grating's top is at y = 0, the run along x, the pool on the +z side.
 */
export function createOverflowGrating(
  t: Tools,
  m: PoolFittingMaterials,
  length: number,
  width = 0.245,
) {
  const group = new Group();
  group.name = 'Overflow grating';
  const bars = Math.floor(length / GRATING_PITCH);
  for (let i = 0; i < bars; i++)
    t.box(
      group,
      m.abs,
      0.008,
      0.02,
      width,
      -length / 2 + GRATING_PITCH * (i + 0.5),
      -0.01,
      0,
    );
  // The joining rods through the bars, near each side.
  for (const z of [-width / 2 + 0.03, width / 2 - 0.03])
    t.rod(
      group,
      m.abs,
      [-length / 2, -0.012, z],
      [length / 2, -0.012, z],
      0.004,
      8,
    );
  return group;
}

/**
 * The overflow grating for long runs, drawn as a texture: one material,
 * its bars along the texture's u, 8 mm apart. `gratingStrip` makes its
 * pieces.
 */
export function createGratingMaterial(kit: PanelKit) {
  const w = 256,
    h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('No 2D canvas context.');
  // Eight bar pitches across the texture: dark slot, white bar.
  c.fillStyle = '#163a3e';
  c.fillRect(0, 0, w, h);
  const bars = 8;
  for (let i = 0; i < bars; i++) {
    const x = (i / bars) * w;
    c.fillStyle = '#eef0ec';
    c.fillRect(x, 0, (w / bars) * 0.5, h);
    c.fillStyle = '#c9cdca';
    c.fillRect(x + (w / bars) * 0.42, 0, (w / bars) * 0.08, h);
  }
  // The joining rods' shadows near each side.
  c.fillStyle = 'rgba(20, 40, 44, 0.25)';
  c.fillRect(0, h * 0.1, w, h * 0.05);
  c.fillRect(0, h * 0.85, w, h * 0.05);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.4 });
  kit.textures.push(texture);
  kit.materials.push(material);
  return material;
}

/**
 * A strip of textured overflow grating, `length` along its x and `width`
 * across, flat and facing up at its origin, its texture repeating once
 * every eight bars.
 */
export function gratingStrip(length: number, width = 0.245): BufferGeometry {
  const geometry = new PlaneGeometry(length, width).rotateX(-Math.PI / 2);
  const uv = geometry.getAttribute('uv');
  const repeat = length / (8 * GRATING_PITCH);
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * repeat);
  uv.needsUpdate = true;
  return geometry;
}

/** Add `fitting` to `parent` at (x, y, z), turned `yaw` about y. */
export function place(
  parent: Object3D,
  fitting: Object3D,
  x: number,
  y: number,
  z: number,
  yaw = 0,
) {
  fitting.position.set(x, y, z);
  fitting.rotation.y = yaw;
  parent.add(fitting);
  return fitting;
}
