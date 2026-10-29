import type { OnScreenControls } from '../../controls/logic/hud-policy';
import { choosePreset, renderScale } from '../../settings/logic/settings';
import type { Settings } from '../../settings/logic/settings';
import { GRAPHICS_PRESETS } from '../../settings/logic/graphics';

/**
 * The settings menu as a Penfold control panel (mission 096, stage 0): what
 * is on it, zone by zone, and how each control maps to the player's
 * settings. Every option of the DOM pause menu (`pause-menu.ts`) has its
 * place: a continuous value is a potentiometer with a readout beside it,
 * an on/off choice an illuminated latching push button, a choice of three
 * a lever selector, an action a push button (quitting with a confirm
 * step). Pure: the view (`views/settings-panel-view.ts`) builds the parts.
 */

/** The 30 mm operator colours a push button comes in. */
export type CapColour =
  | 'red'
  | 'green'
  | 'black'
  | 'amber'
  | 'blue'
  | 'white'
  | 'yellow';

/** A setting a potentiometer turns. */
export type KnobSetting = 'volume' | 'renderLevel' | 'fov' | 'sensitivity';

/** A setting a lever selector chooses among three. */
export type SelectorSetting = 'onScreenControls' | 'graphics';

/** A push button's action, for the app to supply. */
export type PanelAction =
  | 'resume'
  | 'save'
  | 'copyLink'
  | 'quitToTitle'
  | 'quitToDesktop'
  | 'devPanel';

export type PanelItem =
  | {
      kind: 'push';
      id: PanelAction;
      legend: string;
      colour: CapColour;
      /** Pressed once it arms and asks again; a second press within the window does it. */
      confirm?: boolean;
      /** Labelled on Dymo tape, a site addition, instead of an engraved plate. */
      dymo?: boolean;
    }
  | { kind: 'latch'; id: 'invertY'; legend: string; colour: CapColour }
  | {
      kind: 'pot';
      id: KnobSetting;
      legend: string;
      /** Printed beside the readout: its unit, or its prefix. */
      unit: string;
      digits: number;
    }
  | {
      kind: 'selector';
      id: SelectorSetting;
      legend: string;
      /** The names printed round it, left to right. */
      positions: readonly string[];
    }
  /**
   * A rotary switch stepping through a list (the owner, 2026-10-29: the
   * maximum resolution, 640 × 480 up to the viewport), a character LCD
   * under it naming the choice.
   */
  | { kind: 'switch'; id: 'resolutionCap'; legend: string }
  | { kind: 'key'; id: 'noclip'; legend: string; dymo?: boolean }
  /** A vacuum fluorescent message line across its zone. */
  | { kind: 'vfd'; id: 'status'; columns: number }
  /** The printed, laminated instruction card: the bindings and touch help. */
  | { kind: 'card'; id: 'bindings'; legend: string };

export interface PanelZone {
  id: string;
  /** Its engraved traffolyte heading. */
  title: string;
  items: readonly PanelItem[];
  /** Developers only: its heading on Dymo tape, added on site. */
  dymo?: boolean;
}

/** What the panel can offer here: some actions exist only in some builds. */
export interface PanelOffers {
  /** In a game (not opened from the title): the GAME zone. */
  inGame: boolean;
  quitToDesktop?: boolean;
  noclip?: boolean;
  copyLink?: boolean;
  devPanel?: boolean;
}

/** Each knob's travel: its setting's range in whole detents. */
export const KNOBS: Record<
  KnobSetting,
  { min: number; max: number; step: number; show: (value: number) => string }
> = {
  // 5 % a detent: 21 positions.
  volume: {
    min: 0,
    max: 1,
    step: 0.05,
    show: (v) => String(Math.round(v * 100)),
  },
  // Shown as the share of full resolution each side, a per cent.
  renderLevel: {
    min: 0,
    max: 10,
    step: 1,
    show: (v) => String(Math.round(renderScale(v) * 100)),
  },
  // 2° a detent, so the rooms' own 52° is a position.
  fov: { min: 40, max: 90, step: 2, show: (v) => String(Math.round(v)) },
  // A quarter a detent, 0.25 to 3: 12 positions, 1.00 among them.
  sensitivity: {
    min: 0.25,
    max: 3,
    step: 0.25,
    show: (v) => v.toFixed(2),
  },
};

/** How many detents a knob turns through (one fewer than its positions). */
export const knobSteps = (id: KnobSetting) => {
  const { min, max, step } = KNOBS[id];
  return Math.round((max - min) / step);
};

/**
 * Knobs that turn against their setting's numbers: render quality's level
 * 0 is the finest picture, so its knob turns clockwise from worst to best
 * (the owner, 2026-10-27).
 */
const REVERSED: ReadonlySet<KnobSetting> = new Set(['renderLevel']);

