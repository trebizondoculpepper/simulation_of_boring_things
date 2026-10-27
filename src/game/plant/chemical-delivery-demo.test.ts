import { describe, expect, it } from 'vite-plus/test';
import {
  capacityOf,
  deliveryRunning,
  newDeliveryState,
  roomFor,
  stepDelivery,
} from './chemical-delivery-demo';

describe('chemical delivery trial', () => {
  it('transfers only while connected, enabled and open', () => {
    const initial = newDeliveryState('acid');
    expect(stepDelivery(initial, 60)).toEqual(initial);
    const running = { ...initial, enabled: true, valveOpen: true };
    expect(deliveryRunning(running)).toBe(true);
    const after = stepDelivery(running, 60);
    expect(after.deliveredLitres).toBe(60);
    expect(after.tankerLitres).toBe(running.tankerLitres - 60);
    expect(after.tanksLitres[0]).toBe(running.tanksLitres[0] + 60);
    expect(
      stepDelivery({ ...running, emergencyStopped: true }, 60).deliveredLitres,
    ).toBe(0);
    expect(
      stepDelivery({ ...running, hoseConnected: false }, 60).deliveredLitres,
    ).toBe(0);
  });

  it('fills three hypochlorite tanks without losing litres or overflowing', () => {
    let state = {
      ...newDeliveryState('hypochlorite'),
      enabled: true,
      valveOpen: true,
    };
    for (let minute = 0; minute < 100; minute++)
      state = stepDelivery(state, 60);
    expect(state.deliveredLitres).toBe(4000);
    expect(state.tanksLitres.reduce((a, b) => a + b, 0)).toBe(4200 + 4000);
    expect(roomFor(state)).toBe(3800);
    expect(capacityOf(state)).toBe(12000);
  });

  it('trips before full and leaves the final contents bounded', () => {
    const fullish = {
      ...newDeliveryState('acid'),
      tanksLitres: [3890],
      enabled: true,
      valveOpen: true,
    };
    const after = stepDelivery(fullish, 120);
    expect(after.tanksLitres).toEqual([3920]);
    expect(after.deliveredLitres).toBe(30);
    expect(after.highAlarm).toBe(true);
    expect(after.enabled).toBe(false);
    expect(stepDelivery(after, 60)).toEqual(after);
  });
});
