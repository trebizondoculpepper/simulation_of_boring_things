/**
 * Who runs the pool's filter pumps: the plant room's local control panel
 * or the control room. Pure.
 *
 * Each pump has a HAND · OFF · AUTO selector on its local panel: HAND runs
 * it, OFF stops it, AUTO leaves it to the plant's controls (the time
 * schedule), unless a START or STOP has been given. The panel's LOCAL ·
 * REMOTE key switch says where START and STOP may come from: the local
 * panel's buttons always work; the control room's only in REMOTE. A pump
 * whose overload has tripped runs for no one.
 */

export const HAND = 0,
  OFF = 1,
  AUTO = 2;

export type PumpId = 'p1' | 'p2';
export const PUMPS: readonly PumpId[] = ['p1', 'p2'];

export interface PumpControl {
  /** The HAND · OFF · AUTO selector's position. */
  hoa: number;
  /** A START (true) or STOP (false) given in AUTO, or none. */
  command: boolean | null;
}

export interface PumpControls {
  /** The local panel's key switch: whether the control room may command. */
  remote: boolean;
  pumps: Record<PumpId, PumpControl>;
}

export function newPumpControls(): PumpControls {
  return {
    remote: true,
    pumps: {
      p1: { hoa: AUTO, command: null },
      p2: { hoa: AUTO, command: null },
    },
  };
}

/** Turn a pump's HAND · OFF · AUTO selector; any START or STOP lapses. */
export function setHoa(c: PumpControls, id: PumpId, hoa: number): PumpControls {
  if (c.pumps[id].hoa === hoa) return c;
  return { ...c, pumps: { ...c.pumps, [id]: { hoa, command: null } } };
}

/**
 * START or STOP pressed for a pump, `from` the local panel or the control
 * room. Refused (the controls unchanged) from the control room in LOCAL,
 * and whenever the pump is not in AUTO.
 */
export function command(
  c: PumpControls,
  id: PumpId,
  start: boolean,
  from: 'local' | 'remote',
): PumpControls {
  if (from === 'remote' && !c.remote) return c;
  if (c.pumps[id].hoa !== AUTO) return c;
  return {
    ...c,
    pumps: { ...c.pumps, [id]: { ...c.pumps[id], command: start } },
  };
}

/** What a pump does: 0 running, 1 stopped, 2 faulted (tripped). */
export function pumpState(
  c: PumpControls,
  id: PumpId,
  /** Whether the plant's controls want it running. */
  scheduled: boolean,
  tripped: boolean,
): 0 | 1 | 2 {
  if (tripped) return 2;
  const p = c.pumps[id];
  const runs = p.hoa === HAND || (p.hoa === AUTO && (p.command ?? scheduled));
  return runs ? 0 : 1;
}
