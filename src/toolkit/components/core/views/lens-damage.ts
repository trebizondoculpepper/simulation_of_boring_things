import { CircleGeometry, Mesh } from 'three';
import type { MeshStandardMaterial, Texture } from 'three';
import { LENS_DAMAGE, lensDamageLevel } from '../logic/lens-damage';
import type { LensDamage } from '../logic/lens-damage';
import { createPs1Material } from '../parts/ps1-material';
import type { PanelKit } from './eighties-controls';
import { createCanvasTexture } from './screens';

/** Pixels across a damage texture. */
const SIZE = 256;
const C = SIZE / 2;

/** A small seeded random number generator (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Point = [number, number];

/**
 * One lens's damage, laid out once from its seed so every stage grows from
 * the last: the scratches, the point it was struck, the cracks running out
 * from it, the rings joining them, the piece broken out and the hole.
 */
function layout(seed: number) {
  const r = rng(seed);
  const between = (a: number, b: number) => a + (b - a) * r();
  const scratches = Array.from({ length: 14 }, () => ({
    centre: [between(-C, C) * 2, between(-C, C) * 2] as Point,
    radius: between(C * 0.8, C * 2.4),
    from: between(0, Math.PI * 2),
    sweep: between(0.08, 0.3),
    alpha: between(0.08, 0.22),
  }));
  // Struck off-centre, as a lens is.
  const hitAngle = between(0, Math.PI * 2);
  const hitReach = between(0.15, 0.4) * C;
  const hit: Point = [
    C + Math.cos(hitAngle) * hitReach,
    C + Math.sin(hitAngle) * hitReach,
  ];
  // Cracks run from the impact to the bezel, wandering a little.
  const rays = Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 7) * Math.PI * 2 + between(-0.3, 0.3);
    const points: Point[] = [hit];
    let [x, y] = hit;
    let heading = angle;
    for (let step = 0; step < 40; step++) {
      heading += between(-0.25, 0.25);
      heading += (angle - heading) * 0.3;
      x += Math.cos(heading) * 7;
      y += Math.sin(heading) * 7;
      points.push([x, y]);
      if (Math.hypot(x - C, y - C) > C * 1.02) break;
    }
    // Struck once, a crack runs only part way.
    return { angle, points, partway: between(0.25, 0.6) };
  }).sort((a, b) => a.angle - b.angle);
  // Rings round the impact, joining neighbouring cracks.
  const rings = [0.22, 0.42, 0.68].map((k) => k * C * between(0.85, 1.15));
  // The chip: a bite out of the edge where a crack meets the bezel.
  const chipAt = rays[Math.floor(r() * rays.length)].angle;
  const chip = Array.from({ length: 9 }, (_, i) => {
    const a = chipAt + (i / 8 - 0.5) * 0.9;
    const depth = i === 0 || i === 8 ? 0 : between(0.18, 0.34) * C;
    return [
      C + Math.cos(a) * (C * 1.05 - depth),
      C + Math.sin(a) * (C * 1.05 - depth),
    ] as Point;
  });
  // The hole, when it shatters: a jagged opening, shards left at the rim.
  const hole = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const reach = between(0.45, 0.82) * C;
    return [
      hit[0] * 0.4 + C * 0.6 + Math.cos(a) * reach,
      hit[1] * 0.4 + C * 0.6 + Math.sin(a) * reach,
    ] as Point;
  });
  return { scratches, hit, rays, rings, chip, hole };
}

/**
 * Draw `damage` (one stage) of a lens laid out as `l` onto `c`; or, as a
 * `mask`, only where its glass is gone and its lamp would shine through.
 */
