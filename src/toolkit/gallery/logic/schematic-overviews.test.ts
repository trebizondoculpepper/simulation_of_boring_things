import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../../../game/world';
import { SCHEMATICS } from '../../../game/plant/schematics';
import type {
  PlumbEdge,
  PlumbNode,
} from '../../../game/plant/plumbing-expansion';
import { olympicPlumbing } from './olympic-plumbing';
import { plantReadingOf } from './world-reading';
import {
  OVERVIEWS,
  boilersFiring,
  modelLabel,
  overviewLayout,
  stageLabels,
} from './schematic-overviews';
import type { OverviewSpec } from './schematic-overviews';

/** A room's model: its machines and its links. */
function model(
  room: string,
): { nodes: readonly PlumbNode[]; links: readonly PlumbEdge[] } | null {
  if (room === 'plant_pool_02') {
    const s = olympicPlumbing().schematic;
    return { nodes: s.nodes, links: s.edges };
  }
  const s = SCHEMATICS[room];
  return s ? { nodes: s.nodes, links: s.links } : null;
}

/** Whether some machine of `from` reaches some machine of `to` along links of `media`, passing only through kinds in `through`. */
function joined(
  room: string,
  from: readonly string[],
  to: readonly string[],
  media: readonly string[],
  through: readonly string[],
): boolean {
  const m = model(room)!;
  const kind = new Map(m.nodes.map((n) => [n.id, n.kind]));
  const seen = new Set<string>();
  const queue = [...from];
  while (queue.length) {
    const id = queue.shift()!;
    for (const l of m.links) {
      if (l.sourceId !== id || !media.includes(l.medium)) continue;
      if (to.includes(l.targetId)) return true;
      if (
        through.includes(kind.get(l.targetId) ?? '') &&
        !seen.has(l.targetId)
      ) {
        seen.add(l.targetId);
        queue.push(l.targetId);
      }
    }
  }
  return false;
}

const roomOf = (spec: OverviewSpec, i: number) =>
  spec.stages[i].room ?? spec.room;

describe('the hydrodynamic overviews', () => {
  it('draw only machines their rooms’ models have', () => {
    for (const spec of OVERVIEWS)
      spec.stages.forEach((s, i) => {
        const room = roomOf(spec, i);
        if (room === 'day-tanks') return;
        const m = model(room);
        expect(m, `${spec.id}: ${room}`).not.toBeNull();
        for (const id of s.ids)
          expect(
            m!.nodes.some((n) => n.id === id),
            `${spec.id}: ${room} has ${id}`,
          ).toBe(true);
      });
  });

  it('join their stages in the order the models’ links do', () => {
    for (const spec of OVERVIEWS) {
      const n = spec.stages.length;
      const pairs: [number, number][] = [];
      for (let i = 0; i + 1 < n; i++) pairs.push([i, i + 1]);
      if (spec.layout === 'loop' && !spec.returnOutside) pairs.push([n - 1, 0]);
      for (const [a, b] of pairs) {
        // A join between rooms is through their boundary nodes, each room's own.
        if (roomOf(spec, a) !== roomOf(spec, b)) continue;
        expect(
          joined(
            roomOf(spec, a),
            spec.stages[a].ids,
            spec.stages[b].ids,
            spec.media,
            spec.through ?? [],
          ),
          `${spec.id}: ${spec.stages[a].ids.join(',')} → ${spec.stages[b].ids.join(',')}`,
        ).toBe(true);
      }
    }
  });

  it('cover every pool and every other circuit the owner named', () => {
    expect(OVERVIEWS.map((o) => o.id)).toEqual(
      expect.arrayContaining([
        'lounge',
        'olympic',
        'jacuzzi',
        'footbath',
        'heating',
        'hypochlorite-distribution',
        'acid-distribution',
        'air',
        'power',
        'backwash',
        'make-up',
      ]),
    );
    expect(new Set(OVERVIEWS.map((o) => o.id)).size).toBe(OVERVIEWS.length);
  });

  it('read the world into a state for every machine and read-out', () => {
    const world = newWorld();
    const c = { world, reading: plantReadingOf(world, 'pool_02') };
    for (const spec of OVERVIEWS) {
      const view = spec.read(c);
      expect(
        view.members.map((m) => m.length),
        spec.id,
      ).toEqual(spec.stages.map((s) => stageLabels(s).length));
      expect(view.readouts).toHaveLength(spec.readouts.length);
      for (const [words] of view.readouts) expect(words).not.toContain('NaN');
    }
  });

  it('show a new world’s Olympic circulating, its duty pump running', () => {
    const world = newWorld();
    const olympic = OVERVIEWS.find((o) => o.id === 'olympic')!;
    const view = olympic.read({
      world,
      reading: plantReadingOf(world, 'pool_02'),
    });
    expect(view.members[1].map((m) => m.state)).toEqual(['on', 'off']);
    expect(view.rates).toBeGreaterThan(0.5);
  });

  it('stage the boilers on the heat the pools take, none without gas', () => {
    const world = newWorld();
    const warm = {
      ...world,
      pools: {
        ...world.pools,
        pool_02: { ...world.pools.pool_02, heating: 600 },
      },
    };
    expect(boilersFiring(warm)).toBeGreaterThanOrEqual(3);
    expect(
      boilersFiring({
        ...warm,
        boilerGas: { ...warm.boilerGas, ssovOpen: false },
      }),
    ).toBe(0);
  });

  it('label machines from their node ids', () => {
    expect(modelLabel('B-501')).toBe('B-501');
    expect(modelLabel('ahu-802')).toBe('AHU-802');
    expect(modelLabel('balance-tank')).toBe('BALANCE TANK');
    expect(modelLabel('filter-1')).toBe('FILTER-1');
  });

  it('lay every overview out inside its bounds, a member for every label', () => {
    for (const spec of OVERVIEWS) {
      const l = overviewLayout(spec);
      expect(l.members.map((m) => m.length)).toEqual(
        spec.stages.map((s) => stageLabels(s).length),
      );
      for (const m of l.members.flat()) {
        expect(Math.abs(m.at[0]) + m.size / 2).toBeLessThanOrEqual(
          l.bounds.maxX,
        );
        expect(Math.abs(m.at[1]) + m.size / 2).toBeLessThanOrEqual(
          l.bounds.maxY,
        );
      }
      if (spec.layout === 'line')
        expect(
          l.pipes.filter((p) => p.points[0][1] === 0 && p.points[1][1] === 0)
            .length,
        ).toBe(spec.stages.length - 1);
    }
  });
});
