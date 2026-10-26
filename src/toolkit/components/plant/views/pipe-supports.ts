import { markComponent } from '../../core/views/component-identity';
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { Support, SupportPlan, Vec3 } from '../logic/pipe-supports';

/**
 * A room's pipe and conduit supports, as planned (`logic/pipe-supports.ts`),
 * drawn in galvanised steel: a split ring round each pipe (round its
 * lagging, if lagged), and what holds it, made after real channel-strut
 * hardware:
 *
 * - a hanger: an M10 drop rod up to a ceiling plate on the soffit (or under
 *   a landing's deck);
 * - a trapeze: a length of 41 × 41 mm channel under the pipes, on two drop
 *   rods, each to its ceiling plate;
 * - a wall bracket or clamp: a channel arm out from a base plate on the
 *   wall;
 * - a floor stand: a channel post on its base plate;
 * - off a machine: a short channel arm to its frame.
 *
 * All drawn as instanced meshes, a few draw calls for a room's hundreds of
 * supports. `floorY` lifts the room's floor-relative plan into place.
 */
export function createSupports(kit: PanelKit, plan: SupportPlan, floorY = 0) {
  const group = new Group();
  group.name = 'pipe supports';
  // Structure: it holds the pipes up and does nothing more (prompt 064).
  markComponent(group, { decorative: true });
  const galv = new MeshStandardMaterial({
    color: '#a9aeae',
    roughness: 0.45,
    metalness: 0.6,
  });
  kit.materials.push(galv);
  // Hardwood bearer blocks under heavy pipes (the owner, 2026-10-26): the
  // timber spreads the load and keeps the pipe off the steel.
  const wood = new MeshStandardMaterial({
    color: '#8a5a32',
    roughness: 0.85,
    metalness: 0,
  });
  kit.materials.push(wood);

  const lift = (p: Vec3) => new Vector3(p[0], p[1] + floorY, p[2]);
  const up = new Vector3(0, 1, 0);
  const rods: Matrix4[] = [];
  const channels: Matrix4[] = [];
  const plates: Matrix4[] = [];
  const rings: Matrix4[] = [];
  const blocks: Matrix4[] = [];
  /** Pipes this big or bigger (outside radius, m: DN150) sit on timber. */
  const HEAVY = 0.08;
  /**
   * A hardwood block from under the pipe at `s` down to `to` (directly
   * below it), as long along the pipe as the pipe is wide, a little
   * narrower across it.
   */
  const block = (s: Support, to: Vector3) => {
    const at = lift(s.at);
    const top = at.y - s.radius;
    const h = top - to.y;
    if (h < 0.01 || s.along === 'y') return false;
    const along = Math.max(0.12, s.radius * 1.2);
    const across = s.radius * 1.6;
    blocks.push(
      new Matrix4().compose(
        new Vector3(to.x, to.y + h / 2, to.z),
        new Quaternion(),
        s.along === 'x'
          ? new Vector3(along, h, across)
          : new Vector3(across, h, along),
      ),
    );
    return true;
  };

  /** A cylinder of `radius` from `a` to `b` (unit cylinder, scaled). */
  const between = (list: Matrix4[], a: Vector3, b: Vector3, radius: number) => {
    const d = b.clone().sub(a);
    const length = d.length();
    if (length < 1e-4) return;
    const q = new Quaternion().setFromUnitVectors(up, d.normalize());
    list.push(
      new Matrix4().compose(
        a.clone().add(b).multiplyScalar(0.5),
        q,
        new Vector3(radius, length, radius),
      ),
    );
  };
  /** A 41 × 41 mm channel from `a` to `b`. */
  const channel = (a: Vector3, b: Vector3) => {
    const d = b.clone().sub(a);
    const length = d.length();
    if (length < 1e-4) return;
    const q = new Quaternion().setFromUnitVectors(up, d.normalize());
    channels.push(
      new Matrix4().compose(
        a.clone().add(b).multiplyScalar(0.5),
        q,
        new Vector3(0.041, length, 0.041),
      ),
    );
  };
  /** A square plate, `size` across, facing `normal`, at `at`. */
  const plate = (at: Vector3, normal: Vector3, size = 0.1) => {
    const q = new Quaternion().setFromUnitVectors(
      up,
      normal.clone().normalize(),
    );
    plates.push(new Matrix4().compose(at, q, new Vector3(size, 0.008, size)));
  };
  /** A split ring round the pipe at `s`, in the plane across its run. */
  const ring = (s: Support) => {
    const axis =
      s.along === 'x'
        ? new Vector3(1, 0, 0)
        : s.along === 'z'
          ? new Vector3(0, 0, 1)
          : new Vector3(0, 1, 0);
    // The unit torus lies in the xy plane, its axis along z.
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), axis);
    const r = s.radius + 0.008;
    rings.push(new Matrix4().compose(lift(s.at), q, new Vector3(r, r, r)));
  };
  /** From the pipe's surface toward `to`: where the member starts. */
  const surface = (s: Support, to: Vector3) => {
    const at = lift(s.at);
    const d = to.clone().sub(at);
    const n = d.length();
    return n < 1e-6
      ? at
      : at.addScaledVector(d, Math.min(1, (s.radius + 0.01) / n));
  };

  const drawnTrapezes = new Set<number>();
  for (const s of plan.supports) {
    const to = lift(s.to);
    switch (s.type) {
      case 'in-duct':
        // On the duct's bed, out of sight under its cover.
        break;
      case 'hanger': {
        ring(s);
        const top = surface(s, to);
        between(rods, top, to, 0.005);
        plate(to, new Vector3(0, -1, 0), 0.08);
        break;
      }
      case 'trapeze': {
        ring(s);
        if (s.own) {
          const [a, b] = s.own.map(lift);
          channel(a, b);
          for (const end of [a, b]) {
            const fix = end.clone();
            fix.y = plan.soffit + floorY;
            between(rods, end, fix, 0.005);
            plate(fix, new Vector3(0, -1, 0), 0.08);
          }
          // The pipe's saddle down to the channel: timber under a heavy one.
          if (!(s.radius >= HEAVY && block(s, to)))
            between(rods, surface(s, to), to, 0.006);
        } else if (s.trapeze !== undefined) {
          if (!(s.radius >= HEAVY && block(s, to)))
            between(rods, surface(s, to), to, 0.006);
          if (!drawnTrapezes.has(s.trapeze)) {
            drawnTrapezes.add(s.trapeze);
            const t = plan.trapezes[s.trapeze];
            const a = lift(t.from);
            const b = lift(t.to);
            channel(a, b);
            for (const end of [a, b]) {
              const fix = end.clone();
              fix.y = t.top + floorY;
              between(rods, end, fix, 0.005);
              plate(fix, new Vector3(0, -1, 0), 0.08);
            }
          }
        }
        break;
      }
      case 'wall-bracket':
      case 'wall-clamp':
      case 'machine': {
        ring(s);
        channel(surface(s, to), to);
        const normal = lift(s.at).sub(to);
        if (normal.lengthSq() > 1e-8) plate(to, normal, 0.1);
        break;
      }
      case 'floor-stand': {
        ring(s);
        // A heavy pipe on a timber block on its post.
        const seat = lift(s.at);
        seat.y -= s.radius + Math.min(0.1, s.radius);
        if (s.radius >= HEAVY && seat.y > to.y + 0.05 && block(s, seat))
          channel(seat, to);
        else channel(surface(s, to), to);
        plate(to, up, 0.14);
        break;
      }
    }
  }

  const instanced = (
    geometry: BufferGeometry,
    list: Matrix4[],
    name: string,
  ) => {
    if (!list.length) return;
    const mesh = new InstancedMesh(
      geometry,
      list === blocks ? wood : galv,
      list.length,
    );
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = name;
    mesh.computeBoundingSphere();
    group.add(mesh);
  };
  instanced(new CylinderGeometry(1, 1, 1, 6), rods, 'drop rods');
  instanced(new BoxGeometry(1, 1, 1), channels, 'channel strut');
  instanced(new BoxGeometry(1, 1, 1), plates, 'base and ceiling plates');
  instanced(new TorusGeometry(1, 0.1, 6, 20), rings, 'pipe rings');
  instanced(new BoxGeometry(1, 1, 1), blocks, 'hardwood bearer blocks');
  return group;
}
