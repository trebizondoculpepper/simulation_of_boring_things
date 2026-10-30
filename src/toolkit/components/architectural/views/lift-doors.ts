import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RepeatWrapping,
} from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { createEngravedNameSign } from '../../general-safety/views/engraved-sign';
import { createBrandBadge } from '../../core/views/brand-badge';
import {
  doorPanels,
  LIFT_DOOR,
  PANEL_WIDTH,
} from '../../../gallery/logic/lift-doorway';

/**
 * A goods lift's centre-opening, four-panel telescopic doors (the owner,
 * 2026-10-30, replacing mission 108's vertical bi-parting doors): two
 * brushed stainless panels each side, a kick plate along each panel's
 * foot, parting from the middle, the fast panel (on the nearer track)
 * travelling twice as far as the slow, both stacking behind the wall on
 * either side (`doorPanels` in `lift-doorway.ts`). The landing's doors
 * stand in a steel frame (an architrave on the face, a sill), the floor's
 * number on each jamb and the maker's mark on the head; the car's door
 * has no frame (the car's front returns hide its stack) but a light
 * curtain down each leading edge, a strip of small red LEDs lit only
 * while it sees something. Built in metres, the doorway's middle on the
 * floor at its room's face, facing +z (into its room); the panels in
 * the reveal behind the face. Its state is the world's: a room sets how
 * far open it stands.
 */

const H = LIFT_DOOR.height;
const W = LIFT_DOOR.clear;
const F = LIFT_DOOR.frame;
const D = LIFT_DOOR.depth;
/** A panel's thickness. */
const T = 0.028;

const textures = new Map<string, ReturnType<typeof createCanvasTexture>>();
/** A canvas texture drawn once and shared. */
function shared(
  key: string,
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D) => void,
) {
  let t = textures.get(key);
  if (!t) {
    t = createCanvasTexture(w, h);
    draw(t.context);
    t.texture.needsUpdate = true;
    textures.set(key, t);
  }
  return t.texture;
}

/** Brushed stainless: fine vertical grain. */
function stainless(kit: PanelKit) {
  const map = shared('brushed', 128, 128, (c) => {
    c.fillStyle = '#c4c9cc';
    c.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x++) {
      const v =
        196 + Math.abs(Math.round(Math.sin(x * 12.9898) * 43758.5453) % 12);
      c.fillStyle = `rgb(${v},${v + 4},${v + 7})`;
      c.fillRect(x, 0, 1, 128);
    }
  });
  map.wrapS = map.wrapT = RepeatWrapping;
  const m = kitPaint(kit, '#ffffff', 0.35);
  (m as unknown as { map: unknown }).map = map;
  return m;
}

/** The light curtain's LEDs: a column of small dots, dark or lit red. */
function curtainMaterial(kit: PanelKit, lit: boolean) {
  const map = shared(lit ? 'curtain-lit' : 'curtain-dark', 8, 128, (c) => {
    c.fillStyle = '#141416';
    c.fillRect(0, 0, 8, 128);
    c.fillStyle = lit ? '#ff2a1a' : '#3a0d0a';
    for (let y = 2; y < 128; y += 4) c.fillRect(2, y, 4, 2);
  });
  const m = new MeshBasicMaterial({ map });
  kit.materials.push(m);
  return m;
}

