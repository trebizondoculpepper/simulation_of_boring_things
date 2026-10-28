import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  BackSide,
} from 'three';
import type { Material, Texture } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { markComponent } from '../../components/core/views/component-identity';
import { createServiceCeiling } from '../../components/site-dressing/views/service-ceiling';
import { BEAM_DEPTH } from '../../components/site-dressing/views/service-ceiling';
import {
  ARCH_CROWN,
  BENCH,
  COLUMN_FOOT,
  HALL_BRIEFS,
  MUSEUM_ARCH,
  MUSEUM_HALLS,
  MUSEUM_SIZES,
  MUSEUM_WALL,
  PANEL,
  comingSoonPanel,
  hallArches,
  hallBenches,
  hallColumns,
  hallOrigin,
  sharedWallWidth,
} from '../logic/museum-plan';
import type { MuseumHallId } from '../logic/museum-plan';
import { MUSEUM_EXHIBITION as BRAND } from '../logic/museum-brand';

/**
 * A hall of the pool science museum (mission 107): a bay of a converted
 * dye works, its walls of old brick painted white, a polished concrete
 * floor with its saw-cut joints, cast-iron columns under two steel beams,
 * the services ceiling high overhead (set decoration), tall factory
 * windows of obscured glass on the west, archways knocked through the end
 * walls into the next bays, gallery track lights, benches, and the
 * exhibition's signs. No exhibits yet: each hall has a "coming soon"
 * panel. Set decoration throughout. Built in metres.
 *
 * Both halls at an archway draw its wall alike: the same geometry, from
 * the wider hall's width, its brick and the floor's joints laid from the
 * museum's own origin, so the hand-over between their scenes changes
 * nothing on screen (the pool loop's lesson, `8656cf1`).
 */

const FLOOR_TILE = 4;
/** The brick texture's repeat: three bricks along, eight courses up. */
const BRICK = { w: 0.69, h: 0.6 };

