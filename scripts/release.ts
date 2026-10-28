import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildProject } from './build.ts';
import { gitIn, releaseVersion } from './versioning.ts';
import type { Git } from './versioning.ts';

/**
 * `npm run release` (mission 104; the owner, 2026-10-28): the only thing
 * that changes the game's version. The next minor by default (`-- major`
 * only when the owner asks, or `-- x.y.z`). From a clean `main` level with
 * `origin/main`, with something under Unreleased: it runs the checks,
 * bundles at the new version, and only then writes `package.json`, the
 * lockfile and the changelog, commits them as `Release vX.Y.Z`, tags it
 * (annotated) and pushes both at once; the release workflow takes it from
 * the tag to GitHub and itch.io. On any failure it undoes what it did, so
 * the tree is as it was and it can be run again.
 */

const FILES = ['package.json', 'package-lock.json', 'CHANGELOG.md'] as const;

/** The changelog with Unreleased become `version`'s section, a fresh Unreleased above, and its links. */
export function changelogFor(
  text: string,
  version: string,
  date: string,
): string {
  const head = '## [Unreleased]\n';
  const at = text.indexOf(head);
  if (at < 0) throw new Error('CHANGELOG.md has no Unreleased section.');
  const rest = text.slice(at + head.length);
  const next = rest.search(/^## \[/m);
  const body = next < 0 ? rest : rest.slice(0, next);
  if (!/^\s*[-*] /m.test(body))
    throw new Error('Nothing under Unreleased in CHANGELOG.md to release.');
  let out = `${text.slice(0, at)}${head}\n## [${version}] - ${date}\n${rest}`;
  // Its compare links: Unreleased from the new tag, the new version's own.
  const link = /^\[Unreleased\]: (\S+)\/compare\/(v\S+)\.\.\.HEAD$/m.exec(out);
  if (link) {
    const [line, repo, from] = link;
    out = out.replace(
      line,
      `[Unreleased]: ${repo}/compare/v${version}...HEAD\n[${version}]: ${repo}/compare/${from}...v${version}`,
    );
  }
  return out;
}

/** `package.json` and the lockfile's text at `version`. */
export function manifestsAt(
  pkg: string,
  lock: string,
  version: string,
): [string, string] {
  const p = JSON.parse(pkg);
  const l = JSON.parse(lock);
  p.version = version;
  l.version = version;
  if (l.packages?.['']) l.packages[''].version = version;
  return [`${JSON.stringify(p, null, 2)}\n`, `${JSON.stringify(l, null, 2)}\n`];
}

interface ReleaseOptions {
  root?: string;
  level?: string;
  git?: Git;
  /** Run a check (`npm run <script>`). */
  check?: (script: string) => void;
  build?: (version: string) => void;
  today?: () => string;
  log?: (line: string) => void;
}

export function release({
  root = resolve(import.meta.dirname, '..'),
  level = 'minor',
  git = gitIn(root),
  check = (script) =>
    execFileSync('npm', ['run', script], { cwd: root, stdio: 'inherit' }),
  build = (version) => buildProject({ root, release: true, version }),
  today = () => new Date().toISOString().slice(0, 10),
  log = console.info,
}: ReleaseOptions = {}): string {
  const path = (f: string) => resolve(root, f);
  const before = Object.fromEntries(
    FILES.map((f) => [f, readFileSync(path(f), 'utf8')]),
  ) as Record<(typeof FILES)[number], string>;
  const current = JSON.parse(before['package.json']).version as string;
  const version = releaseVersion(current, level);
  const tag = `v${version}`;

  // Refuse before touching anything.
  if (git('status', '--porcelain'))
    throw new Error('The working tree is not clean.');
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main')
    throw new Error('Releases are made from main.');
  git('fetch', '--quiet', '--tags', 'origin', 'main');
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main'))
    throw new Error('main is not level with origin/main: pull or push first.');
  if (git('tag', '--list', tag)) throw new Error(`${tag} already exists.`);
  const changelog = changelogFor(before['CHANGELOG.md'], version, today());

  for (const script of ['typecheck', 'lint', 'format:check', 'test'])
    check(script);
  build(version);

  // Only now, the release: written, committed, tagged and pushed, undone
  // step by step if any part fails.
  const restore = () => {
    for (const f of FILES) writeFileSync(path(f), before[f]);
  };
  const [pkg, lock] = manifestsAt(
    before['package.json'],
    before['package-lock.json'],
    version,
  );
  let committed = false;
  let tagged = false;
  try {
    writeFileSync(path('package.json'), pkg);
    writeFileSync(path('package-lock.json'), lock);
    writeFileSync(path('CHANGELOG.md'), changelog);
    git('add', ...FILES);
    git('commit', '-m', `Release ${tag}`);
    committed = true;
    git('tag', '-a', tag, '-m', `Pool Plant ${tag}`);
    tagged = true;
    // Still level with origin, else another push came in meanwhile.
    git('fetch', '--quiet', 'origin', 'main');
    if (git('rev-parse', 'origin/main') !== git('rev-parse', 'HEAD~1'))
      throw new Error('origin/main moved during the release: pull and rerun.');
    git('push', '--atomic', 'origin', 'main', tag);
  } catch (error) {
    if (tagged) git('tag', '-d', tag);
    if (committed) git('reset', '--soft', 'HEAD~1');
    git('reset', '--quiet', '--', ...FILES);
    restore();
    throw error;
  }
  log(`Released Pool Plant ${version} (${tag}, pushed).`);
  return version;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  release({ level: process.argv[2] ?? 'minor' });
