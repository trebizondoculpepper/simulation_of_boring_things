import { describe, expect, it } from 'vite-plus/test';
import {
  APOLOGY,
  APOLOGY_S,
  CONTROLLER_FAULT,
  WATCHDOG_S,
  crashOs,
  glitchOutput,
  newOs,
  osAdvice,
  osAlarms,
  osOutputs,
  powerOs,
  restartOs,
  stepOs,
  touchOs,
  watchdogTripped,
} from './aqualis-os';
import type { OsState, Outputs } from './aqualis-os';
import {
  glitchBurst,
  glitchMoment,
} from '../../toolkit/components/core/logic/lcd-glitch';
import { CHANNEL_IDS } from './aqualis-types';
import type { Alarm } from './aqualis-types';

const DEMANDS: Outputs = { hypochlorite: 0.62, acid: 0.18, co2: 0 };
const LOW: Alarm = { id: 'chlorine-low', text: 'CHLORINE LOW' };
const BOOT = 40;

/** Step `seconds` in tenths. */
const run = (os: OsState, seconds: number, total = BOOT) => {
  const events: string[] = [];
  for (let t = 0; t < seconds - 1e-9; t += 0.1) {
    const r = stepOs(os, 0.1, total);
    os = r.os;
    if (r.event) events.push(r.event);
  }
  return { os, events };
};

const crashed = (
  kind: 'stop' | 'glitch',
  watchdog: boolean,
  outcome: 'hang' | 'reboot' = 'hang',
) => crashOs(newOs(), { kind, seed: 7, watchdog, demands: DEMANDS, outcome });

describe('the Aqualis computer: running, off and booting', () => {
  it('passes its controller’s demands and alarms through while it runs', () => {
    const os = newOs();
    expect(osOutputs(os, DEMANDS)).toEqual(DEMANDS);
    expect(osAlarms(os, [LOW])).toEqual([LOW]);
  });

  it('sends nothing while off or booting, and boots into running', () => {
    let os = powerOs(newOs(), false);
    expect(os.phase).toBe('off');
    expect(osOutputs(os, DEMANDS)).toEqual({
      hypochlorite: 0,
      acid: 0,
      co2: 0,
    });
    os = powerOs(os, true);
    expect(os.phase).toBe('booting');
    expect(os.boot?.unclean).toBe(true);
    expect(osOutputs(os, DEMANDS).hypochlorite).toBe(0);
    const r = run(os, BOOT + 0.2);
    expect(r.events).toEqual(['booted']);
    expect(r.os.phase).toBe('running');
    // An ordinary power cut: no apology.
    expect(r.os.apology).toBe(0);
  });

  it('restarts in order only while running', () => {
    const os = restartOs(newOs());
    expect(os.phase).toBe('booting');
    expect(os.boot?.unclean).toBe(false);
    expect(restartOs(powerOs(newOs(), false)).phase).toBe('off');
  });
});

describe('a stop crash (the blue screen)', () => {
  it('holds whatever demands it was sending as it crashed', () => {
    let os = crashed('stop', false);
    expect(os.phase).toBe('crashed');
    expect(os.crash?.outcome).toBe('hang');
    for (let i = 0; i < 6; i++) {
      // However the controller's wishes change, the outputs stay put.
      expect(osOutputs(os, { hypochlorite: 0, acid: 1, co2: 1 })).toEqual(
        DEMANDS,
      );
      os = run(os, 30).os;
    }
    expect(os.phase).toBe('crashed');
  });

  it('reboots itself after its dump when its outcome is reboot, as after a crash', () => {
    const os = crashed('stop', false, 'reboot');
    expect(os.crash?.rebootAt).toBeGreaterThan(0);
    const r = run(os, os.crash!.rebootAt! + 0.2);
    expect(r.events).toEqual(['rebooting']);
    expect(r.os.phase).toBe('booting');
    expect(r.os.boot?.unclean).toBe(true);
    expect(r.os.recovering).toBe(true);
  });
});

