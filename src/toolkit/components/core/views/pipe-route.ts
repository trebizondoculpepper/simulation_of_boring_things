import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  JOINT_BEND,
  JOINT_LENGTHS,
  crossings,
  jointFitting,
  jointsAlong,
  planRoute,
} from '../logic/pipe-route';
import type { PipeJoint } from '../logic/pipe-route';
import type { Bend, Plane, Vec3 } from '../logic/pipe-route';

/**
 * Pipe runs drawn as a pipefitter makes them: the straights and bends of
 * `planRoute` (`../logic/pipe-route.ts`), with the joints of the pipe's
 * kind at its fittings and along its lengths. The one helper for pipework
 * anywhere in the game, real plant and decorative ceilings alike; the
 * kinds of pipe (PVC, copper, steel, lagged…) are in `pipe-kinds.ts`.
 * Metres.
 *
 * The joints, and the bend each makes by default:
 * - `socket`: PVC-U solvent-welded, a short-radius elbow fitting with its
 *   sockets proud of the pipe, a socket coupling at each length's end;
 * - `flange`: flanged steel, long-radius bends, a flange pair with bolts
 *   at each joint and at each bend's ends;
 * - `groove`: grooved steel (sprinkler and fire mains): a mechanical
 *   coupling at each joint, its two half-housings clamped over the
 *   grooved ends by a bolt through a lug either side, the nuts and bolt
 *   ends proud; cast elbows with a coupling at each end;
 * - `thread`: screwed steel, a fitting's hexagon at each joint;
 * - `solder`: copper, a capillary fitting's slight collar at each joint;
 * - `weld`: welded steel or stainless, a slight bead at each joint;
 * - `band`: flue pipe, socket and spigot in metre lengths, each joint
 *   held by a locking band, a raised ring with its clamp and bolt;
 * - `none`: a plain bent pipe or tube, no joints shown.
 * Lagged pipe (`insulation`) shows only its cladding and the straps that
 * hold it, every metre.
 *
 * Where a run passes through a surface (`through`), the helper fits what a
 * fitter would at the hole, sized to the pipe and the surface:
 * - `grommet`: a rubber grommet through a thin panel (a cabinet's side),
 *   its rim on both faces;
 * - `escutcheon`: a cover rosette on a finished wall or floor, each face;
 * - `sleeve`: a wall sleeve, oversized, flush with both faces;
 * - `fire-collar`: an intumescent collar on a fire wall's face, its fixing
 *   tabs screwed to the wall;
 * - `flashing`: a roof's weather collar, a cone and a storm collar over it.
 */

export type PenetrationKind =
  | 'grommet'
  | 'escutcheon'
  | 'sleeve'
  | 'fire-collar'
  | 'flashing';

/** A surface a run passes through, and what is fitted where it does. */
export interface Penetration extends Plane {
  kind: PenetrationKind;
  /** The surface's thickness, m (its `at` the middle of it). */
  thickness?: number;
}

export type { PipeJoint };

export interface PipeStyle {
  /** Outside diameter, m. */
  od: number;
  joint?: PipeJoint;
  /** A bend's centre-line radius, in outside diameters; by joint if not given. */
  bend?: number;
  /** The length a pipe comes in, m: a joint between each. */
  lengths?: number;
  /** Lagging's thickness, m: drawn as its cladding over the pipe. */
  insulation?: number;
  /** Round the pipe: more for big pipes seen close. */
  segments?: number;
  /** The surfaces it passes through, each fitted where it does. */
  through?: readonly Penetration[];
  /**
   * How each end (start, then finish) is finished: `open` where it enters
   * a fitting or a machine's port; `cap`, the joint system's cap or blank;
   * `valve`, an isolating ball valve with its lever and a short tail beyond
   * to connect to; `valve-capped`, the same with the tail capped, as a
   * unit is shipped sealed. A dead end is never left open.
   */
  ends?: readonly [PipeEnd, PipeEnd];
}

export type PipeEnd = 'open' | 'cap' | 'valve' | 'valve-capped';

/** What a run is made of: the pipe, its fittings, their bolts, any cladding. */
export interface PipeMaterials {
  pipe: Material;
  fitting?: Material;
  bolt?: Material;
  cladding?: Material;
  /** Rubber, for grommets; the fittings' if not given. */
  seal?: Material;
}

