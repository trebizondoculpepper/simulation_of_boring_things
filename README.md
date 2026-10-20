# Pool Plant

A first-person engineering game set in a leisure centre: walk the public pool hall and the plant rooms behind its staff doors, and keep the pools running. The design brief is `/Users/salimfadhley/Downloads/Pool-Plant-Project-Brief.md`.

Play it at https://trebizondoculpepper.github.io/simulation_of_boring_things/. Every push to `main` that passes CI is deployed there.

## Current state

The building is laid out as separate room components in one continuous world. Each doorway has a self-closing door that opens on approach. The reception-to-changing entrance has sliding frosted-glass leaves; that adjacent room stays rendered to give the glass a blurred view. Other neighbours load only behind open doors. The pool hall contains three empty tiled basins, overflow gullies and two ladders. Suspended LED battens light public rooms, while service rooms have spotlights. High pool-hall windows and four shallow barrel rooflights follow the [architectural daylight references](doc/research/daylight-from-architect-plans.md). The glazed reception opens onto a simple exterior forecourt, road and neighbouring buildings beneath an overcast sky. The service rooms use the Encabulator corridor’s painted blockwork, concrete, dark skirting, route stripes and high cable trays. The other rooms remain named shells:

- Public: Reception, Changing Village, Main Pool Hall (50 m pool, learner pool and spa pool, with space reserved for rapids), First Aid Room.
- Back of house, off the Service Corridor behind two staff doors in the pool hall: Pump and Filtration Room, Balance Tank Room, Chemical Store, Boiler Room, Air Handling Plant, Electrical Switch Room, Duty Manager's Office, Plant Control Centre, Engineer’s Office, Stores, Maintenance Workshop, Janitorial Store, Staff Room.

The east reception entrance opens to the exterior at `x=112, z=25`. The building plan is data in `src/game/facility-plan.ts`; its tests check that rooms do not overlap, that every doorway lies in a shared wall and that every room can be reached from reception. The basin footprints and depths are in `src/game/pool-layout.ts`. `src/scene/facility.ts` builds each room model separately and assembles them at their plan coordinates. The water treatment rooms now occupy a lower level below an Upper Plant Room. An enclosed side stair from the Service Corridor reaches the Lower Plant Landing; movement, walls and room labels use the player’s current elevation. This is a first spatial test of the split-level arrangement in the planning sketch. The [fitting research notes](doc/research/pool-architectural-fittings.md) identify references for the temporary pool edges, ladders and lights.

## Running

```sh
npm ci
npm run dev   # http://127.0.0.1:5175/
```

The default reception view faces into the building. `?at=<room id>` starts in a given room (for example `?at=boiler`); `?at=outside` starts on the entrance forecourt. In the browser console, `facility.goTo('pumps')` jumps to a room and `facility.rooms()` lists the ids.

Walk with WASD, run with Shift, click to capture the mouse and look, Esc to free the cursor. Doors open as you approach and close after you leave. Touch and gamepad also work.

## Checks

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. CI (`.github/workflows/ci.yml`) runs the same five and deploys the build to GitHub Pages.

## Reused from the Encabulator

The build tooling (Vite+, TypeScript 7, Oxlint, Oxfmt) and the first-person control scheme come from the neighbouring `encabulator` project; see `doc/reuse-inventory.md`.
