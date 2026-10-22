import { VERSION } from '../../game/version';
import { BOROUGH } from '../../toolkit/components/general-safety/logic/borough';
import { boilerHouseChapter } from './boiler-house';
import type { ExhibitInfo } from './boiler-house';
import type { Chapter, Manual } from './document';
import {
  CONTRACT_NUMBER,
  CONTRACTOR,
  DOCUMENT_NUMBER,
  FOREWORD,
  PROJECT,
  REVISIONS,
  revisionFor,
} from './fiction';

/**
 * The whole manual, from the model: the front matter in the fiction's
 * voice, an introduction, and a chapter for each plant room written so
 * far (the boiler house first, the pilot in `doc/plans/operators-
 * manual.md`). Pure: the machines' catalogue is handed in.
 */
export function buildManual(
  exhibitFor: (kind: string) => ExhibitInfo | undefined,
  version = VERSION,
): Manual {
  const boiler = boilerHouseChapter(exhibitFor);
  const introduction: Chapter = {
    id: 'introduction',
    title: 'Introduction',
    blocks: [
      { kind: 'heading', text: 'Scope of this manual' },
      {
        kind: 'para',
        text: `This is the operation and maintenance manual for the pool plant at Ashworth Leisure Centre, installed by ${CONTRACTOR.name} for ${BOROUGH.council}. It forms part of the building's Health and Safety File and should be kept with it, in the plant control room, where duty staff can find it.`,
      },
      {
        kind: 'para',
        text: 'Each chapter describes one plant room: what it is for, where its equipment stands, how it is started and stopped, what it needs from the rest of the building, and the hazards to be aware of. Equipment is identified throughout by the tag on its plate, which also appears on the drawings. Chapters for the remaining plant rooms will be issued as revisions of this manual.',
      },
      { kind: 'heading', text: 'Revisions' },
      {
        kind: 'table',
        caption: 'Revisions of this manual',
        columns: [
          { head: 'Rev.' },
          { head: 'Issued' },
          { head: 'Note', width: 0.6 },
        ],
        rows: REVISIONS.map((r) => [r.rev, r.issued, r.note]),
      },
    ],
  };
  return {
    title: 'Operation and Maintenance Manual',
    subtitle: 'Volume 1: The Plant Rooms',
    project: PROJECT,
    client: [BOROUGH.council, BOROUGH.service],
    contractor: CONTRACTOR,
    documentNumber: DOCUMENT_NUMBER,
    contractNumber: CONTRACT_NUMBER,
    revision: revisionFor(version),
    revisions: REVISIONS,
    foreword: FOREWORD,
    chapters: [introduction, boiler.chapter],
    figures: boiler.figures,
  };
}
