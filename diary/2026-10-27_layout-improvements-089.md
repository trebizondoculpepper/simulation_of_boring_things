# Development Diary Entry - 2026-10-27

## Context

| Time          | Branch | Commit        | Task                                                                                    |
| ------------- | ------ | ------------- | --------------------------------------------------------------------------------------- |
| afternoon UTC | main   | eb4c71e       | 089 item 1: the footbath's hypochlorite bottle into its south-west corner               |
| afternoon UTC | main   | e85ded5       | 089 item 6: the switch room's generator point removed; the I · 0 · II changeover switch |
| afternoon UTC | main   | 70a6600       | 089 item 5: the switch room's fire point, matting and working-space markings            |
| afternoon UTC | main   | d2c892f       | 089 item 4: the lounge's injection points, the Olympic's way, through quills            |
| afternoon UTC | main   | 10c8716       | 089 item 3: hazard-stripe markings round every bunded tank                              |
| evening UTC   | main   | (this commit) | 089 item 2: the dosing pumps rebuilt to the peristaltic pump's standard                 |

## Problem Statement

Mission 089 collected six of the owner's requests from the day, each with its feasibility checked and the owner's answers recorded: move the footbath's hypochlorite bottle into a corner; rebuild the dosing set's pumps to the peristaltic pump's standard and show them in dev44; floor markings round the bunded tanks; correct where the lounge injects its chemicals; fire safety and floor markings in the switch room; and replace the switch room's duplicate generator point with a mains/generator changeover switch. Another agent was working on mission 090 (doors) in the same checkout, so every commit staged its own files by name.

## Our Approach

The items went in the order the coordinator set (1, 6, 5, 4, 3, 2), each committed and pushed once it passed the checks. The project's rules shaped each: model first (the changeover switch and the lounge's quills went into their rooms' schematics before anything was drawn), pure logic in `logic/` folders with tests beside it, set decoration drawn from placements rather than by hand (the fire point became a layout item, the bund markings and the switch room's floor follow what they mark), and engineering items working (the changeover's handle, its lamps, the quills' ball valves and the pumps' keys).

## Implementation

- Item 1: one `CHEM_AT` entry; the plumbing followed.
- Item 6: `src/game/plant/changeover.ts` (positions, a turn at a time through 0, the switchboard's source), `plant.changeover` in the world (`WORLD_VERSION` 46), `serviceAvailable`, DB-L1, the metered load and the halls' power all following the switchboard; the schematic's `changeover` node between the main switch and the switchboard with the bay's generator cable (a boundary) on its II side; the view `changeover-switch.ts` with its handle and lamps; the electrical gallery's exhibit.
- Item 5: `logic/fire-point.ts` and `views/fire-point.ts` (a walkable floor item whose footprint is the kept-clear floor), placed in the switch room and in the wet hall in place of its hand-drawn copy; `logic/switch-room-floor.ts` for the working spaces and the matting.
- Item 4: quill nodes, injection links, and isolating and non-return fittings in `lounge-schematic.ts`; the runs and `roomInjections` in `room-pipes.ts`; `injection-quill.ts` for the drawn set; the world gating the lounge's dosing on each quill's valve.
- Item 3: `logic/bund-marking.ts` (stripes that come in, are cut, or give way; a stencil slid off the walls) and `views/bund-marking.ts`; a trial exhibit in dev44.
- Item 2: `logic/diaphragm-pump.ts` and `views/diaphragm-pump.ts`, two sounds, the boards rebuilt round them with their tubes and ports unchanged, and four dev44 exhibits.

## Outcomes

- Every item passed typecheck, lint, format, the full test suite and the build before its commit, and was looked at in the browser; screenshots were saved for the owner.
- The URL's position is in each room's own frame, but its height is the world's: the plant rooms' floors are 3.5 m down (`PLANT_ROOM.storey`), so a camera at y 1.6 there floats near the ceiling. A noclip click does not work a part; a still click in walking mode does.
- Lit lamps go dark with their room's power (`room-power.ts`): a lamp fed from elsewhere (the changeover's MAINS AVAILABLE) needs `userData.ownPower`.
- The registration test failed for a while on another session's untracked files; it is not ours and cleared when they committed.
- Another session reworked the changeover switch's legends to Dymo tape and its handle while this work went on.

## Next Steps

- A hired generator at the loading bay, so II gives power (TODO).
- The Olympic's quills drawn, as the lounge's (TODO).
- The dosing pumps' keys in the world, and their WARN and ERROR lamps given a fault model (TODO).
- The changeover's padlock is not modelled.
