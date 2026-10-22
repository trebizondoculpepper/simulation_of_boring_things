import { CORRIDOR_DOORS, CORRIDOR_WALLS, corridorWalls } from './main-corridor';
import type { CorridorWall } from './main-corridor';

/** An A1 (594 × 841 mm) campaign, printed at life size in the plant corridor. */
export const A1_POSTER = {
  width: 0.594,
  height: 0.841,
  centreY: 1.72,
} as const;

export const POSTER_COPY = [
  ['THE DEEP END', 'Your out of office is underwater'],
  ['ALTITUDE', 'Take the high dive in style'],
  ['LANE THEORY', 'A little ambition goes a long way'],
  ['AFTER HOURS', 'The desert has a deep end'],
  ['SWIM CLUB', 'Go further between breaths'],
  ['ISLAND TIME', 'No meetings. Just metres.'],
  ['POOL CULTURE', 'A grand entrance to the water'],
  ['BACK TO BLUE', 'The ceiling is only a suggestion'],
  ['STILL WATER', 'Find room to float'],
  ['COAST CLUB', 'Reserve your place at the horizon'],
  ['SECOND WIND', 'Rest is part of the training'],
  ['FORM & FLOW', 'Architecture with a lap lane'],
  ['FIRST LIGHT', 'Rise before the rest of the city'],
  ['THE LONG WEEKEND', 'A better kind of country club'],
  ['BELOW THE SURFACE', 'See your training differently'],
  ['THE QUIET DEPTH', 'Escape is just a step away'],
  ['NIGHT SWIM', 'The stars have a shallow end'],
  ['IN SYNC', 'Making waves together'],
  ['THE BLUE EDIT', 'An island state of mind'],
  ['SPLASH CLASS', 'Dress for the finish'],
  ['GREENHOUSE LAP', 'Nature sets the pace'],
  ['MIST & METRES', 'The view rewards every stroke'],
  ['EARLY START', 'Own the lane before sunrise'],
  ['SOFT LANDING', 'A plunge with polish'],
  ['FAST WATER', 'Follow the line. Find your limit.'],
  ['CIRCULAR THINKING', 'A new angle on the pool'],
  ['THE RESORT ISSUE', 'A coastline worth slowing for'],
  ['THE FINAL TOUCH', 'Finish with a flourish'],
  ['BLUE HOUR', 'Stay for one last length'],
  ['POOL PEOPLE', 'Life looks better from here'],
] as const;

export interface PosterPlacement {
  wall: CorridorWall;
  at: number;
  poster: number;
}

/** Distribute 30 frames over all eight corridor faces, away from doors and corners. */
export function corridorPosterPlacements(): PosterPlacement[] {
  const counts = [4, 4, 4, 4, 4, 4, 3, 3] as const;
  const walls = corridorWalls();
  let poster = 0;
  return CORRIDOR_WALLS.flatMap((wall, index) => {
    const { from, to } = walls[wall];
    const doors = CORRIDOR_DOORS.filter((d) => d.wall === wall).map(
      (d) => d.at,
    );
    const safe: number[] = [];
    for (let at = from + 1; at <= to - 1; at += 0.1) {
      if (doors.every((door) => Math.abs(at - door) > 1.55)) safe.push(at);
    }
    const count = counts[index];
    return Array.from({ length: count }, (_, i) => ({
      wall,
      at: safe[Math.round(((i + 0.5) * (safe.length - 1)) / count)],
      poster: poster++,
    }));
  });
}

/** A fire point's board (`safety-signage.ts`), and its clearance from a poster's middle. */
export const FIRE_POINT = { width: 0.7, centreY: 1.5, clear: 0.75 } as const;

/**
 * The corridor's fire points (a call point's and an extinguisher's signs
 * over the fire action notice), on alternate faces: each midway between
 * two of its posters, where there is room clear of them and of doors.
 */
export function corridorFirePoints(): { wall: CorridorWall; at: number }[] {
  const posters = corridorPosterPlacements();
  return CORRIDOR_WALLS.flatMap((wall, index) => {
    if (index % 2) return [];
    const doors = CORRIDOR_DOORS.filter((d) => d.wall === wall).map(
      (d) => d.at,
    );
    const ats = posters
      .filter((p) => p.wall === wall)
      .map((p) => p.at)
      .sort((a, b) => a - b);
    for (let i = 0; i + 1 < ats.length; i++) {
      const at = (ats[i] + ats[i + 1]) / 2;
      if (
        ats.every((p) => Math.abs(p - at) >= FIRE_POINT.clear) &&
        doors.every((d) => Math.abs(d - at) > 1.55)
      )
        return [{ wall, at }];
    }
    return [];
  });
}
