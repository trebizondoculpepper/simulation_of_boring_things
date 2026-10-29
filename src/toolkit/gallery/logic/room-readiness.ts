/**
 * The "destination ready" contract (mission 108; the owner, 2026-10-29):
 * the lift does not arrive until the floor ahead's room is built and
 * warmed (its module imported, its scene built, its shaders compiled and
 * its textures uploaded by a frame drawn unseen from its landing), so the
 * walker never sees a loading pause or a pop-in. The app (`src/main.ts`)
 * sets how a room is prepared; a room's handle may add its own `warm()`
 * for anything more it needs before it is seen. Pure: no DOM.
 */

/** Prepares a room to be seen: resolves once it is built and warmed. */
export type RoomPreparer = (room: string) => Promise<void>;

let preparer: RoomPreparer | null = null;

/** Set by the app: how a room is built and warmed unseen. */
export function setRoomPreparer(p: RoomPreparer | null) {
  preparer = p;
}

/**
 * Build and warm `room`, unseen: resolves once it is ready to be seen.
 * With no app to build it (a test), at once.
 */
export function prepareRoom(room: string): Promise<void> {
  return preparer ? preparer(room) : Promise.resolve();
}
