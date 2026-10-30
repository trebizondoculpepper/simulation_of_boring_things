import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { Part } from '../../core/parts/parts';
import type { PartEvent } from '../../core/logic/world/components';
import { easeDoor } from '../logic/mesh-cage';
import type { MeshCageSpec } from '../logic/mesh-cage';
import { createMeshCage } from '../views/mesh-cage';
import type { MeshCageView } from '../views/mesh-cage';

export interface MeshCagePart extends Part {
  view: MeshCageView;
  /** Whether its door is open (or opening). */
  readonly open: boolean;
  /** Open or shut its door, as a later stage may (a padlock, a key). */
  setOpen(open: boolean): void;
}

/**
 * A welded-mesh cage whose door works: a use on its leaf swings it open
 * or shut (eased, about a second), through the room's part set and so
 * the one control scheme. Its state is its own; a room that keeps it in
 * the world drives it with `setOpen`.
 */
export function createMeshCagePart(
  kit: PanelKit,
  spec: MeshCageSpec,
  { name = 'Mesh cage', colour }: { name?: string; colour?: string } = {},
): MeshCagePart {
  const view = createMeshCage(kit, spec, { colour });
  view.group.name = name;
  let want = false;
  let swing = 0;
  const listeners = new Set<(event: PartEvent, name: string) => void>();
  const toggle = () => {
    want = !want;
    for (const l of listeners) l(want ? 'on' : 'off', `${name} door`);
  };
  const uses = new Map<Object3D, (direction?: number) => void>();
  view.doorLeaf.traverse((o) => {
    uses.set(o, toggle);
    o.userData.live = true;
  });
  return {
    object: view.group,
    view,
    uses,
    get open() {
      return want;
    },
    setOpen(open) {
      want = open;
    },
    update(delta) {
      const next = easeDoor(swing, want ? 1 : 0, delta);
      if (next !== swing) {
        swing = next;
        view.setOpen(swing);
      }
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setAudible() {},
    dispose() {
      listeners.clear();
    },
  };
}
