import {
  AdditiveBlending,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import type { Texture } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * Light washes (Dev30, lighting styles): the light an architectural
 * fitting throws on the surfaces round it, drawn as soft textures laid on
 * those surfaces and added to what is there, so a room can show many
 * fittings' light without a dynamic light for each. Each shape is the
 * pattern of a kind of fitting:
 *
 * - `halo`: the ceiling round a suspended direct/indirect panel, brightest
 *   at the panel's edge and fading away from it;
 * - `edges`: a ceiling washed from a cove along three of its sides;
 * - `scallop`: a grazing uplight's cone up a wall, a hot spot at its foot;
 * - `band`: the soft glow either side of a linear slot;
 * - `fall`: a band bright at one edge and fading across (a cove's wall
 *   above its ledge; a luminous ceiling's walls below it).
 */
export type WashShape = 'halo' | 'edges' | 'scallop' | 'band' | 'fall';

const SIZE = {
  halo: [128, 96],
  edges: [128, 96],
  scallop: [64, 128],
  band: [64, 16],
  fall: [16, 64],
} as const;

/** A wash's pattern, `inner` the share of a halo's plane its panel covers. */
export function washTexture(
  kit: PanelKit,
  shape: WashShape,
  inner = 0.45,
): Texture {
  const [w, h] = SIZE[shape];
  const { context: c, texture } = createCanvasTexture(w, h);
  const image = c.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const v = (y + 0.5) / h;
      let b: number;
      if (shape === 'halo') {
        // Distance out from the panel's outline, as a share of the plane.
        const dx = Math.max(0, Math.abs(u - 0.5) - inner / 2);
        const dy = Math.max(0, Math.abs(v - 0.5) - inner / 2);
        const d = Math.hypot(dx, dy);
        b = Math.exp(-d / 0.09) * (1 - Math.min(1, d / 0.3));
      } else if (shape === 'edges') {
        // Lit from the left, the right and the far (top) edge.
        const d = Math.min(u, 1 - u, v);
        b = Math.exp(-d / 0.08) * (1 - Math.min(1, d / 0.45));
      } else if (shape === 'scallop') {
        // Up from the bottom middle: a narrow hot foot spreading as it rises.
        const up = 1 - v;
        const spread = 0.06 + up * 0.42;
        const across = (u - 0.5) / spread;
        b =
          Math.exp(-across * across * 2.2) *
          (0.35 + 0.65 * Math.exp(-up * 2.2));
        b *= 1 - Math.min(1, Math.max(0, up - 0.75) / 0.25);
      } else if (shape === 'band') {
        const across = (u - 0.5) / 0.18;
        b = Math.exp(-across * across);
      } else {
        // Bright at the top edge, falling away down the plane.
        b = Math.exp(-v / 0.3);
      }
      const k = (y * w + x) * 4;
      const g = Math.round(255 * Math.max(0, Math.min(1, b)));
      image.data[k] = image.data[k + 1] = image.data[k + 2] = g;
      image.data[k + 3] = 255;
    }
  c.putImageData(image, 0, 0);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  return texture;
}

/**
 * A wash laid on a surface: a plane `w` by `h` metres, facing +z in its
 * own frame, its light the colour given, added to the surface's own;
 * `set` takes its level, 0 (off) to 1.
 */
export function createWash(
  kit: PanelKit,
  shape: WashShape,
  w: number,
  h: number,
  colour = '#fff1d6',
  { inner, strength = 1 }: { inner?: number; strength?: number } = {},
) {
  const material = new MeshBasicMaterial({
    map: washTexture(kit, shape, inner),
    color: new Color(colour),
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    opacity: 0,
  });
  kit.materials.push(material);
  const mesh = new Mesh(new PlaneGeometry(w, h), material);
  mesh.userData.live = true;
  mesh.renderOrder = 1;
  return {
    mesh,
    set(level: number) {
      material.opacity = Math.max(0, Math.min(1, level)) * strength;
      mesh.visible = level > 0.002;
    },
  };
}
