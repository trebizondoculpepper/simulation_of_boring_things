import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { plantTools } from '../../plant/views/plant-tools';

/**
 * Modern UK safety signs: the Health and Safety (Safety Signs and Signals)
 * Regulations 1996's categories, drawn after BS EN ISO 7010's symbols and
 * colours, with their supplementary text panels, as a sign maker sells
 * them today (rigid PVC, printed): the building has had its signs brought
 * up to date even where its plant has not.
 *
 * - Prohibition: a red ring and slash over a black symbol, on white.
 * - Warning: a yellow triangle edged black, a black symbol.
 * - Mandatory: a blue disc, a white symbol.
 * - Safe condition: a green square, a white symbol.
 * - Fire equipment: a red square, a white symbol.
 *
 * Each pictogram is drawn in a 100-unit square about its middle. The
 * symbols are the game's own drawings after the standard's, not copies.
 */

type Ctx = CanvasRenderingContext2D;

export const SIGN_COLOURS = {
  red: '#c8102e',
  yellow: '#f9a800',
  blue: '#005387',
  green: '#008855',
  black: '#111111',
  white: '#ffffff',
} as const;

export type SignCategory =
  | 'prohibition'
  | 'warning'
  | 'mandatory'
  | 'safe'
  | 'fire';

/** Every pictogram the library draws, by its ISO 7010 meaning. */
export type Pictogram =
  // Prohibition.
  | 'no-smoking'
  | 'no-flames'
  | 'no-entry'
  | 'no-diving'
  // Warning.
  | 'general'
  | 'electricity'
  | 'hot-surface'
  | 'corrosive'
  | 'automatic-start'
  | 'slippery'
  | 'confined'
  // Mandatory.
  | 'ear'
  | 'eye'
  | 'gloves'
  | 'face-shield'
  | 'apron'
  | 'boots'
  | 'mandatory'
  | 'door-shut'
  // Safe condition.
  | 'first-aid'
  | 'eyewash'
  | 'shower'
  | 'exit'
  // Fire equipment.
  | 'call-point'
  | 'extinguisher'
  | 'fire-equipment';

const CATEGORY: Record<Pictogram, SignCategory> = {
  'no-smoking': 'prohibition',
  'no-flames': 'prohibition',
  'no-entry': 'prohibition',
  'no-diving': 'prohibition',
  general: 'warning',
  electricity: 'warning',
  'hot-surface': 'warning',
  corrosive: 'warning',
  'automatic-start': 'warning',
  slippery: 'warning',
  confined: 'warning',
  ear: 'mandatory',
  eye: 'mandatory',
  gloves: 'mandatory',
  'face-shield': 'mandatory',
  apron: 'mandatory',
  boots: 'mandatory',
  mandatory: 'mandatory',
  'door-shut': 'mandatory',
  'first-aid': 'safe',
  eyewash: 'safe',
  shower: 'safe',
  exit: 'safe',
  'call-point': 'fire',
  extinguisher: 'fire',
  'fire-equipment': 'fire',
};

export const categoryOf = (p: Pictogram) => CATEGORY[p];

/** A person, standing, its head at (x, y): the standard's simple figure. */
function figure(c: Ctx, x: number, y: number, k = 1) {
  c.beginPath();
  c.arc(x, y, 6 * k, 0, Math.PI * 2);
  c.fill();
  c.fillRect(x - 6 * k, y + 8 * k, 12 * k, 22 * k);
  c.fillRect(x - 6 * k, y + 30 * k, 5 * k, 20 * k);
  c.fillRect(x + 1 * k, y + 30 * k, 5 * k, 20 * k);
}

/** A head in profile facing right, at (x, y), radius r. */
function head(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  // Its neck and shoulders.
  c.fillRect(x - r * 0.45, y + r * 0.7, r * 0.9, r * 0.6);
  c.beginPath();
  c.ellipse(x, y + r * 1.75, r * 1.25, r * 0.55, 0, Math.PI, 0);
  c.fill();
}

