import { expect, it, vi } from 'vite-plus/test';
import { bindViewWheel } from './view-wheel';

it('handles app-targeted wheel events while locked, once, in the active room', () => {
  const events = new EventTarget();
  const canvas = new EventTarget();
  let active = true;
  let locked = true;
  const apply = vi.fn((event: WheelEvent) => event.preventDefault());
  const dispose = bindViewWheel(
    events,
    canvas,
    () => active,
    () => locked,
    apply,
  );
  const scroll = (target: EventTarget) => {
    const event = new Event('wheel', { cancelable: true });
    Object.defineProperty(event, 'target', { value: target });
    events.dispatchEvent(event);
    return event;
  };
  expect(scroll(events).defaultPrevented).toBe(true);
  expect(apply).toHaveBeenCalledTimes(1);
  active = false;
  expect(scroll(events).defaultPrevented).toBe(false);
  expect(apply).toHaveBeenCalledTimes(1);
  active = true;
  locked = false;
  expect(scroll(events).defaultPrevented).toBe(false);
  expect(scroll(canvas).defaultPrevented).toBe(true);
  expect(apply).toHaveBeenCalledTimes(2);
  dispose();
  scroll(canvas);
  expect(apply).toHaveBeenCalledTimes(2);
});
