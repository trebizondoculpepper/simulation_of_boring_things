import { drawnSegments } from '../../components/core/logic/pipe-route';
import { describe, expect, it } from 'vite-plus/test';
import {
  MAIN,
  OLYMPIC,
  olympicRoom,
  olympicValveTags,
  plumbOlympic,
  scoreOlympic,
} from './olympic-plumbing';
import { footprintOf, olympicPlan, olympicRoomPlan } from './olympic-plan';
import {
  FILTER_CENTRE_Z,
  SIGHT_GLASS,
  sandFilterGeometry,
} from '../../components/plant/logic/sand-filter';

describe('the Olympic plant room, plumbed and routed', () => {
  const plumbed = plumbOlympic();
  const room = olympicRoomPlan();
  const hx = room.halfX;
  const hz = room.halfZ;
  const run = (name: string) => plumbed.runs.find((r) => r.name === name)!;

  it('faces the first filter’s backwash-out override toward the accessible south aisle', () => {
    const valve = plumbed.fittings.find(
      (f) => f.id === 'filter-1.backwashOut.iso',
    );
    expect(valve?.facing).toEqual([0, 0, 1]);
    expect(valve?.operator).toBe('solenoid');
    const drawn = olympicRoom()
      .runs.flatMap((r) => r.valves)
      .find((v) => v.name === 'F1 backwash out valve');
    expect(drawn?.facing).toEqual([0, 0, 1]);
    expect(drawn?.axis).toBe('y');
  });

  it('faces the UV panel into the room and routes its power and outlet from the turned ports', () => {
    const uv = plumbed.items.find((i) => i.key === 'uv')!;
    expect(uv.facing).toBe('north');
    const power = plumbed.ports.find(
      (p) => p.machine === 'uv' && p.name === 'power',
    )!;
    expect(power.at[2]).toBeLessThan(uv.z);
    expect(run('power-uv').points.at(-1)).toEqual(power.at);
    const outlet = plumbed.ports.find(
      (p) => p.machine === 'uv' && p.name === 'outlet',
    )!;
    const [from, to] = run('Dosing spool').points;
    expect(from).toEqual(outlet.at);
    expect(
      to.reduce(
        (sum, value, k) => sum + (value - from[k]) * outlet.outward[k],
        0,
      ),
    ).toBeGreaterThan(0);
  });

  it('puts all four heat-exchanger valves fully on drawn straights, clear of insulated elbows', () => {
    const valves = plumbed.fittings.filter((f) =>
      f.id.startsWith('exchanger.'),
    );
    expect(valves).toHaveLength(4);
    const distance = (a: readonly number[], b: readonly number[]) =>
      Math.hypot(...a.map((v, k) => v - b[k]));
    for (const valve of valves) {
      const pipe = run(valve.run);
      const segments = drawnSegments({
        ...pipe,
        insulation: pipe.kind === 'lagged-heating' ? 0.04 : 0,
      });
      const straight = segments.find(
        (s) =>
          s.kind === 'straight' &&
          Math.abs(
            distance(s.from, valve.at) + distance(s.to, valve.at) - s.length,
          ) < 1e-6,
      );
      expect(straight, valve.id).toBeDefined();
      if (straight?.kind !== 'straight') throw new Error(valve.id);
      // Room for both the valve's flanges and the elbow's socket/flange, beyond the curve itself.
      expect(
        Math.min(
          distance(straight.from, valve.at),
          distance(straight.to, valve.at),
        ),
        valve.id,
      ).toBeGreaterThan(0.12);
    }
  });

  it('routes every line and leaves nothing unplumbed', () => {
    expect(plumbed.problems).toEqual([]);
    expect(plumbed.runs.filter((r) => r.by === 'router')).toHaveLength(10);
  });

  it('never runs acid or hypochlorite over a walkway: they stay against the south wall, or cross the room above head height from their day tanks (plan 085)', () => {
    const chemical = plumbed.runs.filter((r) =>
      /^(Acid|Hypochlorite) (dose|supply) line$/.test(r.line),
    );
    expect(chemical.map((r) => r.line).sort()).toEqual([
      'Acid dose line',
      'Acid supply line',
      'Hypochlorite dose line',
      'Hypochlorite supply line',
    ]);
    for (const r of chemical)
      for (let i = 1; i < r.points.length; i++) {
        const [a, b] = [r.points[i - 1], r.points[i]];
        // A riser at its day tank, or a run high over the walkways.
        const rising = a[0] === b[0] && a[2] === b[2];
        const stub = Math.hypot(a[0] - b[0], a[2] - b[2]) < 0.3;
        const high = Math.min(a[1], b[1]) >= 2.3;
        if (rising || high || stub) continue;
        expect(Math.min(a[2], b[2]), r.name).toBeGreaterThan(hz - 0.8);
      }
  });

  it('doses onto the return main’s spool along the wall by quills on its top, and samples the water off the pump manifold before the filters', () => {
    const spool = run('Dosing spool');
    const along = spool.points.at(-1)!;
    for (const id of ['Hypochlorite dose line', 'Acid dose line']) {
      const quill = run(id).points.at(-1)!;
      expect(quill[2]).toBeCloseTo(along[2], 6);
      expect(quill[1]).toBeGreaterThan(along[1] + spool.od / 2);
    }
    // Off pump B's discharge, before the filters.
    const discharge = run('Discharge B');
    expect(run('Sample line').points[0][2]).toBeCloseTo(
      discharge.points[1][2],
      6,
    );
  });

  it('passes every gate of the scorer', () => {
    const score = scoreOlympic(plumbed);
    expect(score.gates).toEqual([]);
    expect(score.passes).toBe(true);
    expect(score.total).toBeGreaterThan(75);
  });

  it('joins pump B to a full-bore manifold elbow through a straight reducer', () => {
    const reducer = plumbed.reducers[0];
    expect(reducer.from).toEqual(run('Discharge B').points.at(-1));
    expect(reducer.to).toEqual(run('Pump discharge manifold').points[0]);
    expect(reducer.fromOd).toBe(run('Discharge B').od);
    expect(reducer.toOd).toBe(MAIN);
    expect(reducer.to[1] - reducer.from[1]).toBeCloseTo(0.35, 6);
    const [heel, corner, along] = run('Pump discharge manifold').points;
    expect(heel[0]).toBe(corner[0]);
    expect(heel[2]).toBe(corner[2]);
    expect(corner[1] - heel[1]).toBeGreaterThan(MAIN);
    expect(along[1]).toBe(corner[1]);
    expect(along[2]).toBeLessThan(corner[2]);
    expect(olympicRoom().reducers).toEqual(plumbed.reducers);
  });

  it('connects the drawn sample tube to pump B’s discharge without an air gap', () => {
    const discharge = run('Discharge B');
    const [from, to] = discharge.points.slice(1, 3);
    const sample = olympicRoom().runs.find((r) => r.name === 'Sample line')!;
    const tap = sample.points[0];
    expect(tap[0]).toBeGreaterThan(Math.min(from[0], to[0]));
    expect(tap[0]).toBeLessThan(Math.max(from[0], to[0]));
    expect(tap[1]).toBeCloseTo(from[1], 6);
    expect(tap[2]).toBeCloseTo(from[2], 6);
    expect(sample.points[1][1]).toBeGreaterThan(from[1] + discharge.od / 2);
  });

  it('draws the pumps’ suctions short and straight through the west wall from the balance tank', () => {
    for (const s of ['A', 'B']) {
      const r = run(`Suction ${s}`);
      expect(r.points).toHaveLength(2);
      expect(r.points[0][0]).toBeLessThan(-hx);
      // Through the wall and across the maintenance gap behind the pumps.
      expect(Math.abs(r.points[1][0] - r.points[0][0])).toBeLessThan(2);
    }
  });

  it('carries the pool’s overflow and main drain across the north-west corner, falling all the way into the balance tank hall', () => {
    for (const name of ['Pool overflow main', 'Pool main drain']) {
      const r = run(name);
      expect(r.od).toBe(MAIN);
      expect(r.points[0][2]).toBeLessThan(-hz);
      expect(r.points.at(-1)![0]).toBeLessThan(-hx);
      for (let k = 1; k < r.points.length; k++)
        expect(r.points[k][1]).toBeLessThanOrEqual(r.points[k - 1][1]);
    }
  });

  it('falls the backwash to its floor channel and on to the main plant in the south', () => {
    const drop = run('Backwash drop and floor channel');
    expect(drop.points.at(-1)![2]).toBeGreaterThan(hz);
    for (let k = 1; k < drop.points.length; k++)
      expect(drop.points[k][1]).toBeLessThanOrEqual(drop.points[k - 1][1]);
  });

  it('sends each routed line out by its wall’s role: the pool north, the main plant south, the tank west, power east', () => {
    const end = (id: string) => plumbed.runs.find((r) => r.name === id)!.points;
    expect(end('uv-to-pool').at(-1)![2]).toBeLessThan(-hz + 0.2);
    expect(end('heating-flow')[0][2]).toBeGreaterThan(hz - 0.2);
    expect(end('make-up')[0][2]).toBeGreaterThan(hz - 0.2);
    expect(end('make-up').at(-1)![0]).toBeLessThan(-hx + 0.2);
    // Power: the busbar fed through the east wall.
    expect(end('Busbar feed')[0][0]).toBeGreaterThan(hx);
  });

  it('works every valve by its solenoid from the panel, every local isolator by hand within reach, every tap-off by its pole', () => {
    for (const f of plumbed.fittings) {
      expect(f.operator).toBe(
        f.kind === 'power-isolator'
          ? 'hand'
          : f.kind === 'fused-tap-off'
            ? 'pole'
            : f.kind === 'non-return-valve'
              ? 'self'
              : f.kind === 'flowmeter'
                ? 'none'
                : 'solenoid',
      );
      expect(f.reachable, f.id).toBe(true);
    }
  });

  it('feeds every machine by a short drop from the busbar ring round the walls, each drop behind a fused tap-off', () => {
    const ring = run('Busbar ring');
    expect(ring.points[0]).toEqual(ring.points.at(-1));
    for (const p of ring.points) expect(p[1]).toBeGreaterThan(5.6);
    const drops = plumbed.runs.filter(
      (r) => r.medium === 'power' && r.line.startsWith('power-'),
    );
    expect(drops.map((r) => r.line).sort()).toEqual([
      'power-generator',
      'power-panel',
      'power-pump-A',
      'power-pump-B',
      'power-uv',
    ]);
    const length = (pts: readonly (readonly number[])[]) =>
      pts
        .slice(1)
        .reduce(
          (a, q, k) =>
            a +
            Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1], q[2] - pts[k][2]),
          0,
        );
    for (const d of drops) {
      expect(length(d.points), d.line).toBeLessThan(11);
      expect(
        plumbed.fittings.some(
          (f) => f.kind === 'fused-tap-off' && f.line === d.line,
        ),
        d.line,
      ).toBe(true);
    }
  });
});

