/**
 * Blocks within blocks: the shape of the plant's model. Pure.
 *
 * A block is one thing in the plant (a pump set, a boiler, a valve), of a
 * `kind`, with its own `state` (plain data) and, if it is made of smaller
 * things, its `children`, each a block in its turn: a pump set holds its
 * pump, motor, strainer and valves; a boiler holds its controller, burner
 * and heat exchanger. A kind is reusable: every boiler is the same kind of
 * block, told apart by where it sits.
 *
 * Every block has an address: the names from the root down, joined by
 * `/` ("circulation/P-101/motor"); a field of its state follows a `:`
 * ("circulation/P-101/motor:running"). Anything outside the model (a
 * 3D part, a mimic lamp, a control-room readout) binds to an address: it
 * reads what is there and asks for changes there, and the model never
 * knows what is bound to it. Blocks are immutable: an update returns a
 * new tree sharing every unchanged branch.
 */

export interface Block<S = Record<string, unknown>> {
  kind: string;
  state: S;
  children?: Readonly<Record<string, Block>>;
}

/** An address split into its block path and its field, if any. */
export function parseAddress(address: string) {
  const [path, field] = address.split(':');
  const names = path.split('/').filter(Boolean);
  return { names, field: field || undefined };
}

/** The block at `path` under `root` ("" is the root), or undefined. */
export function blockAt(root: Block, path: string): Block | undefined {
  let block: Block | undefined = root;
  for (const name of parseAddress(path).names) block = block?.children?.[name];
  return block;
}

/** What is at `address`: a block's state field, or the block itself. */
export function read(root: Block, address: string): unknown {
  const { field } = parseAddress(address);
  const block = blockAt(root, address.split(':')[0]);
  if (!block) return undefined;
  return field === undefined
    ? block
    : (block.state as Record<string, unknown>)[field];
}

/** `root` with the block at `path` replaced by `change(block)`. */
export function updateBlock(
  root: Block,
  path: string,
  change: (block: Block) => Block,
): Block {
  const names = parseAddress(path).names;
  const go = (block: Block, depth: number): Block => {
    if (depth === names.length) return change(block);
    const name = names[depth];
    const child = block.children?.[name];
    if (!child)
      throw new Error(`No block "${names.slice(0, depth + 1).join('/')}"`);
    return {
      ...block,
      children: { ...block.children, [name]: go(child, depth + 1) },
    };
  };
  return go(root, 0);
}

/** `root` with a state field at `address` set to `value`. */
export function write(root: Block, address: string, value: unknown): Block {
  const { field } = parseAddress(address);
  if (field === undefined) throw new Error(`"${address}" names no field`);
  return updateBlock(root, address.split(':')[0], (block) => ({
    ...block,
    state: { ...block.state, [field]: value },
  }));
}

/** Every block's address under `root`, depth first, with its kind. */
export function listBlocks(
  root: Block,
  prefix = '',
): { path: string; kind: string }[] {
  const out: { path: string; kind: string }[] = [];
  for (const [name, child] of Object.entries(root.children ?? {})) {
    const path = prefix ? `${prefix}/${name}` : name;
    out.push({ path, kind: child.kind }, ...listBlocks(child, path));
  }
  return out;
}
