import { Group } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { createPartSet } from '../../components/core/parts/parts';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createRepairFuse } from './repair-fuse';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

it('keeps the blown cartridge failed and conducts only with a distinct replacement', () => {
  const parts = createPartSet();
  const fuse = createRepairFuse(createPanelKit(), parts);
  const room = new Group();
  room.add(fuse.holder, fuse.fresh.object);
  expect(fuse.old.fuse.blown.value).toBe(true);
  expect(fuse.connected(true)).toBe(false);
  expect(fuse.insert(fuse.fresh.object)).toBe(false);
  fuse.old.portable.component.pickUp();
  fuse.old.portable.detach();
  room.attach(fuse.old.object);
  expect(fuse.occupant).toBeNull();
  expect(fuse.connected(true)).toBe(false);
  expect(fuse.insert(fuse.old.object)).toBe(true);
  expect(fuse.connected(true)).toBe(false);
  fuse.old.portable.component.pickUp();
  fuse.old.portable.detach();
  room.attach(fuse.old.object);
  fuse.fresh.portable.component.pickUp();
  fuse.fresh.portable.detach();
  expect(fuse.insert(fuse.fresh.object)).toBe(true);
  expect(fuse.connected(false)).toBe(false);
  expect(fuse.connected(true)).toBe(true);
  fuse.fault();
  expect(fuse.connected(true)).toBe(false);
  parts.dispose();
  fuse.dispose();
});

it('makes further new cartridges for the bench to restock with', () => {
  const parts = createPartSet();
  const fuse = createRepairFuse(createPanelKit(), parts);
  const spare = fuse.spare();
  expect(spare.object).not.toBe(fuse.fresh.object);
  expect(fuse.has(spare.object)).toBe(true);
  fuse.old.portable.component.pickUp();
  fuse.old.portable.detach();
  spare.portable.component.pickUp();
  spare.portable.detach();
  expect(fuse.insert(spare.object)).toBe(true);
  expect(fuse.connected(true)).toBe(true);
  fuse.fault();
  expect(fuse.connected(true)).toBe(false);
  parts.dispose();
  fuse.dispose();
});
