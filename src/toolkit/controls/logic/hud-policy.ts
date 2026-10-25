import type { InputMode } from './controls';

export type OnScreenControls = 'automatic' | 'always' | 'never';
export interface InputState {
  mode: InputMode;
  keyboardSeen: boolean;
}

export const initialInput = (coarse: boolean, fine: boolean): InputState => ({
  mode: coarse && !fine ? 'touch' : 'mouse',
  keyboardSeen: false,
});

/** Keyboard capability lasts for the session, even across touch and gamepad use. */
export function nextInput(state: InputState, event: InputMode): InputState {
  const keyboardSeen = state.keyboardSeen || event === 'keyboard';
  return {
    keyboardSeen,
    mode: event === 'mouse' && keyboardSeen ? 'keyboard' : event,
  };
}

export function hudControls(mode: InputMode, setting: OnScreenControls) {
  return {
    movement:
      setting === 'always' || (setting === 'automatic' && mode === 'mouse'),
    touch: setting !== 'never' && mode === 'touch',
  };
}

export const menuHint = (mode: InputMode) =>
  mode === 'gamepad'
    ? 'Start: menu and controls'
    : mode === 'touch'
      ? '⚙: menu and controls'
      : 'Esc: menu and controls';

/** No hint is resurrected by switching rooms or inputs. */
export const menuHintVisible = (until: number, now: number, moved: boolean) =>
  !moved && now < until;
