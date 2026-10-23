import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  Curve,
} from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPs1Material } from '../../../components/core/parts/ps1-material';
import { createBrandBadge } from '../../../components/core/views/brand-badge';
import { METRE } from '../../../components/core/logic/units';
import { createWash } from '../../../components/architectural/views/light-washes';
import { glazedTiles } from '../../../components/architectural/views/glazed-tiles';
import { CEIL, D, H, SIZE, W, booth, glow, lamp, live } from './lighting-booth';

/**
 * Dev30's second set of booths (the owner, 2026-10-23): smaller fittings,
 * and fittings for tiled and curved walls, as a leisure centre's pools,
 * changing rooms and corridors have them. Each booth on its own Lumenhaus
 * dimmer, as the first set's are. Metres, in a booth's frame.
 */

/** Its back wall's inner face. */
const BACK = -D / 2 + 0.1;

/** A plaster, metal or plastic, matte to shiny. */
const paint = (
  kit: PanelKit,
  color: string,
  roughness = 0.6,
  metalness = 0,
) => {
  const m = createPs1Material({ color, roughness, metalness });
  kit.materials.push(m);
  return m;
};

/** A wash's level and a light's, each frame, from the booth's. */
type Driven = { set(level: number): void };
const lit = (
  b: ReturnType<typeof booth>,
  driven: Driven[],
  lights: { light: import('three').PointLight; k: number }[],
): LiveExhibit => ({
  object: b.object,
  parts: b.parts,
  update(delta) {
    b.step(delta);
    const l = b.level();
    for (const d of driven) d.set(l);
    for (const { light, k } of lights) light.intensity = k * METRE * METRE * l;
  },
});

// ---- 7. Recessed downlights and wall-washers ------------------------------

function downlights(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Downlights and wall-washers');
  const trim = paint(kit, '#f1f1ee', 0.4, 0.2);
  const lens = glow(kit, '#fff3dc');
  const driven: Driven[] = [lens];
  const lights: { light: import('three').PointLight; k: number }[] = [];
  // Four recessed downlights, 90 mm apertures in white trims, each a soft pool on the floor below.
  for (const [x, z] of [
    [-0.75, 0.25],
    [0.75, 0.25],
  ] as const) {
    const ring = new Mesh(new CylinderGeometry(0.06, 0.06, 0.012, 24), trim);
    ring.position.set(x, CEIL - 0.006, z);
    b.object.add(ring);
    const disc = live(new Mesh(new CircleGeometry(0.045, 20), lens.material));
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, CEIL - 0.013, z);
    b.object.add(disc);
    const pool = createWash(kit, 'pool', 1.5, 1.5, '#ffe9c8', {
      strength: 0.8,
    });
    pool.mesh.rotation.x = -Math.PI / 2;
    pool.mesh.position.set(x, 0.003, z);
    b.object.add(pool.mesh);
    driven.push(pool);
    const l = lamp('#ffeccc', 0.8, 3.5);
    l.position.set(x, CEIL - 0.15, z);
    b.object.add(l);
    lights.push({ light: l, k: 0.8 });
  }
  // Two wall-washers close to the back wall: their scallops falling down it.
  for (const x of [-0.8, 0.8]) {
    const ring = new Mesh(new BoxGeometry(0.13, 0.012, 0.13), trim);
    ring.position.set(x, CEIL - 0.006, BACK + 0.35);
    b.object.add(ring);
    const disc = live(new Mesh(new PlaneGeometry(0.09, 0.09), lens.material));
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, CEIL - 0.013, BACK + 0.35);
    b.object.add(disc);
    const wash = createWash(kit, 'scallop', 1.3, 2.2, '#ffe9c8', {
      strength: 0.8,
    });
    wash.mesh.rotation.z = Math.PI;
    wash.mesh.position.set(x, CEIL - 1.1, BACK + 0.002);
    b.object.add(wash.mesh);
    driven.push(wash);
  }
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.01 });
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0.75, CEIL - 0.013, 0.36);
  b.object.add(badge);
  return lit(b, driven, lights);
}