describe('the battery’s five-valve faces and flowmeters', () => {
  const plumbed = plumbOlympic();
  const filterValves = (n: number) =>
    plumbed.fittings
      .filter(
        (f) => f.id.startsWith(`filter-${n}.`) && f.kind === 'isolating-valve',
      )
      .map((f) => f.id.split('.')[1])
      .sort();

  it('gives every filter its five valves and its drain', () => {
    for (let n = 1; n <= 5; n++)
      expect(filterValves(n)).toEqual(
        [
          'backwashIn',
          'backwashOut',
          'drain',
          'inlet',
          'outlet',
          'rinse',
        ].sort(),
      );
  });

  it('tags them by their places on the face, shut but for V1 and V2 in service', () => {
    const tags = olympicValveTags().filter((t) => t.tag.startsWith('PL2-F1-'));
    expect(Object.fromEntries(tags.map((t) => [t.tag, t.normal]))).toEqual({
      'PL2-F1-V1': 'open',
      'PL2-F1-V2': 'open',
      'PL2-F1-V3': 'closed',
      'PL2-F1-V4': 'closed',
      'PL2-F1-V5': 'closed',
      'PL2-F1-DV1': 'closed',
    });
  });

  it('meters each filter’s outlet riser, under its backwash-in branch, and the pumps’ discharge', () => {
    const meters = olympicRoom().runs.flatMap((r) =>
      (r.meters ?? []).map((m) => ({ run: r.name, ...m })),
    );
    expect(meters.map((m) => m.tag).sort()).toEqual([
      'PL2-F1-FT1',
      'PL2-F2-FT1',
      'PL2-F3-FT1',
      'PL2-F4-FT1',
      'PL2-F5-FT1',
      'PL2-P1-FT1',
    ]);
    for (const m of meters.filter((x) => x.tag !== 'PL2-P1-FT1')) {
      expect(m.run).toMatch(/^Filter \d outlet$/);
      const into = plumbed.runs.find(
        (r) => r.name === m.run.replace('outlet', 'backwash in'),
      )!;
      const rinse = plumbed.runs.find(
        (r) => r.name === m.run.replace('outlet', 'rinse'),
      )!;
      expect(m.at[1]).toBeLessThan(into.points[0][1]);
      expect(m.at[1]).toBeGreaterThan(rinse.points[0][1]);
    }
  });
});

