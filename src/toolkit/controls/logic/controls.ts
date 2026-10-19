/**
 * The game's one control scheme. Every room, development rooms included,
 * is walked and worked the same way on each kind of input, and nothing
 * else may bind a control: `src/toolkit/controls/input/first-person.ts` implements
 * this table, and a room only says what a "use" does. Change a binding
 * here and in `first-person.ts`, never in a room.
 */

export type InputMode = 'mouse' | 'touch' | 'gamepad';
export const INPUT_MODES: readonly InputMode[] = ['mouse', 'touch', 'gamepad'];

export type ControlAction =
  | 'walk'
  | 'run'
  | 'look'
  | 'inspect'
  | 'use'
  | 'knob'
  | 'zoom'
  | 'crouch'
  | 'eye'
  | 'release';

/** Each action's binding on each input, or null where it has none. */
export const CONTROL_SCHEME: Record<
  ControlAction,
  Record<InputMode, string | null>
> = {
  walk: {
    mouse: 'WASD or arrows: walk',
    touch: 'Left stick: walk',
    gamepad: 'Left stick: walk',
  },
  run: {
    mouse: 'Shift: run',
    touch: 'push it to the rim to run',
    gamepad: 'click it to run',
  },
  look: {
    mouse: 'click, then the mouse: look',
    touch: 'Right stick or drag: look',
    gamepad: 'Right stick: look',
  },
  inspect: {
    mouse: 'hold X while carrying, move mouse: turn object',
    touch: 'hold INSPECT, use right stick or drag: turn object',
    gamepad: 'hold Y while carrying, right stick: turn object',
  },
  use: {
    mouse: 'click or E: use / pick up / drop',
    touch: 'Tap: use / pick up / drop',
    gamepad: 'A: use / pick up / drop',
  },
  knob: {
    mouse: "click a knob's left or right half: turn it down or up",
    touch: "tap a knob's left or right half: turn it down or up",
    gamepad: 'LB or RB: turn a knob down or up',
  },
  zoom: {
    mouse: 'wheel or pinch: zoom',
    touch: 'Pinch: zoom',
    gamepad: 'Triggers: zoom',
  },
  crouch: {
    mouse: 'C / V: crouch / lower; again: stand',
    touch: 'Crouch button: crouch',
    gamepad: 'B: crouch',
  },
  eye: {
    mouse: 'Alt+wheel: eye height',
    touch: null,
    gamepad: null,
  },
  release: {
    mouse: 'Esc: cursor',
    touch: null,
    gamepad: null,
  },
};

const ORDER: readonly ControlAction[] = [
  'walk',
  'run',
  'look',
  'inspect',
  'use',
  'knob',
  'zoom',
  'crouch',
  'eye',
  'release',
];

/** The controls help line for an input, the same in every room. */
export function controlsHelp(mode: InputMode) {
  const parts: string[] = [];
  for (const action of ORDER) {
    const binding = CONTROL_SCHEME[action][mode];
    if (!binding) continue;
    // Run qualifies walking: "Left stick: walk (push it to the rim to run)".
    if (action === 'run' && mode !== 'mouse') {
      parts[parts.length - 1] += ` (${binding})`;
      continue;
    }
    parts.push(binding[0].toUpperCase() + binding.slice(1));
  }
  return parts.join(' · ');
}

/** A gamepad stick's dead zone, as a share of its travel. */
export const GAMEPAD_DEAD_ZONE = 0.15;

/**
 * A gamepad stick's reading with its dead zone taken out: centred inside
 * it, and rising from zero just outside it to one at the rim.
 */
export function deadZone(x: number, y: number, zone = GAMEPAD_DEAD_ZONE) {
  const reach = Math.min(1, Math.hypot(x, y));
  if (reach <= zone) return { x: 0, y: 0 };
  const scaled = (reach - zone) / (1 - zone) / Math.hypot(x, y);
  return { x: x * scaled, y: y * scaled };
}

/** The standard gamepad mapping's buttons, as the scheme uses them. */
export const PAD = {
  use: 0,
  crouch: 1,
  knobDown: 4,
  knobUp: 5,
  zoomOut: 6,
  zoomIn: 7,
  run: 10,
} as const;
