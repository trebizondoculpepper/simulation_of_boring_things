import { QUALITIES, RANGES } from './logic/settings';
import type { Quality, Settings } from './logic/settings';
import { settings, updateSettings } from './settings-store';

/**
 * The settings panel (`doc/plans/title-screen.md`, stage 3): the player's
 * settings as controls in the HUD's style, over the game, opened by the
 * gear among each room's view tools (and later from the title screen).
 * Each change is kept at once (`settings-store.ts`). While it is open the
 * game takes no keys; Esc or Done closes it.
 */

/** The gear, as an icon in the HUD's style. */
export const GEAR_ICON = `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
<path d="M13.4 3h5.2l.8 3.6 2.4 1 3.1-2 3.7 3.7-2 3.1 1 2.4 3.4.8v5.2l-3.6.8-1 2.4 2 3.1-3.7 3.7-3.1-2-2.4 1-.8 3.4h-5.2l-.8-3.6-2.4-1-3.1 2-3.7-3.7 2-3.1-1-2.4L3 18.6v-5.2l3.6-.8 1-2.4-2-3.1 3.7-3.7 3.1 2 2.4-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<circle cx="16" cy="16" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/>
</svg>`;

const QUALITY_NAMES: Record<Quality, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function createSettingsPanel() {
  const backdrop = document.createElement('div');
  backdrop.className = 'settings-backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'settings-title');
  backdrop.append(panel);
  const title = document.createElement('h2');
  title.id = 'settings-title';
  title.textContent = 'Settings';
  panel.append(title);

  const row = (label: string, control: HTMLElement, readout?: HTMLElement) => {
    const r = document.createElement('label');
    r.className = 'settings-row';
    const name = document.createElement('span');
    name.className = 'settings-name';
    name.textContent = label;
    r.append(name, control);
    if (readout) r.append(readout);
    panel.append(r);
    return r;
  };
  const slider = (
    key: keyof typeof RANGES,
    label: string,
    show: (v: number) => string,
  ) => {
    const input = document.createElement('input');
    input.type = 'range';
    const { min, max, step } = RANGES[key];
    Object.assign(input, { min, max, step });
    const out = document.createElement('output');
    out.className = 'settings-readout';
    input.addEventListener('input', () =>
      updateSettings({ [key]: Number(input.value) } as Partial<Settings>),
    );
    row(label, input, out);
    return (s: Settings) => {
      input.value = String(s[key]);
      out.textContent = show(s[key]);
    };
  };
  const checkbox = (key: 'invertY' | 'onScreenControls', label: string) => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.addEventListener('change', () =>
      updateSettings({ [key]: input.checked }),
    );
    row(label, input);
    return (s: Settings) => {
      input.checked = s[key];
    };
  };

  const shows = [
    slider('volume', 'Master volume', (v) => `${Math.round(v * 100)}%`),
    slider('sensitivity', 'Look sensitivity', (v) => `${v.toFixed(2)}×`),
    checkbox('invertY', 'Invert up and down'),
    slider('fov', 'Field of view', (v) => `${Math.round(v)}°`),
  ];
  // Graphics quality: three choices side by side.
  const qualities = document.createElement('div');
  qualities.className = 'settings-choices';
  qualities.setAttribute('role', 'radiogroup');
  const qualityInputs = QUALITIES.map((q) => {
    const choice = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'settings-quality';
    input.value = q;
    input.addEventListener('change', () => updateSettings({ quality: q }));
    choice.append(input, document.createTextNode(QUALITY_NAMES[q]));
    qualities.append(choice);
    return input;
  });
  const qualityRow = document.createElement('div');
  qualityRow.className = 'settings-row';
  const qualityName = document.createElement('span');
  qualityName.className = 'settings-name';
  qualityName.textContent = 'Graphics quality';
  qualityRow.append(qualityName, qualities);
  panel.append(qualityRow);
  shows.push((s) => {
    for (const input of qualityInputs)
      input.checked = input.value === s.quality;
  });
  shows.push(checkbox('onScreenControls', 'On-screen controls'));

  // Erase saved game: waits for the game's own save (stage 6).
  const erase = document.createElement('button');
  erase.type = 'button';
  erase.className = 'settings-button';
  erase.textContent = 'Erase saved game';
  erase.disabled = true;
  erase.title = 'Available once the game has its own save';
  const eraseRow = document.createElement('div');
  eraseRow.className = 'settings-row';
  const eraseName = document.createElement('span');
  eraseName.className = 'settings-name';
  eraseName.textContent = 'Saved game';
  eraseRow.append(eraseName, erase);
  panel.append(eraseRow);

  const note = document.createElement('p');
  note.className = 'settings-note';
  note.textContent =
    'Your settings are kept in this browser. They do not yet change the game.';
  panel.append(note);
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'settings-button settings-done';
  done.textContent = 'Done';
  panel.append(done);

  const show = () => {
    for (const s of shows) s(settings.value);
  };
  let returnFocus: Element | null = null;
  const close = () => {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  };
  const open = () => {
    returnFocus = document.activeElement;
    // Free the mouse, so the panel can be worked.
    document.exitPointerLock?.();
    show();
    backdrop.hidden = false;
    panel.querySelector<HTMLElement>('input')?.focus();
  };
  done.addEventListener('click', close);
  // A click outside the panel closes it too.
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  // While open, the game takes no keys: stopped here, on the window, before
  // any of the game's listeners hear them. Esc closes it. The browser's own
  // handling (Tab, arrows on a slider, Space on a box) still happens, as
  // nothing prevents it.
  window.addEventListener(
    'keydown',
    (event) => {
      if (backdrop.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      event.stopImmediatePropagation();
    },
    true,
  );
  window.addEventListener(
    'keyup',
    (event) => {
      if (!backdrop.hidden) event.stopImmediatePropagation();
    },
    true,
  );
  document.body.append(backdrop);
  return {
    open,
    close,
    get isOpen() {
      return !backdrop.hidden;
    },
  };
}
