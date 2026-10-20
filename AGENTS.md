# Pool Plant project guidance

`CLAUDE.md` is a symlink to this file. Read `README.md` and the owner's project brief (`/Users/salimfadhley/Downloads/Pool-Plant-Project-Brief.md`) before implementation.

## Rules

- Every room is, for now, a blank shell with a title card on one wall. Do not add equipment, pools or scenery until the owner asks.
- The building is one contiguous world in metres (one scene unit is one metre); rooms are rectangles in `src/game/facility-plan.ts` joined by doorways in shared walls. No portals.
- The adjacent `/Users/salimfadhley/workspace/encabulator` repository is a source of reusable components. Leave it unchanged. Record every copied file, and any adaptation, in `doc/reuse-inventory.md` before or as it is copied.
- Anything to do with engineering and maintenance is a real, working component, modelled after a real product: it has state, can be driven, and shows what it is doing (gauges read values, switches switch, lamps light, recorders record). No static props for engineering items; only pure set decoration (plants, furniture) may be static.
- Model new equipment in the development rooms before it goes into the leisure centre, and try any new kind of control or display on dev0's boards first.
- Control systems are about 25 years obsolete (around 2000): many single-purpose instruments (analogue gauges, moving-coil meters, LED and LCD readouts, chart recorders, annunciators, mimic panels, a few CRTs) rather than one screen showing everything. Computers, where there are any, are obsolete or special-purpose. The control room is where problems are diagnosed; putting them right often means going to the room concerned.
- All input goes through the one control scheme in `src/toolkit/controls/` (copied from the Encabulator). Rooms do not bind their own keys or gestures.
- `src/game/` and every `logic/` folder are pure logic with no DOM or Three.js, tested beside them (`*.test.ts`, importing from `vite-plus/test`).
- Before committing, run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. CI runs the same and, on a push to `main`, deploys to GitHub Pages. Vite's `base: './'` keeps asset paths relative; keep links relative too.
- Markdown is one paragraph per line, never hard-wrapped.
- Record significant sessions in `diary/`.
- Never commit `agent-mailbox.toml` or `agent-inbox.toml`.
- Ask the owner one question at a time.
