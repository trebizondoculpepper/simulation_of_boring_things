import { describe, expect, it } from 'vite-plus/test';
import { expandForPlumbing, operatorFor } from './plumbing-expansion';
import type { PlumbEdge, PlumbNode } from './plumbing-expansion';

const nodes: PlumbNode[] = [
  { id: 'tank', kind: 'balance-tank' },
  { id: 'pump', kind: 'pool-pump' },
  { id: 'filter', kind: 'sand-filter' },
  { id: 'mains', kind: 'mains' },
  { id: 'breaker', kind: 'remote-breaker' },
  { id: 'boiler', kind: 'boiler' },
];
const edges: PlumbEdge[] = [
  {
    id: 'suction',
    sourceId: 'tank',
    sourcePort: 'supply',
    targetId: 'pump',
    targetPort: 'suction',
    medium: 'water',
  },
  {
    id: 'delivery',
    sourceId: 'pump',
    sourcePort: 'discharge',
    targetId: 'filter',
    targetPort: 'in',
    medium: 'water',
  },
  {
    id: 'pump-power',
    sourceId: 'mains',
    sourcePort: 'feeder',
    targetId: 'pump',
    targetPort: 'power',
    medium: 'power',
  },
  {
    id: 'boiler-feed',
    sourceId: 'mains',
    sourcePort: 'feeder',
    targetId: 'breaker',
    targetPort: 'in',
    medium: 'power',
  },
  {
    id: 'breaker-to-boiler',
    sourceId: 'breaker',
    sourcePort: 'out',
    targetId: 'boiler',
    targetPort: 'power',
    medium: 'power',
  },
];
const options = {
  isolate: new Set(['pool-pump', 'sand-filter']),
  pumps: new Set(['pool-pump']),
  switchgear: new Set(['remote-breaker']),
  supplies: new Set(['mains']),
};

describe('the plumber expands the plan with its fittings', () => {
  const x = expandForPlumbing(nodes, edges, options);

  it('isolates each pump and filter connection, with a non-return valve on the discharge first', () => {
    expect(x.along.get('suction')!.map((f) => f.id)).toEqual([
      'pump.suction.iso',
    ]);
    expect(x.along.get('delivery')!.map((f) => f.id)).toEqual([
      'pump.discharge.nrv',
      'pump.discharge.iso',
      'filter.in.iso',
    ]);
  });

  it('puts a power isolator in a device feed, but not in a feed to switchgear', () => {
    expect(x.along.get('pump-power')!.map((f) => f.kind)).toEqual([
      'power-isolator',
    ]);
    expect(x.along.has('boiler-feed')).toBe(false);
    // Beyond the breaker the boiler's feed comes from switchgear, not a supply.
    expect(x.along.has('breaker-to-boiler')).toBe(false);
  });

  it('splits each link through its fittings, in order', () => {
    const chain = x.edges.filter((e) => e.id.startsWith('delivery#'));
    expect(chain.map((e) => [e.sourceId, e.targetId])).toEqual([
      ['pump', 'pump.discharge.nrv'],
      ['pump.discharge.nrv', 'pump.discharge.iso'],
      ['pump.discharge.iso', 'filter.in.iso'],
      ['filter.in.iso', 'filter'],
    ]);
    expect(chain[0].sourcePort).toBe('discharge');
    expect(chain.at(-1)!.targetPort).toBe('in');
  });

  it('is derived: the same each time, never touching the plan it was given', () => {
    const before = JSON.stringify(edges);
    const again = expandForPlumbing(nodes, edges, options);
    expect(JSON.stringify(edges)).toBe(before);
    expect(again.fittings).toEqual(x.fittings);
    expect(new Set(x.nodes.map((n) => n.id)).size).toBe(x.nodes.length);
  });

  it('names each fitting from the network, so moving a machine keeps its identity', () => {
    const moved = expandForPlumbing(
      [...nodes].reverse(),
      [...edges].reverse(),
      options,
    );
    expect(new Set(moved.fittings.map((f) => f.id))).toEqual(
      new Set(x.fittings.map((f) => f.id)),
    );
  });
});

describe('flowmeters, an option', () => {
  it('fits none unless asked', () => {
    const x = expandForPlumbing(nodes, edges, options);
    expect(x.fittings.some((f) => f.kind === 'flowmeter')).toBe(false);
  });

  it('puts one on each named port’s line, on the line’s side of its isolating valve', () => {
    const x = expandForPlumbing(nodes, edges, {
      ...options,
      flowmeters: new Set(['pool-pump.discharge', 'sand-filter.in']),
    });
    expect(x.along.get('delivery')!.map((f) => f.id)).toEqual([
      'pump.discharge.nrv',
      'pump.discharge.iso',
      'pump.discharge.meter',
      'filter.in.meter',
      'filter.in.iso',
    ]);
    expect(x.along.get('suction')!.map((f) => f.id)).toEqual([
      'pump.suction.iso',
    ]);
  });
});

describe('how a valve is worked', () => {
  const iso = { kind: 'isolating-valve' as const, medium: 'water' as const };
  it('follows the option and the reach', () => {
    expect(operatorFor(iso, true, 'prefer-manual')).toBe('hand');
    expect(operatorFor(iso, false, 'prefer-manual')).toBe('chain');
    expect(operatorFor(iso, true, 'automatic-where-hard-to-reach')).toBe(
      'hand',
    );
    expect(operatorFor(iso, false, 'automatic-where-hard-to-reach')).toBe(
      'motor',
    );
    expect(operatorFor(iso, true, 'all-automatic')).toBe('motor');
  });
  it('drives an automatic valve by the actuator asked for', () => {
    expect(
      operatorFor(iso, true, 'all-automatic', { actuator: 'solenoid' }),
    ).toBe('solenoid');
    expect(
      operatorFor(iso, false, 'automatic-where-hard-to-reach', {
        actuator: 'solenoid',
      }),
    ).toBe('solenoid');
    expect(
      operatorFor(iso, false, 'prefer-manual', { actuator: 'solenoid' }),
    ).toBe('chain');
    expect(
      operatorFor(
        { kind: 'flowmeter', medium: 'water' },
        true,
        'all-automatic',
      ),
    ).toBe('none');
  });
  it('keeps what is fixed by purpose', () => {
    expect(
      operatorFor(
        { kind: 'non-return-valve', medium: 'water' },
        true,
        'all-automatic',
      ),
    ).toBe('self');
    expect(
      operatorFor(
        { kind: 'power-isolator', medium: 'power' },
        true,
        'all-automatic',
      ),
    ).toBe('hand');
    expect(
      operatorFor(
        { kind: 'isolating-valve', medium: 'gas' },
        true,
        'prefer-manual',
        {
          safetyShutOff: true,
        },
      ),
    ).toBe('solenoid');
  });
});
