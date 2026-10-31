import { applyAction } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import type { GameEvent } from '../../../game/events/game-event';
import { formatDump, formatEvent } from '../../../game/events/game-event';
import { INSTALLED_VALVES } from '../../../game/plant/installed-valves';
import { walkIdentified } from '../../../game/plant/identification';
import { MOTOR_TAGS, MOTORS } from '../../../game/plant/motor-starters';
import type { MotorTag } from '../../../game/plant/motor-starters';
import { GAS_ZONE_IDS } from '../../../game/plant/gas';
import { worldClock } from '../../../game/events/game-event';
import { POOL_IDS } from '../../../game/plant/pools';
import {
  DOSE_MIN_VOLUME,
  HAND_CHEMICALS,
  chemicalNamed,
  doseVolume,
  isPoolId,
  parseAmount,
} from '../../../game/plant/hand-dose';
import type { DoseInto } from '../../../game/plant/hand-dose';
import {
  formatTestKit,
  testKit,
  testKitSummary,
} from '../../../game/plant/test-kit';
import { splitStatements, tokenise } from './command-line';
import { objectStatus, statusNames } from './object-status';

/**
 * The console's commands (`doc/prompts/done/058-developer-console.md`), and
 * running a line: Quake's way (`open PL1-F1-IV1`) when it starts with a
 * command's name, else JavaScript with the commands as functions
 * (`open("PL1-F1-IV1")`), `world` and `act` in scope. The app is reached
 * only through `ConsoleHost`, so nothing here touches the page. Pure but
 * for what the host does.
 *
 * Stand-ins (the owner, 2026-10-31): a game feature not yet designed is
 * stood in for by a console command, working through a real world action
 * and the real model and logging what it did, until the feature is
 * designed: `dose` (and `chemicals`) for hand-dosing and the chemical
 * inventory (`game/plant/hand-dose.ts`), `test_kit` for the test-kit items
 * (`game/plant/test-kit.ts`). Add the next one the same way.
 */

/** What the console may do to the app and the player's world. */
export interface ConsoleHost {
  /** The player's world now. */
  world(): World;
  /** Do an action to the player's world, logged as the console's. */
  dispatch(action: WorldAction): void;
  /** The log, and lines added to it. */
  events(): readonly GameEvent[];
  log(event: GameEvent): void;
  /** Every room with a URL, and the one the player is in. */
  rooms(): readonly { id: string; name: string }[];
  currentRoom(): string | null;
  goto(room: string): void;
  noclip(on?: boolean): boolean;
  torch(on?: boolean): boolean;
  paused(on?: boolean): boolean;
  /** The current view's camera link, if there is one. */
  cameraLink(): string | null;
  /** Hand the player a text file. */
  download(name: string, text: string): void;
  /** Clear the console's screen (the log is kept). */
  clear(): void;
  history(): readonly string[];
  /** The build, for condump's header. */
  build(): string;
}

/** What a command prints: lines, or nothing. */
export type Printed = string | readonly string[] | void;

export interface ConsoleCommand {
  name: string;
  /** Its arguments, for help: `<tag>`, `[on|off]`. */
  usage: string;
  help: string;
  /** Given the rest of its statement as one argument, untouched (JSON). */
  raw?: boolean;
  /** What its next argument may be, given those before it. */
  complete?(host: ConsoleHost, args: readonly string[]): readonly string[];
  run(host: ConsoleHost, args: readonly string[]): Printed;
}

/** A line printed by the console, with how it is shown. */
export interface ConsoleLine {
  text: string;
  tone: 'echo' | 'output' | 'error' | GameEvent['severity'];
}

const fail = (text: string): never => {
  throw new Error(text);
};

const flag = (word: string | undefined, name: string): boolean | undefined => {
  if (word === undefined) return undefined;
  if (['on', '1', 'true', 'yes'].includes(word.toLowerCase())) return true;
  if (['off', '0', 'false', 'no'].includes(word.toLowerCase())) return false;
  return fail(`${name}: say on or off, not "${word}"`);
};

const ON_OFF = ['on', 'off'] as const;

/** Where `dose` may put a chemical, as typed. */
const INTO_WORDS: Record<string, DoseInto> = {
  'balance-tank': 'balance-tank',
  tank: 'balance-tank',
  pool: 'pool',
};

const DOSE_USAGE = '<pool> <chemical> <amount>[unit] [balance-tank|pool]';

