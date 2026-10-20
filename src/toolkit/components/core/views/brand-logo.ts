import type { CanvasTexture } from 'three';
import type { Brand } from '../logic/brands';
import { createCanvasTexture } from './screens';

type Ctx = CanvasRenderingContext2D;

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const SCRIPT = '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive';
const SLAB = 'Rockwell, "Courier New", Georgia, serif';
const FONTS = { sans: SANS, serif: SERIF, script: SCRIPT, slab: SLAB };

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

/**
 * Draw `brand`'s mark, centred at (x, y), `r` from its middle to its edge:
 * the symbol alone, without the name.
 */
export function drawBrandMark(
  ctx: Ctx,
  brand: Brand,
  x: number,
  y: number,
  r: number,
) {
  const [main, second, ink] = brand.colours;
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
  // The colours, as swatches with their codes.
  brand.colours.forEach((colour, i) => {
    const x = 90 + i * 220;
    ctx.fillStyle = colour;
    ctx.fillRect(x, 610, 180, 110);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 610, 180, 110);
    ctx.fillStyle = '#555555';
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText(colour.toUpperCase(), x, 752);
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
