import {
  CanvasTexture,
  ClampToEdgeWrapping,
  DataTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RGBAFormat,
  RepeatWrapping,
  Vector2,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { SECTION } from '../logic/edge-profiles';
import type { EdgeProfile, Point } from '../logic/edge-profiles';
import { sweepProfile } from './profile-sweep';
import { insetPolygon, trimPath } from '../logic/plan-path';
import { OVERFLOW_MAX_SPEED, flowMapTexels } from '../logic/flow-map';

/**
 * A pool edge built full size (`edge-profiles.ts`): its profile swept
 * along `path` in plan (`profile-sweep.ts`), mitred at the corners, its
 * cut ends in raw concrete, the pool-facing and deck surfaces in `tile`,
 * the water at its level (the pool's, and any lying in the gutter), and
 * the grating over its channel. The deck's level is y = 0; the deck lies
 * to the path's right as it is walked, the pool to its left.
 */

export type PlanPath = readonly (readonly [number, number])[];

/** One cycle of the overflow's flow-map ripples, seconds (Vlachos's phase). */
const FLOW_PERIOD = 0.8;

/** How far the pool is drawn down below its overflow when not full, metres. */
export const DRAW_DOWN = 0.015;

/** A straight run, 1.4 m, along −z. */
export const STRAIGHT: PlanPath = [
  [0, 0.7],
  [0, -0.7],
];

/**
 * A stepped run: an edge, a concave corner (the deck juts into the pool:
 * the water's outline turns through 270°), more edge, a convex corner
 * (the pool's ordinary corner), and edge again.
 */
export const STEPPED: PlanPath = [
  [0, 1.5],
  [0, 0],
  [1.5, 0],
  [1.5, -1.5],
];

export function createPoolEdge(
  kit: PanelKit,
  profile: EdgeProfile,
  tile: Material,
  path: PlanPath = STRAIGHT,
  /** How far below the deck the plinth reaches (to the floor), metres. */
  plinth = 0,
) {
  const t = tools(kit);
  const group = new Group();
  group.name = `Pool edge: ${profile.era} ${profile.name}`;
  const twoSided = (m: Material) => {
    m.side = DoubleSide;
    return m;
  };
  const concrete = twoSided(t.paint('#a3a198', 0.95));
  twoSided(tile);
  // The section's back, underside and the pool floor's far end are cut,
  // like its ends.
  const bottom = -SECTION.depth - SECTION.slab;
  const cut = (a: Point, b: Point) =>
    (a[0] === b[0] && (a[0] === SECTION.deck || a[0] === -SECTION.pool)) ||
    (a[1] === b[1] && a[1] === bottom);
  group.add(new Mesh(sweepProfile(profile.solid, path, cut), [tile, concrete]));
  // The water, glassy and clear.
  const water = new MeshStandardMaterial({
    color: '#3fb3c8',
    roughness: 0.04,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: DoubleSide,
  });
  kit.materials.push(water);
  // Each water shape a millimetre clear of the tiles and cut ends it lies
  // against, so the surfaces never share a plane and flicker.
  const clear = 0.001;
  const waterPath = trimPath(path, clear);
  // The pool's water (the first shape) and any sheet spilling over its
  // edge, which goes when the level drops.
  const pool: Mesh[] = [];
  const spilling: Mesh[] = [];
  for (const [i, w] of profile.water.entries()) {
    const mesh = new Mesh(
      sweepProfile(insetPolygon(w, clear), waterPath),
      water,
    );
    mesh.renderOrder = 1;
    mesh.userData.live = true;
    if (i === 0) pool.push(mesh);
    else if (Math.max(...w.map(([, y]) => y)) > profile.waterLevel - 0.02)
      spilling.push(mesh);
    group.add(mesh);
  }
  const rect = (
    from: number,
    to: number,
    bottom: number,
    top: number,
  ): Point[] => [
    [from, bottom],
    [to, bottom],
    [to, top],
    [from, top],
  ];
  const g = profile.grating;
  if (g) group.add(createGrating(kit, g, path));
  const spill = profile.spill ? createSpill(kit, profile.spill, path) : null;
  if (spill) group.add(spill.mesh);
  if (profile.marker)
    group.add(
      new Mesh(
        sweepProfile(
          rect(profile.marker.from, profile.marker.to, 0, 0.003),
          path,
        ),
        twoSided(t.paint(profile.marker.colour, 0.3)),
      ),
    );
  if (plinth > 0)
    group.add(
      new Mesh(
        sweepProfile(rect(-SECTION.pool, SECTION.deck, -plinth, bottom), path),
        twoSided(t.paint('#3a3d40', 0.8)),
      ),
    );
  // How full the pool is: 1 brimming (its overflow running), 0 drawn
  // down a little below the overflow, so the edge and grating are dry.
  let full = 1,
    target = 1;
  return Object.assign(group, {
    /** Fill the pool to its overflow, or draw it down below it. */
    setFull(on: boolean) {
      target = on ? 1 : 0;
    },
    /** Move the level and the overflow's glints on: call each frame. */
    update(delta: number) {
      full += (target - full) * Math.min(1, delta * 1.5);
      for (const m of pool) m.position.y = (full - 1) * DRAW_DOWN;
      for (const m of spilling) m.visible = full > 0.6;
      spill?.update(delta, full);
    },
  });
}

/**
 * The overflow at a deck-level edge: a film of water millimetres deep,
 * sliding off the pool, over the edge tile and through the first slots of
 * the grating. Too thin to see as water, it shows as glints: a clear,
 * glossy strip whose ripples run outward from the pool, so the highlights
 * slide across the edge and vanish into the grating.
 *
 * The ripples move by flow-map water, after Alex Vlachos, "Water Flow in
 * Portal 2" (SIGGRAPH 2010; the sums in `flow-map.ts`): a flow map of
 * vectors says how the film runs at each point (slow off the pool, faster
 * over the edge, fastest through the slots, wandering a little along the
 * edge), and the material's shader drags its ripple normal map along
 * them, sampled twice half a cycle apart and cross-faded so that neither
 * copy is seen to restart, with a noise offsetting the cycle point to
 * point. A broad layer in the normal map and a fine one in the clearcoat's
 * are dragged by the same flow, at their own scales.
 */
function createSpill(
  kit: PanelKit,
  spill: NonNullable<EdgeProfile['spill']>,
  path: PlanPath,
) {
  // A tileable ripple height field, as normals: a few crossing wavelets,
  // the strongest running across the edge (the way the water goes).
  const px = 128;
  const height = (x: number, y: number) => {
    const t = (2 * Math.PI) / px;
    return (
      Math.sin(t * (2 * x + 9 * y)) * 0.5 +
      Math.sin(t * (-3 * x + 7 * y) + 1.3) * 0.35 +
      Math.sin(t * (5 * x + 4 * y) + 2.1) * 0.2 +
      Math.sin(t * (1 * x + 13 * y) + 0.4) * 0.15
    );
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('No 2D canvas context.');
  const image = c.createImageData(px, px);
  for (let y = 0; y < px; y++)
    for (let x = 0; x < px; x++) {
      const dx = (height(x + 1, y) - height(x - 1, y)) * 2,
        dy = (height(x, y + 1) - height(x, y - 1)) * 2;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * px + x) * 4;
      image.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      image.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      image.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  c.putImageData(image, 0, 0);
  // The ripples at two scales: a broad layer and a fine one.
  const layer = (along: number, across: number) => {
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    // UVs are metres: a tile `along` the edge and `across` it.
    texture.repeat.set(1 / along, 1 / across);
    kit.textures.push(texture);
    return texture;
  };
  const broad = layer(0.3, 0.12);
  const fine = layer(0.11, 0.045);
  // The film's mask across the edge: in from the pool, thinning out into
  // the grating where it has all fallen through.
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = 4;
  maskCanvas.height = 64;
  const mc = maskCanvas.getContext('2d');
  if (!mc) throw new Error('No 2D canvas context.');
  const fade = mc.createLinearGradient(0, 0, 0, 64);
  fade.addColorStop(0, '#000');
  fade.addColorStop(0.2, '#fff');
  fade.addColorStop(0.55, '#fff');
  fade.addColorStop(1, '#000');
  mc.fillStyle = fade;
  mc.fillRect(0, 0, 4, 64);
  const mask = new CanvasTexture(maskCanvas);
  // Across the film's width: v from spill.from to spill.to.
  mask.repeat.set(1, 1 / (spill.to - spill.from));
  mask.offset.set(0, -spill.from / (spill.to - spill.from));
  kit.textures.push(mask);
  const material = new MeshPhysicalMaterial({
    color: '#bfe8ef',
    roughness: 0.05,
    metalness: 0,
    normalMap: broad,
    normalScale: new Vector2(1.4, 1.4),
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    clearcoatNormalMap: fine,
    clearcoatNormalScale: new Vector2(0.8, 0.8),
    alphaMap: mask,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: DoubleSide,
  });
  // The flow map, laid over the film by the mask's UVs: u along the edge
  // (a metre a repeat), v across it from the pool (0) to the slots (1).
  const fw = 64,
    fh = 32;
  const flowMap = new DataTexture(flowMapTexels(fw, fh), fw, fh, RGBAFormat);
  flowMap.wrapS = RepeatWrapping;
  flowMap.wrapT = ClampToEdgeWrapping;
  flowMap.magFilter = flowMap.minFilter = LinearFilter;
  flowMap.needsUpdate = true;
  kit.textures.push(flowMap);
  const flow = {
    flowMap: { value: flowMap },
    flowTime: { value: 0 },
    flowPeriod: { value: FLOW_PERIOD },
    flowMaxSpeed: { value: OVERFLOW_MAX_SPEED },
    flowRepeat: { value: broad.repeat },
    clearcoatFlowRepeat: { value: fine.repeat },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, flow);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <uv_pars_fragment>',
        `#include <uv_pars_fragment>
uniform sampler2D flowMap;
uniform float flowTime;
uniform float flowPeriod;
uniform float flowMaxSpeed;
uniform vec2 flowRepeat;
uniform vec2 clearcoatFlowRepeat;
// A normal map dragged along the flow for two cycles half apart, blended
// so neither copy's restart shows (Vlachos 2010).
vec3 flowNormal(sampler2D map, vec2 uv, vec2 repeatPerMetre) {
  vec4 f = texture2D(flowMap, vAlphaMapUv);
  vec2 velocity = (f.rg * 2.0 - 1.0) * flowMaxSpeed;
  float first = fract(flowTime / flowPeriod + f.b);
  float second = fract(first + 0.5);
  vec2 drift = velocity * flowPeriod * repeatPerMetre;
  vec3 a = texture2D(map, uv - drift * first).xyz * 2.0 - 1.0;
  vec3 b = texture2D(map, uv - drift * second).xyz * 2.0 - 1.0;
  return mix(a, b, abs(0.5 - first) * 2.0);
}`,
      )
      .replace(
        'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
        'vec3 mapN = flowNormal( normalMap, vNormalMapUv, flowRepeat );',
      )
      .replace(
        'vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;',
        'vec3 clearcoatMapN = flowNormal( clearcoatNormalMap, vClearcoatNormalMapUv, clearcoatFlowRepeat );',
      );
  };
  kit.materials.push(material);
  const film: Point[] = [
    [spill.from, spill.y - 0.0005],
    [spill.to, spill.y - 0.0005],
    [spill.to, spill.y],
    [spill.from, spill.y],
  ];
  const mesh = new Mesh(sweepProfile(film, path), material);
  mesh.name = 'Overflow film';
  mesh.renderOrder = 2;
  mesh.userData.live = true;
  return {
    mesh,
    /** Run the flow on; `full` (0 to 1) slows and fades it with the level. */
    update(delta: number, full: number) {
      flow.flowTime.value += delta * full;
      const shown = Math.max(0, (full - 0.5) * 2);
      material.opacity = 0.35 * shown;
      mesh.visible = shown > 0.01;
    },
  };
}

