import { Group } from 'three';
import type { Material, Object3D } from 'three';
import type { tools as toolsOf } from '../../../components/core/views/fitting-tools';
import type { FindId } from '../../logic/museum-5-skimmer';

type Tools = ReturnType<typeof toolsOf>;

/**
 * Hall 5's skimmer finds (107f), each a small prop of a few boxes and
 * cylinders, plain and simple, about its true size (a little larger where
 * the true thing would vanish on the deck). Origin at the middle of its
 * underside, so it lies on the deck at y = 0. Adult items are shown
 * plainly, never graphically (the owner, 2026-10-28).
 */
export function createFindProps(t: Tools) {
  const paints = new Map<string, Material>();
  const p = (colour: string, rough = 0.6, metal = 0) => {
    const key = `${colour}|${rough}|${metal}`;
    if (!paints.has(key)) paints.set(key, t.paint(colour, rough, metal));
    return paints.get(key)!;
  };
  const gold = () => p('#d4a640', 0.3, 0.9);
  const silver = () => p('#c0c4c8', 0.3, 0.9);

  const ring = (g: Object3D, m: Material, r: number, y: number, n = 10) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const b = t.box(g, m, (r * 2 * Math.PI) / n + 0.002, 0.006, 0.006, Math.cos(a) * r, y, Math.sin(a) * r);
      b.rotation.y = -a + Math.PI / 2;
    }
  };

  const build: Record<FindId, (g: Group) => void> = {
    'hair-clump': (g) => {
      for (let k = 0; k < 9; k++) {
        const s = t.box(g, p(k % 2 ? '#3a2a1c' : '#5a4330', 0.9), 0.11, 0.008, 0.012, Math.sin(k * 2.3) * 0.02, 0.006 + k * 0.002, Math.cos(k * 1.7) * 0.025);
        s.rotation.y = k * 0.7;
      }
    },
    'hair-bobble': (g) => ring(g, p('#d8337a', 0.7), 0.022, 0.004),
    'hair-grips': (g) => {
      for (let k = 0; k < 3; k++) {
        const s = t.box(g, p('#2a2626', 0.4, 0.6), 0.06, 0.003, 0.005, 0, 0.003, (k - 1) * 0.015);
        s.rotation.y = k * 0.4;
      }
    },
    plaster: (g) => {
      t.box(g, p('#d9a582', 0.8), 0.075, 0.002, 0.022, 0, 0.001, 0);
      t.box(g, p('#f2eee8', 0.8), 0.025, 0.003, 0.018, 0, 0.002, 0);
    },
    'verruca-sock': (g) => {
      t.box(g, p('#2c5aa0', 0.9), 0.06, 0.02, 0.15, 0, 0.01, 0);
      t.box(g, p('#2c5aa0', 0.9), 0.06, 0.06, 0.05, 0, 0.03, -0.05);
    },
    leaves: (g) => {
      for (let k = 0; k < 5; k++) {
        const l = t.box(g, p(k % 2 ? '#6b4a1f' : '#8a6a2a', 0.9), 0.07, 0.003, 0.04, Math.sin(k * 2) * 0.03, 0.002 + k * 0.003, Math.cos(k * 3) * 0.03);
        l.rotation.y = k * 1.1;
      }
    },
    bee: (g) => {
      for (let k = 0; k < 4; k++) t.box(g, p(k % 2 ? '#141414' : '#e2b31b', 0.6), 0.008, 0.016, 0.016, (k - 1.5) * 0.008, 0.008, 0);
      t.box(g, p('#cfe0ea', 0.2), 0.012, 0.002, 0.03, 0, 0.017, 0);
    },
    frog: (g) => {
      const green = p('#3e9a3a', 0.4);
      t.box(g, green, 0.06, 0.03, 0.07, 0, 0.015, 0);
      t.box(g, green, 0.045, 0.025, 0.03, 0, 0.03, 0.035);
      t.cyl(g, p('#f6f2d0', 0.3), 0.008, 0.01, -0.015, 0.045, 0.04);
      t.cyl(g, p('#f6f2d0', 0.3), 0.008, 0.01, 0.015, 0.045, 0.04);
      t.box(g, green, 0.02, 0.012, 0.05, -0.04, 0.006, -0.01);
      t.box(g, green, 0.02, 0.012, 0.05, 0.04, 0.006, -0.01);
    },
    earring: (g) => {
      ring(g, gold(), 0.012, 0.003, 8);
      t.cyl(g, p('#7ab7e0', 0.2), 0.005, 0.006, 0, 0.004, 0.012);
    },
    coins: (g) => {
      t.cyl(g, p('#a8642c', 0.4, 0.8), 0.01, 0.002, -0.015, 0.001, 0);
      t.cyl(g, silver(), 0.012, 0.002, 0.012, 0.001, 0.01);
      t.cyl(g, silver(), 0.013, 0.002, 0.005, 0.003, -0.012);
    },
    sixpence: (g) => t.cyl(g, p('#b8b4a8', 0.4, 0.8), 0.0097, 0.0015, 0, 0.001, 0, 'y', 16),
    'wedding-ring': (g) => ring(g, gold(), 0.011, 0.003, 12),
    'car-key': (g) => {
      ring(g, p('#e04a2a', 0.6), 0.035, 0.005, 12);
      t.box(g, silver(), 0.04, 0.003, 0.012, 0.05, 0.002, 0);
      t.cyl(g, p('#e04a2a', 0.6), 0.012, 0.006, 0.075, 0.003, 0);
    },
    'goggle-lens': (g) => {
      t.cyl(g, p('#3a6fd0', 0.1), 0.022, 0.012, 0, 0.006, 0);
      t.box(g, p('#1d1d1d', 0.7), 0.06, 0.003, 0.006, 0.035, 0.002, 0);
    },
    'nose-clip': (g) => {
      t.box(g, p('#1d1d1d', 0.4), 0.004, 0.03, 0.02, 0, 0.015, 0);
      t.cyl(g, p('#f2ae3a', 0.6), 0.007, 0.012, -0.008, 0.006, 0);
      t.cyl(g, p('#f2ae3a', 0.6), 0.007, 0.012, 0.008, 0.006, 0);
    },
    earplug: (g) => t.cyl(g, p('#e8d96a', 0.8), 0.007, 0.018, 0, 0.007, 0, 'x'),
    'swimming-badge': (g) => {
      t.cyl(g, p('#1b3f8a', 0.9), 0.035, 0.003, 0, 0.0015, 0, 'y', 24);
      t.cyl(g, p('#f4f0e0', 0.9), 0.025, 0.004, 0, 0.002, 0, 'y', 24);
      t.label(g, '25m', 0, 0.0045, 0, 0.012).rotation.x = -Math.PI / 2;
    },
    dummy: (g) => {
      t.box(g, p('#6ac2e8', 0.4), 0.045, 0.006, 0.03, 0, 0.003, 0);
      t.cyl(g, p('#e8c070', 0.5), 0.008, 0.025, 0, 0.012, 0.015, 'z');
      ring(g, p('#6ac2e8', 0.4), 0.014, 0.012, 8);
    },
    dinosaur: (g) => {
      const m = p('#7d4bb5', 0.5);
      t.box(g, m, 0.07, 0.03, 0.025, 0, 0.025, 0);
      t.box(g, m, 0.012, 0.045, 0.012, 0.035, 0.05, 0);
      t.box(g, m, 0.05, 0.01, 0.01, -0.05, 0.02, 0);
      for (const [x, z] of [[-0.02, -0.008], [-0.02, 0.008], [0.02, -0.008], [0.02, 0.008]])
        t.box(g, m, 0.01, 0.012, 0.01, x, 0.006, z);
    },
    'rubber-duck': (g) => {
      const y = p('#f6d10c', 0.4);
      t.box(g, y, 0.08, 0.05, 0.06, 0, 0.025, 0);
      t.box(g, y, 0.04, 0.04, 0.04, 0.025, 0.065, 0);
      t.box(g, p('#f07a0c', 0.4), 0.02, 0.01, 0.025, 0.055, 0.06, 0);
    },
    grapes: (g) => {
      for (let k = 0; k < 9; k++)
        t.cyl(g, p('#5a2a5a', 0.3), 0.009, 0.016, Math.sin(k * 1.3) * 0.02, 0.008 + (k % 3) * 0.004, (k - 4) * 0.008, 'y', 8);
      t.box(g, p('#5a7a2a', 0.8), 0.003, 0.003, 0.03, 0, 0.012, 0.045);
    },
    'crisp-packet': (g) => {
      t.box(g, p('#d7262a', 0.3, 0.4), 0.12, 0.01, 0.16, 0, 0.005, 0);
      t.box(g, p('#2c55c8', 0.3, 0.4), 0.09, 0.011, 0.05, 0, 0.005, 0.02);
    },
    'contact-lens': (g) => t.cyl(g, p('#cfe8f4', 0.1), 0.009, 0.002, 0, 0.001, 0, 'y', 16),
    tampon: (g) => {
      t.cyl(g, p('#f4f2ee', 0.9), 0.007, 0.045, 0, 0.007, 0, 'x', 12);
      t.box(g, p('#c4d4e4', 0.9), 0.06, 0.002, 0.002, 0.05, 0.002, 0);
    },
    vibrator: (g) => {
      t.cyl(g, p('#e36aa6', 0.3), 0.013, 0.11, 0, 0.013, 0, 'x', 16);
      t.cyl(g, p('#c0c4c8', 0.3, 0.8), 0.0135, 0.012, -0.058, 0.013, 0, 'x', 16);
    },
    'condom-wrapper': (g) => {
      t.box(g, p('#2a3a8a', 0.3, 0.5), 0.05, 0.003, 0.05, 0, 0.0015, 0);
      t.box(g, p('#2a3a8a', 0.3, 0.5), 0.02, 0.003, 0.05, 0.03, 0.0045, 0).rotation.z = 0.4;
    },
    'false-teeth': (g) => {
      t.box(g, p('#d97a86', 0.4), 0.06, 0.012, 0.05, 0, 0.006, 0);
      for (let k = 0; k < 8; k++)
        t.box(g, p('#f4f0e2', 0.3), 0.006, 0.01, 0.006, (k - 3.5) * 0.007, 0.016, 0.022 - Math.abs(k - 3.5) * 0.003);
      t.box(g, p('#d97a86', 0.4), 0.06, 0.012, 0.05, 0, 0.03, -0.004);
    },
  };

  return (id: FindId) => {
    const g = new Group();
    g.name = id;
    build[id](g);
    return g;
  };
}
