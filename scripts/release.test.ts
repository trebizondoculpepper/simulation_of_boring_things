import { afterEach, describe, expect, it } from 'vite-plus/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { changelogFor, release } from './release';
import { gitIn } from './versioning';
import type { Git } from './versioning';

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- Something new.

## [0.1.0] - 2026-10-22

- First.

[Unreleased]: https://example.com/r/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/r/releases/tag/v0.1.0
`;

const directories: string[] = [];
afterEach(() => {
  for (const d of directories.splice(0)) rmSync(d, { recursive: true });
});

/** A clone of a bare origin, on main, with the release's three files committed and pushed. */
function project(changelog = CHANGELOG) {
  const top = mkdtempSync(join(tmpdir(), 'pool-release-'));
  directories.push(top);
  const origin = join(top, 'origin.git');
  const root = join(top, 'work');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  execFileSync('git', ['clone', '-q', origin, root], { stdio: 'ignore' });
  const git = gitIn(root);
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  git('checkout', '-q', '-b', 'main');
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify({ name: 'p', version: '0.1.741' }, null, 2)}\n`,
  );
  writeFileSync(
    join(root, 'package-lock.json'),
    `${JSON.stringify({ version: '0.1.741', packages: { '': { version: '0.1.741' } } }, null, 2)}\n`,
  );
  writeFileSync(join(root, 'CHANGELOG.md'), changelog);
  git('add', '.');
  git('commit', '-q', '-m', 'Start');
  git('push', '-q', '-u', 'origin', 'main');
  return { root, git, origin };
}
const quiet = { check: () => {}, build: () => {}, log: () => {} };
const today = () => '2026-10-28';

describe('npm run release (mission 104)', () => {
  it('releases the next minor: one commit of three files, an annotated tag, both pushed', () => {
    const { root, git, origin } = project();
    const built: string[] = [];
    expect(
      release({ root, git, today, ...quiet, build: (v) => built.push(v) }),
    ).toBe('0.2.0');
    expect(built).toEqual(['0.2.0']);
    expect(git('log', '-1', '--format=%s')).toBe('Release v0.2.0');
    expect(
      git('show', '--name-only', '--format=', 'HEAD').split('\n').sort(),
    ).toEqual(['CHANGELOG.md', 'package-lock.json', 'package.json']);
    expect(git('cat-file', '-t', 'v0.2.0')).toBe('tag');
    const remote = gitIn(origin);
    expect(remote('rev-parse', 'main')).toBe(git('rev-parse', 'HEAD'));
    expect(remote('rev-parse', 'v0.2.0^{commit}')).toBe(
      git('rev-parse', 'HEAD'),
    );
    const lock = JSON.parse(
      readFileSync(join(root, 'package-lock.json'), 'utf8'),
    );
    expect([lock.version, lock.packages[''].version]).toEqual([
      '0.2.0',
      '0.2.0',
    ]);
    expect(readFileSync(join(root, 'CHANGELOG.md'), 'utf8')).toContain(
      '## [Unreleased]\n\n## [0.2.0] - 2026-10-28\n',
    );
    expect(git('status', '--porcelain')).toBe('');
  });

  it('makes a major only when asked', () => {
    const { root, git } = project();
    expect(release({ root, git, today, level: 'major', ...quiet })).toBe(
      '1.0.0',
    );
  });

  it('changes nothing when a check or the bundle fails', () => {
    const { root, git } = project();
    const head = git('rev-parse', 'HEAD');
    expect(() =>
      release({
        root,
        git,
        today,
        ...quiet,
        build: () => {
          throw new Error('bundler failed');
        },
      }),
    ).toThrow('bundler failed');
    expect(git('rev-parse', 'HEAD')).toBe(head);
    expect(git('status', '--porcelain')).toBe('');
    expect(git('tag', '--list')).toBe('');
  });

  it('undoes its commit and tag when the push fails, so it can be run again', () => {
    const { root, git, origin } = project();
    const head = git('rev-parse', 'HEAD');
    const failingPush: Git = (...args) => {
      if (args[0] === 'push') throw new Error('push refused');
      return git(...args);
    };
    expect(() => release({ root, git: failingPush, today, ...quiet })).toThrow(
      'push refused',
    );
    expect(git('rev-parse', 'HEAD')).toBe(head);
    expect(git('status', '--porcelain')).toBe('');
    expect(git('tag', '--list')).toBe('');
    expect(gitIn(origin)('rev-parse', 'main')).toBe(head);
    expect(release({ root, git, today, ...quiet })).toBe('0.2.0');
  });

  it('refuses a dirty tree, a branch behind origin, or nothing to release', () => {
    const dirty = project();
    writeFileSync(join(dirty.root, 'stray.txt'), 'x');
    expect(() =>
      release({ root: dirty.root, git: dirty.git, ...quiet }),
    ).toThrow(/not clean/);
    const empty = project(CHANGELOG.replace('- Something new.\n', ''));
    expect(() =>
      release({ root: empty.root, git: empty.git, ...quiet }),
    ).toThrow(/Nothing under Unreleased/);
    const behind = project();
    const other = join(behind.root, '..', 'other');
    execFileSync('git', ['clone', '-q', behind.origin, other], {
      stdio: 'ignore',
    });
    const og = gitIn(other);
    og('config', 'user.name', 'Other');
    og('config', 'user.email', 'o@example.com');
    og('config', 'commit.gpgsign', 'false');
    og('commit', '-q', '--allow-empty', '-m', 'Elsewhere');
    og('push', '-q', 'origin', 'main');
    expect(() =>
      release({ root: behind.root, git: behind.git, ...quiet }),
    ).toThrow(/not level/);
  });
});

describe('the changelog at a release', () => {
  it('moves Unreleased under the version and links it', () => {
    const out = changelogFor(CHANGELOG, '0.2.0', '2026-10-28');
    expect(out).toContain(
      '## [Unreleased]\n\n## [0.2.0] - 2026-10-28\n\n### Added\n\n- Something new.',
    );
    expect(out).toContain(
      '[Unreleased]: https://example.com/r/compare/v0.2.0...HEAD\n[0.2.0]: https://example.com/r/compare/v0.1.0...v0.2.0',
    );
  });
});
