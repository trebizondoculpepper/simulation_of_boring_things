import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import type { BinShape } from '../logic/bin-toss';
import type { PileBounds } from '../logic/skip-pile';
import { lampLit } from '../logic/skip-dressing';
import type { GraffitiTag, SkipLamp } from '../logic/skip-dressing';
import { GRAFFITI_ASPECT, graffitiTexture } from './graffiti';
import { anySkipHirer } from '../logic/skip-hirers';
import type { SkipHirer } from '../logic/skip-hirers';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { createSkipLamp } from '../../general-safety/views/skip-lamp';

/**
 * A mini skip, the smallest a builder hires for rubble: a British 2-cubic-
 * yard (1.5 m³) skip at true size, 1.83 m long at the top over sloping
 * ends, 1.22 m long at its floor, 1.22 m wide and 0.91 m tall, welded from
 * steel plate on two floor runners, with a box-section top rail, vertical
 * stiffeners down its sides, four lifting lugs for the lorry's chains and
 * red-and-yellow marker boards on its ends. Chipped yellow paint over
 * rust, its inside scraped back to bare, rusty steel by years of rubble,
 * under the name of one of our own hire firms, chosen at random
 * (`src/toolkit/components/site-dressing/logic/skip-hirers.ts`) unless given. Its origin is the middle of the
 * floor under it; it is in metres, its length along x.
 */
const LONG = 1.83;
const FLOOR_LONG = 1.22;
const WIDE = 1.22;
const HIGH = 0.91;
/** The skip's floor plate stands on its runners this high. */
const LIFT = 0.07;
const PLATE = 0.005;
const RAIL = 0.06;
/** The side rails' outer faces, from the middle: their inner faces stand 3 mm proud of the inside plates. */
const RAIL_OUT = WIDE / 2 - PLATE - 0.003 + RAIL;
/** The lifting lugs: how far along, how high, and how thick. */
const LUG_X = 0.62;
const LUG_Y = HIGH - 0.2;
const LUG_RADIUS = 0.035;

/** Where the stiffeners stand along each side, and how wide they are. */
const STIFFENERS = [-0.3, 0.3];
const STIFFENER = 0.07;

/** The skip's inside, plate to plate, for settling things into it (`createSkipPile`). */
export const SKIP_INSIDE: PileBounds = {
  floorHalfX: FLOOR_LONG / 2 - PLATE,
  topHalfX: LONG / 2 - PLATE,
  halfZ: WIDE / 2 - PLATE,
  floor: LIFT + PLATE,
  rim: HIGH,
};

/** The inside of the skip, for `binRest`. */
export const SKIP_SHAPE: BinShape = {
  halfX: FLOOR_LONG / 2 - 0.08,
  halfZ: WIDE / 2 - 0.08,
  floor: LIFT + PLATE,
  rim: HIGH,
  layer: 0.022,
  heap: 0.15,
};

/** A seeded random, so every skip is worn the same way. */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

/**
 * Worn paint: the colour, chipped and scraped to rust at the edges, with
 * runs of rust from the chips, dirt along the bottom and dents' scuffs.
 */
