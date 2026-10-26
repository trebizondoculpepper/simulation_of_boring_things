import { copyShortcut, titleShortcut } from '../logic/controls';

/**
 * Shared input, installed only while the title backdrop is active: its
 * shots' navigation, and the screenshot chord (the game's own handler
 * takes no input while the title pauses it).
 */
export function bindTitleShortcuts(
  action: (command: 'restart' | 'next') => void,
  screenshot: () => void,
) {
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest?.(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
      )
    )
      return;
    if (copyShortcut(event) === 'screenshot') {
      event.preventDefault();
      if (!event.repeat) screenshot();
      return;
    }
    const command = titleShortcut(event);
    if (!command) return;
    event.preventDefault();
    action(command);
  };
  document.addEventListener('keydown', keydown);
  return () => document.removeEventListener('keydown', keydown);
}
