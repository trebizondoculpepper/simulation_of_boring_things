import { describe, expect, it } from 'vite-plus/test';
import {
  CONTROL,
  actOnChemControl,
  controllerRunning,
  levelLimits,
  levelStep,
  lineAlarms,
  newChemControlTrial,
  pumpRuns,
  stepChemControl,
  tankState,
  terminalComms,
  terminalFeed,
} from './chem-control-trial';
import type {
  ChemControlTrial,
  TerminalCommand,
  TrialAction,
} from './chem-control-trial';

const run = (s: ChemControlTrial, seconds: number, dt = 1) => {
  for (let t = 0; t < seconds; t += dt) s = stepChemControl(s, dt);
  return s;
};
const act = (s: ChemControlTrial, ...as: TrialAction[]) =>
  as.reduce(actOnChemControl, s);
const cmd = (command: TerminalCommand): TrialAction => ({
  act: 'terminal',
  chemical: 'hypochlorite',
  tag: 'WH-OT1',
  command,
});
/** A quiet trial: no dosing, every hypochlorite tank half full. */
function quiet() {
  const s = newChemControlTrial();
  const line = s.lines.hypochlorite;
  return {
    ...s,
    lines: {
      ...s.lines,
      hypochlorite: {
        ...line,
        tanks: line.tanks.map((t) => ({
          ...t,
          doseLpm: 0,
          litres: t.capacity / 2,
        })),
      },
    },
  };
}

