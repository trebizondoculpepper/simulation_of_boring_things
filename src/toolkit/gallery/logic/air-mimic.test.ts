import { describe, expect, it } from 'vite-plus/test';
import { airMimicSpec, airMimicState } from './air-mimic';
import { AIR_UNITS } from './air-plant';

const spec = airMimicSpec();

describe('the air plant’s mimic', () => {
  it('shows every unit, with its four lamps, on the board', () => {
    for (const u of AIR_UNITS)
      for (const k of ['run', 'hp', 'filter', 'fault'])
        expect(
          spec.lamps.some((l) => l.id === `${u.tag}-${k}`),
          `${u.tag} ${k}`,
        ).toBe(true);
    for (const l of spec.lamps) {
      expect(Math.abs(l.at[0]), l.id).toBeLessThan(spec.width / 2);
      expect(Math.abs(l.at[1]), l.id).toBeLessThan(spec.height / 2);
    }
  });

  it('gives each hall a readout and its programme’s buttons', () => {
    for (const h of ['lounge', 'olympic', 'jacuzzi', 'footbath']) {
      expect(spec.readouts.some((r) => r.id === h)).toBe(true);
      expect(spec.buttons?.some((b) => b.id === `${h}-on`)).toBe(true);
      expect(spec.buttons?.some((b) => b.id === `${h}-off`)).toBe(true);
    }
  });

  it('lights what the units are doing, and reads each hall’s air', () => {
    const units = Object.fromEntries(
      AIR_UNITS.map((u) => [
        u.tag,
        {
          run: u.hall === 'olympic',
          heatPump: false,
          filter: u.tag === 'AHU-803',
          fault: false,
          speed: u.hall === 'olympic' ? 1 : 0,
          hallRh: 58,
        },
      ]),
    );
    const state = airMimicState({ units, occupied: { olympic: true } });
    expect(state.lamps['AHU-802-run']).toBe(true);
    expect(state.lamps['AHU-801-run']).toBe(false);
    expect(state.lamps['AHU-803-filter']).toBe(true);
    expect(state.lamps['olympic-occupied']).toBe(true);
    expect(state.readouts.olympic.rh.value).toBe(58);
    const olympicFlow =
      AIR_UNITS.filter((u) => u.hall === 'olympic').reduce(
        (s, u) => s + u.airflow,
        0,
      ) / 3600;
    expect(state.readouts.olympic.flow.value).toBeCloseTo(olympicFlow, 6);
    expect(state.readouts.lounge.flow.value).toBe(0);
  });
});
