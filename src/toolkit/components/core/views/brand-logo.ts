import type { CanvasTexture } from 'three';
import type { Brand } from '../logic/brands';
import { brandPalette, contrast } from '../logic/brand-palette';
import { createCanvasTexture } from './screens';

type Ctx = CanvasRenderingContext2D;

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const SCRIPT = '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive';
const SLAB = 'Rockwell, "Courier New", Georgia, serif';
const FONTS = { sans: SANS, serif: SERIF, script: SCRIPT, slab: SLAB };

/** The font family a brand sets its type in. */
export const brandTypeface = (brand: Brand) => FONTS[brand.type];

/** The initials of a name, up to two. */
const initials = (name: string) =>
  name
    .split(/[\s&-]+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/** A regular polygon's path, `sides` round (x, y), radius `r`. */
function polygon(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  sides: number,
  turn = 0,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = turn + (i / sides) * Math.PI * 2;
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

/** The light the marks are reversed out in, on a dark ground. */
export const REVERSED_MARK = '#f6f3ea';

/**
 * A brand's mark colours on `ground`: its own, or reversed (the owner,
 * 2026-10-28: Grundflow's blue impeller was lost on its own blue plate) —
 * its main colour cream and its ink its main, as a brand's guidelines give
 * a light-on-dark version, wherever its main colour would not show.
 */
export function markColours(
  brand: Pick<Brand, 'colours'>,
  ground?: string,
): readonly [string, string, string] {
  const [main, second] = brand.colours;
  if (!ground || contrast(ground, main) >= 2) return brand.colours;
  return [REVERSED_MARK, second, main];
}

/**
 * Draw `brand`'s mark, centred at (x, y), `r` from its middle to its edge:
 * the symbol alone, without the name; reversed out light where `ground`,
 * the colour it is drawn on, would hide it (`markColours`).
 */
export function drawBrandMark(
  ctx: Ctx,
  brand: Brand,
  x: number,
  y: number,
  r: number,
  ground?: string,
) {
  const [main, second, ink] = markColours(brand, ground);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  switch (brand.mark) {
    case 'monogram': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${r * 0.95}px ${SANS}`;
      const [a, b] = initials(brand.name);
      ctx.fillText(a, -r * 0.2, -r * 0.08);
      ctx.fillStyle = second;
      ctx.fillText(b ?? '', r * 0.22, r * 0.12);
      break;
    }
    case 'bolt': {
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.28;
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.75);
      ctx.lineTo(r * 0.75, r * 0.75);
      ctx.moveTo(r * 0.75, -r * 0.75);
      ctx.lineTo(-r * 0.75, r * 0.75);
      ctx.stroke();
      ctx.fillStyle = main;
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.06;
      ctx.beginPath();
      ctx.moveTo(r * 0.15, -r);
      ctx.lineTo(-r * 0.45, r * 0.1);
      ctx.lineTo(-r * 0.02, r * 0.1);
      ctx.lineTo(-r * 0.2, r);
      ctx.lineTo(r * 0.5, -r * 0.15);
      ctx.lineTo(r * 0.05, -r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'starburst': {
      ctx.fillStyle = main;
      ctx.beginPath();
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const rr = i % 2 ? r * 0.62 : r;
        if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.62, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6e6';
      ctx.font = `900 ${r * 0.42}px ${SLAB}`;
      ctx.fillText(
        (brand.wordmark ?? brand.name).split(' ')[0],
        0,
        r * 0.02,
        r * 1.1,
      );
      break;
    }
    case 'sun': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.62, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = main;
      ctx.lineWidth = r * 0.07;
      for (let i = 1; i < 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.74, r * 0.1 + Math.sin(a) * r * 0.74);
        ctx.lineTo(Math.cos(a) * r, r * 0.1 + Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.09;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
          const px = -r + (i / 20) * r * 2;
          const py = r * (0.32 + k * 0.24) + Math.sin(i * 0.9) * r * 0.06;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      break;
    }
    case 'shield': {
      ctx.fillStyle = main;
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, -r * 0.85);
      ctx.lineTo(r * 0.78, -r * 0.85);
      ctx.lineTo(r * 0.78, r * 0.05);
      ctx.quadraticCurveTo(r * 0.7, r * 0.7, 0, r);
      ctx.quadraticCurveTo(-r * 0.7, r * 0.7, -r * 0.78, r * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = second;
      ctx.font = `700 ${r * 0.7}px ${SERIF}`;
      ctx.fillText(
        initials(brand.name).split('').join('·'),
        0,
        -r * 0.02,
        r * 1.4,
      );
      break;
    }
    case 'wave': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.4);
      ctx.fill();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const px = -r * 0.7 + (i / 40) * r * 1.4;
        const py = -Math.sin((i / 40) * Math.PI * 2) * r * 0.42;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case 'cog': {
      ctx.fillStyle = main;
      ctx.beginPath();
      const teeth = 12;
      for (let i = 0; i < teeth * 4; i++) {
        const a = (i / (teeth * 4)) * Math.PI * 2;
        const rr = i % 4 < 2 ? r : r * 0.82;
        if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f7efe0';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = main;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 ? r * 0.22 : r * 0.55;
        if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.04;
      ctx.stroke();
      break;
    }
    case 'pepper': {
      // A plump red chilli, curled, with a green stalk.
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.55);
      ctx.bezierCurveTo(
        r * 0.5,
        -r * 0.8,
        r * 1.05,
        r * 0.05,
        r * 0.15,
        r * 0.95,
      );
      ctx.bezierCurveTo(
        r * 0.4,
        r * 0.25,
        -r * 0.1,
        -r * 0.05,
        -r * 0.6,
        -r * 0.2,
      );
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff99';
      ctx.beginPath();
      ctx.ellipse(r * 0.05, -r * 0.4, r * 0.25, r * 0.07, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, -r * 0.38);
      ctx.quadraticCurveTo(-r * 0.75, -r * 0.7, -r * 0.5, -r * 0.95);
      ctx.stroke();
      break;
    }
    case 'hexagon': {
      ctx.fillStyle = main;
      polygon(ctx, 0, 0, r, 6, Math.PI / 6);
      ctx.fill();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.1;
      polygon(ctx, 0, 0, r * 0.82, 6, Math.PI / 6);
      ctx.stroke();
      ctx.fillStyle = second;
      ctx.font = `900 ${r * 1.1}px ${SANS}`;
      ctx.fillText(initials(brand.name)[0], 0, r * 0.06);
      break;
    }
    case 'bus': {
      ctx.strokeStyle = main;
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const px = -r * 0.8 + i * r * 0.4;
        const up = i % 2 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, up * r * 0.55);
        ctx.stroke();
        ctx.fillStyle = i % 2 ? main : second;
        ctx.beginPath();
        ctx.arc(px, up * r * 0.62, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = main;
      }
      break;
    }
    case 'doorset': {
      // A heavy frame, and its leaf swung a little open on its hinge side.
      ctx.fillStyle = ink;
      ctx.fillRect(-r * 0.72, -r, r * 1.44, r * 2);
      ctx.fillStyle = second;
      ctx.fillRect(-r * 0.52, -r * 0.82, r * 1.04, r * 1.82);
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, -r * 0.82);
      ctx.lineTo(r * 0.3, -r * 0.66);
      ctx.lineTo(r * 0.3, r * 0.86);
      ctx.lineTo(-r * 0.52, r * 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.arc(r * 0.14, r * 0.12, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'switch': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.roundRect(-r * 0.75, -r, r * 1.5, r * 2, r * 0.12);
      ctx.fill();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.07;
      ctx.stroke();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.3);
      ctx.lineTo(r * 0.38, -r * 0.5);
      ctx.stroke();
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.arc(0, r * 0.3, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${r * 0.24}px ${SANS}`;
      ctx.fillText('ON', -r * 0.32, -r * 0.6);
      break;
    }
    case 'circuit': {
      ctx.strokeStyle = main;
      ctx.lineWidth = r * 0.24;
      ctx.beginPath();
      ctx.arc(-r * 0.05, -r * 0.05, r * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(r * 0.3, r * 0.3);
      ctx.lineTo(r * 0.62, r * 0.62);
      ctx.lineTo(r * 1.0, r * 0.62);
      ctx.stroke();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(r * 1.0, r * 0.62, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.arc(-r * 0.05, -r * 0.05, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rotor': {
      ctx.strokeStyle = main;
      ctx.fillStyle = main;
      ctx.lineWidth = r * 0.16;
      for (let i = 0; i < 3; i++) {
        const a0 = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, a0, a0 + Math.PI * 0.5);
        ctx.stroke();
        const a1 = a0 + Math.PI * 0.5;
        const tx = Math.cos(a1) * r * 0.72;
        const ty = Math.sin(a1) * r * 0.72;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(a1 + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(r * 0.22, 0);
        ctx.lineTo(-r * 0.12, -r * 0.2);
        ctx.lineTo(-r * 0.12, r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'dial': {
      ctx.fillStyle = '#f3efe4';
      ctx.strokeStyle = main;
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.9, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = r * 0.05;
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.62, r * 0.15 + Math.sin(a) * r * 0.62);
        ctx.lineTo(Math.cos(a) * r * 0.78, r * 0.15 + Math.sin(a) * r * 0.78);
        ctx.stroke();
      }
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.15);
      ctx.lineTo(
        Math.cos(-0.9) * r * 0.75,
        r * 0.15 + Math.sin(-0.9) * r * 0.75,
      );
      ctx.stroke();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'drop': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(
        r * 0.2,
        -r * 0.5,
        r * 0.75,
        -r * 0.05,
        r * 0.75,
        r * 0.3,
      );
      ctx.arc(0, r * 0.3, r * 0.75, 0, Math.PI);
      ctx.bezierCurveTo(-r * 0.75, -r * 0.05, -r * 0.2, -r * 0.5, 0, -r);
      ctx.fill();
      ctx.fillStyle = '#ffffff88';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, r * 0.2, r * 0.12, r * 0.25, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.arc(0, r * 0.3, r * 0.92, 0.3, Math.PI - 0.3);
      ctx.stroke();
      break;
    }
    case 'shade': {
      // A pendant shade, and the cone of light it throws.
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.moveTo(-r * 0.22, -r * 0.2);
      ctx.lineTo(r * 0.22, -r * 0.2);
      ctx.lineTo(r * 0.85, r * 0.95);
      ctx.lineTo(-r * 0.85, r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(0, -r * 0.55);
      ctx.stroke();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.55);
      ctx.lineTo(r * 0.2, -r * 0.55);
      ctx.lineTo(r * 0.5, -r * 0.18);
      ctx.lineTo(-r * 0.5, -r * 0.18);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'crest': {
      // A heater shield, a chevron across it, the initial beneath.
      ctx.fillStyle = main;
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.88);
      ctx.lineTo(r * 0.8, -r * 0.88);
      ctx.lineTo(r * 0.8, -r * 0.1);
      ctx.quadraticCurveTo(r * 0.78, r * 0.62, 0, r);
      ctx.quadraticCurveTo(-r * 0.78, r * 0.62, -r * 0.8, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.18);
      ctx.lineTo(0, -r * 0.62);
      ctx.lineTo(r * 0.8, -r * 0.18);
      ctx.lineTo(r * 0.8, r * 0.04);
      ctx.lineTo(0, -r * 0.4);
      ctx.lineTo(-r * 0.8, r * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.font = `700 ${r * 0.78}px ${SLAB}`;
      ctx.fillText(brand.name[0], 0, r * 0.32, r * 1.2);
      break;
    }
    case 'sheave': {
      // A traction sheave, its rope grooves, two ropes down to a car.
      ctx.strokeStyle = main;
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.arc(0, -r * 0.3, r * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = r * 0.05;
      ctx.beginPath();
      ctx.arc(0, -r * 0.3, r * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, -r * 0.3, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.06;
      for (const x of [-r * 0.52, r * 0.52]) {
        ctx.beginPath();
        ctx.moveTo(x, -r * 0.3);
        ctx.lineTo(x * 0.6, r * 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = second;
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.05;
      ctx.beginPath();
      ctx.rect(-r * 0.45, r * 0.5, r * 0.9, r * 0.45);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'cylinder': {
      // A gas cylinder upright in a ring, its shoulder banded, its valve.
      ctx.strokeStyle = main;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.roundRect(-r * 0.24, -r * 0.42, r * 0.48, r * 1.12, r * 0.2);
      ctx.fill();
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.roundRect(-r * 0.24, -r * 0.42, r * 0.48, r * 0.3, [
        r * 0.2,
        r * 0.2,
        0,
        0,
      ]);
      ctx.fill();
      ctx.fillStyle = main;
      ctx.fillRect(-r * 0.07, -r * 0.62, r * 0.14, r * 0.2);
      ctx.fillRect(-r * 0.16, -r * 0.66, r * 0.32, r * 0.07);
      break;
    }
    case 'tiles': {
      // Nine pale tiles in their grout, the bottom right one gone: behind
      // it, in the dark, a pipe bends round to a valve's handwheel.
      const cell = (r * 1.7) / 3;
      const gap = cell * 0.1;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.12);
      ctx.fill();
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++) {
          if (row === 2 && col === 2) continue;
          ctx.fillStyle = (row + col) % 2 ? second : '#f3f8f6';
          ctx.beginPath();
          ctx.roundRect(
            -r * 0.85 + col * cell + gap / 2,
            -r * 0.85 + row * cell + gap / 2,
            cell - gap,
            cell - gap,
            cell * 0.12,
          );
          ctx.fill();
        }
      const cx = -r * 0.85 + 2.5 * cell;
      const cy = -r * 0.85 + 2.5 * cell;
      ctx.strokeStyle = main;
      ctx.lineWidth = cell * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx - cell * 0.5, cy - cell * 0.15);
      ctx.lineTo(cx - cell * 0.05, cy - cell * 0.15);
      ctx.quadraticCurveTo(
        cx + cell * 0.15,
        cy - cell * 0.15,
        cx + cell * 0.15,
        cy + cell * 0.05,
      );
      ctx.lineTo(cx + cell * 0.15, cy + cell * 0.5);
      ctx.stroke();
      ctx.lineWidth = cell * 0.06;
      ctx.beginPath();
      ctx.arc(cx - cell * 0.22, cy - cell * 0.15, cell * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'tile': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${r * 1.25}px ${SANS}`;
      ctx.fillText(initials(brand.name)[0], 0, r * 0.06);
      break;
    }
    case 'laurel': {
      ctx.strokeStyle = main;
      ctx.fillStyle = main;
      ctx.lineWidth = r * 0.05;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          r * 0.82,
          Math.PI / 2 + side * 0.2,
          Math.PI / 2 + side * 2.6,
          side < 0,
        );
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          const a = Math.PI / 2 + side * (0.45 + i * 0.32);
          ctx.save();
          ctx.translate(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
          ctx.rotate(a + (side > 0 ? 0.6 : -0.6) + Math.PI / 2);
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.08, r * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.fillStyle = second;
      ctx.font = `italic 700 ${r * 0.8}px ${SERIF}`;
      ctx.fillStyle = main;
      ctx.fillText(initials(brand.name)[0], 0, r * 0.02);
      break;
    }
    case 'ledger': {
      // A coin, a wave across its lower half, and a line rising out of it.
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(-r, r);
      ctx.lineTo(-r, r * 0.2);
      for (let i = 0; i <= 16; i++) {
        const x = -r + (i / 16) * 2 * r;
        ctx.lineTo(x, r * 0.2 + Math.sin((i / 16) * Math.PI * 4) * r * 0.1);
      }
      ctx.lineTo(r, r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, r * 0.05);
      ctx.lineTo(-r * 0.15, -r * 0.2);
      ctx.lineTo(r * 0.1, -r * 0.05);
      ctx.lineTo(r * 0.55, -r * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.6);
      ctx.lineTo(r * 0.6, -r * 0.6);
      ctx.lineTo(r * 0.6, -r * 0.3);
      ctx.stroke();
      break;
    }
    case 'impeller': {
      // Six curved vanes round a hub, in a ring.
      ctx.strokeStyle = main;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = main;
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i / 6) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(r * 0.2, 0);
        ctx.quadraticCurveTo(r * 0.55, -r * 0.05, r * 0.78, -r * 0.42);
        ctx.quadraticCurveTo(r * 0.5, -r * 0.18, r * 0.18, -r * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = second;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ripple': {
      // A drop above three spreading rings, seen a little from the side.
      ctx.strokeStyle = main;
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = r * (0.1 - i * 0.025);
        ctx.beginPath();
        ctx.ellipse(
          0,
          r * 0.45,
          r * (0.35 + i * 0.3),
          r * (0.12 + i * 0.1),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.bezierCurveTo(
        r * 0.1,
        -r * 0.7,
        r * 0.32,
        -r * 0.45,
        r * 0.32,
        -r * 0.28,
      );
      ctx.arc(0, -r * 0.28, r * 0.32, 0, Math.PI);
      ctx.bezierCurveTo(-r * 0.32, -r * 0.45, -r * 0.1, -r * 0.7, 0, -r * 0.95);
      ctx.fill();
      break;
    }
    case 'bubbles': {
      // Bubbles rising in a rounded square of water.
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.roundRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8, r * 0.5);
      ctx.fill();
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.07;
      for (const [x, y, b] of [
        [-0.35, 0.4, 0.22],
        [0.15, 0.1, 0.17],
        [-0.1, -0.3, 0.13],
        [0.35, -0.5, 0.1],
        [0.42, 0.45, 0.08],
      ]) {
        ctx.beginPath();
        ctx.arc(x * r, y * r, b * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'molecule': {
      // Three balls joined by bonds: a hypochlorite ion, near enough.
      const atoms: [number, number, number, string][] = [
        [-0.45, 0.25, 0.32, main],
        [0.35, 0.3, 0.26, second],
        [0.0, -0.45, 0.24, main],
      ];
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(atoms[0][0] * r, atoms[0][1] * r);
      ctx.lineTo(atoms[1][0] * r, atoms[1][1] * r);
      ctx.moveTo(atoms[0][0] * r, atoms[0][1] * r);
      ctx.lineTo(atoms[2][0] * r, atoms[2][1] * r);
      ctx.stroke();
      for (const [x, y, b, colour] of atoms) {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(x * r, y * r, b * r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = r * 0.05;
        ctx.stroke();
      }
      break;
    }
    case 'flame': {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      const flame = (scale: number, colour: string) => {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.75 * scale);
        ctx.bezierCurveTo(
          r * 0.55 * scale,
          -r * 0.2 * scale,
          r * 0.5 * scale,
          r * 0.6 * scale,
          0,
          r * 0.65 * scale,
        );
        ctx.bezierCurveTo(
          -r * 0.5 * scale,
          r * 0.6 * scale,
          -r * 0.55 * scale,
          -r * 0.1 * scale,
          -r * 0.1 * scale,
          -r * 0.35 * scale,
        );
        ctx.quadraticCurveTo(
          -r * 0.05 * scale,
          -r * 0.55 * scale,
          0,
          -r * 0.75 * scale,
        );
        ctx.fill();
      };
      flame(1, main);
      ctx.save();
      ctx.translate(0, r * 0.18);
      flame(0.55, second);
      ctx.restore();
      break;
    }
    case 'swirl': {
      // Three curved strokes, a breath of air turning.
      ctx.strokeStyle = main;
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = r * (0.16 - i * 0.03);
        ctx.beginPath();
        const y = -r * 0.45 + i * r * 0.45;
        ctx.moveTo(-r * 0.85, y);
        ctx.bezierCurveTo(
          -r * 0.3,
          y - r * 0.3,
          r * 0.3,
          y + r * 0.3,
          r * 0.6,
          y,
        );
        ctx.arc(
          r * 0.6,
          y - r * 0.18,
          r * 0.18,
          Math.PI / 2,
          -Math.PI / 2,
          true,
        );
        ctx.stroke();
      }
      break;
    }
    case 'trioxygen': {
      // An ozone molecule: three oxygen atoms bent at 117°, the bonds
      // drawn, and a spark of the corona discharge that made it.
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      const half = (117 / 2) * (Math.PI / 180);
      const bond = r * 0.52;
      const atoms: [number, number][] = [
        [-Math.sin(half) * bond, Math.cos(half) * bond * 0.9 - r * 0.15],
        [0, -r * 0.15],
        [Math.sin(half) * bond, Math.cos(half) * bond * 0.9 - r * 0.15],
      ];
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(...atoms[0]);
      ctx.lineTo(...atoms[1]);
      ctx.lineTo(...atoms[2]);
      ctx.stroke();
      for (const [ax, ay] of atoms) {
        ctx.fillStyle = main;
        ctx.beginPath();
        ctx.arc(ax, ay, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff66';
        ctx.beginPath();
        ctx.arc(ax - r * 0.07, ay - r * 0.07, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      // The spark: a zig-zag beneath, in the pale colour.
      ctx.strokeStyle = second;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, r * 0.62);
      ctx.lineTo(-r * 0.15, r * 0.48);
      ctx.lineTo(r * 0.05, r * 0.7);
      ctx.lineTo(r * 0.45, r * 0.5);
      ctx.stroke();
      break;
    }
    case 'triad': {
      // A dark cubicle-grey bezel holding three pilot lamps, one lit.
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.roundRect(-r * 0.95, -r * 0.5, r * 1.9, r, r * 0.2);
      ctx.fill();
      const lamps: [string, boolean][] = [
        ['#d8372c', false],
        ['#f2b43a', false],
        ['#3ec46a', true],
      ];
      lamps.forEach(([colour, lit], i) => {
        const x = (i - 1) * r * 0.6;
        ctx.fillStyle = second;
        ctx.beginPath();
        ctx.arc(x, 0, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colour;
        ctx.globalAlpha = lit ? 1 : 0.35;
        ctx.beginPath();
        ctx.arc(x, 0, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (lit) {
          ctx.fillStyle = '#ffffff88';
          ctx.beginPath();
          ctx.arc(x - r * 0.06, -r * 0.06, r * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      break;
    }
    case 'pig': {
      // A warm glow in the brand's colours, rays round it.
      ctx.fillStyle = second;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.13) * r * 0.7, Math.sin(a - 0.13) * r * 0.7);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a + 0.13) * r * 0.7, Math.sin(a + 0.13) * r * 0.7);
        ctx.fill();
      }
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
      ctx.fill();
      // The pig: pink, round, its ears up.
      const pink = '#f7a9a3';
      const deep = '#e57f7b';
      ctx.fillStyle = pink;
      ctx.strokeStyle = ink;
      ctx.lineWidth = r * 0.035;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.2, -r * 0.42);
        ctx.lineTo(side * r * 0.52, -r * 0.66);
        ctx.lineTo(side * r * 0.5, -r * 0.24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, r * 0.02, r * 0.54, r * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Rosy cheeks.
      ctx.fillStyle = '#f0706a88';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          side * r * 0.33,
          r * 0.14,
          r * 0.1,
          r * 0.07,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // Eyes shut in a smile.
      ctx.lineCap = 'round';
      ctx.lineWidth = r * 0.045;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          side * r * 0.2,
          -r * 0.1,
          r * 0.08,
          Math.PI * 1.1,
          Math.PI * 1.9,
        );
        ctx.stroke();
      }
      // The snout and its nostrils.
      ctx.fillStyle = deep;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.12, r * 0.19, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = r * 0.03;
      ctx.stroke();
      ctx.fillStyle = ink;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          side * r * 0.065,
          r * 0.12,
          r * 0.03,
          r * 0.045,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // A broad smile under the snout.
      ctx.lineWidth = r * 0.04;
      ctx.beginPath();
      ctx.arc(0, r * 0.2, r * 0.2, Math.PI * 0.22, Math.PI * 0.78);
      ctx.stroke();
      ctx.lineCap = 'butt';
      break;
    }
    case 'lifebuoy': {
      // A ring in white and the brand's colour, four bands round it.
      ctx.lineWidth = r * 0.38;
      for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = i % 2 ? second : main;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          r * 0.72,
          (i / 8) * Math.PI * 2 + Math.PI / 8,
          ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8,
        );
        ctx.stroke();
      }
      ctx.lineWidth = r * 0.04;
      ctx.strokeStyle = ink;
      for (const rr of [0.53, 0.91]) {
        ctx.beginPath();
        ctx.arc(0, 0, rr * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

/** The wordmark's font, `size` pixels. */
export const wordmarkFont = (brand: Brand, size: number) =>
  `${brand.type === 'script' ? 'italic 600' : brand.type === 'serif' ? '600' : '800'} ${size}px ${FONTS[brand.type]}`;

/**
 * A brand's logo on a clear `w` × `h` canvas: the mark on the left, the
 * wordmark beside it in the brand's ink.
 */
export function drawBrandLogo(ctx: Ctx, brand: Brand, w: number, h: number) {
  const r = h * 0.42;
  drawBrandMark(ctx, brand, r + h * 0.08, h / 2, r);
  ctx.save();
  ctx.fillStyle = brand.colours[2];
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = wordmarkFont(brand, h * 0.36);
  const left = r * 2 + h * 0.22;
  ctx.fillText(brand.wordmark ?? brand.name, left, h / 2, w - left - h * 0.05);
  ctx.restore();
}

/** The sheet's size, pixels: 1.5 : 1. */
const SHEET = { w: 1200, h: 800 };
export const BRAND_SHEET_ASPECT = SHEET.w / SHEET.h;

/**
 * A brand's sheet for the gallery: its mark large, its logo, tagline,
 * colour swatches, and a few facts, on white.
 */
export function drawBrandSheet(ctx: Ctx, brand: Brand) {
  const { w, h } = SHEET;
  const [main, second, ink] = brand.colours;
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = main;
  ctx.fillRect(0, 0, w, 18);
  drawBrandMark(ctx, brand, 260, 330, 190);
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = wordmarkFont(brand, 88);
  ctx.fillText(brand.wordmark ?? brand.name, 500, 260, 660);
  ctx.font = `italic 400 40px ${SERIF}`;
  ctx.fillStyle = '#4a4a4a';
  ctx.fillText(`“${brand.tagline}”`, 500, 330, 660);
  ctx.font = `400 30px ${SANS}`;
  ctx.fillStyle = '#333333';
  const facts = [
    brand.name,
    `Founded ${brand.founded} · ${brand.country}`,
    brand.makes,
    brand.promise,
  ];
  facts.forEach((line, i) => ctx.fillText(line, 500, 420 + i * 44, 660));
  // The house palette, as swatches with their names and codes: the
  // brand's three colours, then the highlight, tint, shade and casing
  // worked out from them (`brand-palette.ts`).
  const palette = brandPalette(brand);
  const swatches: [string, string][] = [
    ['Main', palette.main],
    ['Second', palette.second],
    ['Ink', palette.ink],
    ['Highlight', palette.accent],
    ['Tint', palette.tint],
    ['Shade', palette.shade],
    ['Casing', palette.casing],
  ];
  swatches.forEach(([name, colour], i) => {
    const x = 60 + i * 96;
    ctx.fillStyle = colour;
    ctx.fillRect(x, 600, 84, 100);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 600, 84, 100);
    ctx.fillStyle = '#555555';
    ctx.font = `600 17px ${SANS}`;
    ctx.fillText(name, x, 724, 90);
    ctx.font = `400 15px ${SANS}`;
    ctx.fillText(colour.toUpperCase(), x, 746, 90);
  });
  // The logo as it goes on things, small, bottom right.
  ctx.save();
  ctx.translate(760, 610);
  drawBrandLogo(ctx, brand, 400, 110);
  ctx.restore();
  void second;
}

/** Textures drawn once and shared, by brand and kind. */
const textures = new Map<string, CanvasTexture>();
const cached = (
  key: string,
  w: number,
  h: number,
  draw: (ctx: Ctx) => void,
) => {
  let texture = textures.get(key);
  if (!texture) {
    const made = createCanvasTexture(w, h);
    draw(made.context);
    texture = made.texture;
    textures.set(key, texture);
  }
  return texture;
};

/** A brand's gallery sheet, as a texture. */
export const brandSheetTexture = (brand: Brand) =>
  cached(`${brand.id}:sheet`, SHEET.w, SHEET.h, (ctx) =>
    drawBrandSheet(ctx, brand),
  );

/** A brand's logo on clear, 4 : 1, as a texture, to put on things. */
export const brandLogoTexture = (brand: Brand) =>
  cached(`${brand.id}:logo`, 1024, 256, (ctx) =>
    drawBrandLogo(ctx, brand, 1024, 256),
  );
