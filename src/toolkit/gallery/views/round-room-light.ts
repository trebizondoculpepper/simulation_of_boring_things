import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  RGBAFormat,
  RepeatWrapping,
  RingGeometry,
  SpotLight,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Group, Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createLightShaft,
  createPoolUniforms,
} from '../../components/pool/views/pool-surfaces';
import type { PoolUniforms } from '../../components/pool/views/pool-surfaces';

/** A round room with a round skylight over a round basin of water: metres. */
export interface RoundRoomSpec {
  centreX: number;
  centreZ: number;
  floorY: number;
  height: number;
  skylightRadius: number;
  basinRadius: number;
  /** The water's surface. */
  waterY: number;
}

/**
 * The tiles' uniforms for a room with a basin of water: caustics on the
 * basin's floor and walls below the water, and their light thrown back
 * faintly onto the tiles around it.
 */
export function roundRoomUniforms(metre: number, s: RoundRoomSpec) {
  const uniforms = createPoolUniforms(metre, s.waterY, [
    {
      minX: s.centreX - s.basinRadius,
      maxX: s.centreX + s.basinRadius,
      minZ: s.centreZ - s.basinRadius,
      maxZ: s.centreZ + s.basinRadius,
    },
  ]);
  uniforms.reflected.value = 0.25;
  return uniforms;
}

/** Pixels across one tile of the ripple normal map. */
const RIPPLE = 128;

/**
 * A repeating normal map of small, crossing ripples: a few sine waves,
 * each a whole number of cycles across the tile so it repeats seamlessly.
 */
function rippleNormals() {
  const waves = [
    [3, 1, 0.0, 1],
    [-2, 3, 1.7, 0.8],
    [1, -4, 0.6, 0.6],
    [5, 2, 2.9, 0.4],
  ] as const;
  const data = new Uint8Array(RIPPLE * RIPPLE * 4);
  for (let y = 0; y < RIPPLE; y++)
    for (let x = 0; x < RIPPLE; x++) {
      let dx = 0,
        dy = 0;
      for (const [kx, ky, phase, amp] of waves) {
        const a = (2 * Math.PI * (kx * x + ky * y)) / RIPPLE + phase;
        dx += amp * kx * Math.cos(a);
        dy += amp * ky * Math.cos(a);
      }
      const n = new Vector3(-dx * 0.06, -dy * 0.06, 1).normalize();
      const i = (y * RIPPLE + x) * 4;
      data[i] = (n.x * 0.5 + 0.5) * 255;
      data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  const texture = new DataTexture(data, RIPPLE, RIPPLE, RGBAFormat);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Daylight through the skylight and life in the water, added to a round
 * room's `group` (in metres):
 *
 * - the sun, a narrow beam from high above through the skylight, casting
 *   a sharp-edged pool of light on the floor and into the water;
 * - a faint shaft of light in the air below the skylight;
 * - the water's surface rippling, two sets of ripples drifting across
 *   each other, glinting in the sun; and the caustics under it moving.
 */
export function addSkylightAndWater(
  group: Group,
  s: RoundRoomSpec,
  uniforms: PoolUniforms,
  water: Mesh,
) {
  addSkylightSun(group, s);
  rippleWater(water, uniforms);
}

/** A round skylight's daylight: its middle, its radius, and the floor below it. */
export type SkylightSpec = Pick<
  RoundRoomSpec,
  'centreX' | 'centreZ' | 'floorY' | 'height' | 'skylightRadius'
>;

/**
 * The sun through a round skylight in a ceiling `s.height` above the
 * floor: a narrow beam from on high just filling the skylight, so it
 * casts a sharp-edged patch of sunlight on the floor, and a faint shaft
 * of light in the air below it.
 */
export function addSkylightSun(group: Group, s: SkylightSpec) {
  const top = s.floorY + s.height;
  // The direction to the sun: high, a little to the south-east.
  const elevation = 1.22,
    azimuth = 0.6;
  const toward = new Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  );
  // The beam is just wide enough to fill the skylight, with a crisp
  // edge, so it draws the sunlit patch itself: no shadow map, and nothing
  // outside the room (in its way from on high) can shade it.
  const far = 25;
  const sun = new SpotLight(
    '#fff3df',
    7,
    0,
    Math.atan(s.skylightRadius / far),
    0.06,
    0,
  );
  sun.name = 'skylight sun';
  sun.position.set(
    s.centreX + toward.x * far,
    top + toward.y * far,
    s.centreZ + toward.z * far,
  );
  const fall = s.height / toward.y;
  sun.target.position.set(
    s.centreX - toward.x * fall,
    s.floorY,
    s.centreZ - toward.z * fall,
  );
  group.add(sun, sun.target);

  // The shaft: the hall's light-shaft glow, on a round, slanting tube.
  const shaft = createLightShaft(
    { x: 0, z: 0, w: 1, d: 1 },
    s.height,
    toward,
    '#fff4e2',
    0.22,
  );
  shaft.geometry.dispose();
  const tube = new CylinderGeometry(
    s.skylightRadius,
    s.skylightRadius,
    s.height,
    48,
    1,
    true,
  ).translate(0, s.height / 2, 0);
  const at = tube.getAttribute('position');
  for (let i = 0; i < at.count; i++) {
    const down = s.height - at.getY(i);
    at.setX(i, at.getX(i) - (toward.x * down) / toward.y);
    at.setZ(i, at.getZ(i) - (toward.z * down) / toward.y);
  }
  tube.computeVertexNormals();
  shaft.geometry = tube;
  shaft.position.set(s.centreX, s.floorY, s.centreZ);
  group.add(shaft);
}

/**
 * Bring a still sheet of water (`water`, a MeshPhysicalMaterial) to life:
 * two sets of ripples drifting across each other, glinting in the light,
 * and the caustics on the tiles under it (`uniforms`) moving with time.
 */
export function rippleWater(water: Mesh, uniforms: PoolUniforms) {
  const material = water.material as MeshPhysicalMaterial;
  const ripples = rippleNormals();
  const across = ripples.clone();
  ripples.repeat.set(3, 3);
  across.repeat.set(2.2, 2.2);
  across.rotation = 0.9;
  material.normalMap = ripples;
  material.normalScale = new Vector2(0.7, 0.7);
  material.clearcoat = 1;
  material.clearcoatRoughness = 0.04;
  material.clearcoatNormalMap = across;
  material.clearcoatNormalScale = new Vector2(0.5, 0.5);
  material.needsUpdate = true;
  water.onBeforeRender = () => {
    const t = performance.now() / 1000;
    uniforms.time.value = t;
    ripples.offset.set(t * 0.031, t * 0.017);
    across.offset.set(-t * 0.022, t * 0.027);
  };
}

/** The gutter round the basin: its width out from the basin's edge, and depth. */
export const BASIN_GUTTER = { width: 0.25, depth: 0.08 } as const;

/**
 * An overflow gutter round the basin's rim, as round a deck-level pool: a
 * channel `BASIN_GUTTER` wide and deep in the floor, lined with `tile`,
 * under a flush grating of radial stainless bars. The room's floor stops
 * at its outer edge.
 */
export function addBasinGutter(group: Group, s: RoundRoomSpec, tile: Material) {
  const inner = s.basinRadius,
    outer = s.basinRadius + BASIN_GUTTER.width;
  const bottom = s.floorY - BASIN_GUTTER.depth;
  const channel = new Mesh(new RingGeometry(inner, outer, 96), tile);
  channel.name = 'basin gutter channel';
  channel.rotation.x = -Math.PI / 2;
  channel.position.set(s.centreX, bottom, s.centreZ);
  const side = new Mesh(
    new CylinderGeometry(outer, outer, BASIN_GUTTER.depth, 96, 1, true),
    tile,
  );
  side.name = 'basin gutter wall';
  side.position.set(s.centreX, s.floorY - BASIN_GUTTER.depth / 2, s.centreZ);
  group.add(channel, side);
  // The grating: bars along the radius, a little apart, flush with the floor.
  const bars: BufferGeometry[] = [];
  const count = Math.round((2 * Math.PI * inner) / 0.04);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const mid = (inner + outer) / 2;
    bars.push(
      new BoxGeometry(BASIN_GUTTER.width - 0.01, 0.02, 0.014)
        .rotateY(-a)
        .translate(Math.cos(a) * mid, -0.01, Math.sin(a) * mid),
    );
  }
  const grating = new Mesh(
    mergeGeometries(bars),
    new MeshStandardMaterial({
      color: '#b7c4c5',
      metalness: 0.65,
      roughness: 0.38,
    }),
  );
  for (const bar of bars) bar.dispose();
  grating.name = 'basin gutter grating';
  grating.position.set(s.centreX, s.floorY, s.centreZ);
  group.add(grating);
}