const block = (
  material: Material,
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

/** One panel, its middle at x 0: stainless, a kick plate on each face. */
function panel(steel: Material, kick: Material) {
  const g = new Group();
  block(steel, PANEL_WIDTH, H + 0.03, T, 0, (H + 0.03) / 2, 0, g);
  for (const s of [-1, 1])
    block(
      kick,
      PANEL_WIDTH - 0.01,
      0.22,
      0.004,
      0,
      0.13,
      (s * (T + 0.004)) / 2,
      g,
    );
  return g;
}

export interface LiftDoorsOptions {
  /** A landing's: its frame, sill, floor number and maker's mark (default); the car's has none. */
  frame?: boolean;
  /** The car's: a light curtain down each leading edge. */
  curtain?: boolean;
  /** The floor's label, on each jamb (a landing's). */
  floor?: string;
}

export interface LiftDoorsView {
  group: Group;
  /** The panels, for hiding while the room beyond is seen through them. */
  leaves: Group;
  /** Stand them `k` open (0 shut, 1 open). */
  setOpen(k: number): void;
  /** Light the curtain's LEDs (it sees something in the doorway), or not. */
  setCurtain(lit: boolean): void;
}

/** A lift's centre-opening four-panel doors: a landing's in their frame, or the car's. */
export function createLiftDoors(
  kit: PanelKit,
  options: LiftDoorsOptions = {},
): LiftDoorsView {
  const { frame: framed = true, curtain = false } = options;
  const group = new Group();
  group.name = framed ? 'Lift landing doors' : 'Lift car door';
  if (framed) {
    const frame = kitPaint(kit, '#3c4246', 0.5);
    // The architrave: jambs and head on the face, the panels behind it.
    for (const s of [-1, 1])
      block(frame, F, H + F, 0.03, s * (W / 2 + F / 2), (H + F) / 2, 0, group);
    block(frame, W + 2 * F, F, 0.03, 0, H + F / 2, 0, group);
    // The sill, its grooved aluminium across the reveal, flush with the floor.
    block(
      kitPaint(kit, '#a9aeb0', 0.5),
      W + 2 * F,
      0.012,
      D + 0.03,
      0,
      0.006,
      -D / 2 + 0.015,
      group,
    );
    // The landing face: the floor's number on each jamb at eye level,
    // the maker's mark on the head.
    if (options.floor)
      for (const s of [-1, 1]) {
        const plate = createEngravedNameSign(kit, 0.085, 0.085, options.floor);
        plate.position.set(s * (W / 2 + F / 2), 1.55, 0.017);
        group.add(plate);
      }
    const badge = createBrandBadge(kit, 'stannard', { height: 0.04 });
    badge.position.set(0, H + F / 2, 0.017);
    group.add(badge);
  }
  const steel = stainless(kit);
  const kick = kitPaint(kit, '#8c9295', 0.5);
  const leaves = new Group();
  group.add(leaves);
  const sides = [-1, 1].map((s) => {
    const fast = panel(steel, kick);
    const slow = panel(steel, kick);
    fast.position.z = -LIFT_DOOR.fastTrack;
    slow.position.z = -LIFT_DOOR.slowTrack;
    leaves.add(fast, slow);
    return { s, fast, slow };
  });
  // The light curtain: an LED strip on each fast panel's leading edge,
  // on the car's side, standing just proud of the edge.
  const dark = curtain ? curtainMaterial(kit, false) : null;
  const lit = curtain ? curtainMaterial(kit, true) : null;
  const strips: Mesh[] = [];
  if (curtain)
    for (const { s, fast } of sides) {
      const strip = block(
        dark!,
        0.016,
        H - 0.2,
        0.022,
        -s * (PANEL_WIDTH / 2 - 0.004),
        0.1 + (H - 0.2) / 2,
        T / 2 + 0.006,
        fast,
      );
      strip.name = 'Light curtain';
      strips.push(strip);
    }
  let shown = -1;
  const setOpen = (k: number) => {
    const t = Math.min(1, Math.max(0, k));
    if (t === shown) return;
    shown = t;
    const { fast, slow } = doorPanels(t);
    for (const p of sides) {
      p.fast.position.x = p.s * fast;
      p.slow.position.x = p.s * slow;
    }
  };
  let on = false;
  const setCurtain = (want: boolean) => {
    if (!curtain || want === on) return;
    on = want;
    for (const strip of strips) strip.material = want ? lit! : dark!;
  };
  setOpen(0);
  return { group, leaves, setOpen, setCurtain };
}
