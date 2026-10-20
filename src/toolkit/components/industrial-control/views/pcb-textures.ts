import { SRGBColorSpace, Texture, TextureLoader } from 'three';
import type { Material } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import { kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';

export type PcbTexture =
  | 'backplane'
  | 'cabinet'
  | 'drive'
  | 'power'
  | 'plc-power'
  | 'plc-cpu'
  | 'plc-input'
  | 'plc-output'
  | 'plc-analog'
  | 'plc-comms';
const textures = new WeakMap<PanelKit, Map<PcbTexture, Texture>>();

/** Baked green solder mask on both sides; cut FR4 on the thin edges. */
export function pcbMaterials(
  kit: PanelKit,
  variant: PcbTexture,
  axis: 'x' | 'y' | 'z',
): Material[] {
  let cache = textures.get(kit);
  if (!cache) {
    cache = new Map();
    textures.set(kit, cache);
  }
  let texture = cache.get(variant);
  if (!texture) {
    const url = new URL(`../assets/pcb/${variant}.png`, import.meta.url);
    texture =
      typeof window === 'undefined'
        ? new Texture()
        : new TextureLoader().load(url.href);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    texture.userData.pcbVariant = variant;
    kit.textures.push(texture);
    cache.set(variant, texture);
  }
  const face = createPs1Material({ map: texture, roughness: 0.65 });
  face.userData.pcbVariant = variant;
  kit.materials.push(face);
  const edge = kitPaint(kit, '#a49754');
  const materials: Material[] = [edge, edge, edge, edge, edge, edge];
  const first = axis === 'x' ? 0 : axis === 'y' ? 2 : 4;
  materials[first] = face;
  materials[first + 1] = face;
  return materials;
}
