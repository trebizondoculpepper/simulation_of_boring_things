/**
 * Leak detection on double-contained chemical pipe (researched
 * 2026-10-27, after nVent Raychem's TT-MINI-PROBE and GF Piping Systems'
 * low-point monitors). Pure.
 *
 * - The annulus: what has leaked from the carrier into the containment
 *   pipe collects at a low point, where a tee carries a drain valve, a
 *   sight tube and a conductivity probe. The probe is wet once about 3 mm
 *   of liquid stands on its electrodes (`PROBE_WET_LITRES` here).
 * - The monitor: a zone per probe. A wet probe latches its zone's LEAK and
 *   sounds the sounder; SILENCE quiets the sounder and steadies the lamp;
 *   RESET clears a zone only once its probe is dry (the annulus drained);
 *   a broken probe lead shows FAULT; TEST lights everything while held.
 *
 * Nothing in the plant leaks yet, so for now a monitor watches only what
 * its own annulus is given (a seep, in a demonstration); its state is its
 * own, not the world's.
 */

export const PROBE_WET_LITRES = 0.004;
/** How fast an open drain valve empties the low point, litres a second. */
export const DRAIN_LPS = 0.02;

export interface LowPoint {
  /** Litres standing in the annulus at the low point. */
  litres: number;
  /** Its drain valve, open or shut. */
  drainOpen: boolean;
}

export const newLowPoint = (): LowPoint => ({ litres: 0, drainOpen: false });

export const probeWet = (p: LowPoint) => p.litres >= PROBE_WET_LITRES;

/** The low point `dt` seconds on, `seepLps` coming in from a leak. */
export function stepLowPoint(
  p: LowPoint,
  seepLps: number,
  dt: number,
): LowPoint {
  const out = p.drainOpen ? DRAIN_LPS * dt : 0;
  return { ...p, litres: Math.max(0, p.litres + seepLps * dt - out) };
}

export interface LeakZone {
  latched: boolean;
  fault: boolean;
}

export interface LeakMonitor {
  zones: LeakZone[];
  silenced: boolean;
  /** Seconds of lamp test left (TEST held). */
  testing: number;
  /** For flashing. */
  time: number;
}

export function newLeakMonitor(zones = 4): LeakMonitor {
  return {
    zones: Array.from({ length: zones }, () => ({
      latched: false,
      fault: false,
    })),
    silenced: false,
    testing: 0,
    time: 0,
  };
}

/**
 * The monitor `dt` seconds on: `wet[i]` whether zone i's probe is wet,
 * `broken[i]` whether its lead is open circuit.
 */
export function stepLeakMonitor(
  m: LeakMonitor,
  wet: readonly boolean[],
  broken: readonly boolean[],
  dt: number,
): LeakMonitor {
  let fresh = false;
  const zones = m.zones.map((z, i) => {
    const fault = !!broken[i];
    const latched = z.latched || (!fault && !!wet[i]);
    if (latched && !z.latched) fresh = true;
    return { latched, fault };
  });
  return {
    zones,
    // A new leak sounds again even if an earlier one was silenced.
    silenced: fresh ? false : m.silenced,
    testing: Math.max(0, m.testing - dt),
    time: m.time + dt,
  };
}

export type LeakMonitorAction = 'silence' | 'reset' | 'test';

export function actOnLeakMonitor(
  m: LeakMonitor,
  a: LeakMonitorAction,
  wet: readonly boolean[],
): LeakMonitor {
  switch (a) {
    case 'silence':
      return { ...m, silenced: true };
    case 'test':
      return { ...m, testing: 2 };
    case 'reset': {
      const zones = m.zones.map((z, i) => ({
        ...z,
        latched: z.latched && !!wet[i],
      }));
      return {
        ...m,
        zones,
        silenced: zones.some((z) => z.latched) ? m.silenced : false,
      };
    }
  }
}

/** What the monitor shows: its lamps and its sounder. */
export function leakMonitorShows(m: LeakMonitor) {
  const test = m.testing > 0;
  const flash = Math.floor(m.time * 2) % 2 === 0;
  const anyLatched = m.zones.some((z) => z.latched);
  return {
    power: true,
    leak: m.zones.map((z) => test || (z.latched && (m.silenced || flash))),
    fault: test || m.zones.some((z) => z.fault),
    sounder: test || (anyLatched && !m.silenced),
  };
}
