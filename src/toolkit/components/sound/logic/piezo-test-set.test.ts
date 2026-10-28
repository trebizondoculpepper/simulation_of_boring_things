import { describe, expect, it } from 'vite-plus/test';
import { PIEZO_MEANINGS } from './piezo-beeps';
import { piezoReadout, piezoSetting, piezoTestPress } from './piezo-test-set';

describe('the piezo test set', () => {
  it('maps its selectors’ detents to the library’s axes', () => {
    expect(piezoSetting(0, 0, 0)).toEqual({
      pitch: 'low',
      meaning: 'entry',
      room: 'dry',
    });
    expect(piezoSetting(2, PIEZO_MEANINGS.length - 1, 2)).toEqual({
      pitch: 'high',
      meaning: 'alarm',
      room: 'large',
    });
    expect(piezoSetting(9, 99, -1).room).toBe('dry');
  });

  it('plays a one-shot on TEST, and holds or lets go a loop', () => {
    expect(piezoTestPress('entry', false)).toMatchObject({ play: 'entry' });
    expect(piezoTestPress('entry', true)).toMatchObject({ play: 'entry' });
    expect(piezoTestPress('alarm', false)).toEqual({ hold: 'alarm' });
    expect(piezoTestPress('alarm', true)).toEqual({ release: true });
  });

  it('shows the setting and what it is doing', () => {
    const setting = piezoSetting(1, 0, 1);
    expect(piezoReadout(setting, false)).toEqual(['ENTRY', 'MID SMALL IDLE']);
    expect(piezoReadout({ ...setting, meaning: 'warning' }, true)[1]).toBe(
      'MID SMALL HOLD',
    );
  });
});
