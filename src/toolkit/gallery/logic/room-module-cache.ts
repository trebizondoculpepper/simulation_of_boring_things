/** Cache room code without constructing scenes, renderers, textures or controls. */
export function createRoomModuleCache<Key, Starter>(
  load: (key: Key) => Promise<Starter>,
) {
  const pending = new Map<Key, Promise<Starter>>();
  return (key: Key): Promise<Starter> => {
    const cached = pending.get(key);
    if (cached) return cached;
    const loading = load(key).catch((error: unknown) => {
      pending.delete(key);
      throw error;
    });
    pending.set(key, loading);
    return loading;
  };
}
