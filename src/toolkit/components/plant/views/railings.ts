import {
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  DoubleSide,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { plantTools } from './plant-tools';

/**
 * Railings and access, after BS EN ISO 14122 (permanent means of access
 * to machinery), in metres, on the floor at their origin facing +z:
 *
 * - a guard rail: a 1.1 m top rail, a knee rail halfway, a 150 mm toe
 *   board and posts at most 1.5 m apart (part 3), in 42.4 mm tube joined
 *   by key-clamp fittings (tees, elbows, base flanges), galvanised steel
 *   or aluminium;
 * - a fixed ladder with its safety cage (part 4): rungs 300 mm apart,
 *   450 mm between the stiles, hoops from 2.4 m, 700 mm deep, with
 *   vertical bars at most 300 mm apart;
 * - floor and platform surfaces: open steel grating (30 × 30 mm mesh),
 *   steel chequer plate and GRP grating, which the pool's corrosive air
 *   suits better.
 */

export type RailFinish = 'galvanised' | 'aluminium';

const TUBE = 0.0424 / 2;

const RAIL_COLOUR: Record<RailFinish, [string, number, number]> = {
  galvanised: ['#a9afae', 0.42, 0.6],
  aluminium: ['#d4d8db', 0.28, 0.85],
};

export interface GuardRailOptions {
  length: number;
  finish?: RailFinish;
  /** Top rail height, metres (at least 1.1 to BS EN ISO 14122-3). */
  height?: number;
  /** Whether to draw a toe board (needed at a platform's edge). */
  toeBoard?: boolean;
}

/** The number of bays a run needs so that no bay is over 1.5 m. */
export const railBays = (length: number) =>
  Math.max(1, Math.ceil(length / 1.5));

/**
 * A run of guard rail along x from −length/2 to length/2, its posts on
 * base flanges. Reusable wherever the building needs a rail.
 */
export function createGuardRail(kit: PanelKit, options: GuardRailOptions) {
  const {
    length,
    finish = 'galvanised',
    height = 1.1,
    toeBoard = true,
  } = options;
  const t = plantTools(kit);
  const group = new Group();
  const [colour, roughness, metalness] = RAIL_COLOUR[finish];
  const tube = t.paint(colour, roughness, metalness);
  const fitting = t.paint(
    finish === 'aluminium' ? '#c3c8cc' : '#8f9596',
    0.45,
    0.6,
  );
  const bays = railBays(length);
  const half = length / 2;
  for (let i = 0; i <= bays; i++) {
    const x = -half + (length / bays) * i;
    t.rod(group, tube, [x, 0.01, 0], [x, height, 0], TUBE, 14);
    t.box(group, fitting, 0.12, 0.01, 0.12, x, 0.005, 0);
    t.cyl(group, fitting, TUBE + 0.008, 0.06, x, 0.04, 0, 'y', 14);
    // The tee (or elbow at the ends) at the knee rail and the top.
    for (const y of [height / 2, height])
      t.cyl(group, fitting, TUBE + 0.008, 0.09, x, y, 0, 'y', 14);
  }
  for (const y of [height / 2, height])
    t.rod(group, tube, [-half, y, 0], [half, y, 0], TUBE, 14);
  if (toeBoard)
    t.box(group, tube, length, 0.15, 0.006, 0, 0.085, -TUBE - 0.004);
  return group;
}

/** A fixed ladder with safety cage, `rise` metres high, against a wall at z = 0. */
export function createCagedLadder(kit: PanelKit, rise = 4, cage = true) {
  const t = plantTools(kit);
  const group = new Group();
  const steel = t.paint(RAIL_COLOUR.galvanised[0], 0.42, 0.6);
  const off = 0.2;
  for (const x of [-0.225 - 0.03, 0.225 + 0.03])
    t.box(group, steel, 0.012, rise + 1.1, 0.065, x, (rise + 1.1) / 2, off);
  for (let y = 0.3; y <= rise; y += 0.3)
    t.rod(group, steel, [-0.255, y, off], [0.255, y, off], 0.0125, 10);
  // Hoops from 2.4 m, every 0.9 m, 700 mm deep from the rungs.
  const depth = 0.7;
  const hoopY: number[] = [];
  if (cage) for (let y = 2.4; y <= rise + 1.0; y += 0.9) hoopY.push(y);
  for (const y of hoopY) {
    const points = 10;
    for (let i = 0; i < points; i++) {
      const a0 = Math.PI * (i / points);
      const a1 = Math.PI * ((i + 1) / points);
      const p = (a: number) =>
        [
          Math.cos(a) * 0.35,
          y,
          off + Math.sin(a) * depth * 0.5 + depth * 0.5 - 0.05,
        ] as const;
      t.rod(group, steel, p(a0), p(a1), 0.008, 6);
    }
  }
  // Vertical bars round the cage, at most 300 mm apart.
  for (let i = 0; hoopY.length > 0 && i <= 6; i++) {
    const a = Math.PI * (i / 6);
    const x = Math.cos(a) * 0.35;
    const z = off + Math.sin(a) * depth * 0.5 + depth * 0.5 - 0.05;
    t.box(
      group,
      steel,
      0.03,
      hoopY[hoopY.length - 1] - hoopY[0],
      0.006,
      x,
      (hoopY[0] + hoopY[hoopY.length - 1]) / 2,
      z,
    );
  }
  // Wall brackets, and the top platform's stile extension.
  for (const y of [0.5, rise / 2, rise])
    for (const x of [-0.255, 0.255])
      t.box(group, steel, 0.012, 0.05, off, x, y, off / 2);
  return group;
}

/** A canvas texture for a surface pattern, `metres` across per repeat. */
function patternMaterial(
  draw: (c: CanvasRenderingContext2D, s: number) => void,
  metres: number,
  roughness: number,
  metalness: number,
  materials: Material[],
) {
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('No 2D canvas context.');
  draw(c, s);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / metres, 1 / metres);
  texture.anisotropy = 8;
  const material = new MeshStandardMaterial({
    map: texture,
    roughness,
    metalness,
    transparent: true,
    alphaTest: 0.5,
  });
  materials.push(material);
  return { material, texture };
}