/**
 * A daylight panel high on a vertical wall, a skylight turned on its side:
 * frosted glass glowing with daylight in a slim frame, fixed to the wall's
 * face at `x` (facing west, into a room to the west), its middle at
 * (`y`, `z`), `size` square; and a beam of daylight from it slanting down
 * to `lands` (x, y, z), lighting only the room in front of it.
 */
export function addWallSkylight(
  group: Group,
  metre: number,
  panel: { x: number; y: number; z: number; size: number },
  lands: Vector3,
) {
  const { x, y, z, size } = panel;
  const glass = new Mesh(
    new PlaneGeometry(size, size).rotateY(-Math.PI / 2),
    new MeshBasicMaterial({
      // Above white, as the hall's glazing, so tone mapping leaves it bright.
      color: new Color('#eef7f8').multiplyScalar(2),
      fog: false,
    }),
  );
  glass.name = 'wall skylight glass';
  glass.position.set(x - 0.03, y, z);
  group.add(glass);
  const frame = new MeshStandardMaterial({
    color: '#d9e0de',
    metalness: 0.3,
    roughness: 0.45,
  });
  const bar = 0.07;
  for (const [w, h, dy, dz] of [
    [bar, size + 2 * bar, 0, -(size + bar) / 2],
    [bar, size + 2 * bar, 0, (size + bar) / 2],
    [size, bar, -(size + bar) / 2, 0],
    [size, bar, (size + bar) / 2, 0],
  ] as const) {
    const piece = new Mesh(new BoxGeometry(0.08, h, w), frame);
    piece.name = 'wall skylight frame';
    piece.position.set(x - 0.04, y + dy, z + dz);
    group.add(piece);
  }
  // The beam starts at the glass, so nothing behind the wall is lit.
  const beam = new SpotLight(
    '#fff3df',
    18 * metre * metre,
    9 * metre,
    0.55,
    0.6,
    2,
  );
  beam.name = 'wall skylight daylight';
  beam.position.set(x - 0.1, y, z);
  beam.target.position.copy(lands);
  group.add(beam, beam.target);
}
