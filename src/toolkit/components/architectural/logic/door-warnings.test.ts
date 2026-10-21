import { describe, expect, it } from 'vite-plus/test';
import { doorWarningStickers } from './door-warnings';

describe('door warning sticker selection', () => {
  it('includes access control and the hazards specific to each plant room', () => {
    expect(doorWarningStickers('plant')).toEqual([
      'authorised',
      'moving-machinery',
      'hot-surfaces',
    ]);
    expect(doorWarningStickers('furnace')).toContain('gas-equipment');
    expect(doorWarningStickers('chemical')).toContain('keep-chemicals-apart');
    expect(doorWarningStickers('electrical')).toContain('live-electrical');
  });

  it('allows a door to select its own stickers or none', () => {
    expect(doorWarningStickers(['authorised', 'live-electrical'])).toEqual([
      'authorised',
      'live-electrical',
    ]);
    expect(doorWarningStickers([])).toEqual([]);
  });
});
