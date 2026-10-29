import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RepeatWrapping,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { LIFT_DOOR } from '../../../gallery/logic/lift-doorway';

/**
 * A goods lift's vertical bi-parting doors (mission 108, the owner,
 * 2026-10-29): two steel leaves parting up and down, the upper rising
 * behind the wall over the opening, the lower sinking under the sill, a
 * striped rubber safety edge along each meeting edge; in a steel frame
 * with a chequer-plate sill. And the car's gate: a collapsible steel mesh
 * gate inside the car's doorway. Built in metres, the doorway's middle on
 * the floor at its room's face, facing +z (into its room); the leaves in
 * the reveal behind the face. Its state is the world's: a room sets how
 * far open it stands.
 */

const H = LIFT_DOOR.height;
const W = LIFT_DOOR.clear;
const F = LIFT_DOOR.frame;
const D = LIFT_DOOR.depth;
/** Each leaf's overlap into the frame either side, and the overlap of the two at the meeting edges. */
const LAP = 0.04;

let hatching: ReturnType<typeof createCanvasTexture> | null = null;
/** Yellow and black diagonal hatching for the safety edges, shared. */
function hatch(kit: PanelKit) {
  if (!hatching) {
    hatching = createCanvasTexture(64, 16);
    const { context: c } = hatching;
    c.fillStyle = '#e8b712';
    c.fillRect(0, 0, 64, 16);
    c.fillStyle = '#16161a';
    for (let x = -16; x < 80; x += 16) {
      c.beginPath();
      c.moveTo(x, 16);
      c.lineTo(x + 8, 16);
      c.lineTo(x + 16, 0);
      c.lineTo(x + 8, 0);
      c.closePath();
      c.fill();
    }
    hatching.texture.wrapS = RepeatWrapping;
    hatching.texture.repeat.set(12, 1);
  }
  const material = new MeshBasicMaterial({ map: hatching.texture });
  kit.materials.push(material);
  return material;
}

const block = (
  material: Mesh['material'],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  parent: Group,
) => {
  const mesh = new Mesh(new BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

/** One leaf: a steel panel with stiffening ribs, its safety edge along `edge` (its top or its bottom). */
function leaf(kit: PanelKit, edge: 'top' | 'bottom') {
  const g = new Group();
  const steel = kitPaint(kit, '#7b858a', 0.4);
  const rib = kitPaint(kit, '#5f686d', 0.4);
  const h = H / 2 + LAP;
  // Its panel, `h` tall, from y = 0 to y = h.
  block(steel, W + 2 * LAP, h, 0.04, 0, h / 2, 0, g);
  for (const y of [0.25, 0.55, 0.85])
    block(rib, W + 2 * LAP - 0.06, 0.05, 0.02, 0, h * y, 0.03, g);
  // The rubber safety edge, hatched, on the edge that meets the other leaf.
  const e = block(
    hatch(kit),
    W + 2 * LAP,
    0.05,
    0.07,
    0,
    edge === 'top' ? h - 0.025 : 0.025,
    0,
    g,
  );
  e.name = 'Safety edge';
  return g;
}

export interface LiftDoorsView {
  group: Group;
  /** The two leaves, for hiding while the room beyond is seen through them. */
  leaves: Group;
  /** Stand them `k` open (0 shut, 1 open). */
  setOpen(k: number): void;
}

/** A landing's vertical bi-parting doors in their frame, with a chequer-plate sill. */
export function createLiftDoors(kit: PanelKit): LiftDoorsView {
  const group = new Group();
  group.name = 'Lift landing doors';
  const frame = kitPaint(kit, '#3c4246', 0.5);
  // The jambs and the head, in the reveal and proud of the face.
  for (const s of [-1, 1])
    block(
      frame,
      F,
      H + F,
      D + 0.03,
      s * (W / 2 + F / 2),
      (H + F) / 2,
      -D / 2 + 0.015,
      group,
    );
  block(frame, W + 2 * F, F, D + 0.03, 0, H + F / 2, -D / 2 + 0.015, group);
  // The sill: chequer plate over the reveal, flush with the floor.
  block(
    kitPaint(kit, '#8d9396', 0.6),
    W + 2 * F,
    0.012,
    D + 0.06,
    0,
    0.006,
    -D / 2 + 0.03,
    group,
  );
  const leaves = new Group();
  const upper = leaf(kit, 'bottom');
  const lower = leaf(kit, 'top');
  leaves.add(upper, lower);
  leaves.position.z = -D / 2;
  group.add(leaves);
  const setOpen = (k: number) => {
    const t = Math.min(1, Math.max(0, k));
    // Shut, they meet at half height; open, the upper clears the head and
    // the lower lies under the sill.
    const travel = H / 2 + LAP + 0.02;
    upper.position.y = H / 2 - LAP + t * travel;
    lower.position.y = -LAP - t * travel;
    leaves.visible = t < 0.999;
  };
  setOpen(0);
  return { group, leaves, setOpen };
}

export interface CarGateView {
  group: Group;
  /** Stand it `k` open (0 shut, 1 open): it folds up into its head. */
  setOpen(k: number): void;
}

let meshing: ReturnType<typeof createCanvasTexture> | null = null;
/** The gate's steel mesh: a diamond lattice, shared. */
function meshTexture() {
  if (!meshing) {
    meshing = createCanvasTexture(64, 64);
    const { context: c } = meshing;
    c.clearRect(0, 0, 64, 64);
    c.strokeStyle = '#9aa3a8';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(0, 32);
    c.lineTo(32, 0);
    c.lineTo(64, 32);
    c.lineTo(32, 64);
    c.closePath();
    c.stroke();
    meshing.texture.wrapS = meshing.texture.wrapT = RepeatWrapping;
    meshing.texture.repeat.set(18, 22);
  }
  return meshing.texture;
}

/**
 * The car's gate: a collapsible steel mesh gate across the car's doorway,
 * folding up into its head as it opens (`k` 1) and down shut (`k` 0).
 */
export function createCarGate(kit: PanelKit): CarGateView {
  const group = new Group();
  group.name = 'Car gate';
  const lattice = new MeshBasicMaterial({
    map: meshTexture(),
    transparent: true,
    alphaTest: 0.4,
    side: 2,
  });
  kit.materials.push(lattice);
  const bar = kitPaint(kit, '#59636a', 0.5);
  // Folding from its head down: the panel's top at the head.
  const fold = new Group();
  fold.position.set(0, H, -0.04);
  const panel = new Mesh(new BoxGeometry(W, H, 0.004), lattice);
  panel.position.y = -H / 2;
  fold.add(panel);
  // Its bottom bar and handle, which come down with it.
  const bottom = new Group();
  block(bar, W, 0.04, 0.03, 0, 0, 0, bottom);
  block(bar, 0.3, 0.025, 0.04, 0, 0.06, 0.03, bottom);
  group.add(fold, bottom);
  // Its head, the box it folds into.
  block(bar, W + 0.1, 0.12, 0.08, 0, H + 0.06, -0.04, group);
  const setOpen = (k: number) => {
    const t = Math.min(1, Math.max(0, k));
    const shown = Math.max(0.02, 1 - t);
    fold.scale.y = shown;
    bottom.position.set(0, H - H * shown + 0.02, -0.04);
  };
  setOpen(0);
  return { group, setOpen };
}
