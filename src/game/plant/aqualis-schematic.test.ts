import { describe, expect, it } from 'vite-plus/test';
import { portsOf } from '../../toolkit/components/plant/logic/aqualis-cabinet';
import { OLYMPIC_ANNEX } from '../../toolkit/gallery/logic/olympic-annex';
import { olympicPlumbing } from '../../toolkit/gallery/logic/olympic-plumbing';
import {
  LOUNGE_TRIO,
  LOUNGE_TRIO_SITE,
  OLYMPIC_TRIO,
  OLYMPIC_TRIO_SITE,
  SAMPLE_POINT,
  TRIO_LINKS,
  TRIO_PORTS,
  TRIO_UNLINKED_PORTS,
  olympicTrioExpansion,
} from './aqualis-schematic';
import type { TrioSite } from './aqualis-schematic';
import { LOUNGE_SCHEMATIC } from './lounge-schematic';
import { MODEL_VALVES } from './model-valves';
import type { PlumbEdge, PlumbNode } from './plumbing-expansion';
import { schematicExpansion } from './schematics';

/**
 * The Trios' graph (mission 114, step 1), checked before anything is
 * routed or drawn: every link's ends exist; the sample is tapped upstream
 * of the filters and every dosing point and returns to the balance tank;
 * every dosing pump has its control link; the CO₂ port is declared and
 * unlinked; the tags derive; the plumber adds nothing.
 */

interface RoomGraph {
  name: string;
  site: TrioSite;
  nodes: readonly PlumbNode[];
  links: readonly PlumbEdge[];
}

const olympic = () => {
  const { expansion, schematic } = olympicPlumbing();
  const fittings = new Set(expansion.fittings.map((f) => f.id));
  return {
    nodes: [
      ...expansion.nodes.filter((n) => !fittings.has(n.id)),
      ...OLYMPIC_ANNEX.nodes,
    ],
    links: [...schematic.edges, ...OLYMPIC_ANNEX.links],
  };
};

const ROOMS: RoomGraph[] = [
  {
    name: 'the Lounge',
    site: LOUNGE_TRIO_SITE,
    nodes: LOUNGE_SCHEMATIC.nodes,
    links: LOUNGE_SCHEMATIC.links,
  },
  { name: 'the Olympic', site: OLYMPIC_TRIO_SITE, ...olympic() },
];

const kindOf = (g: RoomGraph, id: string) =>
  g.nodes.find((n) => n.id === id)?.kind;

/** The nodes upstream of `from` through water links, as far as the balance tank (where the circuit begins). */
function upstream(g: RoomGraph, from: string): Set<string> {
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (kindOf(g, at) === 'balance-tank') continue;
    for (const l of g.links)
      if (l.medium === 'water' && l.targetId === at && !seen.has(l.sourceId)) {
        seen.add(l.sourceId);
        queue.push(l.sourceId);
      }
  }
  return seen;
}

/** The nodes downstream of `from` through water links. */
function downstream(g: RoomGraph, from: string): Set<string> {
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    for (const l of g.links)
      if (l.medium === 'water' && l.sourceId === at && !seen.has(l.targetId)) {
        seen.add(l.targetId);
        queue.push(l.targetId);
      }
  }
  return seen;
}

const isFilter = (kind: string | undefined) => /filter/.test(kind ?? '');
const isPumpSet = (kind: string | undefined) =>
  kind === 'pump-pair' || kind === 'pumps';
const DOSING_KINDS = new Set(['hypo-pumps', 'acid-pump']);

