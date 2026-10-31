import { describe, expect, it } from 'vite-plus/test';
import {
  CABINET,
  CABINET_MODELS,
  glandsOf,
  portsOf,
  KNOB_AT,
  LEDS,
  PORTS,
  SCREEN_AREA,
  SCREEN_AT,
  SCREEN_PX_PER_M,
  screenPixel,
  selectorAt,
  selectorIndex,
  turnSelector,
} from './aqualis-cabinet';
import { SCREEN } from '../../../../game/plant/aqualis-types';

describe('the Aqualis cabinet', () => {
  it('is a full-height cabinet about 0.6 × 1.8 × 0.3 m', () => {
    expect(CABINET.w).toBeCloseTo(0.6);
    expect(CABINET.h).toBeCloseTo(1.8);
    expect(CABINET.d).toBeCloseTo(0.3);
    expect(CABINET.split).toBeGreaterThan(0.5);
    expect(CABINET.split).toBeLessThan(CABINET.h - 0.5);
  });

  it('has a 7-inch screen, its pixels nearly square', () => {
    const diagonal = Math.hypot(SCREEN_AREA.w, SCREEN_AREA.h) / 0.0254;
    expect(diagonal).toBeCloseTo(7, 0);
    const ratio = SCREEN.h / SCREEN_AREA.h / SCREEN_PX_PER_M;
    expect(Math.abs(ratio - 1)).toBeLessThan(0.1);
  });

  it('keeps the screen, knob and lamps on the upper door', () => {
    const top = SCREEN_AT.y + SCREEN_AREA.h / 2 + SCREEN_AREA.bezel;
    expect(top).toBeLessThan(CABINET.h - CABINET.cap);
    for (const y of [SCREEN_AT.y, KNOB_AT.y, ...LEDS.map((l) => l.y)])
      expect(y).toBeGreaterThan(CABINET.split);
    expect(KNOB_AT.y + 0.06).toBeLessThan(
      SCREEN_AT.y - SCREEN_AREA.h / 2 - SCREEN_AREA.bezel,
    );
    for (const l of LEDS) expect(Math.abs(l.x)).toBeLessThan(CABINET.w / 2);
  });

  it('turns its knob a detent at a time and stops at the ends', () => {
    expect(turnSelector('off', 1)).toBe('auto');
    expect(turnSelector('off', -1)).toBe('hand');
    expect(turnSelector('auto', 1)).toBe('auto');
    expect(turnSelector('hand', -1)).toBe('hand');
    expect(selectorAt(selectorIndex('auto'))).toBe('auto');
  });

  it('puts the sample pipes low on the side and the glands on top', () => {
    expect(PORTS.sampleIn.at[1]).toBeLessThan(CABINET.split);
    expect(PORTS.sampleOut.at[1]).toBeLessThan(CABINET.split);
    expect(PORTS.sampleIn.at[0]).toBeCloseTo(-CABINET.w / 2);
    for (const id of ['hypochlorite', 'acid', 'co2', 'alarm'] as const) {
      expect(PORTS[id].at[1]).toBeCloseTo(CABINET.h);
      expect(PORTS[id].out).toEqual([0, 1, 0]);
    }
  });

  it('turns a touch UV into screen pixels, y down', () => {
    expect(screenPixel(0, 1)).toEqual([0, 0]);
    expect(screenPixel(1, 0)).toEqual([SCREEN.w, SCREEN.h]);
    expect(screenPixel(0.5, 0.5)).toEqual([SCREEN.w / 2, SCREEN.h / 2]);
  });
});

describe('the Dr Aqualis series', () => {
  it('gives the Trio three control glands, the Duo two, the Consultant none, each an alarm', () => {
    expect(glandsOf('trio')).toEqual(['hypochlorite', 'acid', 'co2', 'alarm']);
    expect(glandsOf('duo')).toEqual(['hypochlorite', 'acid', 'alarm']);
    expect(glandsOf('consultant')).toEqual(['alarm']);
    expect(CABINET_MODELS.trio.name).toBe('Dr Aqualis Trio');
  });

  it('lists only a model’s own ports', () => {
    expect(Object.keys(portsOf('duo')).sort()).toEqual(
      ['acid', 'alarm', 'hypochlorite', 'sampleIn', 'sampleOut'].sort(),
    );
    expect(portsOf('consultant').co2).toBeUndefined();
  });
});
