import { describe, expect, it } from 'vite-plus/test';
import { CRASH_COUNTDOWN, createAqualisRoomHost } from './aqualis-room';
import { SETTINGS } from '../../components/plant/logic/aqualis-display';
import {
  FIRST_AID_PAGE,
  tabRects,
} from '../../components/plant/logic/aqualis-display';
import { FIRST_AID_IDS } from '../../../game/plant/aqualis-first-aid';
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

describe('dev58’s host: the Trio’s piezo through its boot', () => {
  /** Every beep asked for over a boot, and the boot step each came in. */
  const beepsOfBoot = (host: ReturnType<typeof createAqualisRoomHost>) => {
    const heard: { beep: string; step: string | null }[] = [];
    for (let t = 0; t < 80; t += 0.1) {
      const step = host.bootFrame()?.step ?? null;
      host.step(0.1);
      for (const beep of host.takeBeeps()) heard.push({ beep, step });
    }
    return heard;
  };

  it('beeps once as POST begins, and plays its jingle once as the application comes up', () => {
    const host = createAqualisRoomHost('good', { boot: false });
    expect(host.takeBeeps()).toEqual([]);
    host.setPower(false);
    host.setPower(true);
    const heard = beepsOfBoot(host);
    expect(heard.map((h) => h.beep)).toEqual(['ready', 'startup']);
    // The beep as POST's first frame shows; the jingle at the splash's end.
    expect(heard[0].step).toBe('power');
    expect(heard[1].step).toBe('app');
    expect(host.booting()).toBe(false);
  });

  it('beeps again on each boot, and not at all when it starts running', () => {
    const host = createAqualisRoomHost('good', { boot: false });
    run(host, 5);
    expect(host.takeBeeps()).toEqual([]);
    host.restart();
    expect(beepsOfBoot(host).map((h) => h.beep)).toEqual(['ready', 'startup']);
  });

  it('gives no POST beep for a boot first seen past its POST (`&boot=20`)', () => {
    const host = createAqualisRoomHost('good', { boot: true, bootAt: 20 });
    expect(beepsOfBoot(host).map((h) => h.beep)).toEqual(['startup']);
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

describe('dev58’s host: First Aid', () => {
  const touch = (
    host: ReturnType<typeof createAqualisRoomHost>,
    r: { x: number; y: number; w: number; h: number },
  ) => host.screenTouch(r.x + r.w / 2, r.y + r.h / 2);
  /** Start a programme from its page, as the operator does. */
  const start = (
    host: ReturnType<typeof createAqualisRoomHost>,
    id: (typeof FIRST_AID_IDS)[number],
  ) => {
    touch(host, tabRects().find((t) => t.page === 'firstAid')!.rect);
    touch(host, FIRST_AID_PAGE.button(FIRST_AID_IDS.indexOf(id)));
    touch(host, FIRST_AID_PAGE.yes);
  };

  it('reports an incident first, until its programme is started from the screen', () => {
    const host = createAqualisRoomHost('incident-diarrhoea', { boot: false });
    expect(host.incident()).toBe('diarrhoea');
    expect(host.advice()[0]).toMatchObject({
      id: 'incident',
      problem: 'A diarrhoeal faecal incident has been reported!',
      direction: 'Close the pool and start First Aid › Diarrhoea.',
      mood: 'alarmed',
    });
    expect(host.advice().some((a) => a.id === 'all-well')).toBe(false);
    // The wrong programme leaves the report standing.
    start(host, 'formed-stool');
    expect(host.incident()).toBe('diarrhoea');
    host.stopFirstAid();
    start(host, 'diarrhoea');
    expect(host.firstAid()?.id).toBe('diarrhoea');
    expect(host.incident()).toBe(null);
    expect(host.advice()[0]).toMatchObject({
      id: 'first-aid',
      problem: 'First Aid: Diarrhoea · raising chlorine to 20 mg/l.',
      direction: 'Keep the pool closed.',
      mood: 'concerned',
    });
  });

  it('works to the programme’s settings, Show dose giving a hand dose of hypochlorite', () => {
    const host = createAqualisRoomHost('incident-diarrhoea', { boot: false });
    start(host, 'diarrhoea');
    expect(host.workingSettings().targets.freeChlorine.set).toBe(20);
    host.step(1);
    expect(host.outputs().hypochlorite).toBeGreaterThan(0.9);
    const low = host.advice().find((a) => a.id === 'free-chlorine-low');
    expect(low?.additive).toBe('hypochlorite');
    expect(low?.dose?.amount).toBeGreaterThan(10);
  });

  it('holds every output off through a dosing pause, and doses again after STOP', () => {
    const host = createAqualisRoomHost('chlorine-low', { boot: false });
    host.step(1);
    expect(host.outputs().hypochlorite).toBeGreaterThan(0);
    start(host, 'dosing-pause');
    host.step(1);
    expect(host.outputs()).toEqual({ hypochlorite: 0, acid: 0, co2: 0 });
    touch(host, FIRST_AID_PAGE.stop);
    expect(host.firstAid()).toBe(null);
    host.step(1);
    expect(host.outputs().hypochlorite).toBeGreaterThan(0);
  });

  it('holds hypochlorite off while bringing chlorine down, the advice pointing there first', () => {
    const host = createAqualisRoomHost('chlorine-high', { boot: false });
    const high = host.advice().find((a) => a.id === 'free-chlorine-high');
    expect(high?.direction).toContain(
      'Or start First Aid › Bring chlorine down.',
    );
    start(host, 'chlorine-down');
    host.step(1);
    expect(host.outputs().hypochlorite).toBe(0);
    expect(
      host.advice().find((a) => a.id === 'free-chlorine-high')?.additive,
    ).toBe('thiosulphate');
    expect(
      host.advice().find((a) => a.id === 'free-chlorine-high')?.direction,
    ).not.toContain('First Aid');
  });

  it('points a high combined chlorine at Breakpoint shock', () => {
    const host = createAqualisRoomHost('combined-high', { boot: false });
    expect(
      host.advice().find((a) => a.id === 'combined-chlorine-high')?.direction,
    ).toContain('Or start First Aid › Breakpoint shock.');
  });

  it('ends a formed stool’s programme after its hold, the plain settings back and Dr Aqualis saying so', () => {
    const host = createAqualisRoomHost('incident-formed', { boot: false });
    start(host, 'formed-stool');
    host.setSpeed(3);
    for (let i = 0; i < 200 && host.firstAid(); i++) host.step(0.1);
    expect(host.firstAid()).toBe(null);
    expect(host.rig.water.freeChlorine).toBeGreaterThan(1.9);
    expect(host.workingSettings().targets).toEqual(DEFAULT_TARGETS);
    expect(host.advice()[0]).toMatchObject({
      id: 'first-aid-ended',
      problem: 'Disinfection complete: 2 mg/l held for half an hour.',
      mood: 'pleased',
    });
    // His word lasts an hour of the rig's time.
    for (let i = 0; i < 40; i++) host.step(0.1);
    expect(host.advice().some((a) => a.id === 'first-aid-ended')).toBe(false);
  });
});
