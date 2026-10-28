# 104: Bump the version only when releasing

Status: planned 2026-10-28. Research: [versions bumped only by a release](../research/104-release-only-versioning.md). No build, CI or versioning code has been changed for this mission.

Read the root `AGENTS.md`, `README.md` ("Versions and releases") and the research note before implementation. Run the five project checks before committing; for this mission's own commits the new `npm run build` must already be the one that does not write.

## The request

The owner, 2026-10-28: "it looks like you are manually bumping the version number. This should actually be done by the build process when we successfully build prior to a release and committed to the project."

Today every successful `npm run build` advances the patch in `package.json` and `package-lock.json` (`scripts/build.ts`), every session runs it before committing and commits the bump with its work, and CI bumps again on every push to `main` with a `Build vX.Y.Z [skip ci]` commit. The version went from 0.1.0 to 0.1.710 in six days with no release between; half the recent commits carry a bump, parallel sessions conflict on the two package files, and a version number names neither a release nor a unique build. The version should move only when the owner asks for a release, by the build that prepares it, and that bump should be committed to the project with the release.

## Work plan

1. **Make the plain build pure.** `npm run build` builds at the version in `package.json` and writes no tracked file. Keep `build.ts`'s guard that refuses to save if the package files changed during the build, for the release path. Rewrite `scripts/build-version.test.ts` to pin it: a plain build, run twice, leaves both files byte-identical.
2. **Add one release command.** `npm run release` (patch by default; `-- minor`, `-- major` or `-- x.y.z`), in `scripts/release.ts` with its test. It refuses on a dirty tree, a branch other than `main`, a `main` behind or ahead of `origin/main`, or an empty Unreleased; runs typecheck, lint, format check and tests; bundles at the new version; and only after the bundle succeeds writes `package.json` and the lockfile, moves Unreleased in `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD` with a fresh Unreleased above, commits exactly those three files as `Release vX.Y.Z` and makes the annotated tag `vX.Y.Z`. A failure at any step leaves the tree and tags as they were. Remove the `release:patch|minor|major` scripts. Pushing follows the owner's answer below.
3. **Label builds between releases.** `vite.config.ts` and `src/game/version.ts` show how far a build is past its release and which commit it is (proposed: `v0.1.710+12 · build 1e0651c · 28 Oct 2026` from `git describe --tags --match 'v*'`; `v0.1.710+1e0651c` while no tag matches `package.json`); a release build shows its bare version. Keep the development-build and uncommitted-changes marks. Test `buildLine` and the label's parsing purely.
4. **CI.** In `ci.yml`, check out `github.sha`, build without writing, deploy that `dist` to Pages and itch.io with the full label as butler's `--userversion`, and remove the "Save the successful build version" step and the job's `contents: write`. Keep `release.yml`'s tag, version and changelog checks and its rebuild at the tag's version. Add a guard step that fails when `package.json`'s version changes in a commit that is not a `Release v…` commit.
5. **Rules and habits.** Rewrite README "Versions and releases", `AGENTS.md`'s two rules (the pre-commit checks and the versioning rule: plain builds never bump; releases only when the owner asks, with `npm run release`; never stage `package.json` or `package-lock.json` with ordinary work, only with a dependency change or a release; discard a leftover local bump), the doc comment in `src/game/version.ts`, and `doc/devlogs/README.md`'s note on build numbers (cite the build label). Add the change under Unreleased in `CHANGELOG.md`.
6. **Land and migrate.** Land in one commit at whatever version `main` then has, without bumping it. Check that a following push to `main` deploys with no `[skip ci]` commit, and that a session which has pulled no longer dirties the package files by building. Do not cut a release unless the owner asks.

## Acceptance criteria

- `npm run build`, locally and in CI, leaves `git status` clean; running it twice changes nothing.
- No commit after this mission's lands changes `package.json`'s version except a `Release vX.Y.Z` commit made by `npm run release`; CI fails if one does.
- `npm run release` with a failing check or bundle changes no file and makes no commit or tag; on success it makes exactly one commit (`package.json`, `package-lock.json`, `CHANGELOG.md`) and one annotated tag, and `release.yml` accepts that tag unchanged.
- A push to `main` deploys to Pages and itch.io with no bot commit; the title screen and the itch.io build name the release they follow and the commit they are; two pushes never share an itch.io `--userversion`.
- README, `AGENTS.md`, `version.ts` and the devlog workflow describe the new rule and nothing of the old.

## Likely code seams

`scripts/build.ts` and `scripts/build-version.test.ts`; a new `scripts/release.ts` with its test; `package.json` scripts; `vite.config.ts` (`VITE_VERSION`, `VITE_BUILD`, the commit and dirty flag); `src/game/version.ts` and its test; `src/manual/logic/manual.ts` (prints `VERSION`); `.github/workflows/ci.yml` and `release.yml`; `README.md`, `AGENTS.md`, `doc/devlogs/README.md`, `CHANGELOG.md`. No world save migration: `WORLD_VERSION` is separate.

## Questions for the owner

Ask one at a time.

1. Between releases, should the title screen and itch.io show the last release plus commits since and the commit (`v0.1.710+12 · build 1e0651c`), or something else, such as the next version marked as a development build? **Answered (the owner, 2026-10-28): the recommendation, last release plus commits since and the commit.**
2. Should `npm run release` push the commit and tag itself, or stop after tagging so you push them?
3. Should itch.io carry every push to `main` as now, or only releases (with Pages still following `main`)?
4. When you first release under the new rule, should it be the next patch (0.1.711), or a minor (0.2.0) since much has been added since 0.1.0?
5. Is patch the right default for `npm run release`, or should it always ask which level?
