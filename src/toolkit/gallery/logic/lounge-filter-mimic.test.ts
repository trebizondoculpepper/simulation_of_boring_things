import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld, stepWorld } from '../../../game/world';
import type { World } from '../../../game/world';
import { LOUNGE_VALVES } from '../../../game/plant/lounge-valves';
import { checkMimic } from '../../components/industrial-control/logic/mimic';
import { mimicLayoutProblems } from '../../components/industrial-control/logic/mimic-layout';
import {
  LOUNGE_FILTER_MIMIC,
  LOUNGE_PUMP_TAGS,
  loungeFilterMimicCommand,
  loungeFilterMimicOf,
} from './lounge-filter-mimic';

/** The lounge filter mimic (prompt 066): the board both its installations show. */
const id = (tag: string) => LOUNGE_VALVES.find((v) => v.tag === tag)!.assetId;
const press = (w: World, button: string) => {
  const action = loungeFilterMimicCommand(button);
  return action ? applyAction(w, action) : w;
};
const running = () => stepWorld(newWorld(), 5);
/** Filter 1 backwashed: its inlet shut, its backwash valve open. */
const backwashing = () =>
  stepWorld(
    press(
      press(running(), `${id('PL1-F1-IV1')}/shut`),
      `${id('PL1-F1-BV1')}/open`,
    ),
    5,
  );

describe('the lounge filter mimic', () => {
  it('lays out with nothing overlapping and room round every button', () => {
    expect(mimicLayoutProblems(LOUNGE_FILTER_MIMIC)).toEqual([]);
    expect(
      checkMimic(LOUNGE_FILTER_MIMIC, loungeFilterMimicOf(running())),
    ).toEqual([]);
  });

  it('has every lounge valve’s OPEN and SHUT, and each pump’s START and STOP', () => {
    const buttons = LOUNGE_FILTER_MIMIC.buttons!.map((b) => b.id);
    for (const v of LOUNGE_VALVES)
      expect(buttons).toEqual(
        expect.arrayContaining([`${v.assetId}/open`, `${v.assetId}/shut`]),
      );
    expect(buttons).toEqual(
      expect.arrayContaining(['p1-start', 'p1-stop', 'p2-start', 'p2-stop']),
    );
  });

  it('shows filter 1 in service: its lines chasing toward the pool, its flow positive', () => {
    const s = loungeFilterMimicOf(running());
    expect(s.flows).toMatchObject({
      'f1-inlet': 'forward',
      'f1-bed': 'forward',
      'f1-outlet': 'forward',
      'to-pool': 'forward',
      'f1-backwash': 'still',
    });
    expect(s.readouts['f1-flow'].flow.value).toBe(45);
  });

  it('shows filter 1 backwashed: its outlet and bed reversed, its waste flowing, its flow negative', () => {
    const s = loungeFilterMimicOf(backwashing());
    expect(s.flows).toMatchObject({
      'f1-outlet': 'back',
      'f1-bed': 'back',
      'f1-backwash': 'forward',
      'to-waste': 'forward',
      'f1-inlet': 'still',
      'f2-outlet': 'forward',
    });
    expect(s.readouts['f1-flow'].flow.value).toBe(-34);
  });

  it('is still everywhere, its readouts at 0, with both pumps stopped', () => {
    let w = running();
    for (const n of ['p1', 'p2']) w = press(w, `${n}-stop`);
    w = stepWorld(w, 5);
    const s = loungeFilterMimicOf(w);
    expect(Object.values(s.flows!).every((f) => f === 'still')).toBe(true);
    expect(s.readouts['f1-flow'].flow.value).toBe(0);
    expect(s.readouts['f2-flow'].flow.value).toBe(0);
  });

  it('lights a valve’s lamps by its position, open, travelling and shut', () => {
    const v = id('PL1-F2-IV2');
    let w = press(running(), `${v}/shut`);
    expect(loungeFilterMimicOf(w).lamps).toMatchObject({
      [`${v}-open`]: true,
      [`${v}-shut`]: false,
    });
    w = stepWorld(w, 2);
    expect(loungeFilterMimicOf(w).lamps).toMatchObject({
      [`${v}-open`]: false,
      [`${v}-shut`]: false,
    });
    w = stepWorld(w, 3);
    expect(loungeFilterMimicOf(w).lamps).toMatchObject({
      [`${v}-open`]: false,
      [`${v}-shut`]: true,
    });
  });

  it('keeps HAND · OFF · AUTO and RESET local: none on it, and its START does nothing to a pump in HAND', () => {
    const ids = [
      ...LOUNGE_FILTER_MIMIC.buttons!.map((b) => b.id),
      ...LOUNGE_FILTER_MIMIC.modes.map((m) => m.id),
    ];
    expect(ids.some((i) => /hand|auto|reset/i.test(i))).toBe(false);
    const tag = LOUNGE_PUMP_TAGS.p2;
    let w = applyAction(running(), {
      type: 'motor/starter',
      tag,
      action: { act: 'mode', mode: 'hand' },
    });
    w = stepWorld(w, 1);
    expect(loungeFilterMimicOf(w).lamps['p2-local']).toBe(true);
    const before = w.motors.starters[tag];
    w = press(w, 'p2-start');
    expect(w.motors.starters[tag]).toEqual(before);
  });

  it('trips the duty pump with its discharge shut, and the standby takes over, its line chasing (the owner, 2026-10-25)', () => {
    let w = press(running(), `${id('PL1-P1-IV1')}/shut`);
    w = press(w, `${id('PL1-P2-IV1')}/open`);
    w = stepWorld(w, 5);
    // Against its shut valve, P-201A is starved.
    expect(loungeFilterMimicOf(w).flows!.p1).toBe('still');
    w = stepWorld(w, 70);
    const s = loungeFilterMimicOf(w);
    expect(w.motors.starters['P-201A'].tripped).toBe(true);
    expect(w.motors.starters['P-201B'].running).toBe(true);
    expect(s.lamps).toMatchObject({ 'p1-trip': true, 'p2-run': true });
    expect(s.flows).toMatchObject({
      p1: 'still',
      p2: 'forward',
      'to-pool': 'forward',
    });
  });
});
