import type { ChannelId, Selector } from '../../../../game/plant/aqualis-types';
import { SCREEN } from '../../../../game/plant/aqualis-types';
import type { Rect } from '../../../../ui2d/geometry';
import { DOCTOR } from './aqualis-display';

/**
 * The Aqualis cabinet's form (mission 114, `doc/plans/114/`): an early-2000s
 * floor-standing water-quality controller, white, in two sections. Pure
 * layout: its sizes, where its screen and knob sit, and its ports in its own
 * frame (metres, its origin on the floor at the middle of its back, facing
 * +z), for the view to build and the plumber to route to.
 */

export const CABINET = {
  w: 0.6,
  h: 1.8,
  d: 0.3,
  /** The plinth under it, m. */
  plinth: 0.08,
  /** Where the lower (wet) section meets the upper (control) section, m from the floor. */
  split: 0.98,
  /** The rounded top cap's height, m. */
  cap: 0.06,
  /** The door's thickness, standing proud of the carcass. */
  door: 0.022,
} as const;

/**
 * The 12-inch 4:3 panel's active area, m (244 × 183 mm), and its bezel's
 * margin (the owner, 2026-10-31). Its pixels are `SCREEN`'s, whatever they are.
 */
export const SCREEN_AREA = { w: 0.244, h: 0.183, bezel: 0.024 } as const;

/** The screen's pixels for each metre of its active area, across. */
export const SCREEN_PX_PER_M = SCREEN.w / SCREEN_AREA.w;

/** The screen's middle, on the upper door's face. */
export const SCREEN_AT = { x: 0, y: 1.475 } as const;

/** The HAND · OFF · AUTO knob's middle, below the screen. */
export const KNOB_AT = { x: -0.15, y: 1.18 } as const;

/** The status lamps, right of the knob: label and where. */
export const LEDS = [
  { id: 'power', label: 'POWER', colour: '#3ddc5a', x: 0.06, y: 1.21 },
  { id: 'dosing', label: 'DOSING', colour: '#ffb21c', x: 0.14, y: 1.21 },
  { id: 'alarm', label: 'ALARM', colour: '#ff3b2f', x: 0.22, y: 1.21 },
] as const;

export type LedId = (typeof LEDS)[number]['id'];
export type LedState = Partial<Record<LedId, boolean | number>>;

/** The knob's positions, left to right, as engraved. */
export const SELECTOR_ORDER: readonly Selector[] = ['hand', 'off', 'auto'];

export const selectorIndex = (s: Selector) => SELECTOR_ORDER.indexOf(s);
export const selectorAt = (i: number): Selector =>
  SELECTOR_ORDER[Math.max(0, Math.min(SELECTOR_ORDER.length - 1, i))];

/** The knob turned a detent (-1 left, +1 right), stopping at its ends. */
export function turnSelector(s: Selector, direction: number): Selector {
  return selectorAt(selectorIndex(s) + Math.sign(direction || 1));
}

/** A port: where it leaves the cabinet, in its frame, and which way it points. */
export interface CabinetPort {
  at: readonly [number, number, number];
  /** Unit direction out of the cabinet. */
  out: readonly [number, number, number];
}

export type PortId = 'sampleIn' | 'sampleOut' | ChannelId | 'alarm';

/**
 * Its ports: the sample inlet and outlet out of the lower section's left
 * side near the floor, and the cable glands on top for the three control
 * ports and the alarm output to the annunciator.
 */
export const PORTS: Record<PortId, CabinetPort> = {
  sampleIn: { at: [-CABINET.w / 2, 0.2, 0.1], out: [-1, 0, 0] },
  sampleOut: { at: [-CABINET.w / 2, 0.12, 0.1], out: [-1, 0, 0] },
  hypochlorite: { at: [-0.18, CABINET.h, 0.12], out: [0, 1, 0] },
  acid: { at: [-0.08, CABINET.h, 0.12], out: [0, 1, 0] },
  co2: { at: [0.02, CABINET.h, 0.12], out: [0, 1, 0] },
  alarm: { at: [0.16, CABINET.h, 0.12], out: [0, 1, 0] },
};

