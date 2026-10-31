import { describe, expect, it } from 'vite-plus/test';
import { DEFAULT_TARGETS } from './aqualis-types';
import type { AqualisReadings, AqualisSettings } from './aqualis-types';
import {
  FIRST_AID_RULES,
  firstAidHolds,
  firstAidNoHypochlorite,
  firstAidSettings,
  firstAidStatus,
  startFirstAid,
  stepFirstAid,
} from './aqualis-first-aid';

const settings: AqualisSettings = {
  dynamics: { volumeM3: 150, flowM3h: 37.5 },
  targets: DEFAULT_TARGETS,
};

const water = (over: Partial<AqualisReadings> = {}): AqualisReadings => ({
  freeChlorine: 1.3,
  combinedChlorine: 0.2,
  totalChlorine: 1.5,
  ph: 7.3,
  alkalinity: 120,
  calciumHardness: 250,
  lsi: 0,
  tds: 900,
  sulphate: 80,
  temperature: 28,
  ...over,
});

describe('the First Aid programmes', () => {
  it('raises chlorine for a diarrhoeal incident, its timer starting only once it is there', () => {
    let s = startFirstAid('diarrhoea', water(), settings);
    const t = firstAidSettings(s, settings).targets;
    expect(t.freeChlorine.set).toBe(20);
    expect(t.ph.high).toBeLessThanOrEqual(FIRST_AID_RULES.phMost);
    s = stepFirstAid(s, water({ freeChlorine: 8 }), settings, 3600)!;
    expect(s.phase).toBe('raising');
    expect(s.held).toBe(0);
    expect(firstAidStatus(s)).toBe('Diarrhoea · raising chlorine to 20 mg/l');
    s = stepFirstAid(s, water({ freeChlorine: 19.8 }), settings, 60)!;
    expect(s.phase).toBe('holding');
    s = stepFirstAid(s, water({ freeChlorine: 20 }), settings, 3600)!;
    expect(firstAidStatus(s)).toBe(
      'Diarrhoea · holding 20 mg/l · 11 h 45 min left',
    );
    expect(
      stepFirstAid(s, water({ freeChlorine: 20 }), settings, 12 * 3600),
    ).toBe(null);
  });

  it('holds a formed stool’s 2 mg/l for half an hour', () => {
    let s = startFirstAid('formed-stool', water(), settings);
    s = stepFirstAid(s, water({ freeChlorine: 2 }), settings, 1)!;
    s = stepFirstAid(s, water({ freeChlorine: 2 }), settings, 29 * 60)!;
    expect(s).not.toBe(null);
    expect(stepFirstAid(s, water({ freeChlorine: 2 }), settings, 61)).toBe(
      null,
    );
  });

  it('shocks to ten times the combined chlorine until it is gone', () => {
    let s = startFirstAid(
      'breakpoint',
      water({ combinedChlorine: 0.8 }),
      settings,
    );
    expect(firstAidSettings(s, settings).targets.freeChlorine.set).toBeCloseTo(
      8,
    );
    s = stepFirstAid(s, water({ combinedChlorine: 0.5 }), settings, 600)!;
    expect(s).not.toBe(null);
    expect(
      stepFirstAid(s, water({ combinedChlorine: 0.15 }), settings, 600),
    ).toBe(null);
  });

  it('forbids hypochlorite until chlorine is back in its band', () => {
    const s = startFirstAid(
      'chlorine-down',
      water({ freeChlorine: 6 }),
      settings,
    );
    expect(firstAidNoHypochlorite(s)).toBe(true);
    expect(firstAidSettings(s, settings)).toBe(settings);
    expect(stepFirstAid(s, water({ freeChlorine: 3 }), settings, 600)).not.toBe(
      null,
    );
    expect(stepFirstAid(s, water({ freeChlorine: 1.4 }), settings, 600)).toBe(
      null,
    );
  });

  it('pauses all dosing for half an hour', () => {
    let s = startFirstAid('dosing-pause', water(), settings);
    expect(firstAidHolds(s)).toBe(true);
    s = stepFirstAid(s, water(), settings, 20 * 60)!;
    expect(firstAidStatus(s)).toBe('Dosing pause · dosing held · 10 min left');
    expect(stepFirstAid(s, water(), settings, 10 * 60)).toBe(null);
  });
});
