/**
 * Skip hire firms of our own invention, whose names and numbers are
 * stencilled on a skip's sides: one is chosen at random for each skip.
 * The names are made up to be unlikely to belong to anyone; the numbers
 * are all in Ofcom's range kept for drama (01632 960000 to 960999), so
 * none can reach a real line. Pure data.
 */

export interface SkipHirer {
  /** The name, one or two lines, as stencilled. */
  name: readonly [string] | readonly [string, string];
  phone: string;
}

export const SKIP_HIRERS: readonly SkipHirer[] = [
  { name: ['SKIPWORTH', '& DAUGHTERS'], phone: '01632 960471' },
  { name: ['PERPETUAL', 'SKIPS'], phone: '01632 960218' },
  { name: ['THE SKIP', 'EMPORIUM'], phone: '01632 960553' },
  { name: ['HAZLEDENE', 'RUBBLE & SONS'], phone: '01632 960907' },
  { name: ["ARCHIBALD'S", 'SKIPS'], phone: '01632 960134' },
  { name: ['SKIPS OF', 'DISTINCTION'], phone: '01632 960682' },
  { name: ['THRUPENNY', 'SKIP CO.'], phone: '01632 960345' },
  { name: ['MAGNIFICENT', 'SKIPS'], phone: '01632 960796' },
  { name: ['BROADSWORD', 'WASTE'], phone: '01632 960029' },
  { name: ['ONWARD', 'SKIPS LTD'], phone: '01632 960860' },
];

/** A hire firm chosen at random; `random` gives numbers in [0, 1). */
export const anySkipHirer = (random: () => number = Math.random) =>
  SKIP_HIRERS[Math.floor(random() * SKIP_HIRERS.length)];
