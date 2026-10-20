import {
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from './eighties-controls';
import { createPs1Material } from '../parts/ps1-material';

/**
 * The labels a plant's own staff put on things over the years: marker
 * pen on duct tape, masking tape or electrical tape, torn off the roll and
 * stuck on a little crooked; a strip wrapped round a pipe with the flow's
 * direction drawn on it; embossed Dymo tape; and card tags on cable ties.
 * Each is drawn on a canvas, each a little different (its `seed`): the
 * tape's torn ends, its creases, the writing's slant and wobble.
 *
 * The writing is in Permanent Marker (Font Diner, Apache 2.0; see
 * CREDITS.md), loaded once; labels drawn before it arrives redraw when it
 * does. In metres, each facing +z unless said otherwise.
 */

const FONT = 'Permanent Marker';
const FALLBACK =
  '"Marker Felt", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

/** Labels waiting for the font, to redraw when it loads. */
const waiting = new Set<() => void>();
let fontReady = false;
if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
  const face = new FontFace(
    FONT,
    `url(${new URL('../assets/fonts/PermanentMarker-Regular.ttf', import.meta.url).href})`,
  );
  void face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      fontReady = true;
      for (const redraw of waiting) redraw();
      waiting.clear();
    })
    .catch(() => {});
}

/** The kinds of tape, their colour and how they take the light. */
export const TAPES = {
  duct: { colour: '#9da1a3', sheen: '#c7cacb', weave: true },
  masking: { colour: '#e2d3a6', sheen: '#efe3bf', weave: false },
  'electrical-red': { colour: '#b92b25', sheen: '#d4524a', weave: false },
  'electrical-yellow': { colour: '#e2c22a', sheen: '#f1da5c', weave: false },
  'electrical-blue': { colour: '#2c58b0', sheen: '#4f7bd0', weave: false },
  'electrical-black': { colour: '#1e1f20', sheen: '#3a3c3e', weave: false },
} as const;
export type TapeKind = keyof typeof TAPES;

/** The pens people wrote with. */
export const INKS = {
  black: '#16181a',
  red: '#b51d17',
  blue: '#1d3a8a',
  white: '#f2f2ee',
} as const;
export type InkKind = keyof typeof INKS;

/** A small seeded random number generator, so a label is the same each time. */
function random(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** A canvas texture, its material (alpha-cut, for torn edges) and the context. */
function canvasLabel(kit: PanelKit, w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No 2D canvas context.');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  kit.textures.push(texture);
  const material = createPs1Material({
    map: texture,
    transparent: true,
    alphaTest: 0.5,
    roughness: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: DoubleSide,
  });
  kit.materials.push(material);
  return { context, texture, material };
}

/** Draw a strip of `tape`, torn at both ends, filling the canvas. */
function drawTape(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  tape: TapeKind,
  rand: () => number,
  { tornEnds = true } = {},
) {
  const look = TAPES[tape];
  c.clearRect(0, 0, w, h);
  c.save();
  // The outline: straight long edges, ragged torn ends.
  c.beginPath();
  const tear = (x: number, dir: number) => {
    const points = 9;
    for (let i = 0; i <= points; i++) {
      const y = dir > 0 ? (i / points) * h : h - (i / points) * h;
      const jag = tornEnds ? (rand() - 0.5) * h * 0.18 : 0;
      c.lineTo(x + jag, y);
    }
  };
  c.moveTo(h * 0.1, 0);
  tear(h * 0.1, 1);
  c.lineTo(w - h * 0.1, h);
  tear(w - h * 0.1, -1);
  c.closePath();
  c.clip();
  c.fillStyle = look.colour;
  c.fillRect(0, 0, w, h);
  // The weave of duct tape, or the paper's grain.
  c.globalAlpha = look.weave ? 0.12 : 0.06;
  c.strokeStyle = '#000000';
  c.lineWidth = 1;
  for (let x = 0; x < w; x += look.weave ? 4 : 7) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + (rand() - 0.5) * 3, h);
    c.stroke();
  }
  // Creases where it was smoothed down unevenly, catching the light.
  for (let k = 0; k < 4; k++) {
    const x = rand() * w;
    c.globalAlpha = 0.25;
    c.strokeStyle = look.sheen;
    c.lineWidth = 2 + rand() * 3;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + (rand() - 0.5) * h * 0.8, h);
    c.stroke();
  }
  // A darker band of grime along one edge.
  c.globalAlpha = 0.12;
  c.fillStyle = '#000000';
  c.fillRect(0, h * 0.86, w, h * 0.14);
  c.restore();
}

/**
 * Write `text` by hand across (x, y), `size` pixels, each letter a
 * little off its line and its neighbours' angle.
 */
