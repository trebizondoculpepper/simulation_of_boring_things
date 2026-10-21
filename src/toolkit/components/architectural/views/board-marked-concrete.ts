import { RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2 } from 'three';
import type { BufferGeometry, Texture } from 'three';
import { createTileMaterial } from '../../pool/views/pool-surfaces';
import type { PoolUniforms } from '../../pool/views/pool-surfaces';

/**
 * Bare board-marked concrete, as cast, after the brutalist concrete of
 * London's South Bank: for the upper walls and roofs of the new pool
 * rooms, above their tiles. Poly Haven's "Concrete Layers 02" (Rob
 * Tuytel, CC0; `CREDITS.md`). Its maps are stretched over a broad 4 m
 * square and varied at a larger scale to keep their repeats unobtrusive.
 *
 * It is the tile material with its tiles turned off, so the water's
 * caustics still play over it from below. Its maps follow the geometry's
 * UVs: give each geometry UVs in metres with `inMetres`.
 */

/** The size of ground one copy of the maps covers, metres. */
export const CONCRETE_REPEAT = 4;

const file = (map: string) =>
  new URL(`../textures/concrete_layers_02_${map}_1k.jpg`, import.meta.url).href;

let maps: { colour: Texture; normal: Texture; rough: Texture } | null = null;
/** The maps, loaded once and shared by every room. */
function concreteMaps() {
  if (maps) return maps;
  const loader = new TextureLoader();
  const load = (map: string) => {
    const texture = loader.load(file(map));
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  };
  maps = { colour: load('diff'), normal: load('nor_gl'), rough: load('rough') };
  maps.colour.colorSpace = SRGBColorSpace;
  return maps;
}

/** Board-marked concrete on `uniforms`' water. */
export function boardMarkedConcrete(uniforms: PoolUniforms) {
  const material = createTileMaterial(uniforms, {
    plain: true,
    colour: '#ffffff',
    roughness: [1, 1],
    glaze: 0,
  });
  const { colour, normal, rough } = concreteMaps();
  material.map = colour;
  material.normalMap = normal;
  material.normalScale = new Vector2(1.2, 1.2);
  material.roughnessMap = rough;
  // A broad, continuous pigment variation breaks up the recognisable
  // repetition of the image map without adding a second texture lookup.
  // World position keeps it seamless across separately built wall pieces.
  const tileCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    tileCompile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
vec3 concreteP = vTileWorld / poolMetre;
vec2 concreteUv = concreteP.xz * 0.11 + concreteP.xy * 0.037;
vec2 concreteCell = floor(concreteUv);
vec2 concreteBlend = fract(concreteUv);
concreteBlend = concreteBlend * concreteBlend * (3.0 - 2.0 * concreteBlend);
float concreteA = poolHash(concreteCell);
float concreteB = poolHash(concreteCell + vec2(1.0, 0.0));
float concreteC = poolHash(concreteCell + vec2(0.0, 1.0));
float concreteD = poolHash(concreteCell + vec2(1.0, 1.0));
float concreteVariation = mix(mix(concreteA, concreteB, concreteBlend.x),
  mix(concreteC, concreteD, concreteBlend.x), concreteBlend.y);
diffuseColor.rgb *= 0.88 + 0.22 * concreteVariation;`,
    );
  };
  material.needsUpdate = true;
  return material;
}

/**
 * Scale `geometry`'s UVs from 0–1 across a face `width` × `height` metres
 * to metres over the maps' repeat, so the concrete keeps its true size.
 */
export function inMetres<G extends BufferGeometry>(
  geometry: G,
  width: number,
  height: number,
): G {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (uv.getX(i) * width) / CONCRETE_REPEAT,
      (uv.getY(i) * height) / CONCRETE_REPEAT,
    );
  uv.needsUpdate = true;
  return geometry;
}
