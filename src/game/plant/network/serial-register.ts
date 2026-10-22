/**
 * Keeping the serial register (`serials.ts`): what is missing from it, and
 * the register's source with new serials given out. A serial is never
 * computed from the order the network is built in, which would renumber
 * everything after an insertion: each is recorded once, when its thing
 * is first added, and kept for good. Pure.
 */
import type { PlantNetwork } from './types';

export interface Register {
  serials: Readonly<Record<string, number>>;
  retired: readonly number[];
}

/** Problems with the register against the network, as sentences. */
export function registerProblems(net: PlantNetwork, reg: Register): string[] {
  const problems: string[] = [];
  const ids = new Set(net.nodes.map((n) => n.id));
  const seen = new Map<number, string>();
  for (const n of net.nodes)
    if (reg.serials[n.id] === undefined)
      problems.push(
        `${n.id} has no serial: run ASSIGN_SERIALS=1 npx vp test run scripts/assign-serials.test.ts`,
      );
  for (const [id, serial] of Object.entries(reg.serials)) {
    if (!Number.isInteger(serial) || serial < 1)
      problems.push(`${id} has a malformed serial ${serial}`);
    const other = seen.get(serial);
    if (other)
      problems.push(`Serial ${serial} is given to both ${other} and ${id}`);
    seen.set(serial, id);
    if (reg.retired.includes(serial))
      problems.push(`Serial ${serial} of ${id} is retired`);
    if (!ids.has(id))
      problems.push(
        `${id} (serial ${serial}) is in the register but not the network: if it moved, rename its entry, keeping its serial; if it was removed, move its serial to RETIRED`,
      );
  }
  return problems;
}

/** The register with a new serial for every node that lacks one, in the network's order. */
export function withNewSerials(net: PlantNetwork, reg: Register): Register {
  const serials = { ...reg.serials };
  let next = Math.max(0, ...Object.values(serials), ...reg.retired) + 1;
  for (const n of net.nodes)
    if (serials[n.id] === undefined) serials[n.id] = next++;
  return { serials, retired: reg.retired };
}

/** The register's source file. */
export function registerSource(reg: Register): string {
  const entries = Object.entries(reg.serials).sort((a, b) => a[1] - b[1]);
  return [
    '/**',
    ' * The plant network’s serial register: each node’s serial number, the',
    ' * order it was added to the plant, kept for good. Append only: new',
    ' * entries come from `ASSIGN_SERIALS=1 npx vp test run scripts/assign-serials.test.ts`.',
    ' * When a thing moves, rename its entry and keep its serial; when it is',
    ' * removed, delete its entry and add its serial to RETIRED, never to be',
    ' * reused (`serial-register.ts`).',
    ' */',
    'export const SERIALS: Readonly<Record<string, number>> = {',
    ...entries.map(([id, serial]) => `  '${id}': ${serial},`),
    '};',
    '',
    '/** Serials of things removed from the plant: never given out again. */',
    `export const RETIRED: readonly number[] = [${reg.retired.join(', ')}];`,
    '',
  ].join('\n');
}
