import type { BlockKind, PortValues, Sleep } from './block-kind';
import { undisturbed } from './block-kind';

/**
 * A system of blocks wired output to input, advanced tick by tick. Pure.
 *
 * Each block's input is wired to one other block's output
 * ("boiler.flowTemp" → "sink.flowIn"), or set from outside ("pump.running":
 * a switch the player works). Blocks are stepped in the order given, each
 * seeing the outputs its sources have now, which this tick's earlier
 * blocks have just refreshed and later ones keep from the tick before:
 * the way co-simulation steps coupled models (Gauss–Seidel order), which
 * breaks a loop such as boiler → sink → boiler.
 *
 * A block asleep (`block-kind.ts`) is not stepped while its inputs stay
 * within what it allowed and its wake time has not come: its state stands,
 * and its outputs too, but for any it passes straight through (`read`),
 * which follow its present inputs. The system counts the steps it took and
 * the ones it saved.
 */

export interface SystemBlock {
  kind: BlockKind<object, unknown>;
  params: object;
  state: unknown;
  outputs: PortValues;
  /** If asleep: when it last stepped, its inputs then, and what may wake it. */
  slept: { t: number; at: PortValues; sleep: Sleep } | null;
}

export interface System {
  time: number;
  blocks: Record<string, SystemBlock>;
  /** The order blocks are stepped in. */
  order: readonly string[];
  /** Each input ("block.port") wired from an output ("block.port"). */
  wires: Record<string, string>;
  /** Inputs set from outside ("block.port"). */
  set: Record<string, PortValues[string]>;
  stats: { stepped: number; slept: number };
}

export interface BlockSpec {
  kind: BlockKind<object, unknown>;
  params?: object;
}

/** Build a system, checking every wire joins a declared output to a declared input. */
export function createSystem(
  specs: Record<string, BlockSpec>,
  wires: Record<string, string>,
  set: Record<string, PortValues[string]> = {},
): System {
  const blocks: Record<string, SystemBlock> = {};
  for (const [id, spec] of Object.entries(specs)) {
    const params = { ...spec.kind.params, ...spec.params };
    blocks[id] = {
      kind: spec.kind,
      params,
      state: spec.kind.init(params),
      outputs: Object.fromEntries(spec.kind.outputs.map((o) => [o.name, null])),
      slept: null,
    };
  }
  const port = (address: string, side: 'inputs' | 'outputs') => {
    const [id, name] = address.split('.');
    const block = blocks[id];
    if (!block) throw new Error(`No block "${id}"`);
    if (!block.kind[side].some((p) => p.name === name))
      throw new Error(
        `"${id}" (${block.kind.kind}) has no ${side === 'inputs' ? 'input' : 'output'} "${name}"`,
      );
  };
  for (const [to, from] of Object.entries(wires)) {
    port(to, 'inputs');
    port(from, 'outputs');
  }
  for (const address of Object.keys(set)) port(address, 'inputs');
  return {
    time: 0,
    blocks,
    order: Object.keys(specs),
    wires,
    set,
    stats: { stepped: 0, slept: 0 },
  };
}

/** What is at a block's inputs now. */
export function inputsOf(system: System, id: string): PortValues {
  const block = system.blocks[id];
  const values: PortValues = {};
  for (const { name } of block.kind.inputs) {
    const address = `${id}.${name}`;
    const from = system.wires[address];
    if (from) {
      const [source, port] = from.split('.');
      values[name] = system.blocks[source].outputs[port];
    } else values[name] = system.set[address] ?? null;
  }
  return values;
}

/**
 * A woken block's inputs over the time it slept: as they were when it
 * fell asleep, except that a number still within its tolerance is taken at
 * its midpoint (it drifted there steadily, as far as anyone knows); one
 * that broke the promise changed only in this tick, so it is taken as it
 * was.
 */
function asPromised(
  slept: NonNullable<SystemBlock['slept']>,
  now: PortValues,
): PortValues {
  const out: PortValues = { ...slept.at };
  for (const [name, tolerance] of Object.entries(slept.sleep.hold)) {
    const was = slept.at[name],
      is = now[name];
    if (
      typeof was === 'number' &&
      typeof is === 'number' &&
      Math.abs(is - was) <= tolerance
    )
      out[name] = (was + is) / 2;
  }
  return out;
}

/** The system `dt` seconds on. `sleeping: false` steps every block every tick (for comparison). */
export function stepSystem(
  system: System,
  dt: number,
  { sleeping = true } = {},
): System {
  const t = system.time + dt;
  const blocks = { ...system.blocks };
  const next: System = {
    ...system,
    time: t,
    blocks,
    stats: { ...system.stats },
  };
  for (const id of system.order) {
    const block = blocks[id];
    const inputs = inputsOf(next, id);
    if (
      sleeping &&
      block.slept &&
      (block.kind.stillAsleep
        ? undisturbed(block.slept.sleep, block.slept.at, inputs, t) &&
          block.kind.stillAsleep(block.params, block.state, inputs, t)
        : undisturbed(block.slept.sleep, block.slept.at, inputs, t))
    ) {
      // Its state stands; any outputs that pass straight through follow
      // its present inputs.
      if (block.kind.read)
        blocks[id] = {
          ...block,
          outputs: block.kind.read(block.params, block.state, inputs, t),
        };
      next.stats.slept++;
      continue;
    }
    // Woken after a sleep, it catches up: first the time it slept, with
    // the inputs it was promised (as they were when it fell asleep), then
    // this tick with the inputs that woke it. Whatever woke it happened in
    // this tick, so it must not be applied to the time before.
    let state = block.state;
    const slept = block.slept ? t - dt - block.slept.t : 0;
    if (block.slept && slept > 0)
      state = block.kind.step(
        block.params,
        state,
        asPromised(block.slept, inputs),
        slept,
        t - dt,
        dt,
      ).state;
    const result = block.kind.step(block.params, state, inputs, dt, t, dt);
    blocks[id] = {
      ...block,
      state: result.state,
      outputs: result.outputs,
      slept:
        sleeping && result.sleep
          ? { t, at: inputs, sleep: result.sleep }
          : null,
    };
    next.stats.stepped++;
  }
  return next;
}

/** Set an input from outside: a switch, a setpoint. */
export const setInput = (
  system: System,
  address: string,
  value: PortValues[string],
): System => ({
  ...system,
  set: { ...system.set, [address]: value },
});

/** An output's value now ("boiler.flowTemp"). */
export function output(system: System, address: string) {
  const [id, port] = address.split('.');
  return system.blocks[id]?.outputs[port];
}

/** Run `seconds` in steps of `dt`. */
export function run(
  system: System,
  seconds: number,
  dt = 1,
  options?: { sleeping?: boolean },
) {
  let s = system;
  for (let i = 0; i < Math.round(seconds / dt); i++)
    s = stepSystem(s, dt, options);
  return s;
}
