/**
 * The schematic symbols the manual's drawings use, as small SVGs, after
 * the usual building services and P&ID conventions: a valve as two
 * triangles point to point, its actuator on its stem (a handwheel for one
 * worked by hand, a solenoid's box for one held open electrically); a
 * meter as a circle; an instrument as a bubble with its letters; an
 * emergency stop as its red mushroom. Each is placed in a schematic's
 * node by name (`schematic.ts`) and written out beside the figure. Sizes
 * in points. Pure.
 */

export type SymbolName =
  | 'manual-valve'
  | 'solenoid-valve'
  | 'meter'
  | 'gas-detector'
  | 'emergency-stop';

export interface SchematicSymbol {
  /** Its file name beside the figure. */
  file: string;
  width: number;
  height: number;
  svg: string;
}

const INK = '#1b1b1b';

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}pt" height="${h}pt" viewBox="0 0 ${w} ${h}">${body}</svg>`;

/** Two triangles point to point, across the line at y, x from a to b. */
const bowtie = (a: number, b: number, y: number, r: number) => {
  const m = (a + b) / 2;
  return `<path d="M ${a} ${y - r} L ${m} ${y} L ${a} ${y + r} Z M ${b} ${y - r} L ${m} ${y} L ${b} ${y + r} Z" fill="#ffffff" stroke="${INK}" stroke-width="1.4" stroke-linejoin="miter"/>`;
};

const text = (x: number, y: number, s: string, size = 9) =>
  `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="bold" text-anchor="middle" fill="${INK}">${s}</text>`;

export const SYMBOLS: Record<SymbolName, SchematicSymbol> = {
  'manual-valve': {
    file: 'symbol-manual-valve.svg',
    width: 44,
    height: 34,
    // The valve, its stem and a handwheel across its top.
    svg: svg(
      44,
      34,
      `${bowtie(4, 40, 24, 8)}<line x1="22" y1="24" x2="22" y2="8" stroke="${INK}" stroke-width="1.4"/><line x1="12" y1="8" x2="32" y2="8" stroke="${INK}" stroke-width="2"/>`,
    ),
  },
  'solenoid-valve': {
    file: 'symbol-solenoid-valve.svg',
    width: 44,
    height: 40,
    // The valve, its stem and the solenoid's box, marked S.
    svg: svg(
      44,
      40,
      `${bowtie(4, 40, 30, 8)}<line x1="22" y1="30" x2="22" y2="18" stroke="${INK}" stroke-width="1.4"/><rect x="13" y="2" width="18" height="16" fill="#ffffff" stroke="${INK}" stroke-width="1.4"/>${text(22, 14, 'S')}`,
    ),
  },
  meter: {
    file: 'symbol-meter.svg',
    width: 40,
    height: 40,
    // A circle on the line, marked M.
    svg: svg(
      40,
      40,
      `<circle cx="20" cy="20" r="15" fill="#ffffff" stroke="${INK}" stroke-width="1.4"/>${text(20, 24, 'M', 11)}`,
    ),
  },
  'gas-detector': {
    file: 'symbol-gas-detector.svg',
    width: 40,
    height: 40,
    // An instrument bubble, its letters GD: gas detection.
    svg: svg(
      40,
      40,
      `<circle cx="20" cy="20" r="15" fill="#ffffff" stroke="${INK}" stroke-width="1.4"/>${text(20, 24, 'GD', 10)}`,
    ),
  },
  'emergency-stop': {
    file: 'symbol-emergency-stop.svg',
    width: 40,
    height: 40,
    // The red mushroom head on its yellow ground.
    svg: svg(
      40,
      40,
      `<circle cx="20" cy="20" r="17" fill="#f2c200" stroke="${INK}" stroke-width="1.4"/><circle cx="20" cy="20" r="10" fill="#c8261c" stroke="${INK}" stroke-width="1.2"/>`,
    ),
  },
};
