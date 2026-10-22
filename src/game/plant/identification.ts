import type { Block } from '../sim/blocks';
import { blockAt, read, write } from '../sim/blocks';
import type { BlockKind, PartManifest } from '../sim/block-kind';

/** A model address is stable even if the room-facing identifier changes. */
export interface IdentifiedPart extends PartManifest {
  id: string;
  address: string;
  kind: string;
  depth: number;
  state: unknown;
}

type DescribedKind = Pick<BlockKind, 'kind' | 'parts'>;

/** Kinds describe their children once; instances carry only state and structure. */
export const IDENTIFIED_KINDS: Readonly<Record<string, DescribedKind>> = {
  facility: {
    kind: 'facility',
    parts: [
      {
        code: 'PL4',
        class: 'plant',
        name: 'Footbath plant room',
        purpose:
          'Houses the packaged footbath water treatment and service valves.',
      },
    ],
  },
  'plant-room': {
    kind: 'plant-room',
    parts: [
      {
        code: 'CAB1',
        class: 'plant',
        name: 'Footbath packaged cabinet',
        purpose:
          'Circulates, filters, heats and disinfects the footbath water.',
      },
      {
        code: 'PW1',
        class: 'plant',
        name: 'Footbath pool-water pipework',
        purpose: 'Carries treated water back to the footbath or to the drain.',
      },
      {
        code: 'MU1',
        class: 'plant',
        name: 'Footbath make-up pipework',
        purpose: 'Supplies fresh water through the break tank and float valve.',
      },
    ],
  },
  'spa-cabinet': {
    kind: 'spa-cabinet',
    parts: [
      {
        code: 'SW1',
        class: 'plant',
        name: 'Cabinet power switch',
        purpose:
          'Starts or stops the packaged treatment set when its isolator is on.',
        normal: 'on',
      },
      {
        code: 'P1',
        class: 'plant',
        name: 'Circulation pump',
        purpose: 'Moves footbath water through the treatment train.',
      },
      {
        code: 'F1',
        class: 'plant',
        name: 'Cartridge filter',
        purpose: 'Removes suspended solids from circulating water.',
      },
      {
        code: 'UV1',
        class: 'plant',
        name: 'UV unit',
        purpose: 'Disinfects water while the cabinet is running.',
      },
      {
        code: 'HX1',
        class: 'plant',
        name: 'Heat exchanger',
        purpose: 'Transfers heat from the shared heating circuit.',
      },
      {
        code: 'DP1',
        class: 'plant',
        name: 'Dosing set',
        purpose: 'Controls chemical addition to the return water.',
      },
    ],
  },
  'pool-pipework': {
    kind: 'pool-pipework',
    parts: [
      {
        code: 'RV1',
        class: 'plant',
        name: 'Return valve',
        purpose:
          'Opens the treated-water return to the footbath; close before drain-down.',
        normal: 'open',
      },
      {
        code: 'DV1',
        class: 'plant',
        name: 'Drain-down valve',
        purpose:
          'Diverts pumped footbath water to the foul sewer when the return is shut.',
        normal: 'closed',
      },
    ],
  },
  'make-up-pipework': {
    kind: 'make-up-pipework',
    parts: [
      {
        code: 'LCV1',
        class: 'plant',
        name: 'Make-up float valve',
        purpose:
          'Admits fresh water when the tank falls below its float setpoint; close for drain-down.',
        normal: 'open',
      },
    ],
  },
  valve: { kind: 'valve' },
  switch: { kind: 'switch' },
  machine: { kind: 'machine' },
};

const valve = (open: boolean): Block<{ open: boolean }> => ({
  kind: 'valve',
  state: { open },
});
const machine = (): Block => ({ kind: 'machine', state: {} });

/** The identified pilot. Other rooms enter this tree as their model circuits are migrated. */
export function newIdentifiedPlant(): Block {
  return {
    kind: 'facility',
    state: {},
    children: {
      PL4: {
        kind: 'plant-room',
        state: {},
        children: {
          CAB1: {
            kind: 'spa-cabinet',
            state: {},
            children: {
              SW1: { kind: 'switch', state: { on: true } },
              P1: machine(),
              F1: machine(),
              UV1: machine(),
              HX1: machine(),
              DP1: machine(),
            },
          },
          PW1: {
            kind: 'pool-pipework',
            state: {},
            children: {
              RV1: valve(true),
              DV1: valve(false),
            },
          },
          MU1: {
            kind: 'make-up-pipework',
            state: {},
            children: { LCV1: valve(true) },
          },
        },
      },
    },
  };
}

