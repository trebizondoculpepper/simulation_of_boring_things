/**
 * Dev44's transfer trial (the owner, 2026-10-26: pipe an idealised source
 * into the tanks and see them fill; one transfer set per chemical, not one
 * per pool, sent to each day tank in turn by a transfer selector): an
 * endless source, the transfer pump, a selector
 * manifold with one actuated valve to each plant room's day tank, and the
 * day tanks, each dosing itself down. Pure.
 *
 * One transfer pump, not a duty and standby pair (the owner, 2026-10-26:
 * light work beside the water pumps', and one that fails is soon swapped).
 *
 * - A day tank calls at its low switch (20%) and stops calling at its
 *   high switch (90%).
 * - The selector in AUTO serves the calling tanks one at a time, in turn;
 *   in HAND it serves the tank picked, while it is below high. Only the
 *   served tank's valve is open.
 * - The pump runs in AUTO or HAND while a tank is served (HAND being the
 *   selector's way of forcing a branch). A tank's high-high switch (98%) trips the
 *   pumps and shuts every valve, whatever is selected, until RESET.
 * - Each tank doses down while its circulation is proven.
 */

export type Hoa = 'hand' | 'off' | 'auto';

export interface DayTank {
  name: string;
  litres: number;
  capacity: number;
  /** Its low switch has called, and its high switch not yet stopped it. */
  calling: boolean;
  /** Its dosing draw, litres a minute; 0 while its circulation is off. */
  doseLpm: number;
}

export interface TransferTrial {
  tanks: DayTank[];
  /** The selector: serving the calls in turn, or the one picked. */
  mode: 'auto' | 'hand';
  pick: number;
  /** The tank whose valve is open now, if any. */
  serving: number | null;
  /** The pump's selector. */
  hoa: Hoa;
  /** High-high reached: the pumps tripped and the valves shut until reset. */
  tripped: boolean;
  /** Litres delivered from the source, all told. */
  delivered: number;
}

export const TRANSFER = {
  /** A transfer pump's flow through an open branch, litres a minute. */
  pumpLpm: 20,
  low: 0.2,
  high: 0.9,
  highHigh: 0.98,
} as const;

export const TRIAL_TANKS = [
  'LOUNGE PL1',
  'OLYMPIC PL2',
  'JACUZZI PL3',
  'FOOTBATH PL4',
];

export function newTransferTrial(
  names: readonly string[] = TRIAL_TANKS,
  capacity = 300,
): TransferTrial {
  return {
    tanks: names.map((name, i) => ({
      name,
      litres: capacity * (0.75 - i * 0.15),
      capacity,
      calling: false,
      doseLpm: 2 + i * 0.5,
    })),
    mode: 'auto',
    pick: 0,
    serving: null,
    hoa: 'auto',
    tripped: false,
    delivered: 0,
  };
}

export const levelOf = (tank: DayTank) => tank.litres / tank.capacity;

/** Whether the pump runs now. */
export function pumpRunning(s: TransferTrial): boolean {
  return !s.tripped && s.serving !== null && s.hoa !== 'off';
}

/** Whether tank `i`'s branch valve is open. */
export const valveOpen = (s: TransferTrial, i: number) => s.serving === i;

/** Which tank the selector serves now. */
function serve(s: TransferTrial): number | null {
  if (s.tripped) return null;
  if (s.mode === 'hand') {
    const t = s.tanks[s.pick];
    return t && levelOf(t) < TRANSFER.high ? s.pick : null;
  }
  // AUTO: keep on the one being served while it calls; then the next
  // calling one after it, round.
  if (s.serving !== null && s.tanks[s.serving]?.calling) return s.serving;
  const n = s.tanks.length;
  const from = s.serving === null ? 0 : s.serving + 1;
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    if (s.tanks[i].calling) return i;
  }
  return null;
}

/** `seconds` on: the switches, the selector, the pumps, the filling and the dosing. */
export function stepTransfer(s: TransferTrial, seconds: number): TransferTrial {
  // The switches.
  let tripped = s.tripped;
  let tanks = s.tanks.map((t) => {
    const level = levelOf(t);
    if (level >= TRANSFER.highHigh) tripped = true;
    if (level >= TRANSFER.high) return t.calling ? { ...t, calling: false } : t;
    if (level <= TRANSFER.low) return t.calling ? t : { ...t, calling: true };
    return t;
  });
  let next: TransferTrial = { ...s, tanks, tripped };
  next = { ...next, serving: serve(next) };
  // The pumps fill the served tank; every tank doses.
  const inflow = pumpRunning(next) ? (TRANSFER.pumpLpm * seconds) / 60 : 0;
  tanks = next.tanks.map((t, i) => {
    const added = i === next.serving ? inflow : 0;
    const litres = t.litres + added - (t.doseLpm * seconds) / 60;
    return { ...t, litres: Math.min(t.capacity, Math.max(0, litres)) };
  });
  return {
    ...next,
    tanks,
    delivered: next.delivered + (next.serving === null ? 0 : inflow),
  };
}

export type TransferAction =
  | { act: 'hoa'; to: Hoa }
  | { act: 'mode'; to: 'auto' | 'hand' }
  | { act: 'pick'; tank: number }
  | { act: 'reset' }
  | { act: 'dosing'; tank: number; lpm: number };

export function actOnTransfer(
  s: TransferTrial,
  a: TransferAction,
): TransferTrial {
  switch (a.act) {
    case 'hoa':
      return { ...s, hoa: a.to };
    case 'mode':
      return { ...s, mode: a.to };
    case 'pick':
      return { ...s, pick: Math.max(0, Math.min(s.tanks.length - 1, a.tank)) };
    case 'reset':
      return s.tanks.every((t) => levelOf(t) < TRANSFER.highHigh)
        ? { ...s, tripped: false }
        : s;
    case 'dosing':
      return {
        ...s,
        tanks: s.tanks.map((t, i) =>
          i === a.tank ? { ...t, doseLpm: a.lpm } : t,
        ),
      };
  }
}

// ---- What a tank says of itself -------------------------------------------

/**
 * How a tank's level is moving, litres a minute (filling positive),
 * smoothed over the last several seconds so a moment's step reads steady.
 */
export function levelTrend(seconds = 6) {
  let last: number | null = null;
  let rate = 0;
  return {
    sample(litres: number, delta: number) {
      if (last !== null && delta > 0) {
        const now = ((litres - last) / delta) * 60;
        const k = Math.min(1, delta / seconds);
        rate += (now - rate) * k;
      }
      last = litres;
    },
    lpm: () => rate,
  };
}

/**
 * A tank in words, as its display and its sound would tell a passer-by
 * (the owner, 2026-10-26: what it holds, how full, filling or draining,
 * slowly or quickly): "Hydrochloric acid day tank, about 62% full,
 * filling slowly".
 */
export function describeTank(name: string, level: number, lpm: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, level)) * 100);
  const full = pct >= 99 ? 'full' : pct <= 1 ? 'empty' : `about ${pct}% full`;
  const speed = Math.abs(lpm) >= 5 ? 'quickly' : 'slowly';
  const moving =
    Math.abs(lpm) < 0.2
      ? 'steady'
      : `${lpm > 0 ? 'filling' : 'draining'} ${speed}`;
  return `${name}, ${full}, ${moving}`;
}
