import { describe, expect, it } from 'vite-plus/test';
import { INPUT_MODES } from './controls';
import {
  initialInput,
  nextInput,
  hudControls,
  menuHint,
  menuHintVisible,
} from './hud-policy';

describe('input-aware HUD', () => {
  it('starts a phone in touch and a hybrid laptop without sticks', () => {
    expect(initialInput(true, false).mode).toBe('touch');
    expect(initialInput(true, true).mode).toBe('mouse');
    expect(initialInput(false, false).mode).toBe('mouse');
  });
  it('remembers a keyboard across mouse, touch and gamepad changes', () => {
    let state = nextInput(initialInput(false, true), 'keyboard');
    expect(nextInput(state, 'mouse').mode).toBe('keyboard');
    state = nextInput(state, 'touch');
    expect(state.mode).toBe('touch');
    state = nextInput(state, 'gamepad');
    expect(state.mode).toBe('gamepad');
    expect(nextInput(state, 'mouse').mode).toBe('keyboard');
    expect(nextInput(initialInput(false, true), 'mouse').mode).toBe('mouse');
  });
  it('respects Automatic, Always and Never without inventing touch controls', () => {
    for (const mode of INPUT_MODES) {
      expect(hudControls(mode, 'automatic').movement).toBe(mode === 'mouse');
      expect(hudControls(mode, 'always').movement).toBe(true);
      expect(hudControls(mode, 'never')).toEqual({
        movement: false,
        touch: false,
      });
      expect(hudControls(mode, 'always').touch).toBe(mode === 'touch');
    }
  });
  it('gives only a short menu hint, ending at movement or ten seconds', () => {
    expect(menuHint('keyboard')).toBe('Esc: menu and controls');
    expect(menuHint('gamepad')).toBe('Start: menu and controls');
    expect(menuHint('touch')).toContain('menu and controls');
    expect(menuHintVisible(10000, 9999, false)).toBe(true);
    expect(menuHintVisible(10000, 10000, false)).toBe(false);
    expect(menuHintVisible(10000, 1, true)).toBe(false);
  });
});
