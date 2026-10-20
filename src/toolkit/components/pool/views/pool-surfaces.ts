import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshPhysicalMaterial,
  ShaderMaterial,
  Vector4,
} from 'three';
import type { IUniform, Texture, Vector3 } from 'three';
import {
  ABSORPTION,
  CAUSTIC_FOCUS,
  SCATTER,
  WATER_IOR,
} from '../logic/water-optics';

/**
 * The surfaces of a pool in the "poolrooms" style
 * (`doc/research/poolrooms-look.md`): glazed ceramic tile on everything,
 * and clear, nearly still water.
 *
 * The tiles are drawn in the shader, not from a texture: small square
 * tiles projected in world space on whichever plane a surface faces, so
 * that walls, floors, steps, columns and arches all tile at the same size
 * with no unwrapping. Each tile is tinted and glazed a little differently,
 * its edges are bevelled into a recessed grout line, and the grout fades
 * smoothly to its average colour as tiles grow small on screen, so the
 * distance does not shimmer. Below the water line the tile is tinted by
 * the water's depth and lit by moving caustics; above it, near the pool,
 * a fainter reflected caustic plays on walls and ceiling.
 */

/** A three-number constant as a GLSL vec3 literal. */
const glslVec = (v: readonly number[]) =>
  `vec3(${v.map((x) => x.toFixed(4)).join(', ')})`;

/** Uniforms shared by every pool surface in a room, updated each frame. */
export interface PoolUniforms {
  /** Seconds. */
  time: IUniform<number>;
  /** Scene units per metre. */
  metre: IUniform<number>;
  /** The water surface's height, metres. */
  waterY: IUniform<number>;
  /** Up to four rectangles of water (minX, minZ, maxX, maxZ), metres. */
  pools: IUniform<Vector4[]>;
  /** Caustic light's strength under the water, and reflected above it. */
  caustics: IUniform<number>;
  reflected: IUniform<number>;
  /** 1 draws the tiles' bevel and grout; 0 draws plain glazed surfaces. */
  tiles: IUniform<number>;
  /** A rectangle (minX, minZ, maxX, maxZ), metres, left in shade, and how dark. */
  shade: IUniform<Vector4>;
  shadeDepth: IUniform<number>;
  /**
   * The water's flow, for caustics that move with it (`setPoolFlow`): the
   * flow map, its rect (minX, minZ, width, depth, metres), its full-scale
   * speed and phase period, and whether it is on.
   */
  flowMap: IUniform<Texture | null>;
  flowRect: IUniform<Vector4>;
  flowMaxSpeed: IUniform<number>;
  flowPeriod: IUniform<number>;
  flowOn: IUniform<number>;
}

export function createPoolUniforms(
  metre: number,
  waterY: number,
  pools: readonly { minX: number; maxX: number; minZ: number; maxZ: number }[],
): PoolUniforms {
  const rects = pools
    .slice(0, 4)
    .map((r) => new Vector4(r.minX, r.minZ, r.maxX, r.maxZ));
  while (rects.length < 4) rects.push(new Vector4(1e5, 1e5, 1e5, 1e5));
  return {
    time: { value: 0 },
    metre: { value: metre },
    waterY: { value: waterY },
    pools: { value: rects },
    caustics: { value: 1.6 },
    reflected: { value: 0.09 },
    tiles: { value: 1 },
    shade: { value: new Vector4(1e5, 1e5, 1e5, 1e5) },
    shadeDepth: { value: 0 },
    flowMap: { value: null },
    flowRect: { value: new Vector4(0, 0, 1, 1) },
    flowMaxSpeed: { value: 0 },
    flowPeriod: { value: 1 },
    flowOn: { value: 0 },
  };
}

/**
 * Let the caustics under the water move with its flow (`PoolWaterFlow`):
 * their network is dragged along the flow map by the same two-phase sums
 * as the water's ripples (Vlachos 2010), on the pool's floor.
 */
