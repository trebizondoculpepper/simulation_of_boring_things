# Plan: the operator's manual

Every release of the game comes with a downloadable PDF: the Operation and Maintenance (O&M) manual for the leisure centre's plant, as the contractor who fitted out the building would have handed it to Ashworth Borough Council at completion. It is written inside the fiction, but every fact in it is generated from the game's own model, so it is always true of the build it ships with: move a cabinet, add a valve or change a pump and the next manual shows it.

Progress (2026-10-22): phases 1 and 2 are built. `npm run manual` writes `build/manual/manual.pdf`: the cover, foreword, contents, an introduction and the boiler house pilot chapter, from `src/manual/` (the gathering logic in `logic/`, the typesetting in `latex/`) and `scripts/build-manual.test.ts` (the figures). Photographs and the release workflow are still to come. Decisions still open are listed at the end.

## Contents

- [The document in the fiction](#the-document-in-the-fiction)
- [What it contains](#what-it-contains)
- [Where each part comes from](#where-each-part-comes-from)
- [How it is built](#how-it-is-built)
- [Figures](#figures)
- [Releases](#releases)
- [Testing](#testing)
- [Phases](#phases)
- [Open decisions](#open-decisions)

## The document in the fiction

In the UK the contractor hands over an O&M manual at practical completion, and it becomes part of the building's Health and Safety File under the Construction (Design and Management) Regulations. BSRIA's guide BG 1/2007, _Handover, O&M Manuals and Project Feedback_, gives its usual structure, and the manual follows it so that it reads as the real thing.

- **Client:** Ashworth Borough Council, Leisure and Culture Services (the borough already named in the game's notices, `BOROUGH` in `safety-notices.ts`).
- **Issued by:** Bramhall Fenwick Engineering Ltd, Building Services Engineers, est. 1958: a fictional mechanical and electrical contractor who designed and fitted out the pool plant in the existing building's shell. Its logo and house style are still to be designed, and it joins `brands.ts` like every other maker. (No real firm of that name was found, 2026-10-22.)
- **Foreword:** the book opens with a foreword from Rowland Fenwick, CEng MIMechE, Engineering Director, thanking the council for choosing Bramhall Fenwick for its pool and hoping it gives many years of productive use. (Not Hugh Fenwick: a real British chartered engineer has that name.)
- **Subcontractors credited in it:** Penfold Controls for the control panels and mimics, and the makers already in `brands.ts` for each machine.
- **Dates:** the plant is of around 2000, so the manual's first issue is dated then. Each game release is a new revision of it, with a document control table on its second page listing the revisions; the amendment notes describe each release's changes in the fiction's terms (for example "Rev. F: chlorine gas detection added to the hypochlorite store"), written by hand at release time from the changelog.
- **Look:** a contractor's document of the time: A4 portrait, a cover with the project title, contract number and the client's and contractor's names, a title block on every page (document number, revision, page of pages), numbered sections and paragraphs, and drawings with their own title blocks and drawing numbers. Plain and dense, not decorative.

## What it contains

Sections in BSRIA's order, adapted to a pool plant:

1. **Foreword** from Rowland Fenwick, CEng MIMechE, Engineering Director (see above).
2. **Contract particulars:** client, contractor, subcontractors and suppliers (from `brands.ts`), the document control table, and how to use the manual.
3. **Description of the installation:** the complex and its pools (volumes, flows, temperatures, turnovers); the plant rooms and what each one does; a site plan; a system overview schematic of how water, heat, air, power and chemicals move between rooms.
4. **Room by room**, one chapter per plant room (each pool's plant room, the wet hall, the boiler house, the air handling plant, the switch room, the hypochlorite and acid stores, the loading bay, the control room). Each chapter has:
   - its purpose, location, doors and access;
   - an equipment location plan with every item's tag;
   - a photograph of the room and of each principal machine;
   - its schematics (for example the boiler house's gas train and heating circuit);
   - an equipment schedule: tag, description, maker, model reference, size and rating;
   - its supplies (which switchboard way and feeder isolator feed it, its lighting zone) and its gas detection, if any;
   - its hazards and the signs at its door.
5. **Operation:** normal running and the controls, including the scenario simulator's FULL OFF, FULL ON and SLOW START, with the start order; switching each room on and off at its feeder and isolators; the lighting board; resetting the wet hall's booster set; chemical deliveries; the gas alarms (ACCEPT, RESET, purge); and the annunciator.
6. **Alarm response:** every annunciator window, what raises it, the room to go to, and what to do there.
7. **Maintenance:** what each machine needs and how often. The game models little maintenance yet, so this section starts short and grows with the game.
8. **Health and safety:** residual risks under CDM, the COSHH data for the chemicals, confined spaces, permits to work, the gas emergency, chlorine and ozone releases, electric shock and chemical spillage procedures, hearing protection zones, and the register of signs by room.
9. **Record drawings:** the plant level plans, the full schematics and the electrical single-line diagram, as numbered drawings.
10. **Appendices:** the switchboard schedule, the lighting board's ways and zones, the design data (sizing totals, thermal design temperatures, ambient), a glossary and an index.

## Where each part comes from

| Part of the manual            | Source in the game                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pools and their design data   | `src/game/plant/pools.ts` (`POOL_TARGET`, `HALL_AIR`), `src/game/plant-sizing/`, `doc/plans/plant-sizing.md`                                                       |
| Plant rooms, doors and sizes  | `src/game/plant/services.ts` (`ROOM_SERVICES`), the shell rooms' plan, `src/toolkit/gallery/logic/room-equipment.ts`                                               |
| Equipment, positions and tags | `layoutRoom` in `room-equipment.ts`; each model's exhibit (`title`, `reference`, `size`) in `src/toolkit/gallery/rooms/plant/`                                     |
| Makers                        | `src/toolkit/components/core/logic/brands.ts`                                                                                                                      |
| Schematics                    | the plant model's blocks and their connections (`doc/plant-model.md`, `src/game/sim/`), the pipe and cable routes (`src/game/plant/routes.ts`), `machine-ports.ts` |
| Plans                         | `src/game/plant/plan-svg.ts` and the placements in `src/game/plant/placement.ts`                                                                                   |
| Power and lighting            | the switchboard's ways (`switch-room.ts`), feeder isolators, `src/game/plant/lighting.ts`                                                                          |
| Start and stop procedures     | `src/game/plant/startup.ts` (`START_ORDER`, FULL OFF, FULL ON, SLOW START)                                                                                         |
| Wet hall                      | `src/game/plant/wet-hall.ts` (`WET_HALL_PLANT`)                                                                                                                    |
| Chemicals                     | `src/game/plant/chemicals.ts` (stores, capacities, dose rates)                                                                                                     |
| Gas detection                 | `src/game/plant/gas.ts` and `general-safety/logic/gas-detection.ts` (zones, gases, alarm levels, extract rates)                                                    |
| Alarms                        | `ANNUNCIATOR_ALARMS` and `ALARM_TEXT` in `control-room-demo.ts`                                                                                                    |
| Thermal design                | `src/game/plant/thermal.ts`                                                                                                                                        |
| Signs and notices             | `building-signs.ts`, `door-warnings.ts`, `doc/research/mandatory-safety-posters.md`                                                                                |

Text that cannot be derived (the descriptions of what a room is for, the procedures' wording, the safety advice) is written once, as templates beside the generator, and filled in with the model's numbers and names. Nothing descriptive about a specific machine is typed by hand where the model already says it.

## How it is built

- **A generator in TypeScript** under `src/manual/`, run by a new script, `npm run manual`. It is split like the rest of the code: `src/manual/logic/` gathers the model into one plain description of the manual (rooms, equipment, schematics, procedures), pure and tested; `src/manual/latex/` turns that description into LaTeX source, the DOT graphs and the figure list.
- **Output** goes to `build/manual/` (ignored by git): the `.tex` files, the figures, and finally `operators-manual.pdf`.
- **Typesetting** by LuaLaTeX through `latexmk`, both already installed locally. The packages are standard TeX Live ones: `geometry`, `fancyhdr`, `titlesec`, `booktabs` and `longtable`, `graphicx`, `hyperref`, `imakeidx`, with TeX Gyre Heros as the period-appropriate Helvetica-like face.
- **Escaping:** the generator escapes LaTeX's special characters in every string from the model, so names such as "Cl₂" or "33 % acid" are safe.

## Figures

- **Schematics (Graphviz):** each system becomes a DOT graph from the model's blocks and connections, each node labelled with its tag and description and each edge with what it carries (water, gas, heat, power, chemical) in the colours the pipes use in the game. They are rendered by `@viz-js/viz` (Graphviz compiled to WebAssembly), a dev dependency the owner approved on 2026-10-22, pinned in `package-lock.json` so every machine and CI draw the same diagrams with nothing else to install. It writes SVG, converted to PDF with the plans.
- **Plans:** the existing SVG plans (`plan-svg.ts`) and new per-room equipment plans drawn from `layoutRoom`, drawn as SVG. Every SVG figure, plans and schematics alike, is turned into a vector PDF for LaTeX by headless Chrome's print-to-PDF, the same browser that takes the photographs, so nothing more is installed (the owner's decision, 2026-10-22).
- **Photographs:** rendered from the published game (see [Releases](#releases)) by a headless browser from a list of fixed camera positions (a shot list per room and per principal machine). Two problems from the work so far must be solved first: headless Chromium's virtual time draws very few frames, and textures load late. The fix is a photo mode in the game (a URL flag) that waits until the room and its textures have loaded, draws a set number of frames, and then signals that it is ready, so the capture is taken at the right moment rather than by a time budget. The world's state for the photos is fixed by a scenario (everything on and clear), so the pictures are the same each time.

## Releases

The repository has no releases yet; this plan introduces them.

- **A release** is a git tag, `vMAJOR.MINOR.PATCH`, on `main`.
- **The game is published first, then the manual is made** (the owner's decision, 2026-10-22). The release workflow, `.github/workflows/release.yml`, runs on such a tag in two stages:
  1. **Publish the game:** check and build it as CI does, deploy it, and create the GitHub Release (later with the desktop builds from `doc/research/steam-and-desktop-release.md`). Nothing about the manual can hold the game back.
  2. **Make the manual,** once the game is live: install TeX Live (LuaLaTeX), take the photographs from the published build itself (the very game the players have), gather the model from the tagged source, build the PDF and attach it to the same GitHub Release. If this stage fails, the game is already out and the manual can be rebuilt by rerunning the stage.
- **Where players find it:** the release's PDF on GitHub, linked from the game's start screen ("Download the operator's manual") by the release's stable download address, so the site needs no rebuild once the manual is ready. Later it could also be found inside the game, on the shelf in the engineer's office.
- **The manual's revision** is the release's version, shown in its document control table alongside the fiction's revision letter.

Building TeX Live and rendering photographs in CI is slow, so the manual is made only for releases (and on demand with `workflow_dispatch`, against the game as published), not on every push.

## Testing

- **Unit tests** on the gathering logic, beside it (`*.test.ts`): every equipped room has a chapter; every placed machine appears in its room's schedule with a maker; every schematic edge is one of the model's connections, and no connection is left out; every annunciator window appears in the alarm table; every lighting zone and switchboard way appears in its schedule.
- **Escaping tests** for the LaTeX output.
- **A build check:** the release workflow fails if LaTeX reports undefined references or overfull boxes past a threshold, so a broken manual never ships.

## Phases

1. **Decisions and skeleton:** settle the open decisions; the generator's structure; the cover, document control, title blocks and one empty chapter, building to a PDF.
2. **Pilot chapter: the boiler house.** Description, the gas train and heating circuit schematics, its equipment plan and schedule, supplies, gas emergency procedure and hearing protection. Review the look and the fiction on this one chapter before going further.
3. **Every plant room**, and the description, operation, alarm and safety sections.
4. **Photographs:** the game's photo mode and the shot list.
5. **Release automation:** the release workflow (the game published, then the manual made and attached), and the link on the start screen.
6. **Polish:** index, glossary, cross-references between chapters and drawings, and the first tagged release.

## Open decisions

- The version scheme and when the first release is cut.
