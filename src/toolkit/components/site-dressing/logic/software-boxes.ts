/** A box's six faces. The front faces +z, the top +y, and left and right are the spines as seen from the front. */
export type BoxFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

/** Faces in BoxGeometry's material group order. */
export const BOX_FACES: readonly BoxFace[] = [
  'right',
  'left',
  'top',
  'bottom',
  'front',
  'back',
];

/** The four cardboard formats used by this collection. */
export type BoxSizeId =
  | 'classic'
  | 'sierra-tall'
  | 'collector-flat'
  | 'small-box';

/** A box's outside dimensions in metres. */
export interface BoxSize {
  id: BoxSizeId;
  /** Width of the front in metres. */
  w: number;
  /** Height of the front in metres. */
  h: number;
  /** Depth in metres. */
  d: number;
  source: string;
}

/** Measured and period representative cardboard box sizes. */
export const BOX_SIZES: Record<BoxSizeId, BoxSize> = {
  classic: {
    id: 'classic',
    w: 0.178,
    h: 0.229,
    d: 0.051,
    source:
      '7 × 9 × 2 in; Wireframe, raspberrypi.com/news/big-box-games-the-history-of-pc-gamings-iconic-packaging/',
  },
  'sierra-tall': {
    id: 'sierra-tall',
    w: 0.229,
    h: 0.267,
    d: 0.044,
    source:
      '9 × 10.5 × 1.75 in; 1995 The Lost Mind of Dr. Brain, digitalgamemuseum.org/collection/items/show/67',
  },
  'collector-flat': {
    id: 'collector-flat',
    w: 0.19,
    h: 0.24,
    d: 0.045,
    source:
      '19 × 24 × 4.5 cm; collector measurement, collectorsedition.org/forums/archive/index.php/t-16094.html',
  },
  'small-box': {
    id: 'small-box',
    w: 0.135,
    h: 0.19,
    d: 0.03,
    source:
      'Late-1990s double-thick DVD-sized cardboard box; en.wikipedia.org/wiki/Video_game_packaging; DVD case 135 × 190 mm',
  },
};

/** A compact scheme for procedurally painted cover art. */
export type BoxArtStyle =
  | 'pool-diagram'
  | 'spreadsheet'
  | 'art-deco'
  | 'pulp-painting'
  | 'movie-noir'
  | 'calendar'
  | 'corporate-gradient'
  | 'chemistry';

/** Simple geometric marks keep the fictional publishers distinct. */
export interface PublisherLogo {
  shape: 'circle' | 'diamond' | 'hexagon' | 'arch' | 'bars';
  letters: string;
}

/** The three colours used across a box's printed faces. */
export interface BoxPalette {
  background: string;
  ink: string;
  accent: string;
}

/** Period PC requirements printed on a box back. */
export interface BoxRequirements {
  cpu: string;
  ram: string;
  disk: string;
  graphics: string;
  sound: string;
  os: string;
  drive: string;
}

/** A fictional software title with all text needed to print its six faces. */
export interface SoftwareTitle {
  id: string;
  title: string;
  subtitle?: string;
  publisher: string;
  kind: 'game' | 'business';
  size: BoxSizeId;
  year: number;
  media: string;
  palette: BoxPalette;
  style: BoxArtStyle;
  publisherLogo: PublisherLogo;
  frontBadges: readonly string[];
  blurb: string;
  features: readonly string[];
  screenshots: readonly string[];
  requirements: BoxRequirements;
  barcode: string;
  price: { amount: string; label?: 'REDUCED' | 'SALE' };
  ageRating: '3+' | '7+' | '12+' | '15+' | null;
  compatibility: 'Designed for PANES 95' | 'PANES 3.11 compatible';
}

const standardRequirements: BoxRequirements = {
  cpu: '486DX2/66 or better; Quintium recommended',
  ram: '8 MB RAM (16 MB recommended)',
  disk: '30 MB free hard disk space',
  graphics: 'SVGA 640 × 480, 256 colours',
  sound: 'SoundBucket 16 or 100% compatible',
  os: 'PANES 95',
  drive: 'Double-speed CD-ROM drive',
};