export function setPoolFlow(uniforms: PoolUniforms, flow: PoolWaterFlow) {
  uniforms.flowMap.value = flow.map;
  uniforms.flowRect.value.set(
    flow.rect.minX,
    flow.rect.minZ,
    flow.rect.w,
    flow.rect.d,
  );
  uniforms.flowMaxSpeed.value = flow.maxSpeed;
  uniforms.flowPeriod.value = flow.period;
  uniforms.flowOn.value = 1;
}

/** Shared GLSL: hashing, and the caustic network. */
const COMMON = /* glsl */ `
float poolHash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
vec2 poolHash2(vec2 p) {
  return vec2(poolHash(p), poolHash(p + 17.31));
}
// Cell borders of a moving Voronoi pattern: bright where two cells meet.
float poolCausticLayer(vec2 uv, float t, float sharp) {
  vec2 i = floor(uv), f = fract(uv);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = poolHash2(i + o);
      vec2 pt = o + 0.5 + 0.38 * sin(t + 6.2831 * h);
      float d = length(pt - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  return 1.0 - smoothstep(0.0, sharp, d2 - d1);
}
// Caustics at a point on a plane, metres: two layers, warped so the
// network's strands curve, multiplied so only their crossings burn bright.
float poolCaustics(vec2 p, float t, float sharp) {
  vec2 uv = p / 0.55;
  uv += 0.28 * vec2(sin(uv.y * 1.3 + t * 0.7), sin(uv.x * 1.1 - t * 0.6));
  float a = poolCausticLayer(uv + vec2(t * 0.06, t * 0.04), t * 0.9, sharp);
  float b = poolCausticLayer(uv * 1.37 + vec2(3.7 - t * 0.05, 1.3 + t * 0.03), t * 1.1, sharp);
  return a * 0.55 + b * 0.45 + a * b * 1.2 - 0.25;
}
// Distance, metres, from (x, z) to the nearest water.
float poolDistance(vec2 p, vec4 r[4]) {
  float d = 1e5;
  for (int i = 0; i < 4; i++) {
    vec2 q = max(max(r[i].xy - p, p - r[i].zw), 0.0);
    d = min(d, length(q));
  }
  return d;
}
`;

export interface TileOptions {
  /** The glaze's colour. */
  colour?: string;
  /** The grout's colour. */
  grout?: string;
  /** Tile size and grout joint, metres. */
  tile?: number;
  joint?: number;
  /** The glaze's roughness range, smoothest to roughest tile. */
  roughness?: [number, number];
  /** The clear glaze layer's strength. */
  glaze?: number;
  /**
   * How uneven the tiling is: each tile set at a slight tilt of its own,
   * and its glaze faintly wavy, so that a highlight breaks up tile by tile.
   */
  bump?: number;
  /**
   * A plain surface rather than tile: one colour, no joints or bump, but
   * still tinted and lit by caustics under the water. For fittings set
   * into the pool (drain covers, inlets, lights).
   */
  plain?: boolean;
  metalness?: number;
}