describe.each(ROOMS)('the Trio in $name', (g) => {
  const { site } = g;
  const linkNamed = (id: string) => g.links.find((l) => l.id === id);
  const at = (node: string, port: string) =>
    g.links.filter(
      (l) =>
        (l.sourceId === node && l.sourcePort === port) ||
        (l.targetId === node && l.targetPort === port),
    );

  it('joins only nodes its room has', () => {
    const ids = new Set(g.nodes.map((n) => n.id));
    const trio = (site.code === 'PL1' ? LOUNGE_TRIO : OLYMPIC_TRIO).links;
    for (const l of trio) {
      expect(ids.has(l.sourceId), `${l.id} from ${l.sourceId}`).toBe(true);
      expect(ids.has(l.targetId), `${l.id} to ${l.targetId}`).toBe(true);
      expect(linkNamed(l.id)).toEqual(l);
    }
    // Every link's ends, the room's whole graph.
    for (const l of g.links) {
      expect(ids.has(l.sourceId), `${l.id} from ${l.sourceId}`).toBe(true);
      expect(ids.has(l.targetId), `${l.id} to ${l.targetId}`).toBe(true);
    }
  });

  it('is a dosing controller, CP2, its sample point SP1', () => {
    const cabinet = g.nodes.find((n) => n.id === site.cabinet) as
      | (PlumbNode & { code?: string })
      | undefined;
    expect(cabinet?.kind).toBe('dosing-controller');
    expect(cabinet?.code).toBe('CP2');
    const point = g.nodes.find((n) => n.id === SAMPLE_POINT) as
      | (PlumbNode & { code?: string })
      | undefined;
    expect(point?.kind).toBe('sample-point');
    expect(point?.code).toBe('SP1');
  });

  it('links every port of the cabinet but its CO₂ channel’s, which is declared and unlinked', () => {
    for (const p of TRIO_PORTS) {
      const links = at(site.cabinet, p.id);
      if (TRIO_UNLINKED_PORTS.has(p.id)) expect(links).toEqual([]);
      else {
        expect(links.length, p.id).toBe(1);
        expect(links[0].medium, p.id).toBe(p.medium);
      }
    }
    expect(TRIO_PORTS.some((p) => p.id === 'co2')).toBe(true);
    expect(g.links.some((l) => l.id === TRIO_LINKS.co2)).toBe(false);
  });

  it('taps its sample from the pump discharge, upstream of the filters and of every dosing point', () => {
    const tapping = linkNamed(TRIO_LINKS.tapping)!;
    expect(tapping.targetId).toBe(SAMPLE_POINT);
    const main = tapping.sourceId;
    const up = upstream(g, main);
    // The pump set feeds it; no filter, and nothing dosed, is before it.
    expect([...up].some((id) => isPumpSet(kindOf(g, id)))).toBe(true);
    expect([...up].filter((id) => isFilter(kindOf(g, id)))).toEqual([]);
    const dosed = new Set(
      g.links
        .filter(
          (l) =>
            l.medium === 'chemical' &&
            !l.id.endsWith('to its day tank') &&
            kindOf(g, l.targetId) !== 'chem-day' &&
            !DOSING_KINDS.has(kindOf(g, l.targetId) ?? '') &&
            kindOf(g, l.targetId) !== 'injection-quill',
        )
        .map((l) => l.targetId),
    );
    expect(dosed.size).toBeGreaterThan(0);
    expect([...up, main].filter((id) => dosed.has(id))).toEqual([]);
    // The pumps' discharge reaches the filters (so the tapping is before them).
    const pumps = [...up].find((id) => isPumpSet(kindOf(g, id)))!;
    expect(
      [...downstream(g, pumps)].some((id) => isFilter(kindOf(g, id))),
    ).toBe(true);
  });

  it('sends its sample to the cabinet and returns it to the balance tank', () => {
    const sample = linkNamed(TRIO_LINKS.sample)!;
    expect([sample.sourceId, sample.targetId]).toEqual([
      SAMPLE_POINT,
      site.cabinet,
    ]);
    const back = linkNamed(TRIO_LINKS.return)!;
    expect(back.sourceId).toBe(site.cabinet);
    expect(back.sourcePort).toBe('sampleOut');
    expect(kindOf(g, back.targetId)).toBe('balance-tank');
  });

  it('has a control link to each of its room’s dosing pumps, and to its annunciator', () => {
    const pumps = g.nodes.filter((n) => DOSING_KINDS.has(n.kind));
    expect(pumps.length).toBe(2);
    for (const p of pumps) {
      const control = g.links.filter(
        (l) =>
          l.medium === 'control' &&
          l.sourceId === site.cabinet &&
          l.targetId === p.id,
      );
      expect(control.length, p.id).toBe(1);
      expect(control[0].targetPort).toBe('control');
      expect(control[0].sourcePort).toBe(
        p.kind === 'hypo-pumps' ? 'hypochlorite' : 'acid',
      );
    }
    const alarm = at(site.cabinet, 'alarm')[0];
    expect(alarm.targetId).toBe(site.alarm[0]);
    expect(kindOf(g, alarm.targetId)).toBe(
      site.code === 'PL1' ? 'annunciator' : 'panel',
    );
  });

  it('retires the old controller’s sample line', () => {
    expect(at(site.cabinet, 'sample')).toEqual([]);
    expect(linkNamed('Sample line from the filtered main')).toBeUndefined();
    expect(linkNamed('sample')).toBeUndefined();
  });

  it('derives its valves’ tags: the tapping’s, the inlet’s and the return’s', () => {
    const valves = MODEL_VALVES.filter(
      (v) =>
        v.room === site.room &&
        (Object.values(TRIO_LINKS) as string[]).includes(v.link),
    );
    const tags = Object.fromEntries(valves.map((v) => [v.id, v.tag]));
    expect(tags).toEqual({
      [`${site.code}.sample-point.out.iso`]: `${site.code}-SP1-IV1`,
      [`${site.code}.${site.cabinet}.sampleIn.iso`]: `${site.code}-CP2-IV1`,
      [`${site.code}.${site.cabinet}.sampleOut.iso`]: `${site.code}-CP2-IV2`,
    });
    for (const v of valves) {
      expect(v.tag).not.toMatch(/-X-/);
      expect(v.normal).toBe('open');
    }
  });
});

describe('the Trios’ plumbing', () => {
  it('gives every fitting: the plumber adds none', () => {
    expect(schematicExpansion('plant_pool_01')!.added).toEqual([]);
    expect(olympicTrioExpansion().added).toEqual([]);
    expect(olympicTrioExpansion().fittings.map((f) => f.id)).toEqual(
      OLYMPIC_TRIO.fittings.map((f) => f.id),
    );
    for (const id of OLYMPIC_TRIO.fittings.map((f) => f.id))
      expect(OLYMPIC_ANNEX.fittings).toContain(id);
  });

  it('isolates the Lounge’s Trio at its switch-fuse’s way, PL1-CP2-IS1', () => {
    const isolator = MODEL_VALVES.find(
      (v) => v.id === 'PL1.dosing.power.isolator',
    );
    expect(isolator?.tag).toBe('PL1-CP2-IS1');
    expect(isolator?.kind).toBe('power-isolator');
  });

  it('declares the cabinet’s ports as its view has them, its mains entry among them', () => {
    expect(TRIO_PORTS.map((p) => p.id).sort()).toEqual(
      Object.keys(portsOf('trio')).sort(),
    );
  });
});
