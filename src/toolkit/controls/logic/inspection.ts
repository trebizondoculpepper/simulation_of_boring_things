/**
 * Inspecting (prompt 061): what is under the pointer, or at the view's
 * centre, named in the help line, by its tag and name and what it does.
 * Inspecting only looks: it never uses anything. This is the timing: a
 * new target is shown once it has stayed under the aim a moment
 * (`INSPECT_DELAY_MS`), so the line does not flicker between neighbouring
 * parts; the same target's wording, which may carry a live status, is
 * shown as soon as it changes; losing the target clears it at once. Pure.
 */

/** How long a new target must stay under the aim before it is named, ms. */
export const INSPECT_DELAY_MS = 150;

/** How far inspecting reaches, metres (the use's reach, for now). */
export const INSPECT_REACH_METRES = 3;

/** What is aimed at: its stable key and its two lines. */
export interface InspectionTarget {
  /** One per component, so moving from a valve's lever to its body is one target. */
  key: string;
  title: string;
  detail?: string;
}

export interface InspectionState {
  /** What is named now, if anything. */
  shown: InspectionTarget | null;
  /** A different target waiting out its delay, and since when, ms. */
  pending: { target: InspectionTarget; since: number } | null;
}

export const NO_INSPECTION: InspectionState = { shown: null, pending: null };

/** The state after seeing `target` (or nothing) under the aim at `now`, ms. */
export function stepInspection(
  state: InspectionState,
  target: InspectionTarget | null,
  now: number,
  delay = INSPECT_DELAY_MS,
): InspectionState {
  if (!target) return state.shown || state.pending ? NO_INSPECTION : state;
  if (state.shown?.key === target.key) {
    // The same target: its wording now, the same object if unchanged.
    const same =
      state.shown.title === target.title &&
      state.shown.detail === target.detail;
    return same && !state.pending
      ? state
      : { shown: same ? state.shown : target, pending: null };
  }
  const since =
    state.pending?.target.key === target.key ? state.pending.since : now;
  if (now - since >= delay) return { shown: target, pending: null };
  return { shown: state.shown, pending: { target, since } };
}

/** The help line's text for a target: its title, and its detail below. */
export const inspectionText = (target: InspectionTarget) =>
  target.detail ? `${target.title}\n${target.detail}` : target.title;

/** A pasteable asset tag, falling back to the displayed name for untagged parts. */
export const inspectionReference = (
  target: InspectionTarget | null,
): string | null =>
  target ? (target.key.startsWith('name:') ? target.title : target.key) : null;
