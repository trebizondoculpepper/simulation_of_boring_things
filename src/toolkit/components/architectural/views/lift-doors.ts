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
  DOOR_STACK,
  doorPanels,
  LANDING_SET as SET,
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
/** A panel's thickness. */
const T = 0.028;
/**
 * The shadow gap between a landing reveal's back edge and the face of its
 * nearer (fast) panel: 21 mm (6 mm the least the owner allows; deeper so
 * it reads at a walker's distance).
 */
export const SHADOW_GAP = LIFT_DOOR.fastTrack - T / 2;

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
    // The reveal (the owner, 2026-10-30): the doors set back `recess`
    // behind the face, its jambs' and head's stainless linings returning
    // into the opening to the car's sill edge, `LANDING_SET` back, and a
    // grooved sill plate across it, flush with the floor.
    const lining = stainless(kit);
    const R = LIFT_DOOR.recess;
    for (const s of [-1, 1])
      block(lining, 0.02, H, R, s * (W / 2 + 0.01), H / 2, -R / 2, group);
    block(lining, W + 0.04, 0.02, R, 0, H + 0.01, -R / 2, group);
    block(
      kitPaint(kit, '#a9aeb0', 0.5),
      W + 2 * F,
      0.012,
      SET,
      0,
      0.006,
      -SET / 2,
      group,
    );
    // The pockets the panels stack into either side, behind the wall
    // (closing it where the wall is thinner than the reveal).
    const pocket = kitPaint(kit, '#2a2d2f', 0.3);
    const reach = DOOR_STACK + 0.05 - W / 2 - 0.02;
    for (const s of [-1, 1])
      block(
        pocket,
        reach,
        H + 0.1,
        SET - 0.03,
        s * (W / 2 + 0.02 + reach / 2),
        (H + 0.1) / 2,
        -0.03 - (SET - 0.03) / 2,
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
  const back = framed ? LIFT_DOOR.recess : 0;
  // The shadow line round the panels, sides and head (the owner,
  // 2026-10-30, every lift doorway, landing and car alike): they run in
  // their track a clear gap (`SHADOW_GAP`) behind the reveal's back edge
  // (a landing's) or the car's front returns, a black cavity round them.
  {
    const cavity = kitPaint(kit, '#050506', 0);
    const gap = SHADOW_GAP + 0.004;
    for (const s of [-1, 1])
      block(
        cavity,
        0.03,
        H + 0.03,
        gap,
        s * (W / 2 + 0.015),
        (H + 0.03) / 2,
        -back - gap / 2,
        group,
      );
    block(cavity, W + 0.06, 0.03, gap, 0, H + 0.015, -back - gap / 2, group);
  }
  const steel = stainless(kit);
  const kick = kitPaint(kit, '#8c9295', 0.5);
  const leaves = new Group();
  group.add(leaves);
  const sides = [-1, 1].map((s) => {
    const fast = panel(steel, kick);
    const slow = panel(steel, kick);
    fast.position.z = -back - LIFT_DOOR.fastTrack;
    slow.position.z = -back - LIFT_DOOR.slowTrack;
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