/** Eight wholly fictional desk-bound relics of the late 1990s. */
export const SOFTWARE_TITLES: readonly SoftwareTitle[] = [
  {
    id: 'macrosoft-pool-simulator-97',
    title: 'Macrosoft Pool Simulator 97',
    publisher: 'Macrosoft',
    kind: 'game',
    size: 'classic',
    year: 1997,
    media: 'CD-ROM',
    palette: { background: '#0b5470', ink: '#f4f4d9', accent: '#f2bb43' },
    style: 'pool-diagram',
    publisherLogo: { shape: 'hexagon', letters: 'M' },
    frontBadges: ['NEW! 3D SVGA GRAPHICS', 'Over 200 lane configurations!'],
    blurb:
      'At last, the civic pool rendered with uncompromising administrative realism. Set the lane ropes, manage the 4 pm school rush and discover what happens when the chlorine model is ignored.',
    features: [
      'Realistic free and combined chlorine',
      'Six authentic whistle tones',
      'Queue simulation with damp socks',
      'Adjustable lane-rope tension',
    ],
    screenshots: ['The early-bird lane', 'The 4 pm rush', 'Plant readings'],
    requirements: standardRequirements,
    barcode: '5000000000012',
    price: { amount: '£34.99' },
    ageRating: '3+',
    compatibility: 'Designed for PANES 95',
  },
  {
    id: 'beige-accountings-leisure-centre-simulator',
    title: "Beige Accounting's Leisure Centre Simulator",
    publisher: 'Beige Accounting',
    kind: 'business',
    size: 'sierra-tall',
    year: 1996,
    media: '3 × 3.5" disks',
    palette: { background: '#c7b994', ink: '#27383b', accent: '#8d483d' },
    style: 'spreadsheet',
    publisherLogo: { shape: 'bars', letters: 'BA' },
    frontBadges: ['THE NUMBERS ARE IN', 'Includes wet-weather forecasts'],
    blurb:
      'Where spreadsheets meet swimming. Set admission prices, reconcile float receipts and find out whether Tuesday aqua-aerobics can pay for a new mop.',
    features: [
      'Model pool attendance by the quarter hour',
      'Print seventeen useful ledgers',
      'Track towel shrinkage',
      'Balance the café till',
    ],
    screenshots: [
      'Quarterly takings',
      'The locker ledger',
      'A sound investment',
    ],
    requirements: {
      ...standardRequirements,
      disk: '18 MB free hard disk space',
      drive: '3.5" high-density disk drive',
      os: 'PANES 3.11 or PANES 95',
    },
    barcode: '5000000000029',
    price: { amount: '£29.99', label: 'REDUCED' },
    ageRating: null,
    compatibility: 'PANES 3.11 compatible',
  },
  {
    id: 'lido-tycoon',
    title: 'Lido Tycoon',
    publisher: 'Hydrox Interactive',
    kind: 'game',
    size: 'classic',
    year: 1998,
    media: 'CD-ROM',
    palette: { background: '#164c70', ink: '#fff0ca', accent: '#f2a55d' },
    style: 'art-deco',
    publisherLogo: { shape: 'arch', letters: 'HI' },
    frontBadges: ['BUILD YOUR SUMMER EMPIRE', 'Includes a rain forecast'],
    blurb:
      'Raise a glorious outdoor bathing palace from an empty field. Commission diving boards, sell ices and persuade the council that August will be sunny this year.',
    features: [
      'Design elegant 1930s lidos',
      'Hire attendants and ice-cream sellers',
      'Survive bank holidays',
      'Balance sunshine against the budget',
    ],
    screenshots: ['Grand opening', 'The sun terrace', 'An ambitious extension'],
    requirements: {
      ...standardRequirements,
      ram: '16 MB RAM',
      disk: '80 MB free hard disk space',
    },
    barcode: '5000000000036',
    price: { amount: '£29.99' },
    ageRating: '3+',
    compatibility: 'Designed for PANES 95',
  },
  {
    id: 'chlorine-quest-ii-the-shallow-end',
    title: 'Chlorine Quest II: The Shallow End',
    publisher: 'Cascade On-Line',
    kind: 'game',
    size: 'collector-flat',
    year: 1996,
    media: 'CD-ROM',
    palette: { background: '#32263d', ink: '#ffe4b0', accent: '#d36d47' },
    style: 'pulp-painting',
    publisherLogo: { shape: 'diamond', letters: 'C' },
    frontBadges: [
      'Now with talkie voices on CD-ROM',
      'A mystery of modest depth',
    ],
    blurb:
      'The caretaker has lost the key to the shallow end. Search the changing cubicles, question an unreliable vending machine and solve a puzzle involving three identical drain covers.',
    features: [
      'Point, click and cautiously wade',
      'Fully voiced lost-property clerk',
      'More than forty background tiles',
      'Hint book sold separately',
    ],
    screenshots: ['The locked gate', 'A vital clue', 'The final drain'],
    requirements: {
      ...standardRequirements,
      disk: '45 MB free hard disk space',
    },
    barcode: '5000000000043',
    price: { amount: '£24.99', label: 'SALE' },
    ageRating: '7+',
    compatibility: 'Designed for PANES 95',
  },
  {
    id: 'deep-end',
    title: 'DEEP END',
    subtitle: 'An Interactive Movie on 4 CD-ROMs',
    publisher: 'Verruca Interactive',
    kind: 'game',
    size: 'classic',
    year: 1997,
    media: '4 CD-ROMs',
    palette: { background: '#101d2e', ink: '#e2e8dc', accent: '#b42e38' },
    style: 'movie-noir',
    publisherLogo: { shape: 'circle', letters: 'VI' },
    frontBadges: ['FOUR DISCS. ONE SHIFT.', 'Full-motion video'],
    blurb:
      'A lifeguard takes the late shift. The lights flicker. Someone has entered the deep end after closing. Choose where to point the torch in this lavishly compressed interactive thriller.',
    features: [
      'Over 90 minutes of grainy footage',
      'Branching whistle decisions',
      'Four thrilling disc changes',
      'Digitised dialogue',
    ],
    screenshots: ['The empty pool', 'An unexpected splash', 'After hours'],
    requirements: {
      ...standardRequirements,
      cpu: 'Quintium 90 or better',
      ram: '16 MB RAM',
      graphics: 'SVGA 640 × 480, 16-bit colour',
      drive: 'Quad-speed CD-ROM drive',
    },
    barcode: '5000000000050',
    price: { amount: '£39.99' },
    ageRating: '15+',
    compatibility: 'Designed for PANES 95',
  },
  {
    id: 'bookit-pro-4-for-workgroups',
    title: 'BookIt! Pro 4.0 for Workgroups',
    publisher: 'Turnstile Software',
    kind: 'business',
    size: 'sierra-tall',
    year: 1999,
    media: 'CD-ROM',
    palette: { background: '#e4e1d6', ink: '#17364f', accent: '#bb6a22' },
    style: 'calendar',
    publisherLogo: { shape: 'hexagon', letters: 'TS' },
    frontBadges: ['YEAR 2000 READY', 'Multi-user booking diary'],
    blurb:
      'The booking desk finally has a system of its own. Reserve courts, lanes and aqua-aerobics; move block bookings without reaching for the correction fluid.',
    features: [
      'Colour-coded court and lane diary',
      'Recurring block bookings',
      'Print daily attendance sheets',
      'Conflicting bookings flagged in amber',
    ],
    screenshots: ['The Monday diary', 'Block bookings', 'Print preview'],
    requirements: {
      ...standardRequirements,
      ram: '16 MB RAM (32 MB for workgroups)',
      disk: '60 MB free hard disk space',
    },
    barcode: '5000000000067',
    price: { amount: '£49.99' },
    ageRating: null,
    compatibility: 'Designed for PANES 95',
  },
  {
    id: 'coshh-manager-95',
    title: 'COSHH Manager 95',
    publisher: 'Hazchem Systems Ltd',
    kind: 'business',
    size: 'collector-flat',
    year: 1995,
    media: '3 × 3.5" disks',
    palette: { background: '#d9e4e5', ink: '#183b46', accent: '#e27a24' },
    style: 'corporate-gradient',
    publisherLogo: { shape: 'diamond', letters: 'HS' },
    frontBadges: ['SAFETY DATA AT HAND', 'Printable registers'],
    blurb:
      'Keep the chemical store in order. Record sodium hypochlorite, acids and cleaning agents, then print the safety sheets before the inspector asks.',
    features: [
      'Searchable hazard register',
      'Safety data sheet templates',
      'Expiry and stock reminders',
      'Print labels for the locked cupboard',
    ],
    screenshots: [
      'The chemical register',
      'A safety data sheet',
      'Stock review',
    ],
    requirements: {
      ...standardRequirements,
      cpu: '386DX/33 or better',
      ram: '4 MB RAM (8 MB recommended)',
      disk: '12 MB free hard disk space',
      graphics: 'VGA 640 × 480, 16 colours',
      sound: 'No sound card required',
      os: 'PANES 3.11 or PANES 95',
      drive: '3.5" high-density disk drive',
    },
    barcode: '5000000000074',
    price: { amount: '£59.99' },
    ageRating: null,
    compatibility: 'PANES 3.11 compatible',
  },
  {
    id: 'doseright-gold-2-1',
    title: 'DoseRight Gold 2.1',
    publisher: 'Langelier Labs',
    kind: 'business',
    size: 'small-box',
    year: 1998,
    media: 'CD-ROM',
    palette: { background: '#e0e9d5', ink: '#174d59', accent: '#b39734' },
    style: 'chemistry',
    publisherLogo: { shape: 'circle', letters: 'LL' },
    frontBadges: ['POOL WATER, EXPLAINED', 'Gold edition'],
    blurb:
      'Take the guesswork out of the test kit. Enter free chlorine, combined chlorine and pH, calculate a sensible dose and check the saturation index before making the rounds.',
    features: [
      'Dosing calculator with units',
      'Saturation index worksheet',
      'Daily test log',
      'Clear printouts for the clipboard',
    ],
    screenshots: ['Today’s readings', 'Dose worksheet', 'The daily log'],
    requirements: {
      ...standardRequirements,
      disk: '25 MB free hard disk space',
      sound: 'No sound card required',
    },
    barcode: '5000000000081',
    price: { amount: '£19.99', label: 'REDUCED' },
    ageRating: null,
    compatibility: 'Designed for PANES 95',
  },
];

