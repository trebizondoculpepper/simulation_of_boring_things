import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  ExtrudeGeometry,
  Group,
  Mesh,
  Path,
  Shape,
  TorusGeometry,
} from 'three';
import type { Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { channel, circle, headingAt, samplePath, sweep } from './service-sweep';
import type { Point } from './service-sweep';
import type { ServiceMaterials } from './service-materials';

/**
 * The parts of an exposed services ceiling, each one on its own: a deck,
 * a cellular beam, cable tray, wire basket, a cable ladder, spiral and
 * lagged duct, sprinkler pipe with its grooved couplings and heads, a
 * swirl diffuser, pipe and conduit, and the threaded rod, strut trapezes
 * and clips they hang from. Set decoration (`AGENTS.md`).
 *
 * Each part puts its geometry into a `PartSink`, by material. A ceiling
 * puts all its parts into one sink and builds it once, so the whole
 * ceiling is a mesh a material; `standalone` builds one part alone, to
 * model, inspect or place by itself. Runs are centre lines in plan
 * (`service-sweep.ts`); heights are of the centre line. Metres.
 */

export interface PartSink {
  put(material: Material, geometry: BufferGeometry): void;
  /** One mesh per material, its geometries merged; the sink is then spent. */
  build(name: string): Group;
}

export function createPartSink(): PartSink {
  const parts = new Map<Material, BufferGeometry[]>();
  return {
    put(material, geometry) {
      const list = parts.get(material) ?? [];
      list.push(geometry);
      parts.set(material, list);
    },
    build(name) {
      const group = new Group();
      group.name = name;
      for (const [material, list] of parts) {
        for (const g of list)
          if (!g.index)
            g.setIndex([...Array(g.getAttribute('position').count).keys()]);
        const merged = mergeGeometries(list, false);
        for (const g of list) g.dispose();
        if (!merged) continue;
        const mesh = new Mesh(merged, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      parts.clear();
      return group;
    },
  };
}

/** Build one part, or a few, on their own. */
export function standalone(name: string, make: (sink: PartSink) => void) {
  const sink = createPartSink();
  make(sink);
  return sink.build(name);
}

/** Turn a part built along +x to face `t`, and put it at (x, y, z). */
const turned = (
  geometry: BufferGeometry,
  [tx, tz]: readonly [number, number],
  x: number,
  y: number,
  z: number,
) => geometry.rotateY(-Math.atan2(tz, tx)).translate(x, y, z);

// ---- The structure -----------------------------------------------------------

/**
 * A profiled metal deck, its trapezoidal ribs along x, its underside at
 * `y`, over the plan `minX`…`maxZ`.
 */
export function metalDeck(
  sink: PartSink,
  m: ServiceMaterials,
  {
    minX,
    maxX,
    minZ,
    maxZ,
    y,
  }: { minX: number; maxX: number; minZ: number; maxZ: number; y: number },
) {
  const depth = maxZ - minZ;
  const ribs: [number, number][] = [];
  for (let s = -depth / 2; s <= depth / 2; s += 0.2)
    ribs.push(
      [s, 0.06],
      [s + 0.04, 0.06],
      [s + 0.07, 0],
      [s + 0.13, 0],
      [s + 0.16, 0.06],
    );
  const mid = (minZ + maxZ) / 2;
  sink.put(
    m.deck,
    sweep(
      samplePath(
        [
          [minX, mid],
          [maxX, mid],
        ],
        0,
      ),
      { points: ribs.map(([s, u]) => [-s, u] as const), closed: false },
      y,
    ),
  );
}

/**
 * A cellular steel beam along z at `x`, from `minZ` to `maxZ`, its top at
 * `top` and `depth` deep: flanges, and a web with round openings in it.
 */
export function cellularBeam(
  sink: PartSink,
  m: ServiceMaterials,
  {
    x,
    minZ,
    maxZ,
    top,
    depth,
  }: { x: number; minZ: number; maxZ: number; top: number; depth: number },
) {
  const length = maxZ - minZ;
  const mid = (minZ + maxZ) / 2;
  const flange = 0.016;
  for (const y of [top - flange / 2, top - depth + flange / 2])
    sink.put(
      m.beam,
      new BoxGeometry(0.18, flange, length).translate(x, y, mid),
    );
  // The web, its openings at 1.5 times their diameter apart.
  const web = new Shape();
  const h = depth - 2 * flange;
  web.moveTo(minZ, 0);
  web.lineTo(maxZ, 0);
  web.lineTo(maxZ, h);
  web.lineTo(minZ, h);
  web.closePath();
  const d = h * 0.62;
  for (let z = minZ + d; z < maxZ - d / 2; z += 1.5 * d) {
    const hole = new Path();
    hole.absarc(z, h / 2, d / 2, 0, Math.PI * 2, true);
    web.holes.push(hole);
  }
  sink.put(
    m.beam,
    new ExtrudeGeometry(web, {
      depth: 0.01,
      bevelEnabled: false,
      curveSegments: 16,
    })
      .rotateY(-Math.PI / 2)
      .translate(x - 0.005, top - depth + flange, 0),
  );
}

// ---- Cable containment -------------------------------------------------------

export interface RunPart {
  points: readonly Point[];
  /** Height of the centre line. */
  y: number;
}

/** Perforated steel cable tray, with a few cables lying in it. */
export function cableTray(
  sink: PartSink,
  m: ServiceMaterials,
  {
    points,
    y,
    width = 0.3,
    depth = 0.06,
    bend = 0.3,
    cables = 4,
  }: RunPart & {
    width?: number;
    depth?: number;
    bend?: number;
    cables?: number;
  },
  material: Material = m.tray,
) {
  const path = samplePath(points, bend);
  sink.put(material, sweep(path, channel(width, depth), y));
  for (let k = 0; k < cables; k++)
    sink.put(
      m.cable,
      sweep(
        path,
        circle(0.008, 6),
        y - depth / 2 + 0.01,
        -width / 2 + 0.03 + k * 0.025,
      ),
    );
}

/** Steel wire basket tray: the same, in a wire mesh. */
export const wireBasket = (
  sink: PartSink,
  m: ServiceMaterials,
  run: RunPart & { width?: number; bend?: number; cables?: number },
) =>
  cableTray(sink, m, { width: 0.2, depth: 0.07, bend: 0.2, ...run }, m.basket);

/** A cable ladder: two C rails, rungs every 300 mm, armoured cable on them. */
export function cableLadder(
  sink: PartSink,
  m: ServiceMaterials,
  {
    points,
    y,
    width = 0.45,
    bend = 0.6,
    cables = 7,
  }: RunPart & {
    width?: number;
    bend?: number;
    cables?: number;
  },
) {
  const path = samplePath(points, bend);
  const r = width / 2;
  for (const side of [-1, 1])
    sink.put(
      m.ladder,
      sweep(
        path,
        {
          points: [
            [0.012, 0.05],
            [0, 0.05],
            [0, -0.05],
            [0.012, -0.05],
          ].map(([a, b]) => [side * (r - a), b] as const),
          closed: false,
        },
        y,
      ),
    );
  let since = 0;
  path.forEach(({ p, t }, k) => {
    if (k)
      since += Math.hypot(p[0] - path[k - 1].p[0], p[1] - path[k - 1].p[1]);
    if (k && since < 0.3) return;
    since = 0;
    sink.put(
      m.ladder,
      turned(new BoxGeometry(0.03, 0.015, width), t, p[0], y - 0.035, p[1]),
    );
  });
  for (let k = 0; k < cables; k++)
    sink.put(
      m.cable,
      sweep(path, circle(0.02, 10), y - 0.006, -r + 0.04 + k * 0.053),
    );
}

// ---- Air ---------------------------------------------------------------------

/** Galvanised spiral-wound duct. */
export const spiralDuct = (
  sink: PartSink,
  m: ServiceMaterials,
  {
    points,
    y,
    diameter = 0.4,
    bend = 0.4,
  }: RunPart & { diameter?: number; bend?: number },
) =>
  sink.put(
    m.duct,
    sweep(samplePath(points, bend), circle(diameter / 2, 24), y),
  );

/** Duct lagged in foil-faced insulation. */
export const laggedDuct = (
  sink: PartSink,
  m: ServiceMaterials,
  {
    points,
    y,
    diameter = 0.5,
    bend = 0.5,
  }: RunPart & { diameter?: number; bend?: number },
) =>
  sink.put(
    m.lagged,
    sweep(samplePath(points, bend), circle(diameter / 2, 24), y),
  );

/**
 * A swirl diffuser dropped from a duct whose centre is at `y`: a spigot
 * down `drop`, its plenum, and the slotted face under it.
 */
export function swirlDiffuser(
  sink: PartSink,
  m: ServiceMaterials,
  x: number,
  y: number,
  z: number,
  { drop = 0.5, radius = 0.3 } = {},
) {
  sink.put(
    m.duct,
    new CylinderGeometry(0.15, 0.15, drop, 20, 1, true).translate(
      x,
      y - drop / 2,
      z,
    ),
  );
  sink.put(
    m.duct,
    new CylinderGeometry(radius, radius, 0.06, 32, 1, true).translate(
      x,
      y - drop - 0.03,
      z,
    ),
  );
  sink.put(
    m.diffuser,
    new CylinderGeometry(radius, radius, 0.004, 32).translate(
      x,
      y - drop - 0.062,
      z,
    ),
  );
}

// ---- Pipework ----------------------------------------------------------------

/** A plain pipe run: `material` for its finish (pipe, conduit, sprinkler). */
export const pipeRun = (
  sink: PartSink,
  material: Material,
  {
    points,
    y,
    diameter,
    bend = 0.12,
  }: RunPart & { diameter: number; bend?: number },
) =>
  sink.put(
    material,
    sweep(samplePath(points, bend), circle(diameter / 2, 12), y),
  );

/** A grooved coupling on a pipe heading `t`: a red housing and two bolts. */
export function groovedCoupling(
  sink: PartSink,
  m: ServiceMaterials,
  x: number,
  y: number,
  z: number,
  t: readonly [number, number],
  diameter = 0.09,
) {
  const r = diameter / 2;
  sink.put(
    m.coupling,
    turned(
      new CylinderGeometry(r + 0.012, r + 0.012, 0.05, 14).rotateZ(Math.PI / 2),
      t,
      x,
      y,
      z,
    ),
  );
  for (const side of [-1, 1])
    sink.put(
      m.brass,
      turned(
        new CylinderGeometry(0.006, 0.006, 0.05, 6),
        t,
        x,
        y + side * (r + 0.015),
        z,
      ),
    );
}

/** A pendent sprinkler head under a pipe whose centre is at `y`. */
export function sprinklerHead(
  sink: PartSink,
  m: ServiceMaterials,
  x: number,
  y: number,
  z: number,
) {
  sink.put(
    m.sprinkler,
    new CylinderGeometry(0.012, 0.012, 0.25, 8).translate(x, y - 0.125, z),
  );
  sink.put(
    m.brass,
    new CylinderGeometry(0.025, 0.012, 0.03, 10).translate(x, y - 0.26, z),
  );
}

/**
 * Sprinkler pipe: red, with a grooved coupling every `couplingEvery` and
 * a pendent head at each of `heads`.
 */
export function sprinklerPipe(
  sink: PartSink,
  m: ServiceMaterials,
  {
    points,
    y,
    diameter = 0.09,
    bend = 0.1,
    couplingEvery = 3,
    heads = [],
  }: RunPart & {
    diameter?: number;
    bend?: number;
    couplingEvery?: number;
    heads?: readonly Point[];
  },
) {
  pipeRun(sink, m.sprinkler, { points, y, diameter, bend });
  for (const [x, z] of alongRun(points, couplingEvery))
    groovedCoupling(sink, m, x, y, z, headingAt(points, [x, z]), diameter);
  for (const [x, z] of heads) sprinklerHead(sink, m, x, y, z);
}

// ---- Markings ---------------------------------------------------------------

/**
 * A flow-direction arrow on the underside of a run heading `t`, whose
 * underside is at `y`: a triangle `length` long pointing the way the
 * flow goes. Two-colour (red over blue, as on supply ductwork), or one.
 */
export function flowArrow(
  sink: PartSink,
  m: ServiceMaterials,
  x: number,
  y: number,
  z: number,
  t: readonly [number, number],
  length: number,
  colours: readonly Material[] = [m.arrowRed, m.arrowBlue],
) {
  const w = length * 0.62;
  const tri = (a: Point, b: Point, c: Point) => {
    const g = new BufferGeometry();
    g.setAttribute(
      'position',
      new Float32BufferAttribute(
        [a[0], 0, a[1], b[0], 0, b[1], c[0], 0, c[1]],
        3,
      ),
    );
    g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    g.setIndex([0, 1, 2]);
    g.computeVertexNormals();
    return turned(g, t, x, y - 0.003, z);
  };
  const tip: Point = [length / 2, 0];
  const halves: [Point, Point][] = [
    [
      [-length / 2, w / 2],
      [-length / 2, 0],
    ],
    [
      [-length / 2, 0],
      [-length / 2, -w / 2],
    ],
  ];
  halves.forEach(([b, c], i) =>
    sink.put(colours[Math.min(i, colours.length - 1)], tri(tip, b, c)),
  );
}

// ---- Fire detection ---------------------------------------------------------

/** A ceiling smoke detector: its mounting base and optical head, under `y`. */
export function smokeDetector(
  sink: PartSink,
  m: ServiceMaterials,
  x: number,
  y: number,
  z: number,
) {
  sink.put(
    m.detector,
    new CylinderGeometry(0.055, 0.055, 0.015, 24).translate(x, y - 0.0075, z),
  );
  sink.put(
    m.detector,
    new CylinderGeometry(0.05, 0.045, 0.035, 24).translate(x, y - 0.0325, z),
  );
  // The head's slotted chamber and its little indicator lens.
  sink.put(
    m.beam,
    new CylinderGeometry(0.046, 0.046, 0.008, 24).translate(x, y - 0.025, z),
  );
  sink.put(
    m.fireCable,
    new CylinderGeometry(0.004, 0.004, 0.004, 8).translate(
      x + 0.03,
      y - 0.051,
      z,
    ),
  );
}

/**
 * A strut-channel batten along x from `minX` to `maxX` under the beams'
 * soffit at `y`, carrying smoke detectors at `detectors`, wired along it
 * in red fire-resisting cable, a loop down to each.
 */
export function detectorBatten(
  sink: PartSink,
  m: ServiceMaterials,
  {
    minX,
    maxX,
    z,
    y,
    detectors,
  }: {
    minX: number;
    maxX: number;
    z: number;
    y: number;
    detectors: readonly number[];
  },
) {
  const mid = (minX + maxX) / 2;
  sink.put(
    m.strut,
    new BoxGeometry(maxX - minX, 0.041, 0.041).translate(mid, y - 0.0205, z),
  );
  // The cable clipped along its side.
  pipeRun(sink, m.fireCable, {
    points: [
      [minX, z + 0.03],
      [maxX, z + 0.03],
    ],
    y: y - 0.03,
    diameter: 0.009,
  });
  for (const x of detectors) {
    smokeDetector(sink, m, x, y - 0.041, z);
    // The tails into the base, beside it.
    pipeRun(sink, m.fireCable, {
      points: [
        [x - 0.07, z + 0.03],
        [x - 0.03, z + 0.03],
        [x - 0.03, z],
      ],
      y: y - 0.045,
      diameter: 0.008,
      bend: 0.02,
    });
  }
}

// ---- Acoustic grid -----------------------------------------------------------

/** The acoustic grid's spacing, fin to fin, metres. */
export const ACOUSTIC_CELL = 1.2;

/**
 * The middle of the grid opening nearest (x, z), for something that comes
 * down through the grid (a diffuser): the grid's fins lie at `cell / 2`
 * past each multiple of `cell` from the plan's corner.
 */
export function gridOpening(
  {
    minX,
    maxX,
    minZ,
    maxZ,
  }: { minX: number; maxX: number; minZ: number; maxZ: number },
  x: number,
  z: number,
  cell = ACOUSTIC_CELL,
): [number, number] {
  const snap = (v: number, min: number, max: number) =>
    Math.min(
      max - cell,
      Math.max(min + cell, min + Math.round((v - min) / cell) * cell),
    );
  return [snap(x, minX, maxX), snap(z, minZ, maxZ)];
}

/**
 * A grid of felt acoustic baffles hung under the services: deep fins
 * along both ways at `cell` centres over the plan, their underside at
 * `bottom`. An optional layer: it hides much of what is above it.
 */
export function acousticGrid(
  sink: PartSink,
  m: ServiceMaterials,
  {
    minX,
    maxX,
    minZ,
    maxZ,
    bottom,
    cell = ACOUSTIC_CELL,
    depth = 0.3,
    thickness = 0.08,
  }: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    bottom: number;
    cell?: number;
    depth?: number;
    thickness?: number;
  },
) {
  const y = bottom + depth / 2;
  const fins: number[] = [];
  for (let x = minX + cell / 2; x < maxX; x += cell) fins.push(x);
  for (const x of fins)
    sink.put(
      m.felt,
      new BoxGeometry(thickness, depth, maxZ - minZ).translate(
        x,
        y,
        (minZ + maxZ) / 2,
      ),
    );
  // The cross fins, in lengths between the long ones, so none overlap.
  const stops = [minX - thickness / 2, ...fins, maxX + thickness / 2];
  for (let z = minZ + cell / 2; z < maxZ; z += cell)
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1] + thickness / 2;
      const b = stops[i] - thickness / 2;
      if (b > a)
        sink.put(
          m.felt,
          new BoxGeometry(b - a, depth, thickness).translate((a + b) / 2, y, z),
        );
    }
}

