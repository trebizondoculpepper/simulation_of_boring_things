/**
 * A road tank container's bottom discharge (prompt 097): a 20 ft ISO tank
 * of a bulk pool chemical, after the T11 tank containers the chemical
 * hauliers run, discharged from its rear end through a foot valve inside
 * the tank (worked by a handle outside), an outlet ball valve, and a
 * dry-break coupling with its dust cap. Pure; litres and seconds.
 *
 * - Nothing leaves while either valve is shut, or the coupling is capped.
 * - Both open and the coupling connected to a hose, it delivers at the
 *   hose's rate (to a store's fill, later).
 * - Both open and the coupling neither capped nor connected, it spills on
 *   the ground at a gravity outlet's rate: an incident, recorded.
 * - The gauge at the outlet reads the liquid's head over it: its depth,
 *   and the chemical's density.
 */

export type TankChemical = 'hypochlorite' | 'acid';

/** What each chemical is, for its placards and its gauge. */
export const TANK_CHEMICAL: Record<
  TankChemical,
  {
    name: string;
    un: string;
    hazard: string;
    /** Its Hazchem Emergency Action Code, for a UK tanker's plates. */
    eac: string;
    density: number;
  }
> = {
  hypochlorite: {
    name: 'SODIUM HYPOCHLORITE SOLUTION',
    un: '1791',
    hazard: '80',
    eac: '2X',
    density: 1.2,
  },
  acid: {
    name: 'HYDROCHLORIC ACID',
    un: '1789',
    hazard: '80',
    eac: '2R',
    density: 1.05,
  },
};

export const ISO_TANK = {
  /** Its capacity, litres: a 20 ft T11 of about 24,000. */
  capacity: 24000,
  /** The barrel's inside diameter, metres. */
  diameter: 2.3,
  /** A gravity outlet's flow, litres a second (DN80, about 350 a minute). */
  spill: 6,
  /** Through a delivery hose to a fill point, litres a second. */
  delivery: 5,
} as const;

export type Coupling = 'capped' | 'open' | 'connected';

export interface IsoTank {
  chemical: TankChemical;
  litres: number;
  foot: boolean;
  outlet: boolean;
  coupling: Coupling;
  /** Litres spilled since it came: on the ground, not delivered. */
  spilled: number;
  /** Litres delivered through a connected hose. */
  delivered: number;
}

export const newIsoTank = (
  chemical: TankChemical,
  litres: number = ISO_TANK.capacity * 0.95,
): IsoTank => ({
  chemical,
  litres,
  foot: false,
  outlet: false,
  coupling: 'capped',
  spilled: 0,
  delivered: 0,
});

/** The rate it is discharging at now, litres a second, and where to. */
export function dischargeOf(t: IsoTank): {
  rate: number;
  to: 'none' | 'hose' | 'ground';
} {
  if (!t.foot || !t.outlet || t.litres <= 0 || t.coupling === 'capped')
    return { rate: 0, to: 'none' };
  return t.coupling === 'connected'
    ? { rate: ISO_TANK.delivery, to: 'hose' }
    : { rate: ISO_TANK.spill, to: 'ground' };
}

/** It `dt` seconds on. */
export function stepIsoTank(t: IsoTank, dt: number): IsoTank {
  if (!(dt > 0)) return t;
  const { rate, to } = dischargeOf(t);
  if (to === 'none') return t;
  const out = Math.min(t.litres, rate * dt);
  return {
    ...t,
    litres: t.litres - out,
    spilled: t.spilled + (to === 'ground' ? out : 0),
    delivered: t.delivered + (to === 'hose' ? out : 0),
  };
}

/**
 * The liquid's depth in a horizontal cylinder holding `litres` of
 * `capacity`, metres: the depth whose segment's share of the circle is the
 * share of the volume (solved by bisection).
 */
export function cylinderDepth(
  litres: number,
  capacity: number,
  diameter: number,
): number {
  const share = Math.max(0, Math.min(1, litres / capacity));
  const r = diameter / 2;
  const segment = (h: number) => {
    const theta = 2 * Math.acos((r - h) / r);
    return (theta - Math.sin(theta)) / (2 * Math.PI);
  };
  let lo = 0;
  let hi = diameter;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (segment(mid) < share) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** What its outlet gauge reads, bar: the head of liquid over the outlet. */
export function outletPressure(t: IsoTank): number {
  const depth = cylinderDepth(t.litres, ISO_TANK.capacity, ISO_TANK.diameter);
  return (TANK_CHEMICAL[t.chemical].density * 1000 * 9.81 * depth) / 1e5;
}

/** What it shows of itself, for inspection. */
export function isoTankStatus(t: IsoTank): string {
  const { to } = dischargeOf(t);
  const state =
    to === 'ground'
      ? 'SPILLING'
      : to === 'hose'
        ? 'discharging'
        : t.foot && t.outlet
          ? 'valves open, capped'
          : 'valves shut';
  return `${Math.round(t.litres).toLocaleString('en-GB')} L, ${state}`;
}
