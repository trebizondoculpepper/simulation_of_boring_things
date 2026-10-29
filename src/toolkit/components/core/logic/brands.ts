/**
 * The companies of the world of the VX3 and the Encabulator: who makes
 * what, as their brands would present them. The first ten are named
 * already (in the VX3 Simulator's component catalogue or on the
 * Encabulator's parts); the last six fill the gaps (who builds the line-up,
 * its PLC and its drive, its meters and screens, its oil, and who runs the
 * training), and Warden, whose mark was already on the fire panel, makes
 * the fire safety equipment. The last eight are the swimming-pool trade's
 * (Pool Plant's), though anyone may make anything: the money, the pumps,
 * the fittings, the filters and lights, the chemicals, the boilers, the
 * air and the alarms. All are our own invention. Each brand's logo is drawn from
 * its `mark` (`src/toolkit/components/core/views/brand-logo.ts`). Pure data.
 */

export type BrandMark =
  /** Interlocked initials in a ring. */
  | 'monogram'
  /** A lightning bolt through a letter X. */
  | 'bolt'
  /** A mid-century starburst behind the name. */
  | 'starburst'
  /** A rising sun over waves. */
  | 'sun'
  /** Initials on a heraldic shield. */
  | 'shield'
  /** A sine wave in a rounded square. */
  | 'wave'
  /** A star inside a cogwheel. */
  | 'cog'
  /** A chilli pepper. */
  | 'pepper'
  /** A letter in a hexagon. */
  | 'hexagon'
  /** Dots joined in a bus line. */
  | 'bus'
  /** A switch handle in a box. */
  | 'switch'
  /** A Q with a circuit trace for a tail. */
  | 'circuit'
  /** A ring of arrows turning. */
  | 'rotor'
  /** A meter dial and needle. */
  | 'dial'
  /** An oil drop. */
  | 'drop'
  /** A laurel wreath. */
  | 'laurel'
  /** An initial knocked out of a rounded square tile. */
  | 'tile'
  /** A coin with a wave across it and a rising line. */
  | 'ledger'
  /** A pump impeller's curved vanes in a ring. */
  | 'impeller'
  /** Concentric ripples spreading from a drop. */
  | 'ripple'
  /** Rising bubbles in a rounded square. */
  | 'bubbles'
  /** A molecule: balls joined by bonds. */
  | 'molecule'
  /** A flame in a circle. */
  | 'flame'
  /** A swirl of air in three curved strokes. */
  | 'swirl'
  /** A lifebuoy ring with its four bands. */
  | 'lifebuoy'
  /** Three pilot lamps in a row, one lit: a tri-state indicator. */
  | 'triad'
  /** A happy pig's face in a warm glow. */
  | 'pig'
  /** An ozone molecule: three atoms bent at its angle, a spark between. */
  | 'trioxygen'
  /** A door standing ajar in its frame, its hinge side heavy. */
  | 'doorset'
  /** A pendant shade throwing a cone of light. */
  | 'shade'
  /** A heater shield, a chevron across it like a road's camber, the initial below. */
  | 'crest'
  /** A three-by-three panel of pale tiles, one missing, a pipe and its valve behind it. */
  | 'tiles'
  /** A traction sheave, its ropes hanging down to a car. */
  | 'sheave';

/** Every brand's id: a part names its maker by one of these. */
export type BrandId =
  | 'neumann-dynamik'
  | 'volt-xoccula'
  | 'bonk-industries'
  | 'wonshou-labs'
  | 'trager-feinstein'
  | 'synclex'
  | 'gorskiy'
  | 'pepperdyne'
  | 'voltara'
  | 'fankel'
  | 'hartwell-bligh'
  | 'quorvane'
  | 'torvald'
  | 'kessler-moody'
  | 'oleander'
  | 'meridale'
  | 'warden'
  | 'splashonomics'
  | 'grundflow'
  | 'certikind'
  | 'lidoluxe'
  | 'chlorella'
  | 'hamwarmy'
  | 'mistral'
  | 'poolguard'
  | 'penfold'
  | 'trioxa'
  | 'ironside'
  | 'lumenhaus'
  | 'haulmark'
  | 'plantrooms'
  | 'stannard';