/**
 * A deck of open steel grating (30 × 30 mm mesh, galvanised), `w` × `d`
 * metres, lying flat with its top at y = 0: what shows through its mesh
 * is whatever is below it.
 */
export function createGratingDeck(kit: PanelKit, w: number, d: number) {
  const { material } = patternMaterial(
    (c, s) => {
      c.clearRect(0, 0, s, s);
      c.fillStyle = '#a9afae';
      const bars = 10;
      for (let i = 0; i < bars; i++) {
        c.fillRect((i / bars) * s, 0, s * 0.05, s);
        c.fillRect(0, (i / bars) * s, s, s * 0.03);
      }
    },
    0.3,
    0.45,
    0.6,
    kit.materials,
  );
  const geometry = new PlaneGeometry(w, d);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  // Seen from below too: from under a gantry, or inside a pit (the
  // owner, 2026-10-26: it vanished from underneath).
  material.side = DoubleSide;
  const deck = new Mesh(geometry, material);
  deck.rotation.x = -Math.PI / 2;
  deck.name = 'Steel grating';
  return deck;
}

/**
 * Three 1 m square surface samples on low stands: open steel grating
 * (30 × 30 mm mesh), steel chequer plate, and GRP grating.
 */
export function createFloorSurfaces(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const samples: [
    string,
    (c: CanvasRenderingContext2D, s: number) => void,
    number,
    number,
    number,
  ][] = [
    [
      'Steel grating\n30 × 30 mesh',
      (c, s) => {
        c.clearRect(0, 0, s, s);
        c.fillStyle = '#a9afae';
        const bars = 10;
        for (let i = 0; i < bars; i++) {
          c.fillRect((i / bars) * s, 0, s * 0.03, s);
          c.fillRect(0, (i / bars) * s, s, s * 0.02);
        }
      },
      0.3,
      0.45,
      0.6,
    ],
    [
      'Chequer plate\n4.5 mm steel',
      (c, s) => {
        c.fillStyle = '#9da3a3';
        c.fillRect(0, 0, s, s);
        c.fillStyle = '#c0c5c5';
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 6; j++) {
            c.save();
            c.translate(((i + 0.5) / 6) * s, ((j + 0.5) / 6) * s);
            c.rotate((i + j) % 2 ? Math.PI / 4 : -Math.PI / 4);
            c.fillRect(-s * 0.05, -s * 0.012, s * 0.1, s * 0.024);
            c.restore();
          }
      },
      0.2,
      0.35,
      0.7,
    ],
    [
      'GRP grating\n38 mm, anti-slip',
      (c, s) => {
        c.clearRect(0, 0, s, s);
        c.fillStyle = '#4f7d4a';
        const bars = 7;
        for (let i = 0; i < bars; i++) {
          c.fillRect((i / bars) * s, 0, s * 0.04, s);
          c.fillRect(0, (i / bars) * s, s, s * 0.04);
        }
      },
      0.27,
      0.7,
      0,
    ],
  ];
  const materials: Material[] = [];
  samples.forEach(([name, draw, metres, roughness, metalness], i) => {
    const x = (i - 1) * 1.3;
    const { material, texture } = patternMaterial(
      draw,
      metres,
      roughness,
      metalness,
      materials,
    );
    kit.textures.push(texture);
    kit.materials.push(material);
    const surface = new Mesh(new PlaneGeometry(1, 1), material);
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(x, 0.2, 0);
    group.add(surface);
    t.box(group, t.paint('#3d4143', 0.6), 1.02, 0.18, 1.02, x, 0.09, 0);
    const label = t.printed(
      0.5,
      0.09,
      (c, w, h) => {
        c.fillStyle = '#eef0ea';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#1f2b31';
        c.font = `bold ${h * 0.3}px ${SANS}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        name
          .split('\n')
          .forEach((line, k) => c.fillText(line, w / 2, h * (0.3 + k * 0.42)));
      },
      256,
    );
    label.mesh.position.set(x, 0.12, 0.515);
    group.add(label.mesh);
  });
  return group;
}
