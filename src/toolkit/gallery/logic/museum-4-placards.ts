import {
  TANKS,
  TAGS,
  VOLUME,
  newHall4,
  readWater,
  shortTag,
} from '../../../game/plant/museum-4-lab';
import { RESET_SIGN } from './ideal-pool-plant-placards';
import type { Placard } from './ideal-pool-plant-placards';
import { CHALLENGES } from '../../../game/plant/museum-4-cards';
import type { NarrationKind } from '../../../game/plant/museum-4-challenge';

export { RESET_SIGN };

/**
 * Hall 4's words (107d): its entrance panel and a placard at each of its
 * five stations, desk to challenges, along the way round from the arrival archway, and the Balance
 * Beam's plaque. Every number comes from the model; the plaque facts are
 * the brief's sourced ones (PWTAG CoP, via the research notes). Pure.
 */

const round = (v: number, places = 0) =>
  v.toLocaleString('en-GB', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });

export function hall4Facts() {
  const r = readWater(newHall4(0).bench.pool);
  return {
    volume: VOLUME,
    /** A 10-litre dose against the pool, as teaspoons (5 ml) in a 80-litre bath. */
    teaspoons: ((10 / (VOLUME * 1000)) * 80000) / 5,
    resetHocl: r.hoclShare,
    resetLsi: r.lsi,
  };
}

export function hall4Placards(): Placard[] {
  const k = hall4Facts();
  return [
    {
      station: 1,
      of: 'desk',
      icon: 'meter',
      headline: 'The station',
      title: `Dosing console · ${TAGS['desk']}`,
      body: `Choose a chemical on the middle screen and a size on the right, Tiny to Huge, each about three times the last; press DOSE. Its valve opens and the whole dose goes in at once, down the header to the dosing pot ${shortTag('pot')} and into the pool’s return. The left screen runs the challenges, and RESET.`,
      fact: 'Here you are the controller: nothing doses itself.',
      tryIt: 'Dose a Medium hydrochloric acid and watch the pH fall.',
    },
    {
      station: 2,
      of: 'tanks',
      icon: 'tank',
      headline: 'The tanks',
      title: `Ten ideal tanks · ${TAGS['tank.hypo']} to ${TAGS['tank.fresh']}`,
      body: TANKS.map(
        (t) => `${t.code} ${t.product}: ${t.purpose}; ${t.sideEffects}.`,
      ).join(' '),
      fact: 'Never let acid and hypochlorite meet: together they make chlorine gas. (Tank you won’t find here: coagulant. It works on dirt, not on chemistry.)',
      tryIt: 'Find the tank that raises alkalinity without moving the pH.',
    },
    {
      station: 3,
      of: 'swimmers',
      icon: 'pool',
      headline: 'The swimmers',
      title: `Ideal swimmers · ${TAGS['swimmers']}`,
      body: 'Every swimmer brings sweat and urine. Chlorine reacts with them and is used up, and makes combined chlorine (chloramines): the “chlorine smell” of a pool is really trichloramine. Enough chlorine, about eight times the nitrogen (7.6 in theory), breaks them down: breakpoint. Twenty swimmers are always in the pool in free play; each challenge brings its own.',
      fact: 'Urea from swimmers breaks down slowly: half of it lasts about 63 hours.',
      tryIt: 'In free play, watch the free chlorine slowly fall as they swim.',
    },
    {
      station: 4,
      of: 'readout',
      icon: 'meter',
      headline: 'The readout',
      title: `The museum’s ideal analyser, which knows the water exactly · ${TAGS['analyser']}`,
      body: 'Green means within the recommended range (PWTAG). Free chlorine kills germs; combined chlorine is chlorine used up on swimmers; pH decides how much chlorine works; alkalinity is the buffer; hardness keeps the water from eating the grout; TDS is everything dissolved; sulphate above 360 mg/l attacks cement grout (see what it does in the Grout hall).',
      fact: `At pH 7.4 about ${round(k.resetHocl)} % of the free chlorine is working (HOCl); at pH 8.0 only about a quarter.`,
      tryIt: 'Add soda ash and watch the HOCl meter fall as the pH rises.',
    },
    {
      station: 5,
      of: 'cards',
      icon: 'map',
      headline: 'The challenges',
      title: 'Challenge cards',
      body: `Pick a card on the console’s left screen, JOURNEYMAN or POOL PRO, and press START. Something is wrong with the water: put it right within par, and keep it in range for an hour of lab time. A Journeyman fixes the card’s target; a Pool Pro leaves every reading in range. ${CHALLENGES.length} cards, easiest first.`,
      fact: 'In practice the pH rises after dechlorination: check it and add acid.',
      tryIt: `Try “${CHALLENGES[0].title}” first, as a Journeyman.`,
    },
  ];
}

/** The Balance Beam's plaque (PDWC §2.5, CoP §9.13). */
export const BEAM_PLAQUE = {
  headline: 'The balance index',
  body: 'Langelier’s index puts pH, hardness, alkalinity, temperature and TDS into one number. Below −0.5 the water is aggressive and eats grout and concrete; above +0.5 it scales the plant. Raising pH by 0.1 raises it by 0.1; doubling hardness or alkalinity raises it by 0.3. The same water at 37 °C is about 0.17 higher: warm water scales sooner.',
  caution: 'pH and free chlorine take precedence over other factors (PWTAG).',
} as const;

/**
 * The Balance Beam's own lectern, before it on the floor (the owner,
 * 2026-10-31): its plaque's words, taken off the beam.
 */
export function beamPlacard(): Placard {
  return {
    of: 'beam',
    icon: 'meter',
    headline: BEAM_PLAQUE.headline,
    title: `Balance Beam · ${TAGS['beam']}`,
    body: BEAM_PLAQUE.body,
    fact: BEAM_PLAQUE.caution,
    tryIt: 'Dose acid or soda ash at the desk and watch the beam tip.',
  };
}

/**
 * Each challenge card's narration clips, by card and narration (briefing,
 * clue, explanation; mission 113): none recorded yet (an empty id), their
 * words in `doc/scripts/museum/museum-narration.txt` for recording.
 */
export const CARD_NARRATION: Readonly<
  Record<string, Record<NarrationKind, string>>
> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, { briefing: '', clue: '', explanation: '' }]),
);

/** The cards' narrations as the recording script sets them out. */
export function cardNarrationScript() {
  const lines = ['HALL 4: THE CHALLENGE CARDS', ''];
  CHALLENGES.forEach((c, k) => {
    for (const [n, kind] of (
      ['briefing', 'clue', 'explanation'] as const
    ).entries())
      lines.push(
        `7${'bcdefghij'[k]}${n + 1}. ${c.title}, ${kind}: ${c[kind]}`,
        '',
      );
  });
  return lines.join('\n');
}

export function hall4Entrance() {
  const k = hall4Facts();
  return {
    title: 'The chemistry of pools',
    subtitle: 'Hall 4: a hands-on chemistry lab',
    introduction: `Keeping a pool safe is a balancing act. Every chemical you add changes more than one thing. Here, you are the pool’s chemist. The pool’s ${round(k.volume)} cubic metres weigh ${round(k.volume)} tonnes: a 10-litre dose is like less than half a teaspoon in a bath.`,
    route: hall4Placards().map((p) => ({
      station: p.station!,
      name: p.headline,
      what: p.title.split(' · ')[0],
    })),
    reset:
      'Can’t break it: RESET on the console’s left screen puts everything back to the start.',
  };
}
