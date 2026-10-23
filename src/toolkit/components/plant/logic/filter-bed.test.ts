import { describe, expect, it } from 'vite-plus/test';
import {
  CHANNELLED_BY,
  PITS_AFTER,
  bedGlass,
  channellingOf,
  dirtFromDp,
  newBedLook,
  stepBedLook,
} from './filter-bed';

const DAY = 86400;

describe('a filter bed over time', () => {
  it('pits as a function of the time since it was washed: none at first, fully by a fortnight', () => {
    expect(channellingOf(newBedLook(2 * DAY))).toBe(0);
    expect(channellingOf(newBedLook(PITS_AFTER + DAY))).toBeGreaterThan(0);
    expect(channellingOf(newBedLook(CHANNELLED_BY))).toBe(1);
  });

  it('counts the time while water goes down through it, or none', () => {
    expect(stepBedLook(newBedLook(), 170, 60).sinceWash).toBe(60);
    expect(stepBedLook(newBedLook(), 0, 60).sinceWash).toBe(60);
  });

  it('starts its clock again when water comes up through it', () => {
    expect(stepBedLook(newBedLook(10 * DAY), -170, 1).sinceWash).toBe(0);
  });

  it('shows the way the water goes: down filtering, up lifted, none still', () => {
    const look = newBedLook();
    expect(bedGlass(look, { bedFlow: 170, dirt: 1 }).mode).toBe('service');
    expect(bedGlass(look, { bedFlow: -170, dirt: 1 }).mode).toBe('backwash');
    expect(bedGlass(look, { bedFlow: 0, dirt: 1 }).mode).toBe('stopped');
  });

  it('clouds the water coming up through a dirty bed, unless its filter says how murky', () => {
    expect(bedGlass(newBedLook(), { bedFlow: -170, dirt: 1.5 }).murk).toBe(1);
    expect(bedGlass(newBedLook(), { bedFlow: 170, dirt: 1.5 }).murk).toBe(0);
    expect(
      bedGlass(newBedLook(), { bedFlow: -170, dirt: 1.5, murk: 0.2 }).murk,
    ).toBe(0.2);
  });

  it('reads dirt from a pressure difference', () => {
    expect(dirtFromDp(0.25, 0.25)).toBe(0);
    expect(dirtFromDp(0.5, 0.25)).toBe(1);
  });
});