/** A glazed tile material on `uniforms`' water. */
export function createTileMaterial(
  uniforms: PoolUniforms,
  options: TileOptions = {},
) {
  const {
    colour = '#f3f5f1',
    grout = '#c3cbca',
    tile = 0.125,
    joint = 0.004,
    roughness = [0.06, 0.22],
    glaze = 0.6,
    bump = 1,
    plain = false,
    metalness = 0,
  } = options;
  const material = new MeshPhysicalMaterial({
    color: colour,
    roughness: roughness[0],
    clearcoat: glaze,
    clearcoatRoughness: 0.06,
    metalness,
  });
  const own = {
    tileSize: { value: tile },
    tileJoint: { value: joint },
    groutColour: { value: new Color(grout) },
    roughLow: { value: roughness[0] },
    roughHigh: { value: roughness[1] },
    tileBump: { value: bump },
    tilePlain: { value: plain ? 1 : 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      poolTime: uniforms.time,
      poolMetre: uniforms.metre,
      poolWaterY: uniforms.waterY,
      poolRects: uniforms.pools,
      poolCausticStrength: uniforms.caustics,
      poolReflected: uniforms.reflected,
      poolTiles: uniforms.tiles,
      poolShade: uniforms.shade,
      poolShadeDepth: uniforms.shadeDepth,
      poolFlowMap: uniforms.flowMap,
      poolFlowRect: uniforms.flowRect,
      poolFlowMax: uniforms.flowMaxSpeed,
      poolFlowPeriod: uniforms.flowPeriod,
      poolFlowOn: uniforms.flowOn,
      ...own,
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vTileWorld;
varying vec3 vTileNormal;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vTileWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
vTileNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vTileWorld;
varying vec3 vTileNormal;
uniform float poolTime, poolMetre, poolWaterY, poolCausticStrength, poolReflected, poolTiles;
uniform vec4 poolShade;
uniform float poolShadeDepth;
uniform vec4 poolRects[4];
uniform sampler2D poolFlowMap;
uniform vec4 poolFlowRect;
uniform float poolFlowMax, poolFlowPeriod, poolFlowOn;
uniform float tileSize, tileJoint, roughLow, roughHigh, tileBump, tilePlain;
uniform vec3 groutColour;
${COMMON}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
// The tile under this fragment, on the plane the surface most faces.
vec3 tileP = vTileWorld / poolMetre;
vec3 tileN = normalize(vTileNormal);
vec3 tileA = abs(tileN);
vec2 tileUv; vec3 tileU; vec3 tileV; float tileAxis;
if (tileA.y >= tileA.x && tileA.y >= tileA.z) {
  tileUv = tileP.xz; tileU = vec3(1.0, 0.0, 0.0); tileV = vec3(0.0, 0.0, 1.0); tileAxis = 0.0;
} else if (tileA.x >= tileA.z) {
  tileUv = tileP.zy; tileU = vec3(0.0, 0.0, 1.0); tileV = vec3(0.0, 1.0, 0.0); tileAxis = 1.0;
} else {
  tileUv = tileP.xy; tileU = vec3(1.0, 0.0, 0.0); tileV = vec3(0.0, 1.0, 0.0); tileAxis = 2.0;
}
vec2 tileG = tileUv / tileSize;
vec2 tileCell = floor(tileG);
vec2 tileF = fract(tileG) - 0.5;
vec2 tileFw = max(fwidth(tileG), vec2(1e-4));
float tileFar = smoothstep(0.12, 0.45, max(tileFw.x, tileFw.y));
float tileHalfJoint = 0.5 * tileJoint / tileSize;
vec2 tileEdge = 0.5 - abs(tileF);
vec2 tileM = smoothstep(vec2(tileHalfJoint) - tileFw, vec2(tileHalfJoint) + tileFw, tileEdge);
float tileCover = mix(tileM.x * tileM.y, pow(1.0 - 2.0 * tileHalfJoint, 2.0), tileFar);
tileCover = mix(1.0, tileCover, poolTiles * (1.0 - tilePlain));
float tileH = poolHash(tileCell + tileAxis * 31.7);
float tileH2 = poolHash(tileCell * 1.31 + 7.7 + tileAxis * 13.1);
vec3 tileGlaze = diffuseColor.rgb * mix(0.965 + 0.05 * tileH, 1.0, tilePlain) * mix(vec3(1.0), vec3(0.985, 1.0, 1.01), tileH2 * poolTiles);
diffuseColor.rgb = mix(groutColour, tileGlaze, tileCover);
// Under the water: tinted by its depth, and lit by caustics.
float tileDepth = poolWaterY - tileP.y;
float tileWet = step(0.0, tileDepth);
// Beer–Lambert absorption over the light's path (\`water-optics.ts\`):
// down through the depth, then up the refracted line of sight; what the
// water takes from the tile it gives back as its own scattered glow.
{
  vec3 tileLook = normalize(vTileWorld - cameraPosition);
  float tileDown = min(1.0, abs(tileLook.y));
  float tileSinW = sqrt(1.0 - tileDown * tileDown) / ${WATER_IOR.toFixed(3)};
  float tileCosW = sqrt(1.0 - tileSinW * tileSinW);
  float tilePath = max(tileDepth, 0.0) * (1.0 + 1.0 / tileCosW);
  vec3 tileKept = exp(-${glslVec(ABSORPTION)} * tilePath);
  vec3 tileSeen = diffuseColor.rgb * tileKept + ${glslVec(SCATTER)} * (1.0 - tileKept);
  diffuseColor.rgb = mix(diffuseColor.rgb, tileSeen, tileWet);
}
vec2 tileCausticUv = tileA.y > 0.5 ? tileP.xz : tileUv * vec2(1.0, 0.6);
float tileSharp = 0.12 + 1.5 * max(tileFw.x, tileFw.y) * tileSize / 0.55
  // Softer as the light leaves focus, above or below its focal depth.
  + 0.1 * abs(max(poolWaterY - tileP.y, 0.0) - ${CAUSTIC_FOCUS.toFixed(3)});
float tileLight = 0.0;
if (tileWet > 0.5) {
  float tileCaustic;
  if (poolFlowOn > 0.5 && tileA.y > 0.5) {
    // On the floor, the network dragged along the water's flow: two
    // phases half a cycle apart, cross-faded (Vlachos 2010).
    vec4 tileFlow = texture2D(poolFlowMap, (tileP.xz - poolFlowRect.xy) / poolFlowRect.zw);
    vec2 tileDrift = (tileFlow.rg * 2.0 - 1.0) * poolFlowMax * poolFlowPeriod;
    float first = fract(poolTime / poolFlowPeriod + tileFlow.b);
    float second = fract(first + 0.5);
    tileCaustic = mix(
      poolCaustics(tileCausticUv - tileDrift * first, poolTime, tileSharp),
      poolCaustics(tileCausticUv - tileDrift * second, poolTime, tileSharp),
      abs(0.5 - first) * 2.0
    );
  } else {
    tileCaustic = poolCaustics(tileCausticUv, poolTime, tileSharp);
  }
  tileLight = poolCausticStrength * clamp(tileCaustic, 0.0, 1.5)
    * mix(1.0, 0.55, step(tileA.y, 0.5))
    // Focusing: none at the surface, brightest at the focal depth, easing
    // away beyond it (\`causticFocus\`); absorption dims it further.
    * (tileDepth / ${CAUSTIC_FOCUS.toFixed(3)}) * exp(1.0 - tileDepth / ${CAUSTIC_FOCUS.toFixed(3)});
} else {
  float near = 1.0 - smoothstep(0.0, 2.2, poolDistance(tileP.xz, poolRects));
  float high = tileN.y < -0.5 ? 1.0 : smoothstep(-0.2, 1.2, tileP.y - poolWaterY) * (1.0 - smoothstep(2.5, 4.5, tileP.y));
  float soft = 0.5 + 0.5 * poolCaustics(tileCausticUv * 0.6, poolTime * 0.8, 0.6);
  tileLight = poolReflected * near * high * clamp(soft, 0.0, 1.2);
}
// A space the light does not reach, darkening into it.
{
  vec2 into = min(tileP.xz - poolShade.xy, poolShade.zw - tileP.xz);
  float inside = smoothstep(0.0, 3.0, min(into.x, into.y));
  diffuseColor.rgb *= 1.0 - poolShadeDepth * inside;
  tileLight *= 1.0 - 0.5 * poolShadeDepth * inside;
}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = mix(0.85, mix(roughLow, roughHigh, tileH2), tileCover);
roughnessFactor = mix(roughnessFactor, roughLow, tileWet * 0.5);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
// Bevelled tile edges tilt the surface toward the joints.
{
  float bevel = 0.07;
  vec2 tilt = sign(tileF) * (1.0 - smoothstep(tileHalfJoint, tileHalfJoint + bevel, tileEdge));
  vec3 lean = (tileU * tilt.x + tileV * tilt.y) * 0.6 * (1.0 - tileFar);
  // Each tile set a little off true, and its glaze faintly wavy.
  vec2 skew = (poolHash2(tileCell * 0.73 + tileAxis * 5.1) - 0.5) * 0.07;
  vec2 wave = vec2(sin(tileF.x * 6.2832 + tileH * 6.2832), sin(tileF.y * 6.2832 + tileH2 * 6.2832)) * 0.025;
  lean += (tileU * (skew.x + wave.x) + tileV * (skew.y + wave.y)) * (1.0 - 0.6 * tileFar);
  lean *= tileBump * poolTiles * (1.0 - tilePlain);
  normal = normalize(normal + (viewMatrix * vec4(lean, 0.0)).xyz);
}`,
      )
      .replace(
        '#include <clearcoat_normal_fragment_maps>',
        `#include <clearcoat_normal_fragment_maps>
// The glaze follows the tile: its highlight breaks up with it.
#ifdef USE_CLEARCOAT
clearcoatNormal = normal;
#endif`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(0.82, 1.0, 1.0) * tileLight * diffuseColor.rgb;`,
      );
  };
  // Every tile material compiles the same shader but for its uniforms' values.
  material.customProgramCacheKey = () => 'pool-tile';
  // Its own uniforms, to retune the glaze and bump while it is shown.
  return Object.assign(material, { tileUniforms: own });
}

