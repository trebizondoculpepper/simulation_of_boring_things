/**
 * Hall 8, "Never again: putting safety first", sponsored by Chlorella
 * (mission 107i): the words of the hall, and its narration's timing. A
 * fictional 1997 chlorine release at a fictional pool, Pellingford Baths
 * and Leisure Centre, told in six chapters round the walls, each with its
 * time on the morning, its photograph (a placeholder until the owner's
 * images are dropped in), a clipping from a fictional paper, The
 * Pellingford Evening Lamp, and a plaque: what went wrong, and the real
 * lesson. Every real-world statement is traced in
 * `doc/research/pool-chlorine-releases.md`; nothing real is named. Pure.
 */

/** The line on the opening and sponsor's panels. */
export const DRAMATISATION =
  'A dramatisation based on real incidents. The people, places and newspaper are fictional.';

/** The fictional paper. */
export const PAPER = {
  name: 'The Pellingford Evening Lamp',
  price: '28p',
} as const;

/** A front or inside page of the paper, drawn on a canvas. */
export interface Clipping {
  /** "Tuesday, 15 April 1997". */
  date: string;
  /** "Page 1" or "Page 5". */
  page: string;
  headline: string;
  standfirst: string;
  body: readonly string[];
}

/** One chapter of the story round the walls. */
export interface Chapter {
  number: number;
  /** "07:42", or "Weeks later". */
  time: string;
  title: string;
  /** What the (coming) photograph shows, as its caption. */
  caption: string;
  /** What went wrong at this step (fiction). */
  wrong: string;
  /** The real lesson, in one line. */
  lesson: string;
  clipping: Clipping | null;
  /** The narrator's words for this chapter (the owner records them). */
  narration: string;
}

const DAY = 'Tuesday, 15 April 1997';

