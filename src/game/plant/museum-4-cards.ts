import { SCENARIO_WATERS, RESET_WATER, TEMPERATURE } from './museum-4-lab';
import { waterFrom } from '../water/pool-chemistry';
import type { ChallengeCard } from './museum-4-challenge';

/**
 * Hall 4's first set of challenge cards (mission 113, `doc/plans/113/f-solver-and-tests.md`),
 * easiest first: each card's water, swimmers and targets, and its pars and
 * stored solutions as the authoring solver found them
 * (`SOLVE=1 npx vp test run scripts/hall-4-solver.test.ts`), with the
 * briefing and explanation written from those solutions. Pure data.
 */
export const CHALLENGES: readonly ChallengeCard[] = [
  {
    id: 'high-ph',
    title: 'The acid pump failed',
    swimmers: 20,
    problem:
      'The acid pump stopped two days ago. The pH has crept up and the chlorine is working poorly.',
    goal: 'Bring the pH back to 7.2 to 7.6.',
    water: () =>
      waterFrom({
        ...RESET_WATER,
        ph: 7.9,
        alkalinity: 70,
        hardness: 220,
        temperature: TEMPERATURE,
      }),
    targets: ['ph'],
    pars: { journeyman: 2, pro: 3 },
    solutions: {
      journeyman: [{ tank: 'hcl', size: 2 }],
      pro: [
        { tank: 'co2', size: 2 },
        { tank: 'bicarbonate', size: 3 },
      ],
    },
    briefing:
      'The acid pump stopped two days ago, and the pH has crept up to 7.9. At that pH most of the chlorine is the weak hypochlorite ion, so it works poorly. Bring the pH back to 7.2 to 7.6. A Pool Pro also checks the alkalinity, which is a little low.',
    clue: "Every acid lowers the pH, but most acids also eat the alkalinity, the water's buffer, and the buffer here is already thin. One way down leaves the buffer alone.",
    concept: 'buffer',
    explanation:
      'The ideal answer was Medium carbon dioxide, then Large sodium bicarbonate. Carbon dioxide brings the pH down without touching the alkalinity, and the bicarbonate rebuilds the buffer so the pH stays put. A Journeyman stops at the pH; a Pool Pro fixes the buffer too.',
    relaxed: null,
  },
  {
    id: 'low-alkalinity',
    title: 'The pH will not hold',
    swimmers: 20,
    problem: 'Every dose sends the pH swinging. The water has lost its buffer.',
    goal: 'Bring the alkalinity back to 80 to 200 mg/l.',
    water: () =>
      waterFrom({
        ...RESET_WATER,
        ph: 7.3,
        alkalinity: 48,
        hardness: 90,
        temperature: TEMPERATURE,
      }),
    targets: ['ta'],
    pars: { journeyman: 2, pro: 3 },
    solutions: {
      journeyman: [{ tank: 'bicarbonate', size: 4 }],
      pro: [
        { tank: 'bicarbonate', size: 4 },
        { tank: 'calciumChloride', size: 3 },
      ],
    },
    briefing:
      'Every dose sends the pH swinging, because the alkalinity has fallen to 48 mg/l. Bring the alkalinity back to 80 to 200 mg/l. A Pool Pro will notice the water is soft and aggressive as well.',
    clue: "Alkalinity is the water's buffer: it soaks up acid and base so the pH holds still. Raise the buffer, not the pH. Then look at the balance: soft water eats grout even when the pH is right.",
    concept: 'buffer',
    explanation:
      'The ideal answer was Huge sodium bicarbonate and Large calcium chloride. Bicarbonate raises the alkalinity while hardly moving the pH, so the buffer is back; the calcium brings the hardness and the balance index into range, so the water stops eating the grout.',
    relaxed: null,
  },
  {
    id: 'acid-overdose',
    title: 'Stinging eyes',
    swimmers: 0,
    problem:
      'The acid pump stuck on overnight. The pH is far too low and the pool is closed.',
    goal: 'Bring the pH back to 7.2 to 7.6.',
    water: () => ({ ...SCENARIO_WATERS['acid-overdose'], freeChlorine: 0.4 }),
    targets: ['ph'],
    pars: { journeyman: 2, pro: 3 },
    solutions: {
      journeyman: [{ tank: 'bicarbonate', size: 4 }],
      pro: [
        { tank: 'hypo', size: 2 },
        { tank: 'bicarbonate', size: 4 },
      ],
    },
    briefing:
      'The acid pump stuck on overnight. The pH is 6.9, stinging eyes, and the pool is closed. Bring the pH back to 7.2 to 7.6. The acid has eaten into the chlorine and the buffer as well.',
    clue: "The acid ate the alkalinity as well as dropping the pH. Rebuild the buffer and the pH comes up with it. And look at the free chlorine: the night's acid has left it low.",
    concept: 'buffer',
    explanation:
      'The ideal answer was Medium sodium hypochlorite and Huge sodium bicarbonate. The bicarbonate rebuilds the alkalinity the acid ate, and the pH rises with it and holds; the hypochlorite restores the free chlorine. A Journeyman puts the pH right; a Pool Pro makes the water safe to swim in too.',
    relaxed: null,
  },
  {
    id: 'scaling',
    title: 'White crust on the heater',
    swimmers: 20,
    problem:
      'Scale is building on the heater: the water is hard, alkaline and its pH high.',
    goal: 'Bring the balance index back to −0.5 to +0.5.',
    water: () =>
      waterFrom({
        ph: 7.8,
        alkalinity: 190,
        hardness: 420,
        tds: RESET_WATER.tds,
        temperature: TEMPERATURE,
        freeChlorine: 0.4,
        sulphate: RESET_WATER.sulphate,
      }),
    targets: ['lsi'],
    pars: { journeyman: 2, pro: 3 },
    solutions: {
      journeyman: [{ tank: 'hcl', size: 3 }],
      pro: [
        { tank: 'hypo', size: 2 },
        { tank: 'hcl', size: 3 },
      ],
    },
    briefing:
      'Scale is building on the heater. The water is hard, alkaline and its pH 7.8, so its balance index is far above zero: it is laying down calcium. Bring the balance back to −0.5 to +0.5.',
    clue: 'The balance index adds up pH, hardness, alkalinity and temperature. Of those, the pH moves fastest: bring it down and the balance follows. Then check the free chlorine, which has been low all along.',
    concept: 'balance index',
    explanation:
      'The ideal answer was Medium sodium hypochlorite and Large hydrochloric acid. The acid brings the pH and some alkalinity down, which brings the balance index into range so the scaling stops; the hypochlorite restores the free chlorine.',
    relaxed: null,
  },
  {
    id: 'dechlorination',
    title: 'Too much chlorine',
    swimmers: 0,
    problem:
      'The chlorine controller stuck on overnight: 4.7 mg/l of free chlorine. It cannot reopen like this.',
    goal: 'Bring free chlorine back to 1.0 to 2.0 mg/l.',
    water: () => ({ ...SCENARIO_WATERS['dechlorination'], freeChlorine: 4.7 }),
    targets: ['fc'],
    pars: { journeyman: 2, pro: 4 },
    solutions: {
      journeyman: [{ tank: 'thiosulphate', size: 3 }],
      pro: [
        { tank: 'hcl', size: 2 },
        { tank: 'thiosulphate', size: 3 },
        { tank: 'fresh', size: 4 },
      ],
    },
    briefing:
      'The chlorine controller stuck on overnight, and the free chlorine is 4.7 mg/l. Bring the free chlorine back to 1.0 to 2.0 mg/l so the pool can reopen.',
    clue: 'A dechlorinator takes chlorine away fast, but it is a side effect, not the chlorine, that catches people out: the pH rises afterwards. Too little and the pool stays shut; too much and you will need to chlorinate again.',
    concept: 'pH rises',
    explanation:
      'The ideal answer was Large sodium thiosulphate, Medium hydrochloric acid and Huge fresh water. The thiosulphate takes the excess chlorine away; the acid brings down the pH it raised; the fresh water brings back the alkalinity and the balance. A Journeyman reopens the pool; a Pool Pro leaves it balanced.',
    relaxed: null,
  },
  {
    id: 'combined-chlorine',
    title: 'The chlorine smell',
    swimmers: 0,
    problem:
      'The UV failed in a busy week. The hall smells of chlorine and swimmers have red eyes.',
    goal: 'Bring combined chlorine under 1.0 mg/l and under half the free.',
    water: () => {
      const w = SCENARIO_WATERS['combined-chlorine'];
      return {
        ...w,
        alkalinity: 50,
        carbonate: (w.carbonate * 50) / w.alkalinity,
      };
    },
    targets: ['cc'],
    pars: { journeyman: 3, pro: 4 },
    solutions: {
      journeyman: [
        { tank: 'hypo', size: 0 },
        { tank: 'fresh', size: 4 },
      ],
      pro: [
        { tank: 'hypo', size: 0 },
        { tank: 'bicarbonate', size: 4 },
        { tank: 'fresh', size: 4 },
      ],
    },
    briefing:
      'The UV failed in a busy week. The hall smells of chlorine and swimmers have red eyes: that smell is combined chlorine, chloramines, not too much chlorine. Bring combined chlorine under 1.0 mg/l and under half the free.',
    clue: 'Combined chlorine is chlorine already used up on what swimmers brought in. Some of it will not burn off: the cure for what has built up is dilution. Keep a little free chlorine working while you do it.',
    concept: 'dilution',
    explanation:
      'The ideal answer was Tiny sodium hypochlorite, Huge sodium bicarbonate and Huge fresh water. The fresh water dilutes the combined chlorine away, the small top-up of hypochlorite keeps the free chlorine working, and the bicarbonate puts back the alkalinity the busy week used up.',
    relaxed: null,
  },
  {
    id: 'soft-refill',
    title: 'Eating the grout',
    swimmers: 20,
    problem:
      'The pool was refilled from soft mains water. It is aggressive and eating the grout.',
    goal: 'Bring calcium hardness to 100 or more and the balance to −0.5 to +0.5.',
    water: () => SCENARIO_WATERS['low-hardness'],
    targets: ['ch', 'lsi'],
    pars: { journeyman: 3, pro: 4 },
    solutions: {
      journeyman: [
        { tank: 'sodaAsh', size: 3 },
        { tank: 'calciumChloride', size: 4 },
      ],
      pro: [
        { tank: 'bicarbonate', size: 4 },
        { tank: 'calciumChloride', size: 3 },
        { tank: 'fresh', size: 4 },
      ],
    },
    briefing:
      'The pool was refilled from soft mains water. Its calcium hardness is 50 mg/l and it is eating the grout. Bring calcium hardness to 100 or more and the balance to −0.5 to +0.5.',
    clue: 'Aggressive water wants calcium: give it some and it stops taking it from the grout. But the balance index also needs alkalinity, and this water has almost none. Fix the buffer as well as the hardness.',
    concept: 'calcium',
    explanation:
      'The ideal answer was Huge sodium bicarbonate, Large calcium chloride and Huge fresh water. The calcium chloride raises the hardness, the bicarbonate rebuilds the alkalinity, and together they bring the balance index into range; the fresh water evens out the pH and the rest.',
    relaxed: null,
  },
];
