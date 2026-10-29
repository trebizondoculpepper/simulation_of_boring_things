import {
  CustomBlending,
  OneFactor,
  ZeroFactor,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
} from 'three';

/**
 * Gold caustics rising from a skimmer's rim (dev53, the owner,
 * 2026-10-29): a ring of thin shafts standing straight up from its edge,
 * each tapering to a point, rippling upward and flickering, drawn in one
 * additive pass. Each shaft is two crossed tapered quads, so it reads from
 * any side the camera orbits to. Metres; `rise` and `glow` from
 * `logic/skimmer-cinematic.ts`.
 */

export interface SkimmerCausticsOptions {
  /** The rim's radius, metres. */
  radius: number;
  /** How many shafts round it. */
  count?: number;
  /** The tallest and shortest shafts, metres. */
  tallest?: number;
  shortest?: number;
  /** The widest shaft's base, metres. */
  width?: number;
  colour?: string;
  /** Seeded randomness for the shafts' heights, widths and phases. */
  random: () => number;
}

const vertexShader = /* glsl */ `
attribute float phase;
uniform float time;
uniform float rise;
varying vec2 vUv;
varying float vPhase;
void main() {
  vUv = uv;
  vPhase = phase;
  // Each shaft breathes a little in height as it shimmers.
  float h = rise * (0.82 + 0.18 * sin(time * 1.7 + phase * 6.2832));
  vec3 p = position;
  p.y *= h;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform float time;
uniform float glow;
uniform vec3 colour;
varying vec2 vUv;
varying float vPhase;
void main() {
  // Brightest at the rim, gone at the tip; soft at the shaft's edges.
  // Clamped: under multisampling a varying is read a little outside its
  // triangle (past the tip, vUv.y > 1), and pow of a negative is NaN,
  // which a hall's bloom spreads into black rectangles (the owner,
  // 2026-10-29).
  float fade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.4);
  float edge = 1.0 - abs(vUv.x * 2.0 - 1.0);
  edge *= edge;
  // Light running up the shaft, and the whole shaft flickering.
  float ripple = 0.62 + 0.38 * sin(vUv.y * 22.0 - time * 5.0 + vPhase * 40.0);
  float flicker = 0.6 + 0.4 * sin(time * 3.1 + vPhase * 17.0);
  float a = fade * edge * ripple * flicker * glow;
  gl_FragColor = vec4(colour * a, a);
}
`;

export function createSkimmerCaustics(options: SkimmerCausticsOptions) {
  const {
    radius,
    count = 28,
    tallest = 1.5,
    shortest = 0.55,
    width = 0.07,
    colour = '#ffc44a',
    random,
  } = options;
  const positions: number[] = [];
  const uvs: number[] = [];
  const phases: number[] = [];
  const index: number[] = [];
  /** One tapered quad, its base `w` wide across direction (ax, az), `h` tall. */
  const quad = (
    x: number,
    z: number,
    ax: number,
    az: number,
    w: number,
    h: number,
    phase: number,
  ) => {
    const base = positions.length / 3;
    const tip = w * 0.04;
    for (const [s, y, half] of [
      [-1, 0, w / 2],
      [1, 0, w / 2],
      [1, h, tip],
      [-1, h, tip],
    ]) {
      positions.push(x + ax * s * half, y, z + az * s * half);
      uvs.push((s + 1) / 2, y / h);
      phases.push(phase);
    }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (let k = 0; k < count; k++) {
    const a = ((k + random() * 0.6) / count) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const h = shortest + (tallest - shortest) * random();
    const w = width * (0.5 + 0.5 * random());
    const phase = random();
    // Across the rim, and out from it.
    quad(x, z, -Math.sin(a), Math.cos(a), w, h, phase);
    quad(x, z, Math.cos(a), Math.sin(a), w, h, phase);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('phase', new Float32BufferAttribute(phases, 1));
  geometry.setIndex(index);
  const material = new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      rise: { value: 0 },
      glow: { value: 0 },
      colour: { value: new Color(colour) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    // Light added, the target's alpha left alone: a hall's passes read
    // alpha (Hall 5's), and an additive alpha would darken the shafts.
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Skimmer caustics';
  // Its shafts rise from nothing: never culled by their unrisen bounds.
  mesh.frustumCulled = false;
  mesh.visible = false;
  // Light, not a surface: no ambient occlusion from it.
  mesh.userData.noAmbientOcclusion = true;
  return {
    mesh,
    /** The shafts at `time` seconds, risen `rise` (0–1), `glow` bright (0–1). */
    update(time: number, rise: number, glow: number) {
      mesh.visible = glow > 0 && rise > 0;
      material.uniforms.time.value = time;
      material.uniforms.rise.value = rise;
      material.uniforms.glow.value = glow;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
