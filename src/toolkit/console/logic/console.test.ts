import { describe, expect, it } from 'vite-plus/test';
import {
  applyCompletion,
  commonPrefix,
  completionsAt,
  remember,
  splitStatements,
  tokenise,
} from './command-line';
import { COMMANDS, candidates, jsName, readPath, runLine } from './commands';
import { objectStatus } from './object-status';
import type { ConsoleHost } from './commands';
import { applyAction, newWorld } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import type { GameEvent } from '../../../game/events/game-event';
import { describeAction } from '../../../game/events/describe-action';
import { isConsoleKey } from '../../controls/logic/controls';

/** A host on a world of its own, recording what the console asks of it. */
function fakeHost() {
  let world: World = newWorld();
  const events: GameEvent[] = [];
  const state = { noclip: false, torch: false, paused: false };
  const went: string[] = [];
  const downloads: { name: string; text: string }[] = [];
  let cleared = 0;
  const host: ConsoleHost = {
    world: () => world,
    dispatch(action: WorldAction) {
      const before = world;
      world = applyAction(world, action);
      events.push(describeAction(before, action, world, 'console'));
    },
    events: () => events,
    log: (e) => events.push(e),
    rooms: () => [
      { id: 'pool_02', name: 'POOL_02 · OLYMPIC POOL' },
      { id: 'plant_pool_01', name: 'PLANT_POOL_01 · LOUNGE PLANT ROOM' },
    ],
    currentRoom: () => 'plant_pool_01',
    goto: (id) => went.push(id),
    noclip: (on) => (on === undefined ? state.noclip : (state.noclip = on)),
    torch: (on) => (on === undefined ? state.torch : (state.torch = on)),
    paused: (on) => (on === undefined ? state.paused : (state.paused = on)),
    cameraLink: () => '?room=pool_02&x=0',
    download: (name, text) => downloads.push({ name, text }),
    clear: () => cleared++,
    history: () => ['help', 'valves'],
    build: () => 'Pool Plant 0.1.0',
  };
  return {
    host,
    events,
    state,
    went,
    downloads,
    cleared: () => cleared,
    world: () => world,
  };
}

const texts = (lines: { text: string }[]) => lines.map((l) => l.text);

describe('the console key', () => {
  it('is the key left of 1, whatever it is labelled', () => {
    // US and UK PC keyboards: Backquote, typing ` (or ¬ shifted).
    expect(isConsoleKey('Backquote', '`')).toBe(true);
    expect(isConsoleKey('Backquote', '¬')).toBe(true);
    // A German or French layout's dead key there: still its place.
    expect(isConsoleKey('Backquote', 'Dead')).toBe(true);
    // A UK Mac in Safari, its code swapped with the key by left Shift.
    expect(isConsoleKey('IntlBackslash', '§')).toBe(true);
    // The real key by left Shift on a UK PC (\ and |), and the # ~ key.
    expect(isConsoleKey('IntlBackslash', '\\')).toBe(false);
    expect(isConsoleKey('Backslash', '#')).toBe(false);
    expect(isConsoleKey('KeyQ', 'q')).toBe(false);
  });
});

describe('the command line', () => {
  it('splits statements at semicolons outside quotes', () => {
    expect(splitStatements('noclip on; goto pool_02 ;')).toEqual([
      'noclip on',
      'goto pool_02',
    ]);
    expect(splitStatements('echo "a;b"; echo c')).toEqual([
      'echo "a;b"',
      'echo c',
    ]);
  });

  it('splits words at spaces, quotes keeping spaces', () => {
    expect(tokenise('open  PL1-F1-IV1')).toEqual(['open', 'PL1-F1-IV1']);
    expect(tokenise('echo "two words" \'\' x')).toEqual([
      'echo',
      'two words',
      '',
      'x',
    ]);
  });

  it('remembers lines, not a repeat of the last, up to its limit', () => {
    let h: string[] = [];
    for (const l of ['a', 'b', 'b', ' ', 'c', 'd']) h = remember(h, l, 3);
    expect(h).toEqual(['b', 'c', 'd']);
  });

  it('completes the word at the cursor from what may come there', () => {
    const c = completionsAt('noclip on; go', 13, (before) =>
      before.length ? [] : ['goto', 'get', 'help'],
    );
    expect(c).toEqual({ start: 11, word: 'go', matches: ['goto'] });
    const done = applyCompletion('noclip on; go', 13, c, 'goto', true);
    expect(done).toEqual({ line: 'noclip on; goto ', cursor: 16 });
    const arg = completionsAt('open PL1-F', 10, (before) =>
      before[0] === 'open' ? ['PL1-F1-IV1', 'PL1-F2-IV1', 'PL2-X'] : [],
    );
    expect(arg.matches).toEqual(['PL1-F1-IV1', 'PL1-F2-IV1']);
    expect(commonPrefix(arg.matches)).toBe('PL1-F');
  });
});