describe('the plumber’s options', () => {
  it('fits no flowmeters when asked for none', () => {
    const none = plumbOlympic({ ...OLYMPIC, flowmeters: new Set() });
    expect(none.fittings.some((f) => f.kind === 'flowmeter')).toBe(false);
  });

  it('keeps the three-valve face as an option', () => {
    const three = plumbOlympic({ ...OLYMPIC, filterValves: 3 });
    expect(three.runs.some((r) => / rinse$/.test(r.name))).toBe(false);
    expect(
      three.fittings.filter(
        (f) => f.id.startsWith('filter-1.') && f.kind === 'isolating-valve',
      ),
    ).toHaveLength(3);
  });

  it('works the valves by hand, or a chain wheel out of reach, when asked', () => {
    const manual = plumbOlympic({ ...OLYMPIC, actuation: 'prefer-manual' });
    const valves = manual.fittings.filter((f) => f.kind === 'isolating-valve');
    expect(new Set(valves.map((f) => f.operator))).toEqual(
      new Set(['hand', 'chain']),
    );
    for (const f of valves)
      expect(f.operator).toBe(
        f.at[1] > 2.1 || f.at[1] < 0.2 ? 'chain' : 'hand',
      );
  });
});

describe('the filters’ windows', () => {
  const plumbed = plumbOlympic();
  // Each filter's sight glass and service hatch, on its shell, in the room,
  // and the way each faces (normal to the shell): a window is looked into
  // along its normal.
  const g = sandFilterGeometry(3);
  const windows = olympicPlan()
    .filter((i) => i.key.startsWith('filter'))
    .flatMap((f) => {
      // The vessel's axis in the room (the model stands it 0.1 m forward).
      const cz = footprintOf(f).maxZ - f.d / 2 + FILTER_CENTRE_Z + 0.1;
      const on = (x: number, y: number, radius: number, what: string) => {
        const z = Math.sqrt(g.r * g.r - x * x);
        return {
          what: `${f.key} ${what}`,
          at: [f.x + x, y, cz + z],
          normal: [x / g.r, 0, z / g.r],
          radius,
        };
      };
      return [
        // The glass itself, inside its bezel (`pumps-plant.ts`): what one looks through.
        on(
          -g.r * SIGHT_GLASS.across,
          g.cy + SIGHT_GLASS.above,
          SIGHT_GLASS.radius - 0.02,
          'sight glass',
        ),
        on(0, g.hatch.y, g.hatch.radius, 'service hatch'),
      ];
    });

  it('runs no pipe in front of any filter’s sight glass or service hatch, seen square on (the owner, 2026-10-23)', () => {
    const hidden: string[] = [];
    for (const r of plumbed.runs)
      for (let k = 1; k < r.points.length; k++) {
        const a = r.points[k - 1];
        const b = r.points[k];
        for (let t = 0; t <= 1; t += 0.02) {
          const p = [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t);
          for (const w of windows) {
            const d = p.map((v, i) => v - w.at[i]);
            const ahead =
              d[0] * w.normal[0] + d[1] * w.normal[1] + d[2] * w.normal[2];
            // Between the window and someone standing a couple of metres off it.
            if (ahead <= 0 || ahead > 2) continue;
            const side = Math.hypot(
              ...d.map((v, i) => v - ahead * w.normal[i]),
            );
            if (side < w.radius + r.od / 2)
              hidden.push(`${r.name} over ${w.what}`);
          }
        }
      }
    expect([...new Set(hidden)]).toEqual([]);
  });
});
