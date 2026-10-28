import { describe, expect, it } from 'vite-plus/test';
import {
  PLANT_SETTINGS,
  idealSignals,
  newController,
  stepController,
} from './dosing-controller';
import type { ControllerState } from './dosing-controller';
import {
  CX7_PAGES,
  cx7Screen,
  newCx7,
  pressCx7,
  trendPath,
  zoneAt,
} from './cx7-hmi';
import type { Cx7State } from './cx7-hmi';
import { DRIFTED_PROBES, cellSignals, newSampleCell } from './sample-cell';

const texts = (h: Cx7State, c: ControllerState) =>
  cx7Screen(h, c)
    .items.filter((i) => i.kind === 'text')
    .map((i) => (i.kind === 'text' ? i.text : ''));

describe('the CX-7 touch screen', () => {
  const c0 = newController(
    PLANT_SETTINGS,
    idealSignals({
      free: 1.31,
      total: 1.6,
      ph: 7.29,
      redox: 760,
      temperature: 29,
    }),
  );

  it('shows every reading on its home page, and a key for every page', () => {
    const h = newCx7();
    const t = texts(h, c0);
    for (const v of ['1.31', '0.29', '7.29', '760', '29.0'])
      expect(t).toContain(v);
    const zones = cx7Screen(h, c0).zones.map((z) => z.id);
    for (const p of CX7_PAGES) expect(zones).toContain(`page:${p}`);
  });

  it('pages by its keys, and changes a setpoint by its + key', () => {
    let h = newCx7();
    let c = c0;
    const s = cx7Screen(h, c);
    const key = s.zones.find((z) => z.id === 'page:chlorine')!;
    const id = zoneAt(s, key.x + 5, key.y + 5)!;
    ({ hmi: h, controller: c } = pressCx7(h, c, id));
    expect(h.page).toBe('chlorine');
    expect(
      cx7Screen(h, c).zones.some((z) => z.id === 'adj:chlorineSet:1'),
    ).toBe(true);
    const r = pressCx7(h, c, 'adj:chlorineSet:1');
    expect(r.controller.settings.chlorineSet).toBeCloseTo(1.35, 9);
    expect(r.sound).toBe('done');
  });

  it('runs a chlorine calibration through its wizard', () => {
    const cell = {
      ...newSampleCell({ free: 1.3, total: 1.6, ph: 7.3, temperature: 29 }),
      probes: DRIFTED_PROBES,
    };
    let c = stepController(
      newController(PLANT_SETTINGS, cellSignals(cell)),
      { cell: cellSignals(cell), circulating: true },
      1,
    );
    let h: Cx7State = { ...newCx7(), page: 'cal' };
    ({ hmi: h, controller: c } = pressCx7(h, c, 'cal:free'));
    expect(texts(h, c)).toContain('SKIP ZERO');
    const refused = pressCx7(h, c, 'cal:accept');
    expect(refused.sound).toBe('deny');
    expect(refused.hmi.message?.good).toBe(false);
    ({ hmi: h, controller: c } = pressCx7(
      refused.hmi,
      refused.controller,
      'cal:skip',
    ));
    // Its + key steps the entry from the reading, 0.01 a press.
    const start = c.measured.free;
    ({ hmi: h } = pressCx7(h, c, 'entry:1'));
    expect(h.entry).toBeCloseTo(start + 0.01, 2);
    h = { ...h, entry: 1.3 };
    const done = pressCx7(h, c, 'cal:accept');
    expect(done.controller.session).toBe(null);
    expect(done.hmi.message?.good).toBe(true);
  });

  it('lists alarms and acknowledges them', () => {
    const dry = idealSignals({
      free: 1.3,
      ph: 7.3,
      temperature: 29,
      flowOk: false,
    });
    const c = stepController(c0, { cell: dry, circulating: true }, 200);
    const h: Cx7State = { ...newCx7(), page: 'alarms' };
    expect(texts(h, c).some((t) => t.startsWith('Sample water flow low'))).toBe(
      true,
    );
    const r = pressCx7(h, c, 'ack');
    expect(r.sound).toBe('ack');
    expect(r.controller.alarms.every((a) => a.acked)).toBe(true);
  });

  it('draws its trend inside its box', () => {
    const pts = Array.from({ length: 120 }, (_, i) => ({
      t: i * 60,
      free: 1.3,
      combined: 0.3,
      ph: 7.3,
      redox: 760,
      temperature: 29,
      hypochlorite: 0.2,
      acid: 0.1,
    }));
    const box = { x: 10, y: 10, w: 400, h: 200 };
    const path = trendPath(pts, 7200, 1, (p) => p.free, 0, 3, box);
    expect(path.length).toBeGreaterThan(20);
    for (let i = 0; i < path.length; i += 2) {
      expect(path[i]).toBeGreaterThanOrEqual(10);
      expect(path[i]).toBeLessThanOrEqual(410);
    }
  });
});
