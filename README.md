# Pool Plant

A first-person engineering game set in a leisure centre: walk the public pool hall and the plant rooms behind its staff doors, and keep the pools running. The design brief is `/Users/salimfadhley/Downloads/Pool-Plant-Project-Brief.md`.

Play it at https://trebizondoculpepper.github.io/simulation_of_boring_things/. Every push to `main` that passes CI is deployed there.

## Current state

The building is laid out but empty. Every room is a blank shell with a title card on one wall, joined to its neighbours by open doorways in one continuous world (no portals):

- Public: Reception, Changing Village, Main Pool Hall (to hold the 50 m pool, learner pool, spa pool and rapids ride), First Aid Room.
- Back of house, off the Service Corridor behind two staff doors in the pool hall: Pump and Filtration Room, Balance Tank Room, Chemical Store, Boiler Room, Air Handling Plant, Electrical Switch Room, Duty Manager's Office, Stores, Maintenance Workshop, Janitorial Store, Staff Room.

The plan is data in `src/game/facility-plan.ts`; its tests check that rooms do not overlap, that every doorway lies in a shared wall and that every room can be reached from reception.

## Running

```sh
npm ci
npm run dev   # http://127.0.0.1:5175/
```

`?at=<room id>` starts in a given room (for example `?at=boiler`). In the browser console, `facility.goTo('pumps')` jumps to a room and `facility.rooms()` lists the ids.

Walk with WASD, run with Shift, click to capture the mouse and look, Esc to free the cursor. Touch and gamepad also work.

## Checks

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`. CI (`.github/workflows/ci.yml`) runs the same five and deploys the build to GitHub Pages.

## Reused from the Encabulator

The build tooling (Vite+, TypeScript 7, Oxlint, Oxfmt) and the first-person control scheme come from the neighbouring `encabulator` project; see `doc/reuse-inventory.md`.
