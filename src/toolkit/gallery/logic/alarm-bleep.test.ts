import { describe, expect, it } from 'vite-plus/test';
import { ALARM_BLEEP, createAlarmBleep } from './alarm-bleep';

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

  it('is a high-low pair, twice, under half a second each', () => {
    expect(ALARM_BLEEP.tones).toHaveLength(4);
    for (const t of ALARM_BLEEP.tones) {
      expect(t.at + t.seconds).toBeLessThan(1);
      expect(t.level).toBeGreaterThan(0.035);
    }
  });
});
