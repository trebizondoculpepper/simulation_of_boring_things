import { Box3, Matrix4, Quaternion, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { click, partAudio } from '../../core/audio/part-audio';
import {
  BIN_MAGNET_REACH,
  distanceToBin,
  arcSeconds,
  binArc,
  binRest,
} from '../logic/bin-toss';
import type { BinShape, Point3 } from '../logic/bin-toss';
import type { PortableObject } from '../../../controls/input/object-handling';
import type { PlacementTarget } from '../../../controls/input/placement-target';

/** A bin things can be thrown into: its model, its inside and where it is. */
export interface TossBin {
  name: string;
  /** Its model, placed by `x` and `z` (metres) on the floor. */
  group: Object3D;
  shape: BinShape;
  /** Its size on the floor plan, metres, its length along x. */
  footprint: { x: number; z: number };
  x: number;
  z: number;
}

// Landing in a steel skip: a hollow clang.
const clang = click({
  band: 820,
  q: 7,
  decay: 0.45,
  level: 0.3,
  thump: [72, 0.16],
});

/**
 * Throwing things into bins, for any room (`src/toolkit/components/site-dressing/logic/bin-toss.ts` is the
 * rule): pass `divert` to `createFirstPerson`, and a released object let
 * go within two metres of the nearest edge of a bin's opening flies in a
 * parabola into the nearest bin, turning to lie flat along it, and
 * lands with a clang on whatever is already there, where it stays,
 * locked. Bins can be added at any time, so a room may conjure one up.
 * Objects are in the scene's frame, `metre` units to the metre.
 */
export function createBinTossing({
  camera,
  metre: m,
  random = Math.random,
  onLanded = () => {},
}: {
  camera: Camera;
  metre: number;
  random?: () => number;
  /** Called as each object lands in its bin. */
  onLanded?: (object: Object3D, bin: TossBin) => void;
}) {
  const bins: (TossBin & { filled: number })[] = [];
  const tosses: {
    object: Object3D;
    portable: PortableObject;
    from: Point3;
    to: Point3;
    fromQ: Quaternion;
    toQ: Quaternion;
    centre: Vector3;
    age: number;
    seconds: number;
    bin: TossBin;
  }[] = [];
  const eye = new Vector3();
  /** Where an object's middle is, in its own frame, scaled. */
  const middleOf = (object: Object3D) => {
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const centre = box.getCenter(new Vector3());
    return object.worldToLocal(centre).multiply(object.scale);
  };
  /** Send `object` into `bin` from where it is now. */
  const toss = (
    object: Object3D,
    portable: PortableObject,
    bin: TossBin & { filled: number },
  ) => {
    const centre = middleOf(object);
    const start = object.position
      .clone()
      .add(centre.clone().applyQuaternion(object.quaternion))
      .divideScalar(m);
    const rest = binRest(bin.filled++, bin.shape, random);
    const to = { x: bin.x + rest.x, y: rest.y + 0.02, z: bin.z + rest.z };
    // Lying flat (its thinnest side up) with its length along the bin,
    // then tipped up at the end as the bin fills, and turned a little.
    const turned = object.quaternion.clone();
    object.quaternion.identity();
    object.updateMatrixWorld(true);
    const own = new Box3().setFromObject(object).getSize(new Vector3());
    object.quaternion.copy(turned);
    object.updateMatrixWorld(true);
    const axes = [
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 1),
    ].sort((p, q) => own.dot(p) - own.dot(q));
    const thin = axes[0];
    const long = axes[2];
    const across = long.clone().cross(thin);
    const lay = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(long, thin, across).transpose(),
    );
    const toQ = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), rest.yaw)
      .multiply(
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rest.tilt),
      )
      .multiply(lay);
    tosses.push({
      object,
      portable,
      from: { x: start.x, y: start.y, z: start.z },
      to,
      fromQ: object.quaternion.clone(),
      toQ,
      centre,
      age: 0,
      seconds: arcSeconds(Math.hypot(start.x - to.x, start.z - to.z)),
      bin,
    });
  };
  const available = (bin: TossBin) => {
    if (!bin.group.parent) return false;
    for (let at: Object3D | null = bin.group; at; at = at.parent)
      if (!at.visible) return false;
    return true;
  };
  const distance = (object: Object3D, bin: TossBin) => {
    const centre = new Box3()
      .setFromObject(object)
      .getCenter(new Vector3())
      .divideScalar(m);
    return distanceToBin(centre, bin, bin.footprint, bin.group.rotation.y);
  };
  /** Shared by the cue, the aimed placement and the magnetic release. */
  const accepts = (object: Object3D, bin: TossBin) =>
    available(bin) && distance(object, bin) <= BIN_MAGNET_REACH;
  const nearest = (object: Object3D) => {
    camera.getWorldPosition(eye).divideScalar(m);
    return bins
      .filter((bin) => accepts(object, bin))
      .sort(
        (a, b) =>
          distance(object, a) - distance(object, b) ||
          Math.hypot(a.x - eye.x, a.z - eye.z) -
            Math.hypot(b.x - eye.x, b.z - eye.z),
      )[0];
  };
  return {
    bins: bins as readonly (TossBin & { filled: number })[],
    /** Add a bin to throw things into; it must already be in the scene. */
    add(bin: TossBin) {
      const entry = Object.assign(bin, { filled: 0 });
      bins.push(entry);
      const target: PlacementTarget = {
        reach: Infinity,
        inRange: (object) => accepts(object, entry),
        accepts: (object) => accepts(object, entry),
        place: (object, portable) => {
          portable.component.drop();
          toss(object, portable, entry);
        },
      };
      entry.group.userData.placementTarget = target;
      return entry;
    },
    /** Take a bin away; anything on its way into it lands nowhere. */
    remove(bin: TossBin) {
      const at = bins.findIndex((b) => b === bin);
      if (at >= 0) {
        bins.splice(at, 1);
        delete bin.group.userData.placementTarget;
      }
      for (let i = tosses.length - 1; i >= 0; i--)
        if (tosses[i].bin === bin) tosses.splice(i, 1);
    },
    /** Whether anything is on its way into `bin`. */
    incoming: (bin: TossBin) => tosses.some((t) => t.bin === bin),
    /** For `createFirstPerson`: take a released object into a bin, or not. */
    divert(object: Object3D, portable: PortableObject) {
      const bin = nearest(object);
      if (!bin) return false;
      toss(object, portable, bin);
      return true;
    },
    /** Green whenever the ordinary magnetic release would take this object. */
    targetFeedback: (object: Object3D) =>
      nearest(object) ? ('accept' as const) : null,
    /** Throw `object` straight into the named bin (for development). */
    toss(object: Object3D, portable: PortableObject, name: string) {
      const bin = bins.find((b) => b.name === name) ?? bins[0];
      if (bin) toss(object, portable, bin);
    },
    /** Fly whatever is on its way into a bin. */
    update(delta: number) {
      for (let i = tosses.length - 1; i >= 0; i--) {
        const t = tosses[i];
        t.age += delta;
        const k = Math.min(1, t.age / t.seconds);
        const at = binArc(t.from, t.to, k);
        t.object.quaternion.copy(t.fromQ).slerp(t.toQ, k);
        t.object.position
          .set(at.x * m, at.y * m, at.z * m)
          .sub(t.centre.clone().applyQuaternion(t.object.quaternion));
        if (k < 1) continue;
        // Landed: on the bin's bottom, or on what is already in it.
        tosses.splice(i, 1);
        t.portable.component.impact(1.4, 0);
        t.portable.component.settle();
        t.portable.component.setLocked(true);
        partAudio.play(clang, t.object);
        onLanded(t.object, t.bin);
      }
    },
  };
}
