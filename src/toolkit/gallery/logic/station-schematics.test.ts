import { describe, expect, it } from 'vite-plus/test';
import { newWorld } from '../../../game/world';
import { plantReadingOf } from './world-reading';
import { overviewById } from './schematic-overviews';
import {
  STATION_DESIGNS,
  STATION_NAMES,
  dailyUse,
  daysLeft,
  nextWashHours,
} from './station-schematics';
import type { Design } from './station-schematics';
import type { SchematicContext } from './schematic-overviews';

/** Every leaf design of `d` read once: what it gave against what it draws. */
function check(d: Design, c: SchematicContext) {
  switch (d.kind) {
    case 'overview':
      expect(overviewById(d.overview), d.overview).toBeDefined();
      return;
    case 'rings':
      expect(d.read(c), d.title).toHaveLength(d.gauges.length);
      for (const [v, words] of d.read(c)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1.5);
        expect(words).not.toContain('NaN');
      }
      return;
    case 'grid': {
      const cells = d.read(c);
      expect(cells, d.title).toHaveLength(d.rows.length);
      for (const row of cells) expect(row).toHaveLength(d.columns.length);
      return;
    }
    case 'sweep':
      expect(d.read(c).length, d.title).toBeGreaterThan(0);
      return;
    case 'vessels':
      expect(d.read(c), d.title).toHaveLength(d.vessels.length);
      return;
    case 'reticles':
      expect(d.read(c), d.title).toHaveLength(d.reticles.length);
      return;
    case 'trends':
      expect(d.read(c), d.title).toHaveLength(d.trends.length);
      return;
    case 'strip': {
      const s = d.read(c);
      expect(s.words, d.title).not.toContain('NaN');
      return;
    }
    case 'combo':
      for (const p of d.parts) check(p, c);
  }
}

describe('the stations’ schematic designs', () => {
  const world = newWorld();
  const c = { world, reading: plantReadingOf(world, 'pool_02') };

  it('give every station at least three designs, more than its screens', () => {
    for (const s of STATION_NAMES)
      expect(STATION_DESIGNS[s].length, s).toBeGreaterThanOrEqual(3);
  });

  it('read a new world into every design, each the right shape', () => {
    for (const s of STATION_NAMES)
      for (const d of STATION_DESIGNS[s]) check(d, c);
  });

  it('project the stores’ days from the pools’ usual use', () => {
    expect(dailyUse('hypochlorite')).toBeGreaterThan(dailyUse('acid'));
    expect(daysLeft(world, 'hypochlorite')).toBeCloseTo(
      world.chemicals.hypochlorite / dailyUse('hypochlorite'),
    );
  });

  it('count each Olympic filter’s hours to its next wash from its controller', () => {
    const hours = nextWashHours(world);
    expect(hours).toHaveLength(world.washOTron.filters.length);
    const later = { ...world, time: world.time + 3600 };
    expect(nextWashHours(later)[0]).toBeCloseTo(hours[0] - 1);
  });
});
