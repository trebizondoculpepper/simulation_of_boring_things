import { describe, expect, it } from 'vite-plus/test';
import {
  CO2_DENSITY_G_M3,
  CO2_LIMITS,
  CO2_ROOMS,
  acceptCo2,
  co2DetectorAlarms,
  co2Stel,
  co2Twa,
  dosingInterlock,
  masterInterlock,
  newCo2Detector,
  resetCo2,
  stepCo2Detector,
} from './co2-detection';
import type { Co2DetectorState, Co2RoomParams } from './co2-detection';

const ROOM = CO2_ROOMS.plant_pool_01;

function run(
  s: Co2DetectorState,
  leakGh: number,
  seconds: number,
  { fan = true, dt = 10, p = ROOM as Co2RoomParams } = {},
) {
  for (let t = 0; t < seconds; t += dt)
    s = stepCo2Detector(p, s, { leakGh, fan }, dt);
  return s;
}

describe('a room’s CO₂ and its detector', () => {
  it('reads the background with no leak, and stays clear', () => {
    const s = run(newCo2Detector(ROOM), 0, 8 * 3600, { dt: 60 });
    expect(s.reading).toBeCloseTo(ROOM.background, 6);
    expect(co2Twa(s)).toBeCloseTo(ROOM.background, 6);
    expect(s.a1 || s.a2).toBe(false);
  });

  it('rises with a leak toward where its ventilation holds it', () => {
    // 2 kg/h into 600 m³ at 4 air changes: 1.09 m³/h in 2,400 m³/h, about 450 ppm more.
    const s = run(newCo2Detector(ROOM), 2000, 3 * 3600);
    const settle = ((2000 / CO2_DENSITY_G_M3) * 1e6) / (ROOM.volume * 4);
    expect(s.reading).toBeCloseTo(ROOM.background + settle, 0);
    expect(s.a1).toBe(false);
  });

  it('climbs with the extract stopped, to the low alarm, which shuts the room’s dosing', () => {
    let s = run(newCo2Detector(ROOM), 2000, 3600, { fan: false });
    expect(s.reading).toBeGreaterThan(1500);
    expect(s.a1).toBe(false);
    s = run(s, 2000, 5 * 3600, { fan: false });
    expect(s.reading).toBeGreaterThan(CO2_LIMITS.a1);
    expect(s.a1).toBe(true);
    expect(s.a2).toBe(false);
    expect(dosingInterlock(s)).toBe(true);
    expect(masterInterlock(s)).toBe(false);
    expect(co2DetectorAlarms(s)).toEqual({ beacon: true, sounder: false });
  });

  it('calls the high alarm on a burst, purges and trips the master valve', () => {
    // A broken joint, 30 kg/h, with the extract stopped.
    const s = run(newCo2Detector(ROOM), 30000, 45 * 60, { fan: false });
    expect(s.reading).toBeGreaterThan(CO2_LIMITS.a2);
    expect(s.a2).toBe(true);
    expect(masterInterlock(s)).toBe(true);
    expect(co2DetectorAlarms(s).sounder).toBe(true);
    expect(co2DetectorAlarms(acceptCo2(s))).toEqual({
      beacon: true,
      sounder: false,
    });
  });

  it('keeps 15-minute and 8-hour averages of what it reads', () => {
    // A sealed room held at 6,000 ppm.
    const p: Co2RoomParams = { ...ROOM, changes: 0, still: 0 };
    const held = {
      ...newCo2Detector(ROOM),
      reading: 6000,
      excess: 6000 - ROOM.background,
    };
    const after = (minutes: number) => {
      let t = held;
      for (let i = 0; i < minutes; i++)
        t = stepCo2Detector(p, t, { leakGh: 0, fan: true }, 60);
      return t;
    };
    // After 15 minutes the 15-minute average has it, the 8-hour only a sliver.
    expect(co2Stel(after(15))).toBeCloseTo(6000, 0);
    expect(co2Twa(after(15))).toBeLessThan(800);
    // After 8 hours both have it.
    expect(co2Twa(after(8 * 60))).toBeCloseTo(6000, 0);
  });

  it('alarms on the 8-hour limit below the instantaneous level, and on the 15-minute limit', () => {
    const quiet = newCo2Detector(ROOM);
    const longShift = {
      ...quiet,
      quarters: quiet.quarters.map(() => 5200),
    };
    const a = stepCo2Detector(ROOM, longShift, { leakGh: 0, fan: true }, 1);
    expect(a.reading).toBeLessThan(CO2_LIMITS.a1);
    expect(a.a1).toBe(true);
    expect(a.a2).toBe(false);
    const burst = { ...quiet, minutes: quiet.minutes.map(() => 15500) };
    const b = stepCo2Detector(ROOM, burst, { leakGh: 0, fan: true }, 1);
    expect(b.a2).toBe(true);
    // Neither resets while its average is over the limit.
    expect(resetCo2(a)).toBe(a);
  });

  it('latches its alarms, and resets only once the air is clear again', () => {
    let s = run(newCo2Detector(ROOM), 30000, 45 * 60, { fan: false });
    expect(s.a2).toBe(true);
    expect(resetCo2(s)).toBe(s);
    // Leak stopped, the purge clears the room, but the 15-minute average lags.
    s = run(s, 0, 10 * 60);
    expect(s.reading).toBeLessThan(CO2_LIMITS.a1);
    s = run(s, 0, 60 * 60);
    const r = resetCo2(s);
    expect(r.a1 || r.a2).toBe(false);
    expect(dosingInterlock(r)).toBe(false);
  });
});
