import { computed, signal } from '@preact/signals-core';
import type { Object3D } from 'three';
import { createFuse } from '../../core/logic/world/components';
import type { Readable } from '../../core/logic/world/components';
import { beginPart, createPartSet } from '../../core/parts/parts';
import { makeBoardPortable } from '../../core/parts/portable-board';
import { click } from '../../core/audio/part-audio';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createFuseHolderView } from '../views/industrial-devices';
import { FUSE_CARTRIDGE_DROP } from '../logic/machine-drop-profiles';
import type { MachineDevice } from './machine-components';
import type { PortableObject } from '../../../controls/input/object-handling';

type Cartridge = {
  device: MachineDevice;
  feed: ReturnType<typeof signal<Readable<number> | null>>;
  release: () => void;
  view: ReturnType<typeof createFuseHolderView>;
};
const cartridges = new WeakMap<Object3D, Cartridge>();

/** A cartridge keeps its own fuse state when moved between holders. */
export function fuseCartridge(
  kit: PanelKit,
  name = '2 A control fuse',
  view = createFuseHolderView(kit, '2 A'),
) {
  const a = beginPart(kit, name);
  a.object.add(view.removable);
  a.object.userData.repairKind = 'fuse';
  const feed = signal<Readable<number> | null>(null);
  const forced = signal(false);
  const fuse = createFuse({
    current: computed(() => (forced.value ? 12 : (feed.value?.value ?? 0))),
    rating: 2,
  });
  let release = () => {};
  makeBoardPortable(
    a,
    () => {
      feed.value = null;
      release();
      view.detachCartridge();
    },
    'upright',
    FUSE_CARTRIDGE_DROP,
  );
  a.voice(fuse, {
    blow: click({ band: 1800, q: 0.7, decay: 0.08, level: 0.28 }),
  });
  a.updates.push((dt) => {
    fuse.step(dt);
    view.set(fuse.blown.value);
    view.update(dt);
  });
  a.disposers.push(fuse.dispose);
  const device: MachineDevice = {
    ...a.part(),
    kind: 'fuse',
    attachment: 'detachable',
    dropProfile: FUSE_CARTRIDGE_DROP,
    active: computed(() => feed.value !== null && fuse.whole.value),
    faulted: fuse.blown,
    value: computed(() => feed.value?.value ?? 0),
    testLabel: 'BLOW',
    test() {
      forced.value = true;
      fuse.step(0.1);
      forced.value = false;
    },
    repair: () => {
      fuse.replace();
    },
  };
  const entry: Cartridge = { device, feed, release: () => {}, view };
  release = () => entry.release();
  cartridges.set(device.object, entry);
  return device;
}

/** Fixed clips, removable cartridge, and an electrical feed following its occupant. */
export function replaceableFuse(
  kit: PanelKit,
  props: { name: string; power: Readable<boolean>; current: Readable<number> },
): MachineDevice {
  const a = beginPart(kit, props.name);
  const view = createFuseHolderView(kit, '2 A');
  a.object.add(view.group);
  const parts = createPartSet();
  const initial = parts.add(
    fuseCartridge(kit, `${props.name} cartridge`, view),
  );
  const seat = signal<MachineDevice | null>(null);
  const feed = computed(() => (props.power.value ? props.current.value : 0));
  const insert = (device: MachineDevice) => {
    const entry = cartridges.get(device.object);
    if (!entry || seat.value) return false;
    a.object.add(device.object);
    device.object.position.set(0, 0, 0);
    device.object.quaternion.identity();
    device.object.scale.setScalar(1);
    (device.object.userData.portable as PortableObject).component.reset();
    entry.view.restoreCartridge();
    entry.feed.value = feed;
    entry.release = () => {
      if (seat.value === device) seat.value = null;
    };
    seat.value = device;
    return true;
  };
  insert(initial);
  const known: MachineDevice[] = [initial];
  parts.add(a.part());
  return {
    object: a.object,
    ...parts,
    kind: 'fuse',
    attachment: 'fixed',
    dropProfile: FUSE_CARTRIDGE_DROP,
    active: computed(
      () => props.power.value && Boolean(seat.value?.active.value),
    ),
    faulted: computed(() => !seat.value || seat.value.faulted.value),
    value: computed(() => seat.value?.value.value ?? 0),
    testLabel: 'OVERLOAD',
    test: () => seat.value?.test(),
    repair: () => seat.value?.repair(),
    cartridges: known,
    slots: [{ kind: 'fuse', occupant: seat }],
    insert(device) {
      const fitted = insert(device);
      if (fitted && !known.includes(device)) known.push(device);
      return fitted;
    },
    spareCartridge() {
      const spare = fuseCartridge(kit);
      known.push(spare);
      return spare;
    },
  };
}
