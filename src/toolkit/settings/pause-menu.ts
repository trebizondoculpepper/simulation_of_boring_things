import { effect } from '@preact/signals-core';
import { paused } from '../controls/logic/paused';
import { listenMenu } from '../controls/input/menu-input';
import { controlsHelp } from '../controls/logic/controls';
import { flightHelp } from '../controls/logic/noclip';
import type { Readable } from '../components/core/logic/world/components';
import { RANGES, renderScale } from './logic/settings';
import type { Settings } from './logic/settings';
import { settings, updateSettings } from './settings-store';

/**
 * The pause menu (`doc/plans/title-screen.md`): tabs for the Game (resume,
 * save, quit), Graphics, Audio and Controls, in the HUD's style, over the
 * game, which pauses while it is open (`paused.ts`). Opened by Esc once the
 * mouse is free (the first Esc is the browser's, freeing it), a gamepad's
 * Start, or the gear among each room's view tools; Esc, Start, B or Resume
 * close it. Tabs switch by click, Q and E, or the shoulder buttons; a
 * gamepad's d-pad moves between controls, left and right change a slider,
 * A works the one chosen. Settings are kept at once (`settings-store.ts`).
 * Saving is Minecraft's: the world saves itself; Save is for reassurance.
 */

/** The gear, as an icon in the HUD's style. */
export const GEAR_ICON = `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
<path d="M13.4 3h5.2l.8 3.6 2.4 1 3.1-2 3.7 3.7-2 3.1 1 2.4 3.4.8v5.2l-3.6.8-1 2.4 2 3.1-3.7 3.7-3.1-2-2.4 1-.8 3.4h-5.2l-.8-3.6-2.4-1-3.1 2-3.7-3.7 2-3.1-1-2.4L3 18.6v-5.2l3.6-.8 1-2.4-2-3.1 3.7-3.7 3.1 2 2.4-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<circle cx="16" cy="16" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/>
</svg>`;

/** A wrench, as an icon in the HUD's style: the developers' panel. */
const WRENCH_ICON = `<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
<path d="M21.5 4.5a6.5 6.5 0 0 0-6.2 8.4L5.6 22.6a2.6 2.6 0 0 0 3.7 3.7l9.7-9.7a6.5 6.5 0 0 0 8.4-6.2c0-.9-.2-1.8-.5-2.6l-3.8 3.8-3.4-.9-.9-3.4 3.8-3.8c-.8-.3-1.7-.5-2.6-.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
</svg>`;

/** What the Game tab does: the app's to supply. */
export interface PauseMenuActions {
  /** Save now; whether it was saved. */
  save(): boolean;
  /**
   * Whether this tab saves the game: false while another tab has it open
   * and this one only follows it, when Save is greyed out.
   */
  holding?: Readable<boolean>;
  /** Save, and go to the title screen. */
  quitToTitle(): void;
  /** Quit the program, where there is one to quit (a desktop build). */
  quitToDesktop?: () => void;
  /** Open the developers' panel (`?dev`), from the wrench in the corner. */
  devPanel?: () => void;
  /** Whether Esc and Start may open it now: only in a room, not on the title screen. */
  canOpen?: () => boolean;
  /** Temporary camera authoring, without changing the player's saved position. */
  noclip?: Readable<boolean>;
  setNoclip?: (on: boolean) => void;
  copyCamera?: () => Promise<string>;
}

const TABS = ['Game', 'Graphics', 'Audio', 'Controls'] as const;
type Tab = (typeof TABS)[number];

