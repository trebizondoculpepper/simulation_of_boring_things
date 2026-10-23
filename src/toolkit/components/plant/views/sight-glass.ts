import { CircleGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { plantTools } from './plant-tools';
import { newGlass, stepSightGlass } from '../logic/sight-glass';
import type { GlassInputs } from '../logic/sight-glass';

const mix = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
) => `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',')})`;

/**
 * A filter's sight glass (`logic/sight-glass.ts`): the round window at
 * the top of the bed, `radius` across, in its rim. It looks into a closed
 * pressure vessel with no light in it, so in service, stopped or rinsing
 * it is black (the owner, 2026-10-23); only in a backwash, while the
 * water lifted through the bed carries its dirt out, is it a pale brown,
 * clearing back to black as the dirt goes. A flat disc facing +z in its
 * own frame, for a filter of any size; `update` steps it and draws it (at
 * most fifteen times a second, and only when what it shows changes).
 */
export function createSightGlass(
  kit: PanelKit,
  { radius = 0.1 }: { radius?: number; seed?: number } = {},
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Sight glass';
  const px = 256;
  const { context: c, texture } = createCanvasTexture(px, px);
  kit.textures.push(texture);
  const material = new MeshStandardMaterial({
    map: texture,
    roughness: 0.15,
    emissive: '#ffffff',
    emissiveMap: texture,
    emissiveIntensity: 0.35,
  });
  kit.materials.push(material);
  const disc = new Mesh(new CircleGeometry(radius, 48), material);
  // In front of its rim (which stands 6 mm proud).
  disc.position.z = 0.009;
  disc.userData.live = true;
  group.add(disc);
  // Its rim, a dark ring round the glass.
  const rim = t.paint('#2a2f33', 0.5, 0.5);
  t.cyl(group, rim, radius * 1.18, 0.012, 0, 0, 0, 'z', 40);
  let state = newGlass();
  let since = Infinity;
  let shown = -1;
  const BLACK: [number, number, number] = [6, 7, 8];
  const BROWN: [number, number, number] = [176, 146, 104];
  const draw = () => {
    // Drawn again only when its murk has visibly changed.
    const murk = Math.round(state.murk * 100) / 100;
    if (murk === shown) return;
    shown = murk;
    c.clearRect(0, 0, px, px);
    c.save();
    c.beginPath();
    c.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
    c.clip();
    // The dark vessel, or the brown water of a backwash.
    c.fillStyle = mix(BLACK, BROWN, murk);
    c.fillRect(0, 0, px, px);
    // The glass's glint.
    c.strokeStyle = 'rgba(255,255,255,0.28)';
    c.lineWidth = 10;
    c.beginPath();
    c.arc(px / 2, px / 2, px * 0.38, Math.PI * 1.1, Math.PI * 1.45);
    c.stroke();
    c.restore();
    texture.needsUpdate = true;
  };
  draw();
  return {
    group,
    /** Step the picture `dt` seconds toward what `inputs` ask, and draw it. */
    update(inputs: GlassInputs, dt: number) {
      state = stepSightGlass(state, inputs, dt);
      since += dt;
      if (since < 1 / 15) return;
      since = 0;
      draw();
    },
  };
}
