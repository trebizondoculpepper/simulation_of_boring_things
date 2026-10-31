import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * A release's notes for its GitHub release (the owner, 2026-10-31): its
 * changelog section, each entry cut to its headline, sorted into Major
 * features and Minor fixes, with a link to the full section. An entry
 * under a Keep a Changelog `### Fixed` (or Security) heading is a fix,
 * under any other heading a feature; one under no heading is a fix when
 * its headline says so (fixed, no longer, bug, audit and the like).
 *
 * `node scripts/release-notes.ts --dry-run` prints Unreleased's notes;
 * `-- --version x.y.z --out notes.md` writes a release's (the workflow).
 */

export type Kind = 'feature' | 'fix';

export interface Entry {
  kind: Kind;
  headline: string;
}

/** The body of the changelog section `version` (or `Unreleased`), or undefined. */
export function sectionOf(text: string, version: string): string | undefined {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const head = new RegExp(`^## \\[${escaped}\\][^\\n]*\\n`, 'm').exec(text);
  if (!head) return undefined;
  const rest = text.slice(head.index + head[0].length);
  const next = rest.search(/^(## \[|\[[^\]]+\]: )/m);
  return next < 0 ? rest : rest.slice(0, next);
}

const FIX_HEADINGS = /^(fixed|security)$/i;
const FIX_WORDS =
  /\b(fix(es|ed)?|bugs?|no longer|audit(ed)?|correct(ed|s)?|wrong(ly)?|broken|regression|repaired|restored|instead of)\b/i;

/** Where `text`'s clauses end: colons, semicolons and full stops outside brackets, quotes and code. */
function breaksOf(text: string): number[] {
  const breaks: number[] = [];
  let depth = 0;
  let quoted = false;
  let code = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '`') code = !code;
    else if (code) continue;
    else if (c === '"') quoted = !quoted;
    else if (c === '“') quoted = true;
    else if (c === '”') quoted = false;
    else if (c === '(' || c === '[') depth++;
    else if ((c === ')' || c === ']') && depth > 0) depth--;
    else if (
      depth === 0 &&
      !quoted &&
      (c === ':' || c === ';' || c === '.') &&
      (i + 1 === text.length || text[i + 1] === ' ')
    )
      breaks.push(i);
  }
  return breaks;
}

/**
 * The entry's headline: its first clause, or its first two where the first
 * is only a place ("Museum, Hall 4: ..."), less its dated asides ("(the
 * owner, 2026-10-31)") and any trailing bracket.
 */
export function headlineOf(entry: string, limit = 200): string {
  const text = entry
    .replace(/\s+/g, ' ')
    .replace(/\s*\([^()]*\b\d{4}-\d{2}-\d{2}\b[^()]*\)/g, '')
    .trim();
  const breaks = breaksOf(text);
  let end = breaks[0] ?? text.length;
  if (text.slice(0, end).split(' ').length < 4 && breaks.length > 1)
    end = breaks[1];
  let line = text.slice(0, end).trim();
  for (let prev = ''; prev !== line;) {
    prev = line;
    line = line.replace(/\s*\([^()]*\)$/, '').trim();
  }
  if (!line) line = text;
  if (line.length > limit) {
    const cut = line.slice(0, limit);
    line = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`;
  }
  return line;
}

/** A section's entries, each with its kind. */
export function entriesOf(section: string): Entry[] {
  const entries: Entry[] = [];
  let heading: string | undefined;
  let current: string[] | undefined;
  const close = () => {
    if (!current) return;
    const text = current.join(' ');
    const headline = headlineOf(text);
    const kind: Kind =
      heading !== undefined
        ? FIX_HEADINGS.test(heading)
          ? 'fix'
          : 'feature'
        : FIX_WORDS.test(headline)
          ? 'fix'
          : 'feature';
    entries.push({ kind, headline });
    current = undefined;
  };
  for (const line of section.split('\n')) {
    const h = /^###\s+(.+?)\s*$/.exec(line);
    const item = /^[-*] (.*)$/.exec(line);
    if (h) {
      close();
      heading = h[1];
    } else if (item) {
      close();
      current = [item[1]];
    } else if (current && /^\s+\S/.test(line)) current.push(line.trim());
    else close();
  }
  close();
  return entries;
}

/** The notes in Markdown: Major features, Minor fixes, and a link to the full changelog. */
export function renderNotes(entries: Entry[], fullNotesUrl?: string): string {
  const list = (kind: Kind) => {
    const lines = entries.filter((e) => e.kind === kind);
    return lines.length
      ? lines.map((e) => `- ${e.headline}`).join('\n')
      : '- None in this release.';
  };
  let out = `## Major features\n\n${list('feature')}\n\n## Minor fixes\n\n${list('fix')}\n`;
  if (fullNotesUrl)
    out += `\nThe full notes are in [CHANGELOG.md](${fullNotesUrl}).\n`;
  return out;
}

/** GitHub takes at most 125000 characters of notes. */
const MAX_LENGTH = 120000;

/** The notes for changelog section `version` of `text`. */
export function releaseNotes(
  text: string,
  version: string,
  fullNotesUrl?: string,
): string {
  const section = sectionOf(text, version);
  if (section === undefined)
    throw new Error(`CHANGELOG.md has no section for ${version}.`);
  let notes = renderNotes(entriesOf(section), fullNotesUrl);
  if (notes.length > MAX_LENGTH) {
    const cut = notes.slice(0, MAX_LENGTH);
    notes = `${cut.slice(0, cut.lastIndexOf('\n'))}\n- …\n`;
    if (fullNotesUrl)
      notes += `\nThe full notes are in [CHANGELOG.md](${fullNotesUrl}).\n`;
  }
  return notes;
}

function main(argv: string[]): void {
  const arg = (name: string) => {
    const at = argv.indexOf(name);
    return at < 0 ? undefined : argv[at + 1];
  };
  const version = arg('--version') ?? 'Unreleased';
  const out = argv.includes('--dry-run') ? undefined : arg('--out');
  const root = resolve(import.meta.dirname, '..');
  const text = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
  const notes = releaseNotes(text, version, arg('--url'));
  if (out) writeFileSync(out, notes);
  else process.stdout.write(notes);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main(process.argv.slice(2));