function handwrite(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  ink: InkKind,
  rand: () => number,
  maxWidth: number,
) {
  c.save();
  c.fillStyle = INKS[ink];
  c.textBaseline = 'middle';
  c.font = `${size}px "${FONT}", ${FALLBACK}`;
  const full = c.measureText(text).width;
  const squeeze = full > maxWidth ? maxWidth / full : 1;
  let at = x - (full * squeeze) / 2;
  const slope = (rand() - 0.5) * 0.06;
  for (const char of text) {
    const width = c.measureText(char).width * squeeze;
    c.save();
    c.translate(
      at + width / 2,
      y + (at - x) * slope + (rand() - 0.5) * size * 0.08,
    );
    c.rotate((rand() - 0.5) * 0.12);
    c.scale(squeeze * (0.94 + rand() * 0.1), 0.94 + rand() * 0.1);
    c.textAlign = 'center';
    c.fillText(char, 0, 0);
    c.restore();
    at += width;
  }
  c.restore();
}

export interface TapeLabelOptions {
  tape?: TapeKind;
  ink?: InkKind;
  /** Its width and height, metres (tape is usually 48 mm or 19 mm wide). */
  width?: number;
  height?: number;
  /** Which version of it: its tears, creases, slant and how crooked. */
  seed?: number;
}

/**
 * A strip of tape stuck on a flat face with something written on it in
 * marker: "P2 — DO NOT RUN DRY". Lines are split at '\n'. Crooked by up
 * to a few degrees.
 */
export function createTapeLabel(
  kit: PanelKit,
  text: string,
  {
    tape = 'duct',
    ink = 'black',
    width = 0.22,
    height = 0.048,
    seed = 1,
  }: TapeLabelOptions = {},
) {
  const px = 640;
  const ph = Math.max(48, Math.round((px * height) / width));
  const { context, texture, material } = canvasLabel(kit, px, ph);
  const lines = text.split('\n');
  const draw = () => {
    const rand = random(seed);
    drawTape(context, px, ph, tape, rand);
    const size = (ph / lines.length) * 0.7;
    lines.forEach((line, i) =>
      handwrite(
        context,
        line,
        px / 2,
        (ph / lines.length) * (i + 0.5),
        size,
        tape === 'electrical-black' || tape === 'electrical-blue'
          ? 'white'
          : ink,
        rand,
        px * 0.82,
      ),
    );
    texture.needsUpdate = true;
  };
  draw();
  if (!fontReady) waiting.add(draw);
  const mesh = new Mesh(new PlaneGeometry(width, height), material);
  mesh.name = `Tape label: ${text}`;
  mesh.rotation.z = (random(seed + 7)() - 0.5) * 0.12;
  mesh.raycast = () => {};
  return mesh;
}

export interface PipeTapeOptions {
  /** The pipe's outside radius, metres. */
  radius: number;
  /** Which way the flow goes along the pipe's +y axis: 1 or −1. */
  direction?: 1 | -1;
  tape?: TapeKind;
  ink?: InkKind;
  /** The tape's width along the pipe, metres. */
  width?: number;
  seed?: number;
}

/**
 * A strip of tape wrapped round a pipe with the flow drawn on it by hand:
 * an arrow along the pipe and the service written beside it ("POOL
 * RETURN"), twice round, so it reads from either side. Its axis is y, as
 * a cylinder's; turn it to lie along the pipe.
 */
export function createPipeTape(
  kit: PanelKit,
  text: string,
  {
    radius,
    direction = 1,
    tape = 'duct',
    ink = 'black',
    width = 0.3,
    seed = 3,
  }: PipeTapeOptions,
) {
  const around = 2 * Math.PI * (radius + 0.002);
  const px = 1024;
  const ph = Math.max(64, Math.round((px * width) / around));
  // The canvas runs round the pipe (u) and along it (v).
  const { context, texture, material } = canvasLabel(kit, px, ph);
  const draw = () => {
    const rand = random(seed);
    const c = context;
    c.clearRect(0, 0, px, ph);
    drawTape(c, px, ph, tape, rand, { tornEnds: false });
    // Twice round, so it reads from either side: the service's name and
    // an arrow, both written along the pipe (down the canvas is along the
    // pipe's −y, so they are turned a quarter).
    for (const half of [0, 0.5]) {
      c.save();
      c.translate(px * (half + 0.25), ph / 2);
      c.rotate(direction > 0 ? -Math.PI / 2 : Math.PI / 2);
      const run = ph * 0.9;
      const tall = Math.min(px * 0.12, ph * 0.16);
      const wobble = () => (rand() - 0.5) * tall * 0.15;
      handwrite(c, text, -run * 0.12, 0, tall, ink, rand, run * 0.62);
      // The arrow after the name, pointing the way the water goes.
      c.strokeStyle = INKS[ink];
      c.lineWidth = Math.max(4, tall * 0.14);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      const from = run * 0.24,
        to = run * 0.46;
      c.beginPath();
      c.moveTo(from, wobble());
      c.lineTo(to, wobble());
      c.stroke();
      c.beginPath();
      c.moveTo(to - tall * 0.45, -tall * 0.4);
      c.lineTo(to, 0);
      c.lineTo(to - tall * 0.45, tall * 0.4);
      c.stroke();
      c.restore();
    }
    texture.needsUpdate = true;
  };
  draw();
  if (!fontReady) waiting.add(draw);
  const mesh = new Mesh(
    new CylinderGeometry(radius + 0.002, radius + 0.002, width, 48, 1, true),
    material,
  );
  mesh.name = `Pipe tape: ${text}`;
  mesh.raycast = () => {};
  return mesh;
}

