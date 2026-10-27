import {
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { Point } from '../logic/control-room-prototype';

/**
 * The bridge's dressing (mission 095; the owner, 2026-10-27: "light the
 * room like the Star Trek bridge ... cove lighting, big sweeping curves
 * ... soft chairs ... a sort of beige or peach coloured carpet"), after
 * the design language of the 1987 starship bridge set (Herman Zimmerman,
 * Andrew Probert) as a style cue only, in the game's own design: no names,
 * logos, artwork or lettering of the show's. Soft, warm, mostly indirect
 * light (a lit dome over the command area, cove strips hidden in its
 * coffers, along the radial ribs and the walls' tops), a peach carpet with
 * a darker ring round the command area, a burgundy carpet on the low
 * wall behind it, light oak with a strong grain, and upholstered chairs.
 * Set decoration throughout.
 */

/** A canvas texture drawn by `draw`, `w` × `h` pixels, kept by the kit. */
function canvasTexture(
  kit: PanelKit,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  if (repeat) {
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(repeat[0], repeat[1]);
  }
  kit.textures.push(map);
  return map;
}

/** A unit vector along (x, z). */
const norm = (p: Point): Point => {
  const l = Math.hypot(p.x, p.z) || 1;
  return { x: p.x / l, z: p.z / l };
};

/** A seeded random, so every load is the same. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function bridgeMaterials(kit: PanelKit) {
  const keep = <M extends Material>(m: M) => {
    kit.materials.push(m);
    return m;
  };
  /** A carpet: a flat colour with a fine, random tuft. */
  const carpet = (base: string, fleck: string, repeat: number, seed: number) =>
    keep(
      new MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.97,
        metalness: 0,
        map: canvasTexture(
          kit,
          256,
          256,
          (g) => {
            g.fillStyle = base;
            g.fillRect(0, 0, 256, 256);
            const rand = seeded(seed);
            g.fillStyle = fleck;
            for (let k = 0; k < 5000; k++) {
              g.globalAlpha = 0.05 + rand() * 0.12;
              g.fillRect(rand() * 256, rand() * 256, 1.5, 1.5);
            }
            g.globalAlpha = 1;
          },
          [repeat, repeat],
        ),
      }),
    );
  /** Light oak, its grain prominent, lacquered. */
  const oak = (repeatX: number) =>
    keep(
      new MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.38,
        metalness: 0.02,
        map: canvasTexture(
          kit,
          512,
          128,
          (g) => {
            g.fillStyle = '#b98a57';
            g.fillRect(0, 0, 512, 128);
            const rand = seeded(87);
            for (let k = 0; k < 90; k++) {
              const y = rand() * 128;
              g.strokeStyle = rand() < 0.5 ? '#8f6236' : '#d1a674';
              g.globalAlpha = 0.25 + rand() * 0.35;
              g.lineWidth = 0.6 + rand() * 2.2;
              g.beginPath();
              g.moveTo(0, y);
              for (let x = 0; x <= 512; x += 32)
                g.lineTo(x, y + Math.sin(x / 60 + k) * (2 + rand() * 4));
              g.stroke();
            }
            g.globalAlpha = 1;
          },
          [repeatX, 1],
        ),
      }),
    );
  return {
    /** The floor's: warm peach-beige, a fine tuft. */
    carpet: carpet('#c79f86', '#7d5d4a', 1, 11),
    /** The darker ring round the command area, and the border. */
    ring: carpet('#8d6a5a', '#4a352c', 12, 13),
    /** The low wall behind the command area: muted burgundy. */
    burgundy: carpet('#6e2a2c', '#2c0e10', 2, 17),
    /** The door alcoves' grey fabric panels. */
    greyFabric: carpet('#8f8c88', '#4d4a47', 2, 19),
    oak,
    /** Black and silver accents. */
    black: keep(
      new MeshStandardMaterial({
        color: '#121214',
        roughness: 0.35,
        metalness: 0.2,
      }),
    ),
    silver: keep(
      new MeshStandardMaterial({
        color: '#c8ccd0',
        roughness: 0.25,
        metalness: 0.85,
      }),
    ),
    /** The glossy black ceiling panels round the dome: faint reflections. */
    glossBlack: keep(
      new MeshStandardMaterial({
        color: '#060607',
        roughness: 0.08,
        metalness: 0.6,
      }),
    ),
    /** A hidden cove's light, seen as a glowing strip. */
    cove: keep(
      new MeshStandardMaterial({
        color: '#fff0d8',
        emissive: '#ffe2b8',
        emissiveIntensity: 1.6,
        roughness: 0.6,
      }),
    ),
    /** The dome's lit diffuser. */
    domeGlow: keep(
      new MeshStandardMaterial({
        color: '#fff6e8',
        emissive: '#ffe9c8',
        emissiveIntensity: 1.25,
        roughness: 0.8,
        side: 2,
      }),
    ),
    beige: keep(new MeshStandardMaterial({ color: '#d6c6a8', roughness: 0.8 })),
  };
}
export type BridgeMaterials = ReturnType<typeof bridgeMaterials>;

