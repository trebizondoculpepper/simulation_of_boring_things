import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Quaternion, Vector3 } from 'three';
import { createPanelKit } from '../../core/views/eighties-controls';
import { createActuatedButterflyValve } from './actuated-butterfly-valve';
import { partAudio } from '../../core/audio/part-audio';
import {
  PNEUMATIC_STROKE,
  RELAY_CLICK,
  SOLENOID_CLICK,
  VALVE_STOP,
} from '../audio/actuated-valve';

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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('actuated butterfly valve', () => {
  for (const [drive, click, travel] of [
    ['electric', RELAY_CLICK, expect.any(Function)],
    ['pneumatic', SOLENOID_CLICK, PNEUMATIC_STROKE],
  ] as const)
    it(`${drive}: sounds remote commands and travel, stops at the limit, and stays silent on hidden-room resync`, () => {
      const hold = vi.spyOn(partAudio, 'hold').mockImplementation(() => {});
      const play = vi
        .spyOn(partAudio, 'play')
        .mockImplementation(() => () => {});
      let open = true;
      let position = 1;
      let power = true;
      const valve = createActuatedButterflyValve(
        createPanelKit(),
        100,
        'z',
        'Lounge filter valve',
        {
          open: () => open,
          position: () => position,
          power: () => power,
          set: (value) => {
            open = value;
          },
        },
        { drive },
      );
      valve.update(0.1);
      expect(play).not.toHaveBeenCalled();
      open = false;
      valve.update(0.1);
      expect(play).toHaveBeenCalledWith(click, expect.anything());
      expect(hold).toHaveBeenLastCalledWith(
        expect.anything(),
        travel,
        expect.anything(),
      );
      position = 0.5;
      valve.update(0.1);
      position = 0;
      valve.update(0.1);
      expect(play).toHaveBeenLastCalledWith(VALVE_STOP, expect.anything());
      expect(hold).toHaveBeenLastCalledWith(
        expect.anything(),
        null,
        expect.anything(),
      );
      valve.setAudible(false);
      open = true;
      position = 1;
      valve.setAudible(true);
      play.mockClear();
      valve.update(0.1);
      expect(play).not.toHaveBeenCalled();
      power = false;
      valve.update(0.1);
      expect(play).toHaveBeenCalledWith(click, expect.anything());
      expect(hold).toHaveBeenLastCalledWith(
        expect.anything(),
        travel,
        expect.anything(),
      );
      valve.dispose();
      expect(hold).toHaveBeenLastCalledWith(expect.anything(), null);
    });
  it('keeps an upright pipe’s override facing horizontally and operable', () => {
    const valve = createActuatedButterflyValve(
      createPanelKit(),
      150,
      'y',
      'Filter backwash out',
    );
    const override = valve.uses.keys().next().value;
    expect(override).toBeDefined();
    valve.object.updateMatrixWorld(true);
    const outward = new Vector3(0, 0, 1).applyQuaternion(
      override!.parent!.getWorldQuaternion(new Quaternion()),
    );
    expect(outward.z).toBeCloseTo(1);
    expect(outward.y).toBeCloseTo(0);
    valve.uses.get(override!)!();
    expect(valve.open).toBe(false);
    valve.dispose();
  });
});
