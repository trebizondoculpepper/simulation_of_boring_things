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

  it('carry the closeness bar in a challenge, none in free play, and redraw on its 2 % steps', () => {
    const s = newConsole();
    expect(consoleScreens(s, newGame(), null).scenario.closeness).toBeNull();
    const g = startCard(newGame(), CHALLENGES[0], 'pro');
    expect(consoleScreens(s, g, null).scenario.closeness).toBe(0);
    expect(
      scenarioScreen(s, demoView('free'), null, [], 0.5).closeness,
    ).toBeNull();
    const at = (c: number) =>
      scenarioKey(scenarioScreen(s, demoView('partway'), null, [], c));
    expect(at(0.56)).not.toBe(at(0.58));
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

  it('show DOSE in the lower third once a chemical is picked, REPEAT DOSE after one is taken', () => {
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
    expect(doseScreen(s, null, true).repeat).toBe(false);
    // Taken, the picks stay and DOSE reads REPEAT DOSE.
    s = afterDose(s);
    expect(armed(s)).toBe(true);
    expect(doseScreen(s, null, true).repeat).toBe(true);
    expect(hitScreen('dose', s, free(s), ...mid(L))).toBe('dose');
    expect(pressConsole(s, 'dose', 7).effect).toEqual({ type: 'dose' });
    // The same chemical or size touched again: still a repeat.
    expect(press(s, 'row-2').repeat).toBe(true);
    expect(press(s, 'size-3').repeat).toBe(true);
    // A change of either: DOSE again, still armed; the arrows count too.
    expect(press(s, 'size-up').repeat).toBe(false);
    expect(press(s, 'chem-down').repeat).toBe(false);
    expect(armed(press(s, 'chem-down'))).toBe(true);
    // RESET, START and RETRY clear the picks.
    for (const id of ['reset-yes', 'start', 'retry']) {
      expect(armed(press(s, id))).toBe(false);
      expect(press(s, id).repeat).toBe(false);
    }
    // The screen's key changes with the button, so it redraws once.
    expect(doseKey(doseScreen(press(s, 'size-up'), null, true))).not.toBe(
      doseKey(doseScreen(afterDose(press(s, 'size-up')), null, true)),
    );
  });
});
