import { describe, expect, it } from 'vite-plus/test';
import { reportingEnvironment, roomOf, shouldReport } from './error-reporting';

describe('error reporting', () => {
  it('reports from every run but the dev panel and an automated browser', () => {
    expect(shouldReport({ search: '', automated: false })).toBe(true);
    expect(shouldReport({ search: '?room=museum1', automated: false })).toBe(
      true,
    );
    expect(shouldReport({ search: '?dev', automated: false })).toBe(false);
    expect(shouldReport({ search: '', automated: true })).toBe(false);
  });

  it('tells the releases on itch.io from Pages, the dev server and local builds', () => {
    expect(reportingEnvironment('html-classic.itch.zone')).toBe('prod');
    expect(reportingEnvironment('trebizondoculpepper.github.io')).toBe(
      'pre-release',
    );
    expect(reportingEnvironment('127.0.0.1:5175', false)).toBe('dev');
    expect(reportingEnvironment('localhost:4173')).toBe('dev');
    expect(reportingEnvironment('example.com')).toBe('dev');
    // The dev server is dev wherever it is served.
    expect(reportingEnvironment('x.github.io', false)).toBe('dev');
  });

  it('names the room a report came from', () => {
    expect(roomOf('?room=museum7&x=1')).toBe('museum7');
    expect(roomOf('')).toBe('title');
  });
});
