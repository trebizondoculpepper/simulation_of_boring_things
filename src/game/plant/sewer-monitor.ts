/**
 * The sewer outfall's monitor (the owner, 2026-10-26): what the site puts
 * down the foul sewer, measured where it leaves (an electromagnetic
 * flowmeter on the outfall, its rate and its totaliser), and recorded by a
 * pen on a strip of chart paper. Pure; m³, m³/h, seconds.
 *
 * Everything the plant sends to the sewer passes it: the backwash pit's
 * discharge pump and its two gravity drains, its overflow if it ever
 * spills, and the big pools' drain-downs, which go direct. The spas'
 * drain-downs and washes go into the pit first (`pools.ts`), so the pit's
 * pump is the site's one controlled discharge.
 *
 * Its record is kept in the world, so the chart survives the player being
 * elsewhere and a reload: a sample every `SEWER_LOG.step` seconds, the
 * mean flow over it, for the last `SEWER_LOG.length` samples (a week).
 */

export const SEWER_LOG = {
  /** Seconds a sample spans: the chart's resolution. */
  step: 300,
  /** Samples kept: a week of them. */
  length: (7 * 24 * 3600) / 300,
} as const;

export interface SewerMonitorState {
  /** The flow now, m³/h. */
  flow: number;
  /** Its totaliser: everything to sewer since the world began, m³. */
  total: number;
  /** Its record: each sample's mean flow, m³/h, oldest first. */
  log: number[];
  /** What has passed in the sample being gathered, m³, and for how long, s. */
  gathering: number;
  gathered: number;
}

export const newSewerMonitor = (): SewerMonitorState => ({
  flow: 0,
  total: 0,
  log: [],
  gathering: 0,
  gathered: 0,
});

/** The monitor `dt` seconds on, `volume` m³ having gone to sewer in them. */
export function stepSewerMonitor(
  s: SewerMonitorState,
  volume: number,
  dt: number,
): SewerMonitorState {
  if (!(dt > 0)) return s;
  const v = Math.max(0, volume);
  let gathering = s.gathering + v;
  let gathered = s.gathered + dt;
  let log = s.log;
  // A sample closed for each whole step gathered, at its mean flow.
  while (gathered >= SEWER_LOG.step) {
    const share = SEWER_LOG.step / gathered;
    const sampled = gathering * share;
    log = [...log, (sampled / SEWER_LOG.step) * 3600];
    if (log.length > SEWER_LOG.length) log = log.slice(-SEWER_LOG.length);
    gathering -= sampled;
    gathered -= SEWER_LOG.step;
  }
  return {
    flow: (v / dt) * 3600,
    total: s.total + v,
    log,
    gathering,
    gathered,
  };
}

/** Whether it is putting more down the sewer than the consent allows, m³/h. */
export const overConsent = (s: SewerMonitorState, consent: number) =>
  s.flow > consent + 1e-6;

/**
 * Its recorder's chart (the owner, 2026-10-26): a strip of paper creeping
 * down past one pen at 20 mm an hour, a day showing in its window; its
 * scale 0 to 30 m³/h across, the consent ruled on it in red.
 */
export const SEWER_CHART = {
  hours: 24,
  scaleMax: 30,
} as const;

/** The samples showing on its chart now, newest last, each 0 to 1 across its scale. */
export function chartWindow(
  log: readonly number[],
  hours: number = SEWER_CHART.hours,
  scaleMax: number = SEWER_CHART.scaleMax,
): number[] {
  const n = Math.round((hours * 3600) / SEWER_LOG.step);
  return log.slice(-n).map((f) => Math.max(0, Math.min(1, f / scaleMax)));
}

/**
 * Any flow's record, as the sewer outfall's is kept: its flow now, its
 * total and a week's samples. The make-up water's is another (the owner,
 * 2026-10-26: a pen plotter of the water used).
 */
export type FlowRecord = SewerMonitorState;
export const newFlowRecord = newSewerMonitor;
export const stepFlowRecord = stepSewerMonitor;
