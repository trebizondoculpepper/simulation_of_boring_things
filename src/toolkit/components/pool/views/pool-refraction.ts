import { ShaderMaterial } from 'three';
import type { PerspectiveCamera } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { PoolUniforms } from './pool-surfaces';
import { POOL_RIPPLE_GLSL } from './pool-ripples';

/** Warp the existing scene image below water; no second scene render. */
export function createPoolRefraction(
  camera: PerspectiveCamera,
  pool: PoolUniforms,
) {
  const material = new ShaderMaterial({
    name: 'Pool screen-space refraction',
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      inverseProjection: { value: camera.projectionMatrixInverse },
      cameraWorld: { value: camera.matrixWorld },
      sceneProjection: { value: camera.projectionMatrix },
      sceneView: { value: camera.matrixWorldInverse },
      metre: pool.metre,
      waterY: pool.waterY,
      pools: pool.pools,
      poolTime: pool.time,
      rippleSize: pool.rippleSize,
      rippleSpeed: pool.rippleSpeed,
      flowMap: pool.flowMap,
      flowRect: pool.flowRect,
      flowMaxSpeed: pool.flowMaxSpeed,
      flowPeriod: pool.flowPeriod,
      flowOn: pool.flowOn,
      strength: { value: 1 },
    },
    vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,
    fragmentShader: /* glsl */ `
varying vec2 vUv;
uniform sampler2D tDiffuse, tDepth, flowMap;
uniform mat4 inverseProjection, cameraWorld, sceneProjection, sceneView;
uniform float metre, waterY, poolTime, rippleSize, rippleSpeed, strength;
uniform float flowMaxSpeed, flowPeriod, flowOn;
uniform vec4 pools[4], flowRect;
${POOL_RIPPLE_GLSL}
vec3 worldAt(vec2 uv) {
  vec4 view = inverseProjection * vec4(uv * 2.0 - 1.0, texture2D(tDepth, uv).r * 2.0 - 1.0, 1.0);
  return (cameraWorld * (view / view.w)).xyz / metre;
}
float poolMargin(vec2 p) {
  float margin = -1e5;
  for (int i = 0; i < 4; i++) {
    vec4 r = pools[i];
    margin = max(margin, min(min(p.x-r.x, r.z-p.x), min(p.y-r.y, r.w-p.y)));
  }
  return margin;
}
void main() {
  vec4 original = texture2D(tDiffuse, vUv);
  gl_FragColor = original;
  vec3 eye = cameraWorld[3].xyz / metre;
  if (eye.y <= waterY || strength <= 0.0) return;
  vec3 point = worldAt(vUv);
  float depth = waterY - point.y;
  if (depth <= 0.015) return;
  vec3 ray = point - eye;
  vec3 surface = eye + ray * ((waterY-eye.y) / ray.y);
  float edge = smoothstep(0.01, 0.15, poolMargin(surface.xz));
  if (edge <= 0.0) return;
  float t = poolTime * rippleSpeed;
  float size = max(0.25, rippleSize);
  vec2 g;
  if (flowOn > 0.5) {
    vec4 f = texture2D(flowMap, (surface.xz-flowRect.xy) / flowRect.zw);
    vec2 velocity = (f.rg * 2.0 - 1.0) * flowMaxSpeed;
    float first = fract(t / flowPeriod + f.b);
    float second = fract(first + 0.5);
    vec2 drift = velocity * flowPeriod;
    g = mix(slope((surface.xz-drift*first)/size, t),
      slope((surface.xz-drift*second)/size, t), abs(0.5-first)*2.0);
    g *= 1.0 + length(velocity) * 6.0;
  } else {
    g = slope(surface.xz / size, t);
  }
  // Project a small horizontal apparent displacement, increasing with depth.
  vec3 shift = vec3(g.x, 0.0, g.y) * 0.025 * min(depth, 3.0) * strength * edge;
  vec4 shifted = sceneProjection * sceneView * vec4((point + shift) * metre, 1.0);
  vec2 uv = shifted.xy / shifted.w * 0.5 + 0.5;
  if (any(lessThan(uv, vec2(0.002))) || any(greaterThan(uv, vec2(0.998)))) return;
  vec3 sampled = worldAt(uv);
  // Reject dry foreground/deck pixels rather than pulling them into the pool.
  if (sampled.y >= waterY - 0.01) return;
  vec3 sampleRay = sampled-eye;
  vec3 sampleSurface = eye + sampleRay*((waterY-eye.y)/sampleRay.y);
  if (poolMargin(sampleSurface.xz) <= 0.005) return;
  gl_FragColor = mix(original, texture2D(tDiffuse, uv), smoothstep(0.015, 0.12, depth));
}`,
  });
  const pass = new ShaderPass(material);
  const render = pass.render.bind(pass);
  pass.render = (renderer, write, read, delta, mask) => {
    material.uniforms.tDepth.value = read.depthTexture;
    render(renderer, write, read, delta, mask);
  };
  return pass;
}