/** A pool named by a command, or a failure listing them. */
function poolNamed(command: string, word: string | undefined) {
  if (!word) return fail(`${command}: which pool? (${POOL_IDS.join(', ')})`);
  if (!isPoolId(word))
    return fail(
      `${command}: no pool "${word}" (pools are ${POOL_IDS.join(', ')})`,
    );
  return word;
}

/** Every valve the console can name: installed pipework and the identified plant. */
export function valvesOf(world: World) {
  const installed = Object.entries(INSTALLED_VALVES).map(([key, v]) => {
    const [room, run, name] = key.split('|');
    return {
      tag: v.tag,
      id: v.assetId,
      room,
      name: `${name} (${run})`,
      open: world.installedValves[v.assetId] === true,
      normal: v.normal,
    };
  });
  const identified = walkIdentified(world.identifiedPlant)
    .filter((p) => p.kind === 'valve')
    .map((p) => ({
      tag: p.id,
      id: p.id,
      room: plantRoomOf(p.id),
      name: p.name,
      open: (p.state as { open?: boolean } | undefined)?.open === true,
      normal: p.normal as 'open' | 'closed',
    }));
  return [...installed, ...identified];
}

/** Every switch in the identified plant. */
export function switchesOf(world: World) {
  return walkIdentified(world.identifiedPlant)
    .filter((p) => p.kind === 'switch')
    .map((p) => ({
      tag: p.id,
      room: plantRoomOf(p.id),
      name: p.name,
      on: (p.state as { on?: boolean } | undefined)?.on === true,
    }));
}

/** The plant room a tag's `PLn` prefix names, or ''. */
function plantRoomOf(tag: string) {
  const m = /^PL(\d)/.exec(tag);
  return m ? `plant_pool_0${m[1]}` : '';
}

const motorRoom = (tag: MotorTag) => `plant_${MOTORS[tag].pool}`;

/** The words a filter matches: any of them, case aside. */
const matching = (filter: string | undefined, ...fields: string[]) =>
  !filter || fields.some((f) => f.toLowerCase().includes(filter.toLowerCase()));

const valveTags = (host: ConsoleHost) =>
  valvesOf(host.world()).map((v) => v.tag);
const switchTags = (host: ConsoleHost) =>
  switchesOf(host.world()).map((s) => s.tag);
const roomIds = (host: ConsoleHost) => host.rooms().map((r) => r.id);

/** The world at a dotted path, or a failure saying where it ran out. */
export function readPath(world: World, path: string): unknown {
  let at: unknown = world;
  for (const key of path.split('.').filter(Boolean)) {
    if (at === null || typeof at !== 'object' || !(key in at))
      return fail(`get: no "${key}" in ${path}`);
    at = (at as Record<string, unknown>)[key];
  }
  return at;
}

/** A value as the console prints it: JSON, short things on one line. */
export function formatValue(value: unknown): string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return [`[function ${value.name}]`];
  const one = JSON.stringify(value);
  // A symbol or a bigint: what it calls itself.
  if (one === undefined) return [String(value as symbol | bigint)];
  if (one.length <= 100) return [one];
  const lines = JSON.stringify(value, null, 2).split('\n');
  return lines.length > 200
    ? [...lines.slice(0, 200), `… ${lines.length - 200} more lines`]
    : lines;
}

/** Check an action against the world before it is done: it must do something it knows. */
function checkedAction(world: World, raw: unknown): WorldAction {
  if (!raw || typeof raw !== 'object' || !('type' in raw))
    fail('act: an action is an object with a "type"');
  const action = raw as WorldAction;
  let after: World | undefined;
  try {
    after = applyAction(world, action);
  } catch (e) {
    fail(`act: ${(e as Error).message}`);
  }
  if (!after || typeof after !== 'object')
    fail(`act: no action ${JSON.stringify((raw as { type: unknown }).type)}`);
  return action;
}

