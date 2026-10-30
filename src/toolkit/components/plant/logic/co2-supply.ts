/**
 * A CO₂ cylinder supply (mission 109, stage 1): banks of CO₂ cylinders
 * drawn as gas, after the 34 kg cylinders an industrial gas supplier
 * rents, on a two-bank automatic changeover manifold (after the lever-type
 * changeover manifolds of BOC or Gas Arc), its regulator reducing the
 * cylinders' pressure to the low-pressure line's, and the line's emergency
 * isolation valve at the wall. Pure.
 *
 * A cylinder of CO₂ holds liquid under its own vapour: while any liquid is
 * left its pressure is the vapour pressure at its temperature (about 57 bar
 * at 20 °C), whatever its contents; only when the last liquid has boiled
 * off does its pressure fall, with the gas left. So a bank's gauge stands
 * steady through most of its life and then drops, and the manifold changes
 * over when it falls below the changeover pressure.
 */

/** A cylinder's size: the largest single CO₂ cylinder a supplier rents. */
export const CO2_CYLINDER = {
  /** CO₂ when full, kg. */
  contents: 34,
  /** Its water capacity, litres (filled to 0.667 kg/l). */
  litres: 50,
} as const;

/** The manifold's settings. */
export const CO2_MANIFOLD = {
  /** Cylinders on each bank. */
  perBank: 4,
  /** A bank below this, bar gauge, is spent: the manifold changes over. */
  changeover: 10,
  /** The regulator's outlet, bar gauge: the low-pressure line's. */
  outlet: 4,
  /** The regulator needs this much above its outlet to hold it, bar. */
  margin: 1,
} as const;

/**
 * CO₂'s vapour pressure, bar absolute, by temperature, °C (NIST): the
 * pressure in a cylinder while it still holds liquid.
 */
const VAPOUR: readonly (readonly [number, number])[] = [
  [-20, 19.7],
  [-10, 26.5],
  [0, 34.9],
  [10, 45.0],
  [20, 57.3],
  [30, 72.1],
];
/** Saturated vapour's density at the same temperatures, kg/m³ (NIST). */
const VAPOUR_DENSITY: readonly (readonly [number, number])[] = [
  [-20, 51.7],
  [-10, 71.1],
  [0, 97.6],
  [10, 135.0],
  [20, 194.2],
  [30, 345.0],
];

const interpolate = (
  table: readonly (readonly [number, number])[],
  x: number,
) => {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
};

/** CO₂'s vapour pressure at `celsius`, bar gauge. */
export const vapourPressure = (celsius: number) =>
  interpolate(VAPOUR, Math.min(30, celsius)) - 1;

/**
 * A cylinder's pressure, bar gauge, holding `kg` of CO₂ at `celsius`: the
 * vapour pressure while liquid is left; below that, with only gas, falling
 * in proportion to the gas left.
 */
export function cylinderPressure(kg: number, celsius: number): number {
  if (kg <= 0) return 0;
  const allGas =
    (interpolate(VAPOUR_DENSITY, Math.min(30, celsius)) * CO2_CYLINDER.litres) /
    1000;
  const saturated = vapourPressure(celsius);
  if (kg >= allGas) return saturated;
  return Math.max(0, ((saturated + 1) * kg) / allGas - 1);
}

export type Co2Bank = 'left' | 'right';
export const CO2_BANKS: readonly Co2Bank[] = ['left', 'right'];

/** A cylinder on the manifold: what is in it, and its valve. */
export interface Co2Cylinder {
  kg: number;
  /** Its valve open onto the manifold. */
  open: boolean;
}

export interface Co2Supply {
  /** Each bank's cylinders, in order along the manifold. */
  banks: Record<Co2Bank, Co2Cylinder[]>;
  /** The lever: the bank in service; the other is the reserve. */
  service: Co2Bank;
  /** The emergency isolation valve at the wall, open. */
  isolation: boolean;
  /** The air's temperature in the cage, °C. */
  ambient: number;
}

const fullCylinder = (): Co2Cylinder => ({
  kg: CO2_CYLINDER.contents,
  open: true,
});

/** A new supply: both banks full and open, the left in service, the line open. */
export const newCo2Supply = (ambient = 12): Co2Supply => ({
  banks: {
    left: Array.from({ length: CO2_MANIFOLD.perBank }, fullCylinder),
    right: Array.from({ length: CO2_MANIFOLD.perBank }, fullCylinder),
  },
  service: 'left',
  isolation: true,
  ambient,
});

