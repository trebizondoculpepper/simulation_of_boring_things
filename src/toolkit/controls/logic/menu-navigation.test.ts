import { describe, expect, it } from 'vite-plus/test';
import {
  NO_PAD,
  STICK_REPEAT,
  cycleFocus,
  keyIntent,
  menuStep,
  moveFocus,
  padIntents,
} from './menu-navigation';
import type { MenuTarget } from './menu-navigation';

// A panel: a row of three buttons, a knob below the first, a button below the third.
const PANEL: MenuTarget[] = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 1, y: 0 },
  { id: 'c', x: 2, y: 0 },
  { id: 'knob', x: 0, y: 1, turns: true },
  { id: 'd', x: 2, y: 1 },
];

describe('menu navigation', () => {
  it('moves to the nearest control that way, keeping to its row or column', () => {
    expect(moveFocus(PANEL, 'a', 'right')).toBe('b');
    expect(moveFocus(PANEL, 'b', 'right')).toBe('c');
    expect(moveFocus(PANEL, 'a', 'down')).toBe('knob');
    expect(moveFocus(PANEL, 'c', 'down')).toBe('d');
    expect(moveFocus(PANEL, 'd', 'left')).toBe('knob');
  });
  it('stays put at an edge, and starts at the first control', () => {
    expect(moveFocus(PANEL, 'a', 'up')).toBe('a');
    expect(moveFocus(PANEL, null, 'down')).toBe('a');
  });
  it('cycles in reading order, round and round', () => {
    expect(cycleFocus(PANEL, 'c', 1)).toBe('knob');
    expect(cycleFocus(PANEL, 'd', 1)).toBe('a');
    expect(cycleFocus(PANEL, 'a', -1)).toBe('d');
  });
  it('turns a focused knob with Left and Right, and moves off it with Up and Down', () => {
    expect(menuStep(PANEL, 'knob', 'right')).toEqual({
      kind: 'turn',
      id: 'knob',
      by: 1,
    });
    expect(menuStep(PANEL, 'knob', 'turnDown')).toEqual({
      kind: 'turn',
      id: 'knob',
      by: -1,
    });
    expect(menuStep(PANEL, 'knob', 'up')).toEqual({ kind: 'focus', id: 'a' });
    expect(menuStep(PANEL, 'a', 'turnUp')).toEqual({ kind: 'none' });
  });
  it('presses the focused button, and backs out', () => {
    expect(menuStep(PANEL, 'b', 'activate')).toEqual({
      kind: 'press',
      id: 'b',
    });
    expect(menuStep(PANEL, null, 'activate')).toEqual({
      kind: 'focus',
      id: 'a',
    });
    expect(menuStep(PANEL, 'b', 'back')).toEqual({ kind: 'back' });
  });
  it('reads keys as intents', () => {
    expect(keyIntent('ArrowLeft')).toBe('left');
    expect(keyIntent('Tab', true)).toBe('previous');
    expect(keyIntent('Enter')).toBe('activate');
    expect(keyIntent(' ')).toBe('activate');
    expect(keyIntent('Escape')).toBe('back');
    expect(keyIntent('w')).toBe(null);
  });
  it('reads a gamepad: each button once as it goes down', () => {
    const pressed = Array(16).fill(false);
    pressed[0] = true;
    const first = padIntents(pressed, [0, 0], NO_PAD, 1 / 60);
    expect(first.intents).toEqual(['activate']);
    const held = padIntents(pressed, [0, 0], first.state, 1 / 60);
    expect(held.intents).toEqual([]);
    pressed[0] = false;
    pressed[9] = true;
    expect(padIntents(pressed, [0, 0], held.state, 1 / 60).intents).toEqual([
      'toggle',
    ]);
  });
  it('reads the stick as a direction, repeating while it is held', () => {
    const none = Array(16).fill(false);
    const lean = padIntents(none, [0, 0.9], NO_PAD, 1 / 60);
    expect(lean.intents).toEqual(['down']);
    const still = padIntents(none, [0, 0.9], lean.state, 0.1);
    expect(still.intents).toEqual([]);
    const again = padIntents(none, [0, 0.9], still.state, STICK_REPEAT);
    expect(again.intents).toEqual(['down']);
    expect(padIntents(none, [0.1, 0.2], again.state, 1).intents).toEqual([]);
  });
});
