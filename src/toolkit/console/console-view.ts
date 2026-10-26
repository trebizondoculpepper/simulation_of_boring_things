import { effect } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import type { GameEvent } from '../../game/events/game-event';
import { formatEvent } from '../../game/events/game-event';
import { consoleOpen } from '../controls/logic/console-open';
import { isConsoleKey } from '../controls/logic/controls';
import {
  applyCompletion,
  commonPrefix,
  completionsAt,
  remember,
} from './logic/command-line';
import type { Completion } from './logic/command-line';
import { candidates, runLine } from './logic/commands';
import type { ConsoleHost, ConsoleLine } from './logic/commands';

/**
 * The console (`doc/prompts/done/058-developer-console.md`): Quake's, dropped
 * down over the top of the view by the key left of 1, the log above a `]`
 * prompt. It takes the keyboard while it is down; the walker hears
 * nothing (`consoleOpen`), but the world runs on. The same key or Esc puts
 * it away.
 */

const HISTORY_KEY = 'pool-plant:console-history';
/** Lines kept on the console's screen. */
const SCREEN_LINES = 1000;

const loadHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((l): l is string => typeof l === 'string')
      : [];
  } catch {
    return [];
  }
};
const saveHistory = (history: readonly string[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Not kept: the console still works.
  }
};

export interface ConsoleOptions {
  /** The host, less what the view itself supplies (clear, history). */
  host: Omit<ConsoleHost, 'clear' | 'history'>;
  /** The player's event log, shown as it grows. */
  events: ReadonlySignal<readonly GameEvent[]>;
  /** Whether it may come down now (in a room, no menu open). */
  canOpen(): boolean;
  /** Called as it comes down (true) and goes away (false). */
  opened?(open: boolean): void;
}

