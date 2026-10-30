import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material, Texture } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { markComponent } from '../../components/core/views/component-identity';
import { watchSign } from '../../components/core/views/display-reach';
import { drawBrandMark } from '../../components/core/views/brand-logo';
import { brandById } from '../../components/core/logic/brands';
import {
  BEAM_DEPTH,
  createServiceCeiling,
} from '../../components/site-dressing/views/service-ceiling';
import {
  BENCH,
  COLUMN_FOOT,
  FINALE,
  HALL0_BANDS,
  HALL_BRIEFS,
  HALL_TITLE,
  MUSEUM_ARCH,
  MUSEUM_EXHIBITS,
  MUSEUM_HALL0,
  MUSEUM_SQUARE,
  MUSEUM_WALL,
  PAINTED_POOL,
  PANEL,
  beyondAt,
  comingSoonPanel,
  hall0Ladder,
  hallArches,
  hallCorridors,
  hallLiftOpening,
  hallAxes,
  hallBenches,
  hallBounds,
  hallColumns,
  hallInterior,
  hallOrigin,
  hallSize,
  hallWalls,
  insideFaceRuns,
  isBlackBox,
  wallWindows,
} from '../logic/museum-plan';
import type {
  HallWall,
  MuseumArch,
  MuseumHallId,
  MuseumWindow,
} from '../logic/museum-plan';
import { MUSEUM_EXHIBITION as BRAND } from '../logic/museum-brand';
import { CORRIDOR } from '../logic/museum-layout';
import { createPendantLamps } from '../../components/architectural/views/pendant-lamps';

/** A corridor's pendant: its dome's rim, m up, and its size (Lamp Copper's model E). */
const CORRIDOR_LAMP = { rim: 3.8, size: 0.6 } as const;
import { CLOSING_WALL } from '../logic/museum-9-placards';
import { createMuseumSafety } from './museum-safety';
import { DECK_LIFT } from '../logic/museum-5-gallery';
import {
  POSTER_GLOW_MARGIN,
  createCausticsProjector,
  posterGlowTexture,
} from './caustics-projector';
import {
  COVE_RADIUS,
  coveStrip,
} from '../../components/architectural/views/room-coves';

/**
 * A room of the pool science museum, PLANTROOMS (mission 107): the five
 * exhibit halls, each a bay of a converted dye works built round a
 * courtyard (old brick painted white, polished concrete with saw-cut
 * joints, cast-iron columns under steel beams, the services ceiling high
 * overhead as set decoration, tall factory windows: clear onto the
 * courtyard, obscured onto the street), joined by archways knocked
 * through the old walls; and Hall 0, the welcome, a dry tiled pastiche of
 * a pool hall whose water is paint on the floor. Gallery track lighting,
 * benches and the exhibition's signs. No exhibits yet. Set decoration
 * throughout. Built in metres.
 *
 * Every wall is built in the museum's own coordinates from its plan
 * (`museum-plan.ts`), so the two rooms at a doorway build its wall with
 * the same geometry and brick, and the floors' joints are laid from the
 * museum's origin in one orientation: nothing changes at a hand-over, at
 * a corner or a straight (the pool loop's lesson, `8656cf1`). The
 * courtyard is never seen: its windows are high and their panes a plain
 * white sky, opaque, so no other hall shows through them.
 */

export const FLOOR_TILE = 4;
/** Hall 0's wall tiles: eight 150 mm tiles a repeat. */
const TILE_REPEAT = 1.2;
/** Every wall's height: the roof deck's parapet. */
const WALL_TOP = MUSEUM_SQUARE.h + 0.4;

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

/** A seeded random number source, so every room's textures are alike. */
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

/** Polished concrete, a 4 m bay: a soft cloud, faint trowel arcs, aggregate, and saw cuts at its edges. */
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
    for (let k = 0; k < 2600; k++) {
      c.fillStyle = `rgba(${rand() > 0.5 ? '70,66,60' : '220,216,208'}, ${0.15 + rand() * 0.2})`;
      c.fillRect(rand() * S, rand() * S, 1 + rand() * 2, 1 + rand() * 2);
    }
    c.fillStyle = 'rgba(60, 56, 52, 0.75)';
    c.fillRect(0, 0, S, 2);
    c.fillRect(0, S - 2, S, 2);
    c.fillRect(0, 0, 2, S);
    c.fillRect(S - 2, 0, 2, S);
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** Small square tiles, white and pale aqua, in pale grout: Hall 0's walls and ceiling. */
function wallTileTexture() {
  const S = 512;
  const t = canvasTexture(S, S, (c) => {
    const rand = seeded(41);
    c.fillStyle = '#c9d6d2';
    c.fillRect(0, 0, S, S);
    const n = 8;
    const cell = S / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const aqua = rand() < 0.18;
        const tone = rand() * 3;
        c.fillStyle = aqua
          ? `hsl(172, 38%, ${80 + tone}%)`
          : `hsl(160, 14%, ${93 + tone}%)`;
        c.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.fillRect(i * cell + 5, j * cell + 5, cell * 0.5, 3);
      }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / TILE_REPEAT, 1 / TILE_REPEAT);
  return t;
}

/**
 * Hall 0's floor, painted once: tiled deck round a painted pool, plain
 * white (its lane lines are in the projector's picture), for the projector
 * overhead to throw its caustics on (the owner, 2026-10-28), its coping and the gutter's grille
 * all paint ("a fake pool, a dry exhibit"). Over the room's wall lines.
 */
export function paintedFloorTexture(w: number, d: number, px = 110) {
  const W = Math.round(w * px);
  const H = Math.round(d * px);
  return canvasTexture(W, H, (c) => {
    const rand = seeded(67);
    // The deck: 250 mm tiles.
    c.fillStyle = '#b9c5c2';
    c.fillRect(0, 0, W, H);
    const t = 0.25 * px;
    for (let x = 0; x < W; x += t)
      for (let y = 0; y < H; y += t) {
        c.fillStyle = `hsl(165, 10%, ${86 + rand() * 4}%)`;
        c.fillRect(x + 1.5, y + 1.5, t - 3, t - 3);
      }
    const pw = PAINTED_POOL.w * px;
    const pd = PAINTED_POOL.d * px;
    const x0 = (W - pw) / 2;
    const y0 = (H - pd) / 2;
    // The gutter's grille, painted, then the coping.
    c.fillStyle = '#e9efee';
    c.fillRect(x0 - 0.45 * px, y0 - 0.45 * px, pw + 0.9 * px, pd + 0.9 * px);
    c.fillStyle = '#9fb3b4';
    c.fillRect(x0 - 0.38 * px, y0 - 0.38 * px, pw + 0.76 * px, pd + 0.76 * px);
    c.strokeStyle = '#e6eeed';
    c.lineWidth = 2;
    for (let k = 0; k < (pw + 0.76 * px) / 6; k++) {
      const x = x0 - 0.38 * px + k * 6;
      c.beginPath();
      c.moveTo(x, y0 - 0.38 * px);
      c.lineTo(x, y0 - 0.22 * px);
      c.moveTo(x, y0 + pd + 0.22 * px);
      c.lineTo(x, y0 + pd + 0.38 * px);
      c.stroke();
    }
    c.fillStyle = '#f4f7f6';
    c.fillRect(x0 - 0.2 * px, y0 - 0.2 * px, pw + 0.4 * px, pd + 0.4 * px);
    // The pool: white, a screen for the projector's caustics overhead
    // (the owner, 2026-10-28), faintly shaded to its middle.
    const g = c.createRadialGradient(
      x0 + pw / 2,
      y0 + pd / 2,
      pd * 0.1,
      x0 + pw / 2,
      y0 + pd / 2,
      pw * 0.6,
    );
    g.addColorStop(0, '#fbfcfc');
    g.addColorStop(1, '#eef2f2');
    c.fillStyle = g;
    c.fillRect(x0, y0, pw, pd);
  });
}

/** Every room's finishes, shared by its meshes. */
export interface MuseumMaterials {
  paint: MeshStandardMaterial;
  rawBrick: MeshStandardMaterial;
  /** The insides of the archways: the posters' flat green. */
  archGreen: MeshStandardMaterial;
  floor: MeshStandardMaterial;
  iron: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  obscured: MeshStandardMaterial;
  mask: MeshBasicMaterial;
  tint: MeshStandardMaterial;
  oak: MeshStandardMaterial;
  plaster: MeshStandardMaterial;
  lamp: MeshStandardMaterial;
  tile: MeshStandardMaterial;
  chrome: MeshStandardMaterial;
  fluorescent: MeshStandardMaterial;
  textures: Texture[];
}

/** The museum's walls: plain matte 95% grey (sRGB 242; the owner, 2026-10-30, was 80%). */
export const MUSEUM_WALL_GREY = '#f2f2f2';

