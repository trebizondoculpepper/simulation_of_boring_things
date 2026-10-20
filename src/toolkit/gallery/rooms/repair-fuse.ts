import { signal } from '@preact/signals-core';
import { Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import { createFuse } from '../../components/core/logic/world/components';
import { beginPart } from '../../components/core/parts/parts';
import type { PartSet } from '../../components/core/parts/parts';
import { makeBoardPortable } from '../../components/core/parts/portable-board';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { FUSE_CARTRIDGE_DROP } from '../../components/industrial-control/logic/machine-drop-profiles';
import { createFuseHolderView } from '../../components/industrial-control/views/industrial-devices';
import type { PortableObject } from '../../controls/input/object-handling';

/** A true-size cartridge and holder; the old blown fuse cannot become a spare. */
export function createRepairFuse(kit: PanelKit, parts: PartSet) {
  const holderView = createFuseHolderView(kit, '2 A');
  const holder = new Group();
  holder.add(holderView.group);
  const cartridges: {
    object: Group;
    portable: PortableObject;
    fuse: ReturnType<typeof createFuse>;
    current: ReturnType<typeof signal<number>>;
    view: ReturnType<typeof createFuseHolderView>;
  }[] = [];
  let occupant: (typeof cartridges)[number] | null = null;
  const makeCartridge = (
    view: ReturnType<typeof createFuseHolderView>,
    name: string,
  ) => {
    const part = beginPart(kit, name);
    part.object.add(view.removable);
    const current = signal(0);
    const fuse = createFuse({ current, rating: 2 });
    const component = makeBoardPortable(
      part,
      () => {
        if (occupant?.object === part.object) occupant = null;
        view.detachCartridge();
      },
      'upright',
      FUSE_CARTRIDGE_DROP,
    );
    parts.add(part.part());
    const cartridge = {
      object: part.object,
      portable: part.object.userData.portable as PortableObject,
      fuse,
      current,
      view,
    };
    cartridges.push(cartridge);
    return { cartridge, current, component };
  };
  const old = makeCartridge(holderView, 'blown 2 A control fuse');
  holder.add(old.cartridge.object);
  occupant = old.cartridge;
  old.current.value = 12;
  old.cartridge.fuse.step(0.1);
  old.current.value = 0;
  const spare = () =>
    makeCartridge(createFuseHolderView(kit, '2 A'), 'new 2 A control fuse')
      .cartridge;
  const fresh = spare();
  const position = new Vector3();
  return {
    holder,
    old: old.cartridge,
    fresh,
    /** Another new cartridge, for the bench to restock with. */
    spare,
    cartridges,
    get occupant() {
      return occupant;
    },
    get socketPosition() {
      return holder.getWorldPosition(position.clone());
    },
    has(object: Object3D) {
      return cartridges.some((entry) => entry.object === object);
    },
    connected(power: boolean) {
      return power && occupant !== null && !occupant.fuse.blown.value;
    },
    fault() {
      if (!occupant) return;
      occupant.current.value = 12;
      occupant.fuse.step(0.1);
      occupant.current.value = 0;
    },
    insert(object: Object3D) {
      const cartridge = cartridges.find((entry) => entry.object === object);
      if (!cartridge || occupant) return false;
      holder.add(cartridge.object);
      cartridge.object.position.set(0, 0, 0);
      cartridge.object.quaternion.identity();
      cartridge.object.scale.setScalar(1);
      cartridge.portable.component.reset();
      cartridge.view.restoreCartridge();
      occupant = cartridge;
      return true;
    },
    update(delta: number) {
      for (const cartridge of cartridges) {
        cartridge.view.set(cartridge.fuse.blown.value);
        cartridge.view.update(delta);
      }
    },
    dispose() {
      for (const cartridge of cartridges) cartridge.fuse.dispose();
    },
  };
}
