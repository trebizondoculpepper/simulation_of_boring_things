import type { WorldStore } from './world-store';

const KEY = 'pool-plant:last-location';
const START = '?room=pool_04';

/** The last playable view, independent of the title's moving backdrop. */
export function createGameSession(
  world: Pick<WorldStore, 'reset'>,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
) {
  let destination: string | null = null;
  try {
    destination = storage?.getItem(KEY) ?? null;
  } catch {
    // Continue still works in memory when browser storage is blocked.
  }
  const clean = (search: string | null) => {
    if (!search) return null;
    const input = new URLSearchParams(search);
    const room = input.get('room');
    if (!room || !/^[a-zA-Z0-9_]+$/.test(room)) return null;
    const params = new URLSearchParams({ room });
    for (const key of ['x', 'y', 'z', 'yaw', 'pitch', 'zoom']) {
      const value = input.get(key);
      if (value !== null && value.trim() && Number.isFinite(Number(value)))
        params.set(key, value);
    }
    return `?${params}`;
  };
  destination = clean(destination);
  const remember = (search: string) => {
    const next = clean(search);
    if (!next) return;
    destination = next;
    try {
      storage?.setItem(KEY, next);
    } catch {
      // Keep the destination for this page even if it cannot be saved.
    }
  };
  return {
    remember,
    resume: () => destination,
    start() {
      world.reset();
      remember(START);
      return START;
    },
  };
}
