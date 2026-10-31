import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import type { Object3D } from 'three';
import { createPanelKit } from '../views/eighties-controls';
import { selector } from './parts';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
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

/** Every rotation about z in a part, which its lever turns by. */
const turns = (o: Object3D) => {
  const out: number[] = [];
  o.traverse((m) => out.push(Number(m.rotation.z.toFixed(4))));
  return out.join();
};

it('turns, and shows it, when bound to a plain value rather than a signal (dev58’s knobs)', () => {
  // A room host's getter: a plain variable, no signal behind it.
  let mode = 2;
  const knob = selector(createPanelKit(), {
    positions: 3,
    initial: mode,
    bound: {
      get value() {
        return mode;
      },
      set: (k: number) => {
        mode = k;
      },
    },
    legend: 'HAND · OFF · AUTO',
  });
  const use = [...knob.uses.values()][0];
  const settle = () => {
    for (let i = 0; i < 20; i++) knob.update(0.05);
  };
  settle();
  const atAuto = turns(knob.object);
  use(-1);
  expect(mode).toBe(1);
  expect(knob.position.value).toBe(1);
  settle();
  expect(turns(knob.object)).not.toBe(atAuto);
  // A second turn goes on from where the first left it.
  use(-1);
  expect(mode).toBe(0);
  // The world moving it shows on the knob at its next update.
  mode = 2;
  settle();
  expect(knob.position.value).toBe(2);
  expect(turns(knob.object)).toBe(atAuto);
});
