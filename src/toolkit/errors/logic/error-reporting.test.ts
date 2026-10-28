import { describe, expect, it } from 'vite-plus/test';
import { reportingEnvironment, roomOf, shouldReport } from './error-reporting';

describe('error reporting', () => {
  it('reports from the published builds only', () => {
    const page = { production: true, search: '' };
    expect(
      shouldReport({ ...page, host: 'trebizondoculpepper.github.io' }),
    ).toBe(true);
    expect(shouldReport({ ...page, host: 'html-classic.itch.zone' })).toBe(
      true,
    );
    expect(shouldReport({ ...page, host: '127.0.0.1:5175' })).toBe(false);
    expect(shouldReport({ ...page, host: 'localhost:4173' })).toBe(false);
  });

  it('never from a development build or the dev panel', () => {
    const host = 'trebizondoculpepper.github.io';
    expect(shouldReport({ production: false, host, search: '' })).toBe(false);
    expect(shouldReport({ production: true, host, search: '?dev' })).toBe(
      false,
    );
  });

  it('names where a report came from, and its room', () => {
    expect(reportingEnvironment('x.github.io')).toBe('pages');
    expect(reportingEnvironment('html-classic.itch.zone')).toBe('itch');
    expect(reportingEnvironment('example.com')).toBeNull();
    expect(roomOf('?room=museum7&x=1')).toBe('museum7');
    expect(roomOf('')).toBe('title');
  });
});
