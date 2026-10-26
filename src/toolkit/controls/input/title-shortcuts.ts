import { titleShortcut } from '../logic/controls';

/** Shared input, installed only while the title backdrop is active. */
export function bindTitleShortcuts(
  action: (command: 'restart' | 'next') => void,
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
    const command = titleShortcut(event);
    if (!command) return;
    event.preventDefault();
    action(command);
  };
  document.addEventListener('keydown', keydown);
  return () => document.removeEventListener('keydown', keydown);
}
