import { describe, expect, it } from 'vite-plus/test';
import { Group } from 'three';
import { markFrontCentre, soundsFrontCentre } from './front-centre';

describe('front-centre sound', () => {
  it('holds for every part under a marked panel, and nowhere else', () => {
    const panel = new Group();
    const module = new Group();
    const knob = new Group();
    panel.add(module);
    module.add(knob);
    const room = new Group();
    expect(soundsFrontCentre(knob)).toBe(false);
    markFrontCentre(panel);
    expect(soundsFrontCentre(knob)).toBe(true);
    expect(soundsFrontCentre(room)).toBe(false);
    expect(soundsFrontCentre(undefined)).toBe(false);
  });
});
