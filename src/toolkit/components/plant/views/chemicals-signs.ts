import type { plantTools } from './plant-tools';
import { SANS } from '../../core/views/fitting-tools';
import { drawPictogram } from '../../general-safety/views/safety-signs';
import type { Pictogram } from '../../general-safety/views/safety-signs';

/**
 * The signs a pool's chemical store and dosing room carry, drawn on
 * canvas: GHS hazard pictograms (a black symbol in a red-bordered
 * diamond, as on a CLP label), blue mandatory signs for protective
 * equipment (BS EN ISO 7010 M-series) and green emergency signs (E011
 * eyewash, E012 safety shower). The symbols are simplified for the game,
 * not reproductions of the standard artwork.
 */

type Tools = ReturnType<typeof plantTools>;
type Ctx = CanvasRenderingContext2D;

export type GhsKind =
  | 'corrosive'
  | 'environment'
  | 'exclamation'
  | 'oxidiser'
  | 'gas';
export type MandatoryKind = 'gloves' | 'visor' | 'apron' | 'boots';
/** Each mandatory kind's modern pictogram (`safety-signs.ts`). */
const MANDATORY_PICTOGRAM: Record<MandatoryKind, Pictogram> = {
  gloves: 'gloves',
  visor: 'face-shield',
  apron: 'apron',
  boots: 'boots',
};
export type EmergencyKind = 'shower' | 'eyewash';

/** A GHS pictogram centred at (x, y), `s` across corner to corner. */
export function drawGhs(
  c: Ctx,
  x: number,
  y: number,
  s: number,
  kind: GhsKind,
) {
  c.save();
  c.translate(x, y);
  // The diamond: white, red border.
  c.beginPath();
  c.moveTo(0, -s / 2);
  c.lineTo(s / 2, 0);
  c.lineTo(0, s / 2);
  c.lineTo(-s / 2, 0);
  c.closePath();
  c.fillStyle = '#ffffff';
  c.fill();
  c.lineWidth = s * 0.07;
  c.strokeStyle = '#d4121a';
  c.stroke();
  c.fillStyle = '#111111';
  c.strokeStyle = '#111111';
  const u = s / 10;
  if (kind === 'corrosive') {
    // Two tubes pouring onto a bar and a hand.
    for (const [dx, a] of [
      [-1.4, -0.5],
      [1.4, 0.5],
    ] as const) {
      c.save();
      c.translate(dx * u, -2 * u);
      c.rotate(a);
      c.fillRect(-0.45 * u, -1.4 * u, 0.9 * u, 2.4 * u);
      c.restore();
      c.beginPath();
      c.arc(dx * u * 0.7, 0.2 * u, 0.3 * u, 0, Math.PI * 2);
      c.fill();
    }
    c.fillRect(-2.6 * u, 1.2 * u, 2.2 * u, 0.6 * u);
    c.fillRect(0.6 * u, 1.1 * u, 2 * u, 0.9 * u);
  } else if (kind === 'environment') {
    // A dead tree and a dead fish.
    c.lineWidth = 0.35 * u;
    c.beginPath();
    c.moveTo(-1.5 * u, 2 * u);
    c.lineTo(-1.5 * u, -2.6 * u);
    c.moveTo(-1.5 * u, -1 * u);
    c.lineTo(-2.6 * u, -2 * u);
    c.moveTo(-1.5 * u, -0.2 * u);
    c.lineTo(-0.4 * u, -1.4 * u);
    c.stroke();
    c.beginPath();
    c.ellipse(1.2 * u, 1.5 * u, 1.4 * u, 0.5 * u, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(2.4 * u, 1.5 * u);
    c.lineTo(3 * u, 1 * u);
    c.lineTo(3 * u, 2 * u);
    c.fill();
  } else if (kind === 'oxidiser') {
    // A flame over a circle.
    c.lineWidth = 0.4 * u;
    c.beginPath();
    c.arc(0, 1.4 * u, 1.3 * u, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(-1.2 * u, 0.2 * u);
    c.quadraticCurveTo(-1.4 * u, -2 * u, 0, -3 * u);
    c.quadraticCurveTo(1.4 * u, -2 * u, 1.2 * u, 0.2 * u);
    c.fill();
  } else if (kind === 'gas') {
    // A gas cylinder lying on its side, tilted, its valve up and right.
    c.rotate(-0.3);
    c.beginPath();
    c.roundRect(-2.8 * u, -0.9 * u, 4.6 * u, 1.8 * u, 0.9 * u);
    c.fill();
    c.fillRect(1.6 * u, -0.45 * u, 0.9 * u, 0.9 * u);
    c.fillRect(2.4 * u, -0.7 * u, 0.4 * u, 1.4 * u);
  } else {
    c.fillRect(-0.45 * u, -2.8 * u, 0.9 * u, 3.6 * u);
    c.beginPath();
    c.arc(0, 2 * u, 0.55 * u, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** Fit `text` in `width` at up to `size` pixels, bold. */
function fitText(
  c: Ctx,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
) {
  let px = size;
  c.font = `bold ${px}px ${SANS}`;
  const w = c.measureText(text).width;
  if (w > width) px *= width / w;
  c.font = `bold ${px}px ${SANS}`;
  c.fillText(text, x, y);
}

/**
 * A chemical's hazard label: its name, concentration, GHS pictograms and
 * signal word, white, `w` × `h` metres, facing +z.
 */
export function createHazardLabel(
  t: Tools,
  w: number,
  h: number,
  name: string,
  detail: string,
  pictograms: readonly GhsKind[],
  signal = 'DANGER',
) {
  return t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#111111';
      c.lineWidth = ch * 0.02;
      c.strokeRect(ch * 0.02, ch * 0.02, cw - ch * 0.04, ch - ch * 0.04);
      c.fillStyle = '#111111';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, name, cw / 2, ch * 0.14, cw * 0.9, ch * 0.13);
      c.font = `${ch * 0.07}px ${SANS}`;
      c.fillText(detail, cw / 2, ch * 0.27, cw * 0.9);
      const s = Math.min(ch * 0.42, (cw * 0.9) / pictograms.length);
      pictograms.forEach((kind, i) =>
        drawGhs(
          c,
          cw / 2 + (i - (pictograms.length - 1) / 2) * s * 1.02,
          ch * 0.57,
          s,
          kind,
        ),
      );
      c.fillStyle = '#d4121a';
      fitText(c, signal, cw / 2, ch * 0.88, cw * 0.6, ch * 0.11);
    },
    512,
  ).mesh;
}

/** A sign of mandatory protective equipment: symbols over a white caption. */
export function createMandatorySign(
  t: Tools,
  w: number,
  h: number,
  kinds: readonly MandatoryKind[],
  caption: string,
) {
  return t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, cw, ch);
      const r = Math.min(ch * 0.3, (cw * 0.9) / kinds.length / 2.2);
      kinds.forEach((kind, i) =>
        drawPictogram(
          c,
          MANDATORY_PICTOGRAM[kind],
          cw / 2 + (i - (kinds.length - 1) / 2) * r * 2.3,
          ch * 0.38,
          r * 2,
        ),
      );
      c.fillStyle = '#1d5fa8';
      c.fillRect(0, ch * 0.76, cw, ch * 0.24);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      fitText(c, caption, cw / 2, ch * 0.88, cw * 0.92, ch * 0.13);
    },
    512,
  ).mesh;
}

