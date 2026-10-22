/**
 * The long-coupled end-suction pump set's layout along its shaft
 * (`createEndSuctionPump`, after the Grundfos NK 150-315 with a 30 kW
 * frame-200L motor), in metres from the set's middle, the shaft along x
 * with the suction toward −x. Each part along the shaft ends where the next
 * begins: volute, bearing bracket, coupling guard, the motor's smooth
 * drive-end shield, its finned frame, its fan cowl. The guard spans the gap
 * between the bracket and the shield, around the coupling, and so never
 * reaches the motor's fins. Pure.
 */

/** A part's extent along the shaft, from `x0` to `x1`. */
export interface ShaftSpan {
  readonly name: string;
  readonly x0: number;
  readonly x1: number;
}

/** The set's length over its base frame. */
export const PUMP_SET_LENGTH = 1.9;
/** Shaft centre above the floor. */
export const PUMP_SHAFT_Y = 0.68;
/** Top of the base frame's deck plate, which the guard stands on. */
export const PUMP_DECK_TOP = 0.232;

const VOLUTE_LENGTH = 0.26;
const BRACKET_LENGTH = 0.36;
/** Room for the spacer coupling between the bracket and the motor. */
const GUARD_LENGTH = 0.22;
const SHIELD_LENGTH = 0.06;
const FRAME_LENGTH = 0.56;
const COWL_LENGTH = 0.16;

/** The motor's frame radius (IEC 200L) and its fins' depth. */
export const MOTOR_RADIUS = 0.2;
export const FIN_DEPTH = 0.012;
/** The coupling's radius (a spacer coupling for a 55 mm shaft). */
export const COUPLING_RADIUS = 0.09;

export function endSuctionPumpLayout() {
  const voluteStart = -PUMP_SET_LENGTH / 2 + 0.25;
  const volute: ShaftSpan = {
    name: 'volute',
    x0: voluteStart,
    x1: voluteStart + VOLUTE_LENGTH,
  };
  const bracket: ShaftSpan = {
    name: 'bearing bracket',
    x0: volute.x1,
    x1: volute.x1 + BRACKET_LENGTH,
  };
  const guard: ShaftSpan = {
    name: 'coupling guard',
    x0: bracket.x1,
    x1: bracket.x1 + GUARD_LENGTH,
  };
  const shield: ShaftSpan = {
    name: 'drive-end shield',
    x0: guard.x1,
    x1: guard.x1 + SHIELD_LENGTH,
  };
  const frame: ShaftSpan = {
    name: 'motor frame',
    x0: shield.x1,
    x1: shield.x1 + FRAME_LENGTH,
  };
  const cowl: ShaftSpan = {
    name: 'fan cowl',
    x0: frame.x1,
    x1: frame.x1 + COWL_LENGTH,
  };
  /** The fins stand on the frame alone, clear of the shield. */
  const fins = { x0: frame.x0 + 0.03, x1: frame.x1 - 0.03 };
  /**
   * The guard's square section about the shaft: three quarters of the
   * motor's radius, so it sits inside the shield's face and still clears
   * the coupling; it stands on the deck on two legs.
   */
  const guardHalf = MOTOR_RADIUS * 0.75;
  return {
    volute,
    bracket,
    guard,
    shield,
    frame,
    cowl,
    fins,
    guardHalf,
    /** The parts along the shaft, in order from the suction end. */
    spans: [volute, bracket, guard, shield, frame, cowl],
  };
}

export type EndSuctionPumpLayout = ReturnType<typeof endSuctionPumpLayout>;

/**
 * Every clash in a pump set's layout, as sentences (none when it is
 * sound): parts along the shaft that overlap or leave a gap, fins off the
 * frame, a guard that does not hold the coupling, overhangs the shield's
 * face or sinks into the deck.
 */
export function endSuctionPumpClashes(p: EndSuctionPumpLayout): string[] {
  const out: string[] = [];
  const eps = 1e-9;
  for (const s of p.spans)
    if (s.x1 <= s.x0) out.push(`the ${s.name} has no length`);
  for (let i = 1; i < p.spans.length; i++) {
    const a = p.spans[i - 1];
    const b = p.spans[i];
    if (b.x0 < a.x1 - eps) out.push(`the ${b.name} cuts into the ${a.name}`);
    if (b.x0 > a.x1 + eps) out.push(`a gap between ${a.name} and ${b.name}`);
  }
  if (p.fins.x0 < p.frame.x0 - eps || p.fins.x1 > p.frame.x1 + eps)
    out.push('the fins run off the motor frame');
  if (p.guardHalf <= COUPLING_RADIUS)
    out.push('the coupling guard does not hold the coupling');
  if (p.guardHalf >= MOTOR_RADIUS)
    out.push('the coupling guard overhangs the drive-end shield');
  if (PUMP_SHAFT_Y - p.guardHalf < PUMP_DECK_TOP)
    out.push('the coupling guard sinks into the deck');
  if (p.spans[0].x0 < -PUMP_SET_LENGTH / 2 || p.cowl.x1 > PUMP_SET_LENGTH / 2)
    out.push('the set overhangs its base frame');
  return out;
}