/** CO₂ left in a bank's open cylinders, kg. */
export const bankContents = (s: Co2Supply, bank: Co2Bank) =>
  s.banks[bank].reduce((sum, c) => sum + (c.open ? c.kg : 0), 0);

/**
 * A bank's pressure, bar gauge, on its gauge: its open cylinders share one
 * header, so it is the highest of theirs (gas flows from the fuller ones).
 */
export const bankPressure = (s: Co2Supply, bank: Co2Bank) =>
  Math.max(
    0,
    ...s.banks[bank].map((c) =>
      c.open ? cylinderPressure(c.kg, s.ambient) : 0,
    ),
  );

export const otherBank = (bank: Co2Bank): Co2Bank =>
  bank === 'left' ? 'right' : 'left';

/**
 * The bank the manifold draws from now: the service bank until it falls
 * below the changeover pressure, then the reserve; none when both are spent.
 */
export function bankInUse(s: Co2Supply): Co2Bank | null {
  const spent = (b: Co2Bank) => bankPressure(s, b) < CO2_MANIFOLD.changeover;
  if (!spent(s.service)) return s.service;
  const reserve = otherBank(s.service);
  if (!spent(reserve)) return reserve;
  // Both under the changeover: whichever still has anything.
  if (bankPressure(s, s.service) > 0) return s.service;
  if (bankPressure(s, reserve) > 0) return reserve;
  return null;
}

/** What a bank's indicator flag shows. */
export type Co2Flag = 'in-use' | 'standby' | 'empty';

/**
 * Each bank's flag, as the manifold's indicator shows it: green IN USE on
 * the bank it draws from, red EMPTY on a spent bank, STANDBY on a full reserve.
 */
export function bankFlag(s: Co2Supply, bank: Co2Bank): Co2Flag {
  if (bankPressure(s, bank) < CO2_MANIFOLD.changeover) return 'empty';
  return bankInUse(s) === bank ? 'in-use' : 'standby';
}

/** The regulator's inlet and outlet, and the line beyond the isolation valve, bar gauge. */
export function co2Pressures(s: Co2Supply) {
  const using = bankInUse(s);
  const inlet = using ? bankPressure(s, using) : 0;
  const outlet = Math.max(
    0,
    Math.min(CO2_MANIFOLD.outlet, inlet - CO2_MANIFOLD.margin),
  );
  return { inlet, outlet, line: s.isolation ? outlet : 0 };
}

/** The lever thrown to the other bank: it becomes the service bank. */
export const throwLever = (s: Co2Supply): Co2Supply => ({
  ...s,
  service: otherBank(s.service),
});

/** The emergency isolation valve opened or shut. */
export const setIsolation = (s: Co2Supply, open: boolean): Co2Supply => ({
  ...s,
  isolation: open,
});

/**
 * `kg` of CO₂ drawn through the line: from the bank in use, its open
 * cylinders emptying together, a little at a time, so that once the bank
 * falls below the changeover the rest comes from the other. Nothing flows
 * with the isolation valve shut, nor once both banks are spent.
 */
export function drawCo2(s: Co2Supply, kg: number): Co2Supply {
  if (!s.isolation || kg <= 0) return s;
  let out = s;
  let left = kg;
  while (left > 1e-9) {
    const bank = bankInUse(out);
    if (!bank) break;
    const open = out.banks[bank].filter((c) => c.open && c.kg > 0);
    const has = open.reduce((sum, c) => sum + c.kg, 0);
    const take = Math.min(left, has, 0.5);
    if (take <= 1e-9) break;
    out = {
      ...out,
      banks: {
        ...out.banks,
        [bank]: out.banks[bank].map((c) =>
          c.open && c.kg > 0 ? { ...c, kg: c.kg - (take * c.kg) / has } : c,
        ),
      },
    };
    left -= take;
  }
  return out;
}

/** A cylinder on a bank exchanged for a full one, its valve shut until opened. */
export function exchangeCylinder(
  s: Co2Supply,
  bank: Co2Bank,
  index: number,
): Co2Supply {
  const banks = { ...s.banks, [bank]: [...s.banks[bank]] };
  banks[bank][index] = { kg: CO2_CYLINDER.contents, open: false };
  return { ...s, banks };
}

/** A cylinder's valve opened or shut. */
export function setCylinderValve(
  s: Co2Supply,
  bank: Co2Bank,
  index: number,
  open: boolean,
): Co2Supply {
  const banks = { ...s.banks, [bank]: [...s.banks[bank]] };
  banks[bank][index] = { ...banks[bank][index], open };
  return { ...s, banks };
}
