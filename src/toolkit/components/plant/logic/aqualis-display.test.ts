import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_TARGETS, SCREEN } from '../../../../game/plant/aqualis-types';
import type {
  Advice,
  ChannelId,
  ChannelView,
} from '../../../../game/plant/aqualis-types';
import {
  FIRST_AID,
  FIRST_AID_IDS,
  startFirstAid,
} from '../../../../game/plant/aqualis-first-aid';
import type { FirstAidState } from '../../../../game/plant/aqualis-first-aid';
import {
  CYCLE_SECONDS,
  FIRST_AID_PAGE,
  HOLD_SECONDS,
  displayModel,
  displayRegions,
  hitDisplay,
  newDisplay,
  pressDisplay,
  tabRects,
  tickDisplay,
} from './aqualis-display';
import { DEMO_SCENE_SECONDS, DEMO_SECONDS } from './aqualis-demo';
import type { DisplayInputs, DisplayState } from './aqualis-display';

const view = (id: ChannelId, over: Partial<ChannelView> = {}): ChannelView => ({
  id,
  status: { kind: 'online' },
  demand: 0,
  demandRate: 0,
  delivering: 0,
  ...over,
});

const advice = (id: string, dose = true): Advice => ({
  id,
  reading: 'ph',
  severity: 'warning',
  problem: `${id} problem`,
  direction: `${id} direction`,
  additive: 'acid',
  where: 'automatic',
  dose: dose ? { amount: 1, unit: 'l', text: '1 l of acid' } : null,
  mood: 'pointing',
});

const inputs = (over: Partial<DisplayInputs> = {}): DisplayInputs => ({
  readings: {
    freeChlorine: 1.3,
    combinedChlorine: 0.2,
    totalChlorine: 1.5,
    ph: 7.6,
    alkalinity: 110,
    calciumHardness: 250,
    lsi: 0.1,
    tds: 900,
    sulphate: 80,
    temperature: 28,
  },
  sample: { flowing: true, flowLh: 33, lostFor: 0 },
  selector: 'auto',
  channels: {
    hypochlorite: view('hypochlorite'),
    acid: view('acid', { demand: 0.5, demandRate: 1.5, delivering: 1.5 }),
    co2: view('co2', { status: { kind: 'unconnected' } }),
  },
  inhibit: null,
  advice: [advice('a'), advice('b', false)],
  alarms: [],
  settings: {
    dynamics: { volumeM3: 150, flowM3h: 50 },
    targets: DEFAULT_TARGETS,
  },
  hand: { hypochlorite: 0, acid: 0, co2: 0 },
  ...over,
});