// ---- 8. Opal globe pendants -------------------------------------------------

function pendants(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Opal globe pendants');
  const cord = paint(kit, '#1b1b1b', 0.6);
  const canopy = paint(kit, '#c8a46a', 0.35, 0.7);
  const opal = glow(kit, '#fff1d8');
  const driven: Driven[] = [opal];
  const lights: { light: import('three').PointLight; k: number }[] = [];
  // Three opal globes on cords at different heights, each lighting the floor under it.
  for (const [x, drop] of [
    [-0.9, 0.85],
    [0, 0.55],
    [0.9, 0.95],
  ] as const) {
    const y = CEIL - drop;
    const c = new Mesh(new CylinderGeometry(0.05, 0.05, 0.03, 20), canopy);
    c.position.set(x, CEIL - 0.015, -0.3);
    b.object.add(c);
    const wire = new Mesh(new BoxGeometry(0.006, drop - 0.14, 0.006), cord);
    wire.position.set(x, CEIL - (drop - 0.14) / 2, -0.3);
    b.object.add(wire);
    const cap = new Mesh(new CylinderGeometry(0.03, 0.04, 0.05, 16), canopy);
    cap.position.set(x, y + 0.14, -0.3);
    b.object.add(cap);
    const globe = live(
      new Mesh(new SphereGeometry(0.14, 24, 16), opal.material),
    );
    globe.position.set(x, y, -0.3);
    b.object.add(globe);
    const pool = createWash(kit, 'pool', 1.8, 1.8, '#ffe4bd', {
      strength: 0.55,
    });
    pool.mesh.rotation.x = -Math.PI / 2;
    pool.mesh.position.set(x, 0.003, -0.3);
    b.object.add(pool.mesh);
    driven.push(pool);
    const l = lamp('#ffe7c2', 0.55, 3);
    l.position.set(x, y, -0.3);
    b.object.add(l);
    lights.push({ light: l, k: 0.55 });
  }
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.01 });
  badge.position.set(0, CEIL - 0.55 + 0.14, -0.3 + 0.041);
  b.object.add(badge);
  return lit(b, driven, lights);
}

// ---- 9. Up/down wall cylinders ----------------------------------------------

function upDown(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Up/down wall cylinders');
  const body = paint(kit, '#2b2d2f', 0.45, 0.5);
  const end = glow(kit, '#fff1d6');
  const driven: Driven[] = [end];
  // Three cylinders on the back wall at 1.9 m, each throwing a beam up the wall and one down.
  for (const x of [-1.0, 0, 1.0]) {
    const y = 1.9;
    const c = new Mesh(new CylinderGeometry(0.05, 0.05, 0.22, 20), body);
    c.position.set(x, y, BACK + 0.08);
    b.object.add(c);
    const arm = new Mesh(new BoxGeometry(0.03, 0.03, 0.04), body);
    arm.position.set(x, y, BACK + 0.02);
    b.object.add(arm);
    for (const s of [-1, 1]) {
      const lensDisc = live(
        new Mesh(new CircleGeometry(0.04, 16), end.material),
      );
      lensDisc.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      lensDisc.position.set(x, y + s * 0.111, BACK + 0.08);
      b.object.add(lensDisc);
      const wash = createWash(kit, 'scallop', 0.6, 1.1, '#ffe6c0', {
        strength: 0.9,
      });
      if (s < 0) wash.mesh.rotation.z = Math.PI;
      wash.mesh.position.set(x, y + s * (0.11 + 0.55), BACK + 0.002);
      b.object.add(wash.mesh);
      driven.push(wash);
    }
  }
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.008 });
  badge.position.set(1.0, 1.84, BACK + 0.131);
  b.object.add(badge);
  const fill = lamp('#ffe9c8', 0.5, 3);
  fill.position.set(0, 1.9, BACK + 0.5);
  b.object.add(fill);
  return lit(b, driven, [{ light: fill, k: 0.5 }]);
}