/** The detent nearest a setting's value. */
export function knobIndex(id: KnobSetting, value: number): number {
  const { min, step } = KNOBS[id];
  const steps = knobSteps(id);
  const i = Math.max(0, Math.min(steps, Math.round((value - min) / step)));
  return REVERSED.has(id) ? steps - i : i;
}

/** A detent's value, without the float's dust. */
export function knobValue(id: KnobSetting, index: number): number {
  const { min, step } = KNOBS[id];
  const steps = knobSteps(id);
  const at = Math.max(0, Math.min(steps, Math.round(index)));
  const i = REVERSED.has(id) ? steps - at : at;
  return Math.round((min + i * step) * 1e6) / 1e6;
}

/** A knob's position as a share of its travel, 0 to 1: what its meter reads. */
export const knobShare = (id: KnobSetting, value: number) =>
  knobIndex(id, value) / knobSteps(id);

/** What a knob's readout shows for a setting's value (snapped to its detent). */
export const knobReadout = (id: KnobSetting, value: number) =>
  KNOBS[id].show(knobValue(id, knobIndex(id, value)));

/**
 * Each knob's meter: a DH-670 moving-coil meter, its unit printed large
 * and its scale's full-scale figure, and the needle's reading (0 to 1) for
 * a setting's value. Quality reads the resolution drawn, a per cent of
 * full each side (level 10 draws 39 %); the field of
 * view reads its degrees on a 0 to 90 scale, its usable range banded.
 */
export const METERS: Record<
  KnobSetting,
  {
    unit: string;
    scaleMax: number;
    band?: { from: number; to: number; colour: string };
    redFrom?: number;
    reading: (value: number) => number;
  }
> = {
  volume: { unit: '%', scaleMax: 100, redFrom: 0.9, reading: (v) => v },
  // The resolution drawn, as a per cent of full along each side.
  renderLevel: {
    unit: '% RES',
    scaleMax: 100,
    band: { from: 0, to: 0.5, colour: '#b8342a' },
    reading: (v) => renderScale(v),
  },
  fov: {
    unit: 'DEG',
    scaleMax: 90,
    band: { from: 40 / 90, to: 1, colour: '#2f7d46' },
    reading: (v) => v / 90,
  },
  sensitivity: {
    unit: 'x',
    scaleMax: 3,
    redFrom: 1,
    reading: (v) => v / 3,
  },
};

/**
 * What is printed round each knob on its dial: figures (or words) at
 * shares of its travel, and a tick at every detent.
 */
export function dialScale(id: KnobSetting): { share: number; text: string }[] {
  const at = (value: number, text = String(value)) => ({
    share: knobShare(id, value),
    text,
  });
  switch (id) {
    case 'renderLevel':
      return [
        { share: 0, text: 'WORST' },
        { share: 1, text: 'BEST' },
      ];
    case 'volume':
      return [0, 0.25, 0.5, 0.75, 1].map((v) => at(v, String(v * 100)));
    case 'fov':
      return [40, 50, 60, 70, 80, 90].map((v) => at(v, `${v}°`));
    case 'sensitivity':
      return [0.25, 1, 2, 3].map((v) => at(v));
  }
}

/** The on-screen controls selector's positions, left to right. */
export const ON_SCREEN_POSITIONS: readonly OnScreenControls[] = [
  'automatic',
  'always',
  'never',
];

/** Each selector's settings, left to right: the graphics preset lowest first. */
const SELECTOR_VALUES: {
  [K in SelectorSetting]: readonly Settings[K][];
} = {
  onScreenControls: ON_SCREEN_POSITIONS,
  graphics: GRAPHICS_PRESETS,
};

/** The position a selector stands at for the settings. */
export function selectorIndex(id: SelectorSetting, now: Settings): number {
  const values: readonly string[] = SELECTOR_VALUES[id];
  return Math.max(0, values.indexOf(now[id]));
}

/** A setting change for a control's new position. */
export function settingFor(
  id: KnobSetting | SelectorSetting,
  index: number,
): Partial<Settings> {
  if (id === 'onScreenControls' || id === 'graphics') {
    const values = SELECTOR_VALUES[id];
    const at = Math.max(0, Math.min(values.length - 1, Math.round(index)));
    // A preset chosen sets its render quality too.
    return id === 'graphics'
      ? choosePreset(GRAPHICS_PRESETS[at])
      : { onScreenControls: ON_SCREEN_POSITIONS[at] };
  }
  return { [id]: knobValue(id, index) };
}

/** The status line's width, characters. */
export const STATUS_COLUMNS = 24;

