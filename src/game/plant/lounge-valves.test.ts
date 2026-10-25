import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../world';
import { checkMimic } from '../../toolkit/components/industrial-control/logic/mimic';
import {
  LOUNGE_VALVE_MIMIC,
  loungeValveMimicState,
} from '../../toolkit/gallery/logic/lounge-valve-mimic';
import { LOUNGE_VALVES, loungeValveFlows } from './lounge-valves';

describe('lounge pool solenoid valves', () => {
  it('models every installed valve and gives the local mimic an open and shut command', () => {
    const w = newWorld();
    expect(LOUNGE_VALVES).toHaveLength(11);
    expect(
      checkMimic(
        LOUNGE_VALVE_MIMIC,
        loungeValveMimicState(w.loungeValvePositions, {
          p1: 1,
          p2: 1,
        }),
      ),
    ).toEqual([]);
    for (const valve of LOUNGE_VALVES) {
      expect(LOUNGE_VALVE_MIMIC.buttons?.map((button) => button.id)).toContain(
        `${valve.assetId}/open`,
      );
      expect(LOUNGE_VALVE_MIMIC.buttons?.map((button) => button.id)).toContain(
        `${valve.assetId}/shut`,
      );
    }
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
});
