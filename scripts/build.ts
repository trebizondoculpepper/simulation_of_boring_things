import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  commitsSinceVersionChange,
  derivedVersion,
  gitIn,
  versionParts,
} from './versioning.ts';

interface BuildOptions {
  root?: string;
  /** A release's build: exactly `version`, or `package.json`'s. */
  release?: boolean;
  version?: string;
  /** Commits since the version last changed, or null if unknown (`versioning.ts`). */
  since?: () => number | null;
  /** In CI, where an unknown history must fail rather than guess. */
  ci?: boolean;
  run?: (env: NodeJS.ProcessEnv) => void;
}

/**
 * Build the game at its effective version (mission 104), passed to the
 * bundle as `VITE_VERSION`, the one place it is worked out: a release's
 * exact version, or `package.json`'s with its patch moved on by the commits
 * since it last changed. Writes no tracked file, so a build never dirties
 * the tree; only `npm run release` changes the version.
 */
export function buildProject({
  root = resolve(import.meta.dirname, '..'),
  release = false,
  version: exact,
  since = () => commitsSinceVersionChange(gitIn(root)),
  ci = !!process.env.CI && process.env.CI !== 'false',
  run = (env) =>
    execFileSync(resolve(root, 'node_modules/.bin/vp'), ['build'], {
      cwd: root,
      env,
      stdio: 'inherit',
    }),
}: BuildOptions = {}) {
  const manifest = JSON.parse(
    readFileSync(resolve(root, 'package.json'), 'utf8'),
  );
  versionParts(manifest.version);
  let version: string;
  if (release) version = exact ?? manifest.version;
  else {
    const commits = since();
    if (commits === null) {
      if (ci)
        throw new Error(
          'Cannot read the history to derive the version (a shallow clone?); fetch it all.',
        );
      console.warn(
        'No git history: building at package.json’s version unchanged.',
      );
    }
    version = derivedVersion(manifest.version, commits ?? 0);
  }
  run({ ...process.env, VITE_VERSION: version });
  console.info(`Built Pool Plant ${version}${release ? ' (release)' : ''}`);
  return version;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  buildProject({ release: process.argv.includes('--release') });
