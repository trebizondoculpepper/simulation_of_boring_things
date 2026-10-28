import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  SpotLight,
  SRGBColorSpace,
} from 'three';
import type { Material } from 'three';
import {
  CAUSTICS_PROJECTOR,
  createCausticsClock,
  projectorState,
} from '../logic/caustics-projector';
import { brandById } from '../../components/core/logic/brands';
import type { BrandId } from '../../components/core/logic/brands';
import { brandLogoTexture } from '../../components/core/views/brand-logo';

/**
 * The light the projector throws on the white pool: water caustics, a net
 * of bright lines drifting, worked out in the shader from the loop's phase
 * (set at most ten times a second, `caustics-projector.ts`), and added to
 * whatever it falls on. Seamless round the loop: everything moves by whole
 * turns of the phase.
 */
const CAUSTICS_FRAGMENT = /* glsl */ `
uniform float uPhase;
uniform float uOn;
uniform vec2 uSize;
varying vec2 vUv;
const float TAU = 6.28318530718;
float caustic(vec2 p, float t) {
  vec2 i = p;
  float c = 1.0;
  const float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
void main() {
  vec2 p = vUv * uSize * 2.6 - 250.0;
  float t = uPhase * TAU;
  float c = caustic(p, t);
  float c2 = caustic(p * 0.7 + 3.0, -t);
  float light = clamp(c * 0.5 + c2 * 0.2, 0.0, 1.0);
  // The picture's edge: soft, a throw that just covers the pool.
  vec2 e = smoothstep(0.0, 0.03, vUv) * smoothstep(0.0, 0.03, 1.0 - vUv);
  vec3 water = vec3(0.03, 0.09, 0.14) + light * vec3(0.55, 0.8, 0.9);
  gl_FragColor = vec4(water * e.x * e.y * uOn, 1.0);
}
`;

const CAUSTICS_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export interface CausticsProjector {
  group: Group;
  /** Advance the loop; its picture is redrawn only when its frame changes. */
  update(delta: number): void;
  /** What its status LED shows, for the information overlay. */
  status(): string;
  dispose(): void;
}

/**
 * The projector itself, hung on its drop pole from the ceiling at `ceilingY`
 * over a pool `pool.w` by `pool.d` m centred under it, lens down, and its
 * picture on the pool: a large-venue laser projector (`CAUSTICS_PROJECTOR`)
 * with its maker's badge, its status LED and a faint glow in its lens.
 */