// ---- 10. A tiled wall: tile-flush lights and bulkheads ----------------------

function tiled(kit: PanelKit): LiveExhibit {
  const tiles = glazedTiles(kit);
  const tileWall = createPs1Material({
    map: tiles.repeat(W, H),
    roughness: 0.18,
    metalness: 0.05,
  });
  kit.materials.push(tileWall);
  const b = booth(kit, 'Tiled wall: tile lights and bulkheads', {
    back: tileWall,
  });
  const steel = paint(kit, '#a8acac', 0.3, 0.8);
  const glass = glow(kit, '#f6f8ff');
  const driven: Driven[] = [glass];
  // A row of tile-flush lights, each a 150 mm glass block set in place of a tile, low on the wall.
  for (const x of [-1.2, -0.6, 0, 0.6, 1.2]) {
    const frame = new Mesh(new BoxGeometry(0.15, 0.15, 0.006), steel);
    frame.position.set(x, 0.45, BACK + 0.003);
    b.object.add(frame);
    const face = live(new Mesh(new PlaneGeometry(0.12, 0.12), glass.material));
    face.position.set(x, 0.45, BACK + 0.007);
    b.object.add(face);
    const pool = createWash(kit, 'pool', 0.9, 0.9, '#eef2ff', {
      strength: 0.6,
    });
    pool.mesh.rotation.x = -Math.PI / 2;
    pool.mesh.position.set(x, 0.003, BACK + 0.35);
    b.object.add(pool.mesh);
    driven.push(pool);
    const glowRound = createWash(kit, 'pool', 0.5, 0.5, '#eef2ff', {
      strength: 0.5,
    });
    glowRound.mesh.position.set(x, 0.45, BACK + 0.004);
    b.object.add(glowRound.mesh);
    driven.push(glowRound);
  }
  // Two oval bulkheads high on the wall: opal bodies under eyelid shades, the 1980s IP65 kind.
  const shade = paint(kit, '#e9ebe6', 0.5);
  const opal = glow(kit, '#fff4e0');
  driven.push(opal);
  const lights: { light: import('three').PointLight; k: number }[] = [];
  for (const x of [-0.85, 0.85]) {
    const g = new Group();
    g.position.set(x, 2.15, BACK);
    b.object.add(g);
    const base = new Mesh(new CylinderGeometry(0.15, 0.15, 0.03, 28), shade);
    base.rotation.x = Math.PI / 2;
    base.scale.set(1.35, 1, 1);
    base.position.z = 0.015;
    g.add(base);
    const dome = live(
      new Mesh(
        new SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        opal.material,
      ),
    );
    dome.rotation.x = Math.PI / 2;
    dome.scale.set(1.35, 0.5, 1);
    dome.position.z = 0.03;
    g.add(dome);
    // Its eyelid over the top half.
    const lid = new Mesh(
      new SphereGeometry(0.15, 24, 8, 0, Math.PI, 0, Math.PI / 2),
      shade,
    );
    lid.rotation.set(Math.PI / 2, 0, 0);
    lid.scale.set(1.35, 0.55, 1.05);
    lid.position.z = 0.03;
    g.add(lid);
    const halo = createWash(kit, 'pool', 1.4, 1.2, '#fff0d6', {
      strength: 0.7,
    });
    halo.mesh.position.set(x, 2.0, BACK + 0.003);
    b.object.add(halo.mesh);
    driven.push(halo);
    const l = lamp('#fff0d6', 0.5, 3);
    l.position.set(x, 2.0, BACK + 0.4);
    b.object.add(l);
    lights.push({ light: l, k: 0.5 });
  }
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.01 });
  badge.position.set(0.85, 2.03, BACK + 0.05);
  b.object.add(badge);
  return lit(b, driven, lights);
}

