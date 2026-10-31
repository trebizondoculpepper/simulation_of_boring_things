import type {
  Advice,
  AqualisReadings,
  AqualisSettings,
  Target,
} from './aqualis-types';

/**
 * The Dr Aqualis Trio's First Aid programmes (mission 114; the owner,
 * 2026-10-31): breaks from its normal program, started from its First Aid
 * page and ended by their own rule or by hand, the normal settings coming
 * back after. Pure.
 *
 * - **Formed stool** (and vomit): free chlorine raised to 2 mg/l with pH at
 *   most 7.5, held there 30 minutes, the pool closed (CDC's 2 mg/l for 25
 *   minutes, rounded up; PWTAG's "top of the range").
 * - **Diarrhoea** (the Cryptosporidium risk): free chlorine raised to 20
 *   mg/l, pH at most 7.5, held 12¾ hours, the pool closed (CDC's
 *   hyperchlorination, 15,300 mg·min/l). Then the chlorine must come down
 *   again before anyone swims: Bring chlorine down.
 * - **Breakpoint** (shock): free chlorine raised to ten times the combined
 *   chlorine as it was at the start (at least its normal set point), until
 *   the combined chlorine is down to 0.2 mg/l, or eight hours.
 * - **Bring chlorine down**: no hypochlorite until free chlorine is back
 *   under its normal high limit; a hand dose of thiosulphate (Show dose)
 *   brings it down faster.
 * - **Dosing pause**: every output held off for 30 minutes, for a backwash
 *   or a probe's calibration, then dosing resumes.
 *
 * A raising programme's timer runs only once free chlorine has reached its
 * target (`holding`), as contact times are counted.
 */

export type FirstAidId =
  | 'formed-stool'
  | 'diarrhoea'
  | 'breakpoint'
  | 'chlorine-down'
  | 'dosing-pause';

export const FIRST_AID_IDS: readonly FirstAidId[] = [
  'formed-stool',
  'diarrhoea',
  'breakpoint',
  'chlorine-down',
  'dosing-pause',
];

export interface FirstAidProgramme {
  id: FirstAidId;
  name: string;
  /** What it is for, on its button. */
  use: string;
  /** Dr Aqualis's words when it starts. */
  says: string;
  /** The pool must be closed while it runs. */
  closePool: boolean;
}

export const FIRST_AID: Record<FirstAidId, FirstAidProgramme> = {
  'formed-stool': {
    id: 'formed-stool',
    name: 'Formed stool',
    use: 'A formed faecal incident, or vomit',
    says: 'Close the pool, please. I shall raise the chlorine to 2 mg/l and hold it there for half an hour.',
    closePool: true,
  },
  diarrhoea: {
    id: 'diarrhoea',
    name: 'Diarrhoea',
    use: 'A diarrhoeal incident: the Cryptosporidium risk',
    says: 'Close the pool at once. I shall hyperchlorinate to 20 mg/l and hold it for nearly thirteen hours; then we must bring it down again.',
    closePool: true,
  },
  breakpoint: {
    id: 'breakpoint',
    name: 'Breakpoint shock',
    use: 'Burn off combined chlorine',
    says: 'A good shock is just what the doctor ordered: ten times the combined chlorine, until the chloramines are gone.',
    closePool: true,
  },
  'chlorine-down': {
    id: 'chlorine-down',
    name: 'Bring chlorine down',
    use: 'After an overdose or a hyperchlorination',
    says: 'No more hypochlorite until the chlorine is back in its band. Sodium thiosulphate will hurry it along.',
    closePool: true,
  },
  'dosing-pause': {
    id: 'dosing-pause',
    name: 'Dosing pause',
    use: 'A backwash, or a probe being calibrated',
    says: 'Very well: I shall dose nothing for half an hour, then carry on as before.',
    closePool: false,
  },
};

/** Its rules' numbers. */
export const FIRST_AID_RULES = {
  formed: { chlorine: 2, hold: 30 * 60 },
  diarrhoea: { chlorine: 20, hold: 12.75 * 3600 },
  /** pH held at most this while chlorine is raised (chlorine's bite falls above it). */
  phMost: 7.5,
  breakpoint: { times: 10, done: 0.2, most: 8 * 3600 },
  pause: 30 * 60,
} as const;

/** A programme running: its id, its phase, how long it has held, and what it fixed at its start. */
export interface FirstAidState {
  id: FirstAidId;
  /** Raising towards its target, or holding it (its timer running). */
  phase: 'raising' | 'holding';
  /** Seconds since it started, and since it reached its target. */
  elapsed: number;
  held: number;
  /** The breakpoint's chlorine target, fixed at its start. */
  target: number | null;
}

