/**
 * A switch-fuse's workings, after the TP&N switch-fuses of around 2000
 * (MEM Memshield, Crabtree): a handle, a door interlocked with it, and
 * three fuse carriers, one a phase, behind the door. Pure.
 *
 * The interlock: the door opens only with the handle OFF, and the handle
 * goes ON only with the door shut, so the carriers are dead whenever they
 * can be reached. A carrier pulled out comes out with its fuse, whole or
 * blown; pushed back in, it carries a new one. The supply goes on through
 * only with the handle ON and every carrier in, its fuse whole.
 */

/** A fuse carrier: in its contacts, out of them, or in with its fuse blown. */
export type Carrier = 'in' | 'out' | 'blown';

export interface SwitchFuseState {
  on: boolean;
  doorOpen: boolean;
  carriers: readonly [Carrier, Carrier, Carrier];
}

export type SwitchFuseAction =
  | { kind: 'handle' }
  | { kind: 'door' }
  | { kind: 'carrier'; phase: 0 | 1 | 2 };

export interface SwitchFuseOutcome {
  state: SwitchFuseState;
  /** Why nothing happened, if nothing did. */
  refused?: string;
}

export const newSwitchFuse = (on = true): SwitchFuseState => ({
  on,
  doorOpen: false,
  carriers: ['in', 'in', 'in'],
});

/** What one action does to it. */
export function workSwitchFuse(
  s: SwitchFuseState,
  action: SwitchFuseAction,
): SwitchFuseOutcome {
  switch (action.kind) {
    case 'handle':
      // Switching ON with the door open is blocked by the interlock.
      if (!s.on && s.doorOpen)
        return { state: s, refused: 'Interlocked: close the door first' };
      return { state: { ...s, on: !s.on } };
    case 'door':
      if (!s.doorOpen && s.on)
        return { state: s, refused: 'Interlocked: switch OFF first' };
      return { state: { ...s, doorOpen: !s.doorOpen } };
    case 'carrier': {
      if (!s.doorOpen) return { state: s, refused: 'The door is shut' };
      const carriers = [...s.carriers] as [Carrier, Carrier, Carrier];
      // Out it comes, blown or not; back in, with a new fuse.
      carriers[action.phase] = carriers[action.phase] === 'out' ? 'in' : 'out';
      return { state: { ...s, carriers } };
    }
  }
}

/** A fuse blown (by a fault downstream): its carrier stays in, dead. */
export function blowFuse(
  s: SwitchFuseState,
  phase: 0 | 1 | 2,
): SwitchFuseState {
  if (s.carriers[phase] !== 'in') return s;
  const carriers = [...s.carriers] as [Carrier, Carrier, Carrier];
  carriers[phase] = 'blown';
  return { ...s, carriers };
}

/** Whether power goes on through it, given whether it reaches it. */
export const switchFuseOutput = (s: SwitchFuseState, supplied = true) =>
  supplied && s.on && s.carriers.every((c) => c === 'in');
