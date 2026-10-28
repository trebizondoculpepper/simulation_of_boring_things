import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_SETTINGS,
  RANGES,
  choosePreset,
} from '../../settings/logic/settings';
import {
  KNOBS,
  METERS,
  armed,
  dialScale,
  knobIndex,
  knobReadout,
  knobSteps,
  knobValue,
  pressConfirm,
  savedMessage,
  selectorIndex,
  settingFor,
  settingsPanel,
  statusLine,
} from './settings-panel';
import type { KnobSetting } from './settings-panel';

const ids = Object.keys(KNOBS) as KnobSetting[];

describe('the settings panel', () => {
  it('has a control for every option of the DOM menu', () => {
    const zones = settingsPanel({
      inGame: true,
      noclip: true,
      copyLink: true,
      devPanel: true,
      quitToDesktop: true,
    });
    const items = zones.flatMap((z) => z.items.map((i) => i.id));
    for (const id of [
      'resume',
      'save',
      'copyLink',
      'quitToTitle',
      'quitToDesktop',
      'devPanel',
      'noclip',
      'renderLevel',
      'fov',
      'volume',
      'sensitivity',
      'invertY',
      'onScreenControls',
      'graphics',
      'bindings',
    ])
      expect(items).toContain(id);
  });
  it('has no GAME zone when opened from the title', () => {
    const zones = settingsPanel({ inGame: false, noclip: true });
    expect(zones.map((z) => z.id)).not.toContain('game');
    expect(zones.flatMap((z) => z.items).map((i) => i.id)).not.toContain(
      'noclip',
    );
  });
  it('quits only with a confirm step', () => {
    const items = settingsPanel({ inGame: true }).flatMap((z) => z.items);
    const quit = items.find((i) => i.id === 'quitToTitle');
    expect(quit?.kind === 'push' && quit.confirm).toBe(true);
  });
});

describe('knobs', () => {
  it('cover each setting range in whole detents, the defaults among them', () => {
    for (const id of ids) {
      const { min, max } = KNOBS[id];
      expect(min).toBe(RANGES[id].min);
      expect(max).toBe(RANGES[id].max);
      const index = knobIndex(id, DEFAULT_SETTINGS[id]);
      expect(knobValue(id, index)).toBeCloseTo(DEFAULT_SETTINGS[id], 6);
    }
  });
  it('round-trip every detent', () => {
    for (const id of ids)
      for (let i = 0; i <= knobSteps(id); i++)
        expect(knobIndex(id, knobValue(id, i))).toBe(i);
  });
  it('turn render quality from worst to best', () => {
    expect(knobValue('renderLevel', 0)).toBe(10);
    expect(knobValue('renderLevel', knobSteps('renderLevel'))).toBe(0);
    expect(knobReadout('renderLevel', 0)).toBe('100');
    expect(knobReadout('renderLevel', 10)).toBe('39');
  });
  it('read out as the DOM menu shows them', () => {
    expect(knobReadout('volume', 0.8)).toBe('80');
    expect(knobReadout('fov', 52)).toBe('52');
    expect(knobReadout('sensitivity', 1)).toBe('1.00');
    expect(knobSteps('volume')).toBe(20);
    expect(knobSteps('fov')).toBe(25);
  });
  it('move their meters across the scale within its ends', () => {
    for (const id of ids) {
      const { min, max } = KNOBS[id];
      for (const v of [min, max]) {
        const r = METERS[id].reading(v);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
      }
    }
  });
  it('print their own scales round their dials, in order', () => {
    expect(dialScale('renderLevel').map((d) => d.text)).toEqual([
      'WORST',
      'BEST',
    ]);
    expect(dialScale('fov')[0]).toEqual({ share: 0, text: '40°' });
    expect(dialScale('volume').at(-1)).toEqual({ share: 1, text: '100' });
    for (const id of ids) {
      const shares = dialScale(id).map((d) => d.share);
      expect(shares).toEqual([...shares].sort((a, b) => a - b));
      expect(Math.min(...shares)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...shares)).toBeLessThanOrEqual(1);
    }
  });
  it('write the settings their positions mean', () => {
    expect(settingFor('volume', 10)).toEqual({ volume: 0.5 });
    expect(settingFor('onScreenControls', 2)).toEqual({
      onScreenControls: 'never',
    });
    expect(
      selectorIndex('onScreenControls', {
        ...DEFAULT_SETTINGS,
        onScreenControls: 'always',
      }),
    ).toBe(1);
  });
  it('choose a graphics preset, lowest left, with its render quality', () => {
    expect(settingFor('graphics', 0)).toEqual(choosePreset('low'));
    expect(settingFor('graphics', 2)).toEqual(choosePreset('high'));
    expect(
      selectorIndex('graphics', { ...DEFAULT_SETTINGS, graphics: 'medium' }),
    ).toBe(1);
    const picture = settingsPanel({ inGame: true }).find(
      (z) => z.id === 'picture',
    );
    expect(picture?.items[0]).toMatchObject({
      kind: 'selector',
      id: 'graphics',
      positions: ['LOW', 'MED', 'HIGH'],
    });
  });
});

describe('the confirm step and the status line', () => {
  it('arms on the first press and fires on a second within 3 s', () => {
    const first = pressConfirm(null, 1000);
    expect(first).toEqual({ fire: false, armedAt: 1000 });
    expect(pressConfirm(first.armedAt, 3500).fire).toBe(true);
    expect(pressConfirm(first.armedAt, 4500)).toEqual({
      fire: false,
      armedAt: 4500,
    });
    expect(armed(1000, 3900)).toBe(true);
    expect(armed(1000, 4100)).toBe(false);
  });
  it('asks, then tells, then says whether this tab saves', () => {
    expect(
      statusLine({ armedQuit: 'quitToTitle', message: 'X', holding: true }),
    ).toBe('PRESS AGAIN TO QUIT');
    expect(
      statusLine({ armedQuit: null, message: 'link copied', holding: true }),
    ).toBe('LINK COPIED');
    expect(statusLine({ armedQuit: null, message: null, holding: false })).toBe(
      'READ ONLY - OTHER TAB',
    );
    expect(savedMessage(true, new Date(2026, 9, 27, 9, 5))).toBe('SAVED 09:05');
  });
});

it('says SYSTEM READY and its version in turn while idle (the owner, 2026-10-28)', () => {
  const idle = {
    armedQuit: null,
    message: null,
    holding: true,
    version: '0.1.712',
  };
  expect(statusLine(idle)).toBe('SYSTEM READY');
  expect(statusLine({ ...idle, showVersion: true })).toBe('VER. 0.1.712');
  expect(
    statusLine({ ...idle, showVersion: true, message: 'saved 14:32' }),
  ).toBe('SAVED 14:32');
});