export const COMMANDS: readonly ConsoleCommand[] = [
  {
    name: 'help',
    usage: '[command]',
    help: 'list the commands, or say what one does',
    complete: () => COMMANDS.map((c) => c.name),
    run(_host, [name]) {
      if (name) {
        const c = COMMAND_BY_NAME.get(name.toLowerCase());
        if (!c) return fail(`help: no command "${name}"`);
        return `${c.name} ${c.usage}  ${c.help}`.replace(/ {2,}/, '  ');
      }
      return [
        'Commands (Tab completes; ; separates; anything else is JavaScript, with these as functions and world and act in scope):',
        ...COMMANDS.map(
          (c) => `  ${`${c.name} ${c.usage}`.padEnd(34)}${c.help}`,
        ),
      ];
    },
  },
  {
    name: 'clear',
    usage: '',
    help: 'clear the screen (the log is kept)',
    run(host) {
      host.clear();
    },
  },
  {
    name: 'echo',
    usage: '<text>',
    help: 'print the text',
    run: (_host, args) => args.join(' '),
  },
  {
    name: 'history',
    usage: '',
    help: 'the lines typed, oldest first',
    run: (host) =>
      host.history().map((l, i) => `${String(i + 1).padStart(3)}  ${l}`),
  },
  {
    name: 'log',
    usage: '[filter]',
    help: 'print the log again, or the lines matching a filter',
    run: (host, [filter]) =>
      host
        .events()
        .filter((e) => matching(filter, e.subject, e.text))
        .map(formatEvent),
  },
  {
    name: 'status',
    usage: '[name]',
    help: 'the clock, the room and the alarms; or, given a name, everything known of that object: status PL3-BT1',
    complete(host, args) {
      if (args.length) return [];
      return statusNames(host.world());
    },
    run(host, [name]) {
      const w = host.world();
      if (name) return objectStatus(w, name);
      const alarms = [
        ...MOTOR_TAGS.filter((t) => w.motors.starters[t].tripped).map(
          (t) => `${t} tripped`,
        ),
        ...GAS_ZONE_IDS.filter((z) => w.gas[z].state.a1).map(
          (z) => `${z} gas alarm`,
        ),
        ...(w.jacuzziCabinet.trip ? ['jacuzzi cabinet tripped'] : []),
        ...(w.boilerGas.ssovOpen ? [] : ['boiler house SSOV shut']),
      ];
      return [
        `world clock ${worldClock(w.time)}`,
        `room ${host.currentRoom() ?? '(none)'}`,
        `paused ${host.paused() ? 'yes' : 'no'} · noclip ${host.noclip() ? 'on' : 'off'} · torch ${host.torch() ? 'on' : 'off'}`,
        `alarms ${alarms.length ? alarms.join(', ') : 'none'}`,
      ];
    },
  },
  {
    name: 'rooms',
    usage: '[filter]',
    help: 'every room, by id and name',
    run: (host, [filter]) =>
      host
        .rooms()
        .filter((r) => matching(filter, r.id, r.name))
        .map((r) => `${r.id.padEnd(24)}${r.name}`),
  },
  {
    name: 'room',
    usage: '[room]',
    help: 'about a room (this one unless named): its valves, switches and motors',
    complete: (host) => roomIds(host),
    run(host, [id]) {
      const room = id ?? host.currentRoom();
      if (!room) return fail('room: in no room; name one');
      const known = host.rooms().find((r) => r.id === room);
      if (!known) return fail(`room: no room "${room}"`);
      const w = host.world();
      const valves = valvesOf(w).filter((v) => v.room === room);
      const switches = switchesOf(w).filter((s) => s.room === room);
      const motors = MOTOR_TAGS.filter((t) => motorRoom(t) === room);
      return [
        `${known.id}: ${known.name}`,
        `valves ${valves.length}${valves.length ? ':' : ''}`,
        ...valves.map(
          (v) =>
            `  ${v.tag.padEnd(14)}${v.open ? 'OPEN  ' : 'SHUT  '}${v.name}`,
        ),
        `switches ${switches.length}${switches.length ? ':' : ''}`,
        ...switches.map(
          (s) => `  ${s.tag.padEnd(14)}${s.on ? 'ON    ' : 'OFF   '}${s.name}`,
        ),
        `motors ${motors.length}${motors.length ? ':' : ''}`,
        ...motors.map((t) => {
          const s = w.motors.starters[t];
          return `  ${t.padEnd(14)}${s.mode.toUpperCase().padEnd(6)}${s.tripped ? 'TRIPPED' : s.running ? 'RUNNING' : 'STOPPED'}`;
        }),
      ];
    },
  },
  {
    name: 'goto',
    usage: '<room>',
    help: 'go to a room',
    complete: (host, args) => (args.length ? [] : roomIds(host)),
    run(host, [id]) {
      if (!id) return fail('goto: which room? (rooms lists them)');
      if (!host.rooms().some((r) => r.id === id))
        return fail(`goto: no room "${id}"`);
      host.goto(id);
      return `going to ${id}`;
    },
  },
  {
    name: 'noclip',
    usage: '[on|off]',
    help: 'the free camera: on, off, or switched',
    complete: () => ON_OFF,
    run(host, [word]) {
      const on = flag(word, 'noclip') ?? !host.noclip();
      return `noclip ${host.noclip(on) ? 'on' : 'off'}`;
    },
  },
  {
    name: 'torch',
    usage: '[on|off]',
    help: 'the torch: on, off, or switched',
    complete: () => ON_OFF,
    run(host, [word]) {
      const on = flag(word, 'torch') ?? !host.torch();
      return `torch ${host.torch(on) ? 'on' : 'off'}`;
    },
  },
  {
    name: 'pause',
    usage: '',
    help: 'stop the world’s clock',
    run: (host) => (
      host.paused(true),
      'paused: the world’s clock stands still'
    ),
  },
  {
    name: 'unpause',
    usage: '',
    help: 'start the world’s clock again',
    run: (host) => (host.paused(false), 'unpaused'),
  },
  {
    name: 'cam',
    usage: '',
    help: 'the link to this view',
    run: (host) => host.cameraLink() ?? fail('cam: no view to link to'),
  },
  {
    name: 'valves',
    usage: '[filter]',
    help: 'every valve: tag, open or shut, room, name',
    run: (host, [filter]) =>
      valvesOf(host.world())
        .filter((v) => matching(filter, v.tag, v.id, v.room, v.name))
        .map(
          (v) =>
            `${v.tag.padEnd(14)}${(v.open ? 'OPEN' : 'SHUT').padEnd(6)}${v.room.padEnd(16)}${v.name}`,
        ),
  },
  ...(['open', 'close'] as const).map((verb): ConsoleCommand => ({
    name: verb,
    usage: '<tag>',
    help: `${verb === 'open' ? 'open' : 'shut'} a valve`,
    complete: (host, args) => (args.length ? [] : valveTags(host)),
    run(host, [tag]) {
      if (!tag) return fail(`${verb}: which valve? (valves lists them)`);
      const valve = valvesOf(host.world()).find(
        (v) => v.tag === tag || v.id === tag,
      );
      if (!valve) return fail(`${verb}: no valve "${tag}"`);
      host.dispatch({
        type: 'plant/valve',
        id: valve.tag,
        open: verb === 'open',
      });
    },
  })),
  {
    name: 'switches',
    usage: '[filter]',
    help: 'every switch: tag, on or off, room, name',
    run: (host, [filter]) =>
      switchesOf(host.world())
        .filter((s) => matching(filter, s.tag, s.room, s.name))
        .map(
          (s) =>
            `${s.tag.padEnd(14)}${(s.on ? 'ON' : 'OFF').padEnd(6)}${s.room.padEnd(16)}${s.name}`,
        ),
  },
  {
    name: 'switch',
    usage: '<tag> on|off',
    help: 'switch a switch',
    complete: (host, args) =>
      args.length === 0 ? switchTags(host) : args.length === 1 ? ON_OFF : [],
    run(host, [tag, word]) {
      if (!tag) return fail('switch: which switch? (switches lists them)');
      const sw = switchesOf(host.world()).find((s) => s.tag === tag);
      if (!sw) return fail(`switch: no switch "${tag}"`);
      const on = flag(word, 'switch') ?? !sw.on;
      host.dispatch({ type: 'plant/switch', id: tag, on });
    },
  },
  {
    name: 'motors',
    usage: '',
    help: 'every motor’s starter: selector, running, tripped, current',
    run(host) {
      const w = host.world();
      return MOTOR_TAGS.map((t) => {
        const s = w.motors.starters[t];
        return `${t.padEnd(9)}${MOTORS[t].pool} ${MOTORS[t].role.padEnd(8)}${s.mode.toUpperCase().padEnd(6)}${(s.tripped ? 'TRIPPED' : s.running ? 'RUNNING' : 'STOPPED').padEnd(9)}${s.current.toFixed(1)} A`;
      });
    },
  },
  {
    name: 'starter',
    usage: '<tag> hand|off|auto|start|stop|reset',
    help: 'work a motor’s starter',
    complete: (_host, args) =>
      args.length === 0
        ? MOTOR_TAGS
        : args.length === 1
          ? ['hand', 'off', 'auto', 'start', 'stop', 'reset']
          : [],
    run(host, [tag, word]) {
      if (!MOTOR_TAGS.includes(tag as MotorTag))
        return fail(`starter: no motor "${tag ?? ''}" (motors lists them)`);
      const act = word?.toLowerCase();
      const action =
        act === 'hand' || act === 'off' || act === 'auto'
          ? ({ act: 'mode', mode: act } as const)
          : act === 'start' || act === 'stop' || act === 'reset'
            ? ({ act } as const)
            : fail('starter: say hand, off, auto, start, stop or reset');
      host.dispatch({ type: 'motor/starter', tag: tag as MotorTag, action });
    },
  },
  {
    name: 'chemicals',
    usage: '',
    help: 'the chemicals dose knows: names, aliases, units, what each does and where it goes',
    run: () => [
      `Chemicals for dose ${DOSE_USAGE}: name, normal unit, what it does, where it goes`,
      ...HAND_CHEMICALS.flatMap((c) => [
        `  ${c.name.padEnd(28)}${c.unitText.padEnd(11)}${c.does.padEnd(33)}${c.into === 'pool' ? 'pool' : 'balance tank'}`,
        `      aliases ${c.aliases.join(', ')}${c.note ? `; ${c.note}` : ''}`,
      ]),
      'Units: kg or g for solids and CO₂, l or ml for solutions; none means the normal unit.',
    ],
  },
  {
    name: 'dose',
    usage: DOSE_USAGE,
    help: 'tip a chemical in by hand, into its balance tank unless pool is said: dose pool_01 bicarbonate 18kg (chemicals lists them)',
    complete(_host, args) {
      if (args.length === 0) return POOL_IDS;
      if (args.length === 1) return HAND_CHEMICALS.flatMap((c) => c.aliases);
      if (args.length === 2) {
        const c = chemicalNamed(args[1]);
        return c ? [`1${c.unit}`] : [];
      }
      return Object.keys(INTO_WORDS);
    },
    run(host, args) {
      if (!args.length)
        return fail(`dose: say ${DOSE_USAGE} (chemicals lists them)`);
      const pool = poolNamed('dose', args[0]);
      if (!args[1]) return fail('dose: which chemical? (chemicals lists them)');
      const chemical = chemicalNamed(args[1]);
      if (!chemical)
        return fail(`dose: no chemical "${args[1]}" (chemicals lists them)`);
      if (!args[2])
        return fail(`dose: how much ${chemical.name}? (in ${chemical.unit})`);
      const rest = args.slice(3);
      let typed = args[2];
      // A unit given as a word of its own: 18 kg.
      if (
        rest[0] &&
        !(rest[0].toLowerCase() in INTO_WORDS) &&
        /^\d*\.?\d+$/.test(typed)
      )
        typed += rest.shift();
      const parsed = parseAmount(chemical, typed);
      if ('error' in parsed) return fail(`dose: ${parsed.error}`);
      let into = chemical.into;
      if (rest[0]) {
        const where = INTO_WORDS[rest[0].toLowerCase()];
        if (!where)
          return fail(
            `dose: put it into the balance-tank or the pool, not "${rest[0]}"`,
          );
        into = where;
      }
      if (rest.length > 1) return fail(`dose: say ${DOSE_USAGE}`);
      const w = host.world();
      if (doseVolume(pool, w.pools[pool], into) < DOSE_MIN_VOLUME)
        return fail(
          `dose: ${pool}'s ${into === 'pool' ? 'pool' : 'balance tank'} has no water to take it`,
        );
      host.dispatch({
        type: 'hand/dose',
        pool,
        chemical: chemical.id,
        amount: parsed.amount,
        into,
      });
    },
  },
  {
    name: 'test_kit',
    usage: '<pool>',
    help: 'test the pool’s water at its far side, as a poolside kit reads it: test_kit pool_01',
    complete: (_host, args) => (args.length ? [] : POOL_IDS),
    run(host, [word]) {
      const pool = poolNamed('test_kit', word);
      const w = host.world();
      const t = testKit(
        pool,
        w.treatment.circuits[pool],
        w.pools[pool].temperature,
        w.time,
      );
      host.log({
        time: w.time,
        kind: 'command',
        severity: 'info',
        subject: pool,
        text: testKitSummary(t),
        by: 'console',
      });
      return formatTestKit(t);
    },
  },
  {
    name: 'get',
    usage: '<path>',
    help: 'read the world by a dotted path: get pools.pool_02.temperature',
    complete(host, args) {
      if (args.length) return [];
      return Object.keys(host.world());
    },
    run: (host, [path]) => formatValue(readPath(host.world(), path ?? '')),
  },
  {
    name: 'act',
    usage: '<json>',
    raw: true,
    help: 'do any world action: act {"type":"lighting/supply","on":false}',
    run(host, args) {
      const text = args.join(' ');
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        return fail('act: give the action as JSON');
      }
      host.dispatch(checkedAction(host.world(), raw));
    },
  },
  {
    name: 'condump',
    usage: '',
    help: 'download the log as a text file',
    run(host) {
      const now = new Date();
      const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, '');
      const name = `pool-plant-console-${stamp}.txt`;
      host.download(
        name,
        formatDump(host.events(), [
          'Pool Plant console log',
          host.build(),
          `dumped ${now.toISOString()}`,
          `room ${host.currentRoom() ?? '(none)'}`,
        ]),
      );
      return `log saved as ${name}`;
    },
  },
];

