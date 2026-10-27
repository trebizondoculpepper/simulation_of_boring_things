import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { signal } from '@preact/signals-core';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { applyAction, newWorld } from '../../../game/world';
import type { World } from '../../../game/world';
import { modeAction, modePosition } from '../logic/control-room-mode';
import { createControlRoomModeKnob } from './control-room-mode-knob';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (t: string) => ({ width: t.length * 7 }) },
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

describe('the CONTROL ROOM MODE knob, built', () => {
  it('turns the world’s mode at each click, and shows the world’s mode', () => {
    const world = signal<World>(newWorld());
    const knob = createControlRoomModeKnob(createPanelKit(), {
      get value() {
        return modePosition(world.value.controlRoomMode);
      },
      set: (position) =>
        (world.value = applyAction(world.value, modeAction(position))),
    });
    const [use] = [...knob.uses.values()];
    expect(knob.position.value).toBe(0);
    // Clicked on either side, it goes to its other position.
    use(-1);
    expect(world.value.controlRoomMode).toBe('new');
    expect(knob.position.value).toBe(1);
    use(1);
    expect(world.value.controlRoomMode).toBe('old');
    // Moved in the world (another tab, the console): it follows.
    world.value = applyAction(world.value, modeAction(1));
    expect(knob.position.value).toBe(1);
    knob.dispose();
  });

  it('will not turn while the control room’s doors stand open', () => {
    const world = signal<World>(newWorld());
    const doorsOpen = signal(true);
    const knob = createControlRoomModeKnob(
      createPanelKit(),
      {
        get value() {
          return modePosition(world.value.controlRoomMode);
        },
        set: (position) =>
          (world.value = applyAction(world.value, modeAction(position))),
      },
      doorsOpen,
    );
    const [use] = [...knob.uses.values()];
    use(1);
    expect(world.value.controlRoomMode).toBe('old');
    expect(knob.position.value).toBe(0);
    // Shut, it turns.
    doorsOpen.value = false;
    use(1);
    expect(world.value.controlRoomMode).toBe('new');
    knob.dispose();
  });
});
