import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { SEATED_EYE_ABOVE_SEAT, SEATED_LEAN, seatPose } from '../logic/seat';
import type { SeatDeclaration, SeatPose } from '../logic/seat';

/**
 * A chair's seat, declared on its object (`logic/seat.ts`): the chair's
 * origin at its foot under the seat's middle, its +z the way it faces,
 * its seat `seat.height` up. Any chair anywhere may declare one; a room's
 * use then seats the walker on it (`seatOf`, `createFirstPerson`'s `sit`).
 */
export function declareSeat<T extends Object3D>(
  chair: T,
  seat: SeatDeclaration,
): T {
  chair.userData.seat = seat;
  return chair;
}

/** The seat a chair declares, if this object is one. */
export const seatDeclared = (object: Object3D) =>
  (object.userData.seat as SeatDeclaration | undefined) ?? null;

/**
 * Where a walker sits on `chair`, in the scene's units: from its world
 * placement and its declared seat (its console's point, if any, in its
 * parent's frame).
 */
export function seatOf(chair: Object3D, seat: SeatDeclaration): SeatPose {
  chair.updateWorldMatrix(true, false);
  const scale = chair.getWorldScale(new Vector3()).y;
  const middle = chair.localToWorld(new Vector3(0, seat.height, 0));
  const ahead = chair.localToWorld(new Vector3(0, seat.height, 1));
  const lookAt = seat.lookAt
    ? (chair.parent?.localToWorld(
        new Vector3(seat.lookAt.x, seat.lookAt.y, seat.lookAt.z),
      ) ?? new Vector3(seat.lookAt.x, seat.lookAt.y, seat.lookAt.z))
    : undefined;
  return seatPose(
    middle,
    { x: ahead.x - middle.x, z: ahead.z - middle.z },
    SEATED_EYE_ABOVE_SEAT * scale,
    (seat.forward ?? SEATED_LEAN) * scale,
    lookAt,
  );
}