describe('the commands', () => {
  it('every command has a usage and help, and help lists them all', () => {
    const { host } = fakeHost();
    for (const c of COMMANDS) {
      expect(c.help.length, c.name).toBeGreaterThan(5);
      expect(typeof c.usage, c.name).toBe('string');
    }
    const help = texts(runLine(host, 'help')).join('\n');
    for (const c of COMMANDS) expect(help).toContain(c.name);
    expect(texts(runLine(host, 'help open'))[0]).toMatch(/^open <tag>/);
  });

  it('opens and shuts a valve by its tag, and logs it as the console’s', () => {
    const t = fakeHost();
    runLine(t.host, 'close PL1-F1-IV1');
    expect(t.world().installedValves['valve-0001']).toBe(false);
    expect(t.events.at(-1)).toMatchObject({
      subject: 'PL1-F1-IV1',
      by: 'console',
    });
    runLine(t.host, 'open valve-0001');
    expect(t.world().installedValves['valve-0001']).toBe(true);
    expect(texts(runLine(t.host, 'open NOPE'))).toEqual([
      'open: no valve "NOPE"',
    ]);
  });

  it('lists valves, and a room’s valves and motors', () => {
    const t = fakeHost();
    expect(texts(runLine(t.host, 'valves PL1-F1')).length).toBeGreaterThan(3);
    const room = texts(runLine(t.host, 'room')).join('\n');
    expect(room).toContain('plant_pool_01');
    expect(room).toContain('PL1-F1-IV1');
    expect(room).toContain('P-201A');
  });

  it('works a starter, and refuses what it does not know', () => {
    const t = fakeHost();
    runLine(t.host, 'starter P-201B hand; starter P-201B start');
    expect(t.world().motors.starters['P-201B'].mode).toBe('hand');
    expect(texts(runLine(t.host, 'starter P-999 start'))[0]).toMatch(
      /no motor/,
    );
    expect(texts(runLine(t.host, 'starter P-201B sideways'))[0]).toMatch(
      /say hand/,
    );
  });

  it('works the app: noclip, torch, pause, goto, cam', () => {
    const t = fakeHost();
    runLine(t.host, 'noclip; torch on; pause; goto pool_02');
    expect(t.state).toEqual({ noclip: true, torch: true, paused: true });
    expect(t.went).toEqual(['pool_02']);
    expect(texts(runLine(t.host, 'goto nowhere'))[0]).toMatch(/no room/);
    expect(texts(runLine(t.host, 'cam'))).toEqual(['?room=pool_02&x=0']);
    expect(texts(runLine(t.host, 'noclip maybe'))[0]).toMatch(/on or off/);
  });

  it('reads the world by a path, and does any action as JSON', () => {
    const t = fakeHost();
    expect(texts(runLine(t.host, 'get pools.pool_02.setpoint'))).toEqual([
      String(t.world().pools.pool_02.setpoint),
    ]);
    expect(() => readPath(t.world(), 'pools.nope')).toThrow(/no "nope"/);
    runLine(t.host, 'act {"type":"lighting/supply","on":false}');
    expect(t.world().lighting.supply).toBe(false);
    expect(texts(runLine(t.host, 'act {"type":"no/such"}'))[0]).toMatch(
      /no action/,
    );
    expect(texts(runLine(t.host, 'act not json'))[0]).toMatch(/JSON/);
  });

  it('downloads the log', () => {
    const t = fakeHost();
    runLine(t.host, 'close PL1-F1-IV1; condump');
    expect(t.downloads).toHaveLength(1);
    expect(t.downloads[0].name).toMatch(
      /^pool-plant-console-\d{8}T\d{4}\.txt$/,
    );
    expect(t.downloads[0].text).toContain('PL1-F1-IV1');
  });

  it('says so of a command it does not know in a list of them', () => {
    const t = fakeHost();
    expect(texts(runLine(t.host, 'echo a; frobnicate'))).toEqual([
      'a',
      'no command "frobnicate" (help lists them)',
    ]);
  });

  it('completes commands, then their arguments', () => {
    const { host } = fakeHost();
    expect(candidates(host, [])).toContain('goto');
    expect(candidates(host, ['goto'])).toEqual(['pool_02', 'plant_pool_01']);
    expect(candidates(host, ['open'])).toContain('PL1-F1-IV1');
    expect(candidates(host, ['starter', 'P-101A'])).toContain('reset');
  });
});

