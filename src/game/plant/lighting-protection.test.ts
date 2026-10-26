import { describe, expect, it } from 'vite-plus/test';
import {
  advance,
  applyAction,
  emergencyLit,
  emergencyLoad,
  newWorld,
} from '../world';
import type { World } from '../world';
import { RCBO, wayPhase, zoneLit } from './lighting';
import type { LightingZoneId } from './lighting';

/**
 * DB-L1's RCBOs and the emergency lighting's central battery, in the
 * world (the owner, 2026-10-25).
 */
const lit = (w: World, z: LightingZoneId) => zoneLit(w.plant, w.lighting, z);
const board = (w: World, action: Parameters<typeof applyAction>[1]) =>
  applyAction(w, action);

describe('the lighting board’s RCBOs', () => {
  it('puts each way on a phase in turn', () => {
    expect([1, 2, 3, 4].map(wayPhase)).toEqual(['L1', 'L2', 'L3', 'L1']);
  });

  it('trips a way’s RCBO on its TEST button, with its trip flag, and the zone goes to emergency lighting', () => {
    let w = board(newWorld(), {
      type: 'lighting/board',
      action: { act: 'test', zone: 'corridors' },
    });
    expect(w.lighting.zones.corridors).toBe(false);
    expect(w.lighting.tripped.corridors).toBe(true);
    expect(lit(w, 'corridors')).toBe(false);
    expect(emergencyLit(w, 'corridors')).toBe(true);
    expect(emergencyLit(w, 'lounge')).toBe(false);
    // Switched on again: lit, its trip flag cleared.
    w = board(w, {
      type: 'lighting/board',
      action: { act: 'way', zone: 'corridors', on: true },
    });
    expect(lit(w, 'corridors')).toBe(true);
    expect(w.lighting.tripped.corridors).toBe(false);
  });

  it('trips on moisture in a zone’s fittings, and trips again when reset until they dry out', () => {
    let w = board(advance(newWorld(), 5, 1), {
      type: 'lighting/leak',
      zone: 'olympic',
      ma: RCBO.tripMa + 5,
    });
    w = advance(w, 1, 1);
    expect(w.lighting.tripped.olympic).toBe(true);
    expect(lit(w, 'olympic')).toBe(false);
    // Reset with the fault still there: it trips again.
    w = advance(
      board(w, {
        type: 'lighting/board',
        action: { act: 'way', zone: 'olympic', on: true },
      }),
      1,
      1,
    );
    expect(w.lighting.tripped.olympic).toBe(true);
    // Hours later, dried out: it stays on.
    w = advance(w, 6 * 3600, 30);
    expect(w.lighting.leakage.olympic).toBeLessThan(RCBO.tripMa);
    w = advance(
      board(w, {
        type: 'lighting/board',
        action: { act: 'way', zone: 'olympic', on: true },
      }),
      60,
      1,
    );
    expect(lit(w, 'olympic')).toBe(true);
  });

  it('takes every way off with its main switch', () => {
    const w = board(newWorld(), {
      type: 'lighting/board',
      action: { act: 'main', on: false },
    });
    expect(lit(w, 'lounge')).toBe(false);
    expect(lit(w, 'switch_room')).toBe(false);
  });
});

describe('the emergency lighting’s central battery', () => {
  it('charges on mains with every zone lit, carrying nothing', () => {
    const w = advance(newWorld(), 60, 1);
    expect(emergencyLoad(w)).toBe(0);
    expect(w.centralBattery.charge).toBe(1);
  });

  it('lights every zone on a mains failure, for its rated three hours, then the building is dark', () => {
    let w = board(advance(newWorld(), 5, 1), {
      type: 'plant/source',
      utility: 'power',
      on: false,
    });
    w = advance(w, 60, 1);
    expect(emergencyLoad(w)).toBe(1);
    expect(emergencyLit(w, 'corridors')).toBe(true);
    w = advance(w, 2.5 * 3600, 30);
    expect(w.centralBattery.charge).toBeGreaterThan(0);
    expect(emergencyLit(w, 'corridors')).toBe(true);
    w = advance(w, 3600, 30);
    expect(w.centralBattery.charge).toBe(0);
    expect(emergencyLit(w, 'corridors')).toBe(false);
    // The mains back: it recharges.
    w = advance(
      board(w, { type: 'plant/source', utility: 'power', on: true }),
      3600,
      30,
    );
    expect(w.centralBattery.charge).toBeGreaterThan(0);
  });

  it('runs its FUNCTION TEST from its key, every emergency fitting lit, and ends it', () => {
    let w = board(newWorld(), { type: 'battery/test', kind: 'function' });
    expect(emergencyLit(w, 'lounge')).toBe(true);
    w = advance(w, 90, 1);
    expect(w.centralBattery.test).toBeNull();
    expect(w.centralBattery.last).toBe('passed');
    expect(emergencyLit(w, 'lounge')).toBe(false);
  });
});
