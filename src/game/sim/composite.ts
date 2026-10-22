import type { BlockKind, PortValue, PortValues, Sleep } from './block-kind';
import { undisturbed } from './block-kind';
import { createSystem, inputsOf, stepSystem } from './system';
import type { BlockSpec, System } from './system';

/**
 * A block made of blocks: a kind (`block-kind.ts`) whose state is a small
 * system of its own (`system.ts`). It declares ports of its own and maps
 * each onto its parts: an input feeds one or more of its parts' inputs,
 * an output is one of its parts' outputs. Outside, it is a block like any
 * other; inside, its parts are wired and stepped as a system is. Pure.
 *
 * It sleeps when every part inside it is asleep, promising what they
 * promised: it wakes when the first of them would (the earliest wake
 * time), and its inputs may drift only as far as the strictest part they
 * feed allows, within the ranges all of them allow. Its outputs that
 * pass straight through its parts (`read`) are followed every tick, as
 * theirs are. So a cluster that is quiet costs nothing, and one part
 * stirring wakes the cluster, which steps its parts, most of which sleep
 * on.
 */

export interface CompositeSpec {
  kind: string;
  blocks: Record<string, BlockSpec>;
  /** Its parts' wiring, inside. */
  wires: Record<string, string>;
  /** Each of its inputs, and the parts' inputs ("part.port") it feeds. */
  inputs: Record<string, readonly string[]>;
  /** Each of its outputs, and the part's output ("part.port") it is. */
  outputs: Record<string, string>;
  /** Its parts' inputs fixed inside it. */
  set?: Record<string, PortValue>;
}

export function compose(spec: CompositeSpec): BlockKind<object, System> {
  /**
   * The system inside as it stands at `t`: the composite's inputs on its
   * parts, and its parts' straight-through outputs followed in order.
   */
  const current = (inner: System, inputs: PortValues, t: number): System => {
    const fed = feed(inner, inputs);
    const blocks = { ...fed.blocks };
    const now: System = { ...fed, blocks };
    for (const id of fed.order) {
      const block = blocks[id];
      if (block.kind.read)
        blocks[id] = {
          ...block,
          outputs: block.kind.read(
            block.params,
            block.state,
            inputsOf(now, id),
            t,
          ),
        };
    }
    return now;
  };
  /** The system inside with the composite's present inputs on its parts. */
  const feed = (inner: System, inputs: PortValues): System => {
    const set = { ...inner.set };
    for (const [name, targets] of Object.entries(spec.inputs))
      for (const address of targets) set[address] = inputs[name] ?? null;
    return { ...inner, set };
  };
  const exposed = (inner: System): PortValues =>
    Object.fromEntries(
      Object.entries(spec.outputs).map(([name, address]) => {
        const [id, port] = address.split('.');
        return [name, inner.blocks[id].outputs[port]];
      }),
    );
  /** What the parts asleep promise, as a promise for the whole. */
  const promise = (inner: System): Sleep | undefined => {
    const parts = Object.values(inner.blocks);
    if (parts.some((b) => !b.slept)) return undefined;
    const hold: Record<string, number> = {};
    const within: Record<string, [number, number]> = {};
    for (const [name, targets] of Object.entries(spec.inputs))
      for (const address of targets) {
        const [id, port] = address.split('.');
        const sleep = inner.blocks[id].slept!.sleep;
        if (port in sleep.hold)
          hold[name] = Math.min(hold[name] ?? Infinity, sleep.hold[port]);
        const range = sleep.within?.[port];
        if (range) {
          const [lo, hi] = within[name] ?? [-Infinity, Infinity];
          within[name] = [Math.max(lo, range[0]), Math.min(hi, range[1])];
        }
      }
    return {
      until: Math.min(...parts.map((b) => b.slept!.sleep.until)),
      hold,
      within,
    };
  };
  return {
    kind: spec.kind,
    composite: spec,
    inputs: Object.keys(spec.inputs).map((name) => ({ name })),
    outputs: Object.keys(spec.outputs).map((name) => ({ name })),
    params: {},
    init: () =>
      createSystem(spec.blocks, spec.wires, {
        ...Object.fromEntries(
          Object.values(spec.inputs)
            .flat()
            .map((a) => [a, null]),
        ),
        ...spec.set,
      }),
    read(_params, inner, inputs, t) {
      return exposed(current(inner, inputs, t));
    },
    stillAsleep(_params, inner, inputs, t) {
      // Each part's promise, against what its inputs are now inside.
      const now = current(inner, inputs, t);
      return Object.entries(now.blocks).every(
        ([id, block]) =>
          block.slept !== null &&
          undisturbed(block.slept.sleep, block.slept.at, inputsOf(now, id), t),
      );
    },
    step(_params, inner, inputs, dt, t, tick) {
      // Its parts are stepped tick by tick, across any time it slept
      // (cheaply: those still asleep are skipped).
      let s: System = { ...feed(inner, inputs), time: t - dt };
      const ticks = Math.max(1, Math.round(dt / tick));
      for (let i = 0; i < ticks; i++) s = stepSystem(s, dt / ticks);
      return { state: s, outputs: exposed(s), sleep: promise(s) };
    },
  };
}
