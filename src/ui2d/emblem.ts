import type { Rect } from './geometry';

/**
 * A boot screen's emblem (the owner, 2026-10-27): a parody seal of our
 * own, drawn procedurally, in the spirit of a starship's service seal but
 * no copy of any: two grey laurel branches curving up either side of a
 * ringed dark-blue disc, and in the disc, where a seal would have its
 * stars, a swimming pool's water: a lane rope's floats across it, white
 * ripple lines, the light's caustic net on the bottom and a few glints.
 * Under it a made-up authority's name. No text, artwork or lettering
 * from any film or television series.
 */

export interface EmblemOptions {
  /** The legend under the seal (empty for none). */
  legend?: string;
  /** A smaller second line under the legend. */
  motto?: string;
  /** A canvas font-family list for the legend. */
  font?: string;
}

/** The legend the kit's emblem carries unless told otherwise: an authority of our own invention. */
export const EMBLEM_LEGEND = 'FEDERATED MUNICIPAL BATHS';
export const EMBLEM_MOTTO = 'AQUATIC SERVICES DIVISION';

const GREY = '#a7adb5';
const GREY_LIGHT = '#d5d9de';
const GREY_DARK = '#5f656d';
const NAVY = '#0a2350';
const NAVY_LIGHT = '#1a4c8c';