/** The section's span across, metres: from the pool's far side to the deck's end. */
export const EDGE_SPAN = { from: -SECTION.pool, to: SECTION.deck };

/**
 * A grating over a channel: one plate swept along the path, its bars and
 * slots drawn in a texture laid along the edge, the slots cut out by its
 * transparency (so the channel and its water show through) and the bars
 * rounded and ridged for grip by its bump map. Mapped along the edge, the
 * bars fan round a mitred corner as a corner piece's do.
 */
function createGrating(
  kit: PanelKit,
  g: NonNullable<EdgeProfile['grating']>,
  path: PlanPath,
) {
  // One tile of the pattern: four bars and their slots along the edge.
  const px = 256;
  const bars = 4;
  const cell = px / bars;
  const share = g.bar / g.pitch;
  const draw = (paint: (c: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = px;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('No 2D canvas context.');
    paint(c);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    // UVs are metres: one tile spans four pitches along, and the same across.
    texture.repeat.set(1 / (g.pitch * bars), 1 / (g.pitch * bars));
    // Bars this fine shimmer at a distance unless filtered steeply.
    texture.anisotropy = 16;
    kit.textures.push(texture);
    return texture;
  };
  // Transparency: white where a bar is, black in the slots.
  const alpha = draw((c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, px, px);
    c.fillStyle = '#fff';
    for (let i = 0; i < bars; i++) c.fillRect(i * cell, 0, cell * share, px);
  });
  // Height: each bar's top rounded, with fine ridges across it for grip.
  const bump = draw((c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, px, px);
    for (let i = 0; i < bars; i++) {
      const x0 = i * cell,
        w = cell * share;
      const round = c.createLinearGradient(x0, 0, x0 + w, 0);
      round.addColorStop(0, '#303030');
      round.addColorStop(0.5, '#d8d8d8');
      round.addColorStop(1, '#303030');
      c.fillStyle = round;
      c.fillRect(x0, 0, w, px);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = 0; y < px; y += 16) c.fillRect(x0, y, w, 4);
    }
  });
  const material = new MeshStandardMaterial({
    color: g.colour,
    roughness: 0.55,
    alphaMap: alpha,
    // The slots cut by multisampled coverage, not a hard alpha test: close
    // to, crisp edges; far off, the bars blend instead of shimmering.
    alphaToCoverage: true,
    bumpMap: bump,
    bumpScale: 0.8,
    side: DoubleSide,
  });
  kit.materials.push(material);
  // A sheet at the grating's top: its bars' depth is in the bump map, so
  // the slots read as one layer rather than two.
  const plate: Point[] = [
    [g.from, g.top - 0.002],
    [g.to, g.top - 0.002],
    [g.to, g.top],
    [g.from, g.top],
  ];
  const group = new Group();
  group.name = 'Channel grating';
  group.add(new Mesh(sweepProfile(plate, path), material));
  // The channel lies in the deck's shade: a dim veil a little below the
  // bars, so the slots read dark against them, as on a real deck, while
  // the channel and its water still show through.
  const veil = new MeshStandardMaterial({
    color: '#1d2427',
    roughness: 1,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    side: DoubleSide,
  });
  kit.materials.push(veil);
  const under: Point[] = [
    [g.from, g.top - g.depth - 0.002],
    [g.to, g.top - g.depth - 0.002],
    [g.to, g.top - g.depth],
    [g.from, g.top - g.depth],
  ];
  group.add(new Mesh(sweepProfile(under, path), veil));
  return group;
}
