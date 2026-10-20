import type { PlanFootprint, Side } from './facility-plan';

/** Adapted from the high-level glazing and low barrel rooflights in the
 * Sport England six-lane-plus architect's plan and section sheets. */
export interface WallWindow {
  room: string;
  side: Side;
  from: number;
  to: number;
  bottom: number;
  top: number;
}

export const ROOFLIGHTS: readonly PlanFootprint[] = [12, 28, 44, 60].map(
  (minX) => ({ minX, maxX: minX + 10, minZ: 16, maxZ: 34 }),
);

export const WINDOWS: readonly WallWindow[] = [
  ...(['north', 'south'] as const).flatMap((side) =>
    [12, 28, 44, 64].map((from) => ({
      room: 'hall',
      side,
      from,
      to: from + 10,
      bottom: 8,
      top: 10,
    })),
  ),
  {
    room: 'changing',
    side: 'south',
    from: 82,
    to: 86,
    bottom: 2.15,
    top: 2.75,
  },
  {
    room: 'changing',
    side: 'south',
    from: 90,
    to: 94,
    bottom: 2.15,
    top: 2.75,
  },
  { room: 'boiler', side: 'north', from: 43, to: 51, bottom: 2.6, top: 3.5 },
  {
    room: 'engineer-office',
    side: 'east',
    from: -10.5,
    to: -5.5,
    bottom: 1.15,
    top: 2.35,
  },
];

export interface WallPatch {
  from: number;
  to: number;
  bottom: number;
  top: number;
}

/** Cut window rectangles out of a wall segment; the glazing fills only the cuts. */
export function cutWindows(
  segment: WallPatch,
  windows: readonly Pick<WallWindow, 'from' | 'to' | 'bottom' | 'top'>[],
) {
  let solid = [segment];
  const glass: WallPatch[] = [];
  for (const window of windows) {
    const next: WallPatch[] = [];
    for (const patch of solid) {
      const from = Math.max(patch.from, window.from);
      const to = Math.min(patch.to, window.to);
      const bottom = Math.max(patch.bottom, window.bottom);
      const top = Math.min(patch.top, window.top);
      if (from >= to || bottom >= top) {
        next.push(patch);
        continue;
      }
      glass.push({ from, to, bottom, top });
      if (patch.from < from) next.push({ ...patch, to: from });
      if (to < patch.to) next.push({ ...patch, from: to });
      if (patch.bottom < bottom)
        next.push({ from, to, bottom: patch.bottom, top: bottom });
      if (top < patch.top) next.push({ from, to, bottom: top, top: patch.top });
    }
    solid = next;
  }
  return { solid, glass };
}
