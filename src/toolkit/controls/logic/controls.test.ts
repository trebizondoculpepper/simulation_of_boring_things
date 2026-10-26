import { describe, expect, it } from 'vite-plus/test';
import {
  CONTROL_SCHEME,
  INPUT_MODES,
  controlsHelp,
  copyShortcut,
  titleShortcut,
  deadZone,
} from './controls';

describe('the control scheme', () => {
  it('lets every input walk, run, look, use, turn knobs, zoom and crouch', () => {
    for (const action of [
      'walk',
      'run',
      'look',
      'use',
      'knob',
      'zoom',
      'crouch',
    ] as const)
      for (const mode of INPUT_MODES)
        expect(
          CONTROL_SCHEME[action][mode],
          `${action} on ${mode}`,
        ).toBeTruthy();
  });

  it('writes one help line per input', () => {
    expect(controlsHelp('mouse')).toContain('WASD');
    expect(controlsHelp('mouse')).toContain('Esc: cursor');
    expect(controlsHelp('touch')).toContain(
      'Left stick: walk (push it to the rim to run)',
    );
    expect(controlsHelp('touch')).toContain('Pinch: zoom');
    expect(controlsHelp('gamepad')).toContain('LB or RB');
    expect(controlsHelp('gamepad')).not.toContain('Esc');
  });
});

describe('the gamepad dead zone', () => {
  it('reads a resting stick as centred', () => {
    expect(deadZone(0.1, -0.05)).toEqual({ x: 0, y: 0 });
  });

  it('reaches full deflection at the rim, keeping direction', () => {
    const { x, y } = deadZone(0, -1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-1);
    const diagonal = deadZone(0.5, 0.5);
    expect(diagonal.x).toBeCloseTo(diagonal.y);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeLessThan(1);
  });
});

describe('copy shortcuts', () => {
  const plain = {
    code: 'KeyC',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
  };
  it('uses Ctrl or Cmd for references and pin/camera links', () => {
    for (const modifier of ['ctrlKey', 'metaKey'] as const) {
      expect(copyShortcut({ ...plain, [modifier]: true })).toBe('reference');
      expect(copyShortcut({ ...plain, code: 'KeyP', [modifier]: true })).toBe(
        'position',
      );
    }
  });
  it('leaves plain crouch and browser modifier combinations alone', () => {
    expect(copyShortcut(plain)).toBeNull();
    expect(
      copyShortcut({ ...plain, ctrlKey: true, shiftKey: true }),
    ).toBeNull();
    expect(copyShortcut({ ...plain, metaKey: true, altKey: true })).toBeNull();
    expect(copyShortcut({ ...plain, code: 'KeyF', ctrlKey: true })).toBeNull();
  });
});

it('keeps title navigation on unmodified bracket presses and out of keyboard help', () => {
  const plain = {
    code: 'BracketLeft',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
  };
  expect(titleShortcut(plain)).toBe('restart');
  expect(titleShortcut({ ...plain, code: 'BracketRight' })).toBe('next');
  for (const key of [
    'ctrlKey',
    'metaKey',
    'altKey',
    'shiftKey',
    'repeat',
  ] as const)
    expect(titleShortcut({ ...plain, [key]: true })).toBeNull();
  expect(titleShortcut({ ...plain, code: 'KeyR' })).toBeNull();
  expect(controlsHelp('keyboard')).not.toMatch(/restart|next shot|\[|\]/i);
});
