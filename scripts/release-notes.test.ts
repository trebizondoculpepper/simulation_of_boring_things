import { describe, expect, it } from 'vite-plus/test';
import {
  entriesOf,
  headlineOf,
  releaseNotes,
  sectionOf,
} from './release-notes';

const CHANGELOG = `# Changelog

## [Unreleased]

- Hall 4 has a dosing console (the owner, 2026-10-31): glossy buttons and a
  closeness bar.
- Hall 4's challenge cards no longer win by waiting (the owner's bug report, 2026-10-31): one dose won.
- Tank labels show each pictogram's number beneath it (2026-10-31).

## [0.2.0] - 2026-10-29

### Added

- A lift for the museum. It goes up.

### Fixed

- Pipe tees reach their ports: they were short.

## [0.1.0] - 2026-10-22

- First.

[Unreleased]: https://example.com/r/compare/v0.2.0...HEAD
[0.2.0]: https://example.com/r/compare/v0.1.0...v0.2.0
`;

describe('release notes', () => {
  it('extracts a section, stopping at the next section or the links', () => {
    expect(sectionOf(CHANGELOG, '0.2.0')).toContain('A lift');
    expect(sectionOf(CHANGELOG, '0.2.0')).not.toContain('First');
    expect(sectionOf(CHANGELOG, '0.1.0')).not.toContain('example.com');
    expect(sectionOf(CHANGELOG, '9.9.9')).toBeUndefined();
  });

  it('cuts an entry to its headline', () => {
    expect(
      headlineOf('A lift for goods (the owner, 2026-10-30): it goes up.'),
    ).toBe('A lift for goods');
    expect(headlineOf('Museum, Hall 4: the tanks are round. More.')).toBe(
      'Museum, Hall 4: the tanks are round',
    );
    expect(headlineOf('A card, "Incident: The Floater" (2026-10-31): x')).toBe(
      'A card, "Incident: The Floater"',
    );
    expect(headlineOf('Labels show numbers (2026-10-31).')).toBe(
      'Labels show numbers',
    );
    expect(headlineOf('Uses `a.b` (see: there) then. More')).toBe(
      'Uses `a.b` (see: there) then',
    );
  });

  it('sorts unheaded entries by their words, headed ones by heading', () => {
    expect(entriesOf(sectionOf(CHANGELOG, 'Unreleased')!)).toEqual([
      { kind: 'feature', headline: 'Hall 4 has a dosing console' },
      {
        kind: 'fix',
        headline: "Hall 4's challenge cards no longer win by waiting",
      },
      {
        kind: 'feature',
        headline: "Tank labels show each pictogram's number beneath it",
      },
    ]);
    expect(entriesOf(sectionOf(CHANGELOG, '0.2.0')!)).toEqual([
      { kind: 'feature', headline: 'A lift for the museum' },
      { kind: 'fix', headline: 'Pipe tees reach their ports' },
    ]);
  });

  it('renders both headings, saying so when one is empty', () => {
    const notes = releaseNotes(CHANGELOG, '0.1.0', 'https://x/CHANGELOG.md');
    expect(notes).toBe(
      '## Major features\n\n- First\n\n## Minor fixes\n\n- None in this release.\n\nThe full notes are in [CHANGELOG.md](https://x/CHANGELOG.md).\n',
    );
    expect(() => releaseNotes(CHANGELOG, '9.9.9')).toThrow(/no section/);
  });
});