function canvasTexture(
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** A seeded random number source, so every hall's textures are alike. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Old brick, three along and eight courses up, painted white or bare. */
function brickTexture(painted: boolean) {
  const W = 512;
  const H = 448;
  const t = canvasTexture(W, H, (c) => {
    const rand = seeded(painted ? 7 : 11);
    c.fillStyle = painted ? '#e4e1da' : '#8e8478';
    c.fillRect(0, 0, W, H);
    const course = H / 8;
    const brick = W / 3;
    for (let row = 0; row < 8; row++) {
      const shift = row % 2 ? brick / 2 : 0;
      for (let k = -1; k < 4; k++) {
        const x = k * brick + shift;
        const tone = rand();
        c.fillStyle = painted
          ? `hsl(40, 12%, ${92 + tone * 5}%)`
          : `hsl(${12 + tone * 14}, ${38 + tone * 14}%, ${30 + tone * 14}%)`;
        c.fillRect(x + 3, row * course + 3, brick - 6, course - 6);
        // A little wear on each face.
        for (let s = 0; s < 6; s++) {
          c.fillStyle = painted
            ? `rgba(120, 110, 95, ${0.04 + rand() * 0.05})`
            : `rgba(20, 10, 5, ${0.08 + rand() * 0.1})`;
          c.fillRect(
            x + 3 + rand() * (brick - 14),
            row * course + 3 + rand() * (course - 10),
            4 + rand() * 10,
            2 + rand() * 4,
          );
        }
      }
    }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / BRICK.w, 1 / BRICK.h);
  return t;
}

/** Polished concrete, a 4 m bay: a soft cloud, faint trowel arcs, and saw cuts at its edges. */
function concreteTexture() {
  const S = 1024;
  const t = canvasTexture(S, S, (c) => {
    const rand = seeded(23);
    c.fillStyle = '#b5b1aa';
    c.fillRect(0, 0, S, S);
    for (let k = 0; k < 140; k++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 40 + rand() * 160;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const light = rand() > 0.5;
      g.addColorStop(
        0,
        light ? 'rgba(236,233,226,0.10)' : 'rgba(90,86,80,0.09)',
      );
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    // The power float's trowel arcs, very faint.
    c.lineWidth = 2;
    for (let k = 0; k < 90; k++) {
      c.strokeStyle = `rgba(${rand() > 0.5 ? '245,243,238' : '80,76,70'}, 0.05)`;
      const x = rand() * S;
      const y = rand() * S;
      const r = 60 + rand() * 120;
      const a = rand() * Math.PI * 2;
      c.beginPath();
      c.arc(x, y, r, a, a + 0.6 + rand() * 0.8);
      c.stroke();
    }
    // Aggregate specks.
    for (let k = 0; k < 2600; k++) {
      c.fillStyle = `rgba(${rand() > 0.5 ? '70,66,60' : '220,216,208'}, ${0.15 + rand() * 0.2})`;
      c.fillRect(rand() * S, rand() * S, 1 + rand() * 2, 1 + rand() * 2);
    }
    // The saw cuts, on the bay's edges (half each side, so they meet when repeated).
    c.fillStyle = 'rgba(60, 56, 52, 0.75)';
    c.fillRect(0, 0, S, 2);
    c.fillRect(0, S - 2, S, 2);
    c.fillRect(0, 0, 2, S);
    c.fillRect(S - 2, 0, 2, S);
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** The hall's finishes, shared by all its meshes. */
export interface MuseumMaterials {
  paint: MeshStandardMaterial;
  rawBrick: MeshStandardMaterial;
  floor: MeshStandardMaterial;
  iron: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  oak: MeshStandardMaterial;
  plaster: MeshStandardMaterial;
  lamp: MeshStandardMaterial;
  textures: Texture[];
}

export function createMuseumMaterials(): MuseumMaterials {
  const painted = brickTexture(true);
  const bare = brickTexture(false);
  const concrete = concreteTexture();
  return {
    paint: new MeshStandardMaterial({ map: painted, roughness: 0.9 }),
    rawBrick: new MeshStandardMaterial({ map: bare, roughness: 0.95 }),
    floor: new MeshStandardMaterial({
      map: concrete,
      roughness: 0.32,
      metalness: 0,
    }),
    iron: new MeshStandardMaterial({
      color: '#33403c',
      roughness: 0.55,
      metalness: 0.4,
    }),
    steel: new MeshStandardMaterial({
      color: '#23272a',
      roughness: 0.5,
      metalness: 0.5,
    }),
    glass: new MeshStandardMaterial({
      color: '#dfe7ea',
      emissive: '#e8eff2',
      emissiveIntensity: 0.85,
      roughness: 0.6,
    }),
    oak: new MeshStandardMaterial({ color: '#a77b4f', roughness: 0.6 }),
    plaster: new MeshStandardMaterial({
      color: '#f4f2ec',
      roughness: 0.92,
      side: BackSide,
    }),
    lamp: new MeshStandardMaterial({
      color: '#fff6e0',
      emissive: '#fff1d2',
      emissiveIntensity: 2.2,
    }),
    textures: [painted, bare, concrete],
  };
}

/**
 * A brick wall, `width` along x and `height` up, `MUSEUM_WALL` thick about
 * z = 0, centred on x = 0, with an archway knocked through its middle if
 * `arch`, and `windows` (each its middle along x, its width, sill and head).
 * Its faces painted, the reveals of its openings bare brick.
 */
function brickWall(
  m: MuseumMaterials,
  width: number,
  height: number,
  arch: boolean,
  windows: readonly { x: number; w: number; sill: number; head: number }[] = [],
) {
  const hw = width / 2;
  const a = MUSEUM_ARCH.w / 2;
  const shape = new Shape();
  shape.moveTo(-hw, 0);
  if (arch) {
    shape.lineTo(-a, 0);
    shape.lineTo(-a, MUSEUM_ARCH.spring);
    shape.absarc(0, MUSEUM_ARCH.spring, a, Math.PI, 0, true);
    shape.lineTo(a, 0);
  }
  shape.lineTo(hw, 0);
  shape.lineTo(hw, height);
  shape.lineTo(-hw, height);
  shape.closePath();
  for (const w of windows) {
    const hole = new Shape();
    const r = w.w / 2;
    // A segmental head, as a mill's windows have.
    hole.moveTo(w.x - r, w.sill);
    hole.lineTo(w.x + r, w.sill);
    hole.lineTo(w.x + r, w.head);
    hole.quadraticCurveTo(w.x, w.head + 0.35, w.x - r, w.head);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth: MUSEUM_WALL,
    bevelEnabled: false,
    curveSegments: 28,
  });
  geometry.translate(0, 0, -MUSEUM_WALL / 2);
  return new Mesh(geometry, [m.paint, m.rawBrick]);
}

/** A sign's face, painted on a canvas `px` pixels a metre. */
function signMesh(
  widthM: number,
  heightM: number,
  draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
  textures: Texture[],
  px = 220,
) {
  const w = Math.round(widthM * px);
  const h = Math.round(heightM * px);
  const map = canvasTexture(w, h, (c) => draw(c, w, h));
  textures.push(map);
  const material = new MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: '#ffffff',
    emissiveIntensity: 0.18,
    roughness: 0.85,
  });
  return new Mesh(new PlaneGeometry(widthM, heightM), material);
}

const font = (size: number, weight = 600) =>
  `${weight} ${size}px ${BRAND.font}`;

/** Wrap `text` to `width` px; returns the lines. */
function wrap(c: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function paragraph(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  weight = 500,
) {
  c.font = font(size, weight);
  for (const l of wrap(c, text, width)) {
    c.fillText(l, x, y);
    y += size * 1.3;
  }
  return y;
}

/** A hall's number in its disc. */
function numberDisc(
  c: CanvasRenderingContext2D,
  n: number,
  x: number,
  y: number,
  r: number,
  fill = BRAND.colours.main,
) {
  c.fillStyle = fill;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.font = font(r * 1.25, 800);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(n), x, y + r * 0.06);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
}

/**
 * The exhibition's mark: a drop of water whose outline is a loop of
 * arrows, the water going round, with a splash at its foot.
 */
export function drawExhibitionMark(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
) {
  c.save();
  c.translate(x, y);
  c.fillStyle = BRAND.colours.main;
  c.beginPath();
  c.moveTo(0, -s * 0.5);
  c.bezierCurveTo(s * 0.05, -s * 0.3, s * 0.36, -s * 0.06, s * 0.36, s * 0.16);
  c.arc(0, s * 0.16, s * 0.36, 0, Math.PI, false);
  c.bezierCurveTo(-s * 0.36, -s * 0.06, -s * 0.05, -s * 0.3, 0, -s * 0.5);
  c.fill();
  // The loop of arrows, white on the drop.
  c.strokeStyle = '#ffffff';
  c.lineWidth = s * 0.06;
  c.lineCap = 'round';
  const r = s * 0.19;
  for (const start of [0.25, 1.25]) {
    const a0 = start * Math.PI;
    const a1 = a0 + Math.PI * 0.75;
    c.beginPath();
    c.arc(0, s * 0.14, r, a0, a1);
    c.stroke();
    const hx = Math.cos(a1) * r;
    const hy = s * 0.14 + Math.sin(a1) * r;
    const tx = -Math.sin(a1);
    const ty = Math.cos(a1);
    c.beginPath();
    c.moveTo(hx + tx * s * 0.09, hy + ty * s * 0.09);
    c.lineTo(hx + Math.cos(a1) * s * 0.07, hy + Math.sin(a1) * s * 0.07);
    c.moveTo(hx + tx * s * 0.09, hy + ty * s * 0.09);
    c.lineTo(hx - Math.cos(a1) * s * 0.07, hy - Math.sin(a1) * s * 0.07);
    c.stroke();
  }
  // The splash: three orange strokes.
  c.strokeStyle = BRAND.colours.accent;
  c.lineWidth = s * 0.05;
  for (const [dx, a] of [
    [-0.42, -2.4],
    [0.42, -0.75],
    [0, -1.57],
  ] as const) {
    c.beginPath();
    c.moveTo(dx * s, s * 0.45);
    c.lineTo(
      dx * s + Math.cos(a) * s * 0.12,
      s * 0.45 + Math.sin(a) * s * 0.12,
    );
    c.stroke();
  }
  c.restore();
}

/** The route, 1 to 5, the hall `here` marked: a strip along the foot of the signs. */
function routeStrip(
  c: CanvasRenderingContext2D,
  here: MuseumHallId | null,
  x: number,
  y: number,
  width: number,
) {
  const step = width / MUSEUM_HALLS.length;
  const r = Math.min(step * 0.16, 34);
  c.strokeStyle = BRAND.colours.soft;
  c.lineWidth = r * 0.35;
  c.beginPath();
  c.moveTo(x + step / 2, y);
  c.lineTo(x + width - step / 2, y);
  c.stroke();
  MUSEUM_HALLS.forEach((id, i) => {
    const b = HALL_BRIEFS[id];
    const cx = x + step * (i + 0.5);
    const on = id === here;
    numberDisc(
      c,
      b.number,
      cx,
      y,
      on ? r * 1.25 : r,
      on ? BRAND.colours.accent : BRAND.colours.main,
    );
    c.fillStyle = BRAND.colours.ink;
    c.font = font(r * 0.62, on ? 800 : 600);
    c.textAlign = 'center';
    c.fillText(b.title, cx, y + r * 2.3);
    if (on) {
      c.font = font(r * 0.5, 600);
      c.fillStyle = BRAND.colours.accent;
      c.fillText('You are here', cx, y + r * 3.1);
    }
    c.textAlign = 'left';
  });
}

/** The brand's footer line. */
function footer(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  drawExhibitionMark(c, x + size * 0.5, y - size * 0.35, size * 1.1);
  c.fillStyle = BRAND.colours.ink;
  c.font = font(size * 0.55, 800);
  c.fillText(BRAND.name, x + size * 1.2, y - size * 0.4);
  c.font = font(size * 0.4, 500);
  c.fillText(
    `${BRAND.strapline} · ${BRAND.museum}, ${BRAND.museumLine}`,
    x + size * 1.2,
    y + size * 0.1,
  );
}

/** The panel in an empty hall: what the exhibit will be. */
function paintComingSoon(id: MuseumHallId) {
  const b = HALL_BRIEFS[id];
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = BRAND.colours.ground;
    c.fillRect(0, 0, w, h);
    c.fillStyle = BRAND.colours.main;
    c.fillRect(0, 0, w, h * 0.2);
    const pad = w * 0.06;
    numberDisc(c, b.number, pad + h * 0.075, h * 0.1, h * 0.07, '#ffffff');
    c.fillStyle = BRAND.colours.main;
    c.font = font(h * 0.095, 800);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(b.number), pad + h * 0.075, h * 0.106);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffffff';
    c.font = font(h * 0.075, 800);
    c.fillText(b.title, pad + h * 0.18, h * 0.105);
    c.font = font(h * 0.035, 500);
    c.fillText(b.subject, pad + h * 0.18, h * 0.16);
    // Coming soon, in the accent.
    c.fillStyle = BRAND.colours.accent;
    c.font = font(h * 0.034, 800);
    c.fillText('EXHIBIT COMING SOON', pad, h * 0.26);
    let y = h * 0.31;
    c.fillStyle = BRAND.colours.ink;
    y =
      paragraph(c, b.willShow, pad, y, w - 2 * pad, h * 0.025, 500) + h * 0.01;
    // The big idea, boxed.
    const boxTop = y;
    c.font = font(h * 0.027, 700);
    const ideaLines = wrap(c, b.bigIdea, w - 2 * pad - h * 0.06);
    const boxH = h * 0.075 + ideaLines.length * h * 0.027 * 1.3;
    c.fillStyle = BRAND.colours.soft;
    c.fillRect(pad, boxTop, w - 2 * pad, boxH);
    c.fillStyle = BRAND.colours.main;
    c.font = font(h * 0.022, 800);
    c.fillText('THE BIG IDEA', pad + h * 0.03, boxTop + h * 0.04);
    c.fillStyle = BRAND.colours.ink;
    paragraph(
      c,
      b.bigIdea,
      pad + h * 0.03,
      boxTop + h * 0.08,
      w - 2 * pad - h * 0.06,
      h * 0.027,
      700,
    );
    y = boxTop + boxH + h * 0.045;
    c.fillStyle = BRAND.colours.accent;
    c.font = font(h * 0.022, 800);
    c.fillText('YOU WILL BE ABLE TO TRY', pad, y);
    y += h * 0.04;
    for (const t of b.tryIt) {
      c.fillStyle = BRAND.colours.accent;
      c.beginPath();
      c.arc(pad + h * 0.01, y - h * 0.009, h * 0.008, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = BRAND.colours.ink;
      y =
        paragraph(
          c,
          t,
          pad + h * 0.03,
          y,
          w - 2 * pad - h * 0.03,
          h * 0.024,
          500,
        ) +
        h * 0.008;
    }
    routeStrip(c, id, pad, h * 0.89, w - 2 * pad);
    c.fillStyle = BRAND.colours.main;
    c.fillRect(0, h - h * 0.012, w, h * 0.012);
  };
}

/** Over an archway, on the side it is approached from: the hall it leads to. */
function paintArchHeader(to: MuseumHallId, forward: boolean) {
  const b = HALL_BRIEFS[to];
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = forward ? BRAND.colours.main : BRAND.colours.ground;
    c.fillRect(0, 0, w, h);
    const ink = forward ? '#ffffff' : BRAND.colours.ink;
    numberDisc(
      c,
      b.number,
      h * 0.5,
      h * 0.5,
      h * 0.34,
      forward ? BRAND.colours.accent : BRAND.colours.main,
    );
    c.fillStyle = ink;
    c.font = font(h * 0.17, 700);
    c.fillText(forward ? 'NEXT EXHIBIT' : 'BACK TO', h * 1.0, h * 0.33);
    // As large as fits between the disc and the arrow.
    let size = h * 0.36;
    c.font = font(size, 800);
    const room = w - h * 2.0;
    if (c.measureText(b.title).width > room) {
      size *= room / c.measureText(b.title).width;
      c.font = font(size, 800);
    }
    c.fillText(b.title, h * 1.0, h * 0.68);
    c.font = font(h * 0.15, 500);
    c.fillText(b.subject, h * 1.0, h * 0.88);
    // An arrow: on ahead, or back.
    c.strokeStyle = forward ? BRAND.colours.accent : BRAND.colours.main;
    c.lineWidth = h * 0.08;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const ax = w - h * 0.55;
    c.beginPath();
    c.moveTo(ax, h * 0.8);
    c.lineTo(ax, h * 0.2);
    c.moveTo(ax - h * 0.2, h * 0.4);
    c.lineTo(ax, h * 0.2);
    c.lineTo(ax + h * 0.2, h * 0.4);
    c.stroke();
  };
}

/** A hall's own title, big, on its east wall, as gallery vinyl. */
function paintHallTitle(id: MuseumHallId) {
  const b = HALL_BRIEFS[id];
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = BRAND.colours.main;
    c.font = font(h * 0.62, 800);
    c.fillText(String(b.number), 0, h * 0.62);
    const nw = c.measureText(String(b.number)).width + h * 0.12;
    c.fillStyle = BRAND.colours.ink;
    c.font = font(h * 0.3, 800);
    c.fillText(b.title, nw, h * 0.42);
    c.fillStyle = BRAND.colours.main;
    c.font = font(h * 0.13, 600);
    c.fillText(b.subject, nw, h * 0.62);
    c.fillStyle = BRAND.colours.accent;
    c.fillRect(nw, h * 0.72, h * 0.6, h * 0.035);
    c.fillStyle = BRAND.colours.ink;
    c.font = font(h * 0.08, 500);
    c.fillText(`${BRAND.name} · ${BRAND.strapline}`, nw, h * 0.86);
  };
}

