import { describe, expect, it } from 'vite-plus/test';
import { applyAction as act, newWorld } from '../../../game/world';
import { worldTerminalFeed, worldTerminalLink } from './chem-terminal-feed';

describe('what the world’s control box sends its terminals (prompt 091)', () => {
  it('gives each line’s tanks in litres with their own levels and limits', () => {
    const feed = worldTerminalFeed(newWorld(), 'hypochlorite');
    expect(feed.line).toBe('HYPO');
    expect(feed.tanks.map((t) => t.name)).toEqual([
      'PL1 LOUNGE',
      'PL2 OLYMPIC',
      'PL3 JACUZZI',
      'PL4 FOOTBATH',
    ]);
    expect(feed.tanks[3]).toMatchObject({
      capacity: 30,
      lowL: 6,
      highL: 27,
      step: 1,
      limits: { low: { min: 3, max: 24 }, high: { min: 9, max: 28 } },
    });
  });

  it('links each terminal on its own cable', () => {
    let w = newWorld();
    expect(worldTerminalLink(w, 'acid')).toEqual({
      powered: true,
      comms: true,
    });
    w = act(w, {
      type: 'chem-control',
      action: { act: 'link', chemical: 'acid', ok: false },
    });
    expect(worldTerminalLink(w, 'acid').comms).toBe(false);
    expect(worldTerminalLink(w, 'hypochlorite').comms).toBe(true);
  });
});
