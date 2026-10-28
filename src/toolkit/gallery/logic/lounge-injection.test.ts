import { describe, expect, it } from 'vite-plus/test';
import { LOUNGE_SCHEMATIC } from '../../../game/plant/lounge-schematic';
import { schematicExpansion } from '../../../game/plant/schematics';
import { advance, applyAction, newWorld } from '../../../game/world';
import { REACH, roomInjections, roomPipes } from './room-pipes';

/**
 * The lounge's dosing put right (prompt 089, item 4; the owner,
 * 2026-10-27, the Olympic's way): the sample from the filtered main before
 * any dosing, the acid after the heat exchanger, the hypochlorite last,
 * after the UV unit, each through its quill, its isolating valve and its
 * non-return valve.
 */
describe('the lounge’s injection points', () => {
  const link = (id: string) => LOUNGE_SCHEMATIC.links.find((l) => l.id === id)!;

  it('samples the filtered main, before any dosing', () => {
    const l = link('Sample line from the filtered main');
    expect([l.sourceId, l.targetId]).toEqual(['outlet-header', 'dosing']);
    // Nothing doses the filtered main.
    expect(
      LOUNGE_SCHEMATIC.links.some(
        (x) => x.medium === 'chemical' && x.targetId === 'outlet-header',
      ),
    ).toBe(false);
  });

  it('doses acid after the heat exchanger, hypochlorite after the UV unit', () => {
    expect(link('Acid injection into the heated main').targetId).toBe(
      'heated-main',
    );
    expect(link('Hypochlorite injection into the return main').targetId).toBe(
      'return-main',
    );
    const runs = roomPipes('plant_pool_01');
    const joins = (name: string) => runs.find((r) => r.name === name)!.joins;
    expect(joins('Heat exchanger to the ozone contact tank')).toContain(
      'Acid injection into the heated main',
    );
    expect(joins('Return main to the pool’s inlets')).toContain(
      'Hypochlorite injection into the return main',
    );
  });

  it('gives each quill its isolating and non-return valve, and the plumber adds nothing', () => {
    const set = schematicExpansion('plant_pool_01')!.fittings;
    for (const k of ['acid', 'hypo'])
      for (const what of ['iso', 'nrv'])
        expect(set.some((f) => f.id === `${k}-quill.in.${what}`)).toBe(true);
    expect(set.filter((f) => !f.given)).toEqual([]);
  });

  it('sets each quill in reach, well apart', () => {
    const points = roomInjections('plant_pool_01');
    expect(points.map((p) => p.chemical).sort()).toEqual([
      'acid',
      'hypochlorite',
    ]);
    for (const p of points) expect(p.at[1]).toBeLessThanOrEqual(REACH);
    const [a, b] = points;
    expect(Math.hypot(a.at[0] - b.at[0], a.at[2] - b.at[2])).toBeGreaterThan(3);
  });

  it('stops the dose with the quill’s valve shut', () => {
    const open = advance(newWorld(), 3600, 10);
    let shut = applyAction(newWorld(), {
      type: 'plant/valve',
      id: 'hypo-quill.in.iso',
      open: false,
    });
    expect(shut.installedValves['hypo-quill.in.iso']).toBe(false);
    shut = advance(shut, 3600, 10);
    // Undosed, its chlorine falls behind the dosed pool's.
    expect(shut.pools.pool_01.freeChlorine).toBeLessThan(
      open.pools.pool_01.freeChlorine - 0.05,
    );
  });
});
