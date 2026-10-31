import type { PoolChemistry } from '../water/pool-chemistry';

/**
 * The Aqualis dosing controller's shared shapes (mission 114,
 * `doc/prompts/114-aqualis-dosing-controller.md`, `doc/plans/114/`): what
 * its three models pass one another. The **sampler** turns the water it is
 * given into readings (`aqualis-sampler.ts`); the **controller** turns
 * readings, settings and the knob into a demand on each dosing system
 * connected to its control ports (`aqualis-controller.ts`); the **advisor**
 * turns readings and settings into Dr Aqualis's diagnosis, advice, Show dose
 * amounts and alarms (`aqualis-advisor.ts`); the display model binds them
 * into the cabinet's screens. The test rig (`aqualis-rig.ts`) is an ideal
 * pool and loop for them to be proved on. Pure: types and constants only.
 */

// ---- Readings -------------------------------------------------------------------

/** Everything the analyser reads (deliberately all of it, the brief's stated exception to no-peeking). */
export interface AqualisReadings {
  /** Free chlorine, mg/l as Cl₂. */
  freeChlorine: number;
  /** Combined chlorine (DPD 3 − DPD 1), mg/l as Cl₂. */
  combinedChlorine: number;
  /** Total chlorine, mg/l as Cl₂. */
  totalChlorine: number;
  ph: number;
  /** Total alkalinity, mg/l as CaCO₃. */
  alkalinity: number;
  /** Calcium hardness, mg/l as CaCO₃. */
  calciumHardness: number;
  /** The Langelier saturation index: below zero aggressive, above it scaling. */
  lsi: number;
  /** Total dissolved solids, mg/l. */
  tds: number;
  /** Sulphate, mg/l as SO₄. */
  sulphate: number;
  /** °C. */
  temperature: number;
}

export type ReadingId = keyof AqualisReadings;

export const READING_IDS: readonly ReadingId[] = [
  'freeChlorine',
  'combinedChlorine',
  'totalChlorine',
  'ph',
  'alkalinity',
  'calciumHardness',
  'lsi',
  'tds',
  'sulphate',
  'temperature',
];

/** Each reading's name on the screens and its unit ('' for none). */
export const READING_LABELS: Record<ReadingId, { name: string; unit: string }> =
  {
    freeChlorine: { name: 'Free chlorine', unit: 'mg/l' },
    combinedChlorine: { name: 'Combined chlorine', unit: 'mg/l' },
    totalChlorine: { name: 'Total chlorine', unit: 'mg/l' },
    ph: { name: 'pH', unit: '' },
    alkalinity: { name: 'Alkalinity', unit: 'mg/l' },
    calciumHardness: { name: 'Calcium hardness', unit: 'mg/l' },
    lsi: { name: 'Balance (LSI)', unit: '' },
    tds: { name: 'TDS', unit: 'mg/l' },
    sulphate: { name: 'Sulphate', unit: 'mg/l' },
    temperature: { name: 'Temperature', unit: '°C' },
  };

/** What the sampler is given: the water at its tapping, and how fast the sample flows. */
export interface SampleInput {
  water: PoolChemistry;
  /** °C. */
  temperature: number;
  /** Sample flow through its cell, l/h. */
  flowLh: number;
}

/** The sample's health, for the controller's inhibit and the alarms. */
export interface SampleStatus {
  /** Sample flow at least its switch's setting. */
  flowing: boolean;
  flowLh: number;
  /** Seconds the flow has been lost (0 while flowing). */
  lostFor: number;
}

// ---- Settings: what the node holds and the settings screen edits --------------------

/** A reading's target: its set point and the band it is held in. */
export interface Target {
  set: number;
  low: number;
  high: number;
}

/** What the operator enters on the Pool dynamics tab. */
export interface PoolDynamics {
  /** Water in circulation, pool plus balance tank, m³. */
  volumeM3: number;
  /** Average filtration (circulation) rate, m³/h. */
  flowM3h: number;
}

/** The cabinet's settings: its node's parameters, edited on its settings screen. */
export interface AqualisSettings {
  dynamics: PoolDynamics;
  /** Temperature has no target of its own; it is read for the balance. */
  targets: Record<Exclude<ReadingId, 'temperature'>, Target>;
}

/**
 * The default targets. Free chlorine and pH after PWTAG, at the set points
 * the world's controller is already tuned to (`water-treatment.ts`
 * `CONTROLLER`: 1.3 mg/l, pH 7.3); the rest after Hall 4's bands
 * (`museum-4-challenge.ts` `BANDS`), all editable.
 */
export const DEFAULT_TARGETS: AqualisSettings['targets'] = {
  freeChlorine: { set: 1.3, low: 1.0, high: 1.5 },
  combinedChlorine: { set: 0, low: 0, high: 0.5 },
  totalChlorine: { set: 1.5, low: 1.0, high: 2.0 },
  ph: { set: 7.3, low: 7.2, high: 7.4 },
  alkalinity: { set: 120, low: 80, high: 200 },
  calciumHardness: { set: 250, low: 100, high: 1000 },
  lsi: { set: 0, low: -0.5, high: 0.5 },
  tds: { set: 1000, low: 0, high: 1500 },
  sulphate: { set: 100, low: 0, high: 360 },
};

// ---- The knob and the channels ----------------------------------------------------

/** The cabinet's HAND · OFF · AUTO knob (a local control). */
export type Selector = 'hand' | 'off' | 'auto';

/** Its three automatic control channels. */
export type ChannelId = 'hypochlorite' | 'acid' | 'co2';
export const CHANNEL_IDS: readonly ChannelId[] = [
  'hypochlorite',
  'acid',
  'co2',
];

