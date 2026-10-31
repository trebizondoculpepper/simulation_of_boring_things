import { describe, expect, it } from 'vite-plus/test';
import {
  CHEMICAL_LAYOUT,
  DOSE_LAYOUT,
  HOLD_STEP,
  SCENARIO_LAYOUT,
  SCREEN,
  afterDose,
  armed,
  chemicalKey,
  chemicalScreen,
  consoleScreens,
  demoView,
  doseKey,
  doseScreen,
  hitScreen,
  newConsole,
  pressConsole,
  releaseConsole,
  rowRect,
  scenarioKey,
  scenarioScreen,
  settleConsole,
} from './dosing-console';
import type { ConsoleState } from './dosing-console';
import { newGame, startCard } from '../../../game/plant/museum-4-challenge';
import { CHALLENGES } from '../../../game/plant/museum-4-cards';

const mid = (r: { x: number; y: number; w: number; h: number }) =>
  [r.x + r.w / 2, r.y + r.h / 2] as const;
const free = (s: ConsoleState) => scenarioScreen(s, demoView('free'), null);
const press = (s: ConsoleState, id: string) => pressConsole(s, id, 7).state;

describe("Hall 4's dosing console screens", () => {
  it('find every region of the chemical and dose screens, and nothing in the margins', () => {
    const s = { ...newConsole(), chemical: 3 };
    for (let i = 0; i < 5; i++)
      expect(hitScreen('chemical', s, free(s), ...mid(rowRect(i)))).toBe(
        `row-${i}`,
      );
    expect(hitScreen('chemical', s, free(s), ...mid(CHEMICAL_LAYOUT.up))).toBe(
      'chem-up',
    );
    expect(
      hitScreen('chemical', s, free(s), ...mid(CHEMICAL_LAYOUT.down)),
    ).toBe('chem-down');
    DOSE_LAYOUT.segments.forEach((r, i) =>
      expect(hitScreen('dose', s, free(s), ...mid(r))).toBe(`size-${i}`),
    );
    expect(hitScreen('dose', s, free(s), ...mid(DOSE_LAYOUT.more))).toBe(
      'size-up',
    );
    for (const screen of ['scenario', 'chemical', 'dose'] as const)
      expect(hitScreen(screen, s, free(s), 2, 380)).toBeNull();
  });

  it('scroll the list with the selection kept in view, clamped at the ends', () => {
    let s = newConsole();
    expect(
      hitScreen('chemical', s, free(s), ...mid(CHEMICAL_LAYOUT.up)),
    ).toBeNull();
    for (let i = 0; i < 12; i++) s = press(s, 'chem-down');
    expect(s.chemical).toBe(9);
    expect(s.top).toBe(5);
    s = press(s, 'row-0');
    expect(s.chemical).toBe(5);
    for (let i = 0; i < 3; i++) s = press(s, 'chem-up');
    expect(s).toMatchObject({ chemical: 2, top: 2 });
  });

  it('clamp the dose size at Tiny and Huge', () => {
    let s = newConsole();
    for (let i = 0; i < 6; i++) s = press(s, 'size-up');
    expect(s.size).toBe(4);
    for (let i = 0; i < 6; i++) s = press(s, 'size-down');
    expect(s.size).toBe(0);
    expect(press(s, 'size-3').size).toBe(3);
    expect(doseScreen({ ...s, chemical: 5, size: 2 }, null, true).amount).toBe(
      'MEDIUM · 4.0 kg',
    );
  });

  it('ask before RESET, the dialog modal', () => {
    let r = pressConsole(newConsole(), 'reset', 7);
    expect(r.effect).toBeUndefined();
    expect(r.state.confirmReset).toBe(true);
    const m = free(r.state);
    expect(
      hitScreen('scenario', r.state, m, ...mid(SCENARIO_LAYOUT.start)),
    ).toBeNull();
    r = pressConsole(r.state, 'reset-yes', 7);
    expect(r.effect).toEqual({ type: 'reset' });
    expect(r.state.confirmReset).toBe(false);
    expect(
      settleConsole({ ...newConsole(), confirmReset: true }).confirmReset,
    ).toBe(false);
  });

  it('choose a card and level and start it', () => {
    let s = press(newConsole(), 'card-prev');
    expect(s.pick).toBe(6);
    s = press(s, 'level-pro');
    expect(pressConsole(s, 'start', 7).effect).toEqual({
      type: 'start',
      card: 6,
      level: 'pro',
    });
    const g = startCard(newGame(), CHALLENGES[0], 'pro');
    const v = consoleScreens(s, g, null);
    expect(v.scenario.view.kind).toBe('challenge');
    expect(v.dose.left).toBe(CHALLENGES[0].pars.pro);
  });

  it('change each screen’s key exactly when what it shows changes', () => {
    const s = newConsole();
    const k = chemicalKey(chemicalScreen(s));
    expect(chemicalKey(chemicalScreen(press(s, 'size-up')))).toBe(k);
    expect(
      chemicalKey(chemicalScreen(releaseConsole(press(s, 'chem-down')))),
    ).not.toBe(k);
    const d = doseKey(doseScreen(s, null, true));
    expect(
      doseKey(doseScreen(releaseConsole(press(s, 'chem-down')), null, true)),
    ).not.toBe(d);
    expect(
      doseKey(doseScreen(releaseConsole(press(s, 'level-pro')), null, true)),
    ).toBe(d);
    const a = scenarioKey(scenarioScreen(s, demoView('holding', 1000), null));
    expect(
      scenarioKey(scenarioScreen(s, demoView('holding', 1000 + 500), null)),
    ).toBe(a);
    expect(
      scenarioKey(
        scenarioScreen(s, demoView('holding', 1000 + HOLD_STEP), null),
      ),
    ).not.toBe(a);
  });

  it('show DOSE in the lower third only once a chemical and a size are picked afresh', () => {
    const L = DOSE_LAYOUT.dose;
    expect(L.y).toBeGreaterThanOrEqual(SCREEN.h * (2 / 3) - 2);
    expect(L.y + L.h).toBeLessThanOrEqual(SCREEN.h);
    for (const r of [
      ...DOSE_LAYOUT.segments,
      DOSE_LAYOUT.less,
      DOSE_LAYOUT.more,
    ])
      expect(r.y + r.h).toBeLessThan(L.y);
    let s = newConsole();
    expect(armed(s)).toBe(false);
    // A chemical alone arms it, the size left at its default Medium.
    expect(armed(press(s, 'row-1'))).toBe(true);
    expect(hitScreen('dose', s, free(s), ...mid(L))).toBeNull();
    expect(pressConsole(s, 'dose', 7).effect).toBeUndefined();
    s = press(s, 'size-3');
    expect(armed(s)).toBe(false);
    expect(doseScreen(s, null, true).armed).toBe(false);
    s = press(s, 'row-2');
    expect(armed(s)).toBe(true);
    expect(doseScreen(s, null, true).armed).toBe(true);
    expect(hitScreen('dose', s, free(s), ...mid(L))).toBe('dose');
    expect(pressConsole(s, 'dose', 7).effect).toEqual({ type: 'dose' });
    expect(doseScreen(press(s, 'dose'), null, true).pressed).toBe('dose');
    // Taken, both picks start again; the arrows count as picks too.
    s = afterDose(s);
    expect(hitScreen('dose', s, free(s), ...mid(L))).toBeNull();
    expect(armed(press(press(s, 'chem-down'), 'size-up'))).toBe(true);
    // RESET clears them too.
    s = press(press(s, 'chem-down'), 'size-up');
    expect(armed(press(s, 'reset-yes'))).toBe(false);
    // The screen's key changes with the button, so it redraws once.
    expect(doseKey(doseScreen(s, null, true))).not.toBe(
      doseKey(doseScreen(afterDose(s), null, true)),
    );
  });
});
