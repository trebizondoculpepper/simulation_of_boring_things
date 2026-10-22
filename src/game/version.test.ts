import changelog from '../../CHANGELOG.md?raw';
import { describe, expect, it } from 'vite-plus/test';
import {
  VERSION,
  compareVersions,
  parseVersion,
  buildLine,
  versionLabel,
} from './version';

describe('the game’s version', () => {
  it('is a semantic version, from package.json', () => {
    expect(parseVersion(VERSION)).not.toBeNull();
  });

  it('has its section in the changelog, or is still unreleased there', () => {
    expect(changelog).toMatch(/^## \[Unreleased\]/m);
    // Every released section is a semantic version, latest first.
    const released = [...changelog.matchAll(/^## \[(\d[^\]]*)\]/gm)].map(
      (m) => m[1],
    );
    for (const v of released) expect(parseVersion(v), v).not.toBeNull();
    for (let i = 1; i < released.length; i++)
      expect(compareVersions(released[i - 1], released[i])).toBeGreaterThan(0);
    // The package is never behind the latest release.
    if (released.length)
      expect(compareVersions(VERSION, released[0])).toBeGreaterThanOrEqual(0);
  });

  it('reads versions, with or without a v and a pre-release', () => {
    expect(parseVersion('v1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null,
    });
    expect(parseVersion('0.4.0-rc.2')?.prerelease).toBe('rc.2');
    for (const bad of ['1.2', '01.2.3', '1.2.3.4', 'one', '1.2.3-'])
      expect(parseVersion(bad), bad).toBeNull();
  });

  it('orders versions as semver does', () => {
    const order = [
      '0.1.0',
      '0.2.0-alpha',
      '0.2.0-alpha.1',
      '0.2.0-alpha.beta',
      '0.2.0-beta.2',
      '0.2.0-beta.11',
      '0.2.0-rc.1',
      '0.2.0',
      '0.10.0',
      '1.0.0',
    ];
    for (let i = 1; i < order.length; i++)
      expect(compareVersions(order[i], order[i - 1]), order[i]).toBeGreaterThan(
        0,
      );
    expect(compareVersions('1.0.0', 'v1.0.0')).toBe(0);
  });

  it('labels a development build as such on the title screen', () => {
    expect(versionLabel('0.3.1', false)).toBe('v0.3.1');
    expect(versionLabel('0.3.1', true)).toBe('v0.3.1 (development build)');
  });

  it('shows the build in the title screen’s corner', () => {
    expect(buildLine('0.2.0', '3fe13af · 22 Oct 2026', false)).toBe(
      'v0.2.0 · build 3fe13af · 22 Oct 2026',
    );
    expect(buildLine('0.2.0', undefined, false)).toBe('v0.2.0');
    expect(buildLine('0.2.0', 'x', true)).toBe('v0.2.0 · development build');
  });
});