/** Museum 1's south wall: the exhibition's title wall. */
function paintTitleWall(c: CanvasRenderingContext2D, w: number, h: number) {
  c.clearRect(0, 0, w, h);
  const s = h / 10;
  drawExhibitionMark(c, s * 1.6, s * 2.3, s * 3);
  c.fillStyle = BRAND.colours.ink;
  c.font = font(s * 1.5, 800);
  c.fillText(BRAND.name, s * 3.6, s * 2.3);
  c.fillStyle = BRAND.colours.main;
  c.font = font(s * 0.75, 600);
  c.fillText(BRAND.strapline, s * 3.7, s * 3.3);
  c.fillStyle = BRAND.colours.accent;
  c.fillRect(s * 3.7, s * 3.75, s * 2.4, s * 0.12);
  c.fillStyle = BRAND.colours.ink;
  paragraph(
    c,
    'Every swimming pool hides a machine. Behind the tiles, pumps pull the water round, sand filters catch the dirt, heat exchangers keep it warm and a careful dose of chlorine keeps it safe, all day and all night. Walk through five halls, from the simplest idea to the whole working plant, and try every part of it for yourself.',
    s * 3.7,
    s * 4.6,
    w - s * 4.6,
    s * 0.36,
    500,
  );
  routeStrip(c, null, s * 3.4, s * 7.4, w - s * 4.4);
  c.fillStyle = BRAND.colours.main;
  c.font = font(s * 0.3, 700);
  c.fillText(
    `${BRAND.museum.toUpperCase()} · ${BRAND.museumLine.toUpperCase()}`,
    s * 3.7,
    s * 9.4,
  );
  c.fillStyle = BRAND.colours.ink;
  c.font = font(s * 0.3, 500);
  c.fillText(
    'Start here, then follow the numbers through the archway.',
    s * 3.7 + w * 0.42,
    s * 9.4,
  );
}