export const CHAPTERS: readonly Chapter[] = [
  {
    number: 1,
    time: '07:42',
    title: 'The delivery',
    caption:
      'The tanker at the loading bay, before the duty technician’s shift began.',
    wrong:
      'The tanker came early, its driver new to the site. Nobody met it. The two fill points stood side by side in an open recess.',
    lesson:
      'Every delivery is met by a trained member of staff, who checks the delivery note against the tank before anything is connected.',
    clipping: {
      date: DAY,
      page: 'Page 1',
      headline: 'GAS ALERT AT THE BATHS',
      standfirst:
        'Swimmers led out into the car park as fumes spread through leisure centre',
      body: [
        'Early swimmers and staff were led out of Pellingford Baths this morning after a cloud of choking gas was released in the plant room.',
        'Fire crews in protective suits were called to the building shortly after eight o’clock. Several people were treated at the scene for breathing difficulties.',
        'The centre will stay closed while the cause is investigated.',
      ],
    },
    narration:
      'Pellingford Baths, a spring morning in 1997. At seventeen minutes to eight a chemical tanker pulls into the loading bay. It is early. The duty technician has not yet started his shift, and the driver has never been here before. Nobody comes out to meet him.',
  },
  {
    number: 2,
    time: '07:51',
    title: 'The mix-up',
    caption: 'Two identical couplings, their labels faded to nothing.',
    wrong:
      'The two fill points had the same coupling, so either hose fitted either. Four hundred litres of acid went into the hypochlorite tank.',
    lesson:
      'Fill points must be impossible to confuse: a different coupling for each chemical, labelled and locked.',
    clipping: {
      date: 'Wednesday, 16 April 1997',
      page: 'Page 1',
      headline: 'WHO CHECKED THE TANKER?',
      standfirst:
        'Questions for the council as it emerges no member of staff met yesterday’s delivery',
      body: [
        'The tanker that delivered chemicals to Pellingford Baths arrived before any technician was on duty, the Lamp can reveal.',
        'Acid is understood to have been pumped into a tank holding sodium hypochlorite, the bleach-like liquid used to keep the water clean.',
        'A council spokesman said a full inquiry was under way.',
      ],
    },
    narration:
      'Two fill points stand side by side in an open recess: one for acid, one for sodium hypochlorite. They have the same coupling, and their labels faded long ago. The driver connects his acid hose to the hypochlorite fill. Four hundred litres of acid go into the bulk hypochlorite tank.',
  },
  {
    number: 3,
    time: '07:58',
    title: 'The gas',
    caption:
      'The plant room: a haze at the tank’s vent, and the gas detector’s cable hanging loose.',
    wrong:
      'Acid and hypochlorite together give off chlorine gas. The plant room’s gas detector had been disconnected after false alarms.',
    lesson:
      'Chlorine gas detection in the plant room and the stores, with an alarm and ventilation, kept working.',
    clipping: {
      date: DAY,
      page: 'Page 3',
      headline: '‘IT CAME UP LIKE A GREEN FOG’',
      standfirst: 'Swimmer tells of the moment the gas reached the pool hall',
      body: [
        '“There was a smell like strong bleach, then everyone was coughing,” said a swimmer who had been in the water since seven.',
        '“A lifeguard blew the whistle and told us all to get out. Nobody stopped to get changed.”',
        'Chlorine gas is heavier than air and gathers in low places.',
      ],
    },
    narration:
      'Mixed, acid and hypochlorite give off chlorine: a choking, yellow-green gas, heavier than air. It rises from the tank’s vent into the plant room, and the air handling draws it towards the pool hall. The plant room’s gas detector should have raised the alarm. It had been disconnected, weeks before, after false alarms.',
  },
  {
    number: 4,
    time: '08:05',
    title: 'The evacuation',
    caption:
      'The car park: swimmers in foil blankets, fire crews in gas-tight suits, the tanker still at the bay.',
    wrong:
      'The early swimmers and staff got out, and a handful were treated for breathing difficulties. Nobody died. There was no rehearsed plan: it could have been so much worse.',
    lesson:
      'A written, rehearsed emergency and evacuation plan. In a real incident in 2022, about 200 people were evacuated and 29 taken to hospital.',
    clipping: null,
    narration:
      'A lifeguard clears the pool. Swimmers and staff stand in the car park in foil blankets while fire crews in gas-tight suits go in. A handful are treated for breathing difficulties. Nobody dies. But there was no plan, and nobody had practised one.',
  },
  {
    number: 5,
    time: 'Weeks later',
    title: 'The inquiry',
    caption: 'A closed sign on the front doors.',
    wrong:
      'The inspectors found no risk assessment for deliveries, untrained staff at the chemicals, and a contractor nobody had checked. The council was fined £40,000 and the baths shut for six weeks.',
    lesson:
      'Only trained, competent people handle pool chemicals, under a risk assessment, as a 2021 case prosecuted by HSE showed again.',
    clipping: {
      date: 'Friday, 2 May 1997',
      page: 'Page 5',
      headline: 'BATHS SHUT FOR SIX WEEKS',
      standfirst:
        'Inspectors’ report finds no checks on deliveries and staff untrained',
      body: [
        'Pellingford Baths will stay closed until June while the plant room is rebuilt, the council confirmed last night.',
        'Inspectors found that no risk assessment had been made for chemical deliveries and that staff had not been trained to handle the chemicals.',
        'The council now faces prosecution.',
      ],
    },
    narration:
      'Weeks later, the inspectors report. There was no risk assessment for deliveries. The staff had not been trained to handle the chemicals. Nobody had checked the contractor. The council is fined forty thousand pounds, and the baths are shut for six weeks.',
  },
  {
    number: 6,
    time: 'The changes',
    title: 'Never again',
    caption: 'The new fill cabinet: a different coupling for each chemical.',
    wrong:
      'Separate lockable cabinets, a different coupling for each chemical, clear labels, every delivery met, gas detection with an alarm, and separate bunded stores.',
    lesson:
      'Make the mistake impossible: the plant room you have just walked through is built this way.',
    clipping: {
      date: 'Thursday, 12 June 1997',
      page: 'Page 7',
      headline: 'NEW SAFETY RULES AFTER BATHS SCARE',
      standfirst: 'Pellingford Baths reopens with rebuilt plant room',
      body: [
        'Pellingford Baths reopened this morning with a rebuilt chemical store, new gas alarms and fill points that cannot be mixed up.',
        'Every delivery will now be met by a trained member of staff.',
        '“It must never happen again,” said a council officer.',
      ],
    },
    narration:
      'Pellingford Baths reopened with its fill points rebuilt: a different coupling for each chemical, each in its own locked cabinet, clearly labelled. Every delivery is met. The gas detector works, and the stores are apart. The fix is to make the mistake impossible. Never again.',
  },
];