describe('the Aqualis display', () => {
  it('cycles pumps, water and Dr Aqualis while untouched, never settings', () => {
    let s = newDisplay();
    const seen: string[] = [s.page];
    for (let i = 0; i < 4; i++) {
      s = tickDisplay(s, CYCLE_SECONDS);
      seen.push(s.page);
    }
    expect(seen).toEqual(['pumps', 'water', 'doctor', 'pumps', 'water']);
  });

  it('holds the page touched until left alone, then cycles on', () => {
    const tab = tabRects().find((t) => t.page === 'doctor')!.rect;
    let s = newDisplay();
    const id = hitDisplay(s, inputs(), tab.x + 5, tab.y + 5);
    expect(id).toBe('tab:doctor');
    s = pressDisplay(s, inputs(), id!).state;
    s = tickDisplay(s, CYCLE_SECONDS * 3);
    expect(s.page).toBe('doctor');
    s = tickDisplay(s, HOLD_SECONDS);
    expect(s.page).toBe('pumps');
  });

  it('shows an offline channel with its reason and keeps its demand', () => {
    const m = displayModel(
      newDisplay(),
      inputs({
        channels: {
          ...inputs().channels,
          acid: view('acid', {
            status: { kind: 'offline', reason: 'manual', fault: null },
            demand: 0.6,
            demandRate: 1.8,
          }),
        },
      }),
    );
    const acid = m.pumps.find((p) => p.id === 'acid')!;
    expect(acid.badge).toEqual({ text: 'OFFLINE: in manual', tint: 'red' });
    expect(acid.asked).toBe('1.80 l/h');
    expect(m.pumps.find((p) => p.id === 'co2')!.badge.text).toBe(
      'NOT CONNECTED',
    );
  });

  it('offers HAND buttons only at HAND, and only for connected channels', () => {
    expect(
      displayRegions(newDisplay(), inputs()).some((r) =>
        r.id.startsWith('hand'),
      ),
    ).toBe(false);
    const hand = displayRegions(newDisplay(), inputs({ selector: 'hand' }));
    expect(hand.find((r) => r.id === 'hand+:acid')?.enabled).toBe(true);
    expect(hand.find((r) => r.id === 'hand+:co2')?.enabled).toBe(false);
    const r = pressDisplay(
      newDisplay(),
      inputs({ selector: 'hand' }),
      'hand+:acid',
    );
    expect(r.effect).toEqual({ kind: 'hand', channel: 'acid', demand: 0.1 });
  });

  it('steps through the advice and shows its dose on request', () => {
    let s: DisplayState = { ...newDisplay(), page: 'doctor' };
    let m = displayModel(s, inputs());
    expect(m.doctor.advice?.id).toBe('a');
    s = pressDisplay(s, inputs(), 'show-dose').state;
    expect(displayModel(s, inputs()).doctor.showDose).toBe(true);
    s = pressDisplay(s, inputs(), 'advice+').state;
    m = displayModel(s, inputs());
    expect(m.doctor.advice?.id).toBe('b');
    expect(m.doctor.showDose).toBe(false);
    expect(
      displayRegions(s, inputs()).find((r) => r.id === 'show-dose')?.enabled,
    ).toBe(false);
  });

  it('edits the pool dynamics and keeps a target ordered', () => {
    const s = { ...newDisplay(), page: 'settings' as const };
    const vol = pressDisplay(s, inputs(), 'dyn+:volumeM3').effect;
    expect(vol?.kind === 'settings' && vol.settings.dynamics.volumeM3).toBe(
      155,
    );
    // pH's set point pushed above its high limit drags the limit with it.
    let settings = inputs().settings;
    const t = { ...s, tab: 'targets' as const, targetRow: 3 };
    for (let i = 0; i < 4; i++) {
      const e = pressDisplay(t, inputs({ settings }), 'tgt+:set').effect;
      if (e?.kind === 'settings') settings = e.settings;
    }
    expect(settings.targets.ph.set).toBeCloseTo(7.5);
    expect(settings.targets.ph.high).toBeCloseTo(7.5);
    expect(settings.targets.ph.low).toBeCloseTo(7.2);
  });

  it('keys only what the page on show draws', () => {
    const s = newDisplay();
    const a = displayModel(s, inputs()).key;
    const other = inputs({ advice: [advice('z')] });
    expect(displayModel(s, other).key).toBe(a);
    const changed = inputs({
      channels: { ...inputs().channels, acid: view('acid', { delivering: 2 }) },
    });
    expect(displayModel(s, changed).key).not.toBe(a);
  });

  it('runs a demonstration from settings for five minutes, then cycles again', () => {
    let s: DisplayState = { ...newDisplay(), page: 'settings' };
    expect(displayRegions(s, inputs()).some((r) => r.id === 'demo')).toBe(true);
    s = pressDisplay(s, inputs(), 'demo').state;
    const pages = new Set<string>();
    const words = new Set<string>();
    for (let t = 0; t < DEMO_SECONDS - 1; t += DEMO_SCENE_SECONDS) {
      const m = displayModel(s, inputs());
      expect(m.demo).toBe(true);
      pages.add(m.page);
      if (m.doctor.advice) words.add(m.doctor.advice.problem);
      s = tickDisplay(s, DEMO_SCENE_SECONDS);
    }
    expect([...pages].sort()).toEqual(['doctor', 'pumps', 'settings', 'water']);
    expect(words.size).toBeGreaterThan(5);
    s = tickDisplay(s, 5);
    expect(s.demo).toBe(null);
    expect(displayModel(s, inputs()).demo).toBe(false);
  });

  it('ends the demonstration at a touch anywhere', () => {
    let s = pressDisplay(newDisplay(), inputs(), 'demo').state;
    s = tickDisplay(s, 30);
    const id = hitDisplay(s, inputs(), 320, 240);
    expect(id).toBe('demo-exit');
    s = pressDisplay(s, inputs(), id!).state;
    expect(s.demo).toBe(null);
    expect(s.page).toBe('pumps');
  });

  it('restarts the cabinet from Settings › Pool dynamics, beside the demonstration', () => {
    const s: DisplayState = { ...newDisplay(), page: 'settings' };
    const regions = displayRegions(s, inputs());
    const restart = regions.find((r) => r.id === 'restart')!;
    const demo = regions.find((r) => r.id === 'demo')!;
    expect(restart).toBeTruthy();
    // Beside it, on the same row, not overlapping.
    expect(restart.rect.y).toBe(demo.rect.y);
    expect(restart.rect.x).toBeGreaterThanOrEqual(demo.rect.x + demo.rect.w);
    const id = hitDisplay(
      s,
      inputs(),
      restart.rect.x + restart.rect.w / 2,
      restart.rect.y + restart.rect.h / 2,
    );
    expect(id).toBe('restart');
    const r = pressDisplay(s, inputs(), id!);
    expect(r.effect).toEqual({ kind: 'restart' });
    // Not on the targets tab.
    const targets = displayRegions({ ...s, tab: 'targets' }, inputs());
    expect(targets.some((x) => x.id === 'restart')).toBe(false);
  });

  it('redraws the demonstration only when its scene changes', () => {
    let s = pressDisplay(newDisplay(), inputs(), 'demo').state;
    const a = displayModel(s, inputs()).key;
    s = tickDisplay(s, 1);
    expect(displayModel(s, inputs()).key).toBe(a);
    s = tickDisplay(s, DEMO_SCENE_SECONDS);
    expect(displayModel(s, inputs()).key).not.toBe(a);
  });
});