type Part = keyof PipeMaterials;

/** Bends and lengths by joint: the route logic's, so its clash checks see what is drawn. */
const BEND = JOINT_BEND;
const LENGTHS = JOINT_LENGTHS;

const v3 = (a: Vec3) => new Vector3(a[0], a[1], a[2]);

/** A cylinder of radius `r` from `a` to `b`. */
function rod(a: Vector3, b: Vector3, r: number, segments: number) {
  const dir = b.clone().sub(a);
  const g = new CylinderGeometry(r, r, dir.length(), segments, 1, false);
  g.applyQuaternion(
    new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** A short cylinder of radius `r`, `l` long, centred at `at` along `dir`. */
function collar(
  at: Vector3,
  dir: Vector3,
  r: number,
  l: number,
  segments: number,
) {
  const half = dir
    .clone()
    .normalize()
    .multiplyScalar(l / 2);
  return rod(at.clone().sub(half), at.clone().add(half), r, segments);
}

/** Two directions square to `dir` and to each other. */
function frame(dir: Vector3) {
  const u = new Vector3(0, 1, 0);
  if (Math.abs(u.dot(dir)) > 0.9) u.set(1, 0, 0);
  const across = u.clone().cross(dir).normalize();
  const up = dir.clone().cross(across).normalize();
  return { across, up };
}

/** A bend's swept arc, as part of a torus turned into place. */
function arc(b: Bend, r: number, segments: number) {
  const centre = v3(b.centre);
  const toStart = v3(b.start).sub(centre).normalize();
  const toEnd = v3(b.end).sub(centre).normalize();
  const normal = new Vector3().crossVectors(toStart, toEnd).normalize();
  const y = new Vector3().crossVectors(normal, toStart);
  const g = new TorusGeometry(
    b.radius,
    r,
    segments,
    Math.max(6, Math.ceil((b.angle / (Math.PI / 2)) * 12)),
    b.angle,
  );
  g.applyMatrix4(
    new Matrix4().makeBasis(toStart, y, normal).setPosition(centre),
  );
  return g;
}

/**
 * The geometry of a run of pipe through `points` in `style`, by part (pipe,
 * fittings, bolts, cladding), for a caller to merge or batch.
 */
export function pipeGeometries(points: readonly Vec3[], style: PipeStyle) {
  const joint = style.joint ?? 'socket';
  const od = style.od;
  const r = od / 2;
  const seg = style.segments ?? (od > 0.15 ? 24 : od > 0.04 ? 16 : 10);
  const segments = planRoute(
    points,
    Math.max(style.bend ?? BEND[joint], style.insulation ? 1.5 : 0) *
      (od + 2 * (style.insulation ?? 0)),
  );
  const parts: Record<Part, BufferGeometry[]> = {
    pipe: [],
    fitting: [],
    bolt: [],
    cladding: [],
    seal: [],
  };
  addPenetrations(parts, segments, style, r + (style.insulation ?? 0), seg);

  // Lagged: its cladding over everything, strapped every metre.
  if (style.insulation) {
    const rc = r + style.insulation;
    for (const s of segments)
      parts.cladding.push(
        s.kind === 'straight'
          ? rod(v3(s.from), v3(s.to), rc, seg + 4)
          : arc(s, rc, seg + 4),
      );
    for (const j of jointsAlong(segments, 1))
      parts.fitting.push(collar(v3(j.at), v3(j.dir), rc * 1.02, 0.02, seg + 4));
    return parts;
  }

  /** The joint's fitting at `at`, on a pipe running `dir`. */
  const jointAt = (at: Vector3, dir: Vector3, end = false) => {
    switch (joint) {
      case 'socket':
        parts.fitting.push(
          collar(at, dir, r * 1.2, od * (end ? 0.7 : 1.4), seg),
        );
        break;
      case 'flange': {
        const fr = jointFitting('flange', r).radius;
        const t = Math.max(0.012, od * 0.12);
        for (const side of [-1, 1])
          parts.fitting.push(
            collar(
              at.clone().addScaledVector(dir, (side * t) / 2),
              dir,
              fr,
              t,
              seg + 8,
            ),
          );
        const bolts = od > 0.2 ? 12 : od > 0.1 ? 8 : 4;
        const pcd = (fr + r) / 2 + 0.004;
        const { across, up } = frame(dir);
        for (let k = 0; k < bolts; k++) {
          const a = ((k + 0.5) / bolts) * Math.PI * 2;
          const p = at
            .clone()
            .addScaledVector(across, Math.cos(a) * pcd)
            .addScaledVector(up, Math.sin(a) * pcd);
          parts.bolt.push(
            collar(p, dir, Math.max(0.005, od * 0.05), t * 2 + 0.02, 6),
          );
        }
        break;
      }
      case 'groove': {
        // The two half-housings, chunky cast iron: a body over the joint
        // and a lip at each edge where it grips the groove.
        const { across, up } = frame(dir);
        parts.fitting.push(collar(at, dir, r * 1.32, od * 0.5, seg + 4));
        for (const side of [-1, 1])
          parts.fitting.push(
            collar(
              at.clone().addScaledVector(dir, side * od * 0.29),
              dir,
              r * 1.2,
              od * 0.12,
              seg + 4,
            ),
          );
        // A lug either side where the halves meet, a bolt through each at a
        // tangent: its head one end, its nut and threaded end well proud
        // of the other.
        for (const side of [-1, 1]) {
          const lugAt = at.clone().addScaledVector(across, side * r * 1.45);
          const lug = new BoxGeometry(od * 0.3, od * 0.42, od * 0.46);
          lug.applyMatrix4(
            new Matrix4().makeBasis(across, up, dir).setPosition(lugAt),
          );
          parts.fitting.push(lug);
          const boltAt = at.clone().addScaledVector(across, side * r * 1.55);
          const br = Math.max(0.004, od * 0.06);
          parts.bolt.push(
            collar(
              boltAt.clone().addScaledVector(up, od * 0.12),
              up,
              br,
              od * 1.05,
              8,
            ),
          );
          // The nut, and the head at the other end.
          parts.bolt.push(
            collar(
              boltAt.clone().addScaledVector(up, od * 0.27),
              up,
              br * 1.9,
              od * 0.12,
              6,
            ),
          );
          parts.bolt.push(
            collar(
              boltAt.clone().addScaledVector(up, -od * 0.26),
              up,
              br * 1.9,
              od * 0.1,
              6,
            ),
          );
        }
        break;
      }
      case 'thread':
        parts.fitting.push(collar(at, dir, r * 1.3, od * 0.9, 6));
        break;
      case 'solder':
        parts.fitting.push(collar(at, dir, r * 1.1, od * 0.8, seg));
        break;
      case 'band': {
        parts.fitting.push(collar(at, dir, r * 1.05, od * 0.09, seg + 4));
        const { across, up } = frame(dir);
        const clampAt = at.clone().addScaledVector(up, r * 1.08);
        const clamp = new BoxGeometry(od * 0.1, od * 0.05, od * 0.09);
        clamp.applyMatrix4(
          new Matrix4().makeBasis(across, up, dir).setPosition(clampAt),
        );
        parts.fitting.push(clamp);
        parts.bolt.push(
          collar(
            clampAt.clone().addScaledVector(up, od * 0.02),
            across,
            Math.max(0.003, od * 0.012),
            od * 0.16,
            6,
          ),
        );
        break;
      }
      case 'weld':
        parts.fitting.push(collar(at, dir, r * 1.04, od * 0.12, seg));
        break;
      case 'none':
        break;
    }
  };
  for (const s of segments) {
    if (s.kind === 'straight')
      parts.pipe.push(rod(v3(s.from), v3(s.to), r, seg));
    else {
      // Socket, screwed and grooved elbows are fittings, fatter than the pipe.
      const fitted =
        joint === 'socket' || joint === 'thread' || joint === 'groove';
      (fitted ? parts.fitting : parts.pipe).push(
        arc(s, r * (fitted ? 1.08 : 1), seg),
      );
      if (joint !== 'none' && joint !== 'weld') {
        jointAt(v3(s.start), v3(s.in), true);
        jointAt(v3(s.end), v3(s.out), true);
      }
    }
  }
  for (const j of jointsAlong(segments, style.lengths ?? LENGTHS[joint]))
    jointAt(v3(j.at), v3(j.dir));

  // The ends: capped in the joint system's way, or valved and capped.
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (first && last) {
    const ends: [Vector3, Vector3][] = [
      [
        v3(first.kind === 'straight' ? first.from : first.start),
        v3(first.kind === 'straight' ? first.from : first.start)
          .sub(v3(first.kind === 'straight' ? first.to : first.end))
          .normalize(),
      ],
      [
        v3(last.kind === 'straight' ? last.to : last.end),
        v3(last.kind === 'straight' ? last.to : last.end)
          .sub(v3(last.kind === 'straight' ? last.from : last.start))
          .normalize(),
      ],
    ];
    /** A cap over the end at `at`, the pipe running out along `dir`. */
    const cap = (at: Vector3, dir: Vector3) => {
      const c = at.clone().addScaledVector(dir, -od * 0.05);
      switch (joint) {
        case 'flange':
          jointAt(c, dir, true);
          parts.fitting.push(
            collar(
              c.clone().addScaledVector(dir, Math.max(0.012, od * 0.12)),
              dir,
              Math.max(r * 1.9, r + 0.04),
              Math.max(0.012, od * 0.12),
              seg + 8,
            ),
          );
          break;
        case 'groove':
          jointAt(c, dir, true);
          parts.fitting.push(
            collar(
              c.clone().addScaledVector(dir, od * 0.2),
              dir,
              r * 1.05,
              od * 0.25,
              seg + 4,
            ),
          );
          break;
        case 'thread':
          parts.fitting.push(
            collar(
              c.clone().addScaledVector(dir, od * 0.25),
              dir,
              r * 1.3,
              od * 0.6,
              6,
            ),
          );
          break;
        default: {
          // A socket or capillary cap: a short sleeve over the end, closed.
          const sleeve =
            r * (joint === 'socket' ? 1.2 : joint === 'solder' ? 1.1 : 1.08);
          parts.fitting.push(
            collar(
              c.clone().addScaledVector(dir, od * 0.25),
              dir,
              sleeve,
              od * 0.6,
              seg,
            ),
          );
        }
      }
    };
    (style.ends ?? ['open', 'open']).forEach((end, i) => {
      const [at, dir] = ends[i];
      if (end === 'cap') cap(at, dir);
      if (end === 'valve' || end === 'valve-capped') {
        // A lever ball valve on the end, then a short tail to connect to.
        const body = at.clone().addScaledVector(dir, od * 0.9);
        parts.fitting.push(collar(body, dir, r * 1.55, od * 1.5, 12));
        parts.fitting.push(collar(body, dir, r * 1.25, od * 2.2, 6));
        const { up, across } = frame(dir);
        const stem = body.clone().addScaledVector(up, r * 1.55 + od * 0.25);
        parts.fitting.push(
          collar(stem, up, Math.max(0.004, od * 0.12), od * 0.5, 8),
        );
        // The lever, lying along the pipe: open.
        const lever = new BoxGeometry(
          od * 3,
          Math.max(0.004, od * 0.12),
          Math.max(0.01, od * 0.4),
        );
        lever.applyMatrix4(
          new Matrix4().makeBasis(dir, up, across).setPosition(
            stem
              .clone()
              .addScaledVector(up, od * 0.25)
              .addScaledVector(dir, od * 1.2),
          ),
        );
        parts.seal.push(lever);
        parts.pipe.push(
          rod(
            at.clone().addScaledVector(dir, od * 1.6),
            at.clone().addScaledVector(dir, od * 2.4),
            r,
            seg,
          ),
        );
        if (end === 'valve-capped')
          cap(at.clone().addScaledVector(dir, od * 2.4), dir);
      }
    });
  }
  return parts;
}

/** Each part's material: fittings, bolts and seals as the pipe's if not given. */
const materialOf = (m: PipeMaterials, part: Part) =>
  m[part] ??
  (part === 'bolt' || part === 'seal' ? (m.fitting ?? m.pipe) : m.pipe);

/** Turn geometry built along +y (a cylinder) or +z (a torus) to face `n`. */
const facing = (n: Vector3, from: Vector3) =>
  new Quaternion().setFromUnitVectors(from, n.clone().normalize());

/** The fittings where a run passes through each of `style.through`. */
function addPenetrations(
  parts: Record<Part, BufferGeometry[]>,
  segments: ReturnType<typeof planRoute>,
  style: PipeStyle,
  r: number,
  seg: number,
) {
  for (const through of style.through ?? []) {
    const n = v3(through.normal).normalize();
    const t = through.thickness ?? 0.02;
    for (const hit of crossings(segments, through)) {
      const p = v3(hit.at);
      /** A disc or ring of radius `ro`, `h` thick, on the surface, at `off` along its normal. */
      const disc = (ro: number, h: number, off: number) =>
        new CylinderGeometry(ro, ro, h, seg + 8, 1, false)
          .applyQuaternion(facing(n, new Vector3(0, 1, 0)))
          .translate(p.x + n.x * off, p.y + n.y * off, p.z + n.z * off);
      switch (through.kind) {
        case 'grommet': {
          const rim = Math.max(0.004, r * 0.22);
          for (const side of [-1, 1]) {
            const ring = new TorusGeometry(r + rim * 0.6, rim, 8, seg + 8);
            ring.applyQuaternion(facing(n, new Vector3(0, 0, 1)));
            const off = side * (t / 2 + rim * 0.4);
            ring.translate(p.x + n.x * off, p.y + n.y * off, p.z + n.z * off);
            parts.seal.push(ring);
          }
          parts.seal.push(disc(r + rim * 0.4, t + rim, 0));
          break;
        }
        case 'escutcheon':
          for (const side of [-1, 1])
            parts.fitting.push(
              disc(r * 1.9 + 0.01, 0.005, side * (t / 2 + 0.0025)),
            );
          break;
        case 'sleeve':
          parts.fitting.push(disc(r * 1.35 + 0.006, t + 0.004, 0));
          break;
        case 'fire-collar': {
          // On the face the normal points out of.
          const depth = Math.max(0.04, r * 0.8);
          parts.bolt.push(disc(r * 1.45 + 0.01, depth, t / 2 + depth / 2));
          const { across, up } = frame(n);
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
            const dirOut = across
              .clone()
              .multiplyScalar(Math.cos(a))
              .addScaledVector(up, Math.sin(a));
            const tab = new BoxGeometry(0.02, 0.003, 0.04);
            tab.applyMatrix4(
              new Matrix4()
                .makeBasis(dirOut.clone().cross(n), n, dirOut)
                .setPosition(
                  p
                    .clone()
                    .addScaledVector(n, t / 2 + 0.0015)
                    .addScaledVector(dirOut, r * 1.45 + 0.03),
                ),
            );
            parts.bolt.push(tab);
          }
          break;
        }
        case 'flashing': {
          const h = Math.max(0.12, r * 1.2);
          const cone = new CylinderGeometry(
            r * 1.1,
            r * 2.6 + 0.05,
            h,
            seg + 8,
            1,
            true,
          )
            .applyQuaternion(facing(n, new Vector3(0, 1, 0)))
            .translate(
              p.x + n.x * (t / 2 + h / 2),
              p.y + n.y * (t / 2 + h / 2),
              p.z + n.z * (t / 2 + h / 2),
            );
          parts.fitting.push(cone);
          parts.fitting.push(disc(r * 1.35, 0.03, t / 2 + h + 0.02));
          break;
        }
      }
    }
  }
}

/** Put a run's geometry into a batch (a services ceiling's sink), by material. */
export function putPipeRun(
  sink: { put(material: Material, geometry: BufferGeometry): void },
  points: readonly Vec3[],
  materials: PipeMaterials,
  style: PipeStyle,
) {
  const parts = pipeGeometries(points, style);
  for (const part of Object.keys(parts) as Part[])
    for (const g of parts[part]) sink.put(materialOf(materials, part), g);
}

/** A run of pipe through `points`, in `style`, as a group of merged meshes. */
export function createPipeRun(
  points: readonly Vec3[],
  materials: PipeMaterials,
  style: PipeStyle,
) {
  const parts = pipeGeometries(points, style);
  const group = new Group();
  group.name = `Pipe run (${style.joint ?? 'socket'}, ${Math.round(style.od * 1000)} mm)`;
  const byMaterial = new Map<Material, BufferGeometry[]>();
  for (const part of Object.keys(parts) as Part[]) {
    const m = materialOf(materials, part);
    byMaterial.set(m, [...(byMaterial.get(m) ?? []), ...parts[part]]);
  }
  for (const [m, list] of byMaterial) {
    if (!list.length) continue;
    const merged = mergeGeometries(list, false);
    for (const g of list) g.dispose();
    if (merged) group.add(new Mesh(merged, m));
  }
  return group;
}

/** A flexible hose or tube through `points`, smoothly curved, `od` across. */
export function createFlexHose(
  points: readonly Vec3[],
  material: Material,
  od: number,
) {
  const curve = new CatmullRomCurve3(points.map(v3), false, 'centripetal');
  const mesh = new Mesh(
    new TubeGeometry(curve, Math.max(16, points.length * 12), od / 2, 10),
    material,
  );
  mesh.name = `Flexible hose (${Math.round(od * 1000)} mm)`;
  return mesh;
}

/**
 * A run of square trunking (`square` kinds: plug-in busbar trunking)
 * through `points`, every turn square: each length a box `od` across, a
 * joint pack round it every `lengths`, an elbow unit at each turn, an end
 * cap where an end is `cap`, and a fire-stopping frame where it passes
 * through a surface. Its turns are its points'; it does not bend.
 */
export function createTrunkingRun(
  points: readonly Vec3[],
  materials: PipeMaterials,
  style: PipeStyle,
) {
  const w = style.od;
  const casing: BufferGeometry[] = [];
  const fittings: BufferGeometry[] = [];
  /** A box `along` long, `across` square, centred at `at`, along `dir`. */
  const block = (at: Vector3, dir: Vector3, along: number, across: number) => {
    const g = new BoxGeometry(across, along, across);
    g.applyQuaternion(
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir),
    );
    g.translate(at.x, at.y, at.z);
    return g;
  };
  const lengths = style.lengths ?? 3;
  for (let i = 1; i < points.length; i++) {
    const a = v3(points[i - 1]);
    const b = v3(points[i]);
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-6) continue;
    dir.normalize();
    casing.push(block(a.clone().add(b).multiplyScalar(0.5), dir, len, w));
    // Its joint packs, a length apart from its start.
    for (let s = lengths; s < len - 0.05; s += lengths)
      fittings.push(
        block(a.clone().addScaledVector(dir, s), dir, 0.08, w + 0.02),
      );
    // Fire-stopping where it passes through a surface: a square frame.
    for (const through of style.through ?? []) {
      const n = v3(through.normal).normalize();
      const denom = dir.dot(n);
      if (Math.abs(denom) < 1e-6) continue;
      const t = v3(through.at).sub(a).dot(n) / denom;
      if (t < -1e-6 || t > len + 1e-6) continue;
      fittings.push(
        block(
          a.clone().addScaledVector(dir, t),
          dir,
          (through.thickness ?? 0.02) + 0.01,
          w + 0.06,
        ),
      );
    }
  }
  // An elbow unit at each turn.
  for (let i = 1; i < points.length - 1; i++)
    fittings.push(
      new BoxGeometry(w + 0.01, w + 0.01, w + 0.01).translate(...points[i]),
    );
  // An end cap at a capped end.
  (style.ends ?? ['open', 'open']).forEach((end, k) => {
    if (end !== 'cap' || points.length < 2) return;
    const tip = v3(points[k === 0 ? 0 : points.length - 1]);
    const inner = v3(points[k === 0 ? 1 : points.length - 2]);
    const dir = tip.clone().sub(inner).normalize();
    fittings.push(
      block(tip.clone().addScaledVector(dir, 0.01), dir, 0.02, w + 0.01),
    );
  });
  const group = new Group();
  group.name = `Trunking run (${Math.round(w * 1000)} mm)`;
  for (const [m, list] of [
    [materials.pipe, casing],
    [materials.fitting ?? materials.pipe, fittings],
  ] as const) {
    if (!list.length) continue;
    const merged = mergeGeometries(list, false);
    for (const g of list) g.dispose();
    if (merged) group.add(new Mesh(merged, m));
  }
  return group;
}
