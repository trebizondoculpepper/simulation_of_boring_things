import { afterEach, describe, expect, it } from 'vite-plus/test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProject } from './build';

const directories: string[] = [];
afterEach(() => {
  for (const root of directories.splice(0)) rmSync(root, { recursive: true });
});
const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'pool-build-'));
  directories.push(root);
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ version: '0.1.7' }),
  );
  writeFileSync(
    join(root, 'package-lock.json'),
    JSON.stringify({
      version: '0.1.7',
      packages: { '': { version: '0.1.7' } },
    }),
  );
  return root;
};
const read = (root: string, file: string) =>
  JSON.parse(readFileSync(join(root, file), 'utf8'));

describe('successful build numbering', () => {
  it('uses the next patch in the bundle and persists matching manifests on each success', () => {
    const root = fixture();
    const built: string[] = [];
    const run = (env: NodeJS.ProcessEnv) => {
      expect(read(root, 'package.json').version).toBe('0.1.7');
      built.push(env.VITE_VERSION!);
    };
    expect(buildProject({ root, run })).toBe('0.1.8');
    expect(built).toEqual(['0.1.8']);
    expect(read(root, 'package.json').version).toBe('0.1.8');
    expect(read(root, 'package-lock.json').version).toBe('0.1.8');
    expect(read(root, 'package-lock.json').packages[''].version).toBe('0.1.8');
    expect(buildProject({ root, run: () => {} })).toBe('0.1.9');
  });

  it('leaves both manifests unchanged on failure', () => {
    const root = fixture();
    const before = readFileSync(join(root, 'package.json'), 'utf8');
    expect(() =>
      buildProject({
        root,
        run: () => {
          throw new Error('bundler failed');
        },
      }),
    ).toThrow('bundler failed');
    expect(readFileSync(join(root, 'package.json'), 'utf8')).toBe(before);
    expect(read(root, 'package-lock.json').version).toBe('0.1.7');
  });

  it('rebuilds a tagged release at its exact version', () => {
    const root = fixture();
    expect(buildProject({ root, release: true, run: () => {} })).toBe('0.1.7');
    expect(read(root, 'package.json').version).toBe('0.1.7');
  });
});
