import { CylinderGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { PanelKit } from './eighties-controls';
import { createCanvasTexture } from './screens';

/**
 * Lettering printed straight onto the front of an upright cylinder (a
 * tank, a drum, a bottle), wrapped round its curve (the owner,
 * 2026-10-29): a few lines of large type, each sized to fill the arc, on
 * one transparent texture on an open curved skin `gap` proud of the
 * surface, centred on +z. `mark`, if given, draws a symbol (a hazard
 * pictogram) in a square at the left, as tall as the lettering.
 */
export function createWrappedLettering(
  kit: PanelKit,
  {
    radius,
    arc,
    bottom,
    height,
    lines,
    ink,
    name,
    mark,
    gap = 0.003,
  }: {
    radius: number;
    /** Its width round the curve, in radians. */
    arc: number;
    bottom: number;
    height: number;
    lines: readonly string[];
    ink: string;
    name: string;
    mark?: (c: CanvasRenderingContext2D, size: number) => void;
    gap?: number;
  },
) {
  const scale = 1600; // pixels a metre
  const W = Math.round(radius * arc * scale);
  const H = Math.round(height * scale);
  const { context: c, texture } = createCanvasTexture(W, H);
  kit.textures.push(texture);
  c.clearRect(0, 0, W, H);
  let left = 0;
  if (mark) {
    c.save();
    mark(c, H);
    c.restore();
    left = H * 1.1;
  }
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const row = H / lines.length;
  const room = (W - left) * 0.94;
  lines.forEach((line, k) => {
    let px = Math.round(row * (k === 0 ? 0.78 : 0.6));
    const font = () => `bold ${px}px Helvetica, Arial, sans-serif`;
    c.font = font();
    const wide = c.measureText(line).width;
    if (wide > room) {
      px = Math.floor((px * room) / wide);
      c.font = font();
    }
    c.fillText(line, left + (W - left) / 2, row * (k + 0.5));
  });
  texture.needsUpdate = true;
  const skin = new Mesh(
    new CylinderGeometry(
      radius + gap,
      radius + gap,
      height,
      48,
      1,
      true,
      -arc / 2,
      arc,
    ),
    new MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.6,
      depthWrite: false,
    }),
  );
  skin.position.y = bottom + height / 2;
  skin.name = name;
  return skin;
}

/** The CLP corrosive pictogram (GHS05), simplified: a red-bordered diamond, drops onto a bar and a hand. */
export function corrosivePictogram(c: CanvasRenderingContext2D, size: number) {
  const m = size / 2;
  const s = size * 0.48;
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#d0121b';
  c.lineWidth = size * 0.07;
  c.beginPath();
  c.moveTo(m, m - s);
  c.lineTo(m + s, m);
  c.lineTo(m, m + s);
  c.lineTo(m - s, m);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#111111';
  // Two test tubes pouring, their drops, and what they fall on.
  c.fillRect(m - size * 0.2, m - size * 0.28, size * 0.06, size * 0.16);
  c.fillRect(m + size * 0.08, m - size * 0.28, size * 0.06, size * 0.16);
  for (const x of [m - size * 0.17, m + size * 0.11])
    for (const dy of [0.0, 0.08]) {
      c.beginPath();
      c.arc(x, m - size * 0.06 + dy * size, size * 0.022, 0, Math.PI * 2);
      c.fill();
    }
  c.fillRect(m - size * 0.26, m + size * 0.12, size * 0.2, size * 0.05);
  c.fillRect(m + size * 0.04, m + size * 0.12, size * 0.22, size * 0.07);
}