export function createCausticsProjector(
  ceilingY: number,
  pool: { w: number; d: number },
): CausticsProjector {
  const P = CAUSTICS_PROJECTOR;
  const brand = brandById(P.maker as BrandId);
  const group = new Group();
  group.name = `${brand.name} ${P.model}`;
  const materials: Material[] = [];
  const keep = <M extends Material>(m: M) => (materials.push(m), m);
  const state = projectorState(true, true);

  // Its plate on the ceiling, the drop pole, and the cradle round the body.
  const steel = keep(
    new MeshStandardMaterial({
      color: '#2b2e31',
      roughness: 0.5,
      metalness: 0.6,
    }),
  );
  const plate = new Mesh(new CylinderGeometry(0.16, 0.16, 0.02, 24), steel);
  plate.position.y = ceilingY - 0.01;
  const pole = new Mesh(new CylinderGeometry(0.03, 0.03, P.drop, 12), steel);
  pole.position.y = ceilingY - P.drop / 2;
  const bodyTop = ceilingY - P.drop;
  const cradle = new Mesh(
    new BoxGeometry(P.body.w + 0.06, 0.03, P.body.h + 0.06),
    steel,
  );
  cradle.position.y = bodyTop;
  group.add(plate, pole, cradle);
  for (const side of [-1, 1]) {
    const arm = new Mesh(new BoxGeometry(0.03, P.body.l * 0.7, 0.04), steel);
    arm.position.set(
      side * (P.body.w / 2 + 0.03),
      bodyTop - P.body.l * 0.35,
      0,
    );
    group.add(arm);
  }

  // The body, stood on its end to fire down (portrait mounting): white, its
  // vents dark, its maker's badge on the side seen from the welcome.
  const body = new Mesh(
    new BoxGeometry(P.body.w, P.body.l, P.body.h),
    keep(new MeshStandardMaterial({ color: '#e9e9e6', roughness: 0.45 })),
  );
  const bodyY = bodyTop - 0.015 - P.body.l / 2;
  body.position.y = bodyY;
  group.add(body);
  const vents = new Mesh(
    new PlaneGeometry(P.body.w * 0.7, P.body.l * 0.3),
    keep(new MeshStandardMaterial({ color: '#202224', roughness: 0.8 })),
  );
  vents.position.set(0, bodyY + P.body.l * 0.2, -P.body.h / 2 - 0.002);
  vents.rotation.y = Math.PI;
  group.add(vents);
  const logo = brandLogoTexture(brand);
  const badgeMaterial = keep(
    new MeshBasicMaterial({
      map: logo,
      transparent: true,
      toneMapped: false,
      color: '#9a9a9a',
    }),
  );
  for (const z of [1, -1]) {
    const badge = new Mesh(new PlaneGeometry(0.32, 0.08), badgeMaterial);
    badge.position.set(0, bodyY - P.body.l * 0.15, z * (P.body.h / 2 + 0.002));
    if (z < 0) badge.rotation.y = Math.PI;
    group.add(badge);
  }

  // The lens barrel, down, a faint blue glow in its glass.
  const lensY = bodyY - P.body.l / 2;
  const barrel = new Mesh(
    new CylinderGeometry(0.075, 0.085, 0.12, 24),
    keep(
      new MeshStandardMaterial({
        color: '#141516',
        roughness: 0.3,
        metalness: 0.4,
      }),
    ),
  );
  barrel.position.y = lensY - 0.06;
  const glass = new Mesh(
    new CylinderGeometry(0.06, 0.06, 0.005, 24),
    keep(
      new MeshBasicMaterial({
        color: state.projecting ? '#9fd8ff' : '#0b0d10',
      }),
    ),
  );
  glass.position.y = lensY - 0.122;
  group.add(barrel, glass);

  // Its status LED, on the face seen from the welcome.
  const led = new Mesh(
    new SphereGeometry(0.008, 10, 8),
    keep(
      new MeshBasicMaterial({
        color:
          state.lamp === 'green'
            ? '#3dff6e'
            : state.lamp === 'amber'
              ? '#ffb020'
              : '#202020',
        toneMapped: false,
      }),
    ),
  );
  led.position.set(
    P.body.w / 2 - 0.05,
    bodyY + P.body.l / 2 - 0.05,
    P.body.h / 2 + 0.004,
  );
  group.add(led);

  // The beam in the air, barely there: a four-sided cone to the pool's corners.
  const throwH = lensY - 0.13;
  const beam = new Mesh(
    new ConeGeometry(Math.SQRT1_2, 1, 4, 1, true),
    keep(
      new MeshBasicMaterial({
        color: '#4f86a6',
        transparent: true,
        opacity: 0.035,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    ),
  );
  beam.geometry.rotateY(Math.PI / 4);
  beam.scale.set(pool.w, throwH, pool.d);
  beam.position.y = throwH / 2;
  beam.visible = state.projecting;
  group.add(beam);

  // The picture on the white pool: its light added to the paint.
  const uniforms = {
    uPhase: { value: 0 },
    uOn: { value: state.projecting ? 1 : 0 },
    uSize: { value: [pool.w, pool.d] },
  };
  const pictureMaterial = keep(
    new ShaderMaterial({
      uniforms,
      vertexShader: CAUSTICS_VERTEX,
      fragmentShader: CAUSTICS_FRAGMENT,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    }),
  );
  const pictureGeometry = new PlaneGeometry(pool.w, pool.d);
  pictureGeometry.rotateX(-Math.PI / 2);
  const picture = new Mesh(pictureGeometry, pictureMaterial);
  picture.name = 'Projected caustics';
  picture.position.y = 0.004;
  picture.renderOrder = 2;
  group.add(picture);

  // Its spill: the light off the picture lifting the deck round the pool a little.
  const spill = new SpotLight(
    '#9fd3ec',
    0.5,
    0,
    Math.atan(pool.w / 2 / throwH) * 1.15,
    0.6,
    0,
  );
  spill.position.y = lensY;
  spill.target.position.set(0, 0, 0);
  group.add(spill, spill.target);

  const clock = createCausticsClock();
  return {
    group,
    update(delta) {
      if (!state.projecting) return;
      if (clock.step(delta)) uniforms.uPhase.value = clock.phase;
    },
    status() {
      return state.lamp === 'green'
        ? 'Projecting (status lamp green)'
        : state.lamp === 'amber'
          ? 'Standby (status lamp amber)'
          : 'Off';
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
    },
  };
}

/** The margin (m) of a poster's cove glow beyond its edges on the wall. */
export const POSTER_GLOW_MARGIN = 0.32;

/**
 * The warm white (about 2800 K) glow on the wall round a poster `w` by `h` m
 * stood 50 mm off it, lit by the LED strip behind it: brightest at the
 * poster's edge and fading out over `POSTER_GLOW_MARGIN`. Drawn once.
 */
export function posterGlowTexture(w: number, h: number) {
  const m = POSTER_GLOW_MARGIN;
  const px = 40;
  const W = Math.max(8, Math.round((w + 2 * m) * px));
  const H = Math.max(8, Math.round((h + 2 * m) * px));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  const image = c.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = Math.max(0, Math.abs(x + 0.5 - W / 2) / px - w / 2);
      const dy = Math.max(0, Math.abs(y + 0.5 - H / 2) / px - h / 2);
      const f = Math.max(0, 1 - Math.hypot(dx, dy) / m);
      const k = (y * W + x) * 4;
      image.data[k] = 255;
      image.data[k + 1] = 196;
      image.data[k + 2] = 132;
      image.data[k + 3] = Math.round(255 * f * f);
    }
  c.putImageData(image, 0, 0);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return map;
}
