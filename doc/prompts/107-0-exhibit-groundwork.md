# 107-0: PLANTROOMS groundwork: the halls re-signed to the new order, and what every exhibit plugs into

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`). It comes before the five hall sub-prompts, 107a to 107e, because each of them needs what it builds. It is numbered `107-0` (for Hall 0 and the building) so it cannot clash with the halls' letters.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it. Then read mission 107 in full, mission 106 (`doc/prompts/106-ideal-pool-plant.md`, dev51, the pattern every exhibit follows), `doc/plant-model.md` and `doc/room-layout-guide.md`.

## The owner's request

The owner, 2026-10-28: "Plan what will be each of the halls … loosely based on the plans described before. And I want a prompt with a sub-index letter, like A B C, for each of the halls. Each needs to build on the understanding of the previous one. I think warmth could be the first one, so we feature a real gas boiler and a heat exchanger connected to an ideal pool. And then we carry on from there. All of the basic systems, warmth, filtration, and then we do chemical dosing. I think maybe we could have an exhibit about the chemistry of pools where we have a set of ideal tanks, a dosing station with buttons where you can add chemicals to the dosing system, and then a readout in the simulated swimming pool of what chemistry your choices produced. And like all the other exhibits, you can reset it at the end."

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Not every hall needs a clock: halls may show time in different ways, such as a pool clock, a chart recorder's paper, a day-and-night skylight, a log sheet, or a digital readout. Each hall's sub-prompt says which it uses.
3. **Halls start empty.** Each exhibit space begins with set decoration only (the shell, signage, the safety layer). The exhibit itself is built later, by its sub-prompt.

## The new layout (the owner, 2026-10-28)

The owner has changed the museum's plan: the building is oblong, four rooms east–west and five rooms north–south, and the rooms form a ring of 14 round a courtyard two rooms wide and three deep, every room its own hall, the corners counted once. Hall 0, the welcome, is in the south-west corner, with a doorway north into Hall 1 and a doorway east from the last hall, Hall 13. The visit runs north up the west side (Halls 1 to 4, Hall 4 at the north-west corner), east along the north (Halls 5 to 7, Hall 7 at the north-east corner), south down the east side (Halls 8 to 11, Hall 11 at the south-east corner) and west along the south (Halls 12 and 13), back into Hall 0. Arrows painted on Hall 0's floor show where to start: north, into Hall 1. That gives 13 exhibit halls. **The finale is Hall 13** (the owner, 2026-10-28: "the whole plant" is definitely the finale, the last room before Hall 0): a working model of an entire, fully working swimming pool, all of its major components put together, its closing wall carrying the owner's message, the echo of Hall 0's welcome: "Now you've seen it, now you understand how a swimming pool works, you probably won't take it for granted anymore, will you?" Its sub-prompt keeps its letter, 107e. Halls 1 to 4 are planned (107a to 107d); the eight halls between, 5 to 12, wait for the owner's themes.

**The shell is not rebuilt here.** Rebuilding it to the ring of 14 (`museum-plan.ts`, `museum-hall.ts`, `museum-hall-room.ts`, rooms `museum6` to `museum13`, the finale in Hall 13, Hall 0 moved into the ring with its floor arrows) is a later stage of mission 107, planned there. This sub-prompt's work is written so it holds in either shell: halls are found by their number, never by today's coordinates or sizes, and every size quoted from today's shell is marked so.

## The new order

The owner has reordered the halls. Circulation is no longer a hall of its own: Hall 1 introduces it at its simplest, because heating a pool needs its water moved, and Hall 2 (dev51) takes it further with the overflow, the balance tank and the filter.

| Hall    | Room                                                                   | Title, as signed       | Subject                               | Sub-prompt                                  |
| ------- | ---------------------------------------------------------------------- | ---------------------- | ------------------------------------- | ------------------------------------------- |
| 0       | `museum0`                                                              | Welcome                | Behind the tiles                      | this one (re-signing only)                  |
| 1       | `museum1`                                                              | Warm water             | Heating, energy and a first pump      | [107a](107a-warm-water-heating.md)          |
| 2       | `museum2`                                                              | Clean water            | Filtration and backwash (dev51)       | [107b](107b-clean-water-filtration.md)      |
| 3       | `museum3`                                                              | Safe water             | Automatic disinfection                | [107c](107c-safe-water-automatic-dosing.md) |
| 4       | `museum4`                                                              | The chemistry of pools | A hands-on chemistry lab              | [107d](107d-chemistry-lab.md)               |
| 5 to 12 | `museum5` to `museum12` (`museum6` on with the new shell)              | to come                | themes to be suggested by the owner   | none yet                                    |
| 13      | `museum13` (with the new shell; tried in today's `museum5` until then) | The whole plant        | Control and fault finding, the finale | [107e](107e-the-whole-plant.md)             |

## What this sub-prompt does

1. **Re-sign the halls to the new order.** In `src/toolkit/gallery/logic/museum-plan.ts`, `HALL_BRIEFS`: each hall's title, subject, what it will show, its big idea and its "Try it" lines, from the table above and the sub-prompts' panel outlines. The words flow through to the archway headers ("NEXT EXHIBIT · 2 · Clean water"), the street-wall vinyl, Hall 0's welcome panel route, the "coming soon" panels and `hallName` in `DEV_ROOM_NAMES`. Halls 5 to 12 are signed "Exhibit coming soon" with no theme (today's `museum5` included, until the finale is tried there), and Hall 13, once the new shell has it, "The whole plant". In today's shell, Museum 5's way on leads back into Museum 1: its header there says "BACK TO THE START · Warm water" until the new shell replaces it. Update `museum-plan.test.ts` where it pins titles. No hall gets exhibits here (rule 3).
2. **The exhibit hook.** Today `src/toolkit/gallery/rooms/museum-hall-room.ts` passes `use: () => {}` to the walker: a museum hall cannot be touched. Give it what `src/toolkit/gallery/rooms/plant-room.ts` gives the equipment rooms, so that a hall's exhibit is a module plugged into its hall:
   - an `exhibit` per hall (a module like `src/toolkit/gallery/rooms/plant/exhibit.ts`'s `LiveExhibit`: `object`, `parts`, `update(delta)`, `solids`, `dispose`), loaded lazily, `undefined` for a hall still empty;
   - the raycast and `parts.uses` dispatch for buttons, levers and knobs (all input through `src/toolkit/controls/`, as CLAUDE.md requires);
   - the inspection overlay, saying only what each thing's own display, lamp or position shows (no peeking);
   - the exhibit's solids added to the hall's walking solids.
3. **Reset on entry (rule 1).** On every hand-over into a hall (`handOver` in `src/main.ts`) and on a direct load (`openRoom`), the hall's exhibit is built fresh: `prepare(now)` with the visitor's real local time, as dev51's `prepareRoom` does (`src/toolkit/gallery/rooms/plant/ideal-pool-plant.ts`: `let state = newIdealPlant(localNow())`). Entering is the same code path as RESET SIMULATION. A neighbour seen through an archway is drawn in its reset state and is not stepped: stepping starts when the visitor crosses in. Test it in logic: a pure `hallSession(id, now)` that starts at the reset state with the clock at `now`, and gives the same state after "walk out, walk back in" as after RESET.
4. **Hall time (rule 2).** One pure, tested clock for every hall (`src/toolkit/gallery/logic/museum-time.ts`): starts at the visitor's local time, speeds ×1, ×60, ×600, ×3600 (dev51's `TimeSpeed` and `SPEEDS` in `src/game/plant/ideal-pool-plant.ts`, moved or re-exported so dev51 and the halls share one), stepped in slices no longer than half a second of plant time, as dev51 does; set back to now by RESET and on entry. Each hall chooses how it shows the time (the pool clock `src/toolkit/components/architectural/views/pool-clock.ts`, a chart recorder, a log sheet or a readout) and its speed buttons; this clock only keeps it.
5. **The shared museum fittings.** `src/toolkit/gallery/views/museum-exhibit.ts` already has `createLectern`, `createWallPanel`, `createResetPedestal`, `paintResetSign`, `paintEntrance`, `paintActivity` and `createPumpStation`. Add, if the halls need them in common: a hall's entrance panel in the museum style (headline, big idea, memorable fact, "Try it" steps) drawn from data (`museum-plan.ts` or each hall's placards module), and the PUSH and TURN tags. Every hall's RESET SIMULATION pedestal carries the sign: "Don't worry, you can't break anything! This is a simulation. If you get the plant into a muddle, press this button and everything goes back to the start."
6. **Room codes for tags.** Each hall's schematic has its room code, `M1` to `M4` and `M13` (the halls' numbers, not the shell's room ids), so tags derive as `M1-B1`, `M1-B1-V1`, `M3-FT1` (the enhanced network rule: tags are derived, never written).

## Acceptance

- The halls are signed in the new order everywhere a hall's name appears (archways both sides, street walls, Hall 0's route, coming-soon panels, the dev panel), and the logic test agrees.
- A test exhibit (a single lit push button in a hall, deleted before committing, or kept in a test) can be pressed, inspected and walked round; walking out and back in resets it; a neighbour seen through an archway is not stepped.
- The hall clock starts at local time, speeds and resets (tested).
- The walk round every hall the shell has (today 0 → 1 → 2 → 3 → 4 → 5 → 1; in the new ring 0 → 1 → … → 13 → 0) still hands over at every doorway with no jump.
- Typecheck, lint, format, tests and build pass.

## Performance budget

Nothing drawn is added, so no change: the stage 1 figures (51 fps on high and 119 on low looking through an archway with the courtyard in view) must hold.

## Before starting

Another session built the museum's safety and services layer (`museum-safety.ts`, its view, and edits to `museum-plan.ts`, `museum-hall.ts` and `museum-hall-room.ts`). Start only once that work is committed, and build on it.

## Open questions for the owner (one at a time)

1. **The titles.** "Warm water", "Clean water", "Safe water", "The chemistry of pools", "The whole plant": keep, or would you like Hall 1 signed "Warmth" as you called it?

## Built (2026-10-28)

- Step 1 (re-signing) was already done by 107-1; skipped.
- The hook: `src/toolkit/gallery/rooms/museum/exhibits.ts` (`HallExhibit` = `LiveExhibit` + `reset(now)`, `HALL_EXHIBITS` by room id, lazy). `museum-hall-room.ts` loads it into the hall, raycasts `parts.uses` through `knob-turning`/`touch-point`, adds the inspector and the exhibit's solids, steps it only while the hall is the one walked in, and calls `reset(localNow())` on `enter` (every hand-over and direct load). Neighbours' full copies carry their exhibits too, built in reset state and never stepped (they do not take part in the 1 m fade; they appear with the copy).
- The clock: `src/toolkit/gallery/logic/museum-time.ts` (`newHallClock`, `slices` ≤ 0.5 s, `hallSession`, `runSession`, `localNow`; `TimeSpeed`/`SPEEDS` re-exported from dev51's model), tested.
- Room codes: `hallRoomCode` in `museum-plan.ts`; `EXHIBIT_HALLS` drops the benches and the coming-soon panel from a hall that has its exhibit.
- Shared fittings: the RESET sign text is dev51's (`RESET_SIGN`), already the owner's words; no new PUSH/TURN tags were needed.
- Not done: no separate test exhibit (Hall 1 serves); the walk round all halls was not re-checked in the browser.
