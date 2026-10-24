import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface BuildOptions {
  root?: string;
  release?: boolean;
  run?: (env: NodeJS.ProcessEnv) => void;
}

/** Build with the next patch, recording it only after the bundler succeeds. */
export function buildProject({
  root = resolve(import.meta.dirname, '..'),
  release = false,
  run = (env) =>
    execFileSync(resolve(root, 'node_modules/.bin/vp'), ['build'], {
      cwd: root,
      env,
      stdio: 'inherit',
    }),
}: BuildOptions = {}) {
  const packagePath = resolve(root, 'package.json');
  const lockPath = resolve(root, 'package-lock.json');
  const packageText = readFileSync(packagePath, 'utf8');
  const lockText = readFileSync(lockPath, 'utf8');
  const manifest = JSON.parse(packageText);
  const lock = JSON.parse(lockText);
  const parts = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(manifest.version);
  if (!parts) throw new Error(`Invalid package version: ${manifest.version}`);
  const version = release
    ? manifest.version
    : `${parts[1]}.${parts[2]}.${Number(parts[3]) + 1}${parts[4] ? `-${parts[4]}` : ''}`;
  run({ ...process.env, VITE_VERSION: version });
  if (!release) {
    // Do not overwrite a version changed by another build or editor meanwhile.
    if (
      readFileSync(packagePath, 'utf8') !== packageText ||
      readFileSync(lockPath, 'utf8') !== lockText
    )
      throw new Error(
        'Package files changed during the build; version not saved.',
      );
    manifest.version = version;
    lock.version = version;
    lock.packages[''].version = version;
    writeFileSync(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  }
  console.info(
    `Built Pool Plant ${version}${release ? ' (tagged release)' : ''}`,
  );
  return version;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  buildProject({ release: process.argv.includes('--release') });
