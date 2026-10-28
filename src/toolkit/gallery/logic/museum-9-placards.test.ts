import { describe, expect, it } from 'vite-plus/test';
import {
  CLOSING_WALL,
  hall9Entrance,
  hall9Placards,
} from './museum-9-placards';

describe('Hall 9’s words', () => {
  it('has five stations, in order, each pointing back where it should', () => {
    const p = hall9Placards();
    expect(p.map((x) => x.station)).toEqual([1, 2, 3, 4, 5]);
    expect(p[1].body).toContain('Hall 2');
    expect(p[2].body).toContain('Hall 1');
    expect(p[3].body).toContain('Hall 3');
    expect(hall9Entrance().title).toBe('The whole plant');
  });

  it('closes with the owner’s message, in his words', () => {
    expect(CLOSING_WALL.message).toBe(
      'Now you’ve seen it, now you understand how a swimming pool works, you probably won’t take it for granted anymore, will you?',
    );
  });
});