const ROOM = /^(?:PL[1-4]|WH|BH|HS|AS|LB|SR|AP|CR|EO|PH[1-4])$/;
const PARENT =
  /^(?:P|F|T|HX|B|UV|OZ|CAB|DP|AHU|CP|MP|DB|IS|PW|HW|G|MU|DR|CH|D|CRD)\d+$/;
const CHILD =
  /^(?:P|F|T|HX|B|UV|OZ|CAB|DP|AHU|CP|MP|DB|IS|PW|HW|MU|DR|CH|D|CRD|IV|SV|RV|DV|BV|NRV|LCV|CV|SW|PB|L|G|M|PS|LV|CL)\d+$/;

/** One depth-first walk for views, charts, the manual and integrity tests. */
export function walkIdentified(root: Block): IdentifiedPart[] {
  const found: IdentifiedPart[] = [];
  const ids = new Set<string>();
  const walk = (block: Block, id: string, path: string, depth: number) => {
    const declared = IDENTIFIED_KINDS[block.kind];
    if (!declared)
      throw new Error(`Undeclared block kind ${block.kind} at ${path}`);
    const children = block.children ?? {};
    const manifest = declared.parts ?? [];
    for (const part of manifest) {
      const code = part.code;
      const pattern = depth === 0 ? ROOM : depth === 1 ? PARENT : CHILD;
      if (!pattern.test(code))
        throw new Error(`Invalid component code ${code} at ${path}`);
      const child = children[code];
      if (!child) throw new Error(`Missing ${code} in ${path || 'facility'}`);
      if (!part.name.trim() || !part.purpose.trim())
        throw new Error(`Undocumented ${code}`);
      if (
        child.kind === 'valve' &&
        !['open', 'closed'].includes(part.normal ?? '')
      )
        throw new Error(`Valve ${code} has no normal state`);
      if (child.kind === 'switch' && !['on', 'off'].includes(part.normal ?? ''))
        throw new Error(`Switch ${code} has no normal state`);
      const childId = id ? `${id}-${code}` : code;
      if (ids.has(childId)) throw new Error(`Duplicate identifier ${childId}`);
      ids.add(childId);
      const address = path ? `${path}/${code}` : code;
      found.push({
        ...part,
        id: childId,
        address,
        kind: child.kind,
        depth,
        state: child.state,
      });
      walk(child, childId, address, depth + 1);
    }
    for (const code of Object.keys(children))
      if (!manifest.some((part) => part.code === code))
        throw new Error(`Undeclared ${code} in ${path || 'facility'}`);
  };
  walk(root, '', '', 0);
  return found;
}

export const FOOTBATH = {
  return: 'PL4-PW1-RV1',
  drain: 'PL4-PW1-DV1',
  makeUp: 'PL4-MU1-LCV1',
  power: 'PL4-CAB1-SW1',
} as const;

/** Resolve an operator tag to its model address through the standard walk. */
export function identifiedPart(
  root: Block,
  id: string,
): IdentifiedPart | undefined {
  return walkIdentified(root).find((part) => part.id === id);
}

export function partOpen(root: Block, id: string): boolean {
  const part = identifiedPart(root, id);
  if (!part || part.kind !== 'valve') throw new Error(`No valve ${id}`);
  return read(root, `${part.address}:open`) === true;
}

export function setPartOpen(root: Block, id: string, open: boolean): Block {
  const part = identifiedPart(root, id);
  if (!part || part.kind !== 'valve') throw new Error(`No valve ${id}`);
  if (!blockAt(root, part.address))
    throw new Error(`Missing model block ${part.address}`);
  return write(root, `${part.address}:open`, open);
}

export function partOn(root: Block, id: string): boolean {
  const part = identifiedPart(root, id);
  if (!part || part.kind !== 'switch') throw new Error(`No switch ${id}`);
  return read(root, `${part.address}:on`) === true;
}

export function setPartOn(root: Block, id: string, on: boolean): Block {
  const part = identifiedPart(root, id);
  if (!part || part.kind !== 'switch') throw new Error(`No switch ${id}`);
  return write(root, `${part.address}:on`, on);
}

/** Drain-down is a route through the return/changeover pair, not a pool flag. */
export function footbathLineup(root: Block) {
  const returnOpen = partOpen(root, FOOTBATH.return);
  const drainOpen = partOpen(root, FOOTBATH.drain);
  return {
    makeUpOpen: partOpen(root, FOOTBATH.makeUp),
    draining: drainOpen && !returnOpen,
    returning: returnOpen && !drainOpen,
    powered: partOn(root, FOOTBATH.power),
  };
}
