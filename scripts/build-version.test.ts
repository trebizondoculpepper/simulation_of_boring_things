import { afterEach, describe, expect, it } from 'vite-plus/test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProject } from './build';
import { derivedVersion, releaseVersion } from './versioning';

const directories: string[] = [];
afterEach(() => {
  for (const root of directories.splice(0)) rmSync(root, { recursive: true });
});
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'pool-build-'));
  directories.push(root);
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ version: '0.2.0' }),
  );
  writeFileSync(
    join(root, 'package-lock.json'),
    JSON.stringify({
      version: '0.2.0',
      packages: { '': { version: '0.2.0' } },
    }),
  );
  return root;
};
const files = (root: string) =>
  ['package.json', 'package-lock.json'].map((f) =>
    readFileSync(join(root, f), 'utf8'),
  );

describe('the build’s version (mission 104)', () => {
  it('builds a push to main at the next patch, derived, writing nothing', () => {
    const root = fixture();
    const before = files(root);
    const built: string[] = [];
    const run = (env: NodeJS.ProcessEnv) => built.push(env.VITE_VERSION!);
    expect(buildProject({ root, since: () => 12, ci: true, run })).toBe(
      '0.2.12',
    );
    expect(buildProject({ root, since: () => 12, ci: true, run })).toBe(
      '0.2.12',
    );
    expect(built).toEqual(['0.2.12', '0.2.12']);
    expect(files(root)).toEqual(before);
  });

  it('builds a release’s own commit at its bare version', () => {
    const root = fixture();
    expect(buildProject({ root, since: () => 0, run: () => {} })).toBe('0.2.0');
    expect(buildProject({ root, release: true, run: () => {} })).toBe('0.2.0');
    expect(
      buildProject({ root, release: true, version: '0.3.0', run: () => {} }),
    ).toBe('0.3.0');
  });

  it('fails in CI rather than guess without its history, and falls back locally', () => {
    const root = fixture();
    expect(() =>
      buildProject({ root, since: () => null, ci: true, run: () => {} }),
    ).toThrow(/history/);
    expect(
      buildProject({ root, since: () => null, ci: false, run: () => {} }),
    ).toBe('0.2.0');
  });

  it('leaves both manifests unchanged on failure', () => {
    const root = fixture();
    const before = files(root);
    expect(() =>
      buildProject({
        root,
        since: () => 3,
        run: () => {
          throw new Error('bundler failed');
        },
      }),
    ).toThrow('bundler failed');
    expect(files(root)).toEqual(before);
  });
});

describe('versions', () => {
  it('moves a patch on by the commits since the release, from where package.json is', () => {
    expect(derivedVersion('0.1.741', 5)).toBe('0.1.746');
    expect(derivedVersion('0.2.0', 0)).toBe('0.2.0');
    expect(derivedVersion('0.2.0', 1)).toBe('0.2.1');
  });
  it('makes a release the next minor, a major only when asked', () => {
    expect(releaseVersion('0.1.741')).toBe('0.2.0');
    expect(releaseVersion('0.2.0')).toBe('0.3.0');
    expect(releaseVersion('0.3.0', 'major')).toBe('1.0.0');
    expect(releaseVersion('0.3.0', '0.3.1')).toBe('0.3.1');
    expect(() => releaseVersion('0.3.0', 'banana')).toThrow();
  });
});
