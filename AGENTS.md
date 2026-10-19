# Pool Plant project guidance

`CLAUDE.md` is a symlink to this file. Read `README.md` and the owner's project brief (`/Users/salimfadhley/Downloads/Pool-Plant-Project-Brief.md`) before implementation.

## Rules

- Every room is, for now, a blank shell with a title card on one wall. Do not add equipment, pools or scenery until the owner asks.
- The building is one contiguous world in metres (one scene unit is one metre); rooms are rectangles in `src/game/facility-plan.ts` joined by doorways in shared walls. No portals.
- The adjacent `/Users/salimfadhley/workspace/encabulator` repository is a source of reusable components. Leave it unchanged. Record every copied file, and any adaptation, in `doc/reuse-inventory.md` before or as it is copied.
- All input goes through the one control scheme in `src/toolkit/controls/` (copied from the Encabulator). Rooms do not bind their own keys or gestures.
- `src/game/` and every `logic/` folder are pure logic with no DOM or Three.js, tested beside them (`*.test.ts`, importing from `vite-plus/test`).
- Before committing, run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. CI runs the same and, on a push to `main`, deploys to GitHub Pages. Vite's `base: './'` keeps asset paths relative; keep links relative too.
- Markdown is one paragraph per line, never hard-wrapped.
- Record significant sessions in `diary/`.
- Never commit `agent-mailbox.toml` or `agent-inbox.toml`.
- Ask the owner one question at a time.
