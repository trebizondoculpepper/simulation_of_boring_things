import type { ChosenKind } from './plumber';

/**
 * What pipework costs, installed (`doc/prompts/done/020-scorers-and-pipe-costs.md`):
 * an approximate price per metre for each kind and size of pipe, conduit
 * and duct, for the scorer to compare designs by. These are working
 * estimates, in pounds at about 2026 prices, for materials, supports and
 * fixing and labour together; they are for telling a dearer design from a
 * cheaper one, not quotations. Heavier costs more than lighter, steel more
 * than plastic, lagged more than bare. Pure.
 */

interface Price {
  /** £ a metre at `od`. */
  perMetre: number;
  /** The reference outside diameter, metres. */
  od: number;
  /** How price grows with size: per metre ∝ (od / ref) ^ this. */
  grows: number;
  why: string;
}

/** The table. Every figure is an estimate. */
export const PIPE_PRICES: Record<ChosenKind, Price> = {
  'pvc-pressure': {
    perMetre: 24,
    od: 0.05,
    grows: 1.2,
    why: 'PVC-U pressure pipe, solvent welded, clipped',
  },
  'pvc-drain': {
    perMetre: 32,
    od: 0.11,
    grows: 1.1,
    why: 'PVC-U soil and drain pipe, on brackets',
  },
  copper: {
    perMetre: 42,
    od: 0.022,
    grows: 0.9,
    why: 'copper tube, soldered or press fitted, clipped',
  },
  'steel-screwed': {
    perMetre: 62,
    od: 0.0269,
    grows: 0.9,
    why: 'heavy steel tube, screwed, on brackets',
  },
  stainless: {
    perMetre: 145,
    od: 0.0337,
    grows: 1,
    why: 'stainless steel tube, welded or press fitted',
  },
  'lagged-heating': {
    perMetre: 105,
    od: 0.0483,
    grows: 0.9,
    why: 'steel heating pipe, welded or screwed, with 40 mm of lagging and its cladding',
  },
  'chemical-tube': {
    perMetre: 12,
    od: 0.01,
    grows: 1,
    why: 'small-bore chemical dosing tube, in a carrier',
  },
  'twin-wall-flue': {
    perMetre: 330,
    od: 0.2,
    grows: 1,
    why: 'twin-wall stainless flue, with its supports',
  },
  'busbar-trunking': {
    perMetre: 260,
    od: 0.1,
    grows: 1.3,
    why: 'plug-in busbar trunking, its joint packs and brackets, installed',
  },
};

/** Conduit carrying cables: steel conduit, its cable, and pulling it in. */
export const CONDUIT_PRICE: Price = {
  perMetre: 34,
  od: 0.0213,
  grows: 1.1,
  why: 'steel conduit with its cable drawn in',
};

/** What each kind of fitting costs, installed, £: estimates. */
export const FITTING_PRICES = {
  'isolating-valve': (od: number) => 45 + 1800 * od,
  'non-return-valve': (od: number) => 70 + 2400 * od,
  'power-isolator': () => 120,
  'motorised-valve': () => 650,
  'solenoid-valve': () => 480,
} as const;

/** A run's price a metre, £. `conduit` for one carrying cables. */
export function pricePerMetre(
  kind: ChosenKind | string,
  od: number,
  { conduit = false }: { conduit?: boolean } = {},
): number {
  const price = conduit
    ? CONDUIT_PRICE
    : (PIPE_PRICES as Record<string, Price | undefined>)[kind];
  if (!price) return 50;
  return price.perMetre * Math.max(0.3, od / price.od) ** price.grows;
}
