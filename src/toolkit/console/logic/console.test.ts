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
import { actionEvents } from '../../../game/events/describe-action';
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
      events.push(...actionEvents(before, action, world, 'console'));
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
    expect(text).toMatch(/capacity_m3 = 1\.1/);
    expect(text).toMatch(/contents_m3 = [0-9.]+/);
    expect(text).toMatch(/full_share = /);
    expect(text).toMatch(/draining_to_waste = false/);
  });

  it('prints a valve’s record and its command, a motor’s starter, a pool and a part of the world', () => {
    const w = newWorld();
    const valve = objectStatus(w, 'PL3-BT1-DV1').join('\n');
    expect(valve).toMatch(/name = Balance tank drain to waste valve/);
    expect(valve).toMatch(/commanded = shut/);
    expect(objectStatus(w, 'P-101A').join('\n')).toMatch(/-- motor starter/);
    expect(objectStatus(w, 'pool_03').join('\n')).toMatch(/temperature = /);
    expect(objectStatus(w, 'jacuzziCabinet').join('\n')).toMatch(
      /-- world\.jacuzziCabinet/,
    );
  });

  it('gives the same description as the overlay and the inventory, or none', () => {
    const w = newWorld();
    expect(objectStatus(w, 'PL2-F1-V1').join('\n')).toContain(
      'purpose = Isolates water flowing from the circulation pumps to sand filter 1.',
    );
    expect(objectStatus(w, 'P-101A').join('\n')).toMatch(
      /purpose = The 1st pump in Plant Room 2, currently (On|Off|Tripped)/,
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

describe('the stand-ins: dose, chemicals and test_kit', () => {
  it('doses a chemical into the balance tank, and logs it', () => {
    const f = fakeHost();
    const before = f.world().treatment.circuits.pool_01.tank.alkalinity;
    const out = runLine(f.host, 'dose pool_01 bicarbonate 18kg');
    expect(out).toEqual([]);
    expect(
      f.world().treatment.circuits.pool_01.tank.alkalinity - before,
    ).toBeGreaterThan(1000);
    expect(f.events.at(-1)).toMatchObject({
      subject: 'pool_01',
      text: '18 kg sodium bicarbonate added to the balance tank',
      by: 'console',
    });
  });

  it('takes aliases, units as words, and where it goes', () => {
    const f = fakeHost();
    runLine(f.host, 'dose pool_02 hypo 500 ml pool');
    expect(f.events.at(-1)?.text).toBe(
      '500 ml sodium hypochlorite (14 %) added to the pool',
    );
    runLine(f.host, 'dose pool_02 hcl 2l tank');
    expect(f.events.at(-1)?.text).toBe(
      '2 l hydrochloric acid (10 %) added to the balance tank',
    );
    runLine(f.host, 'dose pool_01 co2 1.5kg');
    expect(f.events.at(-1)?.text).toBe(
      '1500 g CO₂ added to the pool, at the injection point',
    );
    runLine(f.host, 'dose pool_01 cacl2 5');
    expect(f.events.at(-1)?.text).toBe(
      '5 kg calcium chloride added to the balance tank',
    );
  });

  it('says clearly what is wrong', () => {
    const f = fakeHost();
    const err = (line: string) => {
      const out = runLine(f.host, line);
      expect(out.every((l) => l.tone === 'error')).toBe(true);
      return texts(out)[0];
    };
    expect(err('dose')).toMatch(/^dose: say <pool> <chemical>.*chemicals/);
    expect(err('dose pool_09 bicarb 1kg')).toBe(
      'dose: no pool "pool_09" (pools are pool_01, pool_02, pool_03, pool_04)',
    );
    expect(err('dose pool_01 treacle 1kg')).toBe(
      'dose: no chemical "treacle" (chemicals lists them)',
    );
    expect(err('dose pool_01 bicarb 1 cups')).toBe(
      'dose: no unit "cups" (say kg, g, l or ml)',
    );
    expect(err('dose pool_01 bicarb 1l')).toBe(
      'dose: sodium bicarbonate is measured by weight: say kg or g',
    );
    expect(err('dose pool_01 bicarb')).toBe(
      'dose: how much sodium bicarbonate? (in kg)',
    );
    expect(err('dose pool_01 bicarb 1kg sewer')).toBe(
      'dose: put it into the balance-tank or the pool, not "sewer"',
    );
    expect(err('test_kit pool_9')).toMatch(/^test_kit: no pool "pool_9"/);
    expect(f.events).toEqual([]);
  });

  it('completes pools, chemicals, an amount and where', () => {
    const f = fakeHost();
    expect(candidates(f.host, ['dose'])).toEqual([
      'pool_01',
      'pool_02',
      'pool_03',
      'pool_04',
    ]);
    const chems = candidates(f.host, ['dose', 'pool_01']);
    for (const a of [
      'bicarb',
      'sodaash',
      'cacl2',
      'thio',
      'hypo',
      'acid',
      'hcl',
      'co2',
    ])
      expect(chems).toContain(a);
    expect(candidates(f.host, ['dose', 'pool_01', 'hypo'])).toEqual(['1l']);
    expect(candidates(f.host, ['dose', 'pool_01', 'hypo', '1l'])).toContain(
      'pool',
    );
    expect(candidates(f.host, ['test_kit'])).toContain('pool_04');
    expect(candidates(f.host, [])).toEqual(
      expect.arrayContaining(['dose', 'chemicals', 'test_kit']),
    );
  });

  it('lists the chemicals, with their units, aliases and where they go', () => {
    const f = fakeHost();
    const out = texts(runLine(f.host, 'chemicals'));
    const line = (name: string) => out.find((l) => l.startsWith(`  ${name} `));
    expect(line('sodium bicarbonate')).toMatch(
      /kg +raises alkalinity +balance tank$/,
    );
    expect(line('sodium hypochlorite (14 %)')).toMatch(/l of 14 %/);
    expect(line('hydrochloric acid (10 %)')).toMatch(/l of 10 %/);
    expect(line('CO₂')).toMatch(/g +lowers pH, alkalinity unchanged +pool$/);
    const all = out.join('\n');
    expect(all).toMatch(
      /aliases co2, carbon-dioxide; normally dosed by the CO₂ system/,
    );
    expect(all).toMatch(/aliases bicarbonate, bicarb,/);
  });

  it('test_kit prints the far side’s readings, logs the test, and changes nothing', () => {
    const f = fakeHost();
    const before = f.world();
    const out = texts(runLine(f.host, 'test_kit pool_01'));
    expect(out[0]).toBe('Test kit · Lounge pool (pool_01) · 00:00');
    expect(out[1]).toMatch(/^ {2}Free chlorine \(DPD 1\) +\d\.\d mg\/l$/);
    expect(out[3]).toMatch(/^ {2}pH \(phenol red\) +7\.\d$/);
    expect(f.world()).toBe(before);
    expect(f.events.at(-1)).toMatchObject({
      kind: 'command',
      subject: 'pool_01',
      by: 'console',
    });
    expect(f.events.at(-1)?.text).toMatch(/^test kit taken: /);
    // The same minute reads the same.
    expect(texts(runLine(f.host, 'test_kit pool_01'))).toEqual(out);
  });

  it('help knows them', () => {
    const f = fakeHost();
    expect(texts(runLine(f.host, 'help dose'))[0]).toMatch(
      /^dose <pool> <chemical> <amount>\[unit\] \[balance-tank\|pool\]/,
    );
    expect(texts(runLine(f.host, 'help test_kit'))[0]).toMatch(
      /^test_kit <pool>/,
    );
  });
});