/**
 * The ceiling over the bridge: a lit oval dome over the command area,
 * glossy black panels round it, coves hidden in its rim; ribs fanning
 * forward from it to the big wall, a cove strip along each; a cove along
 * every wall's top. A few warm lights under the coves light the room
 * softly; there are no downlights.
 */
export function bridgeCeiling(
  m: BridgeMaterials,
  opts: {
    room: readonly Point[];
    centre: Point;
    /** The ceiling's underside, y. */
    top: number;
    /** The floor, y. */
    floor: number;
    metre: number;
  },
): Object3D {
  const g = new Group();
  g.name = 'Bridge ceiling (dome, ribs and coves)';
  const { centre: c, top, room } = opts;
  // The dome: an oval well 9 × 7 m, its lit diffuser 1.2 m up in it.
  const rx = 4.5;
  const rz = 3.5;
  const well = new Mesh(new CylinderGeometry(1, 1, 1.2, 64, 1, true), m.beige);
  well.scale.set(rx, 1, rz);
  well.position.set(c.x, top + 0.6, c.z);
  (well.material as MeshStandardMaterial).side = 2;
  g.add(well);
  const dome = new Mesh(
    new SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    m.domeGlow,
  );
  dome.scale.set(rx, 0.9, rz);
  dome.position.set(c.x, top + 1.1, c.z);
  g.add(dome);
  // Its rim, a ring hiding the cove that washes it.
  const rim = new Mesh(new TorusGeometry(1, 0.035, 8, 96), m.cove);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(rx + 0.15, rz + 0.15, 1);
  rim.position.set(c.x, top - 0.02, c.z);
  g.add(rim);
  const lip = new Mesh(new RingGeometry(1, 1.12, 96), m.beige);
  lip.rotation.x = Math.PI / 2;
  lip.scale.set(rx + 0.1, rz + 0.1, 1);
  lip.position.set(c.x, top - 0.06, c.z);
  g.add(lip);
  // Two concentric coves (the owner, 2026-10-27: "one pointing inwards to
  // the dome and one pointing outwards to the edges of the room"): the
  // inner hidden in the dome's lip, washing up into the dome; the outer in
  // a trough further out, its strip on the trough's outer side washing the
  // ceiling outward. Only the lit ceiling is seen, not the sources.
  const ox = rx + 4.2;
  const oz = rz + 3.4;
  const trough = new Mesh(new RingGeometry(1, 1.06, 128), m.beige);
  trough.rotation.x = Math.PI / 2;
  trough.scale.set(ox, oz, 1);
  trough.position.set(c.x, top - 0.32, c.z);
  g.add(trough);
  const troughLip = new Mesh(
    new CylinderGeometry(1, 1, 0.3, 128, 1, true),
    m.beige,
  );
  troughLip.scale.set(ox * 1.06, 1, oz * 1.06);
  troughLip.position.set(c.x, top - 0.17, c.z);
  g.add(troughLip);
  const outer = new Mesh(new TorusGeometry(1, 0.03, 8, 128), m.cove);
  outer.rotation.x = Math.PI / 2;
  outer.scale.set(ox * 1.03, oz * 1.03, 1);
  outer.position.set(c.x, top - 0.28, c.z);
  g.add(outer);
  // Glossy black rectangles round it, in a ring.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
    const panel = new Mesh(
      new RoundedBoxGeometry(2.2, 0.04, 1.1, 2, 0.04),
      m.glossBlack,
    );
    panel.position.set(
      c.x + Math.cos(a) * (rx + 1.9),
      top - 0.03,
      c.z + Math.sin(a) * (rz + 1.6),
    );
    panel.rotation.y = -a + Math.PI / 2;
    g.add(panel);
  }
  // Six ribs fanning forward from the dome to the big wall, a cove strip
  // along each side of each.
  const front = room[0].z;
  for (let k = 0; k < 6; k++) {
    const a = (-62.5 + k * 25) * (Math.PI / 180);
    const x0 = c.x + Math.sin(a) * rx;
    const z0 = c.z - Math.cos(a) * rz;
    const t = (front - z0) / -Math.cos(a);
    const x1 = x0 + Math.sin(a) * t;
    const len = Math.hypot(x1 - x0, front - z0);
    const rib = new Mesh(
      new RoundedBoxGeometry(0.5, 0.45, len, 2, 0.08),
      m.beige,
    );
    rib.position.set((x0 + x1) / 2, top - 0.22, (z0 + front) / 2);
    rib.rotation.y = -a;
    g.add(rib);
    for (const s of [-1, 1]) {
      const strip = new Mesh(
        new RoundedBoxGeometry(0.04, 0.03, len, 1, 0.01),
        m.cove,
      );
      strip.position.set(0.3 * s, 0.18, 0);
      rib.add(strip);
    }
  }
  // A very rounded space: a large fillet in every corner, floor to ceiling.
  for (let i = 0; i < room.length; i++) {
    const p = room[i];
    const prev = room[(i + room.length - 1) % room.length];
    const next = room[(i + 1) % room.length];
    const u = norm({ x: prev.x - p.x, z: prev.z - p.z });
    const v = norm({ x: next.x - p.x, z: next.z - p.z });
    const bis = norm({ x: u.x + v.x, z: u.z + v.z });
    const half =
      Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.z * v.z))) / 2;
    const r = 0.9;
    const d = r / Math.sin(half);
    const fillet = new Mesh(
      new CylinderGeometry(r, r, top - opts.floor, 24, 1, true, 0, Math.PI * 2),
      m.beige,
    );
    fillet.position.set(
      p.x + bis.x * d,
      (top + opts.floor) / 2,
      p.z + bis.z * d,
    );
    g.add(fillet);
  }
  // A cove along every wall's top.
  for (let i = 0; i < room.length; i++) {
    const a = room[i];
    const b = room[(i + 1) % room.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    const yaw = Math.atan2(b.z - a.z, b.x - a.x);
    const lip2 = new Mesh(
      new RoundedBoxGeometry(len, 0.12, 0.35, 2, 0.04),
      m.beige,
    );
    lip2.position.set(
      (a.x + b.x) / 2 + nx * 0.17,
      top - 0.45,
      (a.z + b.z) / 2 + nz * 0.17,
    );
    lip2.rotation.y = -yaw;
    g.add(lip2);
    const strip = new Mesh(
      new RoundedBoxGeometry(len - 0.2, 0.03, 0.05, 1, 0.01),
      m.cove,
    );
    strip.position.set(
      (a.x + b.x) / 2 + nx * 0.06,
      top - 0.36,
      (a.z + b.z) / 2 + nz * 0.06,
    );
    strip.rotation.y = -yaw;
    g.add(strip);
  }
  // The light itself: a few warm points just under the ceiling, at the
  // coves, so what they light is mostly the ceiling, which lights the room
  // (the owner: "very little direct lighting"); one inside the dome.
  const lights: [number, number, number, number][] = [
    [c.x, top + 0.5, c.z, 34],
    ...[0, 1, 2, 3].map((k): [number, number, number, number] => {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      return [c.x + Math.cos(a) * ox, top - 0.45, c.z + Math.sin(a) * oz, 14];
    }),
    [0, top - 0.5, front + 1.5, 12],
    [0, top - 0.5, (room[3].z + room[4].z) / 2, 10],
  ];
  for (const [x, y, z, power] of lights) {
    const light = new PointLight(
      '#ffe6c4',
      power * opts.metre * opts.metre,
      24 * opts.metre,
      2,
    );
    light.position.set(x, y, z);
    g.add(light);
  }
  return g;
}

