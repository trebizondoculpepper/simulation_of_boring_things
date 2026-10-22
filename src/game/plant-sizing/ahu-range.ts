/**
 * The pool hall air handling units the building uses: the Dantherm DanX
 * XWPS range (a double-deck pool unit with a cross-flow plate heat
 * exchanger and a heat pump), as Dantherm's data sheet gives it
 * (danthermgroup.com, "Dantherm DanX XWPS", print view): each size's
 * nominal and greatest airflow, m³/h, and its casing, metres (length
 * along the airflow, height, depth), and weight, kg. Ours are Mistral's.
 */
export interface AhuSize {
  model: string;
  nominal: number;
  max: number;
  length: number;
  height: number;
  depth: number;
  kg: number;
}

export const DANX_XWPS: readonly AhuSize[] = [
  {
    model: '2/4',
    nominal: 3350,
    max: 4500,
    length: 3.665,
    height: 1.66,
    depth: 0.88,
    kg: 1150,
  },
  {
    model: '3/6',
    nominal: 4500,
    max: 6000,
    length: 4.135,
    height: 1.96,
    depth: 0.88,
    kg: 1300,
  },
  {
    model: '5/10',
    nominal: 8400,
    max: 10000,
    length: 4.135,
    height: 1.96,
    depth: 1.4,
    kg: 1800,
  },
  {
    model: '7/14',
    nominal: 12500,
    max: 14000,
    length: 4.275,
    height: 2.12,
    depth: 1.9,
    kg: 2300,
  },
  {
    model: '9/18',
    nominal: 15500,
    max: 20000,
    length: 4.66,
    height: 2.25,
    depth: 1.8,
    kg: 2700,
  },
  {
    model: '12/24',
    nominal: 21500,
    max: 26000,
    length: 4.95,
    height: 2.76,
    depth: 2.2,
    kg: 3650,
  },
  {
    model: '16/32',
    nominal: 25500,
    max: 32000,
    length: 5.868,
    height: 3.01,
    depth: 2.2,
    kg: 4600,
  },
];

/**
 * The largest unit the building stacks: the 9/18. Two of them, one on
 * the other, stand 4.65 m, under the air plant's services ceiling; a
 * larger hall takes more of them.
 */
export const STACKED_MAX = DANX_XWPS.find((s) => s.model === '9/18')!;

/** The smallest size whose greatest airflow covers `airflow` m³/h (the largest, if none). */
export function ahuSizeFor(airflow: number): AhuSize {
  return (
    DANX_XWPS.find((s) => s.max >= airflow) ?? DANX_XWPS[DANX_XWPS.length - 1]
  );
}

/** The air velocity its ducts are sized for, m/s. */
export const DUCT_VELOCITY = 6;

/**
 * A size's duct connections, metres: rectangular, as wide (across the
 * unit) as its casing allows less 0.3 m (to the 50 mm below), at most
 * 1.2 m, and deep enough to carry its greatest airflow at
 * `DUCT_VELOCITY`, rounded up to 50 mm.
 */
export function ductSize(size: AhuSize) {
  const area = size.max / 3600 / DUCT_VELOCITY;
  const w = Math.min(1.2, Math.floor((size.depth - 0.3) * 20) / 20);
  const h = Math.ceil((area / w) * 20) / 20;
  return { w, h };
}