// ---- 11. A curved tiled wall: flexible neon and a curved grazer -------------

/** The curved wall: an arc of radius `R` about a centre in front of the booth, spanning its width. */
const R = 2.0;
const HALF = Math.asin((W / 2 - 0.06) / R);
const CENTRE_Z = BACK + R;

/** A path along the curved wall, `inset` in from its face, at height `y`. */
class ArcAt extends Curve<Vector3> {
  constructor(
    private y: number,
    private inset: number,
  ) {
    super();
  }
  getPoint(t: number, target = new Vector3()) {
    const a = -HALF + t * 2 * HALF;
    const r = R - this.inset;
    return target.set(r * Math.sin(a), this.y, CENTRE_Z - r * Math.cos(a));
  }
}

/** A band of the curved wall's face, `y0` to `y1`, `inset` in front of it: for a wash to lie on. */
const arcBand = (y0: number, y1: number, inset: number) => {
  const g = new CylinderGeometry(
    R - inset,
    R - inset,
    y1 - y0,
    40,
    1,
    true,
    Math.PI - HALF,
    2 * HALF,
  );
  g.translate(0, (y0 + y1) / 2, CENTRE_Z);
  return g;
};

function curvedWall(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Curved tiled wall: neon and a curved grazer');
  // The booth's flat back hidden behind the curve, which is tiled.
  const tiles = glazedTiles(kit, { colour: '#dfeeed', grout: '#a9bbb9' });
  const tileWall = createPs1Material({
    map: tiles.repeat(2 * HALF * R, CEIL),
    roughness: 0.18,
    side: DoubleSide,
  });
  kit.materials.push(tileWall);
  b.object.add(new Mesh(arcBand(0, CEIL, 0), tileWall));
  // A flexible LED neon line following the curve at 2.35 m: a lit tube on the face.
  const neon = glow(kit, '#ffd7a3');
  b.object.add(
    live(
      new Mesh(
        new TubeGeometry(new ArcAt(2.35, 0.015), 64, 0.012, 8),
        neon.material,
      ),
    ),
  );
  const above = createWash(kit, 'fall', 0, 0, '#ffd7a3', {
    strength: 0.8,
    geometry: arcBand(2.36, 2.9, 0.003),
  });
  above.mesh.scale.y = -1;
  above.mesh.position.y = 2 * 2.63;
  b.object.add(above.mesh);
  const below = createWash(kit, 'fall', 0, 0, '#ffd7a3', {
    strength: 0.8,
    geometry: arcBand(1.8, 2.34, 0.003),
  });
  b.object.add(below.mesh);
  // A bendable grazer in a floor channel at the wall's foot, raking light up the tiles.
  const channel = paint(kit, '#2a2c2d', 0.6, 0.4);
  b.object.add(
    new Mesh(new TubeGeometry(new ArcAt(0.01, 0.08), 64, 0.03, 6), channel),
  );
  const strip = glow(kit, '#fff3dc');
  b.object.add(
    live(
      new Mesh(
        new TubeGeometry(new ArcAt(0.03, 0.08), 64, 0.012, 6),
        strip.material,
      ),
    ),
  );
  const graze = createWash(kit, 'fall', 0, 0, '#fff0d6', {
    strength: 0.85,
    geometry: arcBand(0, 1.6, 0.003),
  });
  graze.mesh.scale.y = -1;
  graze.mesh.position.y = 1.6;
  b.object.add(graze.mesh);
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.01 });
  badge.position.set(0, 0.05, BACK + 0.12);
  badge.rotation.x = -Math.PI / 2;
  b.object.add(badge);
  const lights = [
    { at: [0, 2.2, BACK + 0.6], k: 0.6 },
    { at: [0, 0.3, BACK + 0.5], k: 0.5 },
  ].map(({ at, k }) => {
    const l = lamp('#ffe3bb', k, 3);
    l.position.set(at[0], at[1], at[2]);
    b.object.add(l);
    return { light: l, k };
  });
  return lit(b, [neon, above, below, strip, graze], lights);
}

