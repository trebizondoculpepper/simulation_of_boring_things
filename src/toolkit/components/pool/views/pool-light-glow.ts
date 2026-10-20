import {
  AdditiveBlending,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';
import type { PoolUniforms } from './pool-surfaces';

/** Soft local water scatter around lit lenses; one instanced draw, no lights. */
export function createPoolLightGlow(
  uniforms: PoolUniforms,
  centres: readonly (readonly [number, number, number])[],
) {
  const material = new ShaderMaterial({
    name: 'Underwater lens scatter',
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      metre: uniforms.metre,
      waterY: uniforms.waterY,
      time: uniforms.time,
      strength: { value: 1 },
    },
    vertexShader: /* glsl */ `
varying vec2 vUv;
varying float vHeight;
uniform float metre;
void main() {
  vUv = uv;
  vec4 centre = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // Camera-facing quads retain their physical size as the viewer moves.
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec4 world = centre + vec4((right * position.x + up * position.y) * metre, 0.0);
  vHeight = world.y / metre;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,
    fragmentShader: /* glsl */ `
varying vec2 vUv;
varying float vHeight;
uniform float waterY, time, strength;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r2 = dot(p, p);
  // A bright inner haze with a much fainter, broad skirt; no hard disc edge.
  float haze = (exp(-r2 * 12.0) * 0.8 + exp(-r2 * 3.0) * 0.16)
    * (1.0 - smoothstep(0.55, 1.0, r2));
  float submerged = 1.0 - smoothstep(waterY - 0.04, waterY, vHeight);
  // Fine, slow variation suggests suspended matter without sparkling dots.
  float dust = 0.97 + 0.03 * sin(p.x * 41.0 + time * 0.3)
    * sin(p.y * 37.0 - time * 0.2);
  gl_FragColor = vec4(vec3(0.62, 0.88, 1.0) * haze * dust * strength * submerged, 1.0);
}`,
  });
  const glow = new InstancedMesh(
    new PlaneGeometry(1.1, 1.1),
    material,
    centres.length,
  );
  centres.forEach(([x, y, z], i) =>
    glow.setMatrixAt(i, new Matrix4().makeTranslation(x, y, z)),
  );
  glow.instanceMatrix.needsUpdate = true;
  glow.name = 'Underwater light halos';
  // Billboard vertices turn independently of the instances' bounding planes.
  glow.frustumCulled = false;
  // The water surface is composited over the submerged scatter.
  glow.renderOrder = 0;
  return glow;
}
