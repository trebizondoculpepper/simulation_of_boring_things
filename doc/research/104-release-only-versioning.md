# 104 research: versions bumped only by a release

> **Superseded in part (2026-10-28):** the owner's decisions and Codex's review, recorded in [mission 104](../prompts/104-release-only-versioning.md), replace this note's proposals where they differ: a release bumps the minor (not the patch), a push to `main` gets a derived patch counted from the last version change (not `+N` labels), and only releases reach itch.io.

Checked 2026-10-28 against `1e0651ce` (package version 0.1.710). This is research and a proposal, not an implemented change: no build, CI or versioning code has been touched. [Mission 104](../prompts/104-release-only-versioning.md) turns it into work and acceptance criteria.

## The request

The owner, 2026-10-28: "it looks like you are manually bumping the version number. This should actually be done by the build process when we successfully build prior to a release and committed to the project."

## How versions are bumped today

`npm run build` is `npm run typecheck && node scripts/build.ts`. `scripts/build.ts` (`buildProject`) reads `package.json`, works out the next patch (0.1.710 → 0.1.711), runs `vp build` with `VITE_VERSION` set to it, and only if the bundler succeeds writes the new version into `package.json` and both root version fields of `package-lock.json`, refusing if either file changed during the build. `npm run build -- --release` skips the increment and the write, building at the version already in `package.json`. `scripts/build-version.test.ts` pins this behaviour (each success persists the next patch; a failure leaves both files alone; release keeps its version).

