import { Mesh } from 'three';
import type { Object3D } from 'three';
import { owningComponent } from '../../components/core/views/component-identity';
import { bindingForTag, isBound, roomModel } from '../logic/world-in-model';

/**
 * Everything drawn is in the model, checked on the scene itself (prompt
 * 064): every mesh a room's builders make belongs to an owner marked with
 * its binding to the room's model (`markComponent`'s `model`) or marked
 * decorative. This lists the owners, by their names, that are neither, so
 * a test can name them and the binding can be corrected where the thing is
 * built. The scene is the drawing, so nothing it draws can be missed.
 */
export function unboundInScene(
  room: string,
  root: Object3D,
  /** Another room's things drawn in this one's scene (a corridor run): checked with that room. */
  elsewhere: (o: Object3D) => boolean = () => false,
): string[] {
  const model = roomModel(room);
  const found = new Map<string, number>();
  const outside = (o: Object3D) => {
    for (let p: Object3D | null = o; p; p = p.parent)
      if (elsewhere(p)) return true;
    return false;
  };
  root.traverse((o) => {
    if (!(o instanceof Mesh) || outside(o)) return;
    const owner = owningComponent(o);
    const identity = owner?.identity;
    if (identity?.decorative) return;
    if (identity?.model && isBound(identity.model, model)) return;
    // A thing marked by its plate's tag alone: bound if its tag names something in the model.
    const byTag = identity?.tag ? bindingForTag(room, identity.tag) : undefined;
    if (byTag && isBound(byTag, model)) return;
    // Name the thing by its owner, or its nearest named ancestor.
    let named: Object3D | null = owner?.object ?? o;
    while (named && !named.name) named = named.parent;
    const key = identity?.tag ?? identity?.name ?? named?.name ?? '(unnamed)';
    found.set(key, (found.get(key) ?? 0) + 1);
  });
  return [...found.keys()].sort();
}
