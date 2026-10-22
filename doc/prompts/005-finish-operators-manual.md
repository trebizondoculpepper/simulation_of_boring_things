# 005: Finish the operator's manual

## Briefing

Every release of Pool Plant is to come with a downloadable PDF: the Operation and Maintenance (O&M) manual for the leisure centre's plant, written inside the game's fiction as the contractor who fitted out the pool plant would have handed it to the council, and generated entirely from the game's own model, so it is always true of the build it ships with. The plan is `doc/plans/operators-manual.md`; read it first, then `CLAUDE.md` (the project's rules) and `README.md`.

Phases 1 and 2 are built. Your job is to finish the manual: phases 3 to 6 of the plan. Work in the repository's own checkout on `main` (no worktrees), commit and push after each coherent piece of work, and stop to ask the owner where a decision is genuinely theirs, one question at a time.

## What exists

- `npm run manual` builds `build/manual/manual.pdf` (git-ignored). It runs `scripts/build-manual.test.ts` with `MANUAL=1`, which gathers the manual, writes `build/manual/manual.tex` and its figures, then runs `latexmk` with LuaLaTeX.
- `src/manual/logic/` is pure, tested logic:
  - `document.ts`: the manual as data (blocks: heading, para, list, steps, table, figure, warning; figure sources: DOT or SVG with the symbols they use).
  - `fiction.ts`: the contractor, project, contract and document numbers, the foreword, and the revisions table.
  - `manual.ts`: assembles the front matter, the introduction and the chapters.
  - `boiler-house.ts`: the pilot chapter. Copy its approach for every other room.
  - `schematic.ts`: draws any composite block (`game/sim/composite.ts`, which now keeps its wiring as `kind.composite`) as Graphviz DOT, with square (orthogonal) lines and symbols.
  - `symbols.ts`: schematic symbols as small SVGs (manual and solenoid valves, meter, gas detector bubble, emergency stop). Add more as rooms need them.
  - `room-plan.ts`: a room's equipment location plan as SVG, from its layout.
  - Tests in `manual.test.ts`.
- `src/manual/latex/render.ts`: the typesetter (escaping, cover, foreword, contents, list of drawings, chapters, title block in every footer).
- The build script draws DOT with `@viz-js/viz` (an approved dev dependency) and turns every SVG into a vector PDF with headless Chrome's print-to-PDF (`CHROME`, or Playwright's headless shell in its cache).
- Machines can name their maker in the game's world (`maker?: BrandId` on `PlantExhibit` in `src/toolkit/gallery/rooms/plant/exhibit.ts`); so far only the boiler house's exhibits do. `exhibitFor(kind)` in `src/toolkit/gallery/views/room-equipment.ts` looks a room's machine up by its key; the build passes it into the pure logic.
- The borough's details are in `src/toolkit/components/general-safety/logic/borough.ts`.

## The fiction (settled by the owner; do not change)

- Issued by **Bramhall Fenwick Engineering Ltd**, Building Services Engineers, established 1958, to **Ashworth Borough Council**, Leisure and Culture Services.
- The foreword is signed **Rowland Fenwick, CEng MIMechE, Engineering Director**. Never "Hugh Fenwick": a real British chartered engineer has that name.
- Penfold Controls built the control panels and mimics; every machine's maker is one of the game's brands (`src/toolkit/components/core/logic/brands.ts`). Never name a real product or company in the manual: the exhibits' `reference` strings ("After Grundfos ...") are for developers and must not appear in it.
- The plant dates from about 2000, so the first issue is dated March 2000. Each game release is a revision; Rev. A is planned to ship with v0.2.0 (`REVISIONS` in `fiction.ts`). A build of an unlisted version is marked as a draft.
- The tone is a real UK contractor's O&M manual (BSRIA BG 1/2007 structure): plain, exact, written for the duty engineers who will run the plant.

## What is left

### 1. Every plant room (phase 3)