describe('the chemical control trial', () => {
  it('starts with each tank’s levels at today’s 20% and 90%, in litres', () => {
    const t = newChemControlTrial().lines.hypochlorite.tanks[0];
    expect([t.capacity, t.lowL, t.highL]).toEqual([300, 60, 270]);
  });

  it('a tank calls at its own low level and stops at its own high', () => {
    let s = act(
      quiet(),
      cmd({ kind: 'set-low', tank: 3, litres: 16 }),
      cmd({ kind: 'set-high', tank: 3, litres: 20 }),
    );
    expect(s.lines.hypochlorite.tanks[3].lowL).toBe(16);
    // 15 L of 30: above the old 20% (6 L) but at the new low.
    s = act(s, { act: 'level', chemical: 'hypochlorite', tank: 3, share: 0.5 });
    s = run(s, 1);
    expect(s.lines.hypochlorite.tanks[3].calling).toBe(true);
    expect(s.lines.hypochlorite.serving).toBe(3);
    s = run(s, 60);
    const tank = s.lines.hypochlorite.tanks[3];
    expect(tank.calling).toBe(false);
    expect(tank.litres).toBeGreaterThanOrEqual(20);
    expect(tank.litres).toBeLessThan(21);
    expect(tank.lastFilled).not.toBeNull();
  });

  it('an inhibited tank is never served, even below low; a fill in progress ends', () => {
    let s = act(quiet(), {
      act: 'level',
      chemical: 'hypochlorite',
      tank: 0,
      share: 0.1,
    });
    s = run(s, 2);
    expect(s.lines.hypochlorite.serving).toBe(0);
    s = act(s, cmd({ kind: 'stop', tank: 0 }));
    expect(s.lines.hypochlorite.serving).toBeNull();
    s = run(s, 30);
    expect(s.lines.hypochlorite.serving).toBeNull();
    expect(tankState(s.lines.hypochlorite, 0)).toBe('INHIB');
    expect(s.lines.hypochlorite.tanks[0].calling).toBe(false);
    // Back in service, it calls again.
    s = run(act(s, cmd({ kind: 'resume', tank: 0 })), 2);
    expect(s.lines.hypochlorite.serving).toBe(0);
  });

  it('FILL NOW fills a tank above its low to its high, in its turn', () => {
    let s = act(quiet(), cmd({ kind: 'fill-now', tank: 2 }));
    s = run(s, 1);
    expect(tankState(s.lines.hypochlorite, 2)).toBe('FILL');
    s = run(s, 120);
    const tank = s.lines.hypochlorite.tanks[2];
    expect(tank.fillNow).toBe(false);
    expect(tank.litres).toBeGreaterThanOrEqual(tank.highL);
    expect(s.lines.hypochlorite.serving).toBeNull();
  });

  it('serves calls one at a time, in turn', () => {
    let s = quiet();
    for (const tank of [1, 3])
      s = act(s, { act: 'level', chemical: 'hypochlorite', tank, share: 0.1 });
    s = run(s, 1);
    expect(s.lines.hypochlorite.serving).toBe(1);
    expect(tankState(s.lines.hypochlorite, 3)).toBe('CALL');
  });

  it('high-high still trips the line, whatever the box, until RESET at the store', () => {
    let s = act(quiet(), {
      act: 'level',
      chemical: 'hypochlorite',
      tank: 1,
      share: 0.99,
    });
    s = run(s, 1);
    expect(s.lines.hypochlorite.tripped).toBe(true);
    expect(lineAlarms(s.lines.hypochlorite).map((a) => a.text)).toEqual([
      'PL2 HI-HI',
      'LINE TRIPPED',
    ]);
    expect(
      act(s, { act: 'reset', chemical: 'hypochlorite' }).lines.hypochlorite
        .tripped,
    ).toBe(true);
    s = act(s, { act: 'level', chemical: 'hypochlorite', tank: 1, share: 0.5 });
    expect(
      act(s, { act: 'reset', chemical: 'hypochlorite' }).lines.hypochlorite
        .tripped,
    ).toBe(false);
  });

  it('refuses levels beyond their limits', () => {
    const s = quiet();
    const tank = s.lines.hypochlorite.tanks[0];
    expect(levelLimits(tank)).toEqual({
      low: { min: 30, max: 240 },
      high: { min: 90, max: 285 },
    });
    expect(act(s, cmd({ kind: 'set-high', tank: 0, litres: 290 }))).toBe(s);
    expect(act(s, cmd({ kind: 'set-low', tank: 0, litres: 20 }))).toBe(s);
    expect([levelStep(30), levelStep(300), levelStep(1000)]).toEqual([
      1, 5, 10,
    ]);
  });

  it('logs every stored setting and command with the terminal’s tag', () => {
    const s = act(
      quiet(),
      cmd({ kind: 'set-high', tank: 3, litres: 25 }),
      cmd({ kind: 'fill-now', tank: 0 }),
    );
    expect(s.log).toEqual([
      'WH-OT1: PL1 LOUNGE FILL NOW',
      'WH-OT1: PL4 FOOTBATH HIGH LEVEL 25L',
    ]);
  });

  it('the box off or its MCB tripped: AUTO stops on both lines, HAND still fills', () => {
    for (const fault of [
      { act: 'isolator', on: false },
      { act: 'mcb', tripped: true },
    ] as const) {
      let s = act(quiet(), {
        act: 'level',
        chemical: 'hypochlorite',
        tank: 0,
        share: 0.1,
      });
      s = run(act(s, fault), 2);
      expect(controllerRunning(s)).toBe(false);
      expect(terminalComms(s, 'hypochlorite')).toBe(false);
      expect(terminalComms(s, 'acid')).toBe(false);
      expect(s.lines.hypochlorite.serving).toBeNull();
      // Its settings are kept.
      expect(s.lines.hypochlorite.tanks[0].lowL).toBe(60);
      // By hand, at the selector and the pump.
      s = act(
        s,
        { act: 'selector', chemical: 'hypochlorite', to: 'hand' },
        { act: 'pick', chemical: 'hypochlorite', tank: 0 },
      );
      s = run(s, 1);
      expect(pumpRuns(s, 'hypochlorite')).toBe(false);
      s = run(act(s, { act: 'hoa', chemical: 'hypochlorite', to: 'hand' }), 1);
      expect(pumpRuns(s, 'hypochlorite')).toBe(true);
    }
  });

  it('commands from a terminal the box cannot hear do nothing', () => {
    const s = act(quiet(), {
      act: 'link',
      chemical: 'hypochlorite',
      ok: false,
    });
    expect(terminalComms(s, 'hypochlorite')).toBe(false);
    expect(terminalComms(s, 'acid')).toBe(true);
    expect(act(s, cmd({ kind: 'stop', tank: 0 }))).toBe(s);
  });

  it('starts its controller a moment after it comes live; a hung one needs the isolator off and on', () => {
    let s = run(act(quiet(), { act: 'isolator', on: false }), 1);
    s = run(act(s, { act: 'isolator', on: true }), 1);
    expect(controllerRunning(s)).toBe(false);
    s = run(s, CONTROL.bootSeconds);
    expect(controllerRunning(s)).toBe(true);
    s = run(act(s, { act: 'hang' }), 1);
    expect(controllerRunning(s)).toBe(false);
    s = run(
      act(s, { act: 'isolator', on: false }, { act: 'isolator', on: true }),
      3,
    );
    expect(controllerRunning(s)).toBe(true);
  });

  it('without the wet hall’s power, nothing is transferred', () => {
    let s = act(quiet(), {
      act: 'level',
      chemical: 'hypochlorite',
      tank: 0,
      share: 0.1,
    });
    s = act(s, { act: 'hall-power', on: false });
    const before = s.lines.hypochlorite.tanks[0].litres;
    s = run(s, 10);
    expect(controllerRunning(s)).toBe(false);
    expect(s.lines.hypochlorite.tanks[0].litres).toBe(before);
  });
});

describe('what the box sends a terminal', () => {
  it('names the line, the fill under way and the tank waiting, in litres', () => {
    let s = quiet();
    for (const tank of [1, 3])
      s = act(s, { act: 'level', chemical: 'hypochlorite', tank, share: 0.1 });
    s = run(s, 1);
    const feed = terminalFeed(s, 'hypochlorite');
    expect(feed.line).toBe('HYPO');
    expect(feed.filling).toBe(1);
    expect(feed.next).toBe(3);
    expect(feed.pump).toBe('RUN');
    expect(feed.tanks[3]).toMatchObject({
      name: 'PL4 FOOTBATH',
      capacity: 30,
      lowL: 6,
      highL: 27,
      step: 1,
    });
  });
});
