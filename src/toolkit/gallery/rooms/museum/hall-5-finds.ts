import {
  Box3,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { createPs1Material } from '../../../components/core/parts/ps1-material';
import { createCanvasTexture } from '../../../components/core/views/screens';
import type { tools as toolsOf } from '../../../components/core/views/fitting-tools';
import type { FindId } from '../../logic/museum-5-skimmer';

type Tools = ReturnType<typeof toolsOf>;

/**
 * Hall 5's skimmer finds (the owner, 2026-10-29: "all the objects are
 * modelled and disgusting"): a clump of hair, rotting leaves, a dead rat,
 * a dildo, a butt plug and more hair, each modelled at about its true
 * size, wet, matted and grimy, the adult ones plain rather than graphic.
 * Each is revealed above the walker, turning, so is seen from all round.
 * Origin at the middle of its underside, so it lies on the deck at y = 0.
 */
export function createFindProps(t: Tools, materials: Material[]) {
  const paints = new Map<string, Material>();
  /** A paint, shared; `double` for thin sheets seen from both sides. */
  const p = (colour: string, rough = 0.6, metal = 0, double = false) => {
    const key = `${colour}|${rough}|${metal}|${double}`;
    let m = paints.get(key);
    if (!m) {
      m = double
        ? createPs1Material({
            color: colour,
            roughness: rough,
            metalness: metal,
            side: DoubleSide,
          })
        : t.paint(colour, rough, metal);
      if (double) materials.push(m);
      paints.set(key, m);
    }
    return m;
  };
  const mesh = (
    g: Object3D,
    geometry: BufferGeometry,
    material: Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const m = new Mesh(geometry, material);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  /** A blob: a sphere squashed to `sx` × `sy` × `sz` metres across. */
  const blob = (
    g: Object3D,
    material: Material,
    sx: number,
    sy: number,
    sz: number,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const m = mesh(g, new SphereGeometry(0.5, 14, 10), material, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  /** A strand along `points`, `r` thick. */
  const strand = (
    g: Object3D,
    material: Material,
    points: readonly (readonly [number, number, number])[],
    r: number,
  ) =>
    mesh(
      g,
      new TubeGeometry(
        new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z))),
        Math.max(8, points.length * 4),
        r,
        4,
        false,
      ),
      material,
    );
  /**
   * The matted core's material, made once: a canvas of fine crossing
   * strands, dark, mousy and a few blond, over a dark ground, rough, so
   * it reads as a felt of fibres rather than a glossy lump.
   */
  let mat: Material | null = null;
  const matted = () => {
    if (mat) return mat;
    const { context: c, texture } = createCanvasTexture(256, 256);
    c.fillStyle = '#21190f';
    c.fillRect(0, 0, 256, 256);
    const rand = random(5);
    const inks = ['#0f0b08', '#3b2a1c', '#5c4630', '#4a3624', '#b89a5c'];
    c.lineCap = 'round';
    for (let k = 0; k < 900; k++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const a = rand() * Math.PI;
      const l = 20 + rand() * 70;
      c.strokeStyle = inks[k % 11 === 0 ? 4 : k % 4];
      c.globalAlpha = 0.5 + 0.5 * rand();
      c.lineWidth = 0.6 + rand() * 1.2;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + Math.cos(a + 0.6) * l * 0.5,
        y + Math.sin(a + 0.6) * l * 0.5,
        x + Math.cos(a) * l,
        y + Math.sin(a) * l,
      );
      c.stroke();
    }
    c.globalAlpha = 1;
    texture.needsUpdate = true;
    mat = createPs1Material({ map: texture, roughness: 0.95 });
    materials.push(mat);
    return mat;
  };
  /** A seeded random, so every fill's hair is the same tangle. */
  const random = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  /**
   * A wet tangle of hair round a grey scummy core: long strands looping
   * round it and trailing off, dark, mousy and a few blond, with lint.
   */
  const tangle = (g: Object3D, seed: number, size: number) => {
    const rand = random(seed);
    // The matted core: dull, and all fibres.
    blob(g, matted(), size, size * 0.42, size * 0.85, 0, size * 0.2);
    blob(
      g,
      p('#7c8268', 0.3),
      size * 0.45,
      size * 0.2,
      size * 0.4,
      size * 0.15,
      size * 0.32,
      -size * 0.1,
    );
    // Dull: wet hair is dark, not glossy.
    const hairs = [
      p('#1c1612', 0.9),
      p('#3b2a1c', 0.9),
      p('#5c4630', 0.9),
      p('#b89a5c', 0.85),
    ];
    for (let k = 0; k < 34; k++) {
      const turns = 1 + rand() * 1.5;
      const a0 = rand() * Math.PI * 2;
      const points: [number, number, number][] = [];
      for (let s = 0; s <= 6; s++) {
        const a = a0 + (s / 6) * turns * Math.PI;
        const r = size * (0.35 + rand() * 0.3);
        points.push([
          Math.cos(a) * r,
          size * (0.08 + rand() * 0.32),
          Math.sin(a) * r * 0.8,
        ]);
      }
      // Some trail off across the deck.
      if (k % 4 === 0) {
        const [x, , z] = points.at(-1)!;
        points.push([x * 2.2, 0.002, z * 2.2], [x * 3, 0.001, z * 2.6]);
      }
      strand(g, hairs[k % 7 === 0 ? 3 : k % 3], points, 0.0009);
    }
    // Grey lint and skin flakes caught in it.
    for (let k = 0; k < 6; k++)
      blob(
        g,
        p('#b9b6ad', 0.95),
        size * 0.12,
        size * 0.05,
        size * 0.1,
        (rand() - 0.5) * size,
        size * 0.38,
        (rand() - 0.5) * size * 0.8,
      );
  };

  /** A leaf's outline, `l` long, `w` wide, its tip at +x. */
  const leafShape = (l: number, w: number) => {
    const s = new Shape();
    s.moveTo(-l / 2, 0);
    s.quadraticCurveTo(0, w, l / 2, 0);
    s.quadraticCurveTo(0, -w, -l / 2, 0);
    return s;
  };

  /** Lathed about its long axis, laid along +x, from `profile` (radius, along). */
  const lathe = (
    g: Object3D,
    material: Material,
    profile: readonly (readonly [number, number])[],
  ) => {
    const m = mesh(
      g,
      new LatheGeometry(
        profile.map(([r, y]) => new Vector2(r, y)),
        20,
      ),
      material,
    );
    m.rotation.z = -Math.PI / 2;
    return m;
  };

  const build: Record<FindId, (g: Group) => void> = {
    'hair-clump': (g) => tangle(g, 11, 0.06),
    'more-hair': (g) => {
      tangle(g, 29, 0.085);
      // A plaster, peeled off and caught in it.
      const plaster = new Group();
      t.box(plaster, p('#c99a78', 0.8), 0.07, 0.002, 0.02, 0, 0, 0);
      t.box(plaster, p('#d8d2c2', 0.9), 0.024, 0.003, 0.016, 0, 0.001, 0);
      plaster.position.set(0.01, 0.04, 0.012);
      plaster.rotation.set(0.5, 0.7, 0.3);
      g.add(plaster);
    },
    leaves: (g) => {
      const rand = random(7);
      const colours = ['#5a4a22', '#3e3a1a', '#6b5428', '#4a5224', '#33291a'];
      for (let k = 0; k < 7; k++) {
        const l = 0.07 + rand() * 0.04;
        const leaf = mesh(
          g,
          new ShapeGeometry(leafShape(l, l * 0.42), 6),
          p(colours[k % colours.length], 0.3, 0, true),
          (rand() - 0.5) * 0.06,
          0.004 + k * 0.004,
          (rand() - 0.5) * 0.05,
        );
        leaf.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.6, 0, rand() * 6);
        // Black rot spots.
        for (let s = 0; s < 3; s++)
          blob(
            leaf,
            p('#141008', 0.4),
            l * 0.14,
            l * 0.1,
            0.002,
            (rand() - 0.5) * l * 0.6,
            (rand() - 0.5) * l * 0.2,
            0.001,
          );
        // Its stalk.
        strand(
          g,
          p('#3a2e18', 0.6),
          [
            [leaf.position.x, leaf.position.y, leaf.position.z],
            [
              leaf.position.x - l * 0.6,
              leaf.position.y + 0.004,
              leaf.position.z + 0.01,
            ],
          ],
          0.0012,
        );
      }
      // The green slime they stewed in.
      blob(g, p('#4f5c26', 0.15), 0.05, 0.005, 0.035, 0.01, 0.002, 0);
    },
    'dead-rat': (g) => {
      // On its back, legs in the air: matted wet fur, a paler belly.
      const fur = p('#4d443c', 0.9);
      const wet = p('#2e2823', 0.3);
      blob(g, fur, 0.17, 0.065, 0.075, 0, 0.034, 0);
      blob(g, wet, 0.1, 0.03, 0.05, -0.02, 0.05, 0.012);
      blob(g, p('#9a8c7c', 0.85), 0.11, 0.02, 0.05, 0.005, 0.066, 0);
      // The head, its snout pointed, its teeth showing.
      blob(g, fur, 0.07, 0.045, 0.05, 0.1, 0.03, 0);
      blob(g, fur, 0.045, 0.026, 0.03, 0.14, 0.024, 0);
      blob(g, p('#d58b8b', 0.5), 0.01, 0.01, 0.012, 0.162, 0.024, 0);
      t.box(g, p('#e8c75a', 0.4), 0.004, 0.008, 0.008, 0.155, 0.012, 0);
      for (const side of [-1, 1]) {
        // An ear, and an eye shut for good.
        blob(
          g,
          p('#b88a86', 0.7),
          0.022,
          0.03,
          0.006,
          0.085,
          0.05,
          side * 0.022,
        );
        t.box(
          g,
          p('#100c0a', 0.4),
          0.012,
          0.002,
          0.002,
          0.122,
          0.04,
          side * 0.021,
        );
        // Its legs, stiff, its pink feet up.
        for (const along of [-0.05, 0.045]) {
          strand(
            g,
            fur,
            [
              [along, 0.06, side * 0.026],
              [along + 0.006, 0.09, side * 0.032],
            ],
            0.006,
          );
          blob(
            g,
            p('#c99490', 0.6),
            0.016,
            0.008,
            0.012,
            along + 0.008,
            0.096,
            side * 0.033,
          );
        }
      }
      // The long naked tail, curled across the deck.
      strand(
        g,
        p('#b9918a', 0.5),
        [
          [-0.08, 0.03, 0],
          [-0.13, 0.012, 0.02],
          [-0.18, 0.004, 0.0],
          [-0.21, 0.003, -0.05],
          [-0.19, 0.002, -0.09],
        ],
        0.004,
      );
    },
    dildo: (g) => {
      // Pink, on its side: its suction-cup base, its shaft, its rounded end;
      // a hair stuck to it, and grime.
      lathe(g, p('#e07a9a', 0.35), [
        [0, 0],
        [0.032, 0],
        [0.034, 0.004],
        [0.02, 0.012],
        [0.017, 0.02],
        [0.018, 0.1],
        [0.017, 0.14],
        [0.02, 0.155],
        [0.019, 0.168],
        [0.012, 0.178],
        [0, 0.181],
      ]).position.set(-0.09, 0.034, 0);
      strand(
        g,
        p('#1c1612', 0.35),
        [
          [-0.04, 0.052, 0.008],
          [0.0, 0.053, -0.006],
          [0.03, 0.052, 0.01],
          [0.06, 0.04, 0.03],
          [0.08, 0.004, 0.05],
        ],
        0.0009,
      );
      blob(g, p('#8a8a6a', 0.3), 0.05, 0.006, 0.02, 0.0, 0.05, 0.004);
    },
    'butt-plug': (g) => {
      // Black silicone, on its side: its teardrop, its neck, its flat
      // base; a rotting leaf stuck to it.
      const plug = new Group();
      lathe(plug, p('#141416', 0.3), [
        [0, 0.012],
        [0.007, 0.014],
        [0.007, 0.024],
        [0.017, 0.042],
        [0.021, 0.056],
        [0.017, 0.072],
        [0.008, 0.084],
        [0, 0.088],
      ]);
      blob(plug, p('#141416', 0.3), 0.012, 0.06, 0.04, 0.008, 0, 0);
      plug.position.set(-0.044, 0.021, 0);
      g.add(plug);
      const leaf = mesh(
        g,
        new ShapeGeometry(leafShape(0.05, 0.02), 6),
        p('#3e3a1a', 0.3, 0, true),
        0.0,
        0.042,
        0.0,
      );
      leaf.rotation.set(-Math.PI / 2 + 0.3, 0, 0.6);
      blob(g, p('#7c8268', 0.3), 0.03, 0.004, 0.018, 0.01, 0.04, -0.008);
    },
  };

  return (id: FindId) => {
    const g = new Group();
    g.name = id;
    const inner = new Group();
    build[id](inner);
    // Its underside's middle at the origin.
    const box = new Box3().setFromObject(inner);
    inner.position.set(
      -(box.min.x + box.max.x) / 2,
      -box.min.y,
      -(box.min.z + box.max.z) / 2,
    );
    g.add(inner);
    return g;
  };
}
