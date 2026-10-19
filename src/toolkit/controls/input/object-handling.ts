import {
  Box3,
  Euler,
  Matrix4,
  Mesh,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { assertDropProfile } from '../logic/drop-profile';
import type { Object3D, PerspectiveCamera } from 'three';
import type { createPortableBoard } from '../logic/portable-board';
import { createBoardFall } from '../logic/portable-board';
import { plinthOccupied } from './placement-target';
import type { PlacementTarget } from './placement-target';

export interface PortableObject {
  component: ReturnType<typeof createPortableBoard>;
  /** Disconnect the electrical component and stop its installed animation. */
  detach(): void;
  flat: 'face' | 'side' | 'upright';
}

/** Ignore the carried model when aiming past it at a separate control. */
export function isHeldPortableHit(object: Object3D): boolean {
  for (let at: Object3D | null = object; at; at = at.parent) {
    const portable = at.userData.portable as PortableObject | undefined;
    if (portable?.component.phase.value === 'held') return true;
  }
  return false;
}
export interface SupportSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
}

export interface DropPlacement {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
}

/** Shared first-person use behaviour, with no input bindings of its own. */
export function createObjectHandling(
  root: Object3D,
  camera: PerspectiveCamera,
  metre: number,
  floorY: number,
  supports: () => readonly SupportSurface[] = () => [],
  /**
   * A room's chance to take a released object itself (a toss into a bin):
   * return true and the object is the room's to move; it is not dropped.
   */
  divert?: (object: Object3D, portable: PortableObject) => boolean,
  /** Room geometry may move a release clear of an inaccessible enclosure. */
  redirectDrop?: (placement: DropPlacement) => DropPlacement,
  /** A held part cannot pass through these coarse world-space solid volumes. */
  carrySolids: () => readonly Box3[] = () => [],
  /** Give a room first chance to seat or magnetically bin a held part. */
  heldAction?: (
    object: Object3D,
    portable: PortableObject,
    x: number,
    y: number,
  ) => boolean | 'refuse',
  /** A room may interlock pickup of installed parts. */
  allowPickup?: (object: Object3D, portable: PortableObject) => boolean,
  targetFeedback?: (
    object: Object3D,
    portable: PortableObject,
    x: number,
    y: number,
  ) => 'accept' | 'reject' | null,
  nearbyTargetFeedback?: (
    object: Object3D,
    portable: PortableObject,
  ) => 'accept' | 'reject' | null,
) {
  const fixedSupports: SupportSurface[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (object.userData.portable)
      assertDropProfile(
        (object.userData.portable as PortableObject).component.dropProfile,
      );
    if (!object.userData.boardSupport) return;
    const bounds = new Box3().setFromObject(object);
    fixedSupports.push({
      minX: bounds.min.x / metre,
      maxX: bounds.max.x / metre,
      minZ: bounds.min.z / metre,
      maxZ: bounds.max.z / metre,
      top: bounds.max.y / metre,
    });
  });
  const ray = new Raycaster(),
    point = new Vector2();
  const records = new Map<
    Object3D,
    {
      parent: Object3D;
      portable: PortableObject;
      position: Vector3;
      rotation: Quaternion;
      scale: Vector3;
    }
  >();
  const falling = new Map<
    Object3D,
    {
      motion: ReturnType<typeof createBoardFall>;
      from: Quaternion;
      flat: Quaternion;
      centre: Vector3;
      size: Vector3;
      axis: Vector3;
      halfHeight: number;
      age: number;
    }
  >();
  let held: {
    object: Object3D;
    grab: Vector3;
    offset: Vector3;
    rotation: Quaternion;
  } | null = null;
  const cameraRotation = new Quaternion();
  const worldRotation = new Quaternion();
  const worldPosition = new Vector3();
  const portableAt = (
    object: Object3D,
  ): { object: Object3D; portable: PortableObject } | null => {
    for (let o: Object3D | null = object; o; o = o.parent) {
      if (o.userData.portable)
        return { object: o, portable: o.userData.portable as PortableObject };
    }
    return null;
  };
  const hitAt = (x: number, y: number) => {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    ray.setFromCamera(point.set(x, y), camera);
    return ray
      .intersectObject(root, true)
      .find((hit) => visible(hit.object) && !hit.object.userData.noCollision);
  };
  const visible = (object: Object3D) => {
    for (let at: Object3D | null = object; at; at = at.parent)
      if (!at.visible || at === held?.object) return false;
    return true;
  };
  const surfaceTarget = (plinth: Object3D, deck: Object3D): PlacementTarget => {
    const occupied = (object: Object3D) => {
      if (plinthOccupied(plinth, object)) return true;
      const top = new Box3().setFromObject(deck);
      const candidates = new Set<Object3D>(records.keys());
      return [...candidates].some((other) => {
        if (other === object || !visible(other)) return false;
        const portable = other.userData.portable as PortableObject | undefined;
        if (!portable || portable.component.phase.value === 'held')
          return false;
        const bounds = new Box3().setFromObject(other);
        return (
          bounds.max.x > top.min.x &&
          bounds.min.x < top.max.x &&
          bounds.max.z > top.min.z &&
          bounds.min.z < top.max.z &&
          bounds.min.y >= top.max.y - 0.04 * metre &&
          bounds.min.y < top.max.y + 0.15 * metre
        );
      });
    };
    return {
      accepts: (object) => !occupied(object),
      place(object, portable) {
        const deckBounds = new Box3().setFromObject(deck);
        const centre = deckBounds.getCenter(new Vector3());
        // Preserve the carried orientation, and rest the actual model on top.
        root.attach(object);
        const bounds = new Box3().setFromObject(object);
        const middle = bounds.getCenter(new Vector3());
        const destination = object
          .getWorldPosition(new Vector3())
          .add(
            new Vector3(
              centre.x - middle.x,
              deckBounds.max.y - bounds.min.y,
              centre.z - middle.z,
            ),
          );
        object.position.copy(root.worldToLocal(destination));
        plinth.attach(object);
        portable.component.drop();
        portable.component.settle();
        portable.component.motion(0, true);
      },
    };
  };
  /** Ignore the held model itself; a destination can be seen behind it. */
  const placementAt = (x: number, y: number) => {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    ray.setFromCamera(point.set(x, y), camera);
    const hit = ray
      .intersectObject(root, true)
      .find((hit) => visible(hit.object) && !hit.object.userData.noCollision);
    if (!hit) return null;
    for (let at: Object3D | null = hit.object; at; at = at.parent) {
      const target = at.userData.placementTarget as PlacementTarget | undefined;
      const deck = at.userData.placementSurface as Object3D | undefined;
      if (target || deck) {
        const destination = target ?? surfaceTarget(at, deck!);
        const portable = records.get(held!.object)!.portable;
        if (
          hit.distance > (destination.reach ?? 3.2) * metre ||
          destination.inRange?.(held!.object, portable) === false
        )
          return null;
        return {
          target: destination,
          accepts: destination.accepts(held!.object, portable),
          retainReset: Boolean(deck),
        };
      }
    }
    return null;
  };
  const release = (x: number, y: number) => {
    if (!held) return;
    const { object } = held;
    const portable = records.get(object)!.portable;
    const action = heldAction?.(object, portable, x, y);
    if (action === 'refuse') return;
    if (action) {
      records.delete(object);
      held = null;
      return;
    }
    const destination = placementAt(x, y);
    if (destination) {
      if (!destination.accepts) return;
      destination.target.place(object, portable);
      if (!destination.retainReset) records.delete(object);
      held = null;
      return;
    }
    portable.component.drop();
    if (divert?.(object, portable)) {
      // The room's to move from now on: it is not put back where it was
      // picked up, even if it is installed again somewhere else.
      records.delete(object);
      held = null;
      return;
    }
    const profile = portable.component.dropProfile;
    assertDropProfile(profile);
    const forward = camera.getWorldDirection(new Vector3());
    const vx = forward.x * 0.65 + 0.12;
    const vz = forward.z * 0.65;
    const axis = new Vector3(vz, 0, -vx).normalize();
    if (axis.lengthSq() === 0) axis.set(1, 0, 0);
    const flat =
      portable.flat === 'upright'
        ? new Quaternion()
        : new Quaternion().setFromAxisAngle(
            portable.flat === 'side'
              ? new Vector3(0, 0, 1)
              : new Vector3(1, 0, 0),
            portable.flat === 'side' ? Math.PI / 2 : -Math.PI / 2,
          );
    if (profile.shape === 'round')
      flat.setFromUnitVectors(
        new Vector3(
          profile.rollAxis === 'x' ? 1 : 0,
          profile.rollAxis === 'y' ? 1 : 0,
          profile.rollAxis === 'z' ? 1 : 0,
        ),
        axis,
      );
    // Bounds in the object's own frame, independent of where it was grabbed.
    object.updateMatrixWorld(true);
    const inverse = object.matrixWorld.clone().invert();
    const bounds = new Box3();
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox)
        bounds.union(
          child.geometry.boundingBox
            .clone()
            .applyMatrix4(
              new Matrix4().multiplyMatrices(inverse, child.matrixWorld),
            ),
        );
    });
    const centre = bounds
      .getCenter(new Vector3())
      .multiply(object.scale)
      .divideScalar(metre);
    const size = bounds
      .getSize(new Vector3())
      .multiply(object.scale)
      .divideScalar(metre);
    const original = object.quaternion.clone();
    const position = object.position
      .clone()
      .divideScalar(metre)
      .add(centre.clone().applyQuaternion(original));
    const placed = redirectDrop?.({
      x: position.x,
      y: position.y,
      z: position.z,
      vx,
      vz,
    }) ?? { x: position.x, y: position.y, z: position.z, vx, vz };
    position.set(placed.x, placed.y, placed.z);
    object.position
      .copy(position)
      .sub(centre.clone().applyQuaternion(original))
      .multiplyScalar(metre);
    falling.set(object, {
      motion: createBoardFall(
        position.x,
        position.y,
        position.z,
        placed.vx,
        placed.vz,
        profile,
      ),
      from: original,
      flat,
      centre,
      size,
      axis,
      halfHeight: size.y / 2,
      age: 0,
    });
    held = null;
  };
  return {
    holding: () => held !== null,
    heldObject: () => held?.object ?? null,
    targetFeedback(x: number, y: number) {
      if (!held) return null;
      const portable = records.get(held.object)!.portable;
      const custom = targetFeedback?.(held.object, portable, x, y);
      if (custom) return custom;
      const destination = placementAt(x, y);
      return destination
        ? destination.accepts
          ? 'accept'
          : 'reject'
        : (nearbyTargetFeedback?.(held.object, portable) ?? null);
    },
    rotate(yaw: number, pitch: number) {
      if (!held) return;
      const previous = held.rotation.clone();
      held.rotation.premultiply(
        new Quaternion().setFromEuler(new Euler(-pitch, yaw, 0, 'YXZ')),
      );
      camera.getWorldQuaternion(cameraRotation);
      held.object.quaternion.copy(cameraRotation).multiply(held.rotation);
      held.object.updateMatrixWorld(true);
      const rotated = new Box3().setFromObject(held.object);
      if (carrySolids().some((solid) => rotated.intersectsBox(solid))) {
        held.rotation.copy(previous);
        held.object.quaternion.copy(cameraRotation).multiply(previous);
      }
    },
    use(x: number, y: number) {
      if (held) {
        const portable = records.get(held.object)!.portable;
        if (!targetFeedback?.(held.object, portable, x, y)) {
          const hit = hitAt(x, y);
          if (hit && hit.distance <= 3.2 * metre)
            for (let at: Object3D | null = hit.object; at; at = at.parent)
              if (at.userData.useWhileCarrying) return false;
        }
        release(x, y);
        return true;
      }
      const hit = hitAt(x, y);
      if (!hit || hit.distance > 3.2 * metre) return false;
      const found = portableAt(hit.object);
      if (!found || !found.portable.component.canPickUp.value) return false;
      const { object, portable } = found;
      if (allowPickup && !allowPickup(object, portable)) return false;
      if (!records.has(object))
        records.set(object, {
          parent: object.parent!,
          portable,
          position: object.position.clone(),
          rotation: object.quaternion.clone(),
          scale: object.scale.clone(),
        });
      assertDropProfile(portable.component.dropProfile);
      portable.component.pickUp();
      portable.detach();
      root.attach(object);
      falling.delete(object);
      object.updateMatrixWorld(true);
      camera.getWorldQuaternion(cameraRotation);
      held = {
        object,
        grab: camera.worldToLocal(hit.point.clone()),
        offset: object.worldToLocal(hit.point.clone()),
        rotation: cameraRotation
          .clone()
          .invert()
          .multiply(object.getWorldQuaternion(new Quaternion())),
      };
      return true;
    },
    aimed() {
      const hit = hitAt(0, 0);
      return Boolean(
        held ||
        (hit &&
          hit.distance <= 3.2 * metre &&
          portableAt(hit.object)?.portable.component.canPickUp.value),
      );
    },
    update(dt: number) {
      // Only dev0 requests a model reset; ordinary drops never reattach themselves.
      for (const [object, record] of records) {
        if (record.portable.component.phase.value !== 'installed') continue;
        record.parent.add(object);
        object.position.copy(record.position);
        object.quaternion.copy(record.rotation);
        object.scale.copy(record.scale);
        falling.delete(object);
        if (held?.object === object) held = null;
        records.delete(object);
      }
      if (held) {
        camera.getWorldQuaternion(cameraRotation);
        worldRotation.copy(cameraRotation).multiply(held.rotation);
        held.object.quaternion.copy(worldRotation);
        held.grab.lerp(
          new Vector3(0.18 * metre, -0.18 * metre, -0.65 * metre),
          Math.min(1, dt * 12),
        );
        worldPosition
          .copy(held.offset)
          .multiply(held.object.scale)
          .applyQuaternion(worldRotation);
        const start = held.object.position.clone();
        const target = camera
          .localToWorld(held.grab.clone())
          .sub(worldPosition);
        const travel = target.clone().sub(start);
        const solids = carrySolids();
        if (solids.length) {
          held.object.updateMatrixWorld(true);
          const startBox = new Box3().setFromObject(held.object);
          const candidate = new Box3();
          const steps = Math.min(
            48,
            Math.max(1, Math.ceil(travel.length() / (0.04 * metre))),
          );
          let safe = 0;
          for (let i = 1; i <= steps; i++) {
            candidate
              .copy(startBox)
              .translate(travel.clone().multiplyScalar(i / steps));
            if (
              solids.some(
                (solid) =>
                  candidate.intersectsBox(solid) &&
                  !startBox.intersectsBox(solid),
              )
            )
              break;
            safe = i / steps;
          }
          held.object.position.copy(start).addScaledVector(travel, safe);
        } else held.object.position.copy(target);
      }
      for (const [object, fall] of falling) {
        const portable = records.get(object)!.portable;
        fall.age += dt;
        const previous = fall.motion.body;
        const profile = portable.component.dropProfile;
        const rotate = () => {
          if (profile.shape === 'flat') {
            object.quaternion
              .copy(fall.from)
              .slerp(fall.flat, Math.min(1, fall.age / 0.32));
          } else {
            let angle = previous.angle;
            if (profile.shape === 'box') {
              const speed = Math.hypot(previous.vx, previous.vz);
              const snap = previous.grounded ? Math.max(0, 1 - speed / 0.2) : 0;
              angle +=
                ((Math.round(angle / (Math.PI / 2)) * Math.PI) / 2 - angle) *
                snap;
              // Box corners turn about a principal axis and finish on a face.
              object.quaternion
                .setFromAxisAngle(new Vector3(0, 0, 1), angle)
                .multiply(fall.flat);
            } else {
              object.quaternion
                .setFromAxisAngle(fall.axis, -angle)
                .multiply(fall.flat);
            }
            if (fall.age < 0.25) {
              const target = object.quaternion.clone();
              object.quaternion.copy(fall.from).slerp(target, fall.age / 0.25);
            }
          }
          const box = new Box3()
            .setFromCenterAndSize(new Vector3(), fall.size)
            .applyMatrix4(
              new Matrix4().makeRotationFromQuaternion(object.quaternion),
            );
          return box.getSize(new Vector3()).y / 2;
        };
        const height = rotate();
        // Never teleport onto a support from its side.
        const ceiling = previous.y - fall.halfHeight + 0.035;
        const groundAt = (x: number, z: number) => {
          let ground = floorY / metre;
          for (const surface of [...fixedSupports, ...supports()])
            if (
              surface.top <= ceiling &&
              x >= surface.minX &&
              x <= surface.maxX &&
              z >= surface.minZ &&
              z <= surface.maxZ
            )
              ground = Math.max(ground, surface.top);
          return ground;
        };
        fall.motion.step(
          dt,
          (x, z) => groundAt(x, z) + height,
          portable.component.impact,
        );
        fall.halfHeight = rotate();
        if (previous.grounded)
          previous.y = groundAt(previous.x, previous.z) + fall.halfHeight;
        const offset = fall.centre.clone().applyQuaternion(object.quaternion);
        object.position
          .set(
            previous.x - offset.x,
            previous.y - offset.y,
            previous.z - offset.z,
          )
          .multiplyScalar(metre);
        portable.component.motion(
          Math.hypot(previous.vx, previous.vz),
          previous.grounded,
        );
        if (previous.settled) {
          portable.component.settle();
          falling.delete(object);
        }
      }
    },
    dispose() {
      for (const [object, record] of records) record.parent.attach(object);
      records.clear();
      falling.clear();
      held = null;
    },
  };
}
