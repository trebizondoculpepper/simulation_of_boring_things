import { execFileSync } from 'node:child_process';

/**
 * The game's versions (mission 104; the owner, 2026-10-28): a push to
 * `main` is the next patch, a release the next minor, a major only when
 * the owner asks. Only a release writes the version into `package.json`;
 * every other build derives its patch: `package.json`'s plus the
 * first-parent commits since the last commit that changed it, so it rises
 * with every commit and never repeats, and no build commits anything.
 */

const PATTERN = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$/;

/** A version's numbers, or an error if it is not one. */
export function versionParts(version: string) {
  const m = PATTERN.exec(version);
  if (!m) throw new Error(`Invalid package version: ${version}`);
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ?? '',
  };
}

/** The version `commits` commits past a release at `version`: its patch moved on. */
export function derivedVersion(version: string, commits: number): string {
  const v = versionParts(version);
  if (commits <= 0) return version;
  return `${v.major}.${v.minor}.${v.patch + commits}`;
}

/** The next release's version: the next minor by default, a major only when asked, or an exact one. */
export function releaseVersion(
  current: string,
  level: string = 'minor',
): string {
  const v = versionParts(current);
  if (level === 'minor') return `${v.major}.${v.minor + 1}.0`;
  if (level === 'major') return `${v.major + 1}.0.0`;
  versionParts(level);
  return level;
}

export type Git = (...args: string[]) => string;

/** git in `root`, its output trimmed; throws if git fails. */
export const gitIn =
  (root: string): Git =>
  (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

/**
 * The first-parent commits since `package.json`'s version last changed,
 * or null if the history cannot tell (no git, or a shallow clone).
 */
export function commitsSinceVersionChange(git: Git): number | null {
  try {
    if (git('rev-parse', '--is-shallow-repository') === 'true') return null;
    const base = git(
      'log',
      '-1',
      '--first-parent',
      '--format=%H',
      '-G',
      '"version": ',
      '--',
      'package.json',
    );
    if (!base) return null;
    return Number(
      git('rev-list', '--count', '--first-parent', `${base}..HEAD`),
    );
  } catch {
    return null;
  }
}
