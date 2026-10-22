import type { SymbolName } from './symbols';

/**
 * The operator's manual as plain data (`doc/plans/operators-manual.md`):
 * its front matter, its chapters as blocks of text, tables, figures,
 * procedures and warnings, and the sources of its figures. Gathered from
 * the game's model by the chapters' own modules and typeset by
 * `../latex/render.ts`. Text is plain: the typesetter escapes it. Pure.
 */

export type Align = 'left' | 'right' | 'centre';

export interface Column {
  head: string;
  align?: Align;
  /** A share of the text width, if the column should wrap. */
  width?: number;
}

export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'list'; items: readonly string[] }
  /** Numbered steps of a procedure. */
  | { kind: 'steps'; items: readonly string[] }
  | {
      kind: 'table';
      caption: string;
      columns: readonly Column[];
      rows: readonly (readonly string[])[];
    }
  /** A figure: a file in the figures folder (PDF), its caption and width share. */
  | { kind: 'figure'; file: string; caption: string; width: number }
  /** A boxed warning, as a manual sets a safety note apart. */
  | { kind: 'warning'; title: string; text: string };

export interface Chapter {
  id: string;
  title: string;
  blocks: readonly Block[];
}

/** A figure to be drawn: Graphviz source, or an SVG drawing. */
export type FigureSource =
  | {
      file: string;
      kind: 'dot';
      source: string;
      /** The symbols it draws in, written beside it (`symbols.ts`). */
      symbols?: readonly SymbolName[];
    }
  | { file: string; kind: 'svg'; source: string };

export interface Revision {
  rev: string;
  /** The game's version it shipped with. */
  version: string;
  issued: string;
  note: string;
}

export interface Manual {
  title: string;
  subtitle: string;
  project: string;
  client: readonly string[];
  contractor: {
    name: string;
    trade: string;
    address: readonly string[];
  };
  documentNumber: string;
  contractNumber: string;
  /** This issue's revision, or a draft's. */
  revision: string;
  revisions: readonly Revision[];
  foreword: {
    paragraphs: readonly string[];
    signature: readonly string[];
  };
  chapters: readonly Chapter[];
  figures: readonly FigureSource[];
}
