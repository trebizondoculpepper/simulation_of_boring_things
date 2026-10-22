import type { Revision } from './document';

/**
 * Who the manual is from and for, in the game's world: Ashworth Borough
 * Council's leisure centre, whose pool plant Bramhall Fenwick Engineering
 * designed and fitted out in the building's shell, and handed over with
 * this manual (`doc/plans/operators-manual.md`). All invented; Rowland
 * Fenwick, not Hugh (a real engineer has that name). Pure.
 */

export const CONTRACTOR = {
  name: 'Bramhall Fenwick Engineering Ltd',
  trade: 'Building Services Engineers, established 1958',
  address: ['Fenwick House, Canal Street', 'Ashworth'],
} as const;

export const PROJECT = 'Ashworth Leisure Centre: Pool Plant Fit-out';
export const CONTRACT_NUMBER = 'ABC/LCS/98/0147';
export const DOCUMENT_NUMBER = 'BFE-ALC-OM-001';

/**
 * The manual's issues. Each release of the game that carries a manual is
 * a revision; the first is the handover at practical completion, dated in
 * the world's own time. A build of a version not listed is a draft.
 */
export const REVISIONS: readonly Revision[] = [
  {
    rev: 'A',
    version: '0.2.0',
    issued: 'March 2000',
    note: 'First issue at practical completion: the boiler house.',
  },
];

/** This build's revision: its own, or a draft after the last issued. */
export function revisionFor(version: string): string {
  const issued = REVISIONS.find((r) => r.version === version);
  if (issued) return issued.rev;
  const last = REVISIONS[REVISIONS.length - 1];
  return last ? `Draft (after ${last.rev})` : 'Draft';
}

export const FOREWORD = {
  paragraphs: [
    'On behalf of everyone at Bramhall Fenwick Engineering, I should like to thank Ashworth Borough Council for entrusting us with the design and installation of the pool plant at Ashworth Leisure Centre. It has been a privilege to fit out a building of this character, and to give its pools the plant they deserve.',
    'This manual describes the installation as we handed it over: what each plant room does, where every item of equipment is, how it is started, run and stopped, and how it is to be kept safe. It is written for the engineers and duty staff who will run the plant day by day, and we have tried throughout to explain not only what to do but why.',
    'A swimming pool is a working machine, and like any machine it rewards care. Run in accordance with this manual, maintained at the intervals we recommend and watched by attentive staff, the plant should give the people of Ashworth many years of safe, comfortable and productive use.',
    'Should you need us, we remain at your service.',
  ],
  signature: [
    'Rowland Fenwick, CEng MIMechE',
    'Engineering Director',
    'Bramhall Fenwick Engineering Ltd',
  ],
} as const;
