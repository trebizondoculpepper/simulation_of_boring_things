import { describe, expect, it } from 'vite-plus/test';
import { doorWarningStickers } from './door-warnings';

describe('door warning sticker selection', () => {
  it('includes access control and the hazards specific to each plant room', () => {
    expect(doorWarningStickers('plant')).toEqual([
      'authorised',
      'moving-machinery',
      'fire-door',
    ]);
    expect(doorWarningStickers('furnace')).toContain('no-flames');
    expect(doorWarningStickers('furnace')).toContain('ear-protection');
    expect(doorWarningStickers('noisy-plant')).toContain('ear-protection');
    expect(doorWarningStickers('chemical')).toContain('keep-chemicals-apart');
    expect(doorWarningStickers('chemical')).toContain('chemical-ppe');
    expect(doorWarningStickers('electrical')).toContain('live-electrical');
    // Every plant room's door is a fire door, and says so.
    for (const preset of [
      'plant',
      'furnace',
      'chemical',
      'electrical',
      'noisy-plant',
    ] as const)
      expect(doorWarningStickers(preset), preset).toContain('fire-door');
  });

  it('allows a door to select its own stickers or none', () => {
    expect(doorWarningStickers(['authorised', 'live-electrical'])).toEqual([
      'authorised',
      'live-electrical',
    ]);
    expect(doorWarningStickers([])).toEqual([]);
  });
});
