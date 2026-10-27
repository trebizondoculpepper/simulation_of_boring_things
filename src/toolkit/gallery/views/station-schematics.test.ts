import { describe, expect, it } from 'vite-plus/test';
import { BLOCK_THEME, rect } from '../../../ui2d';
import { newWorld } from '../../../game/world';
import { plantReadingOf } from '../logic/world-reading';
import { OVERVIEWS } from '../logic/schematic-overviews';
import { STATION_DESIGNS, STATION_NAMES } from '../logic/station-schematics';
import { stationDesignList, stationSchematic } from './station-schematics';

describe('a station’s schematic browser', () => {
  const world = newWorld();
  const c = { world, reading: plantReadingOf(world, 'pool_02') };

  it('cycles its own designs and offers every overview besides', () => {
    for (const s of STATION_NAMES) {
      const { designs, cycle } = stationDesignList(s);
      expect(cycle).toHaveLength(STATION_DESIGNS[s].length);
      const overviews = designs.flatMap((d) =>
        d.kind === 'overview' ? [d.overview] : [],
      );
      expect(new Set(overviews)).toEqual(new Set(OVERVIEWS.map((o) => o.id)));
    }
  });

  it('builds, lays out and shows the world in every design of every station', () => {
    for (const s of STATION_NAMES) {
      const b = stationSchematic(s);
      b.tree.layout(rect(0, 0, 1024, 576), BLOCK_THEME);
      b.titles.forEach((_, i) => {
        b.tree.rotator.select(i);
        b.update(c, i);
        b.tree.tick(i);
      });
      expect(b.current()).toBe(b.titles.length - 1);
    }
  });

  it('turns to the station’s next design after its period', () => {
    const b = stationSchematic('FLOW NAVIGATOR', { period: 10 });
    b.tree.layout(rect(0, 0, 1024, 576), BLOCK_THEME);
    for (let t = 0; t < 10.5; t += 0.1) b.tree.tick(t);
    expect(b.tree.rotator.current).toBe(1);
  });

  it('asks for no paint while a still design shows a still world', () => {
    // The Loading Bay Chief's first design is its bulk stores: vessels, still.
    const b = stationSchematic('LOADING BAY CHIEF', { period: 1000 });
    b.tree.layout(rect(0, 0, 1024, 576), BLOCK_THEME);
    b.update(c, 0);
    b.tree.tick(0.5);
    b.tree.clean();
    let dirty = 0;
    for (let t = 1; t < 5; t += 1 / 60) {
      b.tree.tick(t);
      b.update(c, t);
      if (b.tree.dirty) dirty++;
      b.tree.clean();
    }
    expect(dirty).toBe(0);
  });
});
