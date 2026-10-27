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
import { brandById } from '../logic/brands';
import type { BrandId } from '../logic/brands';
import { drawBrandMark, wordmarkFont } from './brand-logo';
import { letteringScale } from './lettering-resolution';

/**
 * The plant's other markings, besides the hand-made ones
 * (`hand-labels.ts`): engraved laminate equipment plates (Traffolyte),
 * stamped brass valve tags on their chains, a printed notice laminated
 * and stuck up with Blu Tack, its corner lifting, and a sheet of A4
 * written on in marker and taped to a door. In metres, facing +z.
 */

const HAND = '"Permanent Marker", "Marker Felt", "Segoe Print", cursive';

function canvas(kit: PanelKit, w: number, h: number, alpha = false) {
  const element = document.createElement('canvas');
  element.width = w;
  element.height = h;
  const c = element.getContext('2d');
  if (!c) throw new Error('No 2D canvas context.');
  const texture = new CanvasTexture(element);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  kit.textures.push(texture);
  const material = createPs1Material({
    map: texture,
    transparent: alpha,
    alphaTest: alpha ? 0.5 : 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: DoubleSide,
  });
  kit.materials.push(material);
  return { c, texture, material };
}

/** Engraved laminate's colours: face and core (the engraving shows the core). */
export const LAMINATES = {
  black: ['#151617', '#f2f2ee'],
  white: ['#f1f1ec', '#151617'],
  red: ['#b2221c', '#f6f2ea'],
  yellow: ['#e8c11e', '#151617'],
  blue: ['#21479b', '#f2f2ee'],
  green: ['#226b3c', '#f2f2ee'],
} as const;

/**
 * An engraved laminate plate, 3 mm thick, screwed on at its corners: its
 * lines cut through the face colour to the core ("P-101 / MAIN POOL
 * CIRCULATION PUMP / DUTY"), the first line larger.
 */