function wornPaint(colour: string, seed: number, bare = false) {
  const size = 512;
  const { context, texture } = createCanvasTexture(size, size);
  const random = seeded(seed);
  context.fillStyle = colour;
  context.fillRect(0, 0, size, size);
  // Mottling.
  for (let i = 0; i < 900; i++) {
    context.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${0.02 + random() * 0.04})`;
    const r = 4 + random() * 22;
    context.beginPath();
    context.arc(random() * size, random() * size, r, 0, Math.PI * 2);
    context.fill();
  }
  // Chips to rust, more of them nearer the edges, with rust running down.
  const chips = bare ? 220 : 26;
  for (let i = 0; i < chips; i++) {
    const edge = random() < 0.6;
    const x = edge
      ? random() < 0.5
        ? random() * 40
        : size - random() * 40
      : random() * size;
    const y = edge && random() < 0.5 ? random() * 40 : random() * size;
    const r = 1.5 + random() * (bare ? 26 : 6);
    context.fillStyle = `rgba(${110 + random() * 40},${55 + random() * 25},${25 + random() * 15},${0.55 + random() * 0.4})`;
    context.beginPath();
    context.ellipse(x, y, r, r * (0.5 + random()), random() * 3, 0, 7);
    context.fill();
    const run = context.createLinearGradient(x, y, x, y + r * 6);
    run.addColorStop(0, `rgba(120,60,25,${bare ? 0.45 : 0.22})`);
    run.addColorStop(1, 'rgba(120,60,25,0)');
    context.fillStyle = run;
    context.fillRect(x - r * 0.3, y, r * 0.6, r * 6);
  }
  // Dirt and scrapes along the bottom, where it is dragged.
  const dirt = context.createLinearGradient(0, size, 0, size * 0.7);
  dirt.addColorStop(0, 'rgba(60,45,30,0.6)');
  dirt.addColorStop(1, 'rgba(60,45,30,0)');
  context.fillStyle = dirt;
  context.fillRect(0, size * 0.7, size, size * 0.3);
  for (let i = 0; i < 40; i++) {
    context.strokeStyle = `rgba(${random() < 0.5 ? '40,30,20' : '200,190,170'},${0.15 + random() * 0.25})`;
    context.lineWidth = 1 + random() * 2;
    const x = random() * size;
    const y = random() * size;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 120, y + (random() - 0.5) * 30);
    context.stroke();
  }
  return texture;
}

/** The marker board on each end: red and yellow diagonal stripes. */
function markerBoard() {
  const { context, texture } = createCanvasTexture(256, 128);
  context.fillStyle = '#f2c21b';
  context.fillRect(0, 0, 256, 128);
  context.fillStyle = '#c8161d';
  for (let x = -128; x < 256; x += 64) {
    context.beginPath();
    context.moveTo(x, 128);
    context.lineTo(x + 32, 128);
    context.lineTo(x + 160, 0);
    context.lineTo(x + 128, 0);
    context.fill();
  }
  return texture;
}

/**
 * A hire firm's name and number, black stencil on clear, stacked to fit
 * the middle panel between the stiffeners: 0.48 × 0.4 m.
 */
function stencil(hirer: SkipHirer) {
  const { context, texture } = createCanvasTexture(480, 400);
  context.fillStyle = '#1a1a18';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const line = (text: string, size: number, y: number) => {
    context.font = `bold ${size}px Impact, "Arial Narrow", sans-serif`;
    context.fillText(text, 240, y, 460);
  };
  const [first, second] = hirer.name;
  if (second) {
    line(first, 112, 75);
    line(second, 88, 185);
  } else line(first, 112, 130);
  context.fillRect(40, 248, 400, 8);
  line(hirer.phone, 64, 320);
  return new MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.7,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}

/** Each kit's lettering, one material for each firm, made when needed. */
const letterings = new WeakMap<PanelKit, Map<SkipHirer, Material>>();
const letteringFor = (kit: PanelKit, hirer: SkipHirer) => {
  let made = letterings.get(kit);
  if (!made) letterings.set(kit, (made = new Map()));
  let material = made.get(hirer);
  if (!material) {
    material = stencil(hirer);
    kit.materials.push(material);
    made.set(hirer, material);
  }
  return material;
};

/**
 * Put `hirer`'s name on a skip (one from `createSkip`, or a clone of
 * one): every skip of a kit shares one lettering per firm.
 */
export function letterSkip(kit: PanelKit, skip: Object3D, hirer: SkipHirer) {
  const lettering = letteringFor(kit, hirer);
  skip.traverse((object) => {
    if (object.userData.skipLettering) (object as Mesh).material = lettering;
  });
}

export function createSkip(kit: PanelKit, hirer = anySkipHirer()) {
  const group = new Group();
  group.name = 'Mini skip';
  const material = (colour: string, seed: number, bare = false) => {
    const paint = new MeshStandardMaterial({
      map: wornPaint(colour, seed, bare),
      roughness: bare ? 0.85 : 0.6,
      metalness: bare ? 0.35 : 0.15,
      side: DoubleSide,
    });
    kit.materials.push(paint);
    return paint;
  };
  const yellow = material('#e2a514', 7);
  const rusty = material('#7a5434', 11, true);
  const steel = kitPaint(kit, '#4a4038', 0.4);
  // The rails and stiffeners, too narrow to show the wear, in plain paint.
  const rails = kitPaint(kit, '#d99c12', 0.15);
  const add = (geometry: BoxGeometry | CylinderGeometry, paint: Material) => {
    const mesh = new Mesh(geometry, paint);
    group.add(mesh);
    return mesh;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    paint: Material = rails,
  ) => {
    const mesh = add(new BoxGeometry(w, h, d), paint);
    mesh.position.set(x, y, z);
    return mesh;
  };

  // The runners it stands and is dragged on, and its floor.
  for (const z of [-0.38, 0.38])
    box(FLOOR_LONG + 0.1, LIFT, 0.08, 0, LIFT / 2, z, steel);
  box(FLOOR_LONG, PLATE, WIDE, 0, LIFT + PLATE / 2, 0, rusty);

  // The sides: a trapezium each, the outside yellow, the inside rust.
  // Their tops stop just under the top rail's top face, hidden inside it,
  // so their edges never lie on its face.
  const top = HIGH - 0.01;
  const topHalf =
    FLOOR_LONG / 2 + ((LONG - FLOOR_LONG) / 2) * ((top - LIFT) / (HIGH - LIFT));
  const side = new Shape();
  side.moveTo(-FLOOR_LONG / 2, LIFT);
  side.lineTo(FLOOR_LONG / 2, LIFT);
  side.lineTo(topHalf, top);
  side.lineTo(-topHalf, top);
  side.closePath();
  const sideGeometry = new ShapeGeometry(side);
  for (const s of [-1, 1]) {
    for (const [paint, inset] of [
      [yellow, 0],
      [rusty, PLATE],
    ] as const) {
      const plate = new Mesh(sideGeometry, paint);
      plate.position.z = s * (WIDE / 2 - inset);
      group.add(plate);
    }
  }

  // The sloping ends, and the marker board on each.
  const slope = Math.atan((LONG - FLOOR_LONG) / 2 / (HIGH - LIFT));
  const endLength = Math.hypot((LONG - FLOOR_LONG) / 2, HIGH - LIFT);
  const marker = new MeshStandardMaterial({
    map: markerBoard(),
    roughness: 0.4,
  });
  kit.materials.push(marker);
  for (const s of [-1, 1]) {
    const x = (s * (FLOOR_LONG + LONG)) / 4;
    const y = (LIFT + HIGH) / 2;
    for (const [paint, inset] of [
      [yellow, 0],
      [rusty, PLATE],
    ] as const) {
      const end = new Mesh(new PlaneGeometry(WIDE, endLength), paint);
      end.position.set(x - s * inset, y, 0);
      end.rotation.set(0, (s * Math.PI) / 2, 0);
      end.rotateX(slope);
      group.add(end);
    }
    const board = new Mesh(new PlaneGeometry(0.5, 0.22), marker);
    board.position.set(x + s * 0.004, y + 0.12, 0);
    board.rotation.set(0, (s * Math.PI) / 2, 0);
    board.rotateX(slope);
    group.add(board);
    // The end's top rail, along the top of its slope, running right
    // across to the side rails' outer faces and a hair past them, so no
    // two faces at the corners lie in one plane (they would flicker).
    box(RAIL, RAIL, 2 * RAIL_OUT + 0.004, (s * LONG) / 2, HIGH - RAIL / 2, 0);
    // A strengthening rib across the end, halfway up.
    const rib = box(0.03, 0.06, WIDE, 0, 0, 0);
    const k = 0.35;
    rib.position.set(
      s * (FLOOR_LONG / 2 + ((LONG - FLOOR_LONG) / 2) * k + 0.015),
      LIFT + (HIGH - LIFT) * k,
      0,
    );
    rib.rotation.z = -s * slope;
  }

  // The top rails along the sides, the side stiffeners, and the lugs.
  for (const s of [-1, 1]) {
    // Between the end rails, its inner face just clear of the inside
    // plate (on one plane they would flicker).
    const z = s * (RAIL_OUT - RAIL / 2);
    box(LONG - RAIL, RAIL, RAIL, 0, HIGH - RAIL / 2, z);
    for (const x of STIFFENERS)
      box(
        STIFFENER,
        HIGH - LIFT - RAIL,
        0.04,
        x,
        (HIGH + LIFT - RAIL) / 2,
        s * (WIDE / 2 + 0.02),
      );
    // A rail along the bottom of each side.
    box(FLOOR_LONG + 0.04, 0.05, 0.04, 0, LIFT + 0.025, s * (WIDE / 2 + 0.02));
    for (const x of [-LUG_X, LUG_X]) {
      const lug = add(
        new CylinderGeometry(LUG_RADIUS, LUG_RADIUS, 0.09, 16),
        steel,
      );
      lug.rotation.x = Math.PI / 2;
      lug.position.set(x, LUG_Y, s * (WIDE / 2 + 0.045));
      const collar = add(new CylinderGeometry(0.055, 0.055, 0.015, 16), steel);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(x, LUG_Y, s * (WIDE / 2 + 0.09));
    }
  }

  // The hire firm's name and number on both sides, stencilled in black
  // on the middle panel, between the stiffeners.
  const lettering = letteringFor(kit, hirer);
  const clear = STIFFENERS[1] - STIFFENER / 2;
  for (const s of [-1, 1]) {
    const panel = new Mesh(
      new PlaneGeometry(2 * clear - 0.05, ((2 * clear - 0.05) * 400) / 480),
      lettering,
    );
    panel.position.set(0, 0.5, s * (WIDE / 2 + 0.003));
    if (s < 0) panel.rotation.y = Math.PI;
    panel.userData.skipLettering = true;
    group.add(panel);
  }
  return { group, shape: SKIP_SHAPE, footprint: { x: LONG, z: WIDE } };
}

const graffitiMaterials = new WeakMap<
  PanelKit,
  Map<string, MeshStandardMaterial>
>();

/** Spray a selected gallery tag on a skip's side, clear of its hire lettering. */
export function addSkipGraffiti(
  kit: PanelKit,
  skip: Object3D,
  tags: readonly GraffitiTag[],
) {
  let materials = graffitiMaterials.get(kit);
  if (!materials) graffitiMaterials.set(kit, (materials = new Map()));
  const fitted = tags.map((tag) => {
    let material = materials.get(tag.art.id);
    if (!material) {
      material = new MeshStandardMaterial({
        map: graffitiTexture(tag.art),
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      materials.set(tag.art.id, material);
      kit.materials.push(material);
    }
    const mesh = new Mesh(
      new PlaneGeometry(tag.size * GRAFFITI_ASPECT, tag.size),
      material,
    );
    mesh.name = `Skip graffiti ${tag.art.title}`;
    mesh.position.set(
      tag.side * 0.59,
      0.47,
      (tag.face === 'front' ? 1 : -1) * (WIDE / 2 + 0.007),
    );
    if (tag.face === 'back') mesh.rotation.y = Math.PI;
    mesh.rotateZ(tag.angle);
    skip.add(mesh);
    return mesh;
  });
  return {
    dispose() {
      for (const mesh of fitted) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
      }
    },
  };
}

/**
 * Hang skip lamps (`createSkipLamp`) by their straps from a skip's
 * lifting lugs at `lamps`' corners; `update` flashes them, each from its own phase.
 */
export function addSkipLamps(
  kit: PanelKit,
  skip: Object3D,
  lamps: readonly SkipLamp[],
) {
  const fitted = lamps.map((lamp) => {
    const made = createSkipLamp(kit);
    // Hung by its strap from the lifting lug at that corner, the lamp
    // against the side below it.
    made.group.position.set(
      lamp.end * LUG_X,
      LUG_Y + LUG_RADIUS + 0.004,
      lamp.side * (WIDE / 2 + 0.065),
    );
    skip.add(made.group);
    return { lamp, made };
  });
  return {
    update(seconds: number) {
      for (const { lamp, made } of fitted) made.setLit(lampLit(lamp, seconds));
    },
    dispose() {
      for (const { made } of fitted) made.dispose();
    },
  };
}