`vite.config.ts` defines `import.meta.env.VITE_VERSION` (the environment's value or `package.json`'s) and `VITE_BUILD` (the environment's, or locally `<short commit>[ (uncommitted changes)] · <date>`). `src/game/version.ts` turns them into the title screen's `buildLine()`, `v0.1.710 · build 1e0651c · 28 Oct 2026`, and the manual (`src/manual/logic/manual.ts`) prints `VERSION`.

Two parties bump:

- **Every agent session and every local build.** `AGENTS.md` (which `CLAUDE.md` links to) tells every session to run `npm run build` before committing, and says "local build updates go in the next normal commit". So almost every feature commit carries a one-step patch bump in `package.json` and `package-lock.json`.
- **CI on every push to `main`.** `.github/workflows/ci.yml` checks out the tip of `main` (not the pushed SHA), runs the checks and `npm run build`, which bumps again, then commits `Build vX.Y.Z [skip ci]`, `git pull --rebase`s and pushes it. The version it read is passed to itch.io as butler's `--userversion` and the same `dist` goes to GitHub Pages.

Releases are separate. `package.json` has `release:patch|minor|major` (`npm version … -m "Release v%s"`), which bump, commit and tag without building; README step 1 moves Unreleased in `CHANGELOG.md` by hand first. `.github/workflows/release.yml` runs on a `v*.*.*` tag, checks the tag against `package.json` and a `## [x.y.z]` changelog section, runs the checks, builds with `--release` and publishes a GitHub release. Only one release has ever been made: `v0.1.0` on 2026-10-22 (plus a stray non-release tag `retired0`).

## What it costs

- **Churn.** From 0.1.0 on 2026-10-22 to 0.1.710 on 2026-10-28: 710 patch numbers in six days, none of them a release. There are 250 `Build v… [skip ci]` commits (17 on the 24th, 27 on the 25th, 98 on the 26th, 84 on the 27th, 24 so far on the 28th). Since 2026-10-24, 203 commits touch only the two package files.
- **Feature commits mixed with bumps.** 149 of the 309 commits since 2026-10-27 touch `package.json`; most are feature commits whose diff carries a version hunk. Reverts and cherry-picks drag bumps with them, and `git log -- package.json` no longer shows dependency changes.
- **Conflicts and lost numbers.** Parallel sessions each bump from the same base, so their package files conflict on every rebase against each other and against CI's bump commits; sessions are told to take the remote's copy, which throws their bump away. Two sessions building from 0.1.704 both label their local builds 0.1.705; a version number does not identify a build.
- **Double counting.** A pushed commit is bumped once by the session that built it and again by CI, and a session that runs the checks twice bumps twice.
- **Versions that do not mean releases.** `CHANGELOG.md` has only `[Unreleased]` and `[0.1.0]`; README's level rules (PATCH: fixes only; MINOR: new features) are contradicted by automatic patches for every feature. Devlogs cite "build 0.1.356", a number that names a CI run, not a release.
- **Side effects in a check.** The pre-commit check list includes `npm run build`, so checking the tree changes it.
- **CI builds a moving target.** Because the `check` job checks out `main` rather than `github.sha` (so it can see earlier bump commits), a queued run can build and deploy a later commit than the one that triggered it, and its bump commit must race other pushes with `pull --rebase`.
- **The release scripts disagree with the owner's rule.** `npm version` writes `package.json` before anything is built, so a release can be tagged at a version that never bundled.

## Common practice, briefly

| Tool                                                                     | How it works                                                                                                              | Fit here                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm version` (built in)                                                 | Bumps `package.json` and the lockfile, commits and tags; `preversion`, `version` and `postversion` scripts run around it. | Close, but it writes the files before any `version` script can build, so a failed build leaves a dirty tree; the owner wants the write after a successful bundle. Useful as the model for flags (`patch`, `minor`, `major`, an exact version). |
| [Changesets](https://github.com/changesets/changesets)                   | Each change adds a small changeset file naming its bump; `changeset version` consumes them into versions and changelogs.  | Built for libraries and monorepos with many packages. It would duplicate the existing habit of writing under Unreleased in `CHANGELOG.md`, and every session would have to write one. Too much.                                                |
| [release-please](https://github.com/googleapis/release-please)           | A bot keeps a release pull request open, computed from Conventional Commits; merging it tags and releases.                | Needs Conventional Commit messages (this project's are prose) and a PR flow the project does not use. Too much.                                                                                                                                |
| [semantic-release](https://github.com/semantic-release/semantic-release) | Releases automatically on every qualifying push, from Conventional Commits.                                               | The opposite of "releases only when the owner asks". Rejected.                                                                                                                                                                                 |

The simplest fit is a small script of our own beside `scripts/build.ts`: the project already has one, its "write only after bundling succeeds" guard, its test, a hand-kept changelog and a release workflow that checks tag, version and changelog. Only the trigger is wrong.

## Proposal

1. **A plain build never writes.** `npm run build` (the pre-commit check and CI's check) builds at `package.json`'s version, which between releases is the last release's, and leaves every tracked file alone. Running it twice changes nothing.
2. **One release command does the bump.** `npm run release` (patch by default; `-- minor`, `-- major` or `-- 1.2.3` on request) refuses unless the tree is clean and `main` is up to date with `origin/main` and Unreleased has entries; runs typecheck, lint, format check and tests; works out the new version; bundles with it; and only after the bundle succeeds writes `package.json` and the lockfile, moves Unreleased under `## [x.y.z] - YYYY-MM-DD` with a fresh empty Unreleased above, commits `Release vX.Y.Z` (those three files only) and makes an annotated tag `vX.Y.Z`. Whether it also pushes (`git push --follow-tags`) is a question for the owner. The `release:patch|minor|major` scripts go; `--release` on `build.ts` is kept (or renamed) for the tag workflow's rebuild at the tag's exact version.
3. **Between releases the label names the commit.** `VITE_VERSION` stays the last release's version; the title screen and the itch.io build say how far past it they are, for example `v0.1.710+12 · build 1e0651c · 28 Oct 2026` (12 commits after the release tag, from `git describe --tags --match 'v*'`), and exactly `v0.1.711 · build 4b2c9d0 · 30 Oct 2026` at a release. Semantic versioning's build metadata (`+…`) carries no precedence, so it does not pretend to be a release. Until the first release under the new rule there is no `v0.1.710` tag; the label then falls back to `v0.1.710+1e0651c`.
4. **CI on a push to `main`:** check out `github.sha`, run the checks and the plain build, deploy that `dist` to Pages and itch.io (butler's `--userversion` becomes the full label, e.g. `0.1.710+12.1e0651c`, so each upload stays distinct), and commit nothing: drop the "Save the successful build version" step and its `contents: write`. **On a tag:** `release.yml` as now (tag equals `package.json`, a changelog section exists, checks, rebuild at the tag's version, GitHub release). Optionally the tag also pushes itch.io's build, if the owner wants itch.io to carry releases only (a question below).
5. **A guard.** A CI check that `package.json`'s version changes only in a commit whose message starts `Release v` (or equals the version of the most recent `v*` tag on `main`), so a stray local bump fails loudly instead of creeping back.

## Migration

- Change `scripts/build.ts`, add the release script, rewrite `scripts/build-version.test.ts` (plain build writes nothing; release writes after success only, refuses a dirty or behind tree, moves the changelog section; a failed bundle leaves everything as it was), and update `vite.config.ts` and `src/game/version.ts` for the new label, with tests for `buildLine`.
- Edit `.github/workflows/ci.yml` and, if chosen, `release.yml`.
- Rewrite README "Versions and releases", the two versioning rules in `AGENTS.md` (checks before committing; versions), the doc comment in `src/game/version.ts`, and the line in `doc/devlogs/README.md` about build-number commits (devlogs should cite the build label).
- Agents' habits, written into `AGENTS.md`: never stage `package.json` or `package-lock.json` with ordinary work; they change only with a dependency change or a release. A session with a leftover local bump discards it (`git checkout -- package.json package-lock.json`) before committing.
- Land it as one commit at whatever version `main` then has. After it, sessions that pull stop bumping; a session that has not pulled may push one last bump, which the guard (or the next rebase) catches. No world save migration: `WORLD_VERSION` is separate from the package version.
- The first release under the new rule is cut only when the owner asks; it turns the 700-odd entries under Unreleased into the first real release section since 0.1.0.
