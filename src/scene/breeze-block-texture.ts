import type { BufferGeometry } from 'three';
import {
  DataTexture,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

/**
 * Painted breeze-block walling as three textures from one height field:
 * its colour, its relief (a normal map) and its roughness. The blocks'
 * faces are open-textured and matt, speckled with their aggregate; the
 * mortar is a little smoother; and the joints are struck concave, a small
 * dent with the blocks' arrises rounded into it.
 *
 * One tile is two courses, 1 m along by 0.4 m up (blocks 0.5 m by 0.2 m
 * on their joints), the second course laid half a block over: a wall's
 * UVs run one per metre along it and one per 0.4 m up it.
 */

/** Pixels across and up one tile. */
const W = 512;
const H = 256;
/** The joint's half-width, and the arris's rounding beyond it, pixels (about 5 mm and 4 mm). */
const JOINT = 2.6;
const ARRIS = 2;
/** How deep the joint is struck, in the height field's units. */
const DENT = 1;

/** A repeatable hash of a pixel, 0 to 1. */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Distance, pixels, from (x, y) to the nearest joint, wrapping round the tile. */
function jointDistance(x: number, y: number) {
  const course = H / 2;
  const fromBed = Math.min(y % course, course - (y % course));
  // The second course is laid half a block (W / 4) over the first.
  const shift = Math.floor(y / course) % 2 ? W / 4 : 0;
  const along = (((x + shift) % (W / 2)) + W / 2) % (W / 2);
  const fromPerp = Math.min(along, W / 2 - along);
  return Math.min(fromBed, fromPerp);
}

/** The surface's height at a pixel: the block face at 0, the joint's dent below. */
function heightAt(x: number, y: number) {
  const d = jointDistance(x, y);
  if (d <= JOINT) {
    // A concave strike: deepest at the joint's middle.
    const t = d / JOINT;
    return -DENT * (0.75 + 0.25 * (1 - t * t)) + 0.04 * hash(x, y);
  }
  if (d <= JOINT + ARRIS) {
    // The arris, rounded down into the joint.
    const t = (d - JOINT) / ARRIS;
    return -0.75 * DENT * (1 - t) * (1 - t);
  }
  // The block's face: open-textured, pocked by its aggregate.
  const speck = hash(x, y);
  const pocket = hash(x >> 2, y >> 2) > 0.93 ? -0.18 : 0;
  return 0.1 * speck + pocket;
}

const isJoint = (x: number, y: number) => jointDistance(x, y) <= JOINT;

export interface BreezeBlockTextures {
  map: DataTexture;
  normalMap: DataTexture;
  roughnessMap: DataTexture;
}

/** A repeating texture straight from its pixels (no canvas: it builds in tests too). */
function texture(pixels: Uint8ClampedArray<ArrayBuffer>, colour: boolean) {
  const t = new DataTexture(new Uint8Array(pixels.buffer), W, H, RGBAFormat);
  t.colorSpace = colour ? SRGBColorSpace : NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** The three textures, painted `paint` and its mortar `mortar` (CSS colours as [r, g, b], 0–255). */
export function createBreezeBlockTextures(
  paint: readonly [number, number, number] = [216, 217, 210],
  mortar: readonly [number, number, number] = [196, 199, 192],
): BreezeBlockTextures {
  const height = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) height[y * W + x] = heightAt(x, y);
  const at = (x: number, y: number) =>
    height[((y + H) % H) * W + ((x + W) % W)];

  const colour = new Uint8ClampedArray(new ArrayBuffer(W * H * 4));
  const normal = new Uint8ClampedArray(new ArrayBuffer(W * H * 4));
  const rough = new Uint8ClampedArray(new ArrayBuffer(W * H * 4));
  // How steep the relief reads: larger is a deeper dent.
  const strength = 2.2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const joint = isJoint(x, y);
      // Paint over blockwork: a little lighter on the faces, darker in the pockets.
      const shade = joint
        ? 1 + 0.03 * (hash(x, y) - 0.5)
        : 0.97 + 0.06 * hash(x >> 1, y >> 1) + 0.25 * at(x, y);
      const base = joint ? mortar : paint;
      colour[i] = base[0] * shade;
      colour[i + 1] = base[1] * shade;
      colour[i + 2] = base[2] * shade;
      colour[i + 3] = 255;
      // Sobel slopes of the height field, wrapping round the tile.
      const dx =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        at(x - 1, y - 1) -
        2 * at(x - 1, y) -
        at(x - 1, y + 1);
      const dy =
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1) -
        at(x - 1, y - 1) -
        2 * at(x, y - 1) -
        at(x + 1, y - 1);
      let nx = -dx * strength,
        ny = dy * strength,
        nz = 8;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      normal[i] = (nx * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny * 0.5 + 0.5) * 255;
      normal[i + 2] = (nz * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
      // Roughness in green: the blocks fully matt, the mortar smoother.
      const r = joint ? 0.68 + 0.06 * hash(x, y) : 0.94 + 0.06 * hash(x, y);
      rough[i] = rough[i + 1] = rough[i + 2] = r * 255;
      rough[i + 3] = 255;
    }
  return {
    map: texture(colour, true),
    normalMap: texture(normal, false),
    roughnessMap: texture(rough, false),
  };
}

/**
 * A box of blockwork's texture coordinates, mapped from where its faces
 * are in the room rather than from its own corner: along a wall in
 * metres, up it in 0.4 m courses from `floor`. So the pieces of one wall
 * (either side of a door and over it) share one grid, their courses and
 * joints running on unbroken. `at` is where the box's middle is.
 */
export function mapBlockwork(
  geometry: BufferGeometry,
  at: readonly [number, number, number],
  floor = 0,
) {
  const uv = geometry.attributes.uv;
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const x = position.getX(i) + at[0];
    const y = position.getY(i) + at[1];
    const z = position.getZ(i) + at[2];
    if (Math.abs(normal.getX(i)) > 0.5) uv.setXY(i, z, (y - floor) / 0.4);
    else if (Math.abs(normal.getZ(i)) > 0.5) uv.setXY(i, x, (y - floor) / 0.4);
    else uv.setXY(i, x, z / 0.4);
  }
  uv.needsUpdate = true;
  return geometry;
}
