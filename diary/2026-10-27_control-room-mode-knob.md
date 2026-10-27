# Development Diary Entry - 2026-10-27

## Context

- **Date**: 2026-10-27 19:10 UTC
- **Branch**: main
- **Commit**: 8802f8d (before this work)
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked for an Easter egg: an old-fashioned knob near the card reader by the corridor's control room doors, labelled in Dymo tape CONTROL ROOM MODE, OLD or NEW. Ignored (OLD), the doors lead to the old control room; turned to NEW before going through, they lead to the bridge. Mission 095 had retired the old control room and sent the doors to the bridge.

## Our Approach

The mode lives in the one world state, so it survives reloads and rooms: `controlRoomMode` ('old' | 'new'), a `control-room/mode` action, `WORLD_VERSION` 47 with a migration bringing older saves up at OLD. The routing is pure (`logic/control-room-mode.ts`): `corridorDoorTo` sends the control room doors to `bridge` at NEW, else `control_room`; `settledDoorTo` keeps a doorway's destination while its doors stand open, so the room beyond only changes behind shut doors. `CORRIDOR_DOORS` names `control_room` again.

## Implementation

The corridor room registers each doorway's joint to the room it leads to now and re-registers when the knob's choice settles. For the control room doors it also registers a joint to the other room that never opens: the app never draws that room through it, but if the player is in that room (reached by URL), the app can still see the corridor through its doors and hand back. That kept the bridge's own files untouched (another agent was working there). The knob (`views/control-room-mode-knob.ts`) is built from `beginPart`, `createSelector` and the library's `createKnob` pointer style at 40 mm, on a screwed grey plate with three Dymo labels; a click turns it to its other position whichever side is hit. It is marked set decoration for the model checks, with its own overlay description ("at OLD"). The old control room's name went back to CONTROL ROOM; AGENTS.md's ruling now says the old room is the default and the bridge is behind the knob.

## Outcomes

- Tests: routing by mode, the migration, the knob turning the world and following it; the corridor tests now treat the control room as one of the shell rooms off the ring.
- In the browser: the knob turned to NEW opened onto the bridge; turned back with the doors open, nothing changed until they shut; reopened onto the old control room and walked in.
- Gotchas: the corridor's view group is already scaled by `metre`, so the first placement put the knob some 250 m away; and the corridor's dado stands 10 mm proud up to 1.2 m, so the knob went up to 1.4 m to keep its plate clear. The lever selector's white line runs both ways from the hub, so at a glance it didn't show which way it pointed; the pointer knob does.

## Next Steps

None required. If the bridge's doorway moves (the elevator), the corridor's joint to it moves with the bridge's own joint, not here.