export function createConsole(options: ConsoleOptions) {
  const panel = document.createElement('div');
  panel.className = 'game-console';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Console');
  const screen = document.createElement('div');
  screen.className = 'game-console-log';
  screen.setAttribute('role', 'log');
  const row = document.createElement('label');
  row.className = 'game-console-row';
  const prompt = document.createElement('span');
  prompt.textContent = ']';
  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', 'Console command');
  row.append(prompt, input);
  panel.append(screen, row);
  // Below the panel, the rest of the view: a click there keeps the console.
  const catcher = document.createElement('div');
  catcher.className = 'game-console-catcher';
  catcher.hidden = true;
  catcher.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.focus();
  });
  document.body.append(catcher, panel);

  let history = loadHistory();
  // Where Up and Down are in the history; history.length is the line being typed.
  let at = history.length;
  let draft = '';
  // A Tab completion being cycled: its matches and which one is shown.
  let cycling: { completion: Completion; index: number } | null = null;
  let wasLocked = false;

  const print = (lines: readonly ConsoleLine[]) => {
    const near =
      screen.scrollHeight - screen.scrollTop - screen.clientHeight < 40;
    for (const line of lines) {
      const div = document.createElement('div');
      div.className = `game-console-line is-${line.tone}`;
      div.textContent = line.text;
      screen.append(div);
    }
    while (screen.childElementCount > SCREEN_LINES)
      screen.firstElementChild?.remove();
    if (near) screen.scrollTop = screen.scrollHeight;
  };

  const host: ConsoleHost = {
    ...options.host,
    clear: () => screen.replaceChildren(),
    history: () => history,
  };

  // The log as it grows: each new line printed once.
  let shown = options.events.peek().length;
  let last = options.events.peek().at(-1);
  print(
    options.events
      .peek()
      .map((e) => ({ text: formatEvent(e), tone: e.severity })),
  );
  const stopLog = effect(() => {
    const events = options.events.value;
    // The log is a bounded ring: find where the last line shown now is.
    const from = last ? events.lastIndexOf(last) + 1 : 0;
    const fresh = from > 0 || !last ? events.slice(from) : events.slice(shown);
    shown = events.length;
    last = events.at(-1);
    if (fresh.length)
      print(fresh.map((e) => ({ text: formatEvent(e), tone: e.severity })));
  });

  const isOpen = () => !panel.hidden;
  const open = () => {
    if (isOpen() || !options.canOpen()) return;
    wasLocked = Boolean(document.pointerLockElement);
    if (wasLocked) document.exitPointerLock();
    panel.hidden = false;
    catcher.hidden = false;
    consoleOpen.value = true;
    options.opened?.(true);
    screen.scrollTop = screen.scrollHeight;
    input.focus();
  };
  const close = () => {
    if (!isOpen()) return;
    panel.hidden = true;
    catcher.hidden = true;
    consoleOpen.value = false;
    input.blur();
    cycling = null;
    options.opened?.(false);
    // Back to looking about, if that is where it came down from.
    if (wasLocked)
      void document
        .querySelector<HTMLCanvasElement>('#app canvas:not([hidden])')
        ?.requestPointerLock?.();
  };

  const submit = () => {
    const line = input.value;
    input.value = '';
    cycling = null;
    print([{ text: `] ${line}`, tone: 'echo' }]);
    if (line.trim()) {
      history = remember(history, line);
      saveHistory(history);
    }
    at = history.length;
    draft = '';
    print(runLine(host, line));
    screen.scrollTop = screen.scrollHeight;
  };

  const complete = () => {
    const cursor = input.selectionStart ?? input.value.length;
    if (cycling) {
      // Tab again: the next match in turn, in place of the last one shown.
      const { completion } = cycling;
      cycling.index = (cycling.index + 1) % completion.matches.length;
      const next = completion.matches[cycling.index];
      input.value =
        input.value.slice(0, completion.start) +
        next +
        input.value.slice(cursor);
      const end = completion.start + next.length;
      input.setSelectionRange(end, end);
      return;
    }
    const c = completionsAt(input.value, cursor, (before) =>
      candidates(host, before),
    );
    if (!c.matches.length) return;
    if (c.matches.length === 1) {
      const done = applyCompletion(input.value, cursor, c, c.matches[0], true);
      input.value = done.line;
      input.setSelectionRange(done.cursor, done.cursor);
      return;
    }
    const prefix = commonPrefix(c.matches);
    if (prefix.length > c.word.length) {
      const done = applyCompletion(input.value, cursor, c, prefix, false);
      input.value = done.line;
      input.setSelectionRange(done.cursor, done.cursor);
    } else {
      // Nothing more in common: show them, and Tab again cycles.
      print([
        { text: c.matches.slice(0, 60).join('  '), tone: 'output' },
        ...(c.matches.length > 60
          ? [
              {
                text: `… and ${c.matches.length - 60} more`,
                tone: 'output',
              } as const,
            ]
          : []),
      ]);
      cycling = { completion: c, index: -1 };
    }
  };

  // The keys, heard first, on the window: the console key from anywhere
  // but another field; and, while it is down, everything typed is its own.
  const keydown = (event: KeyboardEvent) => {
    if (
      isConsoleKey(event.code, event.key) &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      const elsewhere =
        event.target instanceof HTMLElement &&
        event.target !== input &&
        (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement);
      if (elsewhere || event.isComposing) return;
      if (!isOpen() && !options.canOpen()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) {
        if (isOpen()) close();
        else open();
      }
      return;
    }
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.target !== input) {
      input.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      complete();
      return event.stopImmediatePropagation();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (at === history.length) draft = input.value;
      at = Math.max(
        0,
        Math.min(history.length, at + (event.key === 'ArrowUp' ? -1 : 1)),
      );
      input.value = at === history.length ? draft : history[at];
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      screen.scrollBy({
        top: (event.key === 'PageUp' ? -1 : 1) * screen.clientHeight * 0.8,
      });
    }
    if (event.key !== 'Tab') cycling = null;
    event.stopImmediatePropagation();
  };
  const keyup = (event: KeyboardEvent) => {
    if (isOpen()) event.stopImmediatePropagation();
  };
  window.addEventListener('keydown', keydown, true);
  window.addEventListener('keyup', keyup, true);

  return {
    open,
    close,
    get isOpen() {
      return isOpen();
    },
    dispose() {
      close();
      stopLog();
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      panel.remove();
      catcher.remove();
    },
  };
}
