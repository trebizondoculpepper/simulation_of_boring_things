import {
  actOnHall4,
  newHall4,
  readWater,
  stepHall4,
  water,
} from './museum-4-lab';
import type { Hall4Readings, Hall4State, TankId } from './museum-4-lab';
import { doseAmount } from './museum-4-doses';
import type { SizeIndex } from './museum-4-doses';
import type { PoolChemistry } from '../water/pool-chemistry';

/**
 * Hall 4's challenge engine (mission 113, `doc/plans/113/e-challenge-engine.md`):
 * free play or a challenge card, its level, its doses against par, the
 * hour's hold that wins it and the settling time that fails it, at a fixed
 * 1,000×. It wraps the lab's state (`museum-4-lab.ts`) and leaves its
 * chemistry alone. Pure; lab seconds unless named real.
 */

/** Lab seconds to one real second (the owner, 2026-10-31). */
export const SPEED = 1000;
/** Lab seconds the required readings must hold to win. */
export const HOLD = 3600;
/** Lab seconds after the last dose at par for the water to come into range. */
export const SETTLE = 7200;
/** The longest real step taken at once, s, so a stalled frame cannot leap hours. */
export const MAX_REAL_STEP = 0.1;
/** The lab's own step, s. */
export const LAB_SLICE = 10;
/** Free play's swimmers, a steady load (the bench's normal bather factor). */
export const FREE_SWIMMERS = 20;
/** Real seconds a won card's banner (and its explanation) stays before free play returns. */
export const WON_SHOWN = 30;

export type Level = 'journeyman' | 'pro';
export const LEVEL_NAME: Record<Level, string> = {
  journeyman: 'JOURNEYMAN',
  pro: 'POOL PRO',
};

export type ReadingId = 'fc' | 'cc' | 'ph' | 'ta' | 'ch' | 'lsi';

/** The draft target bands of mission 113, to confirm against PWTAG. */
export const BANDS: Record<
  ReadingId,
  { name: string; range: string; ok: (r: Hall4Readings) => boolean }
> = {
  fc: {
    name: 'free chlorine',
    range: '1.0 to 2.0 mg/l',
    ok: (r) => r.fc >= 1.0 && r.fc <= 2.0,
  },
  cc: {
    name: 'combined chlorine',
    range: 'under 1.0 mg/l and at most half the free',
    ok: (r) => r.cc < 1.0 && r.cc <= r.fc / 2,
  },
  ph: {
    name: 'pH',
    range: '7.2 to 7.6',
    ok: (r) => r.ph >= 7.2 && r.ph <= 7.6,
  },
  ta: {
    name: 'alkalinity',
    range: '80 to 200 mg/l',
    ok: (r) => r.ta >= 80 && r.ta <= 200,
  },
  ch: {
    name: 'calcium hardness',
    range: '100 to 1,000 mg/l',
    ok: (r) => r.ch >= 100 && r.ch <= 1000,
  },
  lsi: {
    name: 'balance',
    range: '−0.5 to +0.5',
    ok: (r) => Math.abs(r.lsi) <= 0.5,
  },
};
export const READINGS = Object.keys(BANDS) as ReadingId[];

export interface Dose {
  tank: TankId;
  size: SizeIndex;
}

export interface ChallengeCard {
  id: string;
  title: string;
  swimmers: number;
  /** What is wrong with the water, as the screen says it. */
  problem: string;
  /** The problem to solve, in words. */
  goal: string;
  water(): PoolChemistry;
  /** The readings a Journeyman must bring into band. */
  targets: readonly ReadingId[];
  pars: Record<Level, number>;
  /** The solver's stored solutions (`scripts/hall-4-solver.ts`). */
  solutions: Record<Level, readonly Dose[]>;
  /** Narrated on START: the problem and the chemistry needed, not the answer. */
  briefing: string;
  /** Narrated after a real minute without a win: what makes it hard, no doses given. */
  clue: string;
  /** The chemistry concept the card turns on, which the clue must name. */
  concept: string;
  /** Narrated on a win: the ideal solution and why it works. */
  explanation: string;
  /** How far this card's bands were relaxed and why, or null if not at all. */
  relaxed: string | null;
}

export type NarrationKind = 'briefing' | 'clue' | 'explanation';
/** Real seconds of play without a win or a fail before the clue (the owner, 2026-10-31). */
export const CLUE_AFTER = 60;

export type Outcome = 'playing' | 'won' | 'failed';

