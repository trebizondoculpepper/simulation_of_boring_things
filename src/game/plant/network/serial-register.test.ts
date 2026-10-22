import { describe, expect, it } from 'vite-plus/test';
import { registerProblems, withNewSerials } from './serial-register';
import type { PlantNetwork, PlantNode } from './types';

const node = (id: string): PlantNode => ({
  id,
  name: id,
  kind: 'valve',
  class: 'valve',
  system: 'test',
  ports: {},
  aspects: { hydraulics: 'modelled' },
});
const net = (...ids: string[]): PlantNetwork => ({
  nodes: ids.map(node),
  links: [],
});

describe('the serial register', () => {
  it('gives new things the next serials, leaving the old ones alone', () => {
    const reg = withNewSerials(net('pl1.p1', 'pl1.p0', 'pl1.p2'), {
      serials: { 'pl1.p1': 1, 'pl1.p2': 2 },
      retired: [],
    });
    expect(reg.serials).toEqual({ 'pl1.p1': 1, 'pl1.p2': 2, 'pl1.p0': 3 });
  });

  it('never gives out a retired serial again', () => {
    const reg = withNewSerials(net('pl1.p1', 'pl1.p3'), {
      serials: { 'pl1.p1': 1 },
      retired: [2, 7],
    });
    expect(reg.serials['pl1.p3']).toBe(8);
  });

  it('finds what is missing, doubled, retired or left behind', () => {
    const problems = registerProblems(net('pl1.p1', 'pl1.p2', 'pl1.p3'), {
      serials: { 'pl1.p1': 1, 'pl1.p2': 1, 'pl1.p9': 4, 'pl1.p3': 5 },
      retired: [5],
    });
    expect(problems.join('\n')).toMatch(
      /Serial 1 is given to both pl1.p1 and pl1.p2/,
    );
    expect(problems.join('\n')).toMatch(
      /pl1.p9 \(serial 4\) is in the register but not the network/,
    );
    expect(problems.join('\n')).toMatch(/Serial 5 of pl1.p3 is retired/);
    expect(
      registerProblems(net('pl1.p4'), { serials: {}, retired: [] })[0],
    ).toMatch(/pl1.p4 has no serial/);
  });
});