/** The opening panel, by the way in. */
export const OPENING = {
  title: 'Never again: putting safety first',
  bigIdea:
    'Two of the chemicals that keep a pool safe must never meet. Mixed, they make chlorine gas. This is the story of a morning when they did.',
  assumes:
    'Pools are dosed with sodium hypochlorite, to disinfect, and with acid, to hold the pH. Both are delivered by tanker into bulk tanks.',
  fact: '“The accidental addition of acid to hypochlorite is the commonest cause of chlorine release incidents in pool buildings.” HSE inspector, 2023.',
  ownVoice: 'Deliveries are one of the moments it can happen.',
  tryIt:
    'Press HEAR WHAT HAPPENED to hear the story of the photograph you stand nearest. Then look in the case: could you connect the wrong hose?',
} as const;

/** The central case's plaques. */
export const CASE_PLAQUES = {
  before: {
    title: 'Before (1997)',
    body: 'Two identical 2-inch camlocks in an open recess, their labels faded blank. Either hose fitted either point.',
  },
  after: {
    title: 'After (now)',
    body: 'Hypochlorite: a 2-inch brass camlock. Acid: a 1½-inch polypropylene Guillemin. Each in its own lockable cabinet, colour-coded and labelled. The acid’s hose cannot couple to the hypochlorite’s port.',
  },
  fix: 'The fix: make the mistake impossible.',
  frankfurt:
    'After a fatal mix-up at a German chemical depot in 2007, the hypochlorite fill was given left-hand threads so no other hose could fit, and every fill point was locked and labelled.',
  specimen:
    'Museum specimens: connected to nothing. You will find these in the leisure centre’s own loading bay.',
} as const;

/** Chlorella's panel and the lessons beneath it. */
export const SPONSOR = {
  maker: 'Chlorella Chemicals',
  since: 'Since 1956',
  slogan: 'Clear water, clear conscience',
  headline: 'Never again: putting safety first.',
  pride: 'Chlorella is proud to support this exhibition.',
  lessons: [
    'Accidentally adding acid to hypochlorite is the commonest cause of chlorine releases in pool buildings.',
    'Fill points cannot be confused: a different coupling for each chemical, labelled and locked.',
    'Every delivery is met by trained staff, who check the note and the tank before anything is connected.',
    'Only trained, competent people handle pool chemicals.',
    'Acid and hypochlorite are stored apart, each in its own bund.',
    'Chlorine gas detection, alarmed, with ventilation.',
    'A written, rehearsed emergency plan.',
  ],
} as const;

/** How long the narration dwells on its chapter, seconds, with no clip of its own. */
export const CHAPTER_SECONDS = 20;

/** Each chapter's narration clip, `resources/sound/voice/never-again/<id>.mp3`. */
export const narrationClip = (ch: Pick<Chapter, 'number'>): string =>
  `chapter-${ch.number}`;

/** The narration: off, or playing one chapter (its index), `t` seconds in. */
export type Narration =
  | { playing: false }
  | { playing: true; chapter: number; t: number };

export const NARRATION_OFF: Narration = { playing: false };

/**
 * The button pressed: tell the chapter the visitor stands nearest
 * (`nearestChapter`), or, if one is playing, stop.
 */
export const pressNarration = (n: Narration, chapter: number): Narration =>
  n.playing ? NARRATION_OFF : { playing: true, chapter, t: 0 };

/** Time passes; after its chapter (`seconds` long) it stops itself. */
export function stepNarration(
  n: Narration,
  delta: number,
  seconds: number = CHAPTER_SECONDS,
): Narration {
  if (!n.playing) return n;
  const t = n.t + delta;
  return t >= seconds ? NARRATION_OFF : { ...n, t };
}

/** The chapter lit (its index), or null while the narration is off. */
export const litChapter = (n: Narration): number | null =>
  n.playing ? n.chapter : null;

/**
 * The photograph nearest the visitor, its index, measured on the floor
 * plan (x and z, metres, in the hall's frame); the first on a tie.
 */
export function nearestChapter(
  at: { x: number; z: number },
  photos: readonly { x: number; z: number }[],
): number {
  let best = 0;
  let bestD = Infinity;
  photos.forEach((p, k) => {
    const d = (p.x - at.x) ** 2 + (p.z - at.z) ** 2;
    if (d < bestD) {
      best = k;
      bestD = d;
    }
  });
  return best;
}
