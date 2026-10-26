import { afterEach, expect, it, vi } from 'vite-plus/test';
import { bindTitleShortcuts } from './title-shortcuts';
afterEach(() => vi.unstubAllGlobals());
it('ignores editing and consumed events, and removes its listener when the title ends', () => {
  const target = new EventTarget();
  vi.stubGlobal('document', target);
  const action = vi.fn();
  const dispose = bindTitleShortcuts(action);
  const press = (code: string, editable = false, consumed = false) => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, {
      code,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      repeat: false,
    });
    if (editable)
      Object.defineProperty(event, 'target', {
        value: { closest: () => ({}) },
      });
    if (consumed) event.preventDefault();
    target.dispatchEvent(event);
    return event;
  };
  expect(press('BracketLeft').defaultPrevented).toBe(true);
  expect(action).toHaveBeenLastCalledWith('restart');
  press('BracketRight');
  expect(action).toHaveBeenLastCalledWith('next');
  press('BracketRight', true);
  press('BracketRight', false, true);
  expect(action).toHaveBeenCalledTimes(2);
  dispose();
  expect(press('BracketRight').defaultPrevented).toBe(false);
  expect(action).toHaveBeenCalledTimes(2);
});