describe('the Aqualis display’s First Aid', () => {
  const running = (over: Partial<FirstAidState> = {}): FirstAidState => ({
    ...startFirstAid('diarrhoea', null, inputs().settings),
    ...over,
  });

  it('has a fifth tab, all five fitting the title strip right of its name', () => {
    const tabs = tabRects();
    expect(tabs.map((t) => t.page)).toEqual([
      'pumps',
      'water',
      'doctor',
      'firstAid',
      'settings',
    ]);
    expect(tabs[3].name).toBe('First Aid');
    expect(tabs[0].rect.x).toBeGreaterThan(130);
    expect(tabs[4].rect.x + tabs[4].rect.w).toBeLessThanOrEqual(SCREEN.w);
    for (let i = 1; i < tabs.length; i++)
      expect(tabs[i].rect.x).toBeGreaterThanOrEqual(
        tabs[i - 1].rect.x + tabs[i - 1].rect.w,
      );
  });

  it('is never cycled to', () => {
    let s = newDisplay();
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      s = tickDisplay(s, CYCLE_SECONDS);
      seen.add(s.page);
    }
    expect(seen.has('firstAid')).toBe(false);
  });

  it('lists the five programmes, each with its use', () => {
    const s: DisplayState = { ...newDisplay(), page: 'firstAid' };
    const m = displayModel(s, inputs());
    expect(m.firstAid.programmes.map((p) => p.id)).toEqual([...FIRST_AID_IDS]);
    expect(m.firstAid.programmes[1].use).toBe(FIRST_AID.diarrhoea.use);
    const ids = displayRegions(s, inputs()).map((r) => r.id);
    for (const id of FIRST_AID_IDS) expect(ids).toContain(`fa:${id}`);
  });

  it('asks to confirm, starting on YES and not on NO', () => {
    let s: DisplayState = { ...newDisplay(), page: 'firstAid' };
    const b = FIRST_AID_PAGE.button(1);
    const id = hitDisplay(s, inputs(), b.x + 10, b.y + 10);
    expect(id).toBe('fa:diarrhoea');
    let r = pressDisplay(s, inputs(), id!);
    expect(r.effect).toBe(null);
    s = r.state;
    const m = displayModel(s, inputs());
    expect(m.firstAid.confirm).toEqual({
      id: 'diarrhoea',
      name: 'Diarrhoea',
      says: FIRST_AID.diarrhoea.says,
    });
    const ids = displayRegions(s, inputs()).map((x) => x.id);
    expect(ids).toContain('fa-yes');
    expect(ids).not.toContain('fa:diarrhoea');
    // NO puts the list back.
    expect(pressDisplay(s, inputs(), 'fa-no').state.confirm).toBe(null);
    expect(pressDisplay(s, inputs(), 'fa-no').effect).toBe(null);
    r = pressDisplay(s, inputs(), 'fa-yes');
    expect(r.effect).toEqual({ kind: 'first-aid-start', id: 'diarrhoea' });
    expect(r.state.confirm).toBe(null);
    // Leaving the page forgets the question.
    expect(pressDisplay(s, inputs(), 'tab:pumps').state.confirm).toBe(null);
  });

  it('shows a running programme’s status and STOP', () => {
    const s: DisplayState = { ...newDisplay(), page: 'firstAid' };
    const ins = inputs({ firstAid: running() });
    const m = displayModel(s, ins);
    expect(m.firstAid.running?.status).toBe(
      'Diarrhoea · raising chlorine to 20 mg/l',
    );
    expect(m.firstAid.running?.closePool).toBe(true);
    const ids = displayRegions(s, ins).map((r) => r.id);
    expect(ids).toContain('fa-stop');
    expect(ids.some((i) => i.startsWith('fa:'))).toBe(false);
    expect(pressDisplay(s, ins, 'fa-stop').effect).toEqual({
      kind: 'first-aid-stop',
    });
  });

  it('puts its banner on every page’s status strip, in amber, over alarms and inhibits', () => {
    const ins = inputs({
      firstAid: running(),
      inhibit: 'sample-flow-lost',
      alarms: [{ id: 'ph-high', text: 'pH HIGH' }],
    });
    for (const page of ['pumps', 'water', 'doctor', 'settings'] as const) {
      const m = displayModel({ ...newDisplay(), page }, ins);
      expect(m.status).toMatchObject({
        text: 'FIRST AID: Diarrhoea · raising chlorine to 20 mg/l',
        tint: 'amber',
      });
    }
    expect(
      displayModel(newDisplay(), inputs({ inhibit: 'first-aid-pause' })).status
        .text,
    ).toBe('Dosing paused: First Aid');
  });

  it('redraws only when the words change: its time left by the minute', () => {
    const holding = running({ phase: 'holding', held: 3600 });
    for (const page of ['firstAid', 'pumps'] as const) {
      const s: DisplayState = { ...newDisplay(), page };
      const a = displayModel(s, inputs({ firstAid: holding })).key;
      expect(
        displayModel(s, inputs({ firstAid: { ...holding, held: 3610 } })).key,
      ).toBe(a);
      expect(
        displayModel(s, inputs({ firstAid: { ...holding, held: 3700 } })).key,
      ).not.toBe(a);
      expect(displayModel(s, inputs()).key).not.toBe(a);
    }
    // The confirm redraws the page.
    const s: DisplayState = { ...newDisplay(), page: 'firstAid' };
    expect(
      displayModel({ ...s, confirm: 'breakpoint' }, inputs()).key,
    ).not.toBe(displayModel(s, inputs()).key);
  });
});