describe('a glitch (the buffer overflow)', () => {
  it('rerolls every output only as a new burst begins, holding between', () => {
    let os = crashed('glitch', false);
    const seed = os.crash!.seed;
    let last = osOutputs(os, DEMANDS);
    let lastBurst = glitchMoment(seed, 0).burst;
    let changes = 0;
    let bursts = 0;
    for (let t = 0; t < 120; t += 0.05) {
      os = stepOs(os, 0.05, BOOT).os;
      const now = osOutputs(os, DEMANDS);
      const burst = glitchMoment(seed, os.crash!.t).burst;
      if (burst !== lastBurst) {
        bursts++;
        // A new burst is being written as it begins.
        expect(glitchBurst(seed, os.crash!.t)).toBe(burst);
      }
      if (JSON.stringify(now) !== JSON.stringify(last)) {
        changes++;
        expect(burst).not.toBe(lastBurst);
      }
      for (const id of CHANNEL_IDS) {
        expect(now[id]).toBeGreaterThanOrEqual(0);
        expect(now[id]).toBeLessThanOrEqual(1);
      }
      last = now;
      lastBurst = burst;
    }
    expect(bursts).toBeGreaterThan(5);
    expect(changes).toBeGreaterThan(3);
  });

  it('slams its outputs to 0 or to 1 often: pumps lurching between stopped and flat out', () => {
    let stopped = 0;
    let flat = 0;
    let between = 0;
    for (let burst = 0; burst < 400; burst++)
      for (const id of CHANNEL_IDS) {
        const v = glitchOutput(99, burst, id);
        if (v === 0) stopped++;
        else if (v === 1) flat++;
        else between++;
      }
    const n = 400 * CHANNEL_IDS.length;
    expect(stopped / n).toBeGreaterThan(0.25);
    expect(flat / n).toBeGreaterThan(0.25);
    expect(between / n).toBeGreaterThan(0.15);
    // The same crash replays the same.
    expect(glitchOutput(99, 3, 'acid')).toBe(glitchOutput(99, 3, 'acid'));
  });
});

describe('the watchdog', () => {
  for (const kind of ['stop', 'glitch'] as const) {
    it(`working, drops every ${kind} crash’s outputs and raises CONTROLLER FAULT`, () => {
      let os = crashed(kind, true);
      expect(watchdogTripped(os)).toBe(false);
      os = run(os, WATCHDOG_S + 0.1).os;
      expect(watchdogTripped(os)).toBe(true);
      os = run(os, 30).os;
      expect(osOutputs(os, DEMANDS)).toEqual({
        hypochlorite: 0,
        acid: 0,
        co2: 0,
      });
      expect(osAlarms(os, [LOW])).toEqual([CONTROLLER_FAULT]);
      expect(CONTROLLER_FAULT.id).toBe('controller-fault');
    });

    it(`failing, leaves a ${kind} crash’s outputs live and its alarms silent`, () => {
      const os = run(crashed(kind, false), 60).os;
      expect(watchdogTripped(os)).toBe(false);
      const out = osOutputs(os, DEMANDS);
      if (kind === 'stop') expect(out).toEqual(DEMANDS);
      expect(osAlarms(os, [LOW])).toEqual([]);
    });
  }

  it('gives no advice while crashed', () => {
    expect(osAdvice(crashed('stop', false), [APOLOGY])).toEqual([]);
  });
});

describe('recovery: power off and on', () => {
  it('boots after a power cut, with its recovery path, and apologises', () => {
    let os = run(crashed('glitch', false), 10).os;
    os = powerOs(os, false);
    expect(os.phase).toBe('off');
    expect(os.crash).toBe(null);
    expect(osOutputs(os, DEMANDS).hypochlorite).toBe(0);
    os = powerOs(os, true);
    expect(os.boot?.unclean).toBe(true);
    expect(os.recovering).toBe(true);
    const r = run(os, BOOT + 0.2);
    expect(r.events).toEqual(['booted']);
    os = r.os;
    expect(os.apology).toBeGreaterThan(APOLOGY_S - 1);
    const advice = osAdvice(os, []);
    expect(advice[0].problem).toBe(
      'Terribly sorry: I seem to have had a funny turn.',
    );
    expect(advice[0]).toBe(APOLOGY);
  });

  it('keeps the apology at the top until the screen is touched, or for a few minutes', () => {
    const os = run(
      powerOs(powerOs(crashed('stop', true), false), true),
      BOOT + 0.2,
    ).os;
    const other = { ...APOLOGY, id: 'ph-high', problem: 'pH high' };
    expect(osAdvice(os, [other]).map((a) => a.id)).toEqual([
      'funny-turn',
      'ph-high',
    ]);
    expect(osAdvice(touchOs(os), [other]).map((a) => a.id)).toEqual([
      'ph-high',
    ]);
    const later = run(os, APOLOGY_S + 1).os;
    expect(osAdvice(later, [other]).map((a) => a.id)).toEqual(['ph-high']);
    // The next boot, an ordinary one, has nothing to apologise for.
    const next = run(restartOs(touchOs(os)), BOOT + 0.2).os;
    expect(next.apology).toBe(0);
  });
});