/** The glands' labels, engraved beside each on the top. */
export const GLAND_LABELS: Record<
  Exclude<PortId, 'sampleIn' | 'sampleOut'>,
  string
> = {
  hypochlorite: 'NaOCl',
  acid: 'HCl',
  co2: 'CO₂',
  alarm: 'ALM',
};

/** A touch's UV on the screen's mesh, as the screen's pixels (y down). */
export function screenPixel(u: number, v: number): readonly [number, number] {
  return [u * SCREEN.w, (1 - v) * SCREEN.h];
}

/** The sample inlet's isolating ball valve, on the inlet pipe just off the cabinet's side. */
export const SAMPLE_VALVE_AT = [-CABINET.w / 2 - 0.09, 0.2, 0.1] as const;

/**
 * The Dr Aqualis series (the owner, 2026-10-31): one cabinet, three models.
 * The Trio regulates all three substances, the Duo acid and hypochlorite
 * only, the Consultant none (water status only); each has the control-port
 * glands for its channels, and every one its alarm output.
 */
export type CabinetModel = 'trio' | 'duo' | 'consultant';

export const CABINET_MODELS: Record<
  CabinetModel,
  { name: string; code: string; channels: readonly ChannelId[] }
> = {
  trio: {
    name: 'Dr Aqualis Trio',
    code: 'AQ-3000',
    channels: ['hypochlorite', 'acid', 'co2'],
  },
  duo: {
    name: 'Dr Aqualis Duo',
    code: 'AQ-2000',
    channels: ['hypochlorite', 'acid'],
  },
  consultant: { name: 'Dr Aqualis Consultant', code: 'AQ-1000', channels: [] },
};

export type GlandId = Exclude<PortId, 'sampleIn' | 'sampleOut'>;

/** A model's glands on top: its channels' control ports, then its alarm output. */
export function glandsOf(model: CabinetModel): readonly GlandId[] {
  return [...CABINET_MODELS[model].channels, 'alarm'];
}

/** A model's ports: the sample pipes and its glands. */
export function portsOf(
  model: CabinetModel,
): Partial<Record<PortId, CabinetPort>> {
  const out: Partial<Record<PortId, CabinetPort>> = {
    sampleIn: PORTS.sampleIn,
    sampleOut: PORTS.sampleOut,
  };
  for (const id of glandsOf(model)) out[id] = PORTS[id];
  return out;
}

/**
 * Dr Aqualis's overlay: a small canvas of its own just in front of the
 * screen over the display's box for him (`DOCTOR.him`), so his 10 Hz frames
 * upload only that box, not the whole screen.
 */
export const OVERLAY: Rect = DOCTOR.him;

/**
 * The overlay canvas's pixels for each of the screen's it covers. At a half
 * his 10 Hz frames upload a quarter of the box's texels, which keeps the
 * cabinet within the component bench's budget; his drawing is in the
 * screen's pixels either way (the context is scaled to suit).
 */
export const OVERLAY_SCALE = 0.5;

/** The overlay canvas's size in its own pixels. */
export const overlayCanvasSize = (scale = OVERLAY_SCALE) => ({
  w: Math.max(1, Math.round(OVERLAY.w * scale)),
  h: Math.max(1, Math.round(OVERLAY.h * scale)),
});

/** A touch's UV on the overlay's mesh, as the screen's pixels it covers. */
export function overlayPixel(u: number, v: number): readonly [number, number] {
  return [OVERLAY.x + u * OVERLAY.w, OVERLAY.y + (1 - v) * OVERLAY.h];
}

/** The developer's Post-it inside the lower door: 76 mm square. */
export const POSTIT = { m: 0.076 } as const;

/** Its words, in the developer's hand. */
export const POSTIT_TEXT = [
  'Note from the developer:',
  'We know a machine like this is pure science fiction. Nothing in a box this size could really measure all of that!',
  'We beg your forgiveness: we just thought it was a fun idea.',
] as const;

/** The lower door's swing when open, rad (about its right-hand hinge). */
export const DOOR_OPEN = 1.9;
