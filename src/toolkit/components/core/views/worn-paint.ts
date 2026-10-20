import type { MeshStandardMaterial } from 'three';
import { createPs1Material } from '../parts/ps1-material';
import type { PanelKit } from './eighties-controls';
import { createCanvasTexture } from './screens';

/**
 * Worn paint for steel that has done years in a plant: a painted sheet
 * mottled a little, grime gathered at its edges and heaviest at its foot,
 * a few drips from above, hand marks, chipped edges showing grey primer
 * and bare steel, and scratches. `wear` sets how hard a life it has had:
 * `light` for doors and covers out of reach of boots, `heavy` for the
 * plinth and kick plates that trolleys and hobnail boots strike all day.
 * Each surface is drawn from its own seed, so no two panels match, and
 * the same seed always draws the same panel.
 */

/** The Retro Encabulator's paint: a modernist pale blue. */
export const MCC_BLUE = '#8fb2c3';

/** A small, fast, seeded random source (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WornPaintOptions {
  /** The paint's colour when new. */
  colour: string;
  /** The surface's size, metres, so marks keep their scale. */
  width: number;
  height: number;
  seed: number;
  wear?: 'light' | 'heavy';
  /** Hand marks: where people push and pull, as a share across and up. */
  handled?: { x: number; y: number } | null;
}

/** Pixels per metre of surface, and the largest side drawn. */
const DENSITY = 420;
const MAX_SIDE = 512;

