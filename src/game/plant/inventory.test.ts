import { describe, expect, it } from 'vite-plus/test';
import {
  ATTRACTIONS,
  BOILERS,
  CIRCUITS,
  FEATURES,
  SHARED_ROOMS,
  WATER_BODIES,
  buildGraph,
  hallLoss,
  hallTemperature,
  heatDemand,
} from './inventory';
import { inventoryReport } from './inventory-report';
import document from '../../../doc/plant-inventory.md?raw';

const { nodes, edges } = buildGraph();
const ids = new Set(nodes.map((x) => x.id));
const out = (from: string, medium?: string) =>
  edges.filter((e) => e.from === from && (!medium || e.medium === medium));
const into = (to: string, medium?: string) =>
  edges.filter((e) => e.to === to && (!medium || e.medium === medium));

describe('the plant inventory', () => {
  it('finds the water in all five pool rooms, a plausible amount of it', () => {
    expect(new Set(WATER_BODIES.map((b) => b.attraction))).toEqual(
      new Set(ATTRACTIONS.map((a) => a.id)),
    );
    const volume = WATER_BODIES.reduce((s, b) => s + b.volume, 0);
    // About what a big real leisure complex holds: not a reservoir's worth.
    expect(volume).toBeGreaterThan(1500);
    expect(volume).toBeLessThan(5000);
    for (const b of WATER_BODIES) {
      expect(b.area).toBeGreaterThan(0);
      expect(b.volume).toBeGreaterThan(0);
    }
  });

  it('joins every connection to things that exist', () => {
    for (const e of edges) {
      expect(ids.has(e.from), e.from).toBe(true);
      expect(ids.has(e.to), e.to).toBe(true);
    }
    expect(ids.size).toBe(nodes.length);
  });

  it('gives each attraction a plant room of its own, through its door and onto the corridor', () => {
    for (const a of ATTRACTIONS) {
      const room = `plant-${a.id}`;
      expect(ids.has(room)).toBe(true);
      expect(edges).toContainEqual({ from: a.id, to: room, medium: 'access' });
      expect(edges).toContainEqual({
        from: room,
        to: 'service-corridor',
        medium: 'access',
      });
    }
    for (const r of SHARED_ROOMS)
      if (r.id !== 'service-corridor')
        expect(edges).toContainEqual({
          from: 'service-corridor',
          to: r.id,
          medium: 'access',
        });
  });

  it('treats every body of water round a circuit: out to its balance tank, back from its dosing', () => {
    for (const b of WATER_BODIES) {
      expect(out(b.id, 'pool-water').map((e) => e.to)).toContain(
        `balance-${b.circuit}`,
      );
      expect(into(b.id, 'pool-water').map((e) => e.from)).toContain(
        `dosing-${b.circuit}`,
      );
    }
  });

  it('gives every circuit its whole treatment train, in its own plant room, fed from the shared plant', () => {
    for (const c of CIRCUITS) {
      const room = `plant-${c.attraction}`;
      for (const part of ['pumps', 'filters', 'hx', 'uv', 'dosing', 'cleaner'])
        expect(
          nodes.find((x) => x.id === `${part}-${c.id}`)?.in,
          `${part}-${c.id}`,
        ).toBe(room);
      expect(nodes.find((x) => x.id === `balance-${c.id}`)?.in).toBe(
        'balance-tanks',
      );
      expect(into(`hx-${c.id}`, 'lthw').map((e) => e.from)).toContain(
        'lthw-header',
      );
      expect(into(`dosing-${c.id}`, 'chemical').length).toBe(2);
      expect(into(`balance-${c.id}`, 'make-up').map((e) => e.from)).toContain(
        'break-tank',
      );
      expect(out(`filters-${c.id}`, 'drain').map((e) => e.to)).toContain(
        'backwash-tank',
      );
      expect(c.filters).toBeGreaterThanOrEqual(2);
      // Turned over within its strictest water's period.
      expect(c.flow).toBeGreaterThan(0);
    }
  });

  it('powers every plant room from the switchboard and reports it to the control room', () => {
    for (const a of ATTRACTIONS) {
      expect(into(`panel-${a.id}`, 'power').map((e) => e.from)).toContain(
        'lv-board',
      );
      expect(out(`panel-${a.id}`, 'signal').map((e) => e.to)).toContain('bms');
      expect(out(`ahu-${a.id}`, 'air').map((e) => e.to)).toContain(a.id);
    }
    expect(out('bms', 'signal').map((e) => e.to)).toContain('duty-desk');
  });

  it('lights every hall from the switch room, and keeps emergency lights in every hall and plant room', () => {
    for (const a of ATTRACTIONS) {
      expect(edges).toContainEqual({
        from: 'lighting-control',
        to: a.id,
        medium: 'lighting',
      });
      expect(edges).toContainEqual({
        from: 'emergency-battery',
        to: a.id,
        medium: 'lighting',
      });
      expect(edges).toContainEqual({
        from: 'emergency-battery',
        to: `plant-${a.id}`,
        medium: 'lighting',
      });
    }
    for (const id of [
      'lv-board',
      'lighting-control',
      'emergency-battery',
      'ups',
    ])
      expect(nodes.find((x) => x.id === id)?.in).toBe('switch-room');
    // Every utility comes in through one room: one isolator, one valve, one stopcock.
    for (const id of [
      'supply-intake',
      'gas-meter',
      'water-main',
      'sewer-connection',
    ])
      expect(nodes.find((x) => x.id === id)?.in).toBe('utilities-intake');
    // The control room rides through a power cut on its UPS.
    expect(into('bms', 'power').map((e) => e.from)).toEqual(['ups']);
  });

  it('takes deliveries at the loading bay: chemicals to the store, spares to every plant room', () => {
    expect(edges).toContainEqual({
      from: 'loading-bay',
      to: 'chemical-store',
      medium: 'delivery',
    });
    for (const a of ATTRACTIONS)
      expect(edges).toContainEqual({
        from: 'loading-bay',
        to: `plant-${a.id}`,
        medium: 'delivery',
      });
  });

  it('gives every slide that runs a flume pump, and none to those that do not', () => {
    for (const f of FEATURES)
      expect(ids.has(`flume-pump-${f.id}`)).toBe(f.running);
    expect(FEATURES.filter((f) => f.running).length).toBe(2);
  });

  it('sizes the boilers for the pools and the halls, with one to spare', () => {
    const demand = heatDemand();
    expect(demand.total).toBeGreaterThan(300);
    expect(BOILERS).toBeGreaterThanOrEqual(3);
    // Few enough to draw: complicated, but comprehensible.
    expect(BOILERS).toBeLessThanOrEqual(8);
    for (let i = 1; i <= BOILERS; i++)
      expect(out(`boiler-${i}`, 'lthw').map((e) => e.to)).toContain(
        'lthw-header',
      );
  });

  it('loses heat to the cold world through every hall’s fabric: the bigger the hall, the more', () => {
    const losses = ATTRACTIONS.map((a) => ({ a, loss: hallLoss(a) }));
    for (const { loss } of losses) {
      expect(loss.fabric).toBeGreaterThan(0);
      expect(loss.ventilation).toBeGreaterThan(0);
    }
    const byWall = [...losses].sort(
      (p, q) => p.a.walls + p.a.roof - (q.a.walls + q.a.roof),
    );
    // The hall with the most fabric loses the most through it.
    expect(byWall.at(-1)!.loss.fabric).toBe(
      Math.max(...losses.map((l) => l.loss.fabric)),
    );
    expect(heatDemand().fabric).toBeGreaterThan(0);
    for (const a of ATTRACTIONS)
      expect(hallTemperature(a.id)).toBeGreaterThan(27);
  });

  it('keeps its document current (scripts/update-plant-inventory.test.ts regenerates it)', () => {
    expect(document).toBe(inventoryReport());
  });
});
