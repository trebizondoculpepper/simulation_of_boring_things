import {
  CanvasTexture,
  CircleGeometry,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from 'three';
import type { ReadonlySignal } from '@preact/signals-core';
import type { PanelKit } from '../views/eighties-controls';
import { createMicroLabel } from '../views/eighties-controls';
import { tools } from '../views/fitting-tools';
import { partAudio, recording } from '../audio/part-audio';
import { beginPart } from './parts';
import type { Part } from './parts';

/**
 * Controls for wet places (a spa's deck, a shower, a poolside): the
 * buttons used wherever a button is needed near water. Each is a part,
 * built in metres, facing +z, its mounting face at z = 0; tried on dev0's
 * WET CONTROLS board.
 */

/** A piezo switch has no travel: a faint tick, quieter than a button. */
const TICK = recording(
  new URL('../audio/assets/button-press.wav', import.meta.url),
  0.02,
);

/** What may be engraved in a piezo switch's face. */
export type PiezoSymbol =
  | 'start'
  | 'stop'
  | 'light'
  | 'power'
  | 'plus'
  | 'minus';

const RING = {
  green: '#46ff7a',
  red: '#ff3b30',
  blue: '#4fa8ff',
  white: '#fff3dc',
  amber: '#ffb21e',
} as const;
export type PiezoRing = keyof typeof RING;

/** The symbol engraved in the face, drawn dark on brushed steel. */
function engraving(symbol: PiezoSymbol) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  if (!c) return texture;
  c.clearRect(0, 0, size, size);
  c.strokeStyle = c.fillStyle = '#2b2f31';
  c.lineWidth = 10;
  c.lineCap = 'round';
  const m = size / 2;
  const r = size * 0.28;
  if (symbol === 'start') {
    c.beginPath();
    c.moveTo(m - r * 0.6, m - r);
    c.lineTo(m + r, m);
    c.lineTo(m - r * 0.6, m + r);
    c.closePath();
    c.fill();
  } else if (symbol === 'stop') {
    c.fillRect(m - r * 0.8, m - r * 0.8, r * 1.6, r * 1.6);
  } else if (symbol === 'power') {
    c.beginPath();
    c.arc(m, m + 4, r, -Math.PI / 2 + 0.6, (3 * Math.PI) / 2 - 0.6);
    c.stroke();
    c.beginPath();
    c.moveTo(m, m - r - 6);
    c.lineTo(m, m);
    c.stroke();
  } else if (symbol === 'light') {
    // A lamp: a circle with rays round it.
    c.beginPath();
    c.arc(m, m, r * 0.5, 0, Math.PI * 2);
    c.stroke();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(m + Math.cos(a) * r * 0.8, m + Math.sin(a) * r * 0.8);
      c.lineTo(m + Math.cos(a) * r * 1.2, m + Math.sin(a) * r * 1.2);
      c.stroke();
    }
  } else {
    c.beginPath();
    c.moveTo(m - r, m);
    c.lineTo(m + r, m);
    if (symbol === 'plus') {
      c.moveTo(m, m - r);
      c.lineTo(m, m + r);
    }
    c.stroke();
  }
  texture.needsUpdate = true;
  return texture;
}

/**
 * A piezo switch, after Schurter's PSE: a flush disc of brushed 316
 * stainless, 30 mm across in a 38 mm bezel, sealed to IP68, with nothing
 * that moves to let water in; a press flexes the disc a few microns and
 * the piezo crystal behind it gives a pulse, so it is momentary, with a
 * faint tick and no travel. An LED ring round the disc lights in its
 * colour: while `lit` says (a jet cycle running, say), or for a moment
 * after each press. Its symbol is engraved in the face; `legend` prints
 * a word under it.
 */
export function piezoButton(
  kit: PanelKit,
  {
    symbol,
    ring = 'white',
    legend,
    lit,
    action = () => {},
    name,
  }: {
    symbol: PiezoSymbol;
    ring?: PiezoRing;
    legend?: string;
    lit?: ReadonlySignal<boolean>;
    action?: () => void;
    name?: string;
  },
): Part {
  const t = tools(kit);
  const a = beginPart(kit, name ?? `${legend ?? symbol} piezo switch`);
  const steel = t.paint('#c9cdcf', 0.32, 0.9);
  // The bezel, its LED ring, and the disc inside.
  t.cyl(a.object, steel, 0.019, 0.004, 0, 0, 0.002, 'z', 40);
  const led = new MeshBasicMaterial({ color: '#3a3d3f' });
  kit.materials.push(led);
  t.cyl(a.object, led, 0.0165, 0.0005, 0, 0, 0.0042, 'z', 40);
  const disc = t.cyl(a.object, steel, 0.015, 0.0012, 0, 0, 0.0046, 'z', 40);
  disc.userData.live = true;
  const map = engraving(symbol);
  kit.textures.push(map);
  const mark = new MeshBasicMaterial({ map, transparent: true });
  kit.materials.push(mark);
  const face = new Mesh(new CircleGeometry(0.011, 32), mark);
  face.position.z = 0.0053;
  a.object.add(face);
  if (legend) {
    const label = createMicroLabel(kit, legend, {
      height: 0.006,
      ink: '#1f2b31',
    });
    label.position.set(0, -0.026, 0.0005);
    a.object.add(label);
  }
  const off = '#3a3d3f';
  let flash = 0;
  a.uses.set(disc, () => {
    flash = 0.35;
    action();
    partAudio.play(TICK, a.object);
  });
  a.uses.set(face, a.uses.get(disc)!);
  a.cue(disc, () => ({ gesture: 'push', possible: true }));
  a.cue(face, () => ({ gesture: 'push', possible: true }));
  a.updates.push((delta) => {
    flash = Math.max(0, flash - delta);
    led.color.set(flash > 0 || lit?.value ? RING[ring] : off);
  });
  return a.part();
}
