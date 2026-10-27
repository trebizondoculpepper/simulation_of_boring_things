import { Button, Label, Place, Toggle } from './components';
import type { ButtonOptions } from './components';
import { tracePath } from './node';
import type { UiSound } from './node';
import { pillPath } from './geometry';
import { colourOf, fontOf, lettered } from './theme';
import type { Theme } from './theme';

/** A pager key's face: its block, and its arrow or word centred in it, large (the owner, 2026-10-27). */
function drawKey(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  key: Button,
  icon: 'back' | 'forward' | 'word',
) {
  const r = key.shape();
  if (r.w <= 0 || r.h <= 0) return;
  ctx.fillStyle = key.shownColour(theme);
  tracePath(ctx, pillPath(r, key.caps));
  ctx.fill();
  const ink = key.disabled ? '#1a1a1a' : theme.ink;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  if (icon === 'word') {
    ctx.font = fontOf(theme, r.h * 0.5);
    ctx.fillStyle = colourOf(theme, ink);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lettered(theme, key.label), cx, cy, r.w * 0.8);
    return;
  }
  // An arrowhead as tall as the word's capitals are wide, centred.
  const h = r.h * 0.56;
  const w = h * 0.8;
  const s = icon === 'back' ? -1 : 1;
  ctx.fillStyle = colourOf(theme, ink);
  ctx.beginPath();
  ctx.moveTo(cx + (s * w) / 2, cy);
  ctx.lineTo(cx - (s * w) / 2, cy - h / 2);
  ctx.lineTo(cx - (s * w) / 2, cy + h / 2);
  ctx.closePath();
  ctx.fill();
}

/** ◄ or ►: an arrow centred in its block. */
class PagerKey extends Button {
  constructor(
    options: ButtonOptions,
    readonly icon: 'back' | 'forward',
  ) {
    super(options);
  }
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    drawKey(ctx, theme, this, this.icon);
  }
}

/** LOCK: its word centred in its block, lit while locked. */
class PagerLock extends Toggle {
  protected draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    drawKey(ctx, theme, this, 'word');
  }
}

/**
 * A console's pager (mission 093's kit; the owner's request, 2026-10-27):
 * one small strip, the same on every console, to page what it shows left
 * and right and, where it has one, to lock it on its page. ◄, LOCK and ►
 * (the lock between the arrows, the three the same size; the owner,
 * 2026-10-27), or ◄ and ► alone (`lock: false`), then the page's short
 * title with its place in the list (`3/46`), always laid out on a surface
 * `PAGER_PIXELS` wide and high, so it looks the same whatever its size.
 *
 * It keeps no page of its own: its host decides what a step or a lock
 * means and tells it what to show (`set`), so a page changed elsewhere
 * shows at once. LOCK lit shows it locked; what a lock means (holding a
 * page that turns by itself) is the host's, and ◄ and ► work either way.
 */

/** The pager's surface, pixels: draw it on a canvas of this size. */
export const PAGER_PIXELS = { w: 320, h: 64 } as const;

/** Its pieces' spans across the strip, pixels from its left: with its LOCK, and without. */
export const PAGER_LAYOUT = {
  locking: {
    back: [0, 64],
    lock: [68, 132],
    forward: [136, 200],
    title: [208, 288],
    count: [288, 316],
  },
  plain: {
    back: [0, 64],
    forward: [68, 132],
    title: [140, 288],
    count: [288, 316],
  },
} as const;

export interface PagerOptions {
  /** A step asked for (◄ −1, ► +1); its answer is the sound (nothing for a page change). */
  onStep(direction: -1 | 1): UiSound | null | void;
  /** LOCK pressed: the lock asked for; its answer is the sound (nothing for a confirm). */
  onLock(locked: boolean): UiSound | null | void;
  /** Its buttons' colour (a theme role or colour name). */
  colour?: string;
  /** Whether it has a LOCK (default true). */
  lock?: boolean;
}

export interface PagerState {
  title: string;
  /** Its page's place in the list, from 0. */
  index: number;
  count: number;
  locked: boolean;
}

export class ConsolePager extends Place {
  readonly back: Button;
  readonly forward: Button;
  readonly lock: Toggle;
  readonly title: Label;
  readonly count: Label;
  readonly hasLock: boolean;
  private shown: PagerState | null = null;

  constructor(options: PagerOptions) {
    super();
    const colour = options.colour ?? 'primary';
    const step = (direction: -1 | 1) => () => {
      const answer = options.onStep(direction);
      return answer === undefined ? 'page' : answer;
    };
    this.back = new PagerKey(
      {
        id: 'pager/back',
        label: '◄',
        colour,
        caps: 'left',
        pill: true,
        onPress: step(-1),
      },
      'back',
    );
    this.forward = new PagerKey(
      {
        id: 'pager/forward',
        label: '►',
        colour,
        caps: 'right',
        pill: true,
        onPress: step(1),
      },
      'forward',
    );
    this.lock = new PagerLock({
      id: 'pager/lock',
      label: 'LOCK',
      colour,
      caps: 'none',
      pill: true,
      onToggle: (locked) => options.onLock(locked),
    });
    this.title = new Label('', { colour, scale: 0.42 });
    this.count = new Label('', { colour: 'dim', scale: 0.32, align: 'right' });
    const { w } = PAGER_PIXELS;
    const span = (node: Button | Label, [a, b]: readonly [number, number]) =>
      this.put(node, a / w, 0, (b - a) / w, 1);
    this.hasLock = options.lock ?? true;
    const layout = this.hasLock ? PAGER_LAYOUT.locking : PAGER_LAYOUT.plain;
    span(this.back, layout.back);
    if (this.hasLock) span(this.lock, PAGER_LAYOUT.locking.lock);
    span(this.forward, layout.forward);
    span(this.title, layout.title);
    span(this.count, layout.count);
  }

  /** Show `state`: marked for painting only where it changes. */
  set(state: PagerState) {
    const s = this.shown;
    if (
      s &&
      s.title === state.title &&
      s.index === state.index &&
      s.count === state.count &&
      s.locked === state.locked
    )
      return;
    this.shown = { ...state };
    this.title.setText(state.title);
    this.count.setText(`${state.index + 1}/${state.count}`);
    this.lock.setOn(state.locked);
  }

  /** What it shows now (null before the first `set`). */
  get state(): PagerState | null {
    return this.shown;
  }
}
