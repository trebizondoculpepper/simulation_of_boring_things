import type { CompositeShape } from '../../game/sim/block-kind';
import { SYMBOLS } from './symbols';
import type { SymbolName } from './symbols';

/**
 * A block of blocks (`game/sim/composite.ts`) as a Graphviz schematic:
 * each part a box named by its kind, each wire an arrow from the part
 * whose output it is to the part whose input it feeds, labelled with the
 * ports; the block's own inputs and outputs as terminals at its edges.
 * Drawn from the model's own wiring, so it is always the model's. Lines
 * run square (orthogonal), and a part with a symbol is drawn as that
 * symbol (`symbols.ts`) with its tag and name beneath. Pure.
 */

/** A kind's name as words: "emergency-control-valve" is "Emergency control valve". */
export const kindName = (kind: string) =>
  kind.charAt(0).toUpperCase() + kind.slice(1).replaceAll('-', ' ');

/** A port's name as words: "ecvOpen" is "ecv open". */
export const portName = (port: string) =>
  port.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

/** A DOT string: backslashes and quotes escaped, line breaks as \n. */
const quote = (s: string) =>
  `"${s.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n')}"`;

export interface SchematicOptions {
  /** Each part's tag on the drawing, by its id inside the block. */
  tags?: Readonly<Record<string, string>>;
  /** Each part's symbol, by its id; a part without one is a box. */
  symbols?: Readonly<Record<string, SymbolName>>;
}

/** The symbols a schematic uses, to be written beside it. */
export const symbolsUsed = (options: SchematicOptions) => [
  ...new Set(Object.values(options.symbols ?? {})),
];

export function compositeDot(
  title: string,
  shape: CompositeShape,
  { tags = {}, symbols = {} }: SchematicOptions = {},
): string {
  const lines: string[] = [
    `digraph ${quote(title)} {`,
    '  graph [rankdir=LR, splines=ortho, forcelabels=true, fontname="Helvetica", fontsize=10, nodesep=0.6, ranksep=1.1, pad=0.2];',
    '  node [shape=box, style=filled, fillcolor="#f4f2ea", color="#1b1b1b", fontname="Helvetica", fontsize=9, margin="0.15,0.08"];',
    '  edge [color="#1b1b1b", fontname="Helvetica", fontsize=7, arrowsize=0.6, penwidth=1.1];',
  ];
  for (const [id, block] of Object.entries(shape.blocks)) {
    const tag = tags[id];
    const label = `${tag ? `${tag}\n` : ''}${kindName(block.kind.kind)}`;
    const symbol = symbols[id] && SYMBOLS[symbols[id]];
    lines.push(
      symbol
        ? `  ${quote(id)} [shape=none, style="", image=${quote(symbol.file)}, imagepos=tc, labelloc=b, width=${((symbol.width + 50) / 72).toFixed(2)}, height=${((symbol.height + 30) / 72).toFixed(2)}, fixedsize=true, label=${quote(label)}];`
        : `  ${quote(id)} [label=${quote(label)}];`,
    );
  }
  // Inside: "part.input": "part.output".
  for (const [to, from] of Object.entries(shape.wires)) {
    const [toBlock, toPort] = to.split('.');
    const [fromBlock, fromPort] = from.split('.');
    lines.push(
      `  ${quote(fromBlock)} -> ${quote(toBlock)} [xlabel=${quote(`${portName(fromPort)} → ${portName(toPort)}`)}];`,
    );
  }
  // Its own inputs, from the left, and outputs, to the right.
  for (const [name, targets] of Object.entries(shape.inputs)) {
    const id = `in:${name}`;
    lines.push(
      `  ${quote(id)} [label=${quote(portName(name))}, shape=plaintext, style="", fontsize=9];`,
    );
    for (const target of targets) {
      const [block, port] = target.split('.');
      lines.push(
        `  ${quote(id)} -> ${quote(block)} [xlabel=${quote(portName(port))}, style=dashed];`,
      );
    }
  }
  for (const [name, source] of Object.entries(shape.outputs)) {
    const id = `out:${name}`;
    const [block, port] = source.split('.');
    lines.push(
      `  ${quote(id)} [label=${quote(portName(name))}, shape=plaintext, style="", fontsize=9];`,
      `  ${quote(block)} -> ${quote(id)} [xlabel=${quote(portName(port))}, style=dashed];`,
    );
  }
  lines.push('}');
  return lines.join('\n');
}
