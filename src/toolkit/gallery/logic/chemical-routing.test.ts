import { describe, expect, it } from 'vite-plus/test';
import { SCHEMATICS } from '../../../game/plant/schematics';
import { roomPipes } from './room-pipes';
import { runBinding } from './world-in-model';

/**
 * The chemical distribution plumbed everywhere (plan 085; the owner,
 * 2026-10-27): every chemical link in a room's schematic drawn as a run,
 * and every chemical run drawn as its chemical (so it is marked, and its
 * mains double-contained, as one).
 */
describe('the chemical lines, plumbed in every room', () => {
  for (const room of [
    'loading_bay',
    'wet_hall',
    'hypo_store',
    'acid_store',
    'plant_pool_01',
    'plant_pool_03',
    'plant_pool_04',
  ])
    it(`${room}: draws every chemical link of its schematic`, () => {
      const runs = roomPipes(room);
      const drawn = new Set(
        runs.map((r) => {
          const b = runBinding(room, r);
          return b && 'link' in b ? b.link : r.name;
        }),
      );
      const links = SCHEMATICS[room]!.links.filter(
        (l) => l.medium === 'chemical',
      );
      expect(links.length).toBeGreaterThan(0);
      for (const l of links) expect(drawn.has(l.id), l.id).toBe(true);
    });

  it('the Olympic: draws each day tank’s branch, supply and dose line, each as its chemical', () => {
    const runs = roomPipes('plant_pool_02');
    for (const [name, chemical] of [
      ['Hypochlorite branch to its day tank', 'hypochlorite'],
      ['Hypochlorite supply line', 'hypochlorite'],
      ['Hypochlorite dose line', 'hypochlorite'],
      ['Acid branch to its day tank', 'acid'],
      ['Acid supply line', 'acid'],
      ['Acid dose line', 'acid'],
    ] as const) {
      const r = runs.find((x) => x.name === name);
      expect(r, name).toBeDefined();
      expect(r!.service, name).toBe(chemical);
    }
  });

  it('draws every chemical run as its own chemical, never as water', () => {
    for (const room of [
      'loading_bay',
      'wet_hall',
      'hypo_store',
      'acid_store',
      'plant_pool_01',
      'plant_pool_02',
      'plant_pool_03',
      'plant_pool_04',
    ])
      for (const r of roomPipes(room))
        if (
          /^(Hypochlorite|Acid|Sodium hypochlorite|Hydrochloric acid)\b/.test(
            r.name,
          )
        )
          expect(['hypochlorite', 'acid'], `${room}: ${r.name}`).toContain(
            r.service,
          );
  });
});