Write a chapter for each remaining room in the same pattern as the boiler house: purpose (with the model's numbers), equipment location plan, equipment schedule (tag, item, maker, size, location), its settings, schematics, supplies (switchboard way from `SWITCHBOARD_FEEDS`, feeder isolator, lighting way from `lighting.ts`, utilities from `ROOM_SERVICES`), start and stop procedures, its gas detection if any (`game/plant/gas.ts`), its hazards and the signs at its door (`door-warnings.ts`, `building-signs.ts`).

- **The rooms:** the four pool plant rooms (`plant_pool_01` to `plant_pool_04`), the wet hall, the air handling plant, the switch room, the hypochlorite and acid stores, the loading bay and the control room. `layoutRoom(room)` in `src/toolkit/gallery/logic/room-equipment.ts` gives each one's equipment.
- **Makers:** add `maker` to every exhibit a room uses, taking it from the brand its view already draws (`brandLivery(kit, '...')` in its view). The test that every scheduled item has a maker must cover every room.
- **Sources** (the plan's table lists them all):
  - `pools.ts` and `plant-sizing/` for the pools;
  - `wet-hall.ts`;
  - `chemicals.ts`, with the tank levels and capacities;
  - `thermal.ts`;
  - `ozone.ts` (a composite: draw it);
  - `sampling.ts` and `electrical.ts` (composites);
  - `lighting.ts` (the lighting board's ways);
  - the main switchboard;
  - `ANNUNCIATOR_ALARMS` and `ALARM_TEXT` in `control-room-demo.ts`.
- **Hand-placed rooms:** `plant_pool_01` and `plant_pool_02` are laid out by hand (`FIXED`), so read what they actually place.
- **Schematics:** draw each composite with symbols, and add symbols to `symbols.ts` (pumps, filters, tanks, heat exchangers, UV, ozone generator, dosing pumps, fans, isolators). Where a drawing should show pipework rather than signals, as the gas house's should (street, ECV, meter, SSOV, boilers), the physical path is not yet in the model. Propose recording it in the model rather than typing it into the manual, and ask the owner before changing the model.

### 2. The book-wide sections

- **Description of the installation:** the pools and their design data; a system overview of how water, heat, air, power and chemicals move between rooms (`doc/plant-model.md`, `doc/planning/plant-interconnections.md`, `routes.ts`); the plant level plans (`plan-svg.ts`).
- **Operation:** the scenario simulator's FULL OFF, FULL ON and SLOW START (`startup.ts`, with `START_ORDER`); switching rooms at their feeders and isolators; the lighting board; the wet hall's booster reset; chemical deliveries; the gas alarms' ACCEPT, RESET and purge; the annunciator.
- **Alarm response:** every annunciator window, what raises it, the room it sends the operator to, and what to do there. A test must check that every window appears.
- **Maintenance:** short, and only what the game models; say plainly that it will grow.
- **Health and safety:** CDM residual risks, COSHH for the chemicals, confined spaces (the sectional tanks), permits to work, the gas, chlorine and ozone emergencies, electric shock, chemical spillage, hearing protection zones, and a register of the signs by room. Cross-check `doc/research/mandatory-safety-posters.md`.
- **Record drawings and appendices:** numbered drawings, the switchboard and lighting board schedules, the design data, a glossary and an index (`imakeidx`).

### 3. Photographs (phase 4)

- **A photo mode in the game:** a URL flag that waits until the room and its textures have loaded, draws a set number of frames, and then signals that it is ready, for example by setting a property on `window`. Headless Chromium's `--virtual-time-budget` draws too few frames to be trusted: it showed the rotunda's slideshow stuck on its first picture.
- **A fixed world state:** use a scenario so the pictures are the same each time (`?scenario=` in `src/main.ts`).
- **A shot list:** one per room and one per principal machine, with camera positions as `x`, `z`, `yaw` and `pitch` in degrees (yaw 0 faces −z).
- **Rendering on the GPU:** the M3's GPU needs `--use-angle=metal --ignore-gpu-blocklist --enable-gpu`; otherwise headless Chrome may fail to create a WebGL context.
- **Where the photographs come from:** at release time, from the published game (see below). Locally they may be rendered from the dev server.

### 4. Release automation (phase 5)

The owner decided that the game is published first and the manual made after. Extend `.github/workflows/release.yml`:

1. **The existing job:** it checks the tag against `package.json` and `CHANGELOG.md`, runs the checks and publishes the GitHub release.
2. **A second job that needs it:**
   - installs TeX Live (LuaLaTeX, latexmk, and the packages `render.ts` uses, including TeX Gyre fonts) and a headless Chromium;
   - takes the photographs from the published site (`https://trebizondoculpepper.github.io/simulation_of_boring_things/`) once it carries the tagged version;
   - builds the manual from the tagged source;
   - uploads the PDF to the same release (`gh release upload`).

   If it fails, the game is still out, and the job can be rerun.

3. **A start-screen link:** "Download the operator's manual", pointing at the release asset's stable latest-download address.

### 5. Polish (phase 6)

- **Checks on the LaTeX output:** fail the build on undefined references, and on overfull boxes beyond a small threshold.
- **Cross-references:** between chapters and drawings.
- **Drawing numbers:** in the contractor's style, for example BFE-ALC-M-201.
- **The release:** set Rev. A for the release the owner names (v0.2.0 is planned); add the CHANGELOG entry; ask the owner before cutting it.

## Rules

- `src/manual/logic/` stays pure (no DOM, no Three.js) and tested beside it with `vite-plus/test`; the build script is the only place that may load the 3D models, the file system or Chrome.
- Generate, don't type: every number, name, tag, size and maker comes from the model. Only the wording round them is written by hand. If the manual needs a fact the model lacks, add it to the model, asking the owner first if it changes the game.
- UK spelling and standards. Markdown is one paragraph per line.
- Before each commit, run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, and `npm run manual`. Read the PDF's pages to check the layout: tables must fit the page, and figures must be legible.
- Add each change under Unreleased in `CHANGELOG.md`. Record the session in `diary/`. Never commit `agent-mailbox.toml`, `agent-inbox.toml`, `.firecrawl/` or `build/`.
- Never cut a release without the owner asking.

## Report

When you finish, or stop to ask, report:

- what the manual now covers, with its page count;
- the new figures and symbols;
- any facts you had to add to the model;
- anything left undone and why.

Attach the PDF's path.
