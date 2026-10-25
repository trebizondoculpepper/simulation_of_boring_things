import { describe, expect, it } from 'vite-plus/test';
import { jacuzziPlumbing, ROUTED_LINKS } from './jacuzzi-plumbing';

/**
 * The jacuzzi plant room plumbed by the plumber (prompt 064, step 7), not
 * yet drawn: the room still draws its rule-laid runs (`cabinet-pipes.ts`),
 * because the router cannot yet keep level runs over head height or lay
 * gravity lines falling (prompt 065).
 */
describe('the jacuzzi plant room, plumbed by the router', () => {
  const plumbed = jacuzziPlumbing();

  it('lays every water and air link of its schematic', () => {
    expect(plumbed.lines.map((l) => l.link)).toEqual(
      ROUTED_LINKS.map((l) => l.id),
    );
    expect(plumbed.lines.every((l) => l.points && l.points.length >= 2)).toBe(
      true,
    );
  });

  it('lays its gravity lines falling, never rising', () => {
    for (const l of plumbed.lines.filter((x) => /overflow|drain/i.test(x.link)))
      for (let i = 1; i < l.points!.length; i++)
        expect(l.points![i][1], l.link).toBeLessThanOrEqual(
          l.points![i - 1][1] + 1e-9,
        );
  });

  it('sets each of the schematic’s valves in its line', () => {
    const valves = plumbed.lines.flatMap((l) => l.valves ?? []);
    expect(valves).toHaveLength(12);
  });
});