/** Museum 5's north wall: the end of the route. */
function paintEndWall(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = BRAND.colours.ground;
  c.fillRect(0, 0, w, h);
  c.fillStyle = BRAND.colours.main;
  c.fillRect(0, 0, w * 0.02, h);
  c.fillStyle = BRAND.colours.ink;
  c.font = font(h * 0.14, 800);
  c.fillText('Thank you for visiting', w * 0.06, h * 0.26);
  c.fillStyle = BRAND.colours.main;
  c.font = font(h * 0.08, 600);
  c.fillText(
    `${BRAND.name}: ${BRAND.strapline.toLowerCase()}`,
    w * 0.06,
    h * 0.4,
  );
  c.fillStyle = BRAND.colours.ink;
  paragraph(
    c,
    'Next time you swim, look for the grilles along the pool edge where the water spills away, and remember the plant room behind the wall, turning the whole pool over every few hours. The way out is back through the halls to the entrance.',
    w * 0.06,
    h * 0.55,
    w * 0.86,
    h * 0.055,
    500,
  );
  footer(c, w * 0.06, h * 0.9, h * 0.09);
}

export interface MuseumHall {
  group: Group;
  /** The plain stand-in seen through each archway while the hall beyond is not drawn through it. */
  standIns: Map<MuseumHallId, Group>;
  dispose(): void;
}

