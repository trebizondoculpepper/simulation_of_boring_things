# Development Diary Entry - 2026-10-20

## Context

| Time      | Branch | Commit        | Task                                                          |
| --------- | ------ | ------------- | ------------------------------------------------------------- |
| 14:00 UTC | main   | after 0ef426a | Penfold Controls, local control panels, one saved world state |

## What we were asked to do

The owner liked Benfield Control Systems' grey cabinets and their three-lamp indicators, and asked for a control-engineering brand, Penfold Controls, the cabinets' big door handle, and new mimic boards. A first try drew the mimic straight on the cubicle doors as Benfield do; the owner disliked losing our boards' seven-segment readouts and in-line lamps and buttons, and asked whether a plant room's mimic should differ from the control room's. The owner then asked for one world state that carries on whichever room the player is in and survives a reload, with two dev rooms to show a button in one working a lamp in another.

## What we did

Added Penfold Controls (brand 26, a three-lamp mark) and a fifth freestanding board in the brand room. Wrote the 3-gang tri-state indicator (`panel-indicators.ts`, three 30 mm push-to-test pilot lamps, presets for breakers, motors and valves), the cubicle swing handle (`swing-handle.ts`, after EMKA-type handles driving a three-point latch) and a RAL 7035 control cubicle (`control-cubicle.ts`, with a fixed top panel for a mimic), each tried on dev0 boards. Replaced the door-drawn mimics with the split the owner agreed: in the pump room a local control panel (our main pool mimic on the cubicle's top panel, with START and STOP in line with the pumps; tri-state indicators, seven-segment ammeters, HAND · OFF · AUTO, LOCAL · REMOTE and a stop on the doors), and in the control room the wall board with the same in-line buttons, refused while the local panel is in LOCAL (`pump-control.ts`). Then built the world state: `src/game/world.ts` (plain data, fixed steps, actions), `src/game/save.ts` (versioned envelope, migrations, defaults, catch-up of up to an hour) and `src/toolkit/save/world-store.ts` (localStorage with a backup slot, saving every ten seconds, on actions, on hide and on page exit; Web Locks for a second tab), and dev14 and dev15 to show it.

## Outcome

All five checks pass (490 tests). In the browser, P1 STOP on the pump-room mimic stopped the pump, and a press in dev14 lit dev15's lamp after a reload, and dev15's RESET put it out in dev14, with the world clock running on throughout.

## What we learned

Copying a reference too literally lost what made our own boards good; the owner's taste is for dense, live boards. A browser game holds a persistent world well: localStorage's synchronous write is what makes a save on page exit reliable. The illuminated push-button lens does not visibly light under the plant rooms' lighting, which wants a fix.
