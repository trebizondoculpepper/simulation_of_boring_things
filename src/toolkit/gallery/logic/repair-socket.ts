/**
 * A keyed service socket selected by the player's aim ray: it takes a part
 * of its kind, from whichever board or bench it came, and takes it live
 * too (`insert-live`, the room arcing as the contacts meet).
 */
export type SocketRefusal = 'occupied' | 'wrong-part';

export function socketDecision(input: {
  live: boolean;
  occupied: boolean;
  partKind: string;
  socketKind: string;
}): 'insert' | 'insert-live' | SocketRefusal {
  if (input.occupied) return 'occupied';
  if (input.partKind !== input.socketKind) return 'wrong-part';
  return input.live ? 'insert-live' : 'insert';
}