/** Dymo tape colours, as the period's embossing tapes came. */
export const DYMO = {
  red: '#c0251f',
  black: '#1c1d1e',
  blue: '#244ea6',
  green: '#25744a',
} as const;

/**
 * An embossed Dymo label: raised white capitals on glossy plastic tape,
 * 9 mm high, its ends cut square with the punched start mark.
 */
export function createDymoLabel(
  kit: PanelKit,
  text: string,
  { colour = 'black' as keyof typeof DYMO, seed = 5 } = {},
) {
  const height = 0.009;
  const px = 512;
  const width = Math.max(0.03, text.length * 0.0062 + 0.012);
  const ph = Math.round((px * height) / width);
  const { context, texture, material } = canvasLabel(kit, px, Math.max(24, ph));
  const c = context;
  const h = c.canvas.height;
  const rand = random(seed);
  c.fillStyle = DYMO[colour];
  c.fillRect(0, 0, px, h);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(0, 0, px, h * 0.25);
  c.font = `bold ${h * 0.62}px "Arial Narrow", Arial, sans-serif`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  // Embossed: each letter stretched white plastic, a little uneven.
  let x = px * 0.04;
  const step = (px * 0.92) / Math.max(1, text.length);
  for (const char of text.toUpperCase()) {
    const y = h / 2 + (rand() - 0.5) * h * 0.06;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillText(char, x + 1.5, y + 1.5, step);
    c.fillStyle = '#f4f4f0';
    c.fillText(char, x, y, step);
    x += step;
  }
  texture.needsUpdate = true;
  if ('roughness' in material) material.roughness = 0.35;
  const mesh = new Mesh(new PlaneGeometry(width, height), material);
  mesh.name = `Dymo label: ${text}`;
  mesh.rotation.z = (rand() - 0.5) * 0.03;
  mesh.raycast = () => {};
  return mesh;
}

/**
 * A card tag, 120 × 60 mm, hung on a cable tie, written on in marker
 * ("OUT OF SERVICE / DO NOT USE / 14/10"), swinging a little crooked from
 * its tie at the origin.
 */
export function createTieTag(
  kit: PanelKit,
  text: string,
  { card = '#f0d98a', ink = 'red' as InkKind, seed = 9 } = {},
) {
  const group = new Group();
  const w = 0.12,
    h = 0.06;
  const px = 512,
    ph = 256;
  const { context, texture, material } = canvasLabel(kit, px, ph);
  const lines = text.split('\n');
  const draw = () => {
    const rand = random(seed);
    const c = context;
    c.clearRect(0, 0, px, ph);
    // The card, its punched end and reinforcing ring.
    c.fillStyle = card;
    c.beginPath();
    c.moveTo(ph * 0.25, 0);
    c.lineTo(px, 0);
    c.lineTo(px, ph);
    c.lineTo(ph * 0.25, ph);
    c.lineTo(0, ph * 0.75);
    c.lineTo(0, ph * 0.25);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(ph * 0.22, ph / 2, ph * 0.07, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#c9b46a';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(ph * 0.22, ph / 2, ph * 0.11, 0, Math.PI * 2);
    c.stroke();
    const size = (ph / lines.length) * 0.62;
    lines.forEach((line, i) =>
      handwrite(
        c,
        line,
        px * 0.6,
        (ph / lines.length) * (i + 0.5),
        size,
        ink,
        rand,
        px * 0.66,
      ),
    );
    texture.needsUpdate = true;
  };
  draw();
  if (!fontReady) waiting.add(draw);
  const tag = new Mesh(new PlaneGeometry(w, h), material);
  tag.name = `Tie tag: ${text}`;
  tag.raycast = () => {};
  // Hung from its hole: the hole at the origin, the card below and aside.
  tag.position.set(w / 2 - h * 0.22, -0.02, 0);
  const swing = new Group();
  swing.rotation.z = -1.2 + (random(seed + 3)() - 0.5) * 0.3;
  swing.add(tag);
  group.add(swing);
  // The cable tie, a small black loop.
  const tie = new Mesh(
    new CylinderGeometry(0.012, 0.012, 0.004, 16, 1, true),
    createPs1Material({ color: '#1b1c1d', side: DoubleSide }),
  );
  kit.materials.push(tie.material as ReturnType<typeof createPs1Material>);
  tie.rotation.x = Math.PI / 2;
  group.add(tie);
  return group;
}