/** A programme started on the water as it reads now. */
export function startFirstAid(
  id: FirstAidId,
  readings: AqualisReadings | null,
  settings: AqualisSettings,
): FirstAidState {
  const target =
    id === 'breakpoint'
      ? Math.max(
          settings.targets.freeChlorine.set,
          FIRST_AID_RULES.breakpoint.times * (readings?.combinedChlorine ?? 0),
        )
      : null;
  return {
    id,
    phase: id === 'formed-stool' || id === 'diarrhoea' ? 'raising' : 'holding',
    elapsed: 0,
    held: 0,
    target,
  };
}

/** The chlorine a raising programme aims at, or null. */
export function firstAidChlorine(s: FirstAidState): number | null {
  if (s.id === 'formed-stool') return FIRST_AID_RULES.formed.chlorine;
  if (s.id === 'diarrhoea') return FIRST_AID_RULES.diarrhoea.chlorine;
  if (s.id === 'breakpoint') return s.target;
  return null;
}

/** The settings the controller and advisor work to while it runs. */
export function firstAidSettings(
  s: FirstAidState | null,
  settings: AqualisSettings,
): AqualisSettings {
  if (!s) return settings;
  const chlorine = firstAidChlorine(s);
  if (chlorine === null) return settings;
  const t = settings.targets;
  const fc: Target = { set: chlorine, low: chlorine, high: chlorine * 1.25 };
  const ph: Target = {
    set: Math.min(t.ph.set, FIRST_AID_RULES.phMost - 0.15),
    low: t.ph.low,
    high: Math.min(t.ph.high, FIRST_AID_RULES.phMost),
  };
  return {
    ...settings,
    targets: {
      ...t,
      freeChlorine: fc,
      totalChlorine: {
        ...t.totalChlorine,
        high: fc.high + t.combinedChlorine.high,
      },
      ph,
    },
  };
}

/** Whether it holds every output off. */
export const firstAidHolds = (s: FirstAidState | null) =>
  s?.id === 'dosing-pause';

/** Whether it forbids hypochlorite. */
export const firstAidNoHypochlorite = (s: FirstAidState | null) =>
  s?.id === 'chlorine-down';

/** The hold its timer counts, s, or null if it ends on the water, not the clock. */
export function firstAidHold(s: FirstAidState): number | null {
  if (s.id === 'formed-stool') return FIRST_AID_RULES.formed.hold;
  if (s.id === 'diarrhoea') return FIRST_AID_RULES.diarrhoea.hold;
  if (s.id === 'dosing-pause') return FIRST_AID_RULES.pause;
  return null;
}

/**
 * The programme `dt` seconds on, given the water: null when it has ended
 * (its hold done, its water put right, or the breakpoint's time run out).
 */
export function stepFirstAid(
  s: FirstAidState,
  readings: AqualisReadings | null,
  settings: AqualisSettings,
  dt: number,
): FirstAidState | null {
  const elapsed = s.elapsed + dt;
  let { phase, held } = s;
  const chlorine = firstAidChlorine(s);
  if (phase === 'raising') {
    if (
      readings &&
      chlorine !== null &&
      readings.freeChlorine >= chlorine * 0.97
    )
      phase = 'holding';
  } else held += dt;
  const hold = firstAidHold(s);
  if (hold !== null && held >= hold) return null;
  if (s.id === 'breakpoint') {
    if (elapsed >= FIRST_AID_RULES.breakpoint.most) return null;
    if (
      readings &&
      readings.combinedChlorine <= FIRST_AID_RULES.breakpoint.done
    )
      return null;
  }
  if (
    s.id === 'chlorine-down' &&
    readings &&
    readings.freeChlorine <= settings.targets.freeChlorine.high
  )
    return null;
  return { ...s, phase, elapsed, held };
}

/** Its status in words, for the screen's banner: "Diarrhoea · holding 20 mg/l · 12 h 05 min left". */
export function firstAidStatus(s: FirstAidState): string {
  const p = FIRST_AID[s.id];
  const chlorine = firstAidChlorine(s);
  const hold = firstAidHold(s);
  const time = (secs: number) => {
    const m = Math.max(0, Math.ceil(secs / 60));
    return m >= 60
      ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
      : `${m} min`;
  };
  if (s.id === 'dosing-pause')
    return `${p.name} · dosing held · ${time(FIRST_AID_RULES.pause - s.held)} left`;
  if (s.id === 'chlorine-down') return `${p.name} · no hypochlorite`;
  if (s.id === 'breakpoint')
    return `${p.name} · ${chlorine!.toFixed(1)} mg/l until combined ≤ ${FIRST_AID_RULES.breakpoint.done}`;
  return s.phase === 'raising'
    ? `${p.name} · raising chlorine to ${chlorine} mg/l`
    : `${p.name} · holding ${chlorine} mg/l · ${time(hold! - s.held)} left`;
}