const COMMAND_BY_NAME = new Map(COMMANDS.map((c) => [c.name, c]));

/** What the word being typed may become, given the words before it. */
export function candidates(host: ConsoleHost, before: readonly string[]) {
  if (!before.length) return COMMANDS.map((c) => c.name);
  const c = COMMAND_BY_NAME.get(before[0].toLowerCase());
  return c?.complete?.(host, before.slice(1)) ?? [];
}

/** A JavaScript name for a command: its own, but `switch`, a reserved word, is `setSwitch`. */
export const jsName = (name: string) =>
  name === 'switch' ? 'setSwitch' : name;

/** The commands as JavaScript functions, `world` and `act`. */
function scope(host: ConsoleHost, print: (lines: string[]) => void) {
  const fns: Record<string, unknown> = {};
  for (const c of COMMANDS)
    fns[jsName(c.name)] = (...args: unknown[]) => {
      const printed = c.run(
        host,
        args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))),
      );
      if (printed !== undefined)
        print(typeof printed === 'string' ? [printed] : [...printed]);
    };
  fns.world = host.world();
  fns.act = (action: unknown) =>
    host.dispatch(checkedAction(host.world(), action));
  return fns;
}

/** Evaluate JavaScript with the console's scope: an expression's value, or a statement's. */
export function evaluate(
  source: string,
  host: ConsoleHost,
  print: (lines: string[]) => void,
): unknown {
  const s = scope(host, print);
  const names = Object.keys(s);
  let fn: (...args: unknown[]) => unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    fn = new Function(
      ...names,
      `"use strict"; return (${source}\n);`,
    ) as typeof fn;
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    fn = new Function(...names, `"use strict"; ${source}`) as typeof fn;
  }
  return fn(...names.map((n) => s[n]));
}

