import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createCabinetBoard, createDisplaysBoard } from './test-boards';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

it('powers the cabinet screens independently and boots each when switched on', () => {
  const play = vi.spyOn(partAudio, 'play').mockImplementation(() => () => {});
  const kit = createPanelKit();
  const cabinet = createCabinetBoard(kit);
  const displays = createDisplaysBoard(kit);
  const names: string[] = [];
  cabinet.group.traverse((object) => names.push(object.name));
  expect(names).toContain('operator terminal');
  expect(names).toContain('drive keypad');
  expect(displays.group.getObjectByName('operator terminal')).toBeUndefined();
  expect(displays.group.getObjectByName('drive keypad')).toBeUndefined();
  const press = (name: string) => {
    const use = [...cabinet.parts.uses].find(([object]) => {
      for (let at = object; at; at = at.parent!)
        if (at.name === `${name} LED pushbutton`) return true;
      return false;
    });
    expect(use).toBeDefined();
    use![1]();
  };
  const beeps = () =>
    play.mock.calls.flatMap(([recipe]) => {
      if ('tone' in recipe && recipe.tone.seconds === 0.11)
        return [recipe.tone.hz];
      if ('tones' in recipe && recipe.tones[0]?.hz === 880) return [880];
      return [];
    });
  cabinet.update(0, 20, false);
  expect(beeps()).toEqual([]);
  press('TERMINAL POWER');
  cabinet.update(0, 3.5, false);
  expect(beeps()).toEqual([880]);
  press('LCD POWER');
  cabinet.update(0, 20, false);
  expect(beeps()).toEqual([880, 988]);
  press('HIM POWER');
  cabinet.update(0, 20, false);
  expect(beeps()).toEqual([880, 988, 1047]);
  expect(
    play.mock.calls
      .map(([recipe]) => ('tone' in recipe ? recipe.tone : null))
      .filter((spec) => spec?.seconds === 0.11)
      .every((spec) => spec?.type === 'square'),
  ).toBe(true);
  press('TERMINAL POWER');
  cabinet.update(0, 0, false);
  press('TERMINAL POWER');
  cabinet.update(0, 3.5, false);
  expect(beeps()).toEqual([880, 988, 1047, 880]);
  cabinet.dispose();
  displays.dispose();
  disposeKit(kit, cabinet.group);
  disposeKit(kit, displays.group);
  play.mockRestore();
});