/** A seeded, repeatable scatter in [0, 1). */
function scatter(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** One laurel branch: a stem curving up one side of the seal, leaves along it. */
function branch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  side: 1 | -1,
) {
  // Its stem: from under the seal, round its side, up to near the top.
  const radius = R * 1.3;
  const a0 = Math.PI / 2 + side * 0.16; // crossing the other under the seal
  const a1 = Math.PI / 2 - side * 2.55; // well up the side
  const at = (f: number) => {
    const a = a0 + (a1 - a0) * f;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), a };
  };
  ctx.strokeStyle = GREY_DARK;
  ctx.lineWidth = R * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = at(i / 40);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  // Its leaves: pairs either side of the stem, smaller towards the tip,
  // each leaning on towards the tip.
  const pairs = 12;
  for (let i = 0; i < pairs; i++) {
    const f = (i + 0.5) / pairs;
    const p = at(f);
    const size = R * (0.36 - 0.16 * f);
    // The stem's direction of travel, and the way out from the seal.
    const travel = p.a + (side === 1 ? -Math.PI / 2 : Math.PI / 2);
    for (const out of [1, -1]) {
      const lean = travel + out * 0.62 * -side;
      const ox = Math.cos(p.a) * out * size * 0.15;
      const oy = Math.sin(p.a) * out * size * 0.15;
      ctx.save();
      ctx.translate(p.x + ox, p.y + oy);
      ctx.rotate(lean);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.5, -size * 0.32, size, 0);
      ctx.quadraticCurveTo(size * 0.5, size * 0.32, 0, 0);
      ctx.closePath();
      ctx.fillStyle = out === 1 ? GREY : GREY_LIGHT;
      ctx.fill();
      // A vein down its middle.
      ctx.strokeStyle = GREY_DARK;
      ctx.lineWidth = Math.max(1, size * 0.05);
      ctx.beginPath();
      ctx.moveTo(size * 0.08, 0);
      ctx.lineTo(size * 0.85, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
  // A last leaf at its tip.
  const tip = at(1);
  const tipSize = R * 0.16;
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(tip.a + (side === 1 ? -Math.PI / 2 : Math.PI / 2));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(tipSize * 0.5, -tipSize * 0.3, tipSize, 0);
  ctx.quadraticCurveTo(tipSize * 0.5, tipSize * 0.3, 0, 0);
  ctx.fillStyle = GREY_LIGHT;
  ctx.fill();
  ctx.restore();
}

/** A four-pointed glint. */
function glint(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

/** The water in the disc: caustics, a lane rope, ripples and glints, `t` seconds in. */
function water(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  t: number,
) {
  const g = ctx.createRadialGradient(
    cx - r * 0.3,
    cy - r * 0.35,
    r * 0.1,
    cx,
    cy,
    r,
  );
  g.addColorStop(0, NAVY_LIGHT);
  g.addColorStop(1, NAVY);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  // The caustic net on the pool's floor: wobbling cells of light.
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.28)';
  ctx.lineWidth = r * 0.025;
  ctx.lineJoin = 'round';
  for (let i = 0; i < 25; i++) {
    // A jittered grid over the disc.
    const px = cx + ((i % 5) - 2 + (scatter(i) - 0.5) * 0.6) * r * 0.42;
    const py =
      cy + (Math.floor(i / 5) - 2 + (scatter(i + 40) - 0.5) * 0.6) * r * 0.42;
    const size = r * (0.13 + 0.06 * scatter(i + 80));
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const wob = 1 + 0.25 * Math.sin(a * 2 + t * 1.6 + i);
      const x = px + Math.cos(a) * size * wob;
      const y = py + Math.sin(a) * size * wob * 0.8;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // A lane rope across the upper water: floats red and white.
  const ropeY = cy - r * 0.28;
  const float = r * 0.11;
  for (let x = cx - r, k = 0; x < cx + r; x += float * 1.25, k++) {
    ctx.fillStyle = k % 4 < 2 ? '#e9eef5' : '#d2433c';
    ctx.beginPath();
    ctx.ellipse(
      x + float / 2,
      ropeY,
      float / 2,
      float * 0.28,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // Ripples: white wave lines, moving slowly.
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const y0 = cy + r * (0.05 + 0.24 * k);
    ctx.lineWidth = r * (0.055 - 0.01 * k);
    ctx.globalAlpha = 0.95 - 0.2 * k;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const x = cx - r + (2 * r * i) / 48;
      const y =
        y0 + Math.sin((x - cx) / (r * 0.16) + t * 1.4 + k * 1.3) * r * 0.045;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Glints on the surface, twinkling.
  ctx.fillStyle = '#ffffff';
  const glints: [number, number][] = [
    [-0.45, -0.55],
    [0.2, -0.62],
    [0.55, -0.4],
    [-0.15, -0.08],
    [0.4, 0.2],
  ];
  glints.forEach(([gx, gy], i) => {
    const s = r * 0.09 * (0.55 + 0.45 * Math.sin(t * 3 + i * 1.7));
    glint(ctx, cx + gx * r, cy + gy * r, s);
  });
  ctx.restore();
}

/**
 * Draw the emblem centred in `r`, `t` seconds into its showing (its water
 * moves with `t`); the legend under it if there is room.
 */
export function drawEmblem(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  t: number,
  options: EmblemOptions = {},
) {
  const legend = options.legend ?? EMBLEM_LEGEND;
  const motto = options.motto ?? EMBLEM_MOTTO;
  const font = options.font ?? 'sans-serif';
  const lettering = legend ? 0.2 : 0;
  // The seal's radius: the laurel reaching 1.45 of it, in what is left over the legend.
  const R = Math.min(r.w, r.h * (1 - lettering)) / (2 * 1.5);
  if (R <= 2) return;
  const cx = r.x + r.w / 2;
  const cy = r.y + (r.h * (1 - lettering)) / 2 + R * 0.04;
  ctx.save();
  branch(ctx, cx, cy, R, 1);
  branch(ctx, cx, cy, R, -1);
  // The stems crossed under the seal, tied.
  ctx.fillStyle = GREY_LIGHT;
  ctx.beginPath();
  ctx.arc(cx, cy + R * 1.3, R * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // The ring: grey, with dark edges.
  ctx.fillStyle = GREY;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GREY_DARK;
  ctx.lineWidth = Math.max(1, R * 0.025);
  ctx.stroke();
  ctx.strokeStyle = GREY_LIGHT;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.93, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  water(ctx, cx, cy, R * 0.84, t);
  ctx.strokeStyle = GREY_DARK;
  ctx.lineWidth = Math.max(1, R * 0.02);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.84, 0, Math.PI * 2);
  ctx.stroke();
  // The legend, spaced out under the laurel.
  if (legend) {
    const px = R * 0.24;
    ctx.fillStyle = GREY_LIGHT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `600 ${Math.max(1, Math.round(px))}px ${font}`;
    const y = cy + R * 1.5 + px * 1.3;
    ctx.fillText(legend.split('').join(' '), cx, y, r.w * 0.94);
    if (motto) {
      ctx.fillStyle = GREY;
      ctx.font = `400 ${Math.max(1, Math.round(px * 0.6))}px ${font}`;
      ctx.fillText(motto, cx, y + px * 0.95, r.w * 0.8);
    }
  }
  ctx.restore();
}
