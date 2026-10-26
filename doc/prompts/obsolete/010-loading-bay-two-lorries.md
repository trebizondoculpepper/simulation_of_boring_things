# Prompt: a loading bay two lorries wide, and the generator connection there

Superseded by [073](../073-loading-dock-layout.md) (2026-10-26), which takes in all it asked.

Status: not started (checked 2026-10-26): the bay is still 7.5 m wide with one tanker stand, and the generator connection point is still in the switch room.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply.

## What the owner wants

The owner's original design gave the loading bay room for two lorries side by side:

- **a delivery bay,** for tankers delivering chemicals (hypochlorite, acid) and fuel;
- **a generator bay,** for a hired generator, which arrives as a containerised set on the back of a lorry when the mains supply fails.

The loading bay as built is one lorry wide. The generator's connection point, where the hired set is plugged in, is in the switch room, which is the wrong place: it belongs on the loading bay's wall beside the generator bay, where the lorry stands.

## What is there now (checked 2026-10-22)

- **The bay itself:** `loading_bay` in `src/toolkit/gallery/logic/shell-rooms.ts` is 7.5 m wide, 12 m deep and 7 m high. The hypochlorite and acid stores open off its side walls, so the two stores never share a wall or a drain.
- **Its equipment** (`case 'loading_bay'` in `src/toolkit/gallery/logic/room-equipment.ts`):
  - one tanker stand, 3.2 × 9 m, painted on the floor down the middle, walkable (`tanker-stand`);
  - a fill cabinet on each store's wall (`fill-cabinet`);
  - its signs.
- **The generator connection point** (`generator-point`, "Generator connection point") is in the switch room's equipment, the `case 'switch_room'` list, and is modelled in `createGeneratorConnection` (`src/toolkit/components/plant/views/electrical-switchgear.ts`).
- **The main corridor** joins the loading bay at `{ wall: 'west', at: 4, to: 'loading_bay' }` in `src/toolkit/gallery/logic/main-corridor.ts`.
- **The older layout study** places the bay in `src/game/shared-plant-layout.ts` (zone `loading_bay`), with its own test.
- **The sizing study** `doc/plans/plant-sizing.md` lists one "Delivery lorry space" (3.2 × 9.0 × 3.6 m), in two tables.
- **Catalogue entries:** the plant catalogue (`src/game/plant/equipment-catalogue.ts`, `installed-asset-ids.ts`) registers each placed item by room, key and label. Moving the generator point from the switch room to the loading bay changes its room, so its registered entry must move with it. Its permanent asset ID stays the same; only its room and display tag change, the old tag kept as an alias if the catalogue has aliases by then.

## What to do

1. **Widen the loading bay** to take two lorry stands side by side, with room to walk between and beside them and to reach the fill cabinets: about 10.5 m. Keep its depth (12 m), its height, and the stores off its side walls.
2. **Two stands:**
   - a **delivery bay** by the fill cabinets, the existing tanker stand moved over;
   - a **generator bay** beside it, a second painted stand of the same size.

   Each is labelled on the floor (DELIVERIES, GENERATOR), and both are walkable, as the tanker stand is now.

3. **Move the generator connection point** from the switch room to the loading bay's wall beside the generator bay, at its usual mounting height. Remove it from the switch room's list. Its cable to the switchboard is out of scope here: leave a note in the code where the supply would run.
4. **Update the sizing study** (`doc/plans/plant-sizing.md`): two lorry spaces, a delivery bay and a generator bay. Update `shared-plant-layout.ts` only if its test needs it to still pass.
5. **Update the catalogue's register** for the moved generator point. If the other agent is editing those files at the time, stop and say so in your report rather than editing over its work.

## What not to do

The owner says the rooms round the main ring corridor will be rearranged soon anyway, and the air plant room will probably become much narrower. So:

- **don't tidy** the positions of rooms or doors along the main corridor beyond what widening the bay forces;
- **don't optimise** the ring's layout, or move other rooms to make it neat;
- **if widening the bay pushes into a neighbour,** make the smallest change that keeps every test passing (move the neighbour along, or shorten the corridor's spare length) and say in your report what you changed.

## Checks

- The existing room and layout tests pass: the room equipment fits and is reachable, doorways are clear, the corridor joins line up, and the catalogue has no unregistered or orphaned asset.
- Add a test that the loading bay holds two lorry stands, each at least 3.2 × 9 m, side by side, neither over a doorway's clear space nor in front of a fill cabinet. Test too that the generator connection point is on the bay's wall beside the generator stand, within reach.
- Render the loading bay (`?room=loading_bay`) and check both stands and the generator point by eye.
- Before committing run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`; commit only when all pass.
- **Another agent works in this same checkout.** Commit only the files you changed, naming them in `git add`, never `git add -A`. Leave others' uncommitted files alone.
- Add the change to `CHANGELOG.md` under Unreleased, unless someone else has uncommitted edits to it; then say so in your report.
- Markdown is one paragraph per line, never hard-wrapped.

## Return path

Commit as `loading-bay: <what changed>` and push; rebase if `main` has moved, never force-push. When done, or if you stop, write `doc/reports/loading-bay-progress.md`:

- start with a line naming yourself (model and tool) and the UTC date;
- give what you changed, with commit hashes;
- list any neighbouring room you had to move, and how;
- give anything left undone, and why.

Commit the report as `report(loading-bay): <summary>`.

## Remaining (checked 2026-10-26)

- Widen the bay to about 10.5 m, keeping its depth, height and the stores on its side walls.
- Two stands, DELIVERIES and GENERATOR, walkable.
- Move the generator connection point to the bay's wall beside the generator stand, noting its cable's route (with [052](052-emergency-power.md)'s hired generator).
- Update `doc/plans/plant-sizing.md` and the catalogue register.
- Tests of the two stands and the generator point's place; a look by eye; the progress report.