// ---- 12. A round column with curved sconces --------------------------------

function column(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Round column: curved sconces');
  const tiles = glazedTiles(kit, { colour: '#2f5f6b', grout: '#20383e' });
  const r = 0.3;
  const tileCol = createPs1Material({
    map: tiles.repeat(2 * Math.PI * r, CEIL, 0.1),
    roughness: 0.2,
  });
  kit.materials.push(tileCol);
  const z = -0.3;
  const col = new Mesh(new CylinderGeometry(r, r, CEIL, 40), tileCol);
  col.position.set(0, CEIL / 2, z);
  b.object.add(col);
  // Two sconces wrapping the column, front and back, at 1.8 m: bowed opal
  // glass following the curve, each throwing light up and down the column.
  const opal = glow(kit, '#fff1d6');
  const brass = paint(kit, '#b08d4c', 0.35, 0.8);
  const driven: Driven[] = [opal];
  for (const a of [0, Math.PI]) {
    const span = 1.1;
    const shell = live(
      new Mesh(
        new CylinderGeometry(
          r + 0.04,
          r + 0.04,
          0.26,
          16,
          1,
          true,
          a - span / 2,
          span,
        ),
        opal.material,
      ),
    );
    shell.material.side = DoubleSide;
    shell.position.set(0, 1.8, z);
    b.object.add(shell);
    for (const s of [-1, 1]) {
      const rim = new Mesh(
        new CylinderGeometry(
          r + 0.045,
          r + 0.045,
          0.015,
          16,
          1,
          true,
          a - span / 2,
          span,
        ),
        brass,
      );
      rim.material.side = DoubleSide;
      rim.position.set(0, 1.8 + s * 0.13, z);
      b.object.add(rim);
      const g = new CylinderGeometry(
        r + 0.003,
        r + 0.003,
        0.9,
        16,
        1,
        true,
        a - 0.9,
        1.8,
      );
      const wash = createWash(kit, 'scallop', 0, 0, '#ffe6c0', {
        strength: 0.9,
        geometry: g,
      });
      if (s < 0) wash.mesh.rotation.z = Math.PI;
      wash.mesh.position.set(0, 1.8 + s * (0.13 + 0.45), z);
      b.object.add(wash.mesh);
      driven.push(wash);
    }
  }
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.008 });
  badge.position.set(0, 1.65, z + r + 0.046);
  b.object.add(badge);
  const fill = lamp('#ffe7c4', 0.6, 3);
  fill.position.set(0, 1.8, z + 0.7);
  b.object.add(fill);
  return lit(b, driven, [{ light: fill, k: 0.6 }]);
}

export const SMALL_FITTINGS: readonly PlantExhibit[] = [
  {
    title: 'Downlights and wall-washers',
    reference:
      'Recessed 90 mm downlights pooling light on the floor, and asymmetric wall-washers scalloping the wall below them',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: downlights,
  },
  {
    title: 'Opal globe pendants',
    reference:
      'Three opal glass globes on cords at different heights, brass canopies',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: pendants,
  },
  {
    title: 'Up/down wall cylinders',
    reference:
      'Wall-mounted cylinders throwing a beam up the wall and a beam down',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: upDown,
  },
  {
    title: 'Tiled wall: tile lights and bulkheads',
    reference:
      'Tile-flush 150 mm glass lights set in place of tiles, and oval bulkheads with eyelid shades, IP65, as wet areas have them',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: tiled,
  },
  {
    title: 'Curved tiled wall: neon and a curved grazer',
    reference:
      'A flexible LED neon line following a curved wall, and a bendable grazer in a floor channel at its foot',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: curvedWall,
  },
  {
    title: 'Round column: curved sconces',
    reference:
      'Bowed opal sconces wrapping a tiled round column, throwing light up and down it',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: column,
  },
];
