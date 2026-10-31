import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { PerspectiveCamera, Vector3 } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../views/eighties-controls';
import { usableOf } from '../../../controls/input/use-marking';
import {
  mushroomStop,
  overloadRelay,
  pushButton,
  pushbuttonStation,
  rackUnit,
} from './parts';
import type { Part } from './parts';

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

const camera = new PerspectiveCamera();
/** What the cue says of a use on `object`, as the probe would ask it. */
const cueOf = (object: Object3D) => {
  const found = usableOf(object);
  return found?.usable({
    object: found.object,
    point: new Vector3(),
    camera,
    x: 0,
    pad: false,
  });
};
const usesOf = (part: Part) => [...part.uses.keys()];

describe('the kit marks its pushes and pulls', () => {
  it('a push button: green powered and free, red unpowered or latched', () => {
    const power = signal(true);
    const latch = signal(false);
    const button = pushButton(createPanelKit(), {
      colour: 'green',
      power,
      latch,
    });
    const [cap] = usesOf(button);
    expect(cueOf(cap)).toEqual({ gesture: 'push', possible: true });
    power.value = false;
    expect(cueOf(cap)).toEqual({ gesture: 'push', possible: false });
    power.value = true;
    latch.value = true;
    expect(cueOf(cap)?.possible).toBe(false);
    button.dispose();
    expect(cueOf(cap)).toBeUndefined();
  });

  it('a station’s buttons are pushes, red unpowered', () => {
    const power = signal(false);
    const station = pushbuttonStation(createPanelKit(), {
      buttons: [
        { colour: 'green', legend: 'START' },
        { colour: 'red', legend: 'STOP' },
      ],
      power,
    });
    for (const cap of usesOf(station))
      expect(cueOf(cap)).toEqual({ gesture: 'push', possible: false });
  });

  it('an emergency stop: pushed while out, pulled while in, always green', () => {
    const stop = mushroomStop(createPanelKit(), {});
    const [head] = usesOf(stop);
    expect(cueOf(head)).toEqual({ gesture: 'push', possible: true });
    stop.uses.get(head)!();
    expect(stop.pushed.value).toBe(true);
    expect(cueOf(head)).toEqual({ gesture: 'pull', possible: true });
  });

  it('a rack unit: pulled out while in, pushed home while out, red latched', () => {
    const latch = signal(false);
    const unit = rackUnit(createPanelKit(), { u: 2, style: 'drawer', latch });
    const [group] = usesOf(unit);
    expect(cueOf(group)).toEqual({ gesture: 'pull', possible: true });
    unit.uses.get(group)!();
    expect(cueOf(group)).toEqual({ gesture: 'push', possible: true });
    latch.value = true;
    expect(cueOf(group)?.possible).toBe(false);
  });

  it('an overload relay: TEST until tripped, RESET once tripped and cool, its dial a knob', () => {
    const current = signal(0);
    const relay = overloadRelay(createPanelKit(), { current });
    const [dial, reset, test] = usesOf(relay);
    expect(cueOf(test)).toEqual({ gesture: 'push', possible: true });
    expect(cueOf(reset)).toEqual({ gesture: 'push', possible: false });
    relay.uses.get(test)!();
    expect(cueOf(test)?.possible).toBe(false);
    expect(cueOf(reset)?.possible).toBe(true);
    expect(cueOf(dial)?.gesture).toBe('turn');
  });
});