/** The symbol of `p`, in `ink`, in the 100-unit square at the origin. */
function drawSymbol(c: Ctx, p: Pictogram, ink: string, ground: string) {
  c.fillStyle = c.strokeStyle = ink;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  switch (p) {
    case 'no-smoking': {
      // A cigarette, smoke rising.
      c.fillRect(-30, 6, 50, 10);
      c.fillRect(22, 6, 8, 10);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(26, 2);
      c.bezierCurveTo(20, -8, 32, -14, 26, -26);
      c.stroke();
      break;
    }
    case 'no-flames': {
      // A struck match, its flame.
      c.save();
      c.rotate(-0.5);
      c.fillRect(-3, -6, 6, 38);
      c.beginPath();
      c.moveTo(0, -30);
      c.bezierCurveTo(12, -18, 8, -8, 0, -6);
      c.bezierCurveTo(-8, -8, -12, -18, 0, -30);
      c.fill();
      c.restore();
      break;
    }
    case 'no-entry': {
      // A person walking, the way barred.
      c.beginPath();
      c.arc(-2, -24, 6, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(-2, -14);
      c.lineTo(-4, 6);
      c.moveTo(-4, 6);
      c.lineTo(-14, 26);
      c.moveTo(-4, 6);
      c.lineTo(8, 26);
      c.moveTo(-2, -10);
      c.lineTo(10, -2);
      c.moveTo(-2, -10);
      c.lineTo(-14, -2);
      c.stroke();
      break;
    }
    case 'no-diving': {
      // A diver going in head first, the water below.
      c.save();
      c.rotate(0.7);
      c.beginPath();
      c.arc(0, 18, 5, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(0, 10);
      c.lineTo(0, -16);
      c.moveTo(0, 12);
      c.lineTo(0, 30);
      c.stroke();
      c.restore();
      c.lineWidth = 3;
      for (const y of [22, 30])
        for (let x = -30; x < 30; x += 12) {
          c.beginPath();
          c.arc(x + 6, y, 6, Math.PI, 0);
          c.stroke();
        }
      break;
    }
    case 'general':
      c.fillRect(-5, -26, 10, 32);
      c.beginPath();
      c.arc(0, 16, 6, 0, Math.PI * 2);
      c.fill();
      break;
    case 'electricity':
      // The lightning flash, with its arrowhead.
      c.beginPath();
      c.moveTo(6, -30);
      c.lineTo(-10, 2);
      c.lineTo(2, 2);
      c.lineTo(-6, 26);
      c.lineTo(-12, 20);
      c.lineTo(-10, 34);
      c.lineTo(4, 24);
      c.lineTo(-2, 24);
      c.lineTo(14, -6);
      c.lineTo(2, -6);
      c.lineTo(16, -30);
      c.closePath();
      c.fill();
      break;
    case 'hot-surface':
      // Heat rising from a surface.
      c.fillRect(-26, 20, 52, 6);
      c.lineWidth = 4;
      for (const x of [-14, 0, 14]) {
        c.beginPath();
        c.moveTo(x, 14);
        c.bezierCurveTo(x - 8, 4, x + 8, -4, x, -14);
        c.bezierCurveTo(x - 6, -20, x + 2, -24, x, -28);
        c.stroke();
      }
      break;
    case 'corrosive': {
      // Drops from two test tubes on to a hand and a bar.
      c.save();
      c.translate(-12, -22);
      c.rotate(0.4);
      c.fillRect(-4, -10, 8, 18);
      c.restore();
      c.save();
      c.translate(14, -22);
      c.rotate(-0.4);
      c.fillRect(-4, -10, 8, 18);
      c.restore();
      for (const [x, y] of [
        [-9, -6],
        [11, -6],
      ] as const) {
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fill();
      }
      // The hand, left; the bar, right; both eaten at.
      c.fillRect(-26, 8, 20, 10);
      c.fillRect(-26, 18, 6, 10);
      c.fillRect(6, 8, 22, 18);
      c.fillStyle = ground;
      c.fillRect(-14, 8, 4, 4);
      c.fillRect(14, 8, 6, 5);
      break;
    }
    case 'automatic-start':
      // A machine's wheel turning, its arrow.
      c.lineWidth = 6;
      c.beginPath();
      c.arc(0, 4, 16, -0.3, Math.PI * 1.4);
      c.stroke();
      c.beginPath();
      c.moveTo(16, -10);
      c.lineTo(22, 8);
      c.lineTo(6, 2);
      c.closePath();
      c.fill();
      c.beginPath();
      c.arc(0, 4, 5, 0, Math.PI * 2);
      c.fill();
      break;
    case 'slippery':
      // A figure slipping, its foot up.
      c.beginPath();
      c.arc(6, -22, 6, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(4, -14);
      c.lineTo(-4, 6);
      c.lineTo(14, 12);
      c.moveTo(-4, 6);
      c.lineTo(-16, 18);
      c.moveTo(2, -8);
      c.lineTo(-14, -12);
      c.moveTo(2, -8);
      c.lineTo(18, -4);
      c.stroke();
      c.fillRect(-28, 24, 56, 4);
      break;
    case 'confined':
      // A figure in a manhole.
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(0, 16, 22, 8, 0, 0, Math.PI * 2);
      c.stroke();
      figure(c, 0, -22, 0.75);
      break;
    case 'ear':
      // A head wearing ear defenders.
      head(c, -2, -6, 15);
      c.fillStyle = ground;
      c.lineWidth = 4;
      c.strokeStyle = ground;
      c.beginPath();
      c.arc(-2, -6, 19, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
      c.fillStyle = c.strokeStyle = ink;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(-2, -6, 19, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
      c.fillStyle = ground;
      c.beginPath();
      c.ellipse(-4, -2, 6, 9, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = ink;
      c.beginPath();
      c.ellipse(-4, -2, 4, 7, 0, 0, Math.PI * 2);
      c.fill();
      break;
    case 'eye':
      // A head wearing goggles.
      head(c, -2, -6, 15);
      c.fillStyle = ground;
      c.fillRect(-2, -12, 20, 9);
      c.fillStyle = ink;
      c.fillRect(0, -10, 16, 5);
      break;
    case 'gloves':
      // A gauntlet: fingers, thumb, cuff.
      c.fillRect(-14, -4, 26, 20);
      for (let i = 0; i < 4; i++) c.fillRect(-14 + i * 7, -26, 5, 24);
      c.save();
      c.translate(12, -2);
      c.rotate(-0.6);
      c.fillRect(0, -4, 14, 7);
      c.restore();
      c.fillRect(-16, 18, 30, 12);
      break;
    case 'face-shield':
      head(c, -6, -4, 15);
      c.fillStyle = ground;
      c.fillRect(10, -26, 6, 40);
      c.fillStyle = ink;
      c.fillRect(13, -28, 4, 42);
      c.fillRect(-10, -28, 27, 4);
      break;
    case 'apron':
      c.beginPath();
      c.moveTo(-10, -28);
      c.lineTo(10, -28);
      c.lineTo(12, -10);
      c.lineTo(20, -8);
      c.lineTo(18, 28);
      c.lineTo(-18, 28);
      c.lineTo(-20, -8);
      c.lineTo(-12, -10);
      c.closePath();
      c.fill();
      break;
    case 'boots':
      c.fillRect(-14, -26, 14, 40);
      c.fillRect(-14, 10, 30, 14);
      break;
    case 'mandatory':
      c.fillRect(-5, -26, 10, 32);
      c.beginPath();
      c.arc(0, 16, 6, 0, Math.PI * 2);
      c.fill();
      break;
    case 'door-shut':
      // A door in its frame, an arrow closing it.
      c.lineWidth = 4;
      c.strokeRect(-18, -26, 30, 52);
      c.fillRect(-14, -22, 22, 44);
      c.fillStyle = ground;
      c.beginPath();
      c.arc(4, 2, 2.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = ink;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(-18, 0, 30, -0.5, 0.5);
      c.stroke();
      break;
    case 'first-aid':
      c.fillRect(-8, -26, 16, 52);
      c.fillRect(-26, -8, 52, 16);
      break;
    case 'eyewash':
      head(c, -6, -14, 13);
      c.lineWidth = 3;
      for (const x of [-4, 8]) {
        c.beginPath();
        c.moveTo(x, 22);
        c.quadraticCurveTo(x - 4, 10, x, 2);
        c.stroke();
      }
      c.fillRect(-14, 22, 30, 6);
      break;
    case 'shower':
      c.fillRect(-14, -30, 28, 5);
      for (let i = 0; i < 5; i++) c.fillRect(-12 + i * 6, -22, 2, 6);
      figure(c, 0, -8, 0.7);
      break;
    case 'exit':
      // The running man leaving through a doorway.
      c.lineWidth = 4;
      c.strokeRect(10, -28, 20, 56);
      c.beginPath();
      c.arc(-6, -22, 6, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(-6, -14);
      c.lineTo(-10, 6);
      c.lineTo(2, 26);
      c.moveTo(-10, 6);
      c.lineTo(-22, 14);
      c.lineTo(-26, 26);
      c.moveTo(-6, -10);
      c.lineTo(6, -2);
      c.moveTo(-6, -10);
      c.lineTo(-18, -4);
      c.stroke();
      break;
    case 'call-point':
      // A hand pressing the alarm, its waves.
      c.fillRect(-20, -18, 28, 36);
      c.fillStyle = ground;
      c.fillRect(-14, -12, 16, 24);
      c.fillStyle = ink;
      c.fillRect(-8, -6, 4, 12);
      c.lineWidth = 3;
      for (const r of [6, 12]) {
        c.beginPath();
        c.arc(14, 0, r, -0.8, 0.8);
        c.stroke();
      }
      break;
    case 'extinguisher':
      c.fillRect(-10, -14, 20, 40);
      c.beginPath();
      c.arc(0, -14, 10, Math.PI, 0);
      c.fill();
      c.fillRect(-3, -30, 6, 10);
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(3, -26);
      c.quadraticCurveTo(22, -24, 18, -2);
      c.stroke();
      // Flames beside it.
      c.beginPath();
      c.moveTo(-26, 26);
      c.quadraticCurveTo(-34, 10, -22, -2);
      c.quadraticCurveTo(-20, 10, -16, 14);
      c.quadraticCurveTo(-14, 20, -18, 26);
      c.closePath();
      c.fill();
      break;
    case 'fire-equipment':
      c.beginPath();
      c.moveTo(0, -28);
      c.quadraticCurveTo(22, -6, 14, 18);
      c.quadraticCurveTo(10, 28, 0, 28);
      c.quadraticCurveTo(-10, 28, -14, 18);
      c.quadraticCurveTo(-20, 0, -6, -10);
      c.quadraticCurveTo(-4, -4, 0, -2);
      c.closePath();
      c.fill();
      break;
  }
}

/**
 * A pictogram of its category, `size` pixels across, its middle at
 * (x, y): its shape and colours, its symbol.
 */
export function drawPictogram(
  c: Ctx,
  p: Pictogram,
  x: number,
  y: number,
  size: number,
) {
  const C = SIGN_COLOURS;
  const k = size / 100;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  switch (CATEGORY[p]) {
    case 'prohibition':
      c.fillStyle = C.white;
      c.beginPath();
      c.arc(0, 0, 48, 0, Math.PI * 2);
      c.fill();
      drawSymbol(c, p, C.black, C.white);
      c.strokeStyle = C.red;
      c.lineWidth = 10;
      c.beginPath();
      c.arc(0, 0, 44, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(-31, -31);
      c.lineTo(31, 31);
      c.stroke();
      break;
    case 'warning':
      c.fillStyle = C.black;
      c.beginPath();
      c.moveTo(0, -48);
      c.lineTo(50, 40);
      c.lineTo(-50, 40);
      c.closePath();
      c.fill();
      c.fillStyle = C.yellow;
      c.beginPath();
      c.moveTo(0, -36);
      c.lineTo(40, 34);
      c.lineTo(-40, 34);
      c.closePath();
      c.fill();
      c.save();
      c.translate(0, 8);
      c.scale(0.62, 0.62);
      drawSymbol(c, p, C.black, C.yellow);
      c.restore();
      break;
    case 'mandatory':
      c.fillStyle = C.blue;
      c.beginPath();
      c.arc(0, 0, 48, 0, Math.PI * 2);
      c.fill();
      drawSymbol(c, p, C.white, C.blue);
      break;
    case 'safe':
      c.fillStyle = C.green;
      c.fillRect(-48, -48, 96, 96);
      drawSymbol(c, p, C.white, C.green);
      break;
    case 'fire':
      c.fillStyle = C.red;
      c.fillRect(-48, -48, 96, 96);
      drawSymbol(c, p, C.white, C.red);
      break;
  }
  c.restore();
}

/** Fit `text` within `width` at up to `size` pixels, bold, centred on (x, y). */
export function fitLine(
  c: Ctx,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  weight = 'bold',
) {
  let px = size;
  c.font = `${weight} ${px}px ${SANS}`;
  const w = c.measureText(text).width;
  if (w > width) px *= width / w;
  c.font = `${weight} ${px}px ${SANS}`;
  c.fillText(text, x, y);
}

/** The colours of a sign's text panel, by category. */
const PANEL: Record<SignCategory, { ground: string; ink: string }> = {
  prohibition: { ground: SIGN_COLOURS.red, ink: SIGN_COLOURS.white },
  warning: { ground: SIGN_COLOURS.yellow, ink: SIGN_COLOURS.black },
  mandatory: { ground: SIGN_COLOURS.blue, ink: SIGN_COLOURS.white },
  safe: { ground: SIGN_COLOURS.green, ink: SIGN_COLOURS.white },
  fire: { ground: SIGN_COLOURS.red, ink: SIGN_COLOURS.white },
};

/** A sign's layout: its symbol over its text (portrait), or beside it (landscape). */
export type SignLayout = 'portrait' | 'landscape';

/** Standard sign sizes, metres, as the sign makers sell them. */
export const SIGN_SIZES = {
  /** 200 × 300 mm, portrait. */
  portrait: { w: 0.2, h: 0.3 },
  /** 300 × 200 mm, landscape. */
  landscape: { w: 0.3, h: 0.2 },
  /** 150 × 200 mm, a small portrait one, for a door. */
  door: { w: 0.15, h: 0.2 },
  /** 100 × 100 mm, a symbol alone. */
  symbol: { w: 0.1, h: 0.1 },
} as const;

/**
 * A safety sign: its pictograms and its text, as a sign maker prints
 * them, `w` × `h` metres, facing +z. Its text panel takes its category's
 * colours (a warning's yellow, a mandatory sign's blue …); each line in
 * `lines` a line of it, the first the largest. A sign of several
 * pictograms (a PPE sign) shows them in a row.
 */
export function createSafetySign(
  kit: PanelKit,
  pictograms: readonly Pictogram[],
  lines: readonly string[],
  layout: SignLayout = 'portrait',
  w: number = SIGN_SIZES[layout].w,
  h: number = SIGN_SIZES[layout].h,
) {
  const t = plantTools(kit);
  const category = CATEGORY[pictograms[0]];
  const panel = PANEL[category];
  const sign = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = SIGN_COLOURS.white;
      c.fillRect(0, 0, cw, ch);
      if (layout === 'portrait') {
        // The symbols above, the text below on its panel.
        const top = lines.length ? ch * 0.62 : ch;
        const s = Math.min(top * 0.82, (cw * 0.9) / pictograms.length);
        pictograms.forEach((p, i) =>
          drawPictogram(
            c,
            p,
            cw / 2 + (i - (pictograms.length - 1) / 2) * s * 1.05,
            top / 2,
            s,
          ),
        );
        if (lines.length) {
          c.fillStyle = panel.ground;
          c.fillRect(0, top, cw, ch - top);
          textLines(c, lines, panel.ink, cw / 2, top, cw * 0.88, ch - top);
        }
      } else {
        // The symbols at the left, the text beside them on its panel.
        // The symbols in at most half its width, the text the rest.
        const s = Math.min(ch * 0.82, (cw * 0.5) / pictograms.length);
        const left = s * pictograms.length + ch * 0.12;
        pictograms.forEach((p, i) =>
          drawPictogram(c, p, ch * 0.06 + s * (i + 0.5), ch / 2, s),
        );
        if (lines.length) {
          c.fillStyle = panel.ground;
          c.fillRect(left, 0, cw - left, ch);
          textLines(
            c,
            lines,
            panel.ink,
            (left + cw) / 2,
            0,
            (cw - left) * 0.9,
            ch,
          );
        }
      }
    },
    512,
  );
  sign.mesh.name = `${lines.join(' ') || pictograms.join(' ')} sign`;
  return sign.mesh;
}

/** Lines of a sign's text, centred in a band from `top`, `height` tall. */
function textLines(
  c: Ctx,
  lines: readonly string[],
  ink: string,
  x: number,
  top: number,
  width: number,
  height: number,
) {
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const step = height / (lines.length + 0.4);
  lines.forEach((line, i) =>
    fitLine(
      c,
      line,
      x,
      top + step * (i + 0.7),
      width,
      step * (i === 0 ? 0.62 : 0.48),
      i === 0 ? 'bold' : '600',
    ),
  );
}
