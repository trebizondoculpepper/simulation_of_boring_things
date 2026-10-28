import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gitIn } from './versioning.ts';
import type { Git } from './versioning.ts';

/**
 * CI's guard on the version (mission 104): in the commits pushed, only a
 * `Release vX.Y.Z` commit made by `npm run release` may change
 * `package.json`'s version, to exactly X.Y.Z, with the lockfile's two
 * version fields the same. Anything else (an old habit's build bump) fails.
 */

/** What is wrong with one commit's version change, or null if nothing. */
export function versionChangeProblem(c: {
  subject: string;
  before: string | null;
  after: string;
  lock: string;
  lockRoot: string;
}): string | null {
  if (c.before === c.after) return null;
  if (c.subject !== `Release v${c.after}`)
    return `changes the version ${c.before ?? '(none)'} → ${c.after} but is not "Release v${c.after}" (only npm run release changes it)`;
  if (c.lock !== c.after || c.lockRoot !== c.after)
    return `leaves the lockfile at ${c.lock} / ${c.lockRoot}, not ${c.after}`;
  return null;
}

const versionAt = (git: Git, rev: string, file: string, root = false) => {
  try {
    const json = JSON.parse(git('show', `${rev}:${file}`));
    return String(root ? json.packages?.['']?.version : json.version);
  } catch {
    return null;
  }
};

/** The problems in the commits `from..to` (or `to` alone, with no `from`), one line each. */
export function guardRange(git: Git, from: string | null, to: string) {
  const commits = git(
    'rev-list',
    '--reverse',
    from ? `${from}..${to}` : `${to}^!`,
  )
    .split('\n')
    .filter(Boolean);
  const problems: string[] = [];
  for (const sha of commits) {
    const after = versionAt(git, sha, 'package.json');
    if (after === null) continue;
    const problem = versionChangeProblem({
      subject: git('log', '-1', '--format=%s', sha),
      before: versionAt(git, `${sha}^`, 'package.json'),
      after,
      lock: versionAt(git, sha, 'package-lock.json') ?? '(none)',
      lockRoot: versionAt(git, sha, 'package-lock.json', true) ?? '(none)',
    });
    if (problem) problems.push(`${sha.slice(0, 8)} ${problem}`);
  }
  return problems;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  // node scripts/version-guard.ts <before> <after>: a new branch's or a
  // forced push's `before` (all zeros, or unknown) checks `after` alone.
  const [from, to = 'HEAD'] = process.argv.slice(2);
  const git = gitIn(resolve(import.meta.dirname, '..'));
  const known =
    from && !/^0+$/.test(from)
      ? (() => {
          try {
            git('cat-file', '-e', `${from}^{commit}`);
            return from;
          } catch {
            return null;
          }
        })()
      : null;
  const problems = guardRange(git, known, to);
  for (const p of problems) console.error(p);
  if (problems.length) process.exit(1);
  console.info('No version changes outside a release.');
}
