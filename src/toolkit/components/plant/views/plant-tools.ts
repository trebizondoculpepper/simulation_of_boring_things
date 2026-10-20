import {
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS, tools } from '../../core/views/fitting-tools';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import type {
  DialGaugeView,
  DialKind,
} from '../../industrial-control/views/dial-gauge';

/**
 * Shared drawing tools for building plant: pipework, flanges, valves,
 * gauges, plinths and nameplates, all in metres, so every plant room's
 * equipment is drawn alike and at true size. Built on the fitting tools
 * (`fitting-tools.ts`). A point is `[x, y, z]`.
 */

export type Point = readonly [number, number, number];

/**
 * Nominal pipe sizes: the outside diameter of PVC-U pressure pipe (the
 * usual pool pipework, metric series), and its PN16 flange to
 * EN 1092-1 (outside diameter, bolt circle, bolts, thickness), metres.
 */
export const PIPE_SIZES = {
  50: { od: 0.063, flange: 0.165, pcd: 0.125, bolts: 4, t: 0.019 },
  65: { od: 0.075, flange: 0.185, pcd: 0.145, bolts: 8, t: 0.019 },
  80: { od: 0.09, flange: 0.2, pcd: 0.16, bolts: 8, t: 0.019 },
  100: { od: 0.11, flange: 0.22, pcd: 0.18, bolts: 8, t: 0.019 },
  125: { od: 0.14, flange: 0.25, pcd: 0.21, bolts: 8, t: 0.019 },
  150: { od: 0.16, flange: 0.285, pcd: 0.24, bolts: 8, t: 0.019 },
  200: { od: 0.225, flange: 0.34, pcd: 0.295, bolts: 12, t: 0.02 },
  250: { od: 0.28, flange: 0.405, pcd: 0.355, bolts: 12, t: 0.022 },
  300: { od: 0.315, flange: 0.46, pcd: 0.41, bolts: 12, t: 0.0245 },
} as const;
export type DN = keyof typeof PIPE_SIZES;

/**
 * Finishes. Pool water pipework is dark grey PVC-U; heating pipework is
 * steel under aluminium-clad insulation; plant is painted in its makers'
 * usual colours (`PAINT`), not ours.
 */
export const FINISH = {
  pvc: '#4a4e52',
  steel: '#8d9396',
  galvanised: '#b3b8b8',
  insulation: '#c9cdcf',
  castIron: '#2d3a4a',
  concrete: '#9a9890',
  rubber: '#1d1d1d',
  brass: '#b08a3e',
  stainless: '#c6cacb',
} as const;

/**
 * Pipe identification to BS 1710: a basic identification colour for the
 * kind of fluid, painted in bands, and for some services a code
 * indication, a band of another colour between two of the basic one.
 * (Colours and codes as commonly published; to be checked against the
 * standard before release.)
 */
export const BS1710_BASIC = {
  water: '#3f7f3a',
  steam: '#b6b9b7',
  oils: '#6b4a2b',
  gases: '#c99a2e',
  acidsAlkalis: '#7b4f9d',
  air: '#8fc3e3',
  otherFluids: '#1c1c1c',
  electrical: '#e07a1f',
  fireFighting: '#c4231c',
} as const;
export const BS1710_CODE = {
  blue: '#2b62ae',
  white: '#f2f2ee',
  crimson: '#9b1b30',
  yellow: '#e5c43a',
} as const;

/** The services a pool plant carries, each as its basic colour and code band. */
export const PIPE_SERVICES = [
  { service: 'Pool water', basic: BS1710_BASIC.water, code: null },
  {
    service: 'Drinking water',
    basic: BS1710_BASIC.water,
    code: BS1710_CODE.blue,
  },
  {
    service: 'Heating (LTHW)',
    basic: BS1710_BASIC.water,
    code: BS1710_CODE.crimson,
  },
  {
    service: 'Hot water supply',
    basic: BS1710_BASIC.water,
    code: BS1710_CODE.white,
  },
  { service: 'Natural gas', basic: BS1710_BASIC.gases, code: null },
  {
    service: 'Sodium hypochlorite',
    basic: BS1710_BASIC.acidsAlkalis,
    code: null,
  },
  { service: 'Compressed air', basic: BS1710_BASIC.air, code: null },
  { service: 'Drainage', basic: BS1710_BASIC.otherFluids, code: null },
] as const;

