import { version } from '../../package.json';

/**
 * The game's version: semantic versioning (https://semver.org),
 * MAJOR.MINOR.PATCH with an optional pre-release after a hyphen (mission
 * 104; README, "Versions and releases"). Every push to `main` is the next
 * patch, derived by the build (`scripts/build.ts`: `package.json`'s plus
 * the commits since it last changed) and passed in as `VITE_VERSION`;
 * every release, `npm run release`, the next minor, written to
 * `package.json` and tagged `vMAJOR.MINOR.PATCH`; a major only when the
 * owner asks. The dev server shows `package.json`'s. The title screen
 * shows `versionLabel()`.
 *
 * - MAJOR: a save that can no longer be carried forward (a dropped
 *   migration in `save.ts`), or a change that breaks how the game is
 *   played or packaged.
 * - MINOR: new rooms, machines, systems or features; a new save version
 *   with its migration (`WORLD_VERSION`).
 * - PATCH: fixes, performance and wording, nothing new.
 *
 * Below 1.0.0 the game is in development, and a MINOR may break things.
 * Pure.
 */
export const VERSION: string = import.meta.env.VITE_VERSION || version;

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  /** After the hyphen, if any: `alpha.1`, `rc.2`. */
  prerelease: string | null;
}

const PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

/** A version string's parts, or null if it is not one (`v` allowed in front). */
export function parseVersion(text: string): SemVer | null {
  const m = PATTERN.exec(text.replace(/^v/, ''));
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ?? null,
  };
}

/** Which of two versions is later: negative if `a` is earlier, 0 if the same. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) throw new Error(`Not a version: ${x ? b : a}`);
  for (const k of ['major', 'minor', 'patch'] as const)
    if (x[k] !== y[k]) return x[k] - y[k];
  // A pre-release comes before its release; pre-releases compare by part.
  if (x.prerelease === y.prerelease) return 0;
  if (x.prerelease === null) return 1;
  if (y.prerelease === null) return -1;
  const p = x.prerelease.split('.');
  const q = y.prerelease.split('.');
  for (let i = 0; i < Math.max(p.length, q.length); i++) {
    if (p[i] === undefined) return -1;
    if (q[i] === undefined) return 1;
    const pn = /^\d+$/.test(p[i]);
    const qn = /^\d+$/.test(q[i]);
    if (pn && qn && Number(p[i]) !== Number(q[i]))
      return Number(p[i]) - Number(q[i]);
    if (pn !== qn) return pn ? -1 : 1;
    if (p[i] !== q[i]) return p[i] < q[i] ? -1 : 1;
  }
  return 0;
}

/**
 * The version as the title screen shows it: `v0.1.0`, marked as a
 * development build when it runs from the dev server rather than a
 * release build.
 */
export function versionLabel(
  version = VERSION,
  development = import.meta.env.DEV,
): string {
  return `v${version}${development ? ' (development build)' : ''}`;
}

/**
 * The version and build as the title screen's corner shows them:
 * "v0.1.0 · build 3fe13af · 22 Oct 2026" from a build CI made (`build` is
 * its `VITE_BUILD`: the commit's short hash and the date), or marked as a
 * development build from the dev server.
 */
export function buildLine(
  version = VERSION,
  build: string | undefined = import.meta.env.VITE_BUILD,
  development = import.meta.env.DEV,
): string {
  const label = build ? `v${version} · build ${build}` : `v${version}`;
  return `${label}${development ? ' · development build' : ''}`;
}