/** The controls, by keyboard and mouse and by gamepad (`first-person.ts`). */
export const BINDINGS: readonly [string, string, string][] = [
  ['Walk', 'W A S D or arrows', 'Left stick'],
  ['Run', 'Shift', 'Click the left stick'],
  ['Look', 'Click, then move the mouse', 'Right stick'],
  ['Use, pick up, drop', 'Click or E', 'A'],
  ['Turn a knob down or up', 'Click its left or right half', 'LB or RB'],
  ['Turn a held object', 'Hold X and move the mouse', 'Hold Y'],
  ['Zoom', 'Wheel or pinch', 'LT or RT'],
  ['Crouch, lower, stand', 'C or V', 'B'],
  ['Torch', 'F', 'X'],
  ['Eye height', 'Alt and the wheel', ''],
  ['Free the mouse', 'Esc', ''],
  ['Console', '` (key left of 1)', ''],
  ['Copy highlighted object reference', 'Ctrl/Cmd+C', ''],
  ['Copy pin / noclip camera link', 'Ctrl/Cmd+P', ''],
  ['Copy a screenshot', 'Ctrl/Cmd+Shift+K', ''],
  ['Noclip on / off', 'Ctrl+Shift+N', ''],
  [
    'Fly in noclip',
    'WASD; Space up, Shift down, Ctrl faster',
    'Left stick; A up, B down',
  ],
  ['Roll / level in noclip', 'Q / E; R to level', 'LB / RB; Y to level'],
  ['This menu', 'Esc with the mouse free, or the gear', 'Start'],
  [
    'In a menu: move, press, turn, back',
    'Arrows or Tab, Enter, Left / Right, Esc',
    'D-pad or stick, A, LB / RB, B',
  ],
];

