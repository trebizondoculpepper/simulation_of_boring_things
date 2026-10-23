import { describe, expect, it } from 'vite-plus/test';
import { createExperimentalSource } from './experimental-source';
import {
  createGasDetector,
  createRoomAir,
  createVent,
  DETECTOR_LEVELS,
  toPpm,
} from './room-air';

const room = () =>
  createRoomAir({
    min: [-3, 0, -2],
    max: [6, 3, 2],
    airChanges: 0,
  });

describe('room air', () => {
  it('keeps what leaks into it, spreading it, without ventilation', () => {
    const air = room();
    air.inject('ozone', [0, 1, 0], 1000);
    air.step(60);
    expect(air.total('ozone')).toBeCloseTo(1000, 0);
    // It has spread: there is some a metre away.
    expect(air.sample('ozone', [1, 1, 0])).toBeGreaterThan(0);
  });

  it('lets a heavy gas sink: more near the floor than near the ceiling', () => {
    const air = room();
    air.inject('chlorine', [0, 1.5, 0], 1000);
    air.step(120);
    expect(air.sample('chlorine', [0, 0.1, 0])).toBeGreaterThan(
      air.sample('chlorine', [0, 2.9, 0]),
    );
  });

  it('is cleared by ventilation', () => {
    const air = createRoomAir({
      min: [0, 0, 0],
      max: [2, 2, 2],
      airChanges: 6,
    });
    air.inject('ozone', [1, 1, 1], 1000);
    air.step(3600);
    expect(air.total('ozone')).toBeLessThan(10);
  });
});

describe('a leak through a vent', () => {
  it('trips the near detector before the far one, and only while the valve is open', () => {
    const air = room();
    const source = createExperimentalSource({
      id: 'exp.ozone',
      substance: 'ozone',
      quantity: 1000,
    });
    const vent = createVent({ gas: 'ozone', rate: 5, at: [0, 0.6, 0] });
    const near = createGasDetector(DETECTOR_LEVELS.ozone);
    const far = createGasDetector(DETECTOR_LEVELS.ozone);
    const step = (seconds: number, open: boolean) => {
      for (let t = 0; t < seconds; t++) {
        vent.step(1, open, (g) => source.draw(g), air);
        air.step(1);
        near.sense(toPpm('ozone', air.sample('ozone', [1.5, 0.4, 0])), 1);
        far.sense(toPpm('ozone', air.sample('ozone', [5, 0.4, 0])), 1);
      }
    };
    step(120, false);
    expect(near.alarm()).toBe('clear');
    expect(source.remaining()).toBe(1000);
    let first = -1;
    for (let t = 0; t < 1800 && first < 0; t++) {
      step(1, true);
      if (near.alarm() !== 'clear') first = t;
    }
    expect(first).toBeGreaterThan(0);
    expect(far.alarm()).toBe('clear');
    expect(source.remaining()).toBeLessThan(1000);
  });

  it('latches its alarm until reset with the air clear', () => {
    const d = createGasDetector(DETECTOR_LEVELS.chlorine);
    for (let t = 0; t < 120; t++) d.sense(2, 1);
    expect(d.alarm()).toBe('high');
    for (let t = 0; t < 600; t++) d.sense(0, 1);
    expect(d.alarm()).toBe('high');
    d.reset();
    expect(d.alarm()).toBe('clear');
  });
});
