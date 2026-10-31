import { describe, expect, it } from 'vite-plus/test';
import { CRASH_COUNTDOWN, createAqualisRoomHost } from './aqualis-room';
import { SETTINGS } from '../../components/plant/logic/aqualis-display';
import { tabRects } from '../../components/plant/logic/aqualis-display';
import { DEFAULT_TARGETS } from '../../../game/plant/aqualis-types';
import { ALARM_LIMITS } from '../../../game/plant/aqualis-advisor';

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

describe('dev58’s host: the crash board', () => {
  /** Run at 1000× until the hypochlorite pump doses hard. */
  const dosingHard = () => {
    const host = createAqualisRoomHost('chlorine-low', { boot: false });
    host.setSpeed(3);
    for (let i = 0; i < 400 && host.outputs().hypochlorite < 0.5; i++)
      host.step(0.1);
    expect(host.outputs().hypochlorite).toBeGreaterThan(0.5);
    return host;
  };

  /** A crash board button pressed, and its countdown waited out. */
  const crashNow = (
    host: ReturnType<typeof createAqualisRoomHost>,
    kind: 'stop' | 'glitch',
  ) => {
    host.crash(kind);
    run(host, CRASH_COUNTDOWN + 0.2);
  };

  it('crashes five seconds after its button is pressed, counting down', () => {
    const host = dosingHard();
    host.crash('stop');
    expect(host.crashIn()).toBe(CRASH_COUNTDOWN);
    run(host, 3);
    expect(host.crashed()).toBe(false);
    expect(host.crashIn()).toBeCloseTo(2, 0);
    run(host, 2.2);
    expect(host.crashed()).toBe(true);
    expect(host.crashIn()).toBe(null);
  });

  it('holds the outputs through a blue screen, takes no touches and gives no advice', () => {
    const host = dosingHard();
    host.setWatchdog(false);
    crashNow(host, 'stop');
    const held = host.outputs();
    expect(host.crashed()).toBe(true);
    expect(host.os().crash?.kind).toBe('stop');
    run(host, 5);
    expect(host.outputs()).toEqual(held);
    expect(host.advice()).toEqual([]);
    expect(host.doctorShown()).toBe(false);
    const settings = tabRects().find((t) => t.page === 'settings')!.rect;
    host.screenTouch(settings.x + 5, settings.y + 5);
    host.screenTouch(SETTINGS.restart.x + 5, SETTINGS.restart.y + 5);
    expect(host.crashed()).toBe(true);
  });

  it('with the watchdog working, drops the outputs and lights CONTROLLER FAULT and ALARM', () => {
    const host = dosingHard();
    host.setWatchdog(true);
    crashNow(host, 'glitch');
    run(host, 2);
    expect(host.controllerFault()).toBe(true);
    expect(host.outputs()).toEqual({ hypochlorite: 0, acid: 0, co2: 0 });
    expect(host.alarms().map((a) => a.id)).toEqual(['controller-fault']);
    expect(host.leds().alarm).toBe(true);
    run(host, 5);
    expect(delivering(host)).toBe(0);
  });

  it('with the watchdog failing, the glitch’s outputs lurch and its alarms say nothing', () => {
    const host = dosingHard();
    host.setWatchdog(false);
    host.setSpeed(0);
    crashNow(host, 'glitch');
    const seen = new Set<string>();
    for (let t = 0; t < 60; t += 0.1) {
      host.step(0.1);
      seen.add(JSON.stringify(host.outputs()));
      expect(host.alarms()).toEqual([]);
      expect(host.leds().alarm).toBe(false);
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it('crashes from its URL parameters once it has run a moment', () => {
    const host = createAqualisRoomHost('good', {
      boot: false,
      crash: 'glitch',
      watchdog: false,
      crashAfter: 1,
    });
    expect(host.crashed()).toBe(false);
    run(host, 1.2);
    expect(host.crashed()).toBe(true);
    expect(host.os().crash?.watchdog).toBe(false);
  });

  it('recovers by power-cycling: the recovery menu, then his apology', () => {
    const host = dosingHard();
    crashNow(host, 'stop');
    run(host, 3);
    host.setPower(false);
    host.setPower(true);
    host.setSpeed(0);
    const steps = new Set<string>();
    for (let t = 0; t < 60 && host.booting(); t += 0.1) {
      steps.add(host.bootFrame()!.step);
      host.step(0.1);
    }
    expect(steps.has('recovery')).toBe(true);
    expect(host.crashed()).toBe(false);
    expect(host.advice()[0].problem).toBe(
      'Terribly sorry: I seem to have had a funny turn.',
    );
    // Touched, it has been read.
    host.screenTouch(1, 1);
    expect(host.advice()[0]?.id).not.toBe('funny-turn');
  });

  it('a held hypochlorite output drives the chlorine up past its high limit, the alarms silent', () => {
    const host = dosingHard();
    host.setWatchdog(false);
    // Counted down at 1×, so the dose it holds is the hard one.
    const speed = host.speed();
    host.setSpeed(0);
    crashNow(host, 'stop');
    host.setSpeed(speed);
    const high =
      DEFAULT_TARGETS.freeChlorine.high * ALARM_LIMITS.chlorineHighTimes;
    // Up to twelve hours at 1000×.
    for (let i = 0; i < 432 && host.rig.water.freeChlorine <= high + 1; i++)
      host.step(0.1);
    expect(host.rig.water.freeChlorine).toBeGreaterThan(high);
    expect(host.alarms()).toEqual([]);
    expect(host.leds().alarm).toBe(false);
    // Back up and running, it raises CHLORINE HIGH and stops dosing.
    host.setSpeed(0);
    host.setPower(false);
    host.setPower(true);
    for (let t = 0; t < 60 && host.booting(); t += 0.1) host.step(0.1);
    host.step(0.1);
    expect(host.alarms().map((a) => a.id)).toContain('chlorine-high');
    expect(host.outputs().hypochlorite).toBe(0);
  });
});
