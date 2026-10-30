import { vi } from 'vite-plus/test';
import { overlaps } from '../../../controls/logic/walk-collision';
import type { Footprint } from '../../../controls/logic/walk-collision';
import {
  MUSEUM_HALLS,
  hallArches,
  hallInterior,
  hallOrigin,
  hallSolids,
} from '../../logic/museum-plan';
import type { MuseumHallId } from '../../logic/museum-plan';
import { safetySolids } from '../../logic/museum-safety';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import { HALL_EXHIBITS } from './exhibits';

/** A canvas that draws nothing, for building exhibits outside a browser. */
export function stubDocument() {
  vi.stubGlobal('location', { search: '', href: 'http://localhost/' });
  const element = () => ({
    style: {},
    setAttribute() {},
    addEventListener() {},
    appendChild() {},
  });
  vi.stubGlobal('document', {
    createElementNS: element,
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
}

/** Everything a visitor walks round in a hall, its exhibit's included, in its own coordinates. */
export async function hallObstacles(id: MuseumHallId): Promise<Footprint[]> {
  const seen = Object.fromEntries(MUSEUM_HALLS.map((h) => [h, true]));
  const solids: Footprint[] = [...hallSolids(id, seen), ...safetySolids(id)];
  const load = HALL_EXHIBITS[id];
  if (load) {
    const exhibit = (await load()).buildHallExhibit(createPanelKit());
    exhibit.reset(9 * 3600);
    solids.push(...(exhibit.solids?.({ x: 0, z: 0 }) ?? []));
    exhibit.parts?.dispose();
    exhibit.dispose?.();
  }
  return solids;
}

/**
 * Whether a visitor `radius` wide can walk from a metre inside each of a
 * hall's doorways to the other round `solids`: a flood over a 0.1 m grid of
 * the hall's floor. Returns which doorways are blocked where they open, and
 * whether the two are joined.
 */
export function walkway(
  id: MuseumHallId,
  solids: readonly Footprint[],
  radius = 0.25,
) {
  const step = 0.1;
  const r = hallInterior(id);
  const o = hallOrigin(id);
  const minX = r.minX - o.x;
  const minZ = r.minZ - o.z;
  const nx = Math.ceil((r.maxX - r.minX) / step);
  const nz = Math.ceil((r.maxZ - r.minZ) / step);
  const centre = (i: number, k: number) => ({
    x: minX + (i + 0.5) * step,
    z: minZ + (k + 0.5) * step,
  });
  const free = (i: number, k: number) => {
    const p = centre(i, k);
    return !solids.some((s) => overlaps(s, p.x, p.z, radius));
  };
  const cell = (x: number, z: number) =>
    [Math.floor((x - minX) / step), Math.floor((z - minZ) / step)] as const;
  const doors = hallArches(id).map((a) => ({
    to: a.to,
    at: cell(a.frame.x + a.into[0] * 1, a.frame.z + a.into[1] * 1),
  }));
  const open = doors.map((d) => free(...d.at));
  let joined = false;
  if (open.every(Boolean)) {
    const [start, goal] = doors.map((d) => d.at);
    const seen = new Uint8Array(nx * nz);
    const queue: (readonly [number, number])[] = [start];
    seen[start[1] * nx + start[0]] = 1;
    while (queue.length) {
      const [i, k] = queue.pop()!;
      if (i === goal[0] && k === goal[1]) {
        joined = true;
        break;
      }
      for (const [di, dk] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const a = i + di;
        const b = k + dk;
        if (a < 0 || b < 0 || a >= nx || b >= nz || seen[b * nx + a]) continue;
        seen[b * nx + a] = 1;
        if (free(a, b)) queue.push([a, b]);
      }
    }
  }
  return {
    blocked: doors.filter((_, k) => !open[k]).map((d) => d.to),
    joined,
  };
}