export interface Hall4Game {
  lab: Hall4State;
  card: ChallengeCard | null;
  level: Level;
  used: number;
  /** Lab seconds the level's readings came into band, or null. */
  heldSince: number | null;
  lastDose: number;
  outcome: Outcome;
  /** Real seconds since the outcome was reached. */
  shown: number;
  /** Real seconds of this attempt. */
  attempt: number;
  clueGiven: boolean;
  /** The last narration fired; `seq` rises with each, for the host to notice. */
  narration: { kind: NarrationKind; seq: number } | null;
  /** The last dose, for the mimic's lamp: its tank and the real seconds since. */
  lastDosed: { tank: TankId; ago: number } | null;
}

const narrate = (g: Hall4Game, kind: NarrationKind): Hall4Game => ({
  ...g,
  narration: { kind, seq: (g.narration?.seq ?? 0) + 1 },
});

const withSwimmers = (lab: Hall4State, swimmers: number): Hall4State => ({
  ...lab,
  bench: {
    ...lab.bench,
    plant: { ...lab.bench.plant, batherFactor: swimmers / FREE_SWIMMERS },
  },
});

/** Free play from the reset water (first entry, and RESET). */
export function newGame(now = 0): Hall4Game {
  return {
    lab: withSwimmers(newHall4(now), FREE_SWIMMERS),
    card: null,
    level: 'journeyman',
    used: 0,
    heldSince: null,
    lastDose: 0,
    outcome: 'playing',
    shown: 0,
    attempt: 0,
    clueGiven: false,
    narration: null,
    lastDosed: null,
  };
}

export const resetGame = (g: Hall4Game) => newGame(g.lab.start + g.lab.seconds);

/** Back to free play from the water as it is (after a win, or abandoning). */
export const toFreePlay = (g: Hall4Game): Hall4Game => ({
  ...g,
  attempt: 0,
  clueGiven: false,
  lab: withSwimmers(g.lab, FREE_SWIMMERS),
  card: null,
  used: 0,
  heldSince: null,
  outcome: 'playing',
  shown: 0,
});

/** `card` loaded at `level`: its water and swimmers, no doses used. */
export function startCard(
  g: Hall4Game,
  card: ChallengeCard,
  level: Level,
): Hall4Game {
  const lab = withSwimmers(
    {
      ...g.lab,
      bench: { ...g.lab.bench, pool: { ...card.water() }, pending: [] },
      delivering: null,
      active: null,
    },
    card.swimmers,
  );
  return narrate(
    {
      ...g,
      lab,
      card,
      level,
      used: 0,
      heldSince: null,
      lastDose: lab.seconds,
      outcome: 'playing',
      shown: 0,
      attempt: 0,
      clueGiven: false,
      lastDosed: null,
    },
    'briefing',
  );
}

/** The readings a level must bring into band on `card`. */
export const required = (card: ChallengeCard, level: Level) =>
  level === 'pro' ? READINGS : card.targets;

/** The readings out of band, of `ids`. */
export const outOfBand = (
  r: Hall4Readings,
  ids: readonly ReadingId[] = READINGS,
) => ids.filter((id) => !BANDS[id].ok(r));

export const dosesLeft = (g: Hall4Game) =>
  g.card ? Math.max(0, g.card.pars[g.level] - g.used) : Infinity;

/** Whether DOSE would be taken now. */
export const canDose = (g: Hall4Game) =>
  g.outcome === 'playing' && dosesLeft(g) > 0;

/** DOSE: `size` of `tank` in at once (`scale` for the fuzz tests). */
export function doseGame(
  g: Hall4Game,
  tank: TankId,
  size: SizeIndex,
  scale = 1,
): Hall4Game {
  if (!canDose(g)) return g;
  const lab = actOnHall4(g.lab, {
    type: 'dose-now',
    tank,
    amount: doseAmount(tank, size) * scale,
  });
  return {
    ...g,
    lab,
    used: g.used + 1,
    lastDose: lab.seconds,
    lastDosed: { tank, ago: 0 },
  };
}

/** The card's hold and outcome, checked against the water now. */
function judge(g: Hall4Game): Hall4Game {
  if (!g.card || g.outcome !== 'playing') return g;
  const t = g.lab.seconds;
  const ok =
    outOfBand(readWater(water(g.lab)), required(g.card, g.level)).length === 0;
  const heldSince = ok ? (g.heldSince ?? t) : null;
  if (heldSince !== null && t - heldSince >= HOLD)
    return narrate(
      { ...g, heldSince, outcome: 'won', shown: 0 },
      'explanation',
    );
  if (dosesLeft(g) === 0) {
    const since = t - g.lastDose;
    if ((since >= SETTLE && heldSince === null) || since >= SETTLE + HOLD)
      return { ...g, heldSince, outcome: 'failed', shown: 0 };
  }
  return { ...g, heldSince };
}