/** A green emergency sign: its symbol and caption. */
export function createEmergencySign(
  t: Tools,
  w: number,
  h: number,
  kind: EmergencyKind,
  caption: string,
) {
  return t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = '#0a8a3e';
      c.fillRect(0, 0, cw, ch);
      drawPictogram(c, kind, ch * 0.5, ch * 0.5, ch * 0.86);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const lines = caption.split('\n');
      lines.forEach((line, i) =>
        fitText(
          c,
          line,
          (ch + cw) / 2,
          ch * (0.5 + (i - (lines.length - 1) / 2) * 0.28),
          cw - ch * 1.1,
          ch * 0.24,
        ),
      );
    },
    512,
  ).mesh;
}

/** A plain notice: lines of black on white, the first in red, bold. */
export function createNotice(
  t: Tools,
  w: number,
  h: number,
  lines: readonly string[],
) {
  return t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#d4121a';
      c.lineWidth = ch * 0.03;
      c.strokeRect(ch * 0.03, ch * 0.03, cw - ch * 0.06, ch - ch * 0.06);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const step = 0.8 / lines.length;
      lines.forEach((line, i) => {
        c.fillStyle = i === 0 ? '#d4121a' : '#111111';
        fitText(
          c,
          line,
          cw / 2,
          ch * (0.1 + step * (i + 0.5)),
          cw * 0.88,
          ch * step * (i === 0 ? 0.7 : 0.55),
        );
      });
    },
    512,
  ).mesh;
}

/**
 * A small engraved equipment tag: dark text on a pale plate (or the
 * colours given), lines centred, `w` metres wide, facing +z.
 */
export function createTag(
  t: Tools,
  text: string,
  w = 0.2,
  { ink = '#1f2b31', plate = '#eef0ea' }: { ink?: string; plate?: string } = {},
) {
  const lines = text.split('\n');
  return t.printed(
    w,
    0.03 * lines.length + 0.016,
    (c, cw, ch) => {
      c.fillStyle = plate;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = ink;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, i) =>
        fitText(
          c,
          line,
          cw / 2,
          (ch / lines.length) * (i + 0.5),
          cw * 0.92,
          (ch / lines.length) * 0.62,
        ),
      );
    },
    384,
  ).mesh;
}

/**
 * A pool chemical's CLP label, as its strength classifies it: sodium
 * hypochlorite 14% is Skin Corr. 1B and Aquatic Acute 1 with EUH031
 * (DANGER); hydrochloric acid at 10% is below the corrosive limit (25%),
 * an irritant to skin, eyes and lungs and corrosive to metals (WARNING).
 */
export function createChemicalLabel(
  t: Tools,
  w: number,
  h: number,
  product: string,
  acid: boolean,
) {
  return acid
    ? createHazardLabel(
        t,
        w,
        h,
        product,
        'Causes skin and serious eye irritation. May cause respiratory irritation. May be corrosive to metals.',
        ['corrosive', 'exclamation'],
        'WARNING',
      )
    : createHazardLabel(
        t,
        w,
        h,
        product,
        'Causes severe skin burns and eye damage. Very toxic to aquatic life. Contact with acids liberates toxic gas.',
        ['corrosive', 'environment'],
      );
}
