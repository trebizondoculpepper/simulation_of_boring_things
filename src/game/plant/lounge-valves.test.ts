import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../world';
import {
  LOUNGE_VALVES,
  loungeFlowsOf,
  loungeMeterReadings,
  loungeValveFlows,
} from './lounge-valves';

describe('lounge pool solenoid valves', () => {
  it('models every installed valve', () => {
    // Their OPEN and SHUT are the filter mimic's (`lounge-filter-mimic.test.ts`).
    expect(LOUNGE_VALVES).toHaveLength(11);
  });

  it('travels to shut, blocks its filter path, and springs shut without power, not air', () => {
    let w = newWorld();
    expect(loungeValveFlows(w.loungeValvePositions, true).toPool).toBe(90);
    w = applyAction(w, { type: 'plant/valve', id: 'valve-0003', open: false });
    w = stepWorld(w, 2);
    expect(w.loungeValvePositions['valve-0003']).toBeCloseTo(0.5);
    w = stepWorld(w, 2);
    expect(w.loungeValvePositions['valve-0003']).toBe(0);
    expect(loungeValveFlows(w.loungeValvePositions, true).toPool).toBe(45);
    // Electric actuators: losing the compressed air leaves them be.
    w = applyAction(w, { type: 'plant/source', utility: 'air', on: false });
    w = stepWorld(w, 4);
    expect(w.loungeValvePositions['valve-0001']).toBe(1);
    // Losing their room's power, their springs shut them.
    w = applyAction(w, {
      type: 'plant/feeder',
      room: 'plant_pool_01',
      on: false,
    });
    w = stepWorld(w, 4);
    expect(w.loungeValvePositions['valve-0001']).toBe(0);
    expect(loungeValveFlows(w.loungeValvePositions, true).toPool).toBe(0);
  });

  it('reports the tank drain’s own flow for its gully, separate from filter waste', () => {
    const positions = newWorld().loungeValvePositions;
    expect(loungeValveFlows(positions, true).tankDrain).toBe(0);
    positions['valve-0009'] = 0.5;
    expect(loungeValveFlows(positions, true).tankDrain).toBe(2.5);
    expect(loungeValveFlows(positions, false).tankDrain).toBe(0);
  });
  it('needs at least one pump discharge valve open to return water', () => {
    let w = newWorld();
    w = applyAction(w, { type: 'plant/valve', id: 'valve-0097', open: false });
    w = stepWorld(w, 4);
    expect(loungeValveFlows(w.loungeValvePositions, true).toPool).toBe(90);
    w = applyAction(w, { type: 'plant/valve', id: 'valve-0098', open: false });
    w = stepWorld(w, 4);
    expect(loungeValveFlows(w.loungeValvePositions, true).toPool).toBe(0);
    for (let i = 0; i < 10; i++) w = stepWorld(w, 10);
    expect(w.pools.pool_01.flow).toBeLessThan(1);
  });

  it('backwashes a filter with the other’s filtered water, down its outlet and out to waste (prompt 066)', () => {
    const positions = newWorld().loungeValvePositions;
    const tag = (t: string) => LOUNGE_VALVES.find((v) => v.tag === t)!.assetId;
    const set = (t: string, open: number) => (positions[tag(t)] = open);
    expect(loungeValveFlows(positions, true).filters).toEqual([45, 45]);
    // F1 backwashed: inlet shut, outlet and backwash open.
    set('PL1-F1-IV1', 0);
    set('PL1-F1-BV1', 1);
    const washing = loungeValveFlows(positions, true);
    expect(washing.filters).toEqual([-34, 45]);
    expect(washing.backwash).toEqual([34, 0]);
    expect(washing.toPool).toBe(11);
    // What the pumps deliver goes to the pool or to waste.
    expect(washing.toPool + washing.backwash[0]).toBe(45);
    // Both backwashing: no filtered water to wash either.
    set('PL1-F2-IV1', 0);
    set('PL1-F2-BV1', 1);
    const both = loungeValveFlows(positions, true);
    expect(both.filters).toEqual([0, 0]);
    expect(both.toPool).toBe(0);
    // Pumps stopped: everything still.
    expect(loungeValveFlows(positions, false).filters).toEqual([0, 0]);
  });

  it('rinses a filter down through its bed to drain, inlet and drain open, outlet shut', () => {
    const positions = newWorld().loungeValvePositions;
    const tag = (t: string) => LOUNGE_VALVES.find((v) => v.tag === t)!.assetId;
    const set = (t: string, open: number) => (positions[tag(t)] = open);
    set('PL1-F2-IV2', 0);
    set('PL1-F2-DV1', 1);
    const rinsing = loungeValveFlows(positions, true);
    expect(rinsing.filters).toEqual([45, 45]);
    expect(rinsing.drains[1]).toBe(45);
    expect(rinsing.toPool).toBe(45);
    // Its inlet shut too: only drained down, standing.
    set('PL1-F2-IV1', 0);
    const draining = loungeValveFlows(positions, true);
    expect(draining.filters[1]).toBe(0);
    expect(draining.drains[1]).toBe(3);
  });

  it('gives the lounge’s two flowmeters each filter’s signed flow, as the world runs', () => {
    let w = stepWorld(newWorld(), 5);
    expect(loungeMeterReadings(loungeFlowsOf(w))).toEqual({
      'filter-1': 45,
      'filter-2': 45,
    });
    for (const [id, open] of [
      [LOUNGE_VALVES.find((v) => v.tag === 'PL1-F1-IV1')!.assetId, false],
      [LOUNGE_VALVES.find((v) => v.tag === 'PL1-F1-BV1')!.assetId, true],
    ] as const)
      w = applyAction(w, { type: 'plant/valve', id, open });
    w = stepWorld(w, 5);
    expect(loungeMeterReadings(loungeFlowsOf(w))['filter-1']).toBe(-34);
  });
});