/** The lab `labSeconds` on, judged every lab step. */
export function stepLab(g: Hall4Game, labSeconds: number): Hall4Game {
  let n = g;
  for (let t = 0; t < labSeconds - 1e-9; t += LAB_SLICE)
    n = judge({
      ...n,
      lab: stepHall4(n.lab, Math.min(LAB_SLICE, labSeconds - t)),
    });
  return n;
}

/** The game `realSeconds` of the visitor's time on, at 1,000×. */
export function stepGame(g: Hall4Game, realSeconds: number): Hall4Game {
  const real = Math.min(MAX_REAL_STEP, Math.max(0, realSeconds));
  let n = stepLab(g, real * SPEED);
  if (n.lastDosed)
    n = { ...n, lastDosed: { ...n.lastDosed, ago: n.lastDosed.ago + real } };
  if (n.card && n.outcome === 'playing') {
    n = { ...n, attempt: n.attempt + real };
    if (!n.clueGiven && n.attempt >= CLUE_AFTER)
      n = narrate({ ...n, clueGiven: true }, 'clue');
  }
  if (n.outcome !== 'playing') {
    n = { ...n, shown: n.shown + real };
    if (n.outcome === 'won' && n.shown >= WON_SHOWN) n = toFreePlay(n);
  }
  return n;
}

/** Lab seconds as "h:mm". */
export const labClock = (s: number) => {
  const m = Math.floor(s / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};

/** Everything the scenario screen shows, from the game. */
export type ScenarioView =
  | { kind: 'free'; swimmers: number }
  | {
      kind: 'challenge' | 'won' | 'failed';
      title: string;
      swimmers: number;
      problem: string;
      goal: string;
      level: Level;
      par: number;
      used: number;
      /** Lab seconds held so far, or null when out of range. */
      held: number | null;
      /** Readings still out of band, by name. */
      out: string[];
    };

export function scenarioView(g: Hall4Game): ScenarioView {
  if (!g.card) return { kind: 'free', swimmers: FREE_SWIMMERS };
  const r = readWater(water(g.lab));
  return {
    kind: g.outcome === 'playing' ? 'challenge' : g.outcome,
    title: g.card.title,
    swimmers: g.card.swimmers,
    problem: g.card.problem,
    goal: g.card.goal,
    level: g.level,
    par: g.card.pars[g.level],
    used: g.used,
    held:
      g.heldSince === null ? null : Math.min(HOLD, g.lab.seconds - g.heldSince),
    out: outOfBand(r, required(g.card, g.level)).map((id) => BANDS[id].name),
  };
}

/** Lab seconds between the doses of a replayed solution (the visitor's thinking time). */
export const REPLAY_GAP = 1200;

/**
 * A stored solution played as the solver plays it: each dose, then
 * `REPLAY_GAP` lab seconds; then on until the card is won or failed.
 * `scales` varies each dose (the fuzz tests). The game at the end.
 */
export function replay(
  card: ChallengeCard,
  level: Level,
  doses: readonly Dose[],
  scales: readonly number[] = [],
): Hall4Game {
  let g = startCard(newGame(), card, level);
  doses.forEach((d, i) => {
    g = stepLab(doseGame(g, d.tank, d.size, scales[i] ?? 1), REPLAY_GAP);
  });
  for (let t = 0; g.outcome === 'playing' && t < SETTLE + HOLD * 2; t += 600)
    g = stepLab(g, 600);
  return g;
}

/** How far a reading is from its band (0 inside), in the reading's own units. */
export function bandDistance(id: ReadingId, r: Hall4Readings): number {
  const below = (v: number, lo: number) => Math.max(0, lo - v);
  const above = (v: number, hi: number) => Math.max(0, v - hi);
  switch (id) {
    case 'fc':
      return below(r.fc, 1) + above(r.fc, 2);
    case 'cc':
      return Math.max(above(r.cc, 0.999), r.cc - r.fc / 2, 0);
    case 'ph':
      return below(r.ph, 7.2) + above(r.ph, 7.6);
    case 'ta':
      return below(r.ta, 80) + above(r.ta, 200);
    case 'ch':
      return below(r.ch, 100) + above(r.ch, 1000);
    case 'lsi':
      return above(Math.abs(r.lsi), 0.5);
  }
}
