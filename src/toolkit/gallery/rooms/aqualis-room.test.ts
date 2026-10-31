import { describe, expect, it } from 'vite-plus/test';
import { createAqualisRoomHost } from './aqualis-room';
import { SETTINGS } from '../../components/plant/logic/aqualis-display';
import { tabRects } from '../../components/plant/logic/aqualis-display';

const delivering = (host: ReturnType<typeof createAqualisRoomHost>) =>
  Object.values(host.rig.devices).reduce((a, d) => a + d.delivering, 0);

/** Step `seconds` of real time in frames of a tenth. */
const run = (
  host: ReturnType<typeof createAqualisRoomHost>,
  seconds: number,
) => {
  for (let t = 0; t < seconds; t += 0.1) host.step(0.1);
};

describe('dev58’s host: the Trio’s boot', () => {
  it('boots as the room loads, taking no touches and dosing nothing, then runs', () => {
    const host = createAqualisRoomHost('ph-high');
    expect(host.booting()).toBe(true);
    expect(host.bootFrame()?.step).toBe('power');
    host.setSpeed(2);
    run(host, 20);
    expect(host.booting()).toBe(true);
    expect(delivering(host)).toBe(0);
    expect(host.doctorShown()).toBe(false);
    // A touch on a tab does nothing while it boots.
    const tab = tabRects()[0].rect;
    host.screenTouch(tab.x + 5, tab.y + 5);
    run(host, 30);
    expect(host.booting()).toBe(false);
    expect(host.bootFrame()).toBe(null);
    run(host, 10);
    // Its software running: it doses its high pH down.
    expect(delivering(host)).toBeGreaterThan(0);
  });

  it('skips its boot when asked (`&boot=skip`)', () => {
    const host = createAqualisRoomHost('good', { boot: false });
    expect(host.booting()).toBe(false);
    expect(host.bootFrame()).toBe(null);
  });

  it('boots after a power cut with its recovery menu, and its lamps out while off', () => {
    const host = createAqualisRoomHost('good', { boot: false });
    host.setPower(false);
    expect(host.leds()).toEqual({ power: false, dosing: false, alarm: false });
    expect(host.bootFrame()).toBe(null);
    host.setPower(true);
    expect(host.booting()).toBe(true);
    const steps = new Set<string>();
    for (let t = 0; t < 50 && host.booting(); t += 0.1) {
      steps.add(host.bootFrame()!.step);
      host.step(0.1);
    }
    expect(steps.has('recovery')).toBe(true);
    expect(host.booting()).toBe(false);
  });

  it('restarts from the Restart button on Settings › Pool dynamics', () => {
    const host = createAqualisRoomHost('good', { boot: false });
    const settings = tabRects().find((t) => t.page === 'settings')!.rect;
    host.screenTouch(settings.x + 5, settings.y + 5);
    const r = SETTINGS.restart;
    host.screenTouch(r.x + r.w / 2, r.y + r.h / 2);
    expect(host.booting()).toBe(true);
    // An orderly restart: no recovery menu.
    const steps = new Set<string>();
    for (let t = 0; t < 50 && host.booting(); t += 0.1) {
      steps.add(host.bootFrame()!.step);
      host.step(0.1);
    }
    expect(steps.has('recovery')).toBe(false);
    expect(steps.has('app')).toBe(true);
  });
});
