import type {
  Fitting,
  FittingKind,
  PlumbMedium,
} from '../../../game/plant/plumbing-expansion';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import { pointAlong } from './source-sink-plumbing';

/**
 * Where the plumber sets a line's fittings, for the experiment rigs
 * (Dev22, Dev24): each at the end of the line it serves, `offset` along
 * from its port, several at one end one after another; but if a person
 * could not reach it there (below `reach[0]` or above `reach[1]`), at the
 * line's other end instead. Pure.
 */

export interface PlacedRigFitting {
  id: string;
  kind: FittingKind;
  medium: PlumbMedium;
  normally: 'open' | 'closed';
  edge: string;
  at: Vec3;
  along: Vec3;
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const round3 = (v: readonly number[]): Vec3 => [
  round(v[0]),
  round(v[1]),
  round(v[2]),
];

export const lineLength = (points: readonly Vec3[]) =>
  points
    .slice(1)
    .reduce(
      (sum, p, k) =>
        sum +
        Math.hypot(
          p[0] - points[k][0],
          p[1] - points[k][1],
          p[2] - points[k][2],
        ),
      0,
    );

export function placeRigFittings(
  edge: string,
  points: readonly Vec3[],
  list: readonly Fitting[],
  { offset = 0.35, pitch = 0.4, reach = [0.3, 1.8] as const } = {},
): PlacedRigFitting[] {
  const length = lineLength(points);
  return list.map((f, k) => {
    const step = k * pitch;
    const ends =
      f.end === 'source'
        ? [offset + step, length - offset]
        : [length - offset - step, offset];
    const spot =
      ends
        .map((d) => pointAlong(points, d))
        .find((p) => p.at[1] >= reach[0] && p.at[1] <= reach[1]) ??
      pointAlong(points, ends[0]);
    return {
      id: f.id,
      kind: f.kind,
      medium: f.medium,
      normally: f.normally,
      edge,
      at: round3(spot.at),
      along: round3(spot.along),
    };
  });
}