/** The panel's zones, as offered here. */
export function settingsPanel(offers: PanelOffers): PanelZone[] {
  const zones: PanelZone[] = [];
  if (offers.inGame) {
    const game: PanelItem[] = [
      { kind: 'push', id: 'resume', legend: 'RESUME', colour: 'green' },
      { kind: 'push', id: 'save', legend: 'SAVE', colour: 'white' },
    ];
    if (offers.copyLink)
      game.push({
        kind: 'push',
        id: 'copyLink',
        legend: 'VIEW LINK',
        colour: 'blue',
      });
    game.push({
      kind: 'push',
      id: 'quitToTitle',
      legend: 'QUIT TO TITLE',
      colour: 'red',
      confirm: true,
    });
    if (offers.quitToDesktop)
      game.push({
        kind: 'push',
        id: 'quitToDesktop',
        legend: 'QUIT',
        colour: 'red',
        confirm: true,
      });
    game.push({ kind: 'vfd', id: 'status', columns: STATUS_COLUMNS });
    zones.push({ id: 'game', title: 'GAME', items: game });
  } else
    // Opened from the title: no game to resume, but a way back to it.
    zones.push({
      id: 'back',
      title: 'MENU',
      items: [{ kind: 'push', id: 'resume', legend: 'BACK', colour: 'green' }],
    });
  zones.push(
    {
      id: 'picture',
      title: 'PICTURE',
      items: [
        {
          kind: 'selector',
          id: 'graphics',
          legend: 'GRAPHICS',
          positions: ['LOW', 'MED', 'HIGH'],
        },
        {
          kind: 'pot',
          id: 'renderLevel',
          legend: 'RENDER QUALITY',
          unit: '% RES',
          digits: 3,
        },
        {
          kind: 'pot',
          id: 'fov',
          legend: 'FIELD OF VIEW',
          unit: 'DEG',
          digits: 2,
        },
        { kind: 'switch', id: 'resolutionCap', legend: 'MAX RESOLUTION' },
      ],
    },
    {
      id: 'sound',
      title: 'SOUND',
      items: [
        {
          kind: 'pot',
          id: 'volume',
          legend: 'MASTER VOLUME',
          unit: '%',
          digits: 3,
        },
      ],
    },
    {
      id: 'controls',
      title: 'CONTROLS',
      items: [
        {
          kind: 'pot',
          id: 'sensitivity',
          legend: 'LOOK SENSITIVITY',
          unit: 'x',
          digits: 4,
        },
        {
          kind: 'selector',
          id: 'onScreenControls',
          legend: 'ON-SCREEN CONTROLS',
          positions: ['AUTO', 'ON', 'OFF'],
        },
        { kind: 'latch', id: 'invertY', legend: 'INVERT Y', colour: 'amber' },
      ],
    },
  );
  const maintenance: PanelItem[] = [];
  if (offers.inGame && offers.noclip)
    maintenance.push({
      kind: 'key',
      id: 'noclip',
      legend: 'NOCLIP',
      dymo: true,
    });
  if (offers.devPanel)
    maintenance.push({
      kind: 'push',
      id: 'devPanel',
      legend: 'DEV PANEL',
      colour: 'black',
      dymo: true,
    });
  zones.push({
    id: 'instructions',
    title: 'INSTRUCTIONS',
    items: [{ kind: 'card', id: 'bindings', legend: 'CONTROLS CARD' }],
  });
  if (maintenance.length)
    zones.push({
      id: 'maintenance',
      title: 'MAINTENANCE',
      items: maintenance,
      dymo: true,
    });
  return zones;
}

// ---- The confirm step -------------------------------------------------------

/** How long an armed button waits for its second press, milliseconds. */
export const CONFIRM_WINDOW = 3000;

/**
 * A press of a button with a confirm step: the first arms it, a second
 * within the window does it; a press after the window arms it afresh.
 */
export function pressConfirm(
  armedAt: number | null,
  now: number,
  window = CONFIRM_WINDOW,
): { fire: boolean; armedAt: number | null } {
  if (armedAt !== null && now - armedAt <= window)
    return { fire: true, armedAt: null };
  return { fire: false, armedAt: now };
}

/** Whether an armed button is still waiting. */
export const armed = (
  armedAt: number | null,
  now: number,
  window = CONFIRM_WINDOW,
) => armedAt !== null && now - armedAt <= window;

// ---- The status line ---------------------------------------------------------

/**
 * What the GAME zone's message line shows: an armed quit's question first,
 * then the last message while it is fresh, then whether this tab saves.
 */
export function statusLine({
  armedQuit,
  message,
  holding,
  version,
  showVersion = false,
}: {
  armedQuit: PanelAction | null;
  message: string | null;
  holding: boolean;
  /** The game's version, shown in turn with SYSTEM READY (the owner, 2026-10-28). */
  version?: string;
  /** Its turn to show the version, rather than SYSTEM READY. */
  showVersion?: boolean;
}): string {
  const ready = showVersion && version ? `VER. ${version}` : 'SYSTEM READY';
  const line = armedQuit
    ? 'PRESS AGAIN TO QUIT'
    : (message ?? (holding ? ready : 'READ ONLY - OTHER TAB'));
  return line.toUpperCase().slice(0, STATUS_COLUMNS);
}

/** "SAVED 14:32" for a save at `date`, or why it was not. */
export const savedMessage = (ok: boolean, date: Date) =>
  ok
    ? `SAVED ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : 'NOT SAVED';
