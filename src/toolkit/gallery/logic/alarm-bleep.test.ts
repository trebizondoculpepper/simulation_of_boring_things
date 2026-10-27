import { describe, expect, it } from 'vite-plus/test';
import { ALARM_BLEEP, createAlarmBleep } from './alarm-bleep';
import {
  LEVELS,
  USED_SOUNDS,
} from '../../components/sound/logic/console-sounds';

/** The times it bleeps over `seconds` in tenths, unaccepted while `when`. */
const run = (
  bleep: ReturnType<typeof createAlarmBleep>,
  seconds: number,
  when: (t: number) => boolean = () => true,
) => {
  const at: number[] = [];
  for (let i = 0; i < seconds * 10; i++) {
    const t = i / 10;
    if (bleep.step(0.1, when(t))) at.push(Math.round(t * 10) / 10);
  }
  return at;
};

describe('the bridge’s alarm bleep', () => {
  it('bleeps at once, then every ten seconds, while an alarm is unaccepted', () => {
    const bleep = createAlarmBleep();
    bleep.setActive(true);
    expect(run(bleep, 35)).toEqual([0, 10, 20, 30]);
  });

  it('stops on ACCEPT and starts again at once with a new alarm', () => {
    const bleep = createAlarmBleep();
    bleep.setActive(true);
    expect(run(bleep, 40, (t) => t < 15 || t >= 22)).toEqual([0, 10, 22, 32]);
  });

  it('is silent off the bridge, and bleeps at once on coming back', () => {
    const bleep = createAlarmBleep();
    expect(run(bleep, 20)).toEqual([]);
    bleep.setActive(true);
    expect(run(bleep, 5)).toEqual([0]);
    bleep.setActive(false);
    bleep.setActive(true);
    expect(run(bleep, 5)).toEqual([0]);
  });

  it('is the owner’s amber_alert, well above the chatter and a touch', () => {
    expect(ALARM_BLEEP.sound).toBe('amber_alert');
    expect(USED_SOUNDS).toContain(ALARM_BLEEP.sound);
    expect(ALARM_BLEEP.level).toBeGreaterThan(LEVELS.chatter * 2);
    expect(ALARM_BLEEP.level).toBeGreaterThan(LEVELS.touch);
    expect(ALARM_BLEEP).not.toHaveProperty('tones');
  });
});