/** Calculate the EAN-13 check digit for exactly twelve decimal digits. */
export function ean13CheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12))
    throw new Error('EAN-13 needs twelve decimal digits');
  let sum = 0;
  for (let index = 0; index < 12; index += 1)
    sum += Number(first12[index]) * (index % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

/** Report whether a string is a complete EAN-13 code. */
export function isValidEan13(code: string): boolean {
  return (
    /^\d{13}$/.test(code) &&
    ean13CheckDigit(code.slice(0, 12)) === Number(code[12])
  );
}

/** Find the cardboard format selected for a title. */
export function boxSizeOf(title: SoftwareTitle): BoxSize {
  return BOX_SIZES[title.size];
}

/** Give the unrolled printed dimensions of a face in metres. */
export function faceSize(
  size: BoxSize,
  face: BoxFace,
): { w: number; h: number } {
  if (face === 'front' || face === 'back') return { w: size.w, h: size.h };
  if (face === 'left' || face === 'right') return { w: size.d, h: size.h };
  return { w: size.w, h: size.d };
}

/** Give whole canvas dimensions, with a minimum of sixteen pixels per side. */
export function faceCanvasSize(
  size: BoxSize,
  face: BoxFace,
  pixelsPerMetre = 2400,
): { w: number; h: number } {
  const dimensions = faceSize(size, face);
  return {
    w: Math.max(16, Math.round(dimensions.w * pixelsPerMetre)),
    h: Math.max(16, Math.round(dimensions.h * pixelsPerMetre)),
  };
}
