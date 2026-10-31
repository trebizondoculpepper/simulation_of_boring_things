import { DEFAULT_TARGETS } from '../../../../game/plant/aqualis-types';
import type {
  Advice,
  AqualisReadings,
  ChannelId,
  ChannelView,
  Mood,
  ReadingId,
} from '../../../../game/plant/aqualis-types';

/**
 * The Dr Aqualis Trio's demo mode (mission 114; the owner, 2026-10-31): a
 * button on its settings screen sets it showing off, as a maker proud of
 * its early-2000s interface would have it at a trade show: it steps
 * through its pages quickly, Dr Aqualis saying something different on
 * each, for `DEMO_SECONDS`, then goes back to its normal cycle. A touch
 * ends it sooner. Only the screen is a show: the controller goes on
 * regulating underneath with the real readings. Pure.
 */

/** How long the demonstration runs, and each scene, s. */
export const DEMO_SECONDS = 300;
export const DEMO_SCENE_SECONDS = 7;

export type DemoPage = 'pumps' | 'water' | 'doctor' | 'settings';

/** One scene: the page it shows, and what is on it. */
export interface DemoScene {
  page: DemoPage;
  /** Dr Aqualis's words and mood (his page). */
  say?: { mood: Mood; problem: string; direction: string; dose?: string };
  /** The readings it shows off (the water page), from the defaults' set points. */
  readings?: Partial<AqualisReadings>;
  /** Each channel's demand, 0 to 1 (the pump page). */
  demands?: Record<ChannelId, number>;
  /** The settings tab and target row it shows. */
  tab?: 'dynamics' | 'targets';
  row?: number;
}

/** The script, played round and round for the demonstration's length. */
export const DEMO_SCRIPT: readonly DemoScene[] = [
  {
    page: 'doctor',
    say: {
      mood: 'pleased',
      problem: 'Welcome to the Dr Aqualis Trio!',
      direction:
        "I'm Dr Aqualis, your pool water's personal physician. Allow me to show you around.",
    },
  },
  {
    page: 'pumps',
    demands: { hypochlorite: 0.45, acid: 0.3, co2: 0.6 },
  },
  {
    page: 'doctor',
    say: {
      mood: 'pointing',
      problem: 'Three channels, regulated around the clock.',
      direction:
        'Sodium hypochlorite, hydrochloric acid and CO₂, each dosed exactly as your water needs. Automagically!',
    },
  },
  {
    page: 'water',
    readings: {},
  },
  {
    page: 'doctor',
    say: {
      mood: 'pointing',
      problem: 'Ten readings, analysed continuously.',
      direction:
        'Free, combined and total chlorine, pH, alkalinity, hardness, balance, dissolved solids, sulphate and temperature.',
    },
  },
  {
    page: 'doctor',
    say: {
      mood: 'concerned',
      problem: 'Alkalinity low (62 mg/l): the pH will be unstable.',
      direction: 'Raise the alkalinity with sodium bicarbonate.',
      dose: '17.8 kg of sodium bicarbonate',
    },
  },
  {
    page: 'water',
    readings: { alkalinity: 62, lsi: -0.62, ph: 7.18 },
  },
  {
    page: 'doctor',
    say: {
      mood: 'alarmed',
      problem: 'Combined chlorine high (1.2 mg/l)!',
      direction:
        'Not on my watch. I will tell you exactly how to superchlorinate it away.',
    },
  },
  {
    page: 'pumps',
    demands: { hypochlorite: 1, acid: 0.15, co2: 0.2 },
  },
  {
    page: 'settings',
    tab: 'dynamics',
  },
  {
    page: 'doctor',
    say: {
      mood: 'idle',
      problem: 'Twelve inches of full-colour TFT.',
      direction:
        '262,144 colours, a touch screen and glossy buttons. The future of water care is here today.',
    },
  },
  {
    page: 'settings',
    tab: 'targets',
    row: 3,
  },
  {
    page: 'doctor',
    say: {
      mood: 'pointing',
      problem: 'Every target is yours to set.',
      direction:
        'Set points and limits for every reading, to suit your pool and your bathers.',
    },
  },
  {
    page: 'pumps',
    demands: { hypochlorite: 0.25, acid: 0.55, co2: 0.9 },
  },
  {
    page: 'doctor',
    say: {
      mood: 'pleased',
      problem: 'Splendid! Every reading is in its band.',
      direction:
        'Dr Aqualis Trio, Duo and Consultant. Ask your Aqualis Interactive dealer today.',
    },
  },
];

/** The scene `t` seconds into the demonstration, and its number (for the key). */
export function demoScene(t: number): { scene: DemoScene; index: number } {
  const n = Math.floor(Math.max(0, t) / DEMO_SCENE_SECONDS);
  const index = n % DEMO_SCRIPT.length;
  return { scene: DEMO_SCRIPT[index], index: n };
}

/** The readings a scene shows: the default set points, with its own changes. */
export function demoReadings(scene: DemoScene): AqualisReadings {
  const set = (id: Exclude<ReadingId, 'temperature'>) =>
    DEFAULT_TARGETS[id].set;
  return {
    freeChlorine: set('freeChlorine'),
    combinedChlorine: 0.2,
    totalChlorine: set('freeChlorine') + 0.2,
    ph: set('ph'),
    alkalinity: set('alkalinity'),
    calciumHardness: set('calciumHardness'),
    lsi: 0.05,
    tds: 850,
    sulphate: 90,
    temperature: 28,
    ...scene.readings,
  };
}

/** A scene's channels: every one online, at its demand (most 2 l/h, 3 l/h and 300 g/h). */
export function demoChannels(scene: DemoScene): Record<ChannelId, ChannelView> {
  const most: Record<ChannelId, number> = {
    hypochlorite: 2,
    acid: 3,
    co2: 300,
  };
  const d = scene.demands ?? { hypochlorite: 0.3, acid: 0.2, co2: 0.4 };
  const view = (id: ChannelId): ChannelView => ({
    id,
    status: { kind: 'online' },
    demand: d[id],
    demandRate: d[id] * most[id],
    delivering: d[id] * most[id],
  });
  return {
    hypochlorite: view('hypochlorite'),
    acid: view('acid'),
    co2: view('co2'),
  };
}

/** A scene's words as Dr Aqualis's advice. */
export function demoAdvice(scene: DemoScene): Advice[] {
  if (!scene.say) return [];
  const s = scene.say;
  return [
    {
      id: `demo:${s.problem}`,
      reading: null,
      severity: s.mood === 'alarmed' ? 'alarm' : 'info',
      problem: s.problem,
      direction: s.direction,
      additive: null,
      where: null,
      dose: s.dose ? { amount: 0, unit: 'kg', text: s.dose } : null,
      mood: s.mood,
    },
  ];
}
