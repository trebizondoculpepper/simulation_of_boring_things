/**
 * Pointer lock belongs to the app rather than a room's canvas. Chrome
 * consequently sends wheel events to the app; listen on the document,
 * routing each event to the active view only. Unlocked, only scrolling
 * over the canvas belongs to the game.
 */
export function bindViewWheel(
  events: EventTarget,
  canvas: EventTarget,
  active: () => boolean,
  locked: () => boolean,
  apply: (event: WheelEvent) => void,
) {
  const wheel = (event: Event) => {
    if (!active() || (!locked() && event.target !== canvas)) return;
    apply(event as WheelEvent);
  };
  events.addEventListener('wheel', wheel, { passive: false });
  return () => events.removeEventListener('wheel', wheel);
}
