import { describe, expect, it } from 'vite-plus/test';

/**
 * Every knob turns down or up by which half of it is clicked (the owner,
 * 2026-10-24: the default for all knobs). A knob's use turns up when it is
 * given no direction, so a room whose clicks work parts without asking
 * `knobDirection` leaves its knobs able only to turn up: from full, never
 * at all. Every walkable room that works parts must ask it.
 */

const SOURCES = import.meta.glob<string>(
  ['../../**/*.ts', '!../../**/*.test.ts'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

describe('knob directions', () => {
  it('are asked by every walkable room that works parts', () => {
    const missing = Object.entries(SOURCES)
      .filter(
        ([, text]) =>
          text.includes('createFirstPerson(') &&
          /parts\??\.uses/.test(text) &&
          !text.includes('knobDirection'),
      )
      .map(([path]) => path);
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
    expect(missing).toEqual([]);
  });
});
