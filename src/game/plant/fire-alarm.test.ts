import { describe, expect, it } from 'vite-plus/test';
import { applyAction, newWorld } from '../world';
import { zoneInAlarm } from './fire-alarm';

describe('the fire alarm', () => {
  it('sounds while a call point is latched, and stops when it is reset', () => {
    const quiet = newWorld();
    expect(zoneInAlarm(quiet.fireAlarm, 'wet_hall')).toBe(false);
    const pressed = applyAction(quiet, {
      type: 'fire-alarm',
      action: { act: 'press', point: 'wh-mcp-2' },
    });
    expect(zoneInAlarm(pressed.fireAlarm, 'wet_hall')).toBe(true);
    const reset = applyAction(pressed, {
      type: 'fire-alarm',
      action: { act: 'reset', point: 'wh-mcp-2' },
    });
    expect(zoneInAlarm(reset.fireAlarm, 'wet_hall')).toBe(false);
  });
});
