# 001: Revise the basic layout, starting with a stair core

Superseded (2026-10-25) by the restart of the building in `b0cef39` (2026-10-21), which deleted the layout this revises (`facility-plan.ts`, `facility-levels.ts`, `src/scene/facility.ts`); the owner had already chosen a different stair on 2026-10-20. The building's layout is now the pool loop and the plant rooms round it; a single plan of it is the open "One facility plan" item in `TODO.md`.

## Briefing

> **Superseded in part, 2026-10-20.** The owner chose a different stair: a lower service corridor beneath the upper one, joined by one prefabricated galvanised steel straight flight (`STAIR` in `src/game/facility-levels.ts`, `createServiceStair` in `src/scene/facility.ts`). Do not build the stair core described below. The other layout suggestions still stand.

The owner has walked the current layout (`src/game/facility-plan.ts`, `src/game/facility-levels.ts`, `src/scene/facility.ts`) and finds the stairs the weakest part. The lower level is reached by a single straight flight laid along the north edge of the service corridor (`STAIR` in `facility-levels.ts`, x 32–44, descending 3 m westward). It reads as a ramp in a corridor, not as a building's stair.

The owner wants instead **a vertical void filled with a metal staircase**: a stair core, a tall shaft running from the lowest plant level to the highest, with a steel stair climbing round its walls in flights and landings, so that from any landing you can look up and down through the open well past the other flights. It should feel like the plant stair of a real leisure centre: utilitarian, galvanised, a little echoing.

Every room stays a blank shell with a title card, as now. This task changes where the rooms are and how they connect; it does not add equipment, pools or scenery beyond the stair itself, which is the one piece of architecture the owner has asked to see.

Before starting, commit the working tree as it stands (the layout, levels, room models and diary entries already made) so this revision is a clear diff on top of it.

## The stair core

Suggested arrangement; adjust if the plan needs it, and say why in the report.

- **Form.** An open-well stair: flights round three or four sides of a rectangular shaft with a clear well in the middle, rather than a dog-leg whose flights sit tight together. The well is what makes the void visible. A shaft of about 5 × 7 m in plan suits flights 1.1 m wide round a well of about 1.5–2 m.
- **Height.** From the lower plant level to the upper (mezzanine) plant level, through the ground floor: about 10–12 m of void (see the level changes below). A door onto a landing at every level it serves.
- **Construction.** Galvanised steel stringers; open steel grating or chequer-plate treads with contrasting (yellow) nosings; half-landings and floor landings of the same grating; handrails each side with a knee rail and mesh infill on the well side, since the drop is several storeys. Painted blockwork shaft walls, a light fitting at each landing, a level sign by each door (for example "LEVEL −1 PLANT").
- **Dimensions.** Take them from BS EN ISO 14122-3 (stairs for access to machinery) or BS 5395, and record which: a pitch of about 30–38°, risers of about 180–190 mm and goings of about 250 mm, handrails at 900–1,000 mm, at least 2 m headroom under any flight or landing above. Use the correct dimensions; do not stretch the flights to fit a room.
- **Plant drop.** Real plant stairs often share their shaft with a plant hatch or lifting beam for lowering pumps and filter parts. A lifting beam across the top of the void would explain why the void is so large. Optional; say whether you add it.
- **Riser.** The interconnection plan (`doc/planning/plant-interconnections.md`, "Where it runs") needs a pipe and cable riser between the lower plant and ground level. It can run up one wall of the stair core or in a duct beside it.

### Walking it

The current `floorAt(x, z, previousY)` in `facility-levels.ts` and the `floorAt` option added to `src/toolkit/controls/input/first-person.ts` handle one sloping flight. An open-well stair stacks flights and landings above one another in plan, so the floor under the walker depends on which surface they are already on.

- Resolve the floor as the highest walkable surface at (x, z) that is not more than one step (about 0.35 m) above the walker's current floor. That lets the walker climb a flight and never jump up onto the flight overhead or fall through the one beneath.
- The well and the open edges are solid footprints for collision: the walker cannot step into the void.
- Test it headlessly: walking each flight up and down arrives at each landing at its level; no point on a flight resolves to the flight above or below; every door lands on its own level; the well is never walkable.
- Keep the change to the toolkit's controls minimal and general: the controls must stay one scheme for every room (see `AGENTS.md`). The facility supplies the surfaces; the controller only asks for the floor.

## Other layout suggestions

These come from the owner's planning discussion and `doc/planning/pool-district-layout.md`. Take them up where they fit; list any you leave for later in the report.

1. **Give the lower plant a real depth.** A sand filter for the main pool is roughly 2.8 m in diameter and over 3 m tall with its pipework; the lower plant rooms are 2.7 m high on a floor at −3 m. A lower plant floor at about −5 to −6 m with at least 4.5 m clear in the pump and filtration room fits real plant, and puts the balance tanks below the pools' water level, as they must be.
2. **Add the pipe and inspection gallery** round the main pool at the lower level, from the planning note. It joins the balance tank room and is where overflow and drain lines would run.
3. **Put the air handling plant on an upper mezzanine** reached by the stair core, as the planning note proposes, with the ductwork into the pool hall's roof space. That frees ground-floor space and gives the stair a reason to go up as well as down.
4. **Move the chemical store to an outside wall** with its own external door onto a service yard, and split it into separate hypochlorite and acid rooms. Put the dosing room (the current Upper Plant Room) between the store and the pump room's injection points.
5. **Add the service yard** outside the plant side: chemical deliveries, the gas meter kiosk, the plant delivery route to the lifting beam or hatch.
6. **Add a poolside equipment store** off the pool hall for lane ropes, floats, covers and the pool hoist.
7. **Reserve a rapids plant room** next to wherever the rapids ride will be: its attraction pumps are the largest motors in the building and sit close to the ride.
8. **Pool size.** The main basin is 50 × 20 m (eight lanes). An Olympic pool is 50 × 25 m (ten lanes). The owner has not yet chosen; ask before changing it.

## Constraints

- Follow `AGENTS.md`: one paragraph per line in Markdown, the five checks before committing, a diary entry, ask the owner one question at a time.
- No portals. The stair core is a real room in the one world, with its own entry in the plan and its own title card.
- Keep stable room ids where a room survives the revision, so `?at=<id>` links keep working; list any ids that change.
- Keep the plan's tests passing and extend them: every room reachable from reception, every door on a shared wall at one level, no rooms overlapping at the same level, the stair core connecting every level it serves.

## Return path

Write the completion report to `doc/reports/001-layout-revision.md` (create the folder and file if missing; on later runs, add a dated entry and keep the earlier ones). Include: what changed in the plan and why, the stair's dimensions and the standard they came from, the room ids added, removed or renamed, the suggestions left for later, the checks' results, screenshots or `?at=` links for the owner to walk the stair core, and any questions for the owner. The owner reads it next, then the agent working on the plant interconnections (`doc/planning/plant-interconnections.md`), whose "Where it runs" table will need updating to the new rooms.