describe('status of an object', () => {
  it('prints everything known of a tagged object: the jacuzzi’s balance tank', () => {
    const w = newWorld();
    const lines = objectStatus(w, 'pl3-bt1');
    expect(lines[0]).toBe('PL3-BT1');
    const text = lines.join('\n');
    expect(text).toMatch(/capacity_m3 = 1\.3/);
    expect(text).toMatch(/contents_m3 = [0-9.]+/);
    expect(text).toMatch(/full_share = /);
    expect(text).toMatch(/draining_to_waste = false/);
  });

  it('prints a valve’s record and its command, a motor’s starter, a pool and a part of the world', () => {
    const w = newWorld();
    const valve = objectStatus(w, 'PL3-BT1-DV1').join('\n');
    expect(valve).toMatch(/name = Balance tank drain valve/);
    expect(valve).toMatch(/commanded = shut/);
    expect(objectStatus(w, 'P-101A').join('\n')).toMatch(/-- motor starter/);
    expect(objectStatus(w, 'pool_03').join('\n')).toMatch(/temperature = /);
    expect(objectStatus(w, 'jacuzziCabinet').join('\n')).toMatch(
      /-- world\.jacuzziCabinet/,
    );
  });

  it('gives the same description as the overlay and the inventory, or none', () => {
    const w = newWorld();
    expect(objectStatus(w, 'PL3-BT1-IV1').join('\n')).toContain(
      'purpose = Isolates water flowing from the water service to the balance tank.',
    );
    expect(objectStatus(w, 'P-101A').join('\n')).toMatch(
      /purpose = 1st Pump in PL2, currently (On|Off|Tripped)/,
    );
    // A room has no description: no purpose row at all.
    expect(objectStatus(w, 'PL3').join('\n')).not.toMatch(/purpose =/);
  });

  it('offers near names for one it does not know, and runs as the status command', () => {
    const w = newWorld();
    const miss = objectStatus(w, 'PL3-BT');
    expect(miss[0]).toMatch(/did you mean/);
    expect(miss.join('\n')).toMatch(/PL3-BT1/);
    const t = fakeHost();
    expect(texts(runLine(t.host, 'status PL3-BT1'))[0]).toBe('PL3-BT1');
    expect(texts(runLine(t.host, 'status')).join('\n')).toMatch(/world clock/);
  });
});

describe('JavaScript at the console', () => {
  it('prints an expression’s value, with world in scope', () => {
    const t = fakeHost();
    expect(texts(runLine(t.host, '1 + 2'))).toEqual(['3']);
    expect(texts(runLine(t.host, 'world.pools.pool_02.setpoint'))).toEqual([
      String(t.world().pools.pool_02.setpoint),
    ]);
  });

  it('has the commands as functions, and act', () => {
    const t = fakeHost();
    runLine(t.host, 'close("PL1-F1-IV1")');
    expect(t.world().installedValves['valve-0001']).toBe(false);
    expect(texts(runLine(t.host, 'echo("hi")'))).toEqual(['hi']);
    runLine(t.host, 'act({ type: "lighting/supply", on: false })');
    expect(t.world().lighting.supply).toBe(false);
    expect(jsName('switch')).toBe('setSwitch');
  });

  it('runs statements, and prints errors rather than throwing', () => {
    const t = fakeHost();
    expect(texts(runLine(t.host, 'for (const x of [1]) echo(x)'))).toEqual([
      '1',
    ]);
    const bad = runLine(t.host, 'nothing.here');
    expect(bad[0].tone).toBe('error');
    expect(bad[0].text).toMatch(/nothing/);
  });
});