// ---- Hangers -----------------------------------------------------------------

/** A threaded drop rod from `top` down to `bottom` at (x, z). */
export const threadedRod = (
  sink: PartSink,
  m: ServiceMaterials,
  x: number,
  z: number,
  top: number,
  bottom: number,
) =>
  sink.put(
    m.rod,
    new CylinderGeometry(0.005, 0.005, top - bottom, 6).translate(
      x,
      (top + bottom) / 2,
      z,
    ),
  );

/**
 * A strut-channel trapeze across a run heading `t`, `span` wide, its top
 * at `y`, on a drop rod each end up to `top`.
 */
export function strutTrapeze(
  sink: PartSink,
  m: ServiceMaterials,
  x: number,
  y: number,
  z: number,
  t: readonly [number, number],
  span: number,
  top: number,
) {
  sink.put(
    m.strut,
    turned(new BoxGeometry(0.041, 0.041, span + 0.16), t, x, y - 0.0205, z),
  );
  for (const side of [-1, 1])
    threadedRod(
      sink,
      m,
      x + t[1] * side * (span / 2 + 0.06),
      z - t[0] * side * (span / 2 + 0.06),
      top,
      y,
    );
}

/** A ring clip round a pipe heading `t`, hung on a rod up to `top`. */
export function pipeClip(
  sink: PartSink,
  m: ServiceMaterials,
  x: number,
  y: number,
  z: number,
  t: readonly [number, number],
  diameter: number,
  top: number,
) {
  sink.put(
    m.strut,
    turned(
      new TorusGeometry(diameter / 2 + 0.006, 0.004, 6, 16).rotateY(
        Math.PI / 2,
      ),
      t,
      x,
      y,
      z,
    ),
  );
  threadedRod(sink, m, x, z, top, y + diameter / 2);
}

/** Points every `every` along a run, starting half a space in. */
export function alongRun(
  points: readonly Point[],
  every: number,
): [number, number][] {
  const out: [number, number][] = [];
  let carry = every / 2;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const length = Math.hypot(bx - ax, bz - az);
    let s = carry;
    for (; s < length; s += every)
      out.push([ax + ((bx - ax) * s) / length, az + ((bz - az) * s) / length]);
    carry = s - length;
  }
  return out;
}
