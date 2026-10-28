import { describe, expect, it } from 'vite-plus/test';
import { versionChangeProblem } from './version-guard';

describe('the version guard (mission 104)', () => {
  const release = {
    subject: 'Release v0.2.0',
    before: '0.1.741',
    after: '0.2.0',
    lock: '0.2.0',
    lockRoot: '0.2.0',
  };
  it('lets a release change the version, and anything leave it alone', () => {
    expect(versionChangeProblem(release)).toBeNull();
    expect(
      versionChangeProblem({ ...release, subject: 'Fix', before: '0.2.0' }),
    ).toBeNull();
  });
  it('fails a build bump, a mislabelled release, or a lockfile left behind', () => {
    expect(
      versionChangeProblem({ ...release, subject: 'Build v0.2.0 [skip ci]' }),
    ).toMatch(/not "Release v0.2.0"/);
    expect(
      versionChangeProblem({ ...release, subject: 'Release v0.3.0' }),
    ).toMatch(/not "Release v0.2.0"/);
    expect(versionChangeProblem({ ...release, lockRoot: '0.1.741' })).toMatch(
      /lockfile/,
    );
  });
});