export interface Brand {
  id: BrandId;
  name: string;
  /** How the name is set in the logo, if not as `name`. */
  wordmark?: string;
  tagline: string;
  founded: number;
  country: string;
  /** What it makes, for the brand sheet. */
  makes: string;
  /** What it stands for, in its own positive words. */
  promise: string;
  mark: BrandMark;
  /** Main, second and ink colours. */
  colours: readonly [string, string, string];
  /** The wordmark's type: a plain modern sans, a serif, or a script. */
  type: 'sans' | 'serif' | 'script' | 'slab';
}

export const BRANDS: readonly Brand[] = [
  {
    id: 'neumann-dynamik',
    name: 'Neumann Dynamik',
    tagline: 'Präzision in Bewegung',
    founded: 1952,
    country: 'West Germany',
    makes: 'Precision electronics and drive controls',
    promise: 'German engineering, built to last',
    mark: 'monogram',
    colours: ['#1f3a68', '#9aa6b2', '#14181d'],
    type: 'sans',
  },
  {
    id: 'volt-xoccula',
    name: 'Volt Xoccula',
    wordmark: 'VOLT XOCCULA',
    tagline: 'The power of X',
    founded: 1961,
    country: 'Switzerland',
    makes: 'High-voltage apparatus; the VX rigs',
    promise: 'Fearless power for bold experiments',
    mark: 'bolt',
    colours: ['#d22f27', '#f4c430', '#111111'],
    type: 'slab',
  },
  {
    id: 'bonk-industries',
    name: 'Bonk Industries',
    wordmark: 'BONK',
    tagline: 'Industrial strength since 1946',
    founded: 1946,
    country: 'United States',
    makes: 'Motors and drives, incl. the Model 77 Encabulator Drive',
    promise: 'Tough machines for hard-working plants',
    mark: 'starburst',
    colours: ['#e0702a', '#5a3820', '#1c1410'],
    type: 'slab',
  },
  {
    id: 'wonshou-labs',
    name: 'Wonshou Labs',
    tagline: 'Research for tomorrow',
    founded: 1958,
    country: 'Japan',
    makes: 'Laboratory instruments and oscillators',
    promise: 'Curiosity, measured to the last decimal',
    mark: 'sun',
    colours: ['#c8102e', '#1d5fa8', '#111111'],
    type: 'sans',
  },
  {
    id: 'trager-feinstein',
    name: 'Trager-Feinstein Laboratory',
    wordmark: 'Trager-Feinstein',
    tagline: 'Instruments of record',
    founded: 1931,
    country: 'Austria',
    makes: 'Measuring instruments and reference standards',
    promise: 'Accuracy you can stake your name on',
    mark: 'shield',
    colours: ['#1e4d3a', '#c9a227', '#14201a'],
    type: 'serif',
  },
  {
    id: 'synclex',
    name: 'Synclex',
    wordmark: 'synclex',
    tagline: 'Modules that agree',
    founded: 1968,
    country: 'Netherlands',
    makes: 'Modular signal units (TS-8, OD-12, CT-3)',
    promise: 'Modules that simply work together',
    mark: 'wave',
    colours: ['#12898a', '#e8e3d3', '#10292a'],
    type: 'sans',
  },
  {
    id: 'gorskiy',
    name: 'Gorskiy',
    wordmark: 'ГОРСКИЙ',
    tagline: 'Завод точных приборов · Gorskiy Precision Works',
    founded: 1949,
    country: 'Soviet Union',
    makes: 'Transformers, amplifiers and field instruments',
    promise: 'Rugged instruments for any climate',
    mark: 'cog',
    colours: ['#b3121b', '#e3c26b', '#1a0f0f'],
    type: 'slab',
  },
  {
    id: 'pepperdyne',
    name: 'Pepperdyne',
    wordmark: 'Pepperdyne',
    tagline: 'Modial interaction for less',
    founded: 1994,
    country: 'United States',
    makes: 'Affordable entry-level encabulation components',
    promise: 'Making encabulation cost less',
    mark: 'pepper',
    colours: ['#d6281e', '#2e8b3a', '#1a1a1a'],
    type: 'script',
  },
  {
    id: 'voltara',
    name: 'Voltara',
    wordmark: 'VOLTARA',
    tagline: 'Switchgear you can lean on',
    founded: 1979,
    country: 'Ireland',
    makes: 'Isolators and switchgear; containerised generators for hire',
    promise: 'Safe isolation, every single time',
    mark: 'hexagon',
    colours: ['#f2c014', '#222222', '#111111'],
    type: 'sans',
  },
  {
    id: 'fankel',
    name: 'Fankel',
    wordmark: 'FANKEL',
    tagline: 'Every bus, on time',
    founded: 1983,
    country: 'Germany',
    makes: 'Fieldbus interfaces and network cards',
    promise: 'Every signal delivered, on time',
    mark: 'bus',
    colours: ['#2a62b8', '#9cc3f0', '#0f1d33'],
    type: 'sans',
  },
  {
    id: 'hartwell-bligh',
    name: 'Hartwell & Bligh Controls',
    wordmark: 'HARTWELL & BLIGH',
    tagline: 'Motor control, centred',
    founded: 1957,
    country: 'United States',
    makes: 'Motor control centres and starters',
    promise: 'Motor control, neatly in one place',
    mark: 'switch',
    colours: ['#7fa7c9', '#2b3a48', '#141b22'],
    type: 'slab',
  },
  {
    id: 'quorvane',
    name: 'Quorvane Automation',
    wordmark: 'QUORVANE',
    tagline: 'Logic that keeps its word',
    founded: 1971,
    country: 'United States',
    makes: 'Programmable controllers and I/O',
    promise: 'Dependable logic, scan after scan',
    mark: 'circuit',
    colours: ['#8a1c2b', '#d9b7a0', '#1d0d10'],
    type: 'sans',
  },
  {
    id: 'torvald',
    name: 'Torvald Drive Systems',
    wordmark: 'TORVALD',
    tagline: 'Turning, reliably',
    founded: 1975,
    country: 'Sweden',
    makes: 'Variable-frequency drives',
    promise: 'Smooth, efficient speed control',
    mark: 'rotor',
    colours: ['#2f7d4f', '#d7e8dc', '#0f2418'],
    type: 'sans',
  },
  {
    id: 'kessler-moody',
    name: 'Kessler-Moody Instruments',
    wordmark: 'Kessler-Moody',
    tagline: 'Read it right',
    founded: 1948,
    country: 'United Kingdom',
    makes: 'Panel meters, recorders and monitors',
    promise: 'Clear readings you can trust',
    mark: 'dial',
    colours: ['#3b3f45', '#e8a33d', '#141518'],
    type: 'serif',
  },
  {
    id: 'oleander',
    name: 'Oleander Lubricants',
    wordmark: 'OLEANDER',
    tagline: 'Keeps everything moving',
    founded: 1923,
    country: 'United Kingdom',
    makes: 'Lubricating and hydrocoptic oils',
    promise: 'Clean oil, quiet machines',
    mark: 'drop',
    colours: ['#d4a017', '#2a5a2a', '#1b1b10'],
    type: 'slab',
  },
  {
    id: 'meridale',
    name: 'Meridale Training Solutions',
    wordmark: 'Meridale',
    tagline: 'Learning that sticks',
    founded: 1998,
    country: 'United Kingdom',
    makes: 'Industrial training courses',
    promise: 'Confident operators, safer plants',
    mark: 'laurel',
    colours: ['#5b3f8c', '#c7b8e0', '#1c1428'],
    type: 'script',
  },
  {
    id: 'warden',
    name: 'Warden Fire Systems',
    wordmark: 'WARDEN',
    tagline: 'Standing guard',
    founded: 1964,
    country: 'United Kingdom',
    makes: 'Fire alarm panels, detection and extinguishers',
    promise: 'Protecting people and property',
    mark: 'tile',
    colours: ['#c4231c', '#f2c618', '#1a1a1a'],
    type: 'sans',
  },
  {
    id: 'splashonomics',
    name: 'Splashonomics',
    tagline: 'Every drop accounted for',
    founded: 1998,
    country: 'United Kingdom',
    makes: 'Pool operating-cost metering, software and audits',
    promise: 'Making swimming pool accounting affordable',
    mark: 'ledger',
    colours: ['#1f8a8a', '#f0b429', '#0f2e33'],
    type: 'sans',
  },
  {
    id: 'grundflow',
    name: 'Grundflow',
    wordmark: 'GRUNDFLOW',
    tagline: 'Keep it moving',
    founded: 1947,
    country: 'Denmark',
    makes: 'Circulation pumps, drives and dosing pumps',
    promise: 'Moving water quietly, so nobody has to think about it',
    mark: 'impeller',
    colours: ['#0b4f9c', '#7fb3e6', '#0a1a2e'],
    type: 'sans',
  },
  {
    id: 'certikind',
    name: 'Certikind',
    tagline: 'Fittings that fit',
    founded: 1971,
    country: 'United Kingdom',
    makes: 'Pool fittings: drains, inlets, gratings, skimmers',
    promise: 'Every fitting fits, and every swimmer is safe around it',
    mark: 'ripple',
    colours: ['#2b9fd6', '#d9eef8', '#12324a'],
    type: 'serif',
  },
  {
    id: 'lidoluxe',
    name: 'Lidoluxe',
    tagline: 'The glow beneath',
    founded: 1983,
    country: 'Spain',
    makes: 'Sand filters, UV units and underwater lights',
    promise: 'Crystal water that shines from within',
    mark: 'bubbles',
    colours: ['#00a3b4', '#ffe28a', '#063c44'],
    type: 'script',
  },
  {
    id: 'chlorella',
    name: 'Chlorella Chemicals',
    wordmark: 'Chlorella',
    tagline: 'Clear water, clear conscience',
    founded: 1956,
    country: 'United Kingdom',
    makes:
      'Sodium hypochlorite, pH correction and test reagents, delivered in bulk by its own tankers, and the specialist equipment that distributes them round a plant: transfer controls and their OT-216 terminals',
    promise: 'Safe, sparkling water for every swimmer, every day',
    mark: 'molecule',
    colours: ['#3f9b3a', '#cfe9b0', '#16301a'],
    type: 'slab',
  },
  {
    id: 'hamwarmy',
    name: 'Hamwarmy Heating',
    wordmark: 'HAMWARMY',
    tagline: 'Warmth you can count on',
    founded: 1914,
    country: 'United Kingdom',
    makes: 'Commercial boilers, calorifiers and pressurisation units',
    promise: 'Keeping the water warm and the showers hot, winter after winter',
    mark: 'pig',
    colours: ['#d4501e', '#f6c04a', '#2a1508'],
    type: 'slab',
  },
  {
    id: 'mistral',
    name: 'Mistral Air',
    tagline: 'Breathe easy, poolside',
    founded: 1979,
    country: 'France',
    makes: 'Pool hall air handling and dehumidification',
    promise: 'Fresh, dry air and no misted windows',
    mark: 'swirl',
    colours: ['#5d7fa6', '#d6e2ee', '#1b2a3a'],
    type: 'sans',
  },
  {
    id: 'poolguard',
    name: 'Poolguard Safety',
    wordmark: 'POOLGUARD',
    tagline: 'Every swimmer home safe',
    founded: 1988,
    country: 'United Kingdom',
    makes: 'Poolside alarms, CCTV, emergency stops and rescue equipment',
    promise: 'Watching the water when every second counts',
    mark: 'lifebuoy',
    colours: ['#e2462f', '#f7f4ee', '#1e1e1e'],
    type: 'slab',
  },
  {
    id: 'penfold',
    name: 'Penfold Controls',
    wordmark: 'PENFOLD',
    tagline: 'Every state at a glance',
    founded: 1972,
    country: 'United Kingdom',
    makes: 'Control panels, mimic cubicles, desks and annunciators',
    promise: 'Panels that tell you the truth about your plant',
    mark: 'triad',
    colours: ['#3d4f63', '#d6d9d6', '#16191c'],
    type: 'sans',
  },
  {
    id: 'trioxa',
    name: 'Trioxa Ozone Systems',
    wordmark: 'TRIOXA',
    tagline: 'Oxygen, three times over',
    founded: 1987,
    country: 'United Kingdom',
    makes: 'Ozone generators, air dryers, deozonisers and ozone monitors',
    promise: 'Water polished by lightning, and not a whiff left behind',
    mark: 'trioxygen',
    colours: ['#4b5fc1', '#bfe3f2', '#121a3a'],
    type: 'sans',
  },
  {
    id: 'ironside',
    name: 'Ironside Doorsets',
    wordmark: 'IRONSIDE',
    tagline: 'Shut, latched, and staying shut',
    founded: 1961,
    country: 'United Kingdom',
    makes:
      'Steel fire doorsets, door closers, coded locks, workshop storage cupboards and insulated roller shutters',
    promise: 'Doors that close themselves behind every careless hand',
    mark: 'doorset',
    colours: ['#5d6b5e', '#e3e1d6', '#1b1e1c'],
    type: 'slab',
  },
  {
    id: 'lumenhaus',
    name: 'Lumenhaus',
    tagline: 'Light as architecture',
    founded: 1979,
    country: 'Germany',
    makes:
      'Architectural lighting: halo panels, cove and slot lights, grazers, luminous ceilings, fibre-optic starlight and large-venue laser projectors',
    promise: 'Rooms remembered for the way they were lit',
    mark: 'shade',
    colours: ['#d9a441', '#f6ecd2', '#24201a'],
    type: 'sans',
  },
  {
    // The lorries that bring the plant its deliveries (prompt 097): the
    // tractor units the suppliers' fleets run.
    id: 'haulmark',
    name: 'Haulmark',
    wordmark: 'HAULMARK',
    tagline: 'Built for the long haul',
    founded: 1948,
    country: 'England',
    makes: 'Lorries: tractor units and rigid chassis',
    promise: 'Every load delivered, every mile',
    mark: 'crest',
    colours: ['#1d3b5c', '#c9a227', '#14181d'],
    type: 'slab',
  },
  {
    // The pool science museum's exhibition (mission 107; the owner,
    // 2026-10-28): The Dyehouse's marketing department chasing young
    // visitors with a meme, for an earnest exhibition about real plant
    // rooms. Its exhibit cases, lecterns and RESET pedestals are its own
    // make; the plant inside them keeps its makers. Our own design.
    id: 'plantrooms',
    name: 'Plantrooms',
    wordmark: 'PLANTROOMS',
    tagline: 'The real backrooms of the Poolrooms',
    founded: 2025,
    country: 'England',
    makes:
      "The Dyehouse museum's exhibition on how swimming pools work, and its fit-out: lecterns, cases and RESET pedestals",
    promise: 'Every room is real, and every machine in it works',
    mark: 'tiles',
    colours: ['#2a9d96', '#cdeee9', '#0f3236'],
    type: 'sans',
  },
  {
    // The freight lift's maker (mission 108, the owner, 2026-10-29): a
    // British goods lift firm of the old school, its car, doors and
    // controller the plant's age (around 2000). Our own invention.
    id: 'stannard',
    name: 'Stannard Lifts',
    wordmark: 'STANNARD',
    tagline: 'Up and down since 1934',
    founded: 1934,
    country: 'England',
    makes:
      'Goods and service lifts: traction machines, cars, vertical bi-parting doors and their controllers',
    promise: 'Two tonnes up, two tonnes down, every working day',
    mark: 'sheave',
    colours: ['#b8322a', '#e8e2d0', '#1c1c1e'],
    type: 'slab',
  },
];

/** A brand by its id. */
export const brandById = (id: BrandId) =>
  BRANDS.find((brand) => brand.id === id)!;
