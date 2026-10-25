import { describe, expect, it } from 'vite-plus/test';
import { layoutRoom } from './room-equipment';
import { roomPipes } from './room-pipes';
import { RETIRED_ROOMS, retiredFrom } from './retired-rooms';
import { cabinetBalanceTank, cabinetPipes } from './cabinet-pipes';

describe('retired rooms', () => {
  it('keeps retired0, the Olympic plant room of 2026-10-23: its machines and its pipes and ducts', () => {
    const layout = layoutRoom('retired0');
    expect(retiredFrom('retired0')).toBe('plant_pool_02');
    expect(layout?.placed).toHaveLength(15);
    expect(roomPipes('retired0')).toHaveLength(59);
    // The five 3 m filters, as they stood.
    expect(
      layout?.placed.filter((p) => p.item.key === 'sand-filter:3'),
    ).toHaveLength(5);
  });

  it('is read from its snapshot, not laid out again', () => {
    expect(layoutRoom('retired0')).toBe(RETIRED_ROOMS.retired0.layout);
    expect(roomPipes('retired0')).toBe(RETIRED_ROOMS.retired0.pipes);
  });
});

describe('retired1, the jacuzzi plant room before its re-plumbing (2026-10-25)', () => {
  it('keeps its layout and its cabinet runs, whatever the generators do now', () => {
    expect(retiredFrom('retired1')).toBe('plant_pool_03');
    expect(layoutRoom('retired1')).toBe(RETIRED_ROOMS.retired1.layout);
    expect(cabinetPipes('retired1')).toBe(RETIRED_ROOMS.retired1.cabinetRuns);
    expect(cabinetPipes('retired1')).toHaveLength(16);
    expect(cabinetBalanceTank('retired1')).not.toBeNull();
  });
});
