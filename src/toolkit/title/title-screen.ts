/**
 * The title screen (`doc/plans/title-screen.md`): "Boring Simulations
 * Presents: The Pool", the main menu (New game, Continue, Settings,
 * Instructions) and the version and build in the bottom right-hand
 * corner. Worked by mouse, arrow keys and Enter, or a gamepad's d-pad (or
 * left stick) and A. Its background is plain for now; later a blurred,
 * slowly cycling render of the game's rooms seen from high up.
 */

import { createTitleMusic } from './title-music';

export interface TitleActions {
  newGame(): void;
  /** Continue the saved game; greyed out while `canContinue` says no. */
  continueGame(): void;
  canContinue(): boolean;
  /** Why Continue is greyed out, for its tooltip. */
  noContinue?: string;
  settings(): void;
  instructions(): void;
  /** Whether something (the settings) is open over it, taking the keys and pad. */
  covered(): boolean;
  /** The version and build, for the corner. */
  build: string;
}

export function createTitleScreen(actions: TitleActions) {
  const music = createTitleMusic();
  const root = document.createElement('div');
  root.className = 'title-screen';
  root.hidden = true;
  const backdrop = document.createElement('div');
  backdrop.className = 'title-backdrop';
  root.append(backdrop);

  const head = document.createElement('header');
  head.className = 'title-head';
  const presents = document.createElement('p');
  presents.className = 'title-presents';
  presents.textContent = 'Boring Simulations Presents:';
  const name = document.createElement('h1');
  name.className = 'title-name';
  name.textContent = 'The Pool';
  head.append(presents, name);
  root.append(head);

  const menu = document.createElement('nav');
  menu.className = 'title-menu';
  menu.setAttribute('aria-label', 'Main menu');
  const item = (text: string, action: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'title-item';
    b.textContent = text;
    b.addEventListener('click', action);
    menu.append(b);
    return b;
  };
  item('New game', actions.newGame);
  const continueItem = item('Continue', actions.continueGame);
  item('Settings', actions.settings);
  item('Instructions', actions.instructions);
  root.append(menu);

  const build = document.createElement('p');
  build.className = 'title-build';
  build.textContent = actions.build;
  const source = document.createElement('a');
  source.href = 'https://github.com/trebizondoculpepper/the_pool';
  source.textContent = 'Source code';
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  build.append(document.createElement('br'), source);
  root.append(build);

  const items = () =>
    [...menu.querySelectorAll<HTMLButtonElement>('.title-item')].filter(
      (b) => !b.disabled,
    );
  const move = (by: number) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    list[(at + by + list.length) % list.length]?.focus();
  };
  const showing = () => !root.hidden && !actions.covered();

  // The keys: up and down move between the items; Enter and Space work
  // the one chosen (as buttons do).
  window.addEventListener('keydown', (event) => {
    if (!showing()) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    }
  });

  // The gamepad, polled each frame while the title is shown.
  const was = new Set<number>();
  let stickHeld = false;
  const poll = () => {
    requestAnimationFrame(poll);
    if (!showing()) return;
    const pad =
      typeof navigator !== 'undefined' && navigator.getGamepads
        ? [...navigator.getGamepads()].find((p) => p?.mapping === 'standard')
        : undefined;
    if (!pad) return;
    const went = (i: number) => {
      const down = pad.buttons[i]?.pressed === true;
      const fresh = down && !was.has(i);
      if (down) was.add(i);
      else was.delete(i);
      return fresh;
    };
    const stickY = pad.axes[1] ?? 0;
    const stick = Math.abs(stickY) > 0.6 ? Math.sign(stickY) : 0;
    if (went(12) || (stick < 0 && !stickHeld)) move(-1);
    if (went(13) || (stick > 0 && !stickHeld)) move(1);
    stickHeld = stick !== 0;
    if (went(0)) (document.activeElement as HTMLElement | null)?.click();
  };
  requestAnimationFrame(poll);

  document.body.append(root);
  return {
    show() {
      music.show();
      const can = actions.canContinue();
      continueItem.disabled = !can;
      continueItem.title = can ? '' : (actions.noContinue ?? '');
      root.hidden = false;
      document.title = 'The Pool';
      items()[can ? 1 : 0]?.focus();
    },
    hide() {
      music.hide();
      root.hidden = true;
    },
  };
}