/**
 * The water's surface: clear, nearly still, its small slow ripples
 * bending a reflection of the room. The reflection is faked: rather than
 * drawing the room again, mirrored, every frame, it is looked up in a
 * picture of the room taken once from just above the water (`room`, a
 * cube map), which is near enough for a room in which nothing moves. A
 * Fresnel blend leaves the water clear looked down into and a mirror seen
 * edge on.
 *
 * Given a `flow`, the ripples move with the water, by flow-map water
 * after Vlachos, "Water Flow in Portal 2" (SIGGRAPH 2010; the sums in
 * `../logic/flow-map.ts`): the flow map's vectors (metres a second over
 * `rect`, in metres) drag the ripple pattern, sampled twice half a cycle
 * apart and cross-faded so neither restart shows, its phase offset by the
 * map's noise; and, as Valve's water does, the ripples are livelier where
 * the water runs faster.
 */
export interface PoolWaterFlow {
  map: Texture;
  rect: { minX: number; minZ: number; w: number; d: number };
  maxSpeed: number;
  /** One cycle of the two phases, seconds. */
  period: number;
}

export function createPoolWater(
  geometry: BufferGeometry,
  uniforms: PoolUniforms,
  room: Texture | null,
  flow?: PoolWaterFlow,
) {
  const material = new ShaderMaterial({
    name: 'PoolWater',
    transparent: true,
    depthWrite: false,
    uniforms: {
      room: { value: room },
      colour: { value: new Color('#3fb6c4') },
      poolTime: uniforms.time,
      poolMetre: uniforms.metre,
      stillness: { value: 1 },
      flowMap: { value: flow?.map ?? null },
      flowRect: {
        value: flow
          ? new Vector4(
              flow.rect.minX,
              flow.rect.minZ,
              flow.rect.w,
              flow.rect.d,
            )
          : new Vector4(0, 0, 1, 1),
      },
      flowMaxSpeed: { value: flow?.maxSpeed ?? 0 },
      flowPeriod: { value: flow?.period ?? 1 },
    },
    defines: flow ? { USE_FLOW: '' } : {},
    vertexShader: /* glsl */ `
varying vec3 vWorld;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: /* glsl */ `
uniform samplerCube room;
uniform vec3 colour;
uniform float poolTime, poolMetre, stillness;
#ifdef USE_FLOW
uniform sampler2D flowMap;
uniform vec4 flowRect;
uniform float flowMaxSpeed, flowPeriod;
#endif
varying vec3 vWorld;
#include <common>
#include <logdepthbuf_pars_fragment>
// The slope of a few small travelling waves: a nearly still surface.
vec2 slope(vec2 p, float t) {
  vec2 g = vec2(0.0);
  g += vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 5.0 + t * 1.1) * 0.5;
  g += vec2(-0.5, 0.86) * cos(dot(p, vec2(-0.5, 0.86)) * 9.0 + t * 1.6) * 0.32;
  g += vec2(0.24, -0.97) * cos(dot(p, vec2(0.24, -0.97)) * 15.0 + t * 2.2) * 0.2;
  g += vec2(-0.95, -0.3) * cos(dot(p, vec2(-0.95, -0.3)) * 27.0 + t * 3.1) * 0.1;
  g += vec2(0.6, -0.8) * cos(dot(p, vec2(0.6, -0.8)) * 43.0 + t * 3.9) * 0.05;
  return g;
}
void main() {
  #include <logdepthbuf_fragment>
  vec3 p = vWorld / poolMetre;
#ifdef USE_FLOW
  // The ripples dragged along the flow, two phases half a cycle apart.
  vec4 f = texture2D(flowMap, (p.xz - flowRect.xy) / flowRect.zw);
  vec2 velocity = (f.rg * 2.0 - 1.0) * flowMaxSpeed;
  float first = fract(poolTime / flowPeriod + f.b);
  float second = fract(first + 0.5);
  vec2 drift = velocity * flowPeriod;
  vec2 g = mix(
    slope(p.xz - drift * first, poolTime),
    slope(p.xz - drift * second, poolTime),
    abs(0.5 - first) * 2.0
  );
  // Livelier where the water runs faster.
  g *= 1.0 + length(velocity) * 6.0;
  g *= 0.035 * stillness;
#else
  vec2 g = slope(p.xz, poolTime) * 0.035 * stillness;
#endif
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(cameraPosition - vWorld);
  float facing = max(dot(n, v), 0.0);
  // Schlick's Fresnel for water (F0 = 0.02).
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
  vec3 reflected = textureCube(room, reflect(-v, n)).rgb;
  // A little of the water's own colour, more where it is seen edge on.
  float body = mix(0.1, 0.3, 1.0 - facing);
  float alpha = fresnel + (1.0 - fresnel) * body;
  vec3 c = (reflected * fresnel + colour * body * (1.0 - fresnel)) / max(alpha, 1e-3);
  gl_FragColor = vec4(c, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  const water = new Mesh(geometry, material);
  water.name = 'Pool water';
  water.renderOrder = 1;
  return water;
}

/**
 * A shaft of sunlight through a rooflight, `rooflight` (metres, its
 * opening at height `top`), slanting along `toward` (the direction to the
 * sun) down to the floor: a faint glow in the air, drawn additively,
 * brightest where it is seen face on and fading toward its edges and
 * toward the floor, so it has no hard outline.
 */
export function createLightShaft(
  rooflight: { x: number; z: number; w: number; d: number },
  top: number,
  toward: Vector3,
  colour: string,
  strength: number,
) {
  const reach = top / toward.y;
  const dx = -toward.x * reach,
    dz = -toward.z * reach;
  const { x, z, w, d } = rooflight;
  const corners = [
    [x - w / 2, z - d / 2],
    [x + w / 2, z - d / 2],
    [x + w / 2, z + d / 2],
    [x - w / 2, z + d / 2],
  ];
  const positions: number[] = [];
  for (const [cx, cz] of corners) positions.push(cx, top, cz);
  for (const [cx, cz] of corners) positions.push(cx + dx, 0, cz + dz);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  // The four sides; the ends are left open.
  geometry.setIndex([
    0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ]);
  geometry.computeVertexNormals();
  const material = new ShaderMaterial({
    name: 'LightShaft',
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: {
      colour: { value: new Color(colour) },
      strength: { value: strength },
      top: { value: top },
    },
    vertexShader: /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
uniform float top;
void main() {
  vHeight = position.y / top;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`,
    fragmentShader: /* glsl */ `
uniform vec3 colour;
uniform float strength;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float face = pow(abs(dot(normalize(vNormal), v)), 2.0);
  float fade = smoothstep(0.0, 0.6, vHeight) * (1.0 - 0.4 * vHeight);
  gl_FragColor = vec4(colour * strength * face * fade, 1.0);
}`,
  });
  const shaft = new Mesh(geometry, material);
  shaft.name = 'Light shaft';
  shaft.renderOrder = 2;
  return shaft;
}