export function createPauseMenu(actions: PauseMenuActions) {
  const backdrop = document.createElement('div');
  backdrop.className = 'settings-backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Paused');
  backdrop.append(panel);
  const heading = document.createElement('h2');
  heading.textContent = 'Paused';
  const top = document.createElement('div');
  top.className = 'menu-top';
  top.append(heading);
  // The wrench: the developers' panel, a tool rather than part of the game.
  if (actions.devPanel) {
    const wrench = document.createElement('button');
    wrench.type = 'button';
    wrench.className = 'menu-wrench';
    wrench.innerHTML = WRENCH_ICON;
    wrench.title = 'Developer panel';
    wrench.setAttribute('aria-label', 'Developer panel');
    wrench.addEventListener('click', () => {
      close();
      actions.devPanel?.();
    });
    top.append(wrench);
  }
  panel.append(top);

  // The tabs, and a page for each.
  const tabBar = document.createElement('div');
  tabBar.className = 'menu-tabs';
  tabBar.setAttribute('role', 'tablist');
  panel.append(tabBar);
  const pages = new Map<Tab, HTMLElement>();
  const tabButtons = new Map<Tab, HTMLButtonElement>();
  for (const tab of TABS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-tab';
    button.textContent = tab;
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => choose(tab));
    tabBar.append(button);
    tabButtons.set(tab, button);
    const page = document.createElement('div');
    page.className = 'menu-page';
    page.setAttribute('role', 'tabpanel');
    page.hidden = true;
    panel.append(page);
    pages.set(tab, page);
  }
  let current: Tab = 'Game';
  const choose = (tab: Tab) => {
    current = tab;
    for (const t of TABS) {
      pages.get(t)!.hidden = t !== tab;
      tabButtons.get(t)!.setAttribute('aria-selected', String(t === tab));
      tabButtons.get(t)!.classList.toggle('is-current', t === tab);
    }
    focusables()[0]?.focus();
  };
  const step = (by: number) => {
    const tabs = reachable();
    choose(tabs[(tabs.indexOf(current) + by + tabs.length) % tabs.length]);
  };

  // ---- Settings rows -------------------------------------------------------
  const shows: ((s: Settings) => void)[] = [];
  const row = (page: Tab, label: string, ...controls: HTMLElement[]) => {
    const r = document.createElement('label');
    r.className = 'settings-row';
    const name = document.createElement('span');
    name.className = 'settings-name';
    name.textContent = label;
    r.append(name, ...controls);
    pages.get(page)!.append(r);
  };
  const slider = (
    page: Tab,
    key: keyof typeof RANGES,
    label: string,
    show: (v: number) => string,
  ) => {
    const input = document.createElement('input');
    input.type = 'range';
    const { min, max, step: by } = RANGES[key];
    Object.assign(input, { min, max, step: by });
    const out = document.createElement('output');
    out.className = 'settings-readout';
    input.addEventListener('input', () =>
      updateSettings({ [key]: Number(input.value) } as Partial<Settings>),
    );
    row(page, label, input, out);
    shows.push((s) => {
      input.value = String(s[key]);
      out.textContent = show(s[key]);
    });
  };
  const checkbox = (page: Tab, key: 'invertY', label: string) => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.addEventListener('change', () =>
      updateSettings({ [key]: input.checked }),
    );
    row(page, label, input);
    shows.push((s) => {
      input.checked = s[key];
    });
  };
  const button = (page: Tab, text: string, action: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'settings-button menu-action';
    b.textContent = text;
    b.addEventListener('click', action);
    pages.get(page)!.append(b);
    return b;
  };

  // ---- Game ------------------------------------------------------------------
  button('Game', 'Resume', () => close());
  const saved = document.createElement('p');
  saved.className = 'settings-note';
  saved.setAttribute('role', 'status');
  const saveButton = button('Game', 'Save', () => {
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    saved.textContent = actions.save()
      ? `Saved at ${time}. The game also saves itself as you play.`
      : 'The game could not be saved here.';
  });
  if (actions.setNoclip && actions.noclip) {
    const flight = document.createElement('input');
    flight.type = 'checkbox';
    flight.setAttribute('aria-label', 'Noclip free camera');
    flight.addEventListener('change', () =>
      actions.setNoclip?.(flight.checked),
    );
    row('Game', 'Noclip free camera', flight);
    effect(() => {
      flight.checked = actions.noclip!.value;
    });
    const note = document.createElement('p');
    note.className = 'settings-note';
    note.textContent =
      'Frame a title shot: fly through equipment; Space up, Shift down, Ctrl faster; Q and E roll the view, R levels it. Turning this off returns you to your walking position.';
    pages.get('Game')!.append(note);
  }
  if (actions.copyCamera)
    button('Game', 'Copy Camera Link', () => {
      void actions.copyCamera!().then((message) => {
        saved.textContent = message;
      });
    });
  button('Game', 'Quit to Title', () => {
    close();
    actions.quitToTitle();
  });
  if (actions.quitToDesktop)
    button('Game', 'Quit to Desktop', actions.quitToDesktop);
  // A follower tab: Save greyed out, and why.
  const follower = document.createElement('p');
  follower.className = 'settings-note';
  follower.textContent =
    'The game is open in another tab, which saves it. This tab is a follower: it shows the same game but does not save.';
  pages.get('Game')!.append(saved, follower);
  effect(() => {
    const holds = actions.holding?.value ?? true;
    saveButton.disabled = !holds;
    saveButton.title = holds
      ? ''
      : 'The game is open in another tab, which saves it';
    follower.hidden = holds;
  });

  // ---- Graphics, Audio, Controls -------------------------------------------
  slider('Graphics', 'renderLevel', 'Render quality', (v) =>
    v === 0 ? '1:1' : `1:${(1 / renderScale(v)).toFixed(2)}`,
  );
  slider('Graphics', 'fov', 'Field of view', (v) => `${Math.round(v)}°`);
  slider('Audio', 'volume', 'Master volume', (v) => `${Math.round(v * 100)}%`);
  slider(
    'Controls',
    'sensitivity',
    'Look sensitivity',
    (v) => `${v.toFixed(2)}×`,
  );
  checkbox('Controls', 'invertY', 'Invert up and down');
  const onScreen = document.createElement('select');
  onScreen.setAttribute('aria-label', 'On-screen controls');
  for (const [value, label] of [
    ['automatic', 'Automatic'],
    ['always', 'Always'],
    ['never', 'Never'],
  ] as const) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    onScreen.append(option);
  }
  onScreen.addEventListener('change', () =>
    updateSettings({
      onScreenControls: onScreen.value as Settings['onScreenControls'],
    }),
  );
  row('Controls', 'On-screen controls', onScreen);
  shows.push((s) => {
    onScreen.value = s.onScreenControls;
  });
  const table = document.createElement('table');
  table.className = 'menu-bindings';
  table.innerHTML = `<thead><tr><th></th><th>Keyboard and mouse</th><th>Gamepad</th></tr></thead>`;
  const body = document.createElement('tbody');
  for (const [what, keys, pad] of BINDINGS) {
    const tr = document.createElement('tr');
    for (const text of [what, keys, pad]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    body.append(tr);
  }
  table.append(body);
  pages.get('Controls')!.append(table);
  for (const text of [`Touch: ${controlsHelp('touch')}`, flightHelp('touch')]) {
    const note = document.createElement('p');
    note.className = 'settings-note';
    note.textContent = text;
    pages.get('Controls')!.append(note);
  }

  // Every change shows at once: the readouts follow the sliders.
  effect(() => {
    const now = settings.value;
    for (const s of shows) s(now);
  });

  // ---- Opening and closing -------------------------------------------------
  let returnFocus: Element | null = null;
  const isOpen = () => !backdrop.hidden;
  const close = () => {
    if (!isOpen()) return;
    backdrop.hidden = true;
    paused.value = false;
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  };
  /**
   * Open it at `tab`. From the title screen (`inGame` false) it has no
   * Game tab and pauses nothing: it is the title's Settings or
   * Instructions.
   */
  const open = (tab: Tab = 'Game', { inGame = true } = {}) => {
    if (isOpen()) return;
    returnFocus = document.activeElement;
    document.exitPointerLock?.();
    saved.textContent = '';
    tabButtons.get('Game')!.hidden = !inGame;
    heading.textContent = inGame
      ? 'Paused'
      : tab === 'Controls'
        ? 'Instructions'
        : 'Settings';
    panel.setAttribute('aria-label', heading.textContent);
    paused.value = inGame;
    backdrop.hidden = false;
    choose(inGame || tab !== 'Game' ? tab : 'Graphics');
  };
  const reachable = () => TABS.filter((t) => !tabButtons.get(t)!.hidden);
  // A click outside the panel closes it too.
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });

  // The keys. Closed: Esc with the mouse free opens it (with the mouse
  // captured, the browser keeps that Esc to free it). Open: the game hears
  // nothing (stopped here, on the window, before its listeners); Esc
  // closes, Q and E switch tabs. The browser's own handling (Tab, arrows
  // on a slider, Space on a box) still happens.
  window.addEventListener(
    'keydown',
    (event) => {
      if (!isOpen()) {
        if (
          event.key === 'Escape' &&
          !document.pointerLockElement &&
          !(event.target instanceof HTMLInputElement) &&
          (actions.canOpen?.() ?? true)
        ) {
          event.preventDefault();
          open();
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'q' || event.key === 'Q') step(-1);
      else if (event.key === 'e' || event.key === 'E') step(1);
      event.stopImmediatePropagation();
    },
    true,
  );
  window.addEventListener(
    'keyup',
    (event) => {
      if (isOpen()) event.stopImmediatePropagation();
    },
    true,
  );

  // The gamepad, polled each frame: Start toggles the menu; open, the
  // d-pad (or left stick) moves between controls, left and right change a
  // slider, A works the chosen control, B closes, LB and RB switch tabs.
  function focusables(): HTMLElement[] {
    return [
      ...pages
        .get(current)!
        .querySelectorAll<HTMLElement>('input, button, select'),
    ].filter((e) => !(e as HTMLButtonElement).disabled);
  }
  const moveFocus = (by: number) => {
    const list = focusables();
    if (!list.length) return;
    const at = list.indexOf(document.activeElement as HTMLElement);
    list[(at + by + list.length) % list.length].focus();
  };
  const nudge = (by: number) => {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.type === 'range') {
      if (by > 0) el.stepUp();
      else el.stepDown();
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el instanceof HTMLSelectElement) {
      el.selectedIndex = Math.max(
        0,
        Math.min(el.options.length - 1, el.selectedIndex + by),
      );
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
  // The gamepad, through the control scheme's menu input (`menu-input.ts`):
  // Start toggles the menu; open, the d-pad or stick moves between
  // controls, left and right change a slider, A works the chosen control,
  // B closes, LB and RB switch tabs. (Its keys are the browser's own.)
  listenMenu({
    intent(intent, from) {
      if (from !== 'gamepad') return false;
      if (!isOpen()) {
        if (intent !== 'toggle' || !(actions.canOpen?.() ?? true)) return false;
        open();
        return true;
      }
      if (intent === 'toggle' || intent === 'back') close();
      else if (intent === 'turnDown') step(-1);
      else if (intent === 'turnUp') step(1);
      else if (intent === 'up') moveFocus(-1);
      else if (intent === 'down') moveFocus(1);
      else if (intent === 'left') nudge(-1);
      else if (intent === 'right') nudge(1);
      else if (intent === 'activate')
        (document.activeElement as HTMLElement | null)?.click();
      return true;
    },
    modal: () => isOpen(),
  });

  document.body.append(backdrop);
  return {
    open,
    close,
    get isOpen() {
      return isOpen();
    },
  };
}
