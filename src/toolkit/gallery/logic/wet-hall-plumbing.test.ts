import { describe, expect, it } from 'vite-plus/test';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import { wetHallPlumbing, WET_HALL_ROUTED } from './wet-hall-plumbing';
import { WET_HALL_SCHEMATIC } from '../../../game/plant/wet-hall-schematic';

describe('the wet hall plumbed by the plumber', () => {
  const { lines, problems } = wetHallPlumbing();

  it('routes every water link of its schematic, with no problems', () => {
    expect(problems).toEqual([]);
    expect(lines.map((l) => l.link)).toEqual(WET_HALL_ROUTED.map((l) => l.id));
    for (const l of lines) expect(l.points?.length, l.link).toBeGreaterThan(1);
  });

  it('sets every one of the schematic’s valves in its line, once', () => {
    const set = lines.flatMap((l) => (l.valves ?? []).map((v) => v.fitting));
    // But the selectors' outlets' valves, which the selectors carry (plan 085).
    expect([...set].sort()).toEqual(
      WET_HALL_SCHEMATIC.fittings
        .filter((f) => !/-selector\.outlet-/.test(f.id))
        .map((f) => f.id)
        .sort(),
    );
  });

  it('lays its waste lines falling all the way', () => {
    for (const l of lines.filter((x) => x.gravity))
      for (let i = 1; i < (l.points ?? []).length; i++)
        expect(l.points![i][1], l.link).toBeLessThanOrEqual(
          l.points![i - 1][1] + 1e-6,
        );
  });

  it('lays no line through another', () => {
    const runs = lines.map((l) => ({
      name: l.link,
      points: l.points ?? [],
      od: l.od,
      joint: l.joint,
    }));
    expect(pipeClashes(runs)).toEqual([]);
  });
});
