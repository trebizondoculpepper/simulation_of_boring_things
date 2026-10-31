import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../../../game/world';
import type { World } from '../../../game/world';
import { OLYMPIC_DIRT_REF } from '../../../game/plant/olympic-battery';
import {
  BACKWASH_DUE_LOADING,
  OLYMPIC_FILTER_WASHING,
  cleanNow,
  dirtPercent,
  filterTiles,
  holdProgramme,
  lockoutFilter,
  programmeView,
  refusalWords,
  runProgramme,
} from './olympic-filter-washing';
import type { WashCommand } from './olympic-filter-washing';
import { roomModel } from './world-in-model';

/** A press, as the page does it: the world after it, or its refusal. */
const press = (world: World, cmd: WashCommand) =>
  cmd.kind === 'act'
    ? { world: cmd.actions.reduce(applyAction, world), refused: null }
    : { world, refused: refusalWords(cmd) };

describe('OLYMPIC FILTER WASHING (mission 095)', () => {
  it('is bound to the Olympic plant room’s local panel in its model', () => {
    const { room, node } = OLYMPIC_FILTER_WASHING.model;
    expect(roomModel(room)?.nodes.has(node)).toBe(true);
  });

  it('gives each filter’s dirt as a share of its backwash-due loading: 0 clean, 100 due', () => {
    const w = newWorld();
    const at = (k: number) =>
      dirtPercent(
        { olympic: { ...w.olympic, dirt: [k * OLYMPIC_DIRT_REF] } },
        0,
      );
    expect(at(0)).toBe(0);
    expect(at(BACKWASH_DUE_LOADING)).toBeCloseTo(100);
    expect(at(BACKWASH_DUE_LOADING / 2)).toBeCloseTo(50);
    // A new game's beds, mid-season at 1.6 times their reference: 80 %.
    expect(dirtPercent(w, 0)).toBeCloseTo(80);
  });

  it('shows every filter in service with its pressure difference and flow', () => {
    const tiles = filterTiles(newWorld());
    expect(tiles).toHaveLength(5);
    expect(tiles.map((t) => t.tag)).toEqual([
      'PL2-F1',
      'PL2-F2',
      'PL2-F3',
      'PL2-F4',
      'PL2-F5',
    ]);
    for (const t of tiles) {
      expect(t.state).toBe('IN SERVICE');
      expect(t.dp).toBeGreaterThan(0.2);
      expect(t.flow).toBeGreaterThan(100);
      expect(t.progress).toBe(null);
    }
    expect(programmeView(newWorld()).words).toBe('AUTO · IDLE');
  });

  it('CLEAN NOW washes the filter at once: the Wash-O-Tron’s WASH NOW, the programme started, its dirt washed out', () => {
    let w = newWorld();
    const before = dirtPercent(w, 2);
    const cmd = cleanNow(w, 2);
    expect(cmd.kind).toBe('act');
    if (cmd.kind !== 'act') return;
    expect(cmd.actions).toContainEqual({
      type: 'wash-o-tron',
      action: { act: 'wash-now', filter: 2 },
    });
    w = press(w, cmd).world;
    expect(w.washOTron.running).toBe(true);
    w = advance(w, 60, 1);
    expect(w.washOTron.washing).toBe(2);
    expect(filterTiles(w)[2].state).toBe('BACKWASHING');
    expect(filterTiles(w)[2].flow).toBeLessThan(0);
    expect(programmeView(w).words).toBe('F3 BACKWASHING');
    // The others stay in service.
    expect(filterTiles(w).filter((t) => t.state === 'IN SERVICE')).toHaveLength(
      4,
    );
    // Through backwash, settle and rinse, and back in service.
    const s = w.washOTron.setpoints;
    w = advance(w, s.backwash + s.settle + s.rinse + 120, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(filterTiles(w)[2].state).toBe('IN SERVICE');
    expect(dirtPercent(w, 2)).toBeLessThan(before / 10);
    // Only the asked-for filter was washed (the others not yet due).
    expect(dirtPercent(w, 0)).toBeGreaterThan(before * 0.95);
  });

  it('HOLD holds a running wash where it is; HOLD again lets it go on', () => {
    let w = press(newWorld(), cleanNow(newWorld(), 0)).world;
    w = advance(w, 60, 1);
    w = press(w, holdProgramme(w)).world;
    expect(w.washOTron.hold).toBe(true);
    const t = w.washOTron.stepTime;
    w = advance(w, 30, 1);
    expect(w.washOTron.stepTime).toBe(t);
    expect(programmeView(w).words).toMatch(/^HOLD/);
    w = press(w, holdProgramme(w)).world;
    w = advance(w, 10, 1);
    expect(w.washOTron.stepTime).toBeGreaterThan(t);
  });

  it('RUN switches the programme; HOLD is refused while it is off', () => {
    // In AUTO from the start: RUN turns it off, HOLD is then refused.
    let w = newWorld();
    expect(w.washOTron.running).toBe(true);
    w = press(w, runProgramme(w)).world;
    expect(w.washOTron.running).toBe(false);
    expect(press(w, holdProgramme(w)).refused).toMatch(/OFF/);
    w = press(w, runProgramme(w)).world;
    expect(w.washOTron.running).toBe(true);
  });

  it('refuses a filter locked out, or out of service, as local control only; its LOCKOUT stays local', () => {
    let w = applyAction(newWorld(), {
      type: 'wash-o-tron',
      action: { act: 'lockout', filter: 1 },
    });
    expect(press(w, cleanNow(w, 1)).refused).toMatch(
      /^LOCAL CONTROL ONLY · AT PL2-F2/,
    );
    w = applyAction(w, {
      type: 'wash-o-tron',
      action: { act: 'mode', filter: 3, mode: 'isolate' },
    });
    w = advance(w, 30, 1);
    expect(filterTiles(w)[3].state).toBe('OUT OF SERVICE');
    expect(filterTiles(w)[1].state).toBe('LOCKED OUT');
    expect(press(w, cleanNow(w, 3)).refused).toMatch(/NOT IN SERVICE/);
    expect(refusalWords(lockoutFilter(0))).toMatch(/^LOCAL CONTROL ONLY/);
  });

  it('refuses CLEAN NOW of the filter already washing', () => {
    let w = press(newWorld(), cleanNow(newWorld(), 4)).world;
    w = advance(w, 60, 1);
    expect(press(w, cleanNow(w, 4)).refused).toMatch(/WASHING NOW/);
  });
});