export function createMuseumMaterials(): MuseumMaterials {
  const concrete = concreteTexture();
  const tiles = wallTileTexture();
  return {
    // Featureless matte walls, 80% grey (the owner, 2026-10-30): no
    // brick, no texture; the reveals the same.
    paint: new MeshStandardMaterial({
      color: MUSEUM_WALL_GREY,
      roughness: 0.95,
    }),
    rawBrick: new MeshStandardMaterial({
      color: MUSEUM_WALL_GREY,
      roughness: 0.95,
    }),
    archGreen: new MeshStandardMaterial({
      color: BRAND.colours.main,
      roughness: 0.85,
    }),
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
    obscured: new MeshStandardMaterial({
      color: '#dfe7ea',
      emissive: '#e8eff2',
      emissiveIntensity: 0.85,
      roughness: 0.6,
      side: DoubleSide,
    }),
    // A courtyard window's pane: a plain white sky, unlit and opaque, so
    // no other hall is ever seen through it (the owner, 2026-10-28: "you
    // never see the other rooms, just white skybox").
    mask: new MeshBasicMaterial({
      color: '#ffffff',
      side: DoubleSide,
      toneMapped: false,
    }),
    tint: new MeshStandardMaterial({
      color: '#dff1f0',
      transparent: true,
      opacity: 0.12,
      roughness: 0.05,
      metalness: 0.1,
      depthWrite: false,
      side: DoubleSide,
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
    tile: new MeshStandardMaterial({
      map: tiles,
      roughness: 0.25,
      metalness: 0,
    }),
    chrome: new MeshStandardMaterial({
      color: '#e8ecee',
      roughness: 0.12,
      metalness: 1,
    }),
    fluorescent: new MeshStandardMaterial({
      color: '#f2fff6',
      emissive: '#eefff1',
      emissiveIntensity: 1.6,
    }),
    textures: [concrete, tiles],
  };
}

/**
 * Hall 0's pool-hall trim, in the museum's coordinates (the owner,
 * 2026-10-28: "make the welcome hall look like a pool room with a tiled
 * floor and wall"): its bands of coloured tiles round the walls
 * (`HALL0_BANDS`, a geometry list a band) and the tiled quarter-round cove
 * at the foot of every wall and up every corner (CLAUDE.md: pool rooms
 * are coved), broken at the doorways and windows. Shared by the full
 * hall and its empty model, so Hall 0 looks the same from afar.
 */
export function hall0TrimGeometry(): {
  bands: BufferGeometry[][];
  coves: BufferGeometry[];
} {
  const id = 'museum0';
  const t = MUSEUM_WALL / 2;
  const face = (wall: HallWall, off: number) => {
    // The inside face's line, `off` proud of it.
    const n = wall.axis === 'x' ? wall.out[1] : wall.out[0];
    return wall.line - n * (t + off);
  };
  const bands = HALL0_BANDS.map((band) =>
    insideFaceRuns(id, band.y, band.h).map(({ wall, from, to }) => {
      const g =
        wall.axis === 'x'
          ? new BoxGeometry(to - from, band.h, 0.012)
          : new BoxGeometry(0.012, band.h, to - from);
      const mid = (from + to) / 2;
      const at = face(wall, 0.006);
      if (wall.axis === 'x') g.translate(mid, band.y + band.h / 2, at);
      else g.translate(at, band.y + band.h / 2, mid);
      return g;
    }),
  );
  const coves: BufferGeometry[] = [];
  for (const { wall, from, to } of insideFaceRuns(id, 0)) {
    const g = coveStrip(to - from);
    const mid = (from + to) / 2;
    const at = face(wall, 0);
    const n = wall.axis === 'x' ? wall.out[1] : wall.out[0];
    // The profile's x into the room: turned to face away from the wall.
    if (wall.axis === 'z') {
      if (n > 0) g.rotateY(Math.PI);
      g.translate(at, 0, mid);
    } else {
      g.rotateY(n > 0 ? Math.PI / 2 : -Math.PI / 2);
      g.translate(mid, 0, at);
    }
    coves.push(g);
  }
  // Up each inside corner, the deck to the ceiling.
  const inner = hallInterior(id);
  const h = MUSEUM_HALL0.h;
  for (const [x, z, turn] of [
    [inner.minX, inner.minZ, 0],
    [inner.maxX, inner.minZ, -Math.PI / 2],
    [inner.maxX, inner.maxZ, Math.PI],
    [inner.minX, inner.maxZ, Math.PI / 2],
  ] as const)
    coves.push(
      coveStrip(h, COVE_RADIUS)
        .rotateX(Math.PI / 2)
        .rotateY(turn)
        .translate(x, h / 2, z),
    );
  return { bands, coves };
}

/**
 * A glossy sticker of a lifebuoy on Hall 0's east wall (the owner,
 * 2026-10-28; moved from the west wall for the lift, 2026-10-30), south
 * of the doorway from Hall 9: set decoration, not a real lifebuoy, 0.75 m across, red and
 * white quarters and its grab line, 1 mm proud of the tiles and drawn after
 * them (renderOrder, polygon offset) so it never z-fights. In the museum's
 * coordinates; its texture is made by `lifebuoyStickerTexture`.
 */
export const LIFEBUOY_STICKER = { size: 0.75, y: 1.95, along: 2.5 } as const;
export function lifebuoyStickerGeometry() {
  const east = hallWalls('museum0').find((w) => w.side === 'east')!;
  const u = (east.from + east.to) / 2 + LIFEBUOY_STICKER.along;
  const g = new PlaneGeometry(LIFEBUOY_STICKER.size, LIFEBUOY_STICKER.size);
  // Facing west, into the hall.
  g.rotateY(-Math.PI / 2);
  g.translate(east.line - MUSEUM_WALL / 2 - 0.001, LIFEBUOY_STICKER.y, u);
  return g;
}
export function lifebuoyStickerTexture() {
  const S = 256;
  return canvasTexture(S, S, (c) => {
    const m = S / 2;
    const outer = S * 0.44;
    const inner = S * 0.27;
    for (let k = 0; k < 8; k++) {
      c.fillStyle = k % 2 ? '#f4f4f0' : '#d8261c';
      c.beginPath();
      c.arc(m, m, outer, (k * Math.PI) / 4, ((k + 1) * Math.PI) / 4);
      c.arc(m, m, inner, ((k + 1) * Math.PI) / 4, (k * Math.PI) / 4, true);
      c.closePath();
      c.fill();
    }
    // The grab line, looped round the ring at four points.
    c.strokeStyle = '#2b2b2b';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(m, m, (outer + inner) / 2 + 2, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 7;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 2;
      c.beginPath();
      c.moveTo(m + Math.cos(a) * (inner - 4), m + Math.sin(a) * (inner - 4));
      c.lineTo(m + Math.cos(a) * (outer + 8), m + Math.sin(a) * (outer + 8));
      c.stroke();
    }
  });
}
/**
 * Glossy vinyl arrow stickers on the floor, showing the way round (the
 * owner, 2026-10-28: "arrows on the floor indicating the direction of
 * travel between each room"): by every archway, two arrows, pointing out
 * through the way on and in from the way back. In the museum's
 * coordinates, a few millimetres above the floor; their texture is made by
 * `floorArrowTexture` and their finish is the lifebuoy sticker's.
 */
export const FLOOR_ARROW = { size: 0.9, at: [1.3, 2.6], lift: 0.002 } as const;
export function floorArrowGeometry(id: MuseumHallId) {
  const parts: BufferGeometry[] = [];
  for (const a of hallArches(id)) {
    // Out through the way on, in from the way back.
    const dx = a.onward ? -a.into[0] : a.into[0];
    const dz = a.onward ? -a.into[1] : a.into[1];
    for (const d of FLOOR_ARROW.at) {
      const g = new PlaneGeometry(FLOOR_ARROW.size, FLOOR_ARROW.size);
      // Laid flat, the texture's top towards north (-z), then turned.
      g.rotateX(-Math.PI / 2);
      g.rotateY(Math.atan2(-dx, -dz));
      g.translate(
        a.at.x + a.into[0] * d,
        FLOOR_ARROW.lift,
        a.at.z + a.into[1] * d,
      );
      parts.push(g);
    }
  }
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return merged;
}
/**
 * A floor arrow's texture, pointing up the canvas (north when laid). With
 * a `label` (Hall 5's TRY ME by the skimmer, the owner, 2026-10-29), the
 * words are printed in white along its shaft, reading toward the point.
 */
export function floorArrowTexture(
  fill: string = BRAND.colours.accent,
  label?: string,
) {
  const S = 256;
  return canvasTexture(S, S, (c) => {
    const m = S / 2;
    const arrow = () => {
      c.beginPath();
      c.moveTo(m, S * 0.06);
      c.lineTo(m + S * 0.4, S * 0.48);
      c.lineTo(m + S * 0.16, S * 0.48);
      c.lineTo(m + S * 0.16, S * 0.94);
      c.lineTo(m - S * 0.16, S * 0.94);
      c.lineTo(m - S * 0.16, S * 0.48);
      c.lineTo(m - S * 0.4, S * 0.48);
      c.closePath();
    };
    // A white printed border round the vinyl, then the brand's colour.
    c.lineJoin = 'round';
    c.lineWidth = 14;
    c.strokeStyle = '#f4f4f0';
    arrow();
    c.stroke();
    c.fillStyle = fill;
    arrow();
    c.fill();
    if (label) {
      c.save();
      c.translate(m, S * 0.72);
      c.rotate(-Math.PI / 2);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `800 ${S * 0.2}px ${BRAND.font}`;
      c.fillText(label, 0, 0, S * 0.44);
      c.restore();
    }
  });
}

export function lifebuoyStickerMaterial(map: Texture) {
  const sticker = new MeshStandardMaterial({
    map,
    transparent: true,
    alphaTest: 0.5,
    roughness: 0.12,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  return sticker;
}

/** An opening knocked through a wall: its middle along it, as the plan gives it. */
export interface Opening {
  u: number;
  arch: MuseumArch;
}

/**
 * A wall along one of a room's wall lines, from `from` to `to` (the
 * museum's coordinate along it), `MUSEUM_WALL` thick about its line,
 * `WALL_TOP` high, in the museum's coordinates: the shape in (along, up),
 * so its brick is laid the same whichever room builds it; its openings
 * notched up from the floor, round-headed archways or the square-headed
 * doorway; its windows holes, segmental-headed. Faces in `faces`, the
 * reveals in `reveals`; with `openingReveals`, the insides of its archways
 * and doorways in that instead (the owner, 2026-10-29: the posters' flat
 * green, not brick).
 */
export function wallRun(
  axis: 'x' | 'z',
  line: number,
  from: number,
  to: number,
  openings: readonly Opening[],
  windows: readonly MuseumWindow[],
  faces: Material,
  reveals: Material,
  openingReveals?: Material,
) {
  const shape = new Shape();
  shape.moveTo(from, 0);
  for (const o of [...openings].sort((p, q) => p.u - q.u)) {
    const a = o.arch.w / 2;
    shape.lineTo(o.u - a, 0);
    if (o.arch.kind === 'arch') {
      shape.lineTo(o.u - a, MUSEUM_ARCH.spring);
      shape.absarc(o.u, MUSEUM_ARCH.spring, a, Math.PI, 0, true);
    } else {
      shape.lineTo(o.u - a, o.arch.top);
      shape.lineTo(o.u + a, o.arch.top);
    }
    shape.lineTo(o.u + a, 0);
  }
  shape.lineTo(to, 0);
  shape.lineTo(to, WALL_TOP);
  shape.lineTo(from, WALL_TOP);
  shape.closePath();
  for (const w of windows) shape.holes.push(windowShape(w));
  const geometry = new ExtrudeGeometry(shape, {
    depth: MUSEUM_WALL,
    bevelEnabled: false,
    curveSegments: 28,
  });
  geometry.translate(0, 0, -MUSEUM_WALL / 2);
  if (openingReveals) {
    splitOpeningReveals(geometry, openings);
    const mesh = new Mesh(geometry, [faces, reveals, openingReveals]);
    placeOnLine(mesh, axis, line);
    return mesh;
  }
  const mesh = new Mesh(geometry, [faces, reveals]);
  placeOnLine(mesh, axis, line);
  return mesh;
}

/**
 * Give the reveal faces inside an opening (those within its width, below
 * its top) a group of their own, material 2, after the faces' and the
 * other reveals': the triangles reordered so each group is one run.
 */
function splitOpeningReveals(
  geometry: BufferGeometry,
  openings: readonly Opening[],
) {
  const position = geometry.getAttribute('position');
  const reveal = geometry.groups.find((g) => g.materialIndex === 1);
  if (!reveal || geometry.index) return;
  const inOpening = (tri: number) => {
    let u = 0;
    let v = 0;
    for (let k = 0; k < 3; k++) {
      u += position.getX(tri * 3 + k) / 3;
      v += position.getY(tri * 3 + k) / 3;
    }
    return openings.some(
      (o) => Math.abs(u - o.u) <= o.arch.w / 2 + 1e-3 && v <= o.arch.top + 1e-3,
    );
  };
  const order: number[][] = [[], [], []];
  for (const g of geometry.groups)
    for (let t = g.start / 3; t < (g.start + g.count) / 3; t++)
      order[
        g.materialIndex === 1 && inOpening(t) ? 2 : (g.materialIndex ?? 0)
      ].push(t);
  const triangles = order.flat();
  for (const name of Object.keys(geometry.attributes)) {
    const attr = geometry.getAttribute(name);
    const size = attr.itemSize;
    const out = new Float32Array(attr.array.length);
    triangles.forEach((t, i) => {
      for (let k = 0; k < 3 * size; k++)
        out[i * 3 * size + k] = attr.array[t * 3 * size + k] as number;
    });
    geometry.setAttribute(name, new BufferAttribute(out, size));
  }
  geometry.clearGroups();
  let start = 0;
  order.forEach((list, index) => {
    if (list.length) geometry.addGroup(start, list.length * 3, index);
    start += list.length * 3;
  });
}

/** A black box's finishes (`isBlackBox`): matt black walls, floor and roof deck. */
export const BLACK_BOX = {
  walls: '#0d0d0e',
  floor: '#141416',
  deck: '#0a0a0b',
  /** The paint's lift off the brick, so the two never fight. */
  proud: 0.006,
} as const;

/**
 * A black box's paint on one wall's inside face, in the museum's
 * coordinates: floor to roof deck, its archways and doorways notched out.
 */
export function blackBoxSheet(id: MuseumHallId, wall: HallWall) {
  const half = MUSEUM_WALL / 2;
  const shape = new Shape();
  const from = wall.from + half;
  const to = wall.to - half;
  shape.moveTo(from, 0);
  for (const o of openingsOn(id, wall).sort((p, q) => p.u - q.u)) {
    const a = o.arch.w / 2;
    shape.lineTo(o.u - a, 0);
    if (o.arch.kind === 'arch') {
      shape.lineTo(o.u - a, MUSEUM_ARCH.spring);
      shape.absarc(o.u, MUSEUM_ARCH.spring, a, Math.PI, 0, true);
    } else {
      shape.lineTo(o.u - a, o.arch.top);
      shape.lineTo(o.u + a, o.arch.top);
    }
    shape.lineTo(o.u + a, 0);
  }
  shape.lineTo(to, 0);
  shape.lineTo(to, MUSEUM_SQUARE.h);
  shape.lineTo(from, MUSEUM_SQUARE.h);
  shape.closePath();
  const g = new ShapeGeometry(shape, 24);
  // On the inside face, into the hall (drawn both sides, so either way round).
  const n = wall.axis === 'x' ? -wall.out[1] : -wall.out[0];
  const at = wall.line + n * (half + BLACK_BOX.proud);
  if (wall.axis === 'x') g.translate(0, 0, at);
  else {
    // Along z: the shape's x becomes z.
    g.rotateY(-Math.PI / 2);
    g.translate(at, 0, 0);
  }
  return g;
}

/** A window's opening, in a wall's (along, up). */
export function windowShape(w: MuseumWindow) {
  const hole = new Shape();
  const r = w.w / 2;
  hole.moveTo(w.u - r, w.sill);
  hole.lineTo(w.u + r, w.sill);
  hole.lineTo(w.u + r, w.head);
  hole.quadraticCurveTo(w.u, w.head + 0.35, w.u - r, w.head);
  hole.closePath();
  return hole;
}

/** Stand a thing drawn in a wall's (along, up, through) on its line, in the museum's coordinates. */
export function placeOnLine(
  object: { position: Vector3; rotation: { y: number } },
  axis: 'x' | 'z',
  line: number,
  through = 0,
) {
  if (axis === 'x') object.position.z = line + through;
  else {
    object.rotation.y = -Math.PI / 2;
    object.position.x = line + through;
  }
}

/**
 * A wall's openings, from the plan's archways on its line, and the lift
 * landing's opening (Hall 0's west wall, mission 108): square-headed, its
 * frame and doors the landing's.
 */
function openingsOn(
  id: MuseumHallId,
  wall: HallWall,
  /** Whose lift opening to cut, where it falls on this wall: a neighbour's copy drawn from that hall cuts it too. */
  liftOf: MuseumHallId = id,
): Opening[] {
  const arches = hallArches(id)
    .filter(
      (a) =>
        a.axis === wall.axis &&
        Math.abs((wall.axis === 'x' ? a.at.z : a.at.x) - wall.line) < 1e-9,
    )
    .map((arch) => ({ arch, u: wall.axis === 'x' ? arch.at.x : arch.at.z }));
  const lift = hallLiftOpening(liftOf);
  if (
    !lift ||
    lift.wall.axis !== wall.axis ||
    Math.abs(lift.wall.line - wall.line) > 1e-9 ||
    lift.u < Math.min(wall.from, wall.to) ||
    lift.u > Math.max(wall.from, wall.to)
  )
    return arches;
  const at =
    wall.axis === 'x'
      ? { x: lift.u, z: wall.line }
      : { x: wall.line, z: lift.u };
  return [
    ...arches,
    {
      u: lift.u,
      arch: {
        to: id,
        onward: false,
        kind: 'door',
        w: lift.w,
        top: lift.top,
        axis: wall.axis,
        at,
        into: [-wall.out[0], -wall.out[1]],
        frame: { x: 0, z: 0, yaw: 0 },
      },
    },
  ];
}

/** A window's glass and bars, in the museum's coordinates. */
function glaze(
  m: MuseumMaterials,
  wall: { axis: 'x' | 'z'; line: number },
  w: MuseumWindow,
  group: Group,
  bars: BufferGeometry[],
) {
  const pane = new ShapeGeometry(windowShape(w));
  if (w.kind === 'street') {
    const glass = new Mesh(pane, m.obscured);
    placeOnLine(glass, wall.axis, wall.line);
    group.add(glass);
  } else {
    const sky = new Mesh(pane, m.mask);
    placeOnLine(sky, wall.axis, wall.line);
    group.add(sky);
  }
  // Glazing bars: three mullions and transoms every 0.6 m.
  const height = w.head - w.sill + 0.2;
  const along = (g: BufferGeometry, u: number, y: number) => {
    if (wall.axis === 'x') g.translate(u, y, wall.line);
    else {
      g.rotateY(-Math.PI / 2);
      g.translate(wall.line, y, u);
    }
    bars.push(g);
  };
  for (let k = 1; k < 4; k++)
    along(
      new BoxGeometry(0.04, height, 0.04),
      w.u - w.w / 2 + (k * w.w) / 4,
      w.sill + height / 2,
    );
  for (let y = w.sill + 0.6; y < w.head; y += 0.6)
    along(new BoxGeometry(w.w, 0.04, 0.04), w.u, y);
}

/** A sign's face, painted on a canvas `px` pixels a metre. */
function signMesh(
  widthM: number,
  heightM: number,
  draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
  textures: Texture[],
  px = 220,
  transparent = false,
  {
    glossy,
    shadow = false,
  }: {
    /** A colour it prints in glossy vinyl, the rest matte (the owner, 2026-10-29). */
    glossy?: string;
    /** A tiny drop shadow on the wall behind it. */
    shadow?: boolean;
  } = {},
) {
  const w = Math.round(widthM * px);
  const h = Math.round(heightM * px);
  const map = canvasTexture(w, h, (c) => draw(c, w, h));
  // Its lettering drawn by distance (the owner, 2026-10-29).
  watchSign(map, (c) => draw(c, w, h), px);
  textures.push(map);
  const material = new MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: '#ffffff',
    emissiveIntensity: 0.18,
    roughness: glossy ? 1 : 0.85,
    transparent,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  if (glossy) {
    // Its roughness drawn from its own picture: the glossy colour's fills
    // smooth, as the floor's vinyl (0.12), everything else matte (0.9).
    const rough = canvasTexture(w, h, (c) =>
      draw(roughnessOf(c, glossy), w, h),
    );
    textures.push(rough);
    material.roughnessMap = rough;
  }
  const mesh = new Mesh(new PlaneGeometry(widthM, heightM), material);
  if (shadow) mesh.add(dropShadow(widthM, heightM, textures));
  return mesh;
}

/**
 * A drawing context that paints roughness instead of colour: fills and
 * strokes in `glossy` as smooth (0.12, the floor vinyl's), every other
 * colour as matte (0.9); lettering, images and the like matte too.
 */
function roughnessOf(
  c: CanvasRenderingContext2D,
  glossy: string,
): CanvasRenderingContext2D {
  const smooth = '#1f1f1f';
  const matte = '#e6e6e6';
  const same = (a: unknown) =>
    typeof a === 'string' && a.toLowerCase() === glossy.toLowerCase();
  return new Proxy(c, {
    set(target, key, value) {
      if (key === 'fillStyle' || key === 'strokeStyle')
        value = same(value) ? smooth : matte;
      (target as unknown as Record<string | symbol, unknown>)[key] = value;
      return true;
    },
    get(target, key) {
      const v = (target as unknown as Record<string | symbol, unknown>)[key];
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

/** A sign's tiny drop shadow: a soft dark rectangle a little down and right of it, on the wall behind. */
function dropShadow(widthM: number, heightM: number, textures: Texture[]) {
  const blur = 0.02;
  const px = 200;
  const w = Math.round((widthM + 4 * blur) * px);
  const h = Math.round((heightM + 4 * blur) * px);
  const map = canvasTexture(w, h, (c) => {
    c.clearRect(0, 0, w, h);
    c.filter = `blur(${blur * px * 0.5}px)`;
    c.fillStyle = 'rgba(0, 0, 0, 0.5)';
    c.fillRect(2 * blur * px, 2 * blur * px, widthM * px, heightM * px);
  });
  textures.push(map);
  const shade = new Mesh(
    new PlaneGeometry(widthM + 4 * blur, heightM + 4 * blur),
    new MeshBasicMaterial({ map, transparent: true, depthWrite: false }),
  );
  shade.position.set(0.012, -0.016, -0.008);
  shade.name = 'Drop shadow';
  return shade;
}

const font = (size: number, weight = 600) =>
  `${weight} ${size}px ${BRAND.font}`;
const PLANTROOMS = brandById('plantrooms');

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

function numberDisc(
  c: CanvasRenderingContext2D,
  n: number,
  x: number,
  y: number,
  r: number,
  fill = BRAND.colours.main,
  ink = '#ffffff',
) {
  c.fillStyle = fill;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = ink;
  c.font = font(r * 1.25, 800);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(n), x, y + r * 0.06);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
}

/**
 * The PLANTROOMS wordmark, each letter on its own pale tile in its grout,
 * one tile a shade off, as a pool's are: `size` the tiles' side.
 */
export function drawWordmark(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const letters = BRAND.name.split('');
  const gap = size * 0.08;
  c.fillStyle = '#9fb9b6';
  c.fillRect(x - gap, y - gap, letters.length * size + gap, size + gap);
  letters.forEach((l, i) => {
    c.fillStyle = i === 5 ? BRAND.colours.soft : '#f6fbfa';
    c.fillRect(x + i * size, y, size - gap, size - gap);
    c.fillStyle = BRAND.colours.ink;
    c.font = font(size * 0.72, 800);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(l, x + i * size + (size - gap) / 2, y + (size - gap) * 0.54);
  });
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  return letters.length * size;
}

/** The route, the five exhibits, the one `here` marked. */
function routeStrip(
  c: CanvasRenderingContext2D,
  here: MuseumHallId | null,
  x: number,
  y: number,
  width: number,
) {
  const step = width / MUSEUM_EXHIBITS.length;
  const r = Math.min(step * 0.16, 34);
  c.strokeStyle = BRAND.colours.soft;
  c.lineWidth = r * 0.35;
  c.beginPath();
  c.moveTo(x + step / 2, y);
  c.lineTo(x + width - step / 2, y);
  c.stroke();
  MUSEUM_EXHIBITS.forEach((id, i) => {
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
    // Thirteen halls: titled where they have a theme, numbered only while they wait.
    if (b.themed || on) {
      const words = b.title.split(' ');
      const cut = Math.ceil(words.length / 2);
      const lines =
        c.measureText(b.title).width > step * 0.95
          ? [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
          : [b.title];
      lines.forEach((l, k) => c.fillText(l, cx, y + r * (2.3 + k * 0.75)));
    }
    if (on) {
      c.font = font(r * 0.5, 600);
      c.fillStyle = BRAND.colours.accent;
      c.fillText('You are here', cx, y - r * 1.6);
    }
    c.textAlign = 'left';
  });
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
    numberDisc(
      c,
      b.number,
      pad + h * 0.075,
      h * 0.1,
      h * 0.07,
      '#ffffff',
      BRAND.colours.main,
    );
    c.fillStyle = '#ffffff';
    c.font = font(h * 0.075, 800);
    c.fillText(b.title, pad + h * 0.18, h * 0.105);
    c.font = font(h * 0.035, 500);
    c.fillText(b.subject, pad + h * 0.18, h * 0.16);
    drawBrandMark(c, PLANTROOMS, w - pad - h * 0.045, h * 0.1, h * 0.05);
    c.fillStyle = BRAND.colours.accent;
    c.font = font(h * 0.034, 800);
    c.fillText('EXHIBIT COMING SOON', pad, h * 0.26);
    let y = h * 0.31;
    c.fillStyle = BRAND.colours.ink;
    y =
      paragraph(c, b.willShow, pad, y, w - 2 * pad, h * 0.025, 500) + h * 0.01;
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

/** Over an archway, on this room's side: where it leads. */
function paintArchHeader(from: MuseumHallId, a: MuseumArch) {
  const b = HALL_BRIEFS[a.to];
  const fromWelcome = from === 'museum0';
  const toWelcome = a.to === 'museum0';
  const kicker = fromWelcome
    ? a.onward
      ? 'THROUGH HERE'
      : 'THE ROUTE ENDS HERE'
    : toWelcome
      ? a.onward
        ? 'THE WAY OUT · BACK TO THE'
        : 'BACK TO THE'
      : a.onward
        ? 'NEXT EXHIBIT'
        : 'BACK TO';
  const title =
    fromWelcome && a.onward
      ? 'What’s behind the tiles'
      : toWelcome
        ? 'Welcome hall'
        : b.title;
  const subject =
    fromWelcome && a.onward ? `1 · ${HALL_BRIEFS.museum1.title}` : b.subject;
  const mark = (fromWelcome && a.onward) || toWelcome;
  const forward = a.onward;
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = forward ? BRAND.colours.main : BRAND.colours.ground;
    c.fillRect(0, 0, w, h);
    const ink = forward ? '#ffffff' : BRAND.colours.ink;
    if (mark) drawBrandMark(c, PLANTROOMS, h * 0.5, h * 0.5, h * 0.34);
    else
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
    c.fillText(kicker, h * 1.0, h * 0.33);
    let size = h * 0.36;
    c.font = font(size, 800);
    const room = w - h * 2.0;
    if (c.measureText(title).width > room) {
      size *= room / c.measureText(title).width;
      c.font = font(size, 800);
    }
    c.fillText(title, h * 1.0, h * 0.68);
    c.font = font(h * 0.15, 500);
    c.fillText(subject, h * 1.0, h * 0.88);
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

/** A hall's own title, big, on its street wall, as gallery vinyl: its dark lettering white on a black box's wall. */
function paintHallTitle(id: MuseumHallId, onBlack = false) {
  const b = HALL_BRIEFS[id];
  const ink = onBlack ? '#f2f1ec' : BRAND.colours.ink;
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = BRAND.colours.main;
    c.font = font(h * 0.62, 800);
    c.fillText(String(b.number), 0, h * 0.62);
    const nw = c.measureText(String(b.number)).width + h * 0.12;
    c.fillStyle = ink;
    let size = h * 0.3;
    c.font = font(size, 800);
    if (c.measureText(b.title).width > w - nw) {
      size *= (w - nw) / c.measureText(b.title).width;
      c.font = font(size, 800);
    }
    c.fillText(b.title, nw, h * 0.42);
    c.fillStyle = BRAND.colours.main;
    c.font = font(h * 0.13, 600);
    c.fillText(b.subject, nw, h * 0.62);
    c.fillStyle = BRAND.colours.accent;
    c.fillRect(nw, h * 0.72, h * 0.6, h * 0.035);
    c.fillStyle = ink;
    c.font = font(h * 0.08, 600);
    c.fillText(`${BRAND.name} · ${BRAND.subtitle}`, nw, h * 0.86);
  };
}

/** Hall 0's title wall: the exhibition at its loudest, and the welcome. */
function paintTitleWall(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = BRAND.colours.ground;
  c.fillRect(0, 0, w, h);
  const s = h / 10;
  // A pale aqua band along the top, like a pool's tile line.
  c.fillStyle = BRAND.colours.soft;
  c.fillRect(0, 0, w, s * 0.5);
  drawBrandMark(c, PLANTROOMS, s * 1.9, s * 2.4, s * 1.35);
  const ww = drawWordmark(c, s * 3.8, s * 1.15, s * 1.35);
  c.fillStyle = BRAND.colours.main;
  c.font = font(s * 0.62, 700);
  c.fillText(BRAND.strapline, s * 3.8, s * 3.55);
  c.fillStyle = BRAND.colours.accent;
  c.font = font(s * 0.42, 800);
  c.fillText(`${BRAND.tagline}  ${BRAND.hashtag}`, s * 3.8 + 0, s * 4.3);
  c.fillStyle = BRAND.colours.ink;
  const text = [
    'There is almost nothing we take for granted more than a swimming pool. Its user interface is the simplest there could be: dive in, and the water is simply there, clean, clear and warm.',
    'Behind the tiles lives a world of complexity: pumps, filters, boilers and careful chemistry, working all day and all night to keep it that simple. Come and see it.',
  ];
  let y = s * 5.3;
  for (const t of text)
    y =
      paragraph(c, t, s * 3.8, y, Math.max(ww, w * 0.62), s * 0.42, 500) +
      s * 0.1;
  c.fillStyle = BRAND.colours.main;
  c.font = font(s * 0.28, 700);
  c.fillText(
    `${BRAND.museum.toUpperCase()} · ${BRAND.museumLine.toUpperCase()}`,
    s * 3.8,
    s * 9.3,
  );
  c.fillStyle = BRAND.colours.ink;
  c.font = font(s * 0.26, 500);
  c.fillText(BRAND.wink, s * 3.8 + w * 0.32, s * 9.3);
}

/** Hall 0's welcome panel. */
function paintWelcome(c: CanvasRenderingContext2D, w: number, h: number) {
  const b = HALL_BRIEFS.museum0;
  c.fillStyle = BRAND.colours.ground;
  c.fillRect(0, 0, w, h);
  c.fillStyle = BRAND.colours.main;
  c.fillRect(0, 0, w, h * 0.2);
  const pad = w * 0.06;
  drawBrandMark(c, PLANTROOMS, pad + h * 0.07, h * 0.1, h * 0.07);
  c.fillStyle = '#ffffff';
  c.font = font(h * 0.07, 800);
  c.fillText('Welcome', pad + h * 0.18, h * 0.1);
  c.font = font(h * 0.032, 600);
  c.fillText(`${BRAND.name} · ${BRAND.subtitle}`, pad + h * 0.18, h * 0.155);
  let y = h * 0.27;
  c.fillStyle = BRAND.colours.ink;
  y = paragraph(c, b.willShow, pad, y, w - 2 * pad, h * 0.027, 500) + h * 0.02;
  c.fillStyle = BRAND.colours.soft;
  c.fillRect(pad, y, w - 2 * pad, h * 0.13);
  c.fillStyle = BRAND.colours.main;
  c.font = font(h * 0.022, 800);
  c.fillText('THE BIG IDEA', pad + h * 0.03, y + h * 0.04);
  c.fillStyle = BRAND.colours.ink;
  paragraph(
    c,
    b.bigIdea,
    pad + h * 0.03,
    y + h * 0.08,
    w - 2 * pad - h * 0.06,
    h * 0.027,
    700,
  );
  y += h * 0.18;
  c.fillStyle = BRAND.colours.accent;
  c.font = font(h * 0.022, 800);
  c.fillText('TRY THIS FIRST', pad, y);
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
        h * 0.025,
        500,
      ) +
      h * 0.008;
  }
  c.fillStyle = BRAND.colours.ink;
  c.font = font(h * 0.022, 700);
  c.fillText(
    'THE ROUTE: FIVE HALLS ROUND THE COURTYARD, AND BACK HERE',
    pad,
    h * 0.8,
  );
  routeStrip(c, null, pad, h * 0.86, w - 2 * pad);
}

/** A banner hung from the ceiling: the brand, tall. */
function paintBanner(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = BRAND.colours.main;
  c.fillRect(0, 0, w, h);
  c.fillStyle = BRAND.colours.soft;
  for (let y = 0; y < h; y += w / 4) c.fillRect(0, y, w, 2);
  drawBrandMark(c, PLANTROOMS, w / 2, w * 0.55, w * 0.34, BRAND.colours.main);
  c.save();
  c.translate(w * 0.62, h * 0.93);
  c.rotate(-Math.PI / 2);
  c.fillStyle = '#ffffff';
  let size = w * 0.42;
  c.font = font(size, 800);
  const room = h * 0.93 - w * 1.05;
  if (c.measureText(BRAND.name).width > room) {
    size *= room / c.measureText(BRAND.name).width;
    c.font = font(size, 800);
  }
  c.fillText(BRAND.name, 0, 0);
  c.restore();
  c.fillStyle = '#ffffff';
  c.font = font(w * 0.075, 700);
  c.textAlign = 'center';
  c.fillText(BRAND.hashtag, w / 2, h - w * 0.06);
  c.textAlign = 'left';
}

/** Hall 9's end of the route, the closing wall (107e; the owner's message, 2026-10-28). */
function paintEndWall(c: CanvasRenderingContext2D, w: number, h: number) {
  const W = CLOSING_WALL;
  c.fillStyle = BRAND.colours.ground;
  c.fillRect(0, 0, w, h);
  c.fillStyle = BRAND.colours.main;
  c.fillRect(0, 0, w * 0.02, h);
  const x = w * 0.05;
  const span = w * 0.9;
  c.fillStyle = BRAND.colours.ink;
  let y = paragraph(c, W.headline, x, h * 0.12, span, h * 0.075, 800);
  c.fillStyle = BRAND.colours.main;
  y = paragraph(c, W.message, x, y + h * 0.03, span, h * 0.06, 700);
  c.fillStyle = BRAND.colours.ink;
  y = paragraph(c, W.paragraph, x, y + h * 0.03, span, h * 0.032, 500);
  y = paragraph(c, W.wayOn, x, y + h * 0.03, span, h * 0.036, 700);
  c.fillStyle = '#4c5a62';
  paragraph(c, W.wink, x, y + h * 0.005, span, h * 0.03, 500);
  drawBrandMark(c, PLANTROOMS, x + h * 0.05, h * 0.9, h * 0.05);
  c.fillStyle = BRAND.colours.accent;
  c.font = font(h * 0.05, 800);
  c.fillText(BRAND.hashtag, x + h * 0.14, h * 0.92);
}

export interface MuseumHall {
  group: Group;
  /** Its finishes, shared with the empty halls drawn beyond it (`museum-empty-hall.ts`). */
  materials: MuseumMaterials;
  /** Step what moves in the hall itself (Hall 0's projector); nothing elsewhere. */
  update(delta: number): void;
  dispose(): void;
}

/** A sign on a wall, facing into the room, in the museum's coordinates: at `u` along the wall, `y` up. */
function onWall(mesh: Mesh, wall: HallWall, u: number, y: number, off = 0.015) {
  const n: readonly [number, number] = [-wall.out[0], -wall.out[1]];
  const through = MUSEUM_WALL / 2 + off;
  if (wall.axis === 'x') mesh.position.set(u, y, wall.line + n[1] * through);
  else mesh.position.set(wall.line + n[0] * through, y, u);
  mesh.rotation.y = Math.atan2(n[0], n[1]);
}

/** How far Hall 0's title wall stands off their walls, on the cove light behind them (the owner, 2026-10-28). */
export const POSTER_STANDOFF = 0.05;

/**
 * Stand a poster off its wall and light it from behind: a thin dark
 * backing between it and the wall, and a warm white glow (the cove LED
 * strip's) on the wall round its edges; its face lit a little more, as
 * by the spill. `mesh` is placed already, `POSTER_STANDOFF` off the wall.
 */
function coveLit(
  mesh: Mesh,
  w: number,
  h: number,
  textures: Texture[],
  disposables: Material[],
) {
  (mesh.material as MeshStandardMaterial).emissiveIntensity = 0.55;
  const glowMap = posterGlowTexture(w, h);
  textures.push(glowMap);
  const glowMaterial = new MeshBasicMaterial({
    map: glowMap,
    color: '#ffffff',
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  disposables.push(glowMaterial);
  const m = POSTER_GLOW_MARGIN;
  const glow = new Mesh(new PlaneGeometry(w + 2 * m, h + 2 * m), glowMaterial);
  glow.name = 'Poster cove glow';
  glow.position.z = -(POSTER_STANDOFF - 0.004);
  const backingMaterial = new MeshStandardMaterial({
    color: '#1c1d1f',
    roughness: 0.8,
  });
  disposables.push(backingMaterial);
  const backing = new Mesh(
    new BoxGeometry(w - 0.12, h - 0.12, POSTER_STANDOFF - 0.01),
    backingMaterial,
  );
  backing.position.z = -POSTER_STANDOFF / 2;
  mesh.add(glow, backing);
}

/**
 * The cove glow round Hall 0's title wall, as warm strips on the wall, for
 * the hall drawn empty from afar (`museum-empty-hall.ts`), in the museum's
 * coordinates: its posters are not drawn there, their light is.
 */
export function hall0PosterGlowGeometry(): BufferGeometry[] {
  const south = hallWalls('museum0').find((w) => w.side === 'south')!;
  const [w, h, y] = [10.4, 3.4, 2.45];
  const band = 0.05;
  const out: BufferGeometry[] = [];
  for (const [u, v, sw, sh] of [
    [0, h / 2 + band / 2, w + 2 * band, band],
    [0, -h / 2 - band / 2, w + 2 * band, band],
    [-w / 2 - band / 2, 0, band, h],
    [w / 2 + band / 2, 0, band, h],
  ]) {
    const strip = new Mesh(new PlaneGeometry(sw, sh));
    onWall(strip, south, (south.from + south.to) / 2, y, 0.01);
    strip.translateX(u);
    strip.translateY(v);
    strip.updateMatrix();
    strip.geometry.applyMatrix4(strip.matrix);
    out.push(strip.geometry);
  }
  return out;
}

/** Build room `id`, in metres (scale the group by the scene's metre), in its own coordinates. */
export function createMuseumHall(
  id: MuseumHallId,
  density = 0.8,
  /** The hall this is drawn from, if a neighbour's copy: its lift opening cut through a shared wall (mission 108). */
  viewer: MuseumHallId = id,
): MuseumHall {
  const m = createMuseumMaterials();
  const textures: Texture[] = [...m.textures];
  const disposables: Material[] = [];
  const group = new Group();
  group.name = id;
  const o = hallOrigin(id);
  // Everything laid out in the museum's coordinates, moved to the room's.
  const plan = new Group();
  plan.position.set(-o.x, 0, -o.z);
  group.add(plan);
  const { h } = hallSize(id);
  const t = MUSEUM_WALL;
  const bounds = hallBounds(id);
  const inner = hallInterior(id);
  const welcome = id === 'museum0';
  const blackBox = isBlackBox(id);
  const arches = hallArches(id);
  let projector: ReturnType<typeof createCausticsProjector> | null = null;

  // The floor, out to its wall lines, laid from the museum's origin; Hall 0's painted once.
  const floorGeometry = new PlaneGeometry(
    bounds.maxX - bounds.minX,
    bounds.maxZ - bounds.minZ,
  );
  floorGeometry.rotateX(-Math.PI / 2);
  floorGeometry.translate(
    (bounds.minX + bounds.maxX) / 2,
    0,
    (bounds.minZ + bounds.maxZ) / 2,
  );
  let floorMaterial = m.floor;
  if (welcome) {
    const paint = paintedFloorTexture(
      bounds.maxX - bounds.minX,
      bounds.maxZ - bounds.minZ,
    );
    textures.push(paint);
    floorMaterial = new MeshStandardMaterial({ map: paint, roughness: 0.5 });
    disposables.push(floorMaterial);
  } else if (blackBox) {
    floorMaterial = new MeshStandardMaterial({
      color: BLACK_BOX.floor,
      roughness: 0.9,
    });
    disposables.push(floorMaterial);
  } else {
    const pos = floorGeometry.attributes.position;
    const uv = floorGeometry.attributes.uv;
    for (let i = 0; i < pos.count; i++)
      uv.setXY(i, pos.getX(i) / FLOOR_TILE, -pos.getZ(i) / FLOOR_TILE);
  }
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.name = welcome
    ? 'Painted pool floor'
    : blackBox
      ? 'Black floor'
      : 'Polished concrete floor';
  plan.add(floor);

  // The vinyl arrows by every archway, showing the way round.
  const arrowMap = floorArrowTexture(BRAND.colours.accent);
  textures.push(arrowMap);
  const arrowMaterial = lifebuoyStickerMaterial(arrowMap);
  disposables.push(arrowMaterial);
  const arrows = new Mesh(floorArrowGeometry(id), arrowMaterial);
  arrows.name = 'Floor arrow stickers';
  arrows.renderOrder = 1;
  // Hall 5's painted poolside lies 2 mm up: what stands on it is lifted with it.
  const onDeck = id === 'museum5' ? DECK_LIFT : 0;
  arrows.position.y = onDeck;
  plan.add(arrows);

  // Its two corridors (layout C), in its own coordinates: plain board-
  // marked concrete, square in section, a hard corner (the owner,
  // 2026-10-30: "big and industrial ... a little bit more brutalist"),
  // on the halls' polished floor; the hall beyond builds the same.
  const concrete = new MeshStandardMaterial({
    color: '#a3a19c',
    roughness: 0.92,
  });
  disposables.push(concrete);
  const corridorBulb = new MeshBasicMaterial({
    color: new Color(2.2, 2.0, 1.7),
  });
  corridorBulb.toneMapped = false;
  disposables.push(corridorBulb);
  const pendantSets: ReturnType<typeof createPendantLamps>[] = [];
  for (const c of hallCorridors(id)) {
    const run = new Group();
    run.name = `Corridor to ${c.to}`;
    const H = CORRIDOR.height;
    const slabs: BufferGeometry[] = [];
    for (const w of c.walls) {
      const g = new BoxGeometry(w.maxX - w.minX, H, w.maxZ - w.minZ);
      g.translate((w.minX + w.maxX) / 2, H / 2, (w.minZ + w.maxZ) / 2);
      slabs.push(g);
    }
    // The ceiling, a slab over each leg, the corner under the first.
    for (const f of c.floor) {
      const g = new BoxGeometry(f.maxX - f.minX, 0.3, f.maxZ - f.minZ);
      g.translate((f.minX + f.maxX) / 2, H + 0.15, (f.minZ + f.maxZ) / 2);
      slabs.push(g);
    }
    run.add(new Mesh(mergeGeometries(slabs), concrete));
    for (const g of slabs) g.dispose();
    const floors = c.floor.map((f) => {
      const g = new PlaneGeometry(f.maxX - f.minX, f.maxZ - f.minZ);
      g.rotateX(-Math.PI / 2);
      g.translate((f.minX + f.maxX) / 2, 0.002, (f.minZ + f.maxZ) / 2);
      // Laid from the museum's origin, as the halls' floors are.
      const pos = g.attributes.position;
      const uv = g.attributes.uv;
      for (let k = 0; k < pos.count; k++)
        uv.setXY(
          k,
          (pos.getX(k) + o.x) / FLOOR_TILE,
          -(pos.getZ(k) + o.z) / FLOOR_TILE,
        );
      return g;
    });
    run.add(new Mesh(mergeGeometries(floors), m.floor));
    for (const g of floors) g.dispose();
    // A pendant in each leg (the owner, 2026-10-30: "a pair of industrial
    // lights in each, one in each leg"), the Encabulator's, on its chain
    // from the ceiling, each with a warm light of short reach.
    const places = c.floor.map((f) => ({
      x: (f.minX + f.maxX) / 2,
      z: (f.minZ + f.maxZ) / 2,
      y: CORRIDOR_LAMP.rim,
      top: H,
      size: CORRIDOR_LAMP.size,
    }));
    const lamps = createPendantLamps(places, corridorBulb);
    run.add(lamps.group);
    pendantSets.push(lamps);
    for (const p of places) {
      const light = new PointLight('#ffd9a8', 6, 9, 2);
      light.position.set(p.x, p.y - 0.2, p.z);
      run.add(light);
    }
    group.add(run);
  }

  // The walls, each as the plan has it; the courtyard and street windows glazed.
  const bars: BufferGeometry[] = [];
  for (const wall of hallWalls(id)) {
    const openings = openingsOn(id, wall, viewer);
    const windows = wallWindows(id, wall);
    const beyond = beyondAt(wall, (wall.from + wall.to) / 2);
    const tiledBoth = welcome && beyond !== 'hall';
    plan.add(
      wallRun(
        wall.axis,
        wall.line,
        wall.from - t / 2,
        wall.to + t / 2,
        openings,
        windows,
        tiledBoth ? m.tile : m.paint,
        tiledBoth ? m.tile : m.rawBrick,
        m.archGreen,
      ),
    );
    for (const w of windows) glaze(m, wall, w, plan, bars);
  }
  if (welcome) {
    // Pool-hall trim: coloured bands of tiles and a tiled cove (107-1).
    const trim = hall0TrimGeometry();
    trim.bands.forEach((list, k) => {
      const band = new MeshStandardMaterial({
        color: HALL0_BANDS[k].colour,
        roughness: 0.25,
      });
      disposables.push(band);
      plan.add(new Mesh(mergeGeometries(list), band));
      for (const g of list) g.dispose();
    });
    plan.add(
      new Mesh(
        mergeGeometries(
          trim.coves.map((g) => (g.index ? g.toNonIndexed() : g)),
        ),
        m.tile,
      ),
    );
    for (const g of trim.coves) g.dispose();
    const stickerMap = lifebuoyStickerTexture();
    textures.push(stickerMap);
    const stickerMaterial = lifebuoyStickerMaterial(stickerMap);
    disposables.push(stickerMaterial);
    const sticker = new Mesh(lifebuoyStickerGeometry(), stickerMaterial);
    sticker.name = 'Lifebuoy sticker';
    sticker.renderOrder = 1;
    plan.add(sticker);
  }
  if (blackBox) {
    // The brick painted matt black on its inside faces, a sheet a few
    // millimetres proud, so the wall the next hall builds alike never
    // fights it; and the roof deck black too.
    const black = new MeshStandardMaterial({
      color: BLACK_BOX.walls,
      roughness: 0.95,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    disposables.push(black);
    plan.add(
      new Mesh(
        mergeGeometries(hallWalls(id).map((w) => blackBoxSheet(id, w))),
        black,
      ),
    );
    const deck = new PlaneGeometry(
      bounds.maxX - bounds.minX,
      bounds.maxZ - bounds.minZ,
    );
    deck.rotateX(Math.PI / 2);
    deck.translate(
      (bounds.minX + bounds.maxX) / 2,
      h,
      (bounds.minZ + bounds.maxZ) / 2,
    );
    const deckMaterial = new MeshStandardMaterial({
      color: BLACK_BOX.deck,
      roughness: 0.95,
    });
    disposables.push(deckMaterial);
    const roof = new Mesh(deck, deckMaterial);
    roof.name = 'Black roof deck';
    plan.add(roof);
  }
  if (bars.length) {
    plan.add(new Mesh(mergeGeometries(bars), m.steel));
    for (const b of bars) b.dispose();
  }

  const along = hallAxes(id);
  const alongX = Math.abs(along.along[0]) > 0.5;
  const localInner = {
    minX: inner.minX - o.x,
    maxX: inner.maxX - o.x,
    minZ: inner.minZ - o.z,
    maxZ: inner.maxZ - o.z,
  };

  if (!welcome && !blackBox) {
    // The roof deck, its two steel beams along the hall, and the services under it.
    const hx = (localInner.maxX - localInner.minX) / 2;
    const hz = (localInner.maxZ - localInner.minZ) / 2;
    const [cw, cd] = alongX ? [hz, hx] : [hx, hz];
    const columns = hallColumns(id);
    const { group: ceiling } = createServiceCeiling(
      { minX: -cw, maxX: cw, minZ: -cd, maxZ: cd, deckY: h },
      {
        seed: MUSEUM_EXHIBITS.indexOf(id) + 31,
        density,
        beamEvery: cw,
        keepClear: columns.map((c) => {
          const [x, z] = alongX ? [-c.z, c.x] : [c.x, c.z];
          return {
            layers: ['deck', 'top', 'pipes', 'air', 'cables', 'ladder'],
            box: { minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 },
          };
        }),
      },
    );
    // Turned for a hall along x: its beams then run along the hall.
    if (alongX) ceiling.rotation.y = Math.PI / 2;
    group.add(ceiling);

    // The cast-iron columns, up to the beams, merged.
    const columnTop = h - BEAM_DEPTH;
    const shafts: BufferGeometry[] = [];
    for (const c of columns) {
      const base = new BoxGeometry(COLUMN_FOOT * 2, 0.4, COLUMN_FOOT * 2);
      base.translate(c.x, 0.2, c.z);
      const plinth = new CylinderGeometry(0.17, 0.2, 0.25, 16);
      plinth.translate(c.x, 0.52, c.z);
      const shaft = new CylinderGeometry(0.12, 0.14, columnTop - 1.2, 16);
      shaft.translate(c.x, 0.65 + (columnTop - 1.2) / 2, c.z);
      const capital = new CylinderGeometry(0.3, 0.13, 0.5, 16);
      capital.translate(c.x, columnTop - 0.35, c.z);
      const abacus = new BoxGeometry(0.66, 0.12, 0.66);
      abacus.translate(c.x, columnTop - 0.06, c.z);
      shafts.push(base, plinth, shaft, capital, abacus);
    }
    if (shafts.length) {
      group.add(new Mesh(mergeGeometries(shafts), m.iron));
      for (const g of shafts) g.dispose();
    }

    // Gallery track lighting: two tracks along the hall, a head every 2 m.
    const trackY = h - 2.4;
    const tracks: BufferGeometry[] = [];
    const lamps: BufferGeometry[] = [];
    const len = along.length;
    for (const side of [-1, 1]) {
      const across = side * (along.width / 4 + 1);
      const at = (s: number) => ({
        x: along.along[0] * s + along.across[0] * across,
        z: along.along[1] * s + along.across[1] * across,
      });
      const mid = at(0);
      const track = new BoxGeometry(
        alongX ? len - 2 : 0.05,
        0.04,
        alongX ? 0.05 : len - 2,
      );
      track.translate(mid.x, trackY, mid.z);
      tracks.push(track);
      for (const s of [-len / 2 + 1.5, len / 2 - 1.5]) {
        const p = at(s);
        const rod = new CylinderGeometry(0.008, 0.008, h - trackY, 6);
        rod.translate(p.x, trackY + (h - trackY) / 2, p.z);
        tracks.push(rod);
      }
      for (let s = -len / 2 + 2; s <= len / 2 - 2; s += 2) {
        const p = at(s);
        const head = new CylinderGeometry(0.055, 0.045, 0.2, 12);
        head.translate(p.x, trackY - 0.12, p.z);
        tracks.push(head);
        const face = new CylinderGeometry(0.046, 0.046, 0.01, 12);
        face.translate(p.x, trackY - 0.225, p.z);
        lamps.push(face);
      }
    }
    group.add(new Mesh(mergeGeometries(tracks), m.steel));
    group.add(new Mesh(mergeGeometries(lamps), m.lamp));
    for (const g of [...tracks, ...lamps]) g.dispose();

    // Benches: an oak slab on two black steel frames, along the hall.
    const benchParts: BufferGeometry[] = [];
    const frames: BufferGeometry[] = [];
    for (const b of hallBenches(id)) {
      const seat = new BoxGeometry(BENCH.w, 0.06, BENCH.l);
      if (alongX) seat.rotateY(Math.PI / 2);
      seat.translate(b.x, BENCH.h - 0.03, b.z);
      benchParts.push(seat);
      for (const end of [-1, 1]) {
        const leg = new BoxGeometry(BENCH.w - 0.06, BENCH.h - 0.06, 0.05);
        leg.translate(0, (BENCH.h - 0.06) / 2, end * (BENCH.l / 2 - 0.2));
        if (alongX) leg.rotateY(Math.PI / 2);
        leg.translate(b.x, 0, b.z);
        frames.push(leg);
      }
    }
    // None in a hall whose floor is its exhibit's (107-0).
    if (benchParts.length) {
      group.add(new Mesh(mergeGeometries(benchParts), m.oak));
      group.add(new Mesh(mergeGeometries(frames), m.steel));
    }
    for (const g of [...benchParts, ...frames]) g.dispose();
  } else if (welcome) {
    // Hall 0: a tiled ceiling, its fluorescent strips, and the fake ladder.
    const lid = new PlaneGeometry(
      localInner.maxX - localInner.minX,
      localInner.maxZ - localInner.minZ,
    );
    lid.rotateX(Math.PI / 2);
    const lp = lid.attributes.position;
    const lu = lid.attributes.uv;
    for (let i = 0; i < lp.count; i++)
      lu.setXY(
        i,
        (lp.getX(i) + o.x) / TILE_REPEAT,
        (lp.getZ(i) + o.z) / TILE_REPEAT,
      );
    // The tile material repeats by its own texture's repeat: UVs here are in repeats already.
    const lidMaterial = m.tile.clone();
    lidMaterial.map = m.tile.map!.clone();
    lidMaterial.map.repeat.set(1, 1);
    lidMaterial.map.needsUpdate = true;
    textures.push(lidMaterial.map);
    disposables.push(lidMaterial);
    const ceiling = new Mesh(lid, lidMaterial);
    ceiling.position.y = h;
    group.add(ceiling);
    const strips: BufferGeometry[] = [];
    for (let x = -4.5; x <= 4.5; x += 3)
      for (const z of [-4, 0, 4]) {
        const g = new BoxGeometry(0.22, 0.05, 1.5);
        g.translate(x, h - 0.03, z);
        strips.push(g);
      }
    // Dimmed: the room darkened, the projected pool its main light.
    const dimmed = m.fluorescent.clone();
    dimmed.emissiveIntensity = 0.12;
    dimmed.color.set('#7d8580');
    disposables.push(dimmed);
    group.add(new Mesh(mergeGeometries(strips), dimmed));
    for (const g of strips) g.dispose();
    // The ladder: two rails rising from the deck, over the painted edge,
    // down into the "pool", and simply stopping at the floor; two treads.
    const l = hall0Ladder();
    const rails: BufferGeometry[] = [];
    for (const side of [-0.25, 0.25]) {
      const curve = new CatmullRomCurve3([
        new Vector3(l.x + side, 0, l.z - 0.55),
        new Vector3(l.x + side, 0.85, l.z - 0.5),
        new Vector3(l.x + side, 1.05, l.z - 0.25),
        new Vector3(l.x + side, 0.95, l.z + 0.05),
        new Vector3(l.x + side, 0.6, l.z + 0.18),
        new Vector3(l.x + side, 0, l.z + 0.22),
      ]);
      rails.push(new TubeGeometry(curve, 40, 0.022, 10, false));
    }
    for (const y of [0.25, 0.55]) {
      const tread = new BoxGeometry(0.46, 0.03, 0.12);
      tread.translate(l.x, y, l.z + 0.2);
      rails.push(tread);
    }
    group.add(new Mesh(mergeGeometries(rails), m.chrome));
    for (const g of rails) g.dispose();
    // Two banners from the ceiling, near the title wall.
    for (const x of [-5.6, 5.6]) {
      const banner = signMesh(1.1, 2.6, paintBanner, textures, 220);
      (banner.material as MeshStandardMaterial).side = DoubleSide;
      banner.position.set(x, h - 1.5, localInner.maxZ - 1.2);
      banner.rotation.y = Math.PI;
      group.add(banner);
    }
    // The projector overhead, throwing caustics on the white pool.
    projector = createCausticsProjector(h, PAINTED_POOL, PAINTED_POOL.lanes);
    group.add(projector.group);
  }

  // The panel: "coming soon" in an exhibit hall still empty, the welcome
  // in Hall 0; none where the exhibit is built (107-0).
  const p = comingSoonPanel(id);
  if (p) {
    const panel = new Group();
    panel.position.set(p.x, 0, p.z);
    panel.rotation.y = p.yaw;
    const boardMaterial = new MeshStandardMaterial({
      color: BRAND.colours.main,
      roughness: 0.7,
    });
    disposables.push(boardMaterial);
    const board = new Mesh(
      new BoxGeometry(PANEL.w, PANEL.h, 0.08),
      boardMaterial,
    );
    board.position.y = 0.15 + PANEL.h / 2;
    panel.add(board);
    const face = signMesh(
      PANEL.w - 0.16,
      PANEL.h - 0.16,
      welcome ? paintWelcome : paintComingSoon(id),
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
  }

  // Signs on the street wall: Hall 0's title wall; an exhibit's own title; Hall 9's end.
  const walls = hallWalls(id);
  const street = walls.find(
    (w) => beyondAt(w, (w.from + w.to) / 2) === 'street',
  );
  if (welcome) {
    const south = walls.find((w) => w.side === 'south')!;
    const wall = signMesh(10.4, 3.4, paintTitleWall, textures, 150);
    onWall(wall, south, (south.from + south.to) / 2, 2.45, POSTER_STANDOFF);
    coveLit(wall, 10.4, 3.4, textures, disposables);
    plan.add(wall);
  } else if (street && id === FINALE) {
    const mid = (street.from + street.to) / 2;
    const title = signMesh(6.0, 2.0, paintHallTitle(id), textures, 170, true);
    onWall(title, street, mid + 3.6, 3.6);
    plan.add(title);
    const end = signMesh(4.6, 2.3, paintEndWall, textures, 220);
    onWall(end, street, mid - 4.0, 2.4);
    plan.add(end);
  } else if (street) {
    const title = signMesh(
      HALL_TITLE.w,
      HALL_TITLE.h,
      paintHallTitle(id, blackBox),
      textures,
      160,
      true,
    );
    onWall(title, street, (street.from + street.to) / 2, HALL_TITLE.y);
    plan.add(title);
  }

  // Over each archway on this side: where it leads.
  for (const a of arches) {
    const sign = signMesh(
      a.kind === 'door' ? 3.6 : 5.2,
      a.kind === 'door' ? 0.8 : 1.1,
      paintArchHeader(id, a),
      textures,
      240,
      false,
      { glossy: BRAND.colours.accent, shadow: true },
    );
    // Over the exit box straight over the archway (`EXIT_OVER_ARCH`).
    const lift = a.kind === 'door' ? 0.55 : 1.25;
    // Over its doorway, but slid along towards the wall's middle as far as
    // it must to clear the corner: a corridor's doorway stands near its
    // wall's end (layout C).
    const signW = a.kind === 'door' ? 3.6 : 5.2;
    const wallOfA = hallWalls(id).find(
      (w) =>
        w.axis === a.axis &&
        Math.abs((w.axis === 'x' ? a.at.z : a.at.x) - w.line) < 1e-9,
    )!;
    const u0 = a.axis === 'x' ? a.at.x : a.at.z;
    const room = signW / 2 + t / 2 + 0.3;
    const u = Math.min(Math.max(u0, wallOfA.from + room), wallOfA.to - room);
    // Flat on the wall, no cove glow: only the title wall has that (the
    // owner, 2026-10-28); lit a little from within to read in the dim hall.
    const off = 0.015;
    sign.position.set(
      (a.axis === 'x' ? u : a.at.x) + a.into[0] * (t / 2 + off),
      a.top + lift,
      (a.axis === 'z' ? u : a.at.z) + a.into[1] * (t / 2 + off),
    );
    sign.rotation.y = Math.atan2(a.into[0], a.into[1]);
    if (welcome)
      (sign.material as MeshStandardMaterial).emissiveIntensity = 0.55;
    plan.add(sign);
  }

  for (const child of [...group.children, ...plan.children])
    markComponent(child, { decorative: true });
  // The projector works: named, its status its LED's.
  if (projector)
    markComponent(projector.group, {
      name: projector.group.name,
      status: () => projector?.status(),
    });
  // The safety and services layer: sockets, the fire alarm, escape signs, and the rest.
  const safety = createMuseumSafety(id);
  safety.group.position.y = onDeck;
  plan.add(safety.group);
  group.updateMatrixWorld(true);
  safety.merge();
  group.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
  return {
    group,
    materials: m,
    update(delta) {
      projector?.update(delta);
    },
    dispose() {
      group.traverse((obj) => {
        if (obj instanceof Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          for (const mat of mats as Material[]) mat.dispose();
        }
      });
      for (const mat of disposables) mat.dispose();
      for (const tex of textures) tex.dispose();
      safety.dispose();
      projector?.dispose();
      for (const lamps of pendantSets) lamps.dispose();
    },
  };
}
