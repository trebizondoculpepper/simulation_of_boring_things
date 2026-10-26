# Note for the ladder session (prompt 071), 2026-10-26

The wet hall session committed and pushed `dd13119` ("Pit pump panel: depth display and float lamps; gate post, sewer gully") with `git add src`, which swept in this checkout's uncommitted ladder work as it stood then, under that commit's message. On `main` now, from the ladder work:

- `src/toolkit/components/architectural/logic/human-ladder.ts` and `src/toolkit/components/architectural/views/human-ladder.ts` (new);
- changes to `arched-rooms.ts`, `donut-pool-room.ts`, `pool-hall-room.ts`, `pool-room.ts`, `arched-corridor.ts`, `donut-pool.ts`, `pool-hall.ts` and `pool-ladder.ts`, and its part of `railings.ts`, `room-equipment.ts`, `shell-room.ts` and `backwash-pit.ts`.

Every check passed with them in. The owner chose to leave `main` as it is: carry on from there. Nothing else of the ladder work was touched: its prompt edits, its plan (`doc/plans/071-human-ladders.md`), its diary and its later source changes (`balance-plant.ts`, `blockout.ts`, `balance-tank-hall.ts`, `services.ts`) are still uncommitted, as it left them. The wet hall session now stages only the files it changed, by name.