/**
 * Run a line typed at the console: each statement as a command if it
 * starts with one's name, else the whole line as JavaScript. What it
 * prints, errors included.
 */
export function runLine(host: ConsoleHost, line: string): ConsoleLine[] {
  const out: ConsoleLine[] = [];
  const print = (lines: string[], tone: ConsoleLine['tone'] = 'output') =>
    out.push(...lines.map((text) => ({ text, tone })));
  const statements = splitStatements(line);
  const first = tokenise(statements[0] ?? '')[0]?.toLowerCase();
  const javascript =
    !first || !COMMAND_BY_NAME.has(first) || /^[\w$]+\s*\(/.test(line.trim());
  try {
    if (javascript) {
      if (!line.trim()) return out;
      print(formatValue(evaluate(line, host, print)));
      return out;
    }
    for (const statement of statements) {
      const [name, ...args] = tokenise(statement);
      const c = COMMAND_BY_NAME.get(name.toLowerCase());
      if (!c) {
        print([`no command "${name}" (help lists them)`], 'error');
        continue;
      }
      const printed = c.run(
        host,
        c.raw
          ? [statement.slice(statement.indexOf(name) + name.length).trim()]
          : args,
      );
      if (printed !== undefined)
        print(typeof printed === 'string' ? [printed] : [...printed]);
    }
  } catch (e) {
    print([e instanceof Error ? e.message : String(e)], 'error');
  }
  return out;
}