export function createEngravedPlate(
  kit: PanelKit,
  lines: readonly string[],
  {
    colour = 'black' as keyof typeof LAMINATES,
    width = 0.2,
    height = 0.06,
  } = {},
) {
  const [face, core] = LAMINATES[colour];
  const px = 640 * letteringScale();
  const ph = Math.round((px * height) / width);
  const { c, texture, material } = canvas(kit, px, ph);
  c.fillStyle = face;
  c.fillRect(0, 0, px, ph);
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fillRect(0, 0, px, ph * 0.3);
  // The four screws.
  for (const [x, y] of [
    [0.04, 0.2],
    [0.96, 0.2],
    [0.04, 0.8],
    [0.96, 0.8],
  ]) {
    c.fillStyle = '#9ea2a3';
    c.beginPath();
    c.arc(x * px, y * ph, ph * 0.06, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#555';
    c.lineWidth = 2 * letteringScale();
    c.beginPath();
    c.moveTo(x * px - ph * 0.04, y * ph);
    c.lineTo(x * px + ph * 0.04, y * ph);
    c.stroke();
  }
  c.fillStyle = core;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const rows = lines.length;
  lines.forEach((line, i) => {
    const size = (ph / (rows + 0.6)) * (i === 0 ? 0.78 : 0.6);
    c.font = `${i === 0 ? 'bold ' : ''}${size}px "Arial Narrow", Arial, sans-serif`;
    c.fillText(line, px / 2, (ph / rows) * (i + 0.5), px * 0.86);
  });
  texture.needsUpdate = true;
  const group = new Group();
  const plate = new Mesh(new PlaneGeometry(width, height), material);
  plate.position.z = 0.0032;
  group.add(plate);
  const edge = createPs1Material({ color: core });
  kit.materials.push(edge);
  const side = new Mesh(new PlaneGeometry(width, height), edge);
  side.position.z = 0.0001;
  side.scale.setScalar(1.004);
  group.add(side);
  group.name = `Engraved plate: ${lines.join(' ')}`;
  return group;
}

/**
 * A stamped brass valve tag, 38 mm across, on a short chain from the
 * valve's spindle at the origin, hanging below it.
 */
export function createValveTag(kit: PanelKit, text: string) {
  const group = new Group();
  const px = 128;
  const { c, texture, material } = canvas(kit, px, px, true);
  c.clearRect(0, 0, px, px);
  const g = c.createRadialGradient(
    px * 0.4,
    px * 0.35,
    px * 0.05,
    px / 2,
    px / 2,
    px / 2,
  );
  g.addColorStop(0, '#e9c97a');
  g.addColorStop(1, '#a8823a');
  c.fillStyle = g;
  c.beginPath();
  c.arc(px / 2, px / 2, px * 0.48, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath();
  c.arc(px / 2, px * 0.12, px * 0.05, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#5a4416';
  c.font = `bold ${px * 0.26}px "Courier New", monospace`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, px / 2, px * 0.56);
  texture.needsUpdate = true;
  const disc = new Mesh(new PlaneGeometry(0.038, 0.038), material);
  disc.position.y = -0.06;
  group.add(disc);
  const chain = createPs1Material({
    color: '#b9babb',
    metalness: 0.8,
    roughness: 0.4,
  });
  kit.materials.push(chain);
  for (let i = 0; i < 6; i++) {
    const link = new Mesh(new CylinderGeometry(0.002, 0.002, 0.008, 6), chain);
    link.position.set(0, -0.004 - i * 0.007, 0);
    group.add(link);
  }
  group.name = `Valve tag: ${text}`;
  return group;
}

/**
 * A printed A4 notice in a laminating pouch, stuck up with a blob of Blu
 * Tack at each corner, one corner lifting away from the wall.
 */
export function createLaminatedNotice(
  kit: PanelKit,
  title: string,
  lines: readonly string[],
  { accent = '#c4231c' } = {},
) {
  const w = 0.21,
    h = 0.297;
  const px = 420,
    ph = 594;
  const { c, texture, material } = canvas(kit, px, ph);
  c.fillStyle = '#fbfbf7';
  c.fillRect(0, 0, px, ph);
  c.fillStyle = accent;
  c.fillRect(0, 0, px, ph * 0.14);
  c.fillStyle = '#ffffff';
  c.font = `bold ${ph * 0.065}px Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(title, px / 2, ph * 0.07, px * 0.9);
  c.fillStyle = '#1d1f20';
  c.font = `${ph * 0.034}px Arial, sans-serif`;
  c.textAlign = 'left';
  lines.forEach((line, i) =>
    c.fillText(line, px * 0.07, ph * (0.22 + i * 0.055), px * 0.86),
  );
  // The laminate's clear border, and a glare across it.
  c.strokeStyle = 'rgba(200,210,215,0.9)';
  c.lineWidth = 10;
  c.strokeRect(0, 0, px, ph);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.beginPath();
  c.moveTo(px * 0.6, 0);
  c.lineTo(px, 0);
  c.lineTo(px * 0.4, ph);
  c.lineTo(0, ph);
  c.closePath();
  c.fill();
  texture.needsUpdate = true;
  // The sheet, its top right corner curling off the wall.
  const geometry = new PlaneGeometry(w, h, 8, 10);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) / (w / 2),
      y = position.getY(i) / (h / 2);
    const lift = Math.max(0, x * 0.5 + y * 0.5 - 0.55);
    position.setZ(i, 0.002 + lift * lift * 0.06);
  }
  geometry.computeVertexNormals();
  const group = new Group();
  group.add(new Mesh(geometry, material));
  const tack = createPs1Material({ color: '#3d78c4', roughness: 0.9 });
  kit.materials.push(tack);
  for (const [x, y] of [
    [-0.09, 0.135],
    [-0.09, -0.135],
    [0.09, -0.135],
  ]) {
    const blob = new Mesh(new CylinderGeometry(0.006, 0.007, 0.004, 8), tack);
    blob.rotation.x = Math.PI / 2;
    blob.position.set(x, y, 0.004);
    group.add(blob);
  }
  group.name = `Laminated notice: ${title}`;
  return group;
}

/**
 * A sheet of A4 written on in marker and taped up by its top corners with
 * masking tape: "OUT OF ORDER / USE OTHER SHOWER / — Mgmt".
 */
export function createHandwrittenSheet(
  kit: PanelKit,
  lines: readonly string[],
  { ink = '#16181a', seed = 11 } = {},
) {
  const w = 0.297,
    h = 0.21;
  const px = 594,
    ph = 420;
  const { c, texture, material } = canvas(kit, px, ph);
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const draw = () => {
    c.fillStyle = '#f8f7f1';
    c.fillRect(0, 0, px, ph);
    c.fillStyle = ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const size = ph * (i === 0 ? 0.2 : 0.12);
      c.save();
      c.translate(px / 2 + (rand() - 0.5) * 20, ph * (0.25 + i * 0.25));
      c.rotate((rand() - 0.5) * 0.08);
      c.font = `${size}px ${HAND}`;
      c.fillText(line, 0, 0, px * 0.9);
      c.restore();
    });
    // Underlined, twice, for emphasis.
    c.strokeStyle = ink;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(px * 0.18, ph * 0.38);
    c.lineTo(px * 0.82, ph * 0.36);
    c.stroke();
    texture.needsUpdate = true;
  };
  draw();
  // Redraw once the marker font has loaded, if it has not yet.
  if (typeof document !== 'undefined')
    void document.fonts?.ready.then(() => {
      s = seed;
      draw();
    });
  const group = new Group();
  const sheet = new Mesh(new PlaneGeometry(w, h), material);
  sheet.position.z = 0.001;
  sheet.rotation.z = (rand() - 0.5) * 0.06;
  group.add(sheet);
  const tape = createPs1Material({ color: '#e2d3a6', roughness: 0.8 });
  kit.materials.push(tape);
  for (const x of [-0.13, 0.13]) {
    const strip = new Mesh(new PlaneGeometry(0.06, 0.02), tape);
    strip.position.set(x, 0.1, 0.002);
    strip.rotation.z = x > 0 ? -0.6 : 0.6;
    group.add(strip);
  }
  group.name = `Handwritten sheet: ${lines.join(' ')}`;
  return group;
}

/**
 * The most formal plate of all: engraved brass, its edges bevelled and
 * polished, the maker's mark and name engraved at its head over the
 * equipment's name and number, held by four domed brass screws. Fitted by
 * the installer, polished by nobody since.
 */
export function createBrassPlate(
  kit: PanelKit,
  maker: BrandId,
  lines: readonly string[],
  { width = 0.18, height = 0.09 } = {},
) {
  const brand = brandById(maker);
  const px = 720;
  const ph = Math.round((px * height) / width);
  const { c, texture, material } = canvas(kit, px, ph);
  // Brushed brass: a warm gradient, fine horizontal brushing, a bevel.
  const g = c.createLinearGradient(0, 0, px, ph);
  g.addColorStop(0, '#d8b45e');
  g.addColorStop(0.5, '#b8913f');
  g.addColorStop(1, '#8f6c2a');
  c.fillStyle = g;
  c.fillRect(0, 0, px, ph);
  c.globalAlpha = 0.08;
  for (let y = 0; y < ph; y += 2) {
    c.fillStyle = y % 4 ? '#ffffff' : '#000000';
    c.fillRect(0, y, px, 1);
  }
  c.globalAlpha = 1;
  c.strokeStyle = '#f0d892';
  c.lineWidth = 6;
  c.strokeRect(5, 5, px - 10, ph - 10);
  c.strokeStyle = '#6b4f1c';
  c.lineWidth = 2;
  c.strokeRect(14, 14, px - 28, ph - 28);
  // The maker's mark, engraved: drawn in the brand's own shapes, then
  // toned to the dark of a filled engraving.
  const markR = ph * 0.2;
  c.save();
  drawBrandMark(c, brand, px * 0.13, ph * 0.33, markR);
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = 'rgba(58, 40, 12, 0.72)';
  c.fillRect(
    px * 0.13 - markR * 1.1,
    ph * 0.33 - markR * 1.1,
    markR * 2.2,
    markR * 2.2,
  );
  c.restore();
  c.fillStyle = '#3a280c';
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.font = wordmarkFont(brand, ph * 0.17);
  c.fillText(brand.wordmark ?? brand.name, px * 0.25, ph * 0.33, px * 0.68);
  c.textAlign = 'center';
  lines.forEach((line, i) => {
    c.font = `${i === 0 ? 'bold ' : ''}${ph * (i === 0 ? 0.13 : 0.1)}px Georgia, "Times New Roman", serif`;
    c.fillText(line, px / 2, ph * (0.62 + i * 0.15), px * 0.86);
  });
  texture.needsUpdate = true;
  const group = new Group();
  const plate = new Mesh(new PlaneGeometry(width, height), material);
  plate.position.z = 0.003;
  group.add(plate);
  const screw = createPs1Material({
    color: '#c9a24f',
    metalness: 0.9,
    roughness: 0.3,
  });
  kit.materials.push(screw);
  for (const [x, y] of [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ]) {
    const head = new Mesh(
      new CylinderGeometry(0.004, 0.0045, 0.003, 12),
      screw,
    );
    head.rotation.x = Math.PI / 2;
    head.position.set(
      x * (width / 2 - 0.009),
      y * (height / 2 - 0.009),
      0.0045,
    );
    group.add(head);
  }
  if ('metalness' in material) {
    material.metalness = 0.75;
    material.roughness = 0.35;
  }
  group.name = `Brass plate: ${brand.name} ${lines.join(' ')}`;
  return group;
}

/**
 * Spray-painted stencil lettering, as maintenance crews mark tanks, walls
 * and floors: bold capitals broken by the stencil's bridges, a soft
 * overspray halo round each letter, the odd run where too much paint went
 * on. `height` is the letters' height, metres; the paint lies flat on a
 * surface facing +z.
 */
export function createStencilText(
  kit: PanelKit,
  text: string,
  { height = 0.12, colour = '#1d1e1f', seed = 13, drips = true } = {},
) {
  const lines = text.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const width = height * 0.72 * longest + height * 0.4;
  const totalHeight = height * (lines.length * 1.35 + 0.3);
  const px = Math.min(2048, Math.max(256, Math.round(longest * 90)));
  const ph = Math.round((px * totalHeight) / width);
  const { c, texture, material } = canvas(kit, px, ph, true);
  let s = seed;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const row = ph / (lines.length * 1.35 + 0.3);
  const size = row * 1.0;
  c.clearRect(0, 0, px, ph);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 ${size}px Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  const letters: { char: string; x: number; y: number; w: number }[] = [];
  lines.forEach((line, i) => {
    const y = row * (0.65 + i * 1.35) + row * 0.5;
    const step = (px - row * 0.4) / Math.max(1, longest);
    const start = px / 2 - (step * line.length) / 2 + step / 2;
    [...line].forEach((char, k) =>
      letters.push({ char, x: start + k * step, y, w: step }),
    );
  });
  // The overspray: the letters blurred and faint round the stencil.
  c.save();
  c.filter = `blur(${size * 0.06}px)`;
  c.globalAlpha = 0.35;
  c.fillStyle = colour;
  for (const l of letters) c.fillText(l.char, l.x, l.y, l.w * 0.95);
  c.restore();
  // The letters, sharp, with a slight unevenness of coverage.
  c.fillStyle = colour;
  for (const l of letters) {
    c.globalAlpha = 0.85 + rand() * 0.15;
    c.fillText(l.char, l.x, l.y, l.w * 0.95);
  }
  c.globalAlpha = 1;
  // The stencil's bridges: thin gaps across each letter where the card
  // held its middle in place.
  c.globalCompositeOperation = 'destination-out';
  for (const l of letters) {
    if (l.char === ' ') continue;
    const gap = size * 0.07;
    if ('OQDBPRAG0689'.includes(l.char)) {
      c.fillRect(l.x - gap / 2, l.y - size * 0.6, gap, size * 0.35);
      c.fillRect(l.x - gap / 2, l.y + size * 0.15, gap, size * 0.35);
    } else if ('EFHKMNWXZ'.includes(l.char)) {
      c.fillRect(l.x - gap / 2, l.y - gap / 2 - size * 0.02, l.w * 0.2, gap);
    }
  }
  c.globalCompositeOperation = 'source-over';
  // Runs of paint below a letter or two.
  if (drips)
    for (const l of letters) {
      if (l.char === ' ' || rand() > 0.25) continue;
      const x = l.x + (rand() - 0.5) * l.w * 0.4;
      const length = size * (0.2 + rand() * 0.5);
      const g = c.createLinearGradient(
        0,
        l.y + size * 0.35,
        0,
        l.y + size * 0.35 + length,
      );
      g.addColorStop(0, colour);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x, l.y + size * 0.3, size * 0.035, length);
    }
  texture.needsUpdate = true;
  if ('roughness' in material) material.roughness = 0.9;
  const mesh = new Mesh(new PlaneGeometry(width, totalHeight), material);
  mesh.name = `Stencil: ${text}`;
  mesh.raycast = () => {};
  return mesh;
}