/** Build hall `id`, in metres (scale the group by the scene's metre). */
export function createMuseumHall(id: MuseumHallId, density = 0.8): MuseumHall {
  const m = createMuseumMaterials();
  const textures: Texture[] = [...m.textures];
  const group = new Group();
  group.name = id;
  const { w, d, h } = MUSEUM_SIZES[id];
  const hx = w / 2;
  const hz = d / 2;
  const t = MUSEUM_WALL;
  const top = h + 0.4;
  const origin = hallOrigin(id);
  const arches = hallArches(id);

  // The floor: a bay's texture laid from the museum's origin, out under the end walls' reveals.
  const floorGeometry = new PlaneGeometry(w + 2 * t, d + 2 * t);
  floorGeometry.rotateX(-Math.PI / 2);
  const pos = floorGeometry.attributes.position;
  const uv = floorGeometry.attributes.uv;
  for (let i = 0; i < pos.count; i++)
    uv.setXY(
      i,
      (pos.getX(i) + origin.x) / FLOOR_TILE,
      -(pos.getZ(i) + origin.z) / FLOOR_TILE,
    );
  const floor = new Mesh(floorGeometry, m.floor);
  floor.name = 'Polished concrete floor';
  group.add(floor);

  // The end walls: shared with the hall beyond (built alike from the wider's width), or solid.
  for (const wall of ['north', 'south'] as const) {
    const arch = arches.find((a) => a.wall === wall);
    const width = arch ? sharedWallWidth(id, arch.to) : w + 2 * t;
    const mesh = brickWall(m, width, top, Boolean(arch));
    mesh.position.z = wall === 'north' ? -hz - t / 2 : hz + t / 2;
    mesh.name = `${wall} wall`;
    group.add(mesh);
  }
  // The side walls: the west with its tall windows between the columns.
  const windowZs = [-9, -3, 3, 9].filter((z) => Math.abs(z) < hz - 2);
  for (const side of [-1, 1]) {
    const windows =
      side < 0
        ? windowZs.map((z) => ({ x: z, w: 2.2, sill: 3.2, head: h - 2.2 }))
        : [];
    const mesh = brickWall(m, d + 0.02, top, false, windows);
    mesh.rotation.y = Math.PI / 2;
    mesh.position.x = side * (hx + t / 2);
    mesh.name = `${side < 0 ? 'west' : 'east'} wall`;
    group.add(mesh);
    if (side < 0)
      for (const z of windowZs) {
        // Obscured glass, its glazing bars, set back in the reveal.
        const glassH = h - 2.2 - 3.2 + 0.3;
        const pane = new Mesh(new PlaneGeometry(2.2, glassH), m.glass);
        pane.rotation.y = Math.PI / 2;
        pane.position.set(-hx - t * 0.7, 3.2 + glassH / 2, z);
        group.add(pane);
        const bars: BufferGeometry[] = [];
        for (let k = 1; k < 4; k++) {
          const g = new BoxGeometry(0.04, glassH, 0.04);
          g.translate(
            -hx - t * 0.68,
            3.2 + glassH / 2,
            z - 1.1 + (k * 2.2) / 4,
          );
          bars.push(g);
        }
        for (let k = 1; k < 7; k++) {
          const g = new BoxGeometry(0.04, 0.04, 2.2);
          g.translate(-hx - t * 0.68, 3.2 + (k * glassH) / 7, z);
          bars.push(g);
        }
        group.add(new Mesh(mergeGeometries(bars), m.steel));
        for (const b of bars) b.dispose();
      }
  }

  // The roof deck, its two steel beams and the services under it (set decoration).
  const { group: ceiling } = createServiceCeiling(
    { minX: -hx, maxX: hx, minZ: -hz, maxZ: hz, deckY: h },
    {
      seed: MUSEUM_HALLS.indexOf(id) + 31,
      density,
      beamEvery: w / 2,
      keepClear: hallColumns(id).map((c) => ({
        layers: ['deck', 'top', 'pipes', 'air', 'cables', 'ladder'],
        box: {
          minX: c.x - 0.5,
          maxX: c.x + 0.5,
          minZ: c.z - 0.5,
          maxZ: c.z + 0.5,
        },
      })),
    },
  );
  group.add(ceiling);

  // The cast-iron columns, up to the beams, merged.
  const columnTop = h - BEAM_DEPTH;
  const shafts: BufferGeometry[] = [];
  for (const c of hallColumns(id)) {
    const base = new BoxGeometry(COLUMN_FOOT * 2, 0.4, COLUMN_FOOT * 2);
    base.translate(c.x, 0.2, c.z);
    const plinth = new CylinderGeometry(0.17, 0.2, 0.25, 16);
    plinth.translate(c.x, 0.52, c.z);
    const shaft = new CylinderGeometry(0.12, 0.14, columnTop - 1.2, 16);
    shaft.translate(c.x, 0.65 + (columnTop - 1.2) / 2, c.z);
    const capital = new CylinderGeometry(0.3, 0.13, 0.5, 16);
    capital.translate(c.x, columnTop - 0.55 + 0.25 - 0.05, c.z);
    const abacus = new BoxGeometry(0.66, 0.12, 0.66);
    abacus.translate(c.x, columnTop - 0.06, c.z);
    shafts.push(base, plinth, shaft, capital, abacus);
  }
  if (shafts.length) {
    group.add(new Mesh(mergeGeometries(shafts), m.iron));
    for (const g of shafts) g.dispose();
  }

  // Gallery track lighting: two tracks along the hall under the services, a head every 2 m.
  const trackY = h - 2.4;
  const tracks: BufferGeometry[] = [];
  const lamps: BufferGeometry[] = [];
  for (const x of [-hx / 2 - 1, hx / 2 + 1]) {
    const track = new BoxGeometry(0.05, 0.04, d - 2);
    track.translate(x, trackY, 0);
    tracks.push(track);
    for (const z of [-hz + 2, hz - 2]) {
      const rod = new CylinderGeometry(0.008, 0.008, h - trackY, 6);
      rod.translate(x, trackY + (h - trackY) / 2, z);
      tracks.push(rod);
    }
    for (let z = -hz + 2; z <= hz - 2; z += 2) {
      // Each head aimed down and out at its wall.
      const head = new CylinderGeometry(0.055, 0.045, 0.2, 12);
      head.rotateZ((x < 0 ? 1 : -1) * 0.6);
      head.translate(x + (x < 0 ? -0.05 : 0.05), trackY - 0.12, z);
      tracks.push(head);
      const face = new CylinderGeometry(0.046, 0.046, 0.01, 12);
      face.rotateZ((x < 0 ? 1 : -1) * 0.6);
      face.translate(x + (x < 0 ? -0.11 : 0.11), trackY - 0.2, z);
      lamps.push(face);
    }
  }
  group.add(new Mesh(mergeGeometries(tracks), m.steel));
  group.add(new Mesh(mergeGeometries(lamps), m.lamp));
  for (const g of [...tracks, ...lamps]) g.dispose();

  // Benches: an oak slab on two black steel frames.
  const benchParts: BufferGeometry[] = [];
  const frames: BufferGeometry[] = [];
  for (const b of hallBenches(id)) {
    const seat = new BoxGeometry(BENCH.w, 0.06, BENCH.l);
    seat.translate(b.x, BENCH.h - 0.03, b.z);
    benchParts.push(seat);
    for (const end of [-1, 1]) {
      const leg = new BoxGeometry(BENCH.w - 0.06, BENCH.h - 0.06, 0.05);
      leg.translate(b.x, (BENCH.h - 0.06) / 2, b.z + end * (BENCH.l / 2 - 0.2));
      frames.push(leg);
    }
  }
  group.add(new Mesh(mergeGeometries(benchParts), m.oak));
  group.add(new Mesh(mergeGeometries(frames), m.steel));
  for (const g of [...benchParts, ...frames]) g.dispose();

  // The "coming soon" panel, free-standing on its feet.
  const p = comingSoonPanel(id);
  const panel = new Group();
  panel.position.set(p.x, 0, p.z);
  panel.rotation.y = p.yaw;
  const board = new Mesh(
    new BoxGeometry(PANEL.w, PANEL.h, 0.08),
    new MeshStandardMaterial({ color: BRAND.colours.main, roughness: 0.7 }),
  );
  board.position.y = 0.15 + PANEL.h / 2;
  panel.add(board);
  const face = signMesh(
    PANEL.w - 0.16,
    PANEL.h - 0.16,
    paintComingSoon(id),
    textures,
    400,
  );
  face.position.set(0, board.position.y, 0.048);
  panel.add(face);
  for (const side of [-1, 1]) {
    const foot = new Mesh(new BoxGeometry(0.08, 0.15, 0.6), m.steel);
    foot.position.set(side * (PANEL.w / 2 - 0.3), 0.075, 0);
    panel.add(foot);
  }
  group.add(panel);

  // The hall's own title, big on its east wall.
  const title = signMesh(7.2, 2.4, paintHallTitle(id), textures, 160);
  (title.material as MeshStandardMaterial).transparent = true;
  title.rotation.y = -Math.PI / 2;
  title.position.set(hx - 0.012, 3.6, 0);
  group.add(title);

  // Over each archway on this side, where it leads; over its approach from the next hall, the way back.
  for (const a of arches) {
    const forward = a.wall === 'north';
    const sign = signMesh(
      5.2,
      1.1,
      paintArchHeader(a.to, forward),
      textures,
      240,
    );
    sign.position.set(0, ARCH_CROWN + 0.95, forward ? -hz + 0.012 : hz - 0.012);
    sign.rotation.y = forward ? 0 : Math.PI;
    group.add(sign);
  }
  if (id === 'museum1') {
    const wall = signMesh(11, 5.5, paintTitleWall, textures, 140);
    (wall.material as MeshStandardMaterial).transparent = true;
    wall.position.set(0, 4.0, hz - 0.012);
    wall.rotation.y = Math.PI;
    group.add(wall);
  }
  if (id === 'museum5') {
    const wall = signMesh(6.4, 3.2, paintEndWall, textures, 200);
    wall.position.set(0, 2.9, -hz + 0.012);
    group.add(wall);
  }

  // Beyond each archway, a plain stand-in for the hall there, shown while it is not drawn through it.
  const standIns = new Map<MuseumHallId, Group>();
  for (const a of arches) {
    const sign = a.wall === 'north' ? -1 : 1;
    const deep = 8;
    const inner = new Group();
    const room = new Mesh(new BoxGeometry(12, h, deep), m.plaster);
    room.position.set(0, h / 2, a.frame.z + sign * (t / 2 + deep / 2));
    inner.add(room);
    const standFloor = new PlaneGeometry(12, deep);
    standFloor.rotateX(-Math.PI / 2);
    standFloor.translate(0, 0.002, a.frame.z + sign * (t / 2 + deep / 2));
    const fp = standFloor.attributes.position;
    const fu = standFloor.attributes.uv;
    for (let i = 0; i < fp.count; i++)
      fu.setXY(
        i,
        (fp.getX(i) + origin.x) / FLOOR_TILE,
        -(fp.getZ(i) + origin.z) / FLOOR_TILE,
      );
    inner.add(new Mesh(standFloor, m.floor));
    inner.name = `Stand-in for ${a.to}`;
    standIns.set(a.to, inner);
    group.add(inner);
  }

  for (const child of group.children)
    markComponent(child, { decorative: true });
  group.traverse((o) => {
    if (o instanceof Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return {
    group,
    standIns,
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const mat of mats as Material[]) mat.dispose();
        }
      });
      for (const tex of textures) tex.dispose();
    },
  };
}