/**
 * Each channel's chemical and the unit its rate is given in: hypochlorite
 * and hydrochloric acid as litres an hour of their solutions (14 %, about
 * 140 g/l available chlorine; 10 %, about 104.8 g/l HCl:
 * `water-treatment.ts` `STRENGTH`), CO₂ as grams an hour of gas.
 */
export const CHANNELS: Record<
  ChannelId,
  {
    name: string;
    device: 'pump' | 'valve';
    unit: 'l/h' | 'g/h';
    gramsPerUnit: number;
  }
> = {
  hypochlorite: {
    name: 'Sodium hypochlorite',
    device: 'pump',
    unit: 'l/h',
    gramsPerUnit: 140,
  },
  acid: {
    name: 'Hydrochloric acid',
    device: 'pump',
    unit: 'l/h',
    gramsPerUnit: 104.8,
  },
  co2: { name: 'CO₂', device: 'valve', unit: 'g/h', gramsPerUnit: 1 },
};

/**
 * What a dosing system tells the controller back through its control port:
 * a pump's or the CO₂ valve controller's own state. A port with nothing
 * connected has no feedback (null).
 */
export interface ChannelFeedback {
  /** Its own selector: taking the controller's demand, run from its own keys, or switched off. */
  mode: 'remote' | 'manual' | 'off';
  powered: boolean;
  /** Stroking, turning, or (the valve) open. */
  running: boolean;
  /** Its error relay: the fault it has stopped for, if any. */
  fault: string | null;
  /** What it delivers now, and the most it can, in its channel's unit. */
  delivering: number;
  most: number;
}

export type ChannelPorts = Record<ChannelId, ChannelFeedback | null>;

/** Why a connected channel is not taking the controller's demand. */
export type OfflineReason =
  | 'switched-off'
  | 'manual'
  | 'no-power'
  | 'fault'
  /** Asked for some time and delivering nothing, with no other reason it can see. */
  | 'not-delivering';

export type ChannelStatus =
  | { kind: 'unconnected' }
  | { kind: 'online' }
  | { kind: 'offline'; reason: OfflineReason; fault: string | null };

/** One channel as the pump status screen shows it. */
export interface ChannelView {
  id: ChannelId;
  status: ChannelStatus;
  /** What the controller asks of it, 0 to 1, and as a rate in its unit (kept while it is offline). */
  demand: number;
  demandRate: number;
  /** What it reports delivering, in its unit (0 when unconnected). */
  delivering: number;
}

/** Why the controller is not dosing at all. */
export type Inhibit =
  | 'selector-off'
  | 'sample-flow-lost'
  /** A First Aid programme's dosing pause holds every output off (`aqualis-first-aid.ts`). */
  | 'first-aid-pause'
  /** No readings yet (just powered up, the sample not settled). */
  | 'no-readings';

// ---- Advice and alarms -----------------------------------------------------------------

/** Every additive the advice can name: the three automatic ones and those dosed by hand. */
export type Additive =
  | 'hypochlorite'
  | 'acid'
  | 'co2'
  | 'bicarbonate'
  | 'sodaAsh'
  | 'calciumChloride'
  | 'thiosulphate'
  | 'dilution'
  /** Superchlorination (breakpoint) to clear combined chlorine. */
  | 'superchlorinate';

/** Where an additive goes: dosed by the controller, or by hand into the balance tank or the pool. */
export type Where = 'automatic' | 'balance-tank' | 'pool';

/** A Show dose amount, in the additive's own unit. */
export interface DoseAmount {
  amount: number;
  unit: 'kg' | 'g' | 'l' | 'm³';
  /** Its words, ready to show ("12.5 kg of sodium bicarbonate"). */
  text: string;
}

/** Dr Aqualis's moods: his animations. */
export type Mood = 'idle' | 'concerned' | 'alarmed' | 'pleased' | 'pointing';

export type Severity = 'info' | 'warning' | 'alarm';

/** One piece of Dr Aqualis's advice: what is wrong and what puts it right, not how much (Show dose has that). */
export interface Advice {
  /** Stable id, for the display to keep its place ("alkalinity-low"). */
  id: string;
  /** The reading it is about, which he points at; null for advice about the cabinet itself. */
  reading: ReadingId | null;
  severity: Severity;
  /** What is wrong, with the number ("Alkalinity low (62 mg/l): the pH will be unstable."). */
  problem: string;
  /** What puts it right, with no amount ("Raise the alkalinity with sodium bicarbonate."). */
  direction: string;
  additive: Additive | null;
  where: Where | null;
  /** The exact amount, for Show dose; null where none can be given. */
  dose: DoseAmount | null;
  mood: Mood;
}

/** The cabinet's alarms, to its annunciator and the mimic (each window on or off for now). */
export type AlarmId =
  | 'chlorine-low'
  | 'chlorine-high'
  | 'ph-low'
  | 'ph-high'
  | 'combined-high'
  | 'balance-aggressive'
  | 'balance-scaling'
  | 'sample-flow-low'
  | 'dosing-offline'
  /** The watchdog's: the computer stopped answering (`aqualis-os.ts`). */
  | 'controller-fault';

export interface Alarm {
  id: AlarmId;
  /** The annunciator window's words. */
  text: string;
}

// ---- The screen ----------------------------------------------------------------------

/** The upper section's 12-inch touch screen, px: 640 × 480, the period's 4:3 panel (the owner, 2026-10-31). */
export const SCREEN = { w: 640, h: 480 } as const;
