import { afterEach, expect, it, vi } from 'vite-plus/test';
import { bindTitleShortcuts } from './title-shortcuts';
afterEach(() => vi.unstubAllGlobals());
it('ignores editing and consumed events, and removes its listener when the title ends', () => {
  const target = new EventTarget();
  vi.stubGlobal('document', target);
  const action = vi.fn();
  const dispose = bindTitleShortcuts(action, vi.fn());
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

it('takes the screenshot chord on the title, once per press', () => {
  const target = new EventTarget();
  vi.stubGlobal('document', target);
  const action = vi.fn();
  const screenshot = vi.fn();
  const dispose = bindTitleShortcuts(action, screenshot);
  const press = (keys: Record<string, unknown>) => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, {
      code: 'KeyK',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: true,
      repeat: false,
      ...keys,
    });
    target.dispatchEvent(event);
    return event;
  };
  expect(press({ ctrlKey: true }).defaultPrevented).toBe(true);
  press({ metaKey: true });
  press({ ctrlKey: true, repeat: true });
  press({ shiftKey: false, ctrlKey: true });
  expect(screenshot).toHaveBeenCalledTimes(2);
  expect(action).not.toHaveBeenCalled();
  dispose();
});
