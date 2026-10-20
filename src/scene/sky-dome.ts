import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { Sky } from '../game/skies';
import { sunDirection } from '../game/skies';

/**
 * A sky drawn in one pass on the inside of a sphere round the camera: a
 * gradient from the horizon to the zenith, the sun and its glow, a layer
 * of cloud (fractal noise on a plane high overhead, so it drifts and
 * thins towards the horizon as cloud does, its cover, softness, scale and
 * streakiness from the sky), shaded on the side away from the sun, and
 * stars at night. One draw call, whatever the sky.
 */
export function createSkyDome(radius: number) {
  const uniforms = {
    zenith: { value: new Color() },
    horizon: { value: new Color() },
    sunDir: { value: new Vector3(0, 1, 0) },
    sunColour: { value: new Color() },
    sunLevel: { value: 1 },
    cover: { value: 0 },
    softness: { value: 0.2 },
    scale: { value: 1 },
    stretch: { value: 1 },
    cloudLit: { value: new Color() },
    cloudShade: { value: new Color() },
    drift: { value: 0 },
    layers: { value: 1 },
    layerSpeed: { value: 1.6 },
    quake: { value: 0 },
    spread: { value: 0 },
    stars: { value: 0 },
    time: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 zenith, horizon, sunDir, sunColour, cloudLit, cloudShade;
      uniform float sunLevel, cover, softness, scale, stretch, drift, stars, time;
      uniform float layers, layerSpeed, quake, spread;
      varying vec3 vDir;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                   mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }
      void main() {
        vec3 d = normalize(vDir);
        float up = clamp(d.y, 0.0, 1.0);
        vec3 colour = mix(horizon, zenith, pow(up, 0.55));
        // The sun and its glow.
        float s = max(dot(d, normalize(sunDir)), 0.0);
        colour += sunColour * sunLevel * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.18);
        // Stars, at night: a sparse grid of points, twinkling.
        if (stars > 0.0 && d.y > 0.0) {
          vec2 g = d.xz / (d.y + 0.25) * 140.0;
          vec2 cell = floor(g);
          float h = hash(cell);
          float star = step(0.985, h) * smoothstep(0.35, 0.0, length(fract(g) - 0.5));
          star *= 0.6 + 0.4 * sin(time * 2.0 + h * 40.0);
          colour += vec3(star) * stars * up;
        }
        // Cloud on planes overhead. The second layer of the fair-weather
        // preset is a higher, thin cirrus sheet above the low cumulus.
        if (cover > 0.001 && d.y > 0.02) {
          vec2 base = d.xz / d.y;
          base.x /= stretch;
          float edge = 1.0 - cover;
          float lit = clamp(0.55 + 0.45 * dot(normalize(sunDir), vec3(0, 1, 0)), 0.0, 1.0);
          float speed = 1.0;
          // Quake's way scrolls diagonally; ordinary cloud drifts with the wind.
          vec2 way = mix(vec2(1.0, 0.35), vec2(1.0, 1.0), quake);
          for (int i = 0; i < 3; i++) {
            float layer = float(i);
            if (layer >= layers) break;
            // Each layer's way turned further off the last's, by spread.
            float turn = layer * spread * 2.1;
            vec2 dir = vec2(cos(turn) * way.x - sin(turn) * way.y,
                            sin(turn) * way.x + cos(turn) * way.y);
            bool highCirrus = quake < 0.5 && i == 1;
            vec2 p = base * 0.9 * scale * (highCirrus ? 0.38 : 1.0 + 0.55 * layer)
              + dir * drift * speed + vec2(layer * 17.3, layer * 5.1);
            if (highCirrus) p.x /= 5.0;
            float n = fbm(p);
            float horizonFade = smoothstep(0.02, 0.25, d.y);
            if (quake > 0.5 && i == 0) {
              // The back layer: solid, the noise only shading it.
              vec3 back = mix(cloudShade, mix(cloudShade, cloudLit, 0.55), smoothstep(0.3, 0.75, n));
              colour = mix(colour, back, horizonFade);
            } else {
              // Cloud with holes in it: clear where the noise is low.
              float c = highCirrus
                ? smoothstep(0.38, 0.64, n) * 0.38
                : smoothstep(edge - softness, edge + softness * 0.5, n);
              c *= horizonFade * (1.0 - 0.15 * layer * (1.0 - quake));
              float thick = smoothstep(edge, 1.0, n);
              float tone = clamp(lit - thick * 0.6 + layer * 0.15, 0.0, 1.0);
              // Quake's front layers are brighter than the back, each a shade lighter.
              tone = mix(tone, 0.55 + 0.22 * layer + 0.3 * thick, quake);
              vec3 cloud = mix(cloudShade, cloudLit, highCirrus ? 0.88 : tone);
              colour = mix(colour, cloud, c);
            }
            speed *= layerSpeed;
          }
        }
        gl_FragColor = vec4(colour, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const dome = new Mesh(new SphereGeometry(radius, 32, 16), material);
  dome.name = 'sky';
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  let drift = 0;
  return {
    dome,
    /**
     * Show `sky`, the clouds drifted on by `dt` seconds; `spread` (0 to 1)
     * turns each cloud layer's motion further from the one beneath's.
     */
    set(sky: Sky, dt: number, time: number, spread = 0) {
      const u = uniforms;
      u.zenith.value.setRGB(...sky.zenith, SRGBColorSpace);
      u.horizon.value.setRGB(...sky.horizon, SRGBColorSpace);
      const d = sunDirection(sky);
      u.sunDir.value.set(d.x, d.y, d.z);
      u.sunColour.value.setRGB(...sky.sunColour, SRGBColorSpace);
      u.sunLevel.value = sky.sun * Math.max(0, Math.min(1, d.y * 8 + 0.3));
      u.cover.value = sky.cover;
      u.softness.value = sky.softness;
      u.scale.value = sky.scale;
      u.stretch.value = sky.stretch;
      u.cloudLit.value.setRGB(...sky.cloudLit, SRGBColorSpace);
      u.cloudShade.value.setRGB(...sky.cloudShade, SRGBColorSpace);
      drift += (sky.wind / 1500) * dt;
      u.drift.value = drift;
      u.stars.value = sky.stars;
      u.layers.value = sky.layers;
      u.layerSpeed.value = sky.layerSpeed;
      u.quake.value = sky.quake;
      u.spread.value = spread;
      u.time.value = time;
    },
    dispose() {
      dome.geometry.dispose();
      material.dispose();
    },
  };
}
