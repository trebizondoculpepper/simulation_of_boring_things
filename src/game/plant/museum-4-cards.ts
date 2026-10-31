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
    briefing: {
      journeyman:
        'The acid pump stopped two days ago, and the pH has crept up to 7.9. At that pH most of the chlorine is the weak hypochlorite ion, so it works poorly. As a Journeyman, fix the fault: bring the pH back to 7.2 to 7.6.',
      pro: 'The acid pump stopped two days ago, and the pH has crept up to 7.9. At that pH most of the chlorine is the weak hypochlorite ion, so it works poorly. As a Pool Pro, bring the pH back to 7.2 to 7.6, and restore every other reading too: the alkalinity is a little low.',
    },
    clue: "Every acid lowers the pH, but most acids also eat the alkalinity, the water's buffer, and the buffer here is already thin. One way down leaves the buffer alone.",
    concept: 'buffer',
    explanation: {
      journeyman:
        'Yes: Medium hydrochloric acid worked because the acid brings the pH down into range, so the chlorine works properly again. But a better solution would bring the pH down without eating the alkalinity, and rebuild the buffer, so the pH stays put.',
      pro: 'The best answer was Medium carbon dioxide, then Large sodium bicarbonate. Carbon dioxide brings the pH down without touching the alkalinity, where a mineral acid would eat a buffer that is already low; the bicarbonate then rebuilds that buffer while hardly moving the pH, so the pH stays put.',
    },
    alsoWins: {
      pro: [
        {
          doses: [
            { tank: 'hcl', size: 1 },
            { tank: 'fresh', size: 4 },
          ],
          reason:
            'Fresh mains water dilutes the pH down and brings its own alkalinity, with a little acid: a real, if wasteful, route.',
        },
        {
          doses: [
            { tank: 'co2', size: 3 },
            { tank: 'sodaAsh', size: 4 },
          ],
          reason:
            'Carbon dioxide down, then soda ash rebuilding the alkalinity: a sound buffer route by another alkali.',
        },
      ],
    },
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
    briefing: {
      journeyman:
        'Every dose sends the pH swinging, because the alkalinity has fallen to 48 mg/l. As a Journeyman, fix the fault: bring the alkalinity back to 80 to 200 mg/l.',
      pro: 'Every dose sends the pH swinging, because the alkalinity has fallen to 48 mg/l. As a Pool Pro, bring the alkalinity back to 80 to 200 mg/l, and restore every other reading too: the water is soft, its calcium hardness low and its balance aggressive.',
    },
    clue: "Alkalinity is the water's buffer: it soaks up acid and base so the pH holds still. Raise the buffer, not the pH. Then look at the balance: soft water eats grout even when the pH is right.",
    concept: 'buffer',
    explanation: {
      journeyman:
        'Yes: Huge sodium bicarbonate worked because it raises the alkalinity while hardly moving the pH, so the buffer is back and the pH holds. But a better solution would also raise the hardness, bringing the balance index into range, so the water stops eating the grout.',
      pro: 'The best answer was Huge sodium bicarbonate and Large calcium chloride. Bicarbonate raises the alkalinity while hardly moving the pH, where a stronger alkali would push the pH over; calcium chloride raises the hardness and nothing else, bringing the balance index into range, so the water stops eating the grout.',
    },
    alsoWins: {
      journeyman: [
        {
          doses: [
            { tank: 'sodaAsh', size: 4 },
            { tank: 'sodaAsh', size: 4 },
          ],
          reason:
            'Soda ash raises the alkalinity too, if pushing the pH with it.',
        },
        {
          doses: [
            { tank: 'fresh', size: 4 },
            { tank: 'fresh', size: 4 },
          ],
          reason:
            'Mains water carries its own alkalinity: dilution restores the buffer, at a cost in water.',
        },
        {
          doses: [
            { tank: 'sodaAsh', size: 4 },
            { tank: 'fresh', size: 4 },
          ],
          reason: 'Soda ash and mains water both bring alkalinity.',
        },
      ],
      pro: [
        {
          doses: [
            { tank: 'bicarbonate', size: 3 },
            { tank: 'fresh', size: 4 },
          ],
          reason:
            'Mains water brings hardness as well as alkalinity, so it can stand in for the calcium chloride.',
        },
      ],
    },
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
    briefing: {
      journeyman:
        'The acid pump stuck on overnight. The pH is 6.9, stinging eyes, and the pool is closed. As a Journeyman, fix the fault: bring the pH back to 7.2 to 7.6.',
      pro: 'The acid pump stuck on overnight. The pH is 6.9, stinging eyes, and the pool is closed. As a Pool Pro, bring the pH back to 7.2 to 7.6, and restore every other reading too: the acid has eaten into the free chlorine and the alkalinity as well.',
    },
    clue: "The acid ate the alkalinity as well as dropping the pH. Rebuild the buffer and the pH comes up with it. And look at the free chlorine: the night's acid has left it low.",
    concept: 'buffer',
    explanation: {
      journeyman:
        'Yes: Huge sodium bicarbonate worked because it rebuilds the alkalinity the acid ate, and the pH rises with it and holds. But a better solution would also restore the free chlorine the acid left low, so the water is safe to swim in, not just comfortable.',
      pro: 'The best answer was Medium sodium hypochlorite and Huge sodium bicarbonate. The bicarbonate rebuilds the alkalinity the acid ate, so the pH rises with it and holds, rather than jumping up and drifting back as it would with a stronger alkali; the hypochlorite restores the free chlorine, and being a little alkaline itself it helps the pH along.',
    },
    alsoWins: {
      journeyman: [
        {
          doses: [{ tank: 'hypo', size: 4 }],
          reason:
            'Huge hypochlorite is strongly alkaline and lifts the pH alone; true chemistry, but it superchlorinates the pool (flagged to the owner).',
        },
        {
          doses: [
            { tank: 'hypo', size: 3 },
            { tank: 'sodaAsh', size: 3 },
          ],
          reason: 'Soda ash lifts the pH; the hypochlorite helps.',
        },
        {
          doses: [
            { tank: 'sodaAsh', size: 3 },
            { tank: 'sodaAsh', size: 2 },
          ],
          reason:
            'Soda ash lifts the pH and the alkalinity, in steps or overshot and brought back with acid: a sound if less gentle buffer route.',
        },
        {
          doses: [
            { tank: 'fresh', size: 4 },
            { tank: 'fresh', size: 4 },
          ],
          reason:
            'Mains water dilutes the acid and brings its own alkalinity: dilution, at a cost in water.',
        },
      ],
    },
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
    briefing: {
      journeyman:
        'Scale is building on the heater. The water is hard, alkaline and its pH 7.8, so its balance index is far above zero: it is laying down calcium. As a Journeyman, fix the fault: bring the balance back to −0.5 to +0.5.',
      pro: 'Scale is building on the heater. The water is hard, alkaline and its pH 7.8, so its balance index is far above zero: it is laying down calcium. As a Pool Pro, bring the balance back to −0.5 to +0.5, and restore every other reading too: the free chlorine has been low all along.',
    },
    clue: 'The balance index adds up pH, hardness, alkalinity and temperature. Of those, the pH moves fastest: bring it down and the balance follows. Then check the free chlorine, which has been low all along.',
    concept: 'balance index',
    explanation: {
      journeyman:
        'Yes: Large hydrochloric acid worked because it brings the pH and some alkalinity down, which brings the balance index into range, so the scaling stops. But a better solution would also restore the free chlorine, which has been low all along.',
      pro: 'The best answer was Medium sodium hypochlorite and Large hydrochloric acid. The acid brings down both the pH and some of the alkalinity, the two parts of the balance index that are too high, so the scaling stops, where a gentler acid would leave the alkalinity behind; the hypochlorite restores the free chlorine, and the acid soaks up the little it raises the pH.',
    },
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
    briefing: {
      journeyman:
        'The chlorine controller stuck on overnight, and the free chlorine is 4.7 mg/l. As a Journeyman, fix the fault: bring the free chlorine back to 1.0 to 2.0 mg/l so the pool can reopen.',
      pro: 'The chlorine controller stuck on overnight, and the free chlorine is 4.7 mg/l. As a Pool Pro, bring the free chlorine back to 1.0 to 2.0 mg/l, and restore every other reading too: whatever you use will move the pH, the alkalinity and the balance, and they must all end in range.',
    },
    clue: 'A dechlorinator takes chlorine away fast, but it is a side effect, not the chlorine, that catches people out: the pH rises afterwards. Too little and the pool stays shut; too much and you will need to chlorinate again.',
    concept: 'pH rises',
    explanation: {
      journeyman:
        'Yes: Large sodium thiosulphate worked because it takes the excess chlorine away, so the pool can reopen. But a better solution would also bring down the pH the chlorine raised, and restore the alkalinity and the balance.',
      pro: 'The best answer was Large sodium thiosulphate, Medium hydrochloric acid and Huge fresh water. The thiosulphate takes the excess chlorine away far faster than waiting for it to burn off; the acid brings down the pH the chlorine raised; and the fresh water brings back the alkalinity and the balance, which no single chemical could put right without upsetting something else.',
    },
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
    briefing: {
      journeyman:
        'The UV failed in a busy week. The hall smells of chlorine and swimmers have red eyes: that smell is combined chlorine, chloramines, not too much chlorine. As a Journeyman, fix the fault: bring combined chlorine under 1.0 mg/l and under half the free.',
      pro: 'The UV failed in a busy week. The hall smells of chlorine and swimmers have red eyes: that smell is combined chlorine, chloramines, not too much chlorine. As a Pool Pro, bring combined chlorine under 1.0 mg/l and under half the free, and restore every other reading too: the busy week has used up much of the alkalinity.',
    },
    clue: 'Combined chlorine is chlorine already used up on what swimmers brought in. Some of it will not burn off: the cure for what has built up is dilution. Keep a little free chlorine working while you do it.',
    concept: 'dilution',
    explanation: {
      journeyman:
        'Yes: Tiny sodium hypochlorite and Huge fresh water worked because the fresh water dilutes the combined chlorine away, and the small top-up of hypochlorite keeps the free chlorine working. But a better solution would also put back the alkalinity the busy week used up.',
      pro: 'The best answer was Tiny sodium hypochlorite, Huge sodium bicarbonate and Huge fresh water. Dilution is the sure cure for combined chlorine that has built up, as some of it will not burn off however much chlorine goes in; the small top-up of hypochlorite keeps the free chlorine working without a shock dose; and the bicarbonate puts back the alkalinity the busy week used up.',
    },
    alsoWins: {
      journeyman: [
        {
          doses: [
            { tank: 'hypo', size: 4 },
            { tank: 'hcl', size: 2 },
          ],
          reason:
            'Breakpoint chlorination: a shock dose burns off the chloramines, the acid holding the pH; the classic alternative to dilution.',
        },
        {
          doses: [
            { tank: 'fresh', size: 3 },
            { tank: 'fresh', size: 4 },
          ],
          reason: 'Dilution alone, without the top-up.',
        },
        {
          doses: [
            { tank: 'calHypo', size: 4 },
            { tank: 'calHypo', size: 4 },
          ],
          reason:
            'Breakpoint chlorination with granules: a double shock burns off the chloramines.',
        },
      ],
      pro: [
        {
          doses: [
            { tank: 'hypo', size: 0 },
            { tank: 'bicarbonate', size: 3 },
            { tank: 'fresh', size: 4 },
          ],
          reason:
            'One step less bicarbonate still rebuilds the alkalinity enough: plausibly close.',
        },
        {
          doses: [
            { tank: 'fresh', size: 4 },
            { tank: 'fresh', size: 4 },
          ],
          reason:
            'Twice the dilution: the mains water brings back the alkalinity too.',
        },
      ],
    },
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
    briefing: {
      journeyman:
        'The pool was refilled from soft mains water. Its calcium hardness is 50 mg/l and it is eating the grout. As a Journeyman, fix the fault: bring calcium hardness to 100 or more and the balance to −0.5 to +0.5.',
      pro: 'The pool was refilled from soft mains water. Its calcium hardness is 50 mg/l and it is eating the grout. As a Pool Pro, bring calcium hardness to 100 or more and the balance to −0.5 to +0.5, and restore every other reading too: the fresh water has almost no alkalinity.',
    },
    clue: 'Aggressive water wants calcium: give it some and it stops taking it from the grout. But the balance index also needs alkalinity, and this water has almost none. Fix the buffer as well as the hardness.',
    concept: 'calcium',
    explanation: {
      journeyman:
        'Yes: Large soda ash and Huge calcium chloride worked because the calcium chloride raises the hardness and the soda ash lifts the pH and the alkalinity, so together they bring the balance index into range and the water stops eating the grout. But a better solution would rebuild the alkalinity without pushing the pH up, and leave every other reading right as well.',
      pro: 'The best answer was Huge sodium bicarbonate, Large calcium chloride and Huge fresh water. The calcium chloride raises the hardness; the bicarbonate rebuilds the alkalinity without overshooting the pH, as a stronger alkali would; together they bring the balance index into range, and the fresh water evens out the pH and the rest.',
    },
    alsoWins: {
      journeyman: [
        {
          doses: [
            { tank: 'bicarbonate', size: 4 },
            { tank: 'calciumChloride', size: 4 },
          ],
          reason:
            'Bicarbonate in place of soda ash rebuilds the alkalinity: the Pool Pro route without the fresh water.',
        },
        {
          doses: [
            { tank: 'hypo', size: 4 },
            { tank: 'calciumChloride', size: 4 },
          ],
          reason:
            'Huge chlorine is alkaline enough to stand in for the soda ash, if superchlorinating.',
        },
      ],
    },
    relaxed: null,
  },
  {
    id: 'formed-stool',
    title: 'Faecal incident: The Floater',
    swimmers: 0,
    problem:
      'A formed stool in the shallow end. The pool is cleared and the stool netted out, but the chlorine is low and the pH high.',
    goal: 'Bring free chlorine to 1.0 to 2.0 mg/l and the pH to 7.2 to 7.6.',
    water: () =>
      waterFrom({
        ...RESET_WATER,
        ph: 7.8,
        alkalinity: 70,
        freeChlorine: 0.5,
        temperature: TEMPERATURE,
      }),
    targets: ['fc', 'ph'],
    pars: { journeyman: 3, pro: 4 },
    solutions: {
      journeyman: [
        { tank: 'hypo', size: 2 },
        { tank: 'hcl', size: 2 },
      ],
      pro: [
        { tank: 'hypo', size: 2 },
        { tank: 'co2', size: 2 },
        { tank: 'bicarbonate', size: 3 },
      ],
    },
    briefing: {
      journeyman:
        'A floater in the shallow end. The pool has been cleared and the offending article netted out by a lifeguard who did not sign up for this. A formed stool needs no superchlorination, but the free chlorine is only 0.5 mg/l and the pH 7.8, so what chlorine there is works poorly. As a Journeyman, fix the fault: bring the free chlorine up to 1.0 to 2.0 mg/l and the pH to 7.2 to 7.6, and let it circulate before the pool reopens.',
      pro: 'A floater in the shallow end. The pool has been cleared and the offending article netted out by a lifeguard who did not sign up for this. A formed stool needs no superchlorination, but the free chlorine is only 0.5 mg/l and the pH 7.8, so what chlorine there is works poorly. As a Pool Pro, bring the free chlorine up to 1.0 to 2.0 mg/l and the pH to 7.2 to 7.6, and restore every other reading too: the alkalinity is a little low.',
    },
    clue: 'Chlorine kills as hypochlorous acid, and the higher the pH, the less of it there is. More chlorine alone is not enough: bring the pH down too. But most acids eat the buffer, and the buffer here is already thin.',
    concept: 'hypochlorous acid',
    explanation: {
      journeyman:
        'Yes: Medium sodium hypochlorite and Medium hydrochloric acid worked because the hypochlorite lifts the free chlorine towards the top of its range, as the guidance asks after a formed stool, and the acid brings the pH down, so more of that chlorine is the strong hypochlorous acid. But a better solution would lower the pH without eating the thin buffer, and rebuild it. No superchlorination: that is for the runny kind.',
      pro: 'The best answer was Medium sodium hypochlorite, Medium carbon dioxide and Large sodium bicarbonate. The hypochlorite lifts the free chlorine towards the top of its range, as the guidance asks after a formed stool; carbon dioxide brings the pH down, so more of that chlorine is the strong hypochlorous acid, without eating the alkalinity as a mineral acid would; the bicarbonate rebuilds the thin buffer. No superchlorination: that is for the runny kind.',
    },
    relaxed: null,
  },
];
