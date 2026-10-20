/**
 * The companies of the world of the VX3 and the Encabulator: who makes
 * what, as their brands would present them. The first ten are named
 * already (in the VX3 Simulator's component catalogue or on the
 * Encabulator's parts); the last six fill the gaps (who builds the line-up,
 * its PLC and its drive, its meters and screens, its oil, and who runs the
 * training), and Warden, whose mark was already on the fire panel, makes
 * the fire safety equipment. All are our own invention. Each brand's logo is drawn from
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
  | 'tile';

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
  | 'warden';

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
    makes: 'Isolators and switchgear',
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
];

/** A brand by its id. */
export const brandById = (id: BrandId) =>
  BRANDS.find((brand) => brand.id === id)!;