// ---- Dr Aqualis's words about First Aid ------------------------------------------------

/** A faecal incident reported at the poolside (dev58's incident scenarios). */
export type Incident = 'formed' | 'diarrhoea';

/** The programme each incident wants. */
export const INCIDENT_PROGRAMME: Record<Incident, FirstAidId> = {
  formed: 'formed-stool',
  diarrhoea: 'diarrhoea',
};

/** A programme that has just ended, and the combined chlorine as it did (the breakpoint's verdict). */
export interface FirstAidEnded {
  id: FirstAidId;
  combinedChlorine: number | null;
}

/** The incident report, first until its programme is started. */
export function incidentAdvice(incident: Incident): Advice {
  const p = FIRST_AID[INCIDENT_PROGRAMME[incident]];
  return {
    id: 'incident',
    reading: null,
    severity: 'alarm',
    problem:
      incident === 'diarrhoea'
        ? 'A diarrhoeal faecal incident has been reported!'
        : 'A formed faecal incident has been reported!',
    direction: `Close the pool and start First Aid › ${p.name}.`,
    additive: null,
    where: null,
    dose: null,
    mood: 'alarmed',
  };
}

/** A programme running: its status, and whether the pool stays shut. */
export function runningAdvice(s: FirstAidState): Advice {
  const p = FIRST_AID[s.id];
  return {
    id: 'first-aid',
    reading: null,
    severity: 'warning',
    problem: `First Aid: ${firstAidStatus(s)}.`,
    direction: p.closePool
      ? 'Keep the pool closed.'
      : 'The pool may stay open; dosing resumes on its own.',
    additive: null,
    where: null,
    dose: null,
    mood: 'concerned',
  };
}

/** What he says as a programme ends. */
export function endedAdvice(e: FirstAidEnded): Advice {
  const shocked =
    e.combinedChlorine !== null &&
    e.combinedChlorine <= FIRST_AID_RULES.breakpoint.done;
  const words: Record<FirstAidId, [string, string]> = {
    'formed-stool': [
      'Disinfection complete: 2 mg/l held for half an hour.',
      'The pool may reopen once the readings are back in their bands.',
    ],
    diarrhoea: [
      'Hyperchlorination complete. Now we must bring the chlorine down before anyone swims.',
      'Start First Aid › Bring chlorine down.',
    ],
    breakpoint: shocked
      ? [
          'Breakpoint reached: the chloramines are gone.',
          'Let the chlorine fall back to its band before the pool reopens.',
        ]
      : [
          'The shock has run its eight hours and the chloramines are still there.',
          'Dilute the pool with fresh water, or shock it again.',
        ],
    'chlorine-down': [
      'The chlorine is back in its band: hypochlorite dosing resumes.',
      'The pool may reopen.',
    ],
    'dosing-pause': [
      'The pause is over: I am dosing again.',
      'Carry on just as you are.',
    ],
  };
  const [problem, direction] = words[e.id];
  return {
    id: 'first-aid-ended',
    reading: null,
    severity: 'info',
    problem,
    direction,
    additive: null,
    where: null,
    dose: null,
    mood: 'pleased',
  };
}

/** The programme an advice points at, with none running. */
function pointerOf(a: Advice): FirstAidId | null {
  if (a.id === 'combined-chlorine-high') return 'breakpoint';
  // Far too high: the thiosulphate advice.
  if (a.id === 'free-chlorine-high' && a.additive === 'thiosulphate')
    return 'chlorine-down';
  return null;
}

/**
 * Dr Aqualis's advice with First Aid's in it: an incident report first
 * (until its programme starts), then a running programme's status (or a
 * word on one just ended), then the advisor's own. With none running, a
 * combined chlorine high points at Breakpoint shock and a chlorine far too
 * high (the thiosulphate advice) at Bring chlorine down; an incident
 * silences "every reading in its band".
 */
export function withFirstAid(
  advice: readonly Advice[],
  f: {
    state: FirstAidState | null;
    incident: Incident | null;
    ended: FirstAidEnded | null;
  },
): Advice[] {
  const head: Advice[] = [];
  if (f.incident) head.push(incidentAdvice(f.incident));
  if (f.state) head.push(runningAdvice(f.state));
  else if (f.ended) head.push(endedAdvice(f.ended));
  const rest = advice
    .filter((a) => !(f.incident && a.id === 'all-well'))
    .map((a) => {
      const to = f.state ? null : pointerOf(a);
      return to
        ? {
            ...a,
            direction: `${a.direction} Or start First Aid › ${FIRST_AID[to].name}.`,
          }
        : a;
    });
  return [...head, ...rest];
}
