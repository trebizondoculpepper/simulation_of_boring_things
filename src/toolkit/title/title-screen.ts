import { partAudio } from '../components/core/audio/part-audio';
/**
 * The title screen (`doc/plans/title-screen.md`): "Boring Simulations
 * Presents: The Pool", the main menu (New game, Continue, Settings,
 * Instructions) and the version and build in the bottom right-hand
 * corner. Worked by mouse, arrow keys and Enter, or a gamepad's d-pad (or
 * left stick) and A. Its background is plain for now; later a blurred,
 * slowly cycling render of the game's rooms seen from high up.
 */

import { createTitleMusic } from './title-music';
import { listenMenu } from '../controls/input/menu-input';

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

  // Until the browser lets sound start (a click or a key on the page), a
  // word that it is waiting, so the silence does not look broken.
  const soundHint = document.createElement('p');
  soundHint.className = 'title-sound-hint';
  soundHint.textContent = 'Click or press a key for sound';
  soundHint.setAttribute('aria-live', 'polite');
  root.append(soundHint);

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

  // The sound hint, until sound runs.
  const watchSound = () => {
    requestAnimationFrame(watchSound);
    if (showing()) soundHint.hidden = partAudio.running();
  };
  requestAnimationFrame(watchSound);
  // The gamepad, through the control scheme's menu input (`menu-input.ts`):
  // the d-pad or stick moves between the items, A works the one chosen.
  listenMenu({
    intent(intent, from) {
      if (from !== 'gamepad' || !showing() || !items().length) return false;
      if (intent === 'up') move(-1);
      else if (intent === 'down') move(1);
      else if (intent === 'activate')
        (document.activeElement as HTMLElement | null)?.click();
      else return false;
      return true;
    },
  });

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
