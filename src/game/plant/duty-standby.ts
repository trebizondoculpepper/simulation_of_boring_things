/**
 * Duty and standby pumps (scenario 1, `doc/prompts/done/024-scenario-duty-standby-pumps.md`):
 * two pump sets on shared suction and discharge headers, run by a
 * duty/standby controller. Pure.
 *
 * The controller:
 *
 * - the selector picks the duty pump; START runs the system, STOP stops it;
 * - it commands the lead pump (the duty, unless that is faulted) and
 *   watches its running feedback; if it has not started within the fail
 *   delay, it latches that pump's fault and DUTY FAIL, and leads with the
 *   other;
 * - with both faulted it runs neither and shows both;
 * - RESET clears each fault whose pump is available again, and DUTY FAIL
 *   with them; the duty then leads again.
 */

export type PumpIndex = 0 | 1;

export interface DutyStandbyState {
  /** The selected duty pump. */
  duty: PumpIndex;
  /** START pressed, not since stopped. */
  running: boolean;
  /** Each pump's latched fault. */
  fault: [boolean, boolean];
  /** DUTY FAIL: the standby has had to take over. */
  dutyFail: boolean;
  /** Seconds the lead pump has been commanded without running. */
  waiting: number;
}

/** How long a commanded pump has to show it is running, s. */
export const FAIL_DELAY = 3;

export const newDutyStandby = (): DutyStandbyState => ({
  duty: 0,
  running: true,
  fault: [false, false],
  dutyFail: false,
  waiting: 0,
});

/** The pump the controller leads with: the duty, unless it is faulted. */
export function leadPump(s: DutyStandbyState): PumpIndex | null {
  const other = (1 - s.duty) as PumpIndex;
  if (!s.fault[s.duty]) return s.duty;
  if (!s.fault[other]) return other;
  return null;
}

/** What the controller commands each pump to do. */
export function commands(s: DutyStandbyState): [boolean, boolean] {
  const lead = s.running ? leadPump(s) : null;
  return [lead === 0, lead === 1];
}

export type DutyStandbyEvent =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'reset'; available: [boolean, boolean] }
  | { type: 'select'; duty: PumpIndex };

export function pressDutyStandby(
  s: DutyStandbyState,
  e: DutyStandbyEvent,
): DutyStandbyState {
  switch (e.type) {
    case 'start':
      return { ...s, running: true, waiting: 0 };
    case 'stop':
      return { ...s, running: false, waiting: 0 };
    case 'select':
      return { ...s, duty: e.duty, waiting: 0 };
    case 'reset': {
      const fault: [boolean, boolean] = [
        s.fault[0] && !e.available[0],
        s.fault[1] && !e.available[1],
      ];
      return { ...s, fault, dutyFail: fault[0] || fault[1], waiting: 0 };
    }
  }
}

/** One step: `feedback` is whether each pump is running. */
export function stepDutyStandby(
  s: DutyStandbyState,
  feedback: [boolean, boolean],
  dt: number,
): DutyStandbyState {
  const lead = s.running ? leadPump(s) : null;
  if (lead === null) return { ...s, waiting: 0 };
  if (feedback[lead]) return { ...s, waiting: 0 };
  const waiting = s.waiting + dt;
  if (waiting < FAIL_DELAY) return { ...s, waiting };
  const fault: [boolean, boolean] = [...s.fault];
  fault[lead] = true;
  return { ...s, fault, dutyFail: true, waiting: 0 };
}

// ---- The water side ----------------------------------------------------------------

export interface PumpSetSpec {
  /** Its duty flow, m³/h, and its gauges there, bar. */
  flow: number;
  dischargeBar: number;
  suctionBar: number;
}

/**
 * How much of a running pump's flow comes back through an idle pump whose
 * non-return valve has jammed open (a working figure: the idle pump's
 * passage is a path of about the delivery's own resistance).
 */
export const RECIRCULATION = 0.35;

export interface PumpsHydraulics {
  /** Into the discharge header and out to the sink, m³/h. */
  delivered: number;
  /** Through each pump, forward (+) or back (−), m³/h. */
  through: [number, number];
  /** Each pump's gauges, and the discharge header's, bar. */
  suctionBar: [number, number];
  dischargeBar: [number, number];
  headerBar: number;
}

/**
 * The water side: each running pump gives its flow (two together share
 * the delivery, each giving its duty flow); an idle pump whose non-return
 * valve is shut passes nothing, its casing at suction pressure; one whose
 * valve has jammed open lets part of the running pump's water back
 * through it, so less is delivered and its casing sees the header's
 * pressure. `open` is whether the pumps' own isolating valves (suction
 * and discharge) are open.
 */
export function pumpsHydraulics(
  spec: PumpSetSpec,
  running: [boolean, boolean],
  open: [boolean, boolean],
  jammed: [boolean, boolean],
): PumpsHydraulics {
  const moving: [boolean, boolean] = [
    running[0] && open[0],
    running[1] && open[1],
  ];
  const n = Number(moving[0]) + Number(moving[1]);
  if (n === 0)
    return {
      delivered: 0,
      through: [0, 0],
      suctionBar: [0, 0],
      dischargeBar: [0, 0],
      headerBar: 0,
    };
  const forward = n * spec.flow;
  const through: [number, number] = [
    moving[0] ? spec.flow : 0,
    moving[1] ? spec.flow : 0,
  ];
  let back = 0;
  for (const i of [0, 1] as const)
    if (!moving[i] && jammed[i] && open[i]) {
      through[i] = -RECIRCULATION * forward;
      back += RECIRCULATION * forward;
    }
  // With water coming back, the running pump works against less: its head falls a little.
  const headerBar = spec.dischargeBar * (back > 0 ? 0.85 : 1);
  return {
    delivered: forward - back,
    through,
    suctionBar: [
      moving[0] ? spec.suctionBar : 0,
      moving[1] ? spec.suctionBar : 0,
    ],
    dischargeBar: [
      moving[0] || (jammed[0] && open[0]) ? headerBar : 0,
      moving[1] || (jammed[1] && open[1]) ? headerBar : 0,
    ],
    headerBar,
  };
}
