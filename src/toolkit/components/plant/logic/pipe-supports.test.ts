import { describe, expect, it } from 'vite-plus/test';
import { NEAR_FITTING, planSupports, supportSpacing } from './pipe-supports';
import type {
  Support,
  SupportRun,
  SupportStructure,
  Vec3,
} from './pipe-supports';

const room: SupportStructure = {
  soffit: 6,
  walls: { west: -5, east: 5, north: -5, south: 5 },
  obstacles: [],
};
const run = (points: Vec3[], more: Partial<SupportRun> = {}): SupportRun => ({
  name: 'run',
  kind: 'steel-screwed',
  od: 0.0603,
  radius: 0.03,
  points,
  ...more,
});
/** The supports' places along x, in order. */
const xs = (supports: readonly Support[]) =>
  supports.map((s) => s.at[0]).sort((a, b) => a - b);

describe('support spacing', () => {
  it('is closer for plastic than for steel of the same bore', () => {
    const steel = supportSpacing('steel-screwed', 0.11)!;
    const plastic = supportSpacing('pvc-pressure', 0.11)!;
    expect(plastic.horizontal).toBeLessThan(steel.horizontal);
  });

  it('is closer again for warm water in plastic: a quarter less for each 10 °C over 20 °C', () => {
    const cold = supportSpacing('pvc-pressure', 0.11)!;
    const warm = supportSpacing('pvc-pressure', 0.11, { temperature: 30 })!;
    expect(warm.horizontal).toBeCloseTo(cold.horizontal * 0.75, 6);
  });

  it('follows the wiring regulations for conduit', () => {
    expect(supportSpacing('steel-screwed', 0.02, { conduit: true })).toEqual({
      horizontal: 1.75,
      vertical: 2.0,
    });
  });

  it('has a spacing for every rigid kind, and none for hose and cable', () => {
    for (const kind of [
      'copper',
      'steel-flanged',
      'lagged-heating',
      'pvc-drain',
      'chemical-tube',
      'flue',
    ] as const)
      expect(supportSpacing(kind, 0.05), kind).not.toBeNull();
    expect(supportSpacing('flex-cable', 0.012)).toBeNull();
  });
});

describe('planning supports', () => {
  it('hangs a long run out in the room from the soffit, no gap over its spacing', () => {
    const plan = planSupports(
      [
        run([
          [-4, 4, 0],
          [4, 4, 0],
        ]),
      ],
      room,
    );
    expect(plan.problems).toEqual([]);
    expect(plan.supports.every((s) => s.type === 'hanger')).toBe(true);
    expect(plan.supports.every((s) => s.to[1] === room.soffit)).toBe(true);
    const at = [-4, ...xs(plan.supports), 4];
    for (let i = 1; i < at.length; i++)
      expect(at[i] - at[i - 1]).toBeLessThanOrEqual(
        supportSpacing('steel-screwed', 0.0603)!.horizontal + 1e-9,
      );
  });

  it('brackets a run along a wall to the wall', () => {
    const plan = planSupports(
      [
        run([
          [-4, 4, -4.8],
          [4, 4, -4.8],
        ]),
      ],
      room,
    );
    expect(
      plan.supports.every((s) => s.type === 'wall-bracket' && s.to[2] === -5),
    ).toBe(true);
  });

  it('stands a low run on the floor', () => {
    const plan = planSupports(
      [
        run([
          [-4, 1, 0],
          [4, 1, 0],
        ]),
      ],
      room,
    );
    expect(
      plan.supports.every((s) => s.type === 'floor-stand' && s.to[1] === 0),
    ).toBe(true);
  });

  it('puts a support within 300 mm of every bend and valve', () => {
    const plan = planSupports(
      [
        run(
          [
            [-4, 4, 0],
            [0, 4, 0],
            [0, 4, 3],
          ],
          { fittings: [[-2, 4, 0]] },
        ),
      ],
      room,
    );
    const near = (p: Vec3) =>
      plan.supports.some(
        (s) =>
          Math.hypot(s.at[0] - p[0], s.at[1] - p[1], s.at[2] - p[2]) <=
          NEAR_FITTING + 1e-9,
      );
    expect(near([0, 4, 0])).toBe(true);
    expect(near([-2, 4, 0])).toBe(true);
  });

  it('moves a hanger whose rod would pass through a machine, or reports it', () => {
    const blocked: SupportStructure = {
      ...room,
      obstacles: [
        {
          name: 'tank',
          minX: -0.6,
          maxX: 0.6,
          minY: 4.2,
          maxY: 5.5,
          minZ: -1,
          maxZ: 1,
        },
      ],
    };
    const plan = planSupports(
      [
        run(
          [
            [-1.1, 4, 0],
            [1.1, 4, 0],
          ],
          { kind: 'pvc-drain', od: 0.11, radius: 0.055 },
        ),
      ],
      blocked,
    );
    for (const s of plan.supports.filter((s) => s.type === 'hanger'))
      expect(Math.abs(s.at[0]) > 0.6 || s.to[1] !== room.soffit).toBe(true);
    // Nothing anywhere to hold its middle: a problem, not a silent gap.
    expect(plan.problems.length + plan.supports.length).toBeGreaterThan(0);
  });

  it('reports a span it cannot hold, never skipping it silently', () => {
    const boxedIn: SupportStructure = {
      ...room,
      obstacles: [
        {
          name: 'above',
          minX: -5,
          maxX: 5,
          minY: 4.1,
          maxY: 6,
          minZ: -5,
          maxZ: 5,
        },
        {
          name: 'below',
          minX: -5,
          maxX: 5,
          minY: 0,
          maxY: 3.9,
          minZ: -5,
          maxZ: 5,
        },
      ],
    };
    const plan = planSupports(
      [
        run([
          [-4, 4, 0],
          [4, 4, 0],
        ]),
      ],
      boxedIn,
    );
    expect(plan.problems.length).toBeGreaterThan(0);
  });

  it('gathers hangers side by side onto a trapeze', () => {
    const plan = planSupports(
      [
        run(
          [
            [-4, 4, 0],
            [4, 4, 0],
          ],
          { name: 'a' },
        ),
        run(
          [
            [-4, 4, 0.3],
            [4, 4, 0.3],
          ],
          { name: 'b' },
        ),
      ],
      room,
    );
    expect(plan.trapezes.length).toBeGreaterThan(0);
    expect(plan.trapezes[0].runs.sort()).toEqual(['a', 'b']);
  });

  it('lets a machine carry its own pipework', () => {
    const plan = planSupports(
      [
        run(
          [
            [-1, 1, 0],
            [1, 1, 0],
          ],
          { carriedBy: 'spa pack' },
        ),
      ],
      room,
    );
    expect(plan.supports.every((s) => s.type === 'machine')).toBe(true);
  });
});