/**
 * The carpet: peach over the main floor and the stage, a darker ring
 * round the command area (`ring`, outer radius), the border round the
 * walls left to the floor slab's own colour.
 */
export function carpetRing(
  m: BridgeMaterials,
  at: Point,
  y: number,
  r: number,
) {
  const ring = new Mesh(new RingGeometry(r - 0.6, r, 96), m.ring);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(at.x, y + 0.004, at.z);
  ring.name = 'Carpet ring';
  const inner = new Mesh(new CircleGeometry(r - 0.6, 96), m.carpet);
  inner.rotation.x = -Math.PI / 2;
  inner.position.set(at.x, y + 0.002, at.z);
  const g = new Group();
  g.add(inner, ring);
  return g;
}

/**
 * A row of small chaser lights along the viewscreen's foot, running out
 * from the middle to each end, over and over; one material per lamp,
 * stepped as it is drawn (no light sources).
 */
export function chaserLights(
  kit: PanelKit,
  from: Point,
  to: Point,
  y: number,
  count = 41,
): Object3D {
  const g = new Group();
  g.name = 'Viewscreen chaser lights';
  const lamps: MeshStandardMaterial[] = [];
  const geometry = new CylinderGeometry(0.028, 0.028, 0.02, 12);
  for (let k = 0; k < count; k++) {
    const s = k / (count - 1);
    const mat = new MeshStandardMaterial({
      color: '#3a2a20',
      emissive: '#ffb070',
      emissiveIntensity: 0.2,
      roughness: 0.4,
    });
    kit.materials.push(mat);
    lamps.push(mat);
    const lamp = new Mesh(geometry, mat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(
      from.x + (to.x - from.x) * s,
      y,
      from.z + (to.z - from.z) * s,
    );
    g.add(lamp);
  }
  const middle = (count - 1) / 2;
  let shown = -1;
  const first = g.children[0] as Mesh;
  first.onBeforeRender = () => {
    // Eight steps a second, out from the middle to the ends.
    const step = Math.floor(performance.now() / 125) % (middle + 4);
    if (step === shown) return;
    shown = step;
    lamps.forEach((m, k) => {
      const d = Math.abs(k - middle);
      const lit = d <= step && d > step - 3;
      m.emissiveIntensity = lit ? 2.4 : 0.2;
    });
  };
  return g;
}

/** The kinds of upholstered chair on the bridge. */
export type ChairKind = 'command' | 'beside' | 'station' | 'conference';

/**
 * An upholstered chair (fabric, not leather) facing `yaw` (0 south):
 * the command chair larger, with padded arms whose fronts carry small
 * black insets; those beside it lower and softer; the stations' smaller
 * and taller; the conference table's to match. A dark plinth or a
 * pedestal under each.
 */
export function upholsteredChair(
  m: BridgeMaterials,
  fabric: Material,
  kind: ChairKind,
  at: { x: number; z: number; yaw: number },
  y: number,
  name: string,
): Group {
  const c = new Group();
  c.name = name;
  c.position.set(at.x, y, at.z);
  c.rotation.y = at.yaw;
  const size = {
    command: { w: 0.78, d: 0.72, seat: 0.48, back: 0.82, arms: true },
    beside: { w: 0.62, d: 0.62, seat: 0.44, back: 0.62, arms: true },
    station: { w: 0.52, d: 0.52, seat: 0.62, back: 0.5, arms: false },
    conference: { w: 0.56, d: 0.56, seat: 0.46, back: 0.56, arms: false },
  }[kind];
  const rb = (w: number, h: number, d: number, r: number, mat: Material) =>
    new Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
  // The base: a black plinth for the command chairs, a pedestal else.
  if (kind === 'command' || kind === 'beside') {
    const plinth = rb(
      size.w * 0.8,
      size.seat - 0.14,
      size.d * 0.7,
      0.05,
      m.black,
    );
    plinth.position.y = (size.seat - 0.14) / 2;
    c.add(plinth);
  } else {
    const post = new Mesh(
      new CylinderGeometry(0.04, 0.05, size.seat - 0.12, 10),
      m.silver,
    );
    post.position.y = (size.seat - 0.12) / 2 + 0.04;
    c.add(post);
    const foot = new Mesh(new CylinderGeometry(0.26, 0.28, 0.04, 20), m.black);
    foot.position.y = 0.02;
    c.add(foot);
  }
  // The seat cushion, the back, softly rounded.
  const seat = rb(size.w, 0.16, size.d, 0.06, fabric);
  seat.position.y = size.seat - 0.06;
  c.add(seat);
  const back = rb(size.w * 0.94, size.back, 0.16, 0.07, fabric);
  back.position.set(0, size.seat + size.back / 2 - 0.04, -size.d / 2 + 0.06);
  back.rotation.x = -0.14;
  c.add(back);
  if (size.arms)
    for (const s of [-1, 1]) {
      const arm = rb(0.13, 0.2, size.d * 0.92, 0.05, fabric);
      arm.position.set((s * (size.w + 0.1)) / 2, size.seat + 0.1, 0.02);
      c.add(arm);
      if (kind === 'command') {
        // The small black inset at each arm's front, for its panels.
        const inset = rb(0.1, 0.02, 0.22, 0.008, m.black);
        inset.position.set(
          (s * (size.w + 0.1)) / 2,
          size.seat + 0.205,
          size.d * 0.3,
        );
        c.add(inset);
      }
    }
  return c;
}
