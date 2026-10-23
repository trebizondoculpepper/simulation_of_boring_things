import { Mesh, PlaneGeometry, Vector3, Vector4 } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createPs1Material } from '../../core/parts/ps1-material';

/**
 * A tank's water surface stirred by what falls into it (the owner,
 * 2026-10-23): a flat sheet, `w` by `d` metres, facing up, whose shading
 * is disturbed around each of its sources (a filler, the returns' falls).
 * Close to a source the water is churned white: foam broken into moving
 * patches, thickest where the stream lands, and steep, fast ripples; the
 * rings spread out from it and die away, so further off the surface is
 * calm, with only a faint drift of small waves. A source's strength, 0 to
 * 1, scales its foam, its ripples and how far they reach; at 0 it leaves
 * the water still. Unlit by any caustics: a dark tank's water, its foam
 * given a little light of its own so it reads in the gloom.
 *
 * Its own frame: centred on the origin, in the xz plane, its normal +y.
 * `setSource` places each source by a point in the world (the falling
 * water's foot), so the effect stays where the water lands whatever moves.
 */

/** As many sources as one sheet can be stirred by. */
export const MAX_SOURCES = 6;

const GLSL = /* glsl */ `
uniform float dwTime;
// Its sources, in metres in the world's plan.
uniform vec4 dwSources[${MAX_SOURCES}];
varying vec2 dwWorld;

float dwHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float dwNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dwHash(i), dwHash(i + vec2(1.0, 0.0)), f.x),
    mix(dwHash(i + vec2(0.0, 1.0)), dwHash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float dwFbm(vec2 p) {
  return 0.55 * dwNoise(p) + 0.3 * dwNoise(p * 2.3 + 7.1) + 0.15 * dwNoise(p * 5.1 + 3.7);
}
`;

export function createDisturbedWater(
  kit: PanelKit,
  {
    w,
    d,
    color = '#173f43',
    opacity = 0.9,
  }: { w: number; d: number; color?: string; opacity?: number },
) {
  const material = createPs1Material({
    color,
    transparent: true,
    opacity,
    roughness: 0.08,
    metalness: 0.1,
  });
  kit.materials.push(material);
  const time = { value: 0 };
  // World units to the metre, as the room is drawn (its parents' scale).
  const unit = { value: 1 };
  // Each source: its world x and z, its strength, and its reach, metres.
  const sources = Array.from({ length: MAX_SOURCES }, () => new Vector4());
  const base = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    base.call(material, shader, renderer);
    shader.uniforms.dwTime = time;
    shader.uniforms.dwUnit = unit;
    shader.uniforms.dwSources = { value: sources };
    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        'uniform float dwUnit;\nvarying vec2 dwWorld;\nvoid main() {',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
dwWorld = (modelMatrix * vec4(position, 1.0)).xz / dwUnit;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GLSL}\nvoid main() {`)
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
// The surface's slope: a faint drift of small waves everywhere, and each
// source's rings, steep near it and dying away with distance.
vec2 dwSlope = vec2(0.0);
dwSlope += vec2(0.8, 0.6) * cos(dot(dwWorld, vec2(0.8, 0.6)) * 3.1 + dwTime * 0.7) * 0.012;
dwSlope += vec2(-0.5, 0.86) * cos(dot(dwWorld, vec2(-0.5, 0.86)) * 5.3 + dwTime * 1.1) * 0.008;
float dwFoam = 0.0;
for (int i = 0; i < ${MAX_SOURCES}; i++) {
  vec4 s = dwSources[i];
  if (s.z <= 0.001) continue;
  vec2 off = dwWorld - s.xy;
  float r = length(off) + 1e-4;
  vec2 dir = off / r;
  // The rings: a train running outward, fading over its reach.
  float fade = exp(-r / (0.35 * s.w));
  dwSlope += dir * sin(r * 11.0 - dwTime * 7.0) * 0.22 * s.z * fade;
  // Churned close in: irregular, quickly changing.
  float churn = exp(-r / (0.12 * s.w));
  dwSlope += (vec2(dwNoise(dwWorld * 9.0 + dwTime * 3.0), dwNoise(dwWorld * 9.0 - dwTime * 2.7)) - 0.5) * 0.9 * s.z * churn;
  // The foam: froth broken into churning patches, two layers of it
  // boiling different ways, thick where the stream lands, thinning to
  // scattered flecks at its edge.
  vec2 q = dwWorld * 9.0 + float(i) * 13.0;
  float froth =
    0.6 * dwFbm(q + vec2(dwTime * 0.9, -dwTime * 0.7)) +
    0.4 * dwFbm(q * 1.9 + vec2(-dwTime * 1.4, dwTime * 1.1));
  float reach = 1.0 - smoothstep(0.0, 0.3 * s.w, r);
  float core = 1.0 - smoothstep(0.0, 0.08 * s.w, r);
  float foam = smoothstep(0.62 - 0.45 * reach, 0.8 - 0.35 * reach, froth) * reach;
  dwFoam = max(dwFoam, s.z * max(foam * 0.85, core * 0.9));
}
vec3 dwNormal = normalize(vec3(-dwSlope.x, 1.0, -dwSlope.y));
normal = normalize((viewMatrix * vec4(dwNormal, 0.0)).xyz);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
// Foam: white, rough, and a little light of its own in the dark tank.
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.82, 0.8), dwFoam);
diffuseColor.a = mix(diffuseColor.a, 1.0, dwFoam);
totalEmissiveRadiance += vec3(0.06, 0.07, 0.07) * dwFoam;`,
      );
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = function () {
    return `${key.call(this)}-disturbed-water-v2`;
  };
  material.needsUpdate = true;
  const mesh = new Mesh(new PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.live = true;
  const at = new Vector3();
  const scale = new Vector3();
  return {
    mesh,
    /**
     * Source `i`: where `foot` (an object at the falling water's foot) is in
     * the world, its strength (0 still, 1 a full stream), and how far its
     * disturbance reaches, metres.
     */
    setSource(i: number, foot: Object3D | null, strength: number, reach = 3) {
      const s = sources[i];
      if (!s) return;
      if (!foot || strength <= 0.001) {
        s.z = 0;
        return;
      }
      foot.getWorldPosition(at);
      mesh.getWorldScale(scale);
      unit.value = scale.x || 1;
      s.set(at.x / unit.value, at.z / unit.value, Math.min(1, strength), reach);
    },
    update(delta: number) {
      time.value += delta;
    },
  };
}
