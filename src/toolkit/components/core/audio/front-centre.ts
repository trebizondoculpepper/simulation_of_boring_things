import type { Object3D } from 'three';

/**
 * Sounds heard front centre (the owner, 2026-10-28: "place any sound for
 * the buttons and knobs just front centre"): a menu panel's parts are not
 * in the room, so their clicks and detents are not placed in it. A part
 * under an object marked here plays straight to the master bus, centred,
 * at its own level under the master volume, whatever the room's camera,
 * and heard on the title too, where the game's own sound is muted.
 */

/** Mark `root`: every part under it sounds front centre. */
export function markFrontCentre(root: Object3D) {
  root.userData.frontCentre = true;
}

/** Whether `from` (or anything it is part of) sounds front centre. */
export function soundsFrontCentre(from: Object3D | undefined): boolean {
  for (let o: Object3D | null = from ?? null; o; o = o.parent)
    if (o.userData.frontCentre) return true;
  return false;
}
