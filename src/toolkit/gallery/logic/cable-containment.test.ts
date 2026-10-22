import { describe, expect, it } from 'vite-plus/test';
import {
  LADDER_Y,
  corridorContainment,
  switchRoomContainment,
} from './cable-containment';
import { CORRIDOR_DOORS, MAIN_CORRIDOR } from './main-corridor';
import { layoutRoom } from './room-equipment';
import { SHELL_ROOMS } from './shell-rooms';

const near = (a: readonly number[], b: readonly number[]) =>
  a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
const level = (r: { from: readonly number[]; to: readonly number[] }) =>
  r.from[1] === r.to[1];

describe('the switch room’s containment', () => {
  const { runs, entries } = switchRoomContainment();
  const layout = layoutRoom('switch_room')!;

  it('has the main incoming switch, by its door', () => {
    expect(layout.failed).toEqual([]);
    expect(layout.placed.some((p) => p.item.key === 'main-switch')).toBe(true);
  });

  it('brings the incoming supply up out of the floor into the main switch', () => {
    const incoming = runs.find((r) => r.name === 'Incoming supply')!;
    expect(incoming.from[1]).toBe(0);
    const sw = layout.placed.find((p) => p.item.key === 'main-switch')!;
    expect(incoming.to[1]).toBeCloseTo(sw.y - sw.item.h / 2, 6);
  });

  it('runs trunking from each piece of switchgear’s top up to the ladder, the board’s the widest', () => {
    for (const key of [
      'main-switch',
      'lv-switchboard',
      'mcc',
      'central-battery',
    ]) {
      const p = layout.placed.find((q) => q.item.key === key)!;
      const riser = runs.find((r) => r.name === `${p.item.label} trunking`)!;
      expect(riser, key).toBeDefined();
      expect(riser.to[1], key).toBe(LADDER_Y);
      expect(riser.from[1], key).toBeLessThan(LADDER_Y - 1.5);
      // It meets a ladder: within a ladder's half width of one in plan.
      const met = runs
        .filter((r) => r.kind === 'ladder')
        .some((l) => {
          const [x0, x1] = [l.from[0], l.to[0]].sort((a, b) => a - b);
          const [z0, z1] = [l.from[2], l.to[2]].sort((a, b) => a - b);
          const x = riser.to[0];
          const z = riser.to[2];
          return (
            x >= x0 - l.width / 2 - 0.1 &&
            x <= x1 + l.width / 2 + 0.1 &&
            z >= z0 - l.width / 2 - 0.1 &&
            z <= z1 + l.width / 2 + 0.1
          );
        });
      expect(met, key).toBe(true);
    }
    const width = (label: string) =>
      runs.find((r) => r.name === `${label} trunking`)!.width;
    expect(width('LV main switchboard')).toBeGreaterThanOrEqual(0.6);
  });

  it('carries the sub-mains out over the door, above its head', () => {
    const door = SHELL_ROOMS.switch_room.doors[0];
    expect(door.wall).toBe('south');
    expect(entries).toHaveLength(1);
    expect(entries[0].at[0]).toBeCloseTo(door.at, 6);
    expect(entries[0].at[1]).toBeGreaterThan(3);
    expect(runs.filter((r) => r.kind === 'ladder').every(level)).toBe(true);
  });
});

describe('the main corridor’s ladder', () => {
  const { runs, entries } = corridorContainment();

  it('rings the corridor, closed, all at one level', () => {
    const ring = runs.filter((r) => r.name.startsWith('Ring'));
    expect(ring).toHaveLength(4);
    for (let i = 0; i < 4; i++)
      expect(near(ring[i].to, ring[(i + 1) % 4].from)).toBe(true);
    expect(runs.every(level)).toBe(true);
    for (const r of runs)
      for (const p of [r.from, r.to])
        for (const v of [p[0], p[2]]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(MAIN_CORRIDOR.side);
        }
  });

  it('turns into every room’s door: the switch room’s the supply, every other its sub-main', () => {
    expect(entries.map((e) => e.to).sort()).toEqual(
      CORRIDOR_DOORS.map((d) => d.to).sort(),
    );
    for (const e of entries) expect(e.at[1]).toBe(LADDER_Y);
  });
});