export function createWornPaint(
  kit: PanelKit,
  {
    colour,
    width,
    height,
    seed,
    wear = 'light',
    handled = null,
  }: WornPaintOptions,
): MeshStandardMaterial {
  const scale = Math.min(1, MAX_SIDE / (Math.max(width, height) * DENSITY));
  const W = Math.max(16, Math.round(width * DENSITY * scale));
  const H = Math.max(16, Math.round(height * DENSITY * scale));
  /** Pixels per metre as drawn. */
  const ppm = DENSITY * scale;
  const art = createCanvasTexture(W, H);
  kit.textures.push(art.texture);
  const c = art.context;
  const rand = seeded(seed * 7919 + (wear === 'heavy' ? 13 : 0));
  const heavy = wear === 'heavy';
  /** How many marks a surface this size takes, at `density` a square metre. */
  const perArea = (density: number) =>
    Math.max(3, Math.round(density * width * height));

  c.fillStyle = colour;
  c.fillRect(0, 0, W, H);
  // Mottling: the paint was never quite even, and has faded unevenly.
  for (let i = 0; i < 18; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = (0.04 + rand() * 0.12) * ppm;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const tone = rand() < 0.5 ? '255,255,255' : '40,46,52';
    g.addColorStop(0, `rgba(${tone},${0.02 + rand() * 0.025})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // Grime in the edges and seams, heaviest at the foot where dust settles
  // and mop water splashes.
  const edge = (0.025 + (heavy ? 0.03 : 0)) * ppm;
  const grime = (x0: number, y0: number, x1: number, y1: number, a: number) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(58,52,42,${a})`);
    g.addColorStop(1, 'rgba(58,52,42,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  };
  grime(0, 0, edge, 0, 0.32);
  grime(W, 0, W - edge, 0, 0.32);
  grime(0, 0, 0, edge, 0.22);
  grime(
    0,
    H,
    0,
    H - Math.min(edge * (heavy ? 3 : 2.2), H * 0.45),
    heavy ? 0.5 : 0.42,
  );
  // Drips and streaks running down from the top.
  for (let i = 0; i < (heavy ? 2 : 4); i++) {
    const x = rand() * W;
    const len = (0.05 + rand() * 0.25) * ppm;
    const g = c.createLinearGradient(x, 0, x, len);
    g.addColorStop(0, `rgba(60,56,48,${0.12 + rand() * 0.12})`);
    g.addColorStop(1, 'rgba(60,56,48,0)');
    c.fillStyle = g;
    c.fillRect(x, 0, 1 + rand() * 2.5, len);
  }
  // Hand marks: a grey sheen of skin oil where hands go every shift.
  if (handled)
    for (let i = 0; i < 6; i++) {
      const x = (handled.x + (rand() - 0.5) * 0.12) * W;
      const y = (1 - handled.y + (rand() - 0.5) * 0.12) * H;
      const r = (0.006 + rand() * 0.01) * ppm;
      c.fillStyle = `rgba(48,46,42,${0.03 + rand() * 0.04})`;
      c.beginPath();
      c.ellipse(x, y, r * 1.4, r, rand() * Math.PI, 0, Math.PI * 2);
      c.fill();
    }
  /** A chip: grey primer, and in its middle the bare steel. */
  const chip = (x: number, y: number, size: number) => {
    const points = 6 + Math.floor(rand() * 4);
    const shape = (s: number) => {
      c.beginPath();
      for (let k = 0; k < points; k++) {
        const a = (k / points) * Math.PI * 2;
        const r = s * (0.55 + rand() * 0.6);
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r * 0.75;
        if (k === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.fill();
    };
    c.fillStyle = '#8e8a7e';
    shape(size);
    c.fillStyle = rand() < 0.3 ? '#7a4a2a' : '#5f6366';
    shape(size * 0.5);
  };
  // Chipped edges and corners, where things knock against them.
  const chips = heavy ? perArea(130) : 4 + Math.floor(rand() * 4);
  for (let i = 0; i < chips; i++) {
    const side = rand();
    const along = rand();
    const size = (0.002 + rand() * (heavy ? 0.007 : 0.004)) * ppm;
    let x = along * W;
    let y = side < 0.5 ? H - rand() * size : rand() * size;
    if (!heavy && side > 0.75) {
      x = side > 0.875 ? rand() * size : W - rand() * size;
      y = along * H;
    }
    if (heavy) y = H * (0.1 + rand() * 0.85);
    chip(x, y, size);
  }
  // Scratches: bright where they reach the steel, dark where they only
  // scored the paint. Low down, where boots and trolleys pass.
  const scratches = heavy ? perArea(180) : 3 + Math.floor(rand() * 4);
  for (let i = 0; i < scratches; i++) {
    const x = rand() * W;
    const y = heavy ? rand() * H : H * (0.7 + rand() * 0.3);
    const len = (0.01 + rand() * (heavy ? 0.12 : 0.06)) * ppm;
    const a = (rand() - 0.5) * (heavy ? 0.9 : 1.6);
    c.strokeStyle =
      rand() < 0.5
        ? `rgba(205,208,206,${0.3 + rand() * 0.35})`
        : `rgba(46,48,50,${0.25 + rand() * 0.3})`;
    c.lineWidth = Math.max(0.5, (0.0012 + rand() * 0.0018) * ppm);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(
      x + Math.cos(a) * len * 0.5,
      y + Math.sin(a) * len * 0.5 + (rand() - 0.5) * 3,
      x + Math.cos(a) * len,
      y + Math.sin(a) * len,
    );
    c.stroke();
  }
  if (heavy) {
    // Black heel and tyre marks, scuffed in short arcs.
    for (let i = 0; i < perArea(150); i++) {
      const x = rand() * W;
      const y = H * (0.25 + rand() * 0.7);
      const len = (0.02 + rand() * 0.07) * ppm;
      c.strokeStyle = `rgba(22,20,18,${0.12 + rand() * 0.22})`;
      c.lineWidth = Math.max(0.8, (0.003 + rand() * 0.007) * ppm);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + len * 0.5,
        y - (rand() * 0.6 + 0.2) * len * 0.3,
        x + len,
        y + (rand() - 0.5) * len * 0.2,
      );
      c.stroke();
    }
    // The top edge, kicked through to bare steel along much of its length.
    for (let x = 0; x < W; x += (0.004 + rand() * 0.012) * ppm) {
      if (rand() < 0.45) continue;
      c.fillStyle = rand() < 0.7 ? '#6c7073' : '#8e8a7e';
      c.fillRect(
        x,
        0,
        (0.004 + rand() * 0.02) * ppm,
        (0.001 + rand() * 0.005) * ppm,
      );
    }
    // A little rust where the bare steel has been mopped round for years.
    for (let i = 0; i < perArea(30); i++) {
      const x = rand() * W;
      const y = H * (0.6 + rand() * 0.4);
      const r = (0.0015 + rand() * 0.003) * ppm;
      const g = c.createRadialGradient(x, y, 0, x, y, r * 2);
      g.addColorStop(0, 'rgba(120,64,28,0.45)');
      g.addColorStop(1, 'rgba(120,64,28,0)');
      c.fillStyle = g;
      c.fillRect(x - 2 * r, y - 2 * r, 4 * r, 4 * r);
    }
  }
  art.texture.needsUpdate = true;
  const material = createPs1Material({
    map: art.texture,
    color: '#ffffff',
    roughness: heavy ? 0.7 : 0.55,
    metalness: 0.08,
  }) as MeshStandardMaterial;
  kit.materials.push(material);
  return material;
}
