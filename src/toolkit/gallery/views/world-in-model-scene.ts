import { Mesh } from 'three';
import type { Object3D } from 'three';
import { owningComponent } from '../../components/core/views/component-identity';
import { isBound, roomModel } from '../logic/world-in-model';

/**
 * Everything drawn is in the model, checked on the scene itself (prompt
 * 064): every mesh a room's builders make belongs to an owner marked with
 * its binding to the room's model (`markComponent`'s `model`) or marked
 * decorative. This lists the owners, by their names, that are neither, so
 * a test can name them and the binding can be corrected where the thing is
 * built. The scene is the drawing, so nothing it draws can be missed.
 */
export function unboundInScene(room: string, root: Object3D): string[] {
  const model = roomModel(room);
  const found = new Map<string, number>();
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const owner = owningComponent(o);
    const identity = owner?.identity;
    if (identity?.decorative) return;
    if (identity?.model && isBound(identity.model, model)) return;
    // Name the thing by its owner, or its nearest named ancestor.
    let named: Object3D | null = owner?.object ?? o;
    while (named && !named.name) named = named.parent;
    const key = identity?.tag ?? identity?.name ?? named?.name ?? '(unnamed)';
    found.set(key, (found.get(key) ?? 0) + 1);
  });
  return [...found.keys()].sort();
}
