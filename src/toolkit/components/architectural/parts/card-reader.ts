import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import type { SoundRecipe } from '../../core/audio/part-audio';
import { BEEP, play } from '../../core/parts/building-part-tools';
import {
  initialCardReader,
  presentCard,
  readerLed,
  stepCardReader,
} from '../logic/card-reader';

/**
 * A mullion proximity card reader (`logic/card-reader.ts`), 48 × 150 ×
 * 26 mm, as fitted beside staff doors: a rounded grey housing, its glossy
 * black face printed with a card and the waves of its field, a light bar
 * at its top, red idle and green when a card is read, and its maker's
 * mark at its foot (Ironside, who make the doorsets and their locks).
 * Present a card (use it): green for three seconds, with a beep as it
 * goes green (the parts library's synthesised `BEEP`, or `options.beep`:
 * the bridge's doors use the owner's console sounds). Built in
 * metres facing +z, its back on the wall at z = 0.
 */
export function cardReader(
  kit: PanelKit,
  options: { beep?: SoundRecipe } = {},
): Part & {
  doorOpened: (audible?: boolean) => void;
} {
  const a = beginPart(kit, 'card reader');
  const paint = (color: string, roughness: number, metalness = 0) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const housing = new Mesh(
    new RoundedBoxGeometry(0.048, 0.15, 0.026, 3, 0.008),
    paint('#5a6063', 0.55, 0.1),
  );
  housing.position.z = 0.013;
  a.object.add(housing);
  // The face: glossy black, printed with a card in its field.
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 384;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#0d0f10';
    c.fillRect(0, 0, 128, 384);
    c.strokeStyle = '#8c9396';
    c.lineWidth = 5;
    c.strokeRect(34, 150, 60, 86);
    c.lineWidth = 4;
    for (const r of [26, 40, 54]) {
      c.beginPath();
      c.arc(64, 150, r, Math.PI * 1.2, Math.PI * 1.8);
      c.stroke();
    }
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  kit.textures.push(map);
  const faceMaterial = new MeshStandardMaterial({
    map,
    roughness: 0.15,
    metalness: 0.1,
  });
  kit.materials.push(faceMaterial);
  const face = new Mesh(new PlaneGeometry(0.038, 0.12), faceMaterial);
  face.position.set(0, -0.004, 0.0262);
  a.object.add(face);
  // The light bar, across the top of the face.
  const led = new MeshBasicMaterial({ color: '#d63a2c' });
  kit.materials.push(led);
  const bar = new Mesh(new PlaneGeometry(0.028, 0.006), led);
  bar.position.set(0, 0.062, 0.0263);
  a.object.add(bar);
  const badge = createBrandBadge(kit, 'ironside', { height: 0.008 });
  badge.position.set(0, -0.066, 0.0262);
  a.object.add(badge);

  let state = initialCardReader();
  // It beeps whenever its LED goes from red to green, however the read
  // came about; a door opened silently (handed over from the far side of
  // its doorway) goes green without one.
  let shown: 'red' | 'green' = 'red';
  const setGreen = (audible: boolean) => {
    state = presentCard();
    if (shown === 'red' && audible) play(options.beep ?? BEEP, a.object);
    shown = 'green';
    led.color.set('#3bd65a');
  };
  const present = () => setGreen(true);
  const doorOpened = (audible = true) => setGreen(audible);
  for (const target of [housing, face, bar]) a.uses.set(target, present);
  a.updates.push((delta) => {
    state = stepCardReader(state, delta);
    const colour = readerLed(state);
    if (colour !== shown) {
      shown = colour;
      led.color.set(colour === 'green' ? '#3bd65a' : '#d63a2c');
    }
  });
  a.object.traverse((o) => (o.userData.live = true));
  return { ...a.part(), doorOpened };
}
