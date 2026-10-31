import { describe, expect, it } from 'vite-plus/test';
import {
  CONSOLE_SOUNDS,
  challengeSound,
  createSoundPicker,
  pressSound,
} from './console-sounds';
import type { ChallengeMoment, ConsoleSound } from './console-sounds';
import { newConsole, pressConsole } from './dosing-console';

const press = (id: string, s = newConsole()) => {
  const r = pressConsole(s, id, 7);
  return pressSound(id, s, r.state, r.effect);
};

describe('console sounds', () => {
  it('names only files that exist', () => {
    const have = new Set(
      Object.keys(
        import.meta.glob(
          '../../../../resources/sound/effects/frutiger-aero/*.ogg',
          { query: '?url', import: 'default', eager: true },
        ),
      ).map((p) => p.slice(p.lastIndexOf('/') + 1)),
    );
    expect(have.size).toBeGreaterThan(30);
    for (const { files, level } of Object.values(CONSOLE_SOUNDS)) {
      expect(level).toBeLessThanOrEqual(0.4);
      for (const f of files) expect(have.has(`${f}.ogg`)).toBe(true);
    }
  });

  it('gives each press its sound', () => {
    expect(press('row-1')).toBe('touch');
    expect(press('size-3')).toBe('touch');
    expect(press('card-next')).toBe('touch');
    expect(press('chem-down')).toBe('tick');
    expect(press('chem-up')).toBe('refused'); // the top of the list
    expect(press('size-up')).toBe('tick');
    expect(press('size-down', { ...newConsole(), size: 0 })).toBe('refused');
    expect(press('level-pro')).toBe('level-on');
    expect(press('level-journeyman')).toBe('level-off');
    expect(press('start')).toBe('start');
    expect(press('reset')).toBe('reset-ask');
    expect(press('reset-yes')).toBe('yes');
    expect(press('reset-no')).toBe('no');
    expect(press('retry')).toBe('yes');
    expect(press('continue')).toBe('yes');
    // DOSE greyed out before a chemical is picked.
    expect(press('dose')).toBe('refused');
  });

  const card = {};
  const at = (
    heldSince: number | null,
    outcome: ChallengeMoment['outcome'] = 'playing',
    c: unknown = card,
  ): ChallengeMoment => ({ card: c, heldSince, outcome });

  it('sounds once for each turn of the challenge', () => {
    expect(challengeSound(at(null), at(5))).toBe('in-range');
    expect(challengeSound(at(5), at(5))).toBeNull();
    expect(challengeSound(at(5), at(null))).toBe('out-of-range');
    expect(challengeSound(at(5), at(5, 'won'))).toBe('won');
    expect(challengeSound(at(null), at(null, 'failed'))).toBe('lost');
    expect(challengeSound(at(null, 'won'), at(null, 'won'))).toBeNull();
  });

  it('is silent when a card starts, is retried, reset or left', () => {
    expect(challengeSound(at(null, 'playing', null), at(null))).toBeNull();
    expect(challengeSound(at(5), at(null, 'playing', {}))).toBeNull();
    expect(challengeSound(at(null, 'failed'), at(null))).toBeNull();
    expect(challengeSound(at(5), at(null, 'playing', null))).toBeNull();
  });

  it('picks in order where asked, else never the same file twice running', () => {
    const pick = createSoundPicker();
    expect([1, 2, 3, 4].map(() => pick('in-range'))).toEqual([
      'in-range-1',
      'in-range-2',
      'in-range-3',
      'in-range-1',
    ]);
    const kinds: ConsoleSound[] = ['touch', 'dose'];
    for (const k of kinds) {
      let prev = '';
      for (let i = 0; i < 50; i++) {
        const f = pick(k);
        expect(CONSOLE_SOUNDS[k].files).toContain(f);
        expect(f).not.toBe(prev);
        prev = f;
      }
    }
    expect(pick('start')).toBe('start-1');
  });
});