function draw(
  c: CanvasRenderingContext2D,
  l: ReturnType<typeof layout>,
  damage: LensDamage,
  mask = false,
) {
  const level = lensDamageLevel(damage);
  c.clearRect(0, 0, SIZE, SIZE);
  if (mask) {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, SIZE, SIZE);
  }
  c.save();
  c.beginPath();
  c.arc(C, C, C, 0, Math.PI * 2);
  c.clip();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // Scuffs: a dull patch and fine arcs of scratches.
  if (level >= 1 && !mask) {
    const dull = c.createRadialGradient(
      C * 0.8,
      C * 1.1,
      0,
      C * 0.8,
      C * 1.1,
      C,
    );
    dull.addColorStop(0, 'rgba(235,225,220,0.22)');
    dull.addColorStop(1, 'rgba(235,225,220,0)');
    c.fillStyle = dull;
    c.fillRect(0, 0, SIZE, SIZE);
    for (const s of l.scratches) {
      c.strokeStyle = `rgba(245,240,235,${s.alpha})`;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(s.centre[0], s.centre[1], s.radius, s.from, s.from + s.sweep);
      c.stroke();
    }
  }
  /** A crack: a bright line where light catches the break, a dark edge. */
  const crack = (points: Point[], width: number) => {
    if (points.length < 2) return;
    for (const [colour, w, dx] of [
      ['rgba(30,8,6,0.55)', width + 1.5, 1],
      ['rgba(255,244,236,0.85)', width, 0],
    ] as const) {
      c.strokeStyle = colour;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(points[0][0] + dx, points[0][1] + dx);
      for (const [x, y] of points.slice(1)) c.lineTo(x + dx, y + dx);
      c.stroke();
    }
  };
  if (level >= 2 && !mask) {
    // The impact: a crushed white star where it was struck.
    const star = c.createRadialGradient(...l.hit, 0, ...l.hit, 14);
    star.addColorStop(0, 'rgba(255,250,245,0.95)');
    star.addColorStop(1, 'rgba(255,250,245,0)');
    c.fillStyle = star;
    c.beginPath();
    c.arc(...l.hit, 14, 0, Math.PI * 2);
    c.fill();
    for (const ray of l.rays) {
      const n =
        level >= 3
          ? ray.points.length
          : Math.max(2, Math.round(ray.points.length * ray.partway));
      crack(ray.points.slice(0, n), level >= 3 ? 2 : 1.6);
    }
  }
  if (level >= 3 && !mask) {
    // Rings: a crack from each ray to the next, at each ring's reach.
    for (const reach of l.rings)
      for (let i = 0; i < l.rays.length; i++) {
        const a = l.rays[i];
        const b = l.rays[(i + 1) % l.rays.length];
        const at = (ray: typeof a): Point | null => {
          const p = ray.points.find(
            ([x, y]) => Math.hypot(x - l.hit[0], y - l.hit[1]) >= reach,
          );
          return p ?? null;
        };
        const p = at(a);
        const q = at(b);
        if (!p || !q) continue;
        const mid: Point = [
          (p[0] + q[0]) / 2 + (l.hit[0] - C) * -0.05,
          (p[1] + q[1]) / 2 + (l.hit[1] - C) * -0.05,
        ];
        crack([p, mid, q], 1.3);
      }
  }
  /**
   * Where glass is gone, the lamp module shows: grey plastic, unlit (lit,
   * the glow mask makes it shine white), with a pale broken edge. As a
   * glow mask, only the opening, white on black.
   */
  const opening = (outline: Point[]) => {
    c.beginPath();
    c.moveTo(...outline[0]);
    for (const p of outline.slice(1)) c.lineTo(...p);
    c.closePath();
    if (mask) {
      c.fillStyle = '#ffffff';
      c.fill();
      return;
    }
    // Unlit, the grey plastic of the lamp module: its moulded ring and
    // the small dome of its LED in the middle, shadowed towards the bezel.
    c.save();
    c.clip();
    const inside = c.createRadialGradient(C, C, 0, C, C, C * 1.05);
    inside.addColorStop(0, '#9a9c9b');
    inside.addColorStop(0.7, '#7d7f7f');
    inside.addColorStop(1, '#3e403f');
    c.fillStyle = inside;
    c.fillRect(0, 0, SIZE, SIZE);
    c.strokeStyle = 'rgba(40,42,42,0.6)';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(C, C, C * 0.62, 0, Math.PI * 2);
    c.stroke();
    const dome = c.createRadialGradient(C - 6, C - 6, 0, C, C, 24);
    dome.addColorStop(0, '#d9dad6');
    dome.addColorStop(1, '#8e908f');
    c.fillStyle = dome;
    c.beginPath();
    c.arc(C, C, 24, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.strokeStyle = 'rgba(255,236,226,0.9)';
    c.lineWidth = 2.5;
    c.stroke();
  };
  if (level >= 4) opening(l.chip);
  if (level >= 5) opening(l.hole);
  c.restore();
}

/**
 * The damage on a lens of `radius` metres, laid over its face: an overlay
 * that shows any stage of `LENS_DAMAGE`, from nothing (intact) to the lamp
 * showing white through a hole. `seed` lays its cracks out, so two lenses
 * break differently; `set` changes the stage, its textures drawn once each,
 * as needed, and kept in `kit` to be freed with it. `setLit` lights the lamp
 * behind: where the glass is gone it shines white, not through the colour.
 */
export function createLensDamage(kit: PanelKit, radius: number, seed = 1) {
  const l = layout(seed);
  const textures = new Map<string, Texture>();
  const material = createPs1Material({
    transparent: true,
    roughness: 0.35,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
    emissive: '#ffffff',
    emissiveIntensity: 0,
  }) as MeshStandardMaterial;
  kit.materials.push(material);
  const mesh = new Mesh(new CircleGeometry(radius, 40), material);
  mesh.name = 'lens damage';
  mesh.visible = false;
  let current: LensDamage = 'intact';
  let lit = false;
  const texture = (damage: LensDamage, mask: boolean) => {
    const key = `${damage}${mask ? ' glow' : ''}`;
    let made = textures.get(key);
    if (!made) {
      const { context, texture } = createCanvasTexture(SIZE, SIZE);
      draw(context, l, damage, mask);
      texture.needsUpdate = true;
      kit.textures.push(texture);
      textures.set(key, texture);
      made = texture;
    }
    return made;
  };
  /** Whether the stage has glass missing, for the lamp to shine through. */
  const open = () => lensDamageLevel(current) >= lensDamageLevel('chipped');
  const shine = () => {
    material.emissiveIntensity = lit && open() ? 2.4 : 0;
  };
  return {
    mesh,
    get damage() {
      return current;
    },
    set(damage: LensDamage) {
      if (!LENS_DAMAGE.includes(damage)) return;
      current = damage;
      mesh.visible = damage !== 'intact';
      if (mesh.visible) {
        material.map = texture(damage, false);
        material.emissiveMap = open() ? texture(damage, true) : null;
        material.needsUpdate = true;
      }
      shine();
    },
    setLit(on: boolean) {
      lit = on;
      shine();
    },
  };
}