export function plantTools(kit: PanelKit) {
  const t = tools(kit);
  const paints = new Map<string, Material>();
  /** One material per colour, roughness and metalness, shared. */
  const paint = (color: string, roughness = 0.55, metalness = 0) => {
    const key = `${color}|${roughness}|${metalness}`;
    let m = paints.get(key);
    if (!m) {
      m = t.paint(color, roughness, metalness);
      paints.set(key, m);
    }
    return m;
  };
  const up = new Vector3(0, 1, 0);

  /** A straight cylinder from `a` to `b`, radius `r`. */
  const rod = (
    parent: Object3D,
    material: Material,
    a: Point,
    b: Point,
    r: number,
    segments = 16,
  ) => {
    const from = new Vector3(...a);
    const to = new Vector3(...b);
    const length = from.distanceTo(to);
    const mesh = new Mesh(
      new CylinderGeometry(r, r, length, segments),
      material,
    );
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.copy(
      new Quaternion().setFromUnitVectors(up, to.clone().sub(from).normalize()),
    );
    parent.add(mesh);
    return mesh;
  };

  /** A run of pipe of size `dn` through `points`, with a bend at each corner. */
  const pipe = (
    parent: Object3D,
    dn: DN,
    points: readonly Point[],
    color: string = FINISH.pvc,
  ) => {
    const material = paint(color, 0.45);
    const r = PIPE_SIZES[dn].od / 2;
    const bend = r * 3;
    const v = points.map((p) => new Vector3(...p));
    for (let i = 0; i < v.length - 1; i++) {
      const a = v[i].clone();
      const b = v[i + 1].clone();
      const dir = b.clone().sub(a).normalize();
      // Stop short of each corner by the bend's radius.
      if (i > 0) a.addScaledVector(dir, bend);
      if (i < v.length - 2) b.addScaledVector(dir, -bend);
      rod(parent, material, a.toArray(), b.toArray(), r);
    }
    for (let i = 1; i < v.length - 1; i++) {
      const inDir = v[i]
        .clone()
        .sub(v[i - 1])
        .normalize();
      const outDir = v[i + 1].clone().sub(v[i]).normalize();
      const bendMesh = new Mesh(
        new TorusGeometry(bend, r, 10, 8, Math.PI / 2),
        material,
      );
      // The torus' quarter lies in its xy plane from +x to +y about its
      // centre; turn it so it runs from inDir into outDir.
      const centre = v[i]
        .clone()
        .addScaledVector(inDir, -bend)
        .addScaledVector(outDir, bend);
      const toStart = v[i]
        .clone()
        .addScaledVector(inDir, -bend)
        .sub(centre)
        .normalize();
      const toEnd = v[i]
        .clone()
        .addScaledVector(outDir, bend)
        .sub(centre)
        .normalize();
      const normal = new Vector3().crossVectors(toStart, toEnd).normalize();
      const basisY = new Vector3().crossVectors(normal, toStart);
      bendMesh.quaternion.setFromRotationMatrix(
        new Matrix4().makeBasis(toStart, basisY, normal),
      );
      bendMesh.position.copy(centre);
      parent.add(bendMesh);
    }
  };

  /** A PN16 flange pair (with its bolts) on a pipe of size `dn` at `at`, along `axis`. */
  const flanges = (
    parent: Object3D,
    dn: DN,
    at: Point,
    axis: 'x' | 'y' | 'z',
    color: string = FINISH.steel,
  ) => {
    const s = PIPE_SIZES[dn];
    const group = new Group();
    group.position.set(...at);
    if (axis === 'x') group.rotation.z = Math.PI / 2;
    if (axis === 'z') group.rotation.x = Math.PI / 2;
    const steel = paint(color, 0.4, 0.4);
    t.cyl(group, steel, s.flange / 2, s.t * 2, 0, 0, 0, 'y', 28);
    const bolt = paint(FINISH.galvanised, 0.35, 0.7);
    const boltR = s.flange > 0.3 ? 0.012 : 0.008;
    for (let i = 0; i < s.bolts; i++) {
      const a = ((i + 0.5) / s.bolts) * Math.PI * 2;
      t.cyl(
        group,
        bolt,
        boltR,
        s.t * 2 + 0.03,
        Math.cos(a) * (s.pcd / 2),
        0,
        Math.sin(a) * (s.pcd / 2),
        'y',
        6,
      );
    }
    parent.add(group);
    return group;
  };

  /**
   * A lever-operated wafer butterfly valve between flanges on a pipe of
   * size `dn` at `at` along `axis`, its lever on top (+y), or on +z for a
   * vertical pipe. Returns the lever, to turn it (`userData.live`).
   */
  const butterflyValve = (
    parent: Object3D,
    dn: DN,
    at: Point,
    axis: 'x' | 'y' | 'z',
  ) => {
    const s = PIPE_SIZES[dn];
    const group = new Group();
    group.position.set(...at);
    parent.add(group);
    const body = paint('#2c4f8c', 0.45);
    const dir: Point =
      axis === 'x' ? [1, 0, 0] : axis === 'y' ? [0, 1, 0] : [0, 0, 1];
    const half = s.t * 2 + 0.03;
    for (const k of [-1, 1])
      flanges(
        group,
        dn,
        [dir[0] * half * k, dir[1] * half * k, dir[2] * half * k],
        axis,
      );
    const width = Math.max(0.045, s.od * 0.45);
    const wafer = t.cyl(group, body, s.flange * 0.42, width, 0, 0, 0, 'y', 24);
    if (axis === 'x') wafer.rotation.z = Math.PI / 2;
    if (axis === 'z') wafer.rotation.x = Math.PI / 2;
    // The neck, the gear or lever head, and the lever.
    const out: Point = axis === 'y' ? [0, 0, 1] : [0, 1, 0];
    const neckBase = s.flange * 0.42;
    const neckLength = Math.max(0.08, s.od * 0.6);
    rod(
      group,
      body,
      [out[0] * neckBase, out[1] * neckBase, out[2] * neckBase],
      [
        out[0] * (neckBase + neckLength),
        out[1] * (neckBase + neckLength),
        out[2] * (neckBase + neckLength),
      ],
      0.022,
    );
    const lever = new Group();
    lever.userData.live = true;
    const tip = neckBase + neckLength;
    lever.position.set(out[0] * tip, out[1] * tip, out[2] * tip);
    group.add(lever);
    const handle = paint('#c42b23', 0.5);
    const leverLength = Math.min(0.45, 0.18 + s.od * 0.9);
    t.box(
      lever,
      handle,
      0.03,
      0.02,
      leverLength,
      0,
      0.01,
      leverLength / 2 - 0.03,
    );
    if (axis === 'y') lever.rotation.x = -Math.PI / 2;
    return lever;
  };

  /**
   * A bourdon-tube pressure gauge on a short stem, `dia` across its dial
   * (100 mm by default), reading `max` bar, facing +z from `at`.
   */
  /**
   * A dial gauge (`createDialGauge`) at `at`, turned `yaw`: a pressure
   * gauge on a bottom connection, or, in °C, a bimetal thermometer. It is
   * live: drive it with the view this returns (`set`, `update`).
   */
  const pressureGauge = (
    parent: Object3D,
    at: Point,
    {
      dia = 0.1,
      min,
      max = 4,
      unit = 'bar',
      yaw = 0,
      kind,
      legend,
      red,
    }: {
      dia?: number;
      min?: number;
      max?: number;
      unit?: string;
      yaw?: number;
      kind?: DialKind;
      legend?: string;
      red?: { from: number; to: number } | null;
    } = {},
  ): DialGaugeView => {
    const gauge = createDialGauge(kit, {
      dia,
      min,
      max,
      unit,
      kind: kind ?? (unit.includes('°') ? 'thermometer' : 'pressure'),
      entry: unit.includes('°') ? 'back' : 'bottom',
      legend,
      red,
    });
    gauge.group.position.set(...at);
    gauge.group.rotation.y = yaw;
    parent.add(gauge.group);
    return gauge;
  };

  /** A concrete housekeeping plinth, `h` high (100 mm), its top at y = h. */
  const plinth = (parent: Object3D, w: number, d: number, h = 0.1) =>
    t.box(parent, paint(FINISH.concrete, 0.85), w, h, d, 0, h / 2, 0);

  /**
   * A maker's rating plate: a small printed metal plate with the maker's
   * name over lines of rating, facing +z at `at`.
   */
  const ratingPlate = (
    parent: Object3D,
    at: Point,
    maker: string,
    lines: readonly string[],
    w = 0.12,
    h = 0.07,
  ) => {
    const plate = t.printed(
      w,
      h,
      (c, cw, ch) => {
        c.fillStyle = '#d8d9d4';
        c.fillRect(0, 0, cw, ch);
        c.fillStyle = '#151515';
        c.font = `bold ${ch * 0.2}px ${SANS}`;
        c.fillText(maker, cw * 0.06, ch * 0.24);
        c.font = `${ch * 0.12}px ${SANS}`;
        lines.forEach((line, i) =>
          c.fillText(line, cw * 0.06, ch * (0.44 + i * 0.15)),
        );
      },
      256,
    );
    plate.mesh.position.set(...at);
    parent.add(plate.mesh);
    return plate.mesh;
  };

  /** A pipe identification band (BS 1710) round a pipe of size `dn` at `at`. */
  const band = (
    parent: Object3D,
    dn: DN,
    at: Point,
    axis: 'x' | 'y' | 'z',
    color: string,
  ) => {
    const r = PIPE_SIZES[dn].od / 2 + 0.002;
    const mesh = t.cyl(parent, paint(color, 0.6), r, 0.1, ...at, 'y', 16);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    return mesh;
  };

  return {
    ...t,
    paint,
    rod,
    pipe,
    flanges,
    butterflyValve,
    pressureGauge,
    plinth,
    ratingPlate,
    band,
  };
}
