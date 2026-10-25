# Prompt: can the plant catalogue prove every machine is wired to the model?

You are the agent building the plant's identification and catalogue: `src/game/plant/equipment-catalogue.ts`, `installed-asset-ids.ts`, `installed-valves.ts`, `installed-feeders.ts`, `identification.ts`, and the bill of parts (`src/toolkit/manual/plant-manual.ts`, `src/manual/logic/manual.ts`). Another agent, working in the same checkout, is wiring the machines in the real plant rooms to the simulation (`src/game/world.ts`). This prompt asks for your advice, not your code: can your catalogue be what proves that every machine in every plant room is properly connected to the model, and if so, how should the two pieces of work meet?

Read `CLAUDE.md` first. Its rule matters here: every engineering item is a real, working component, with state, which can be driven and shows what it is doing.

## The problem

The owner has asked that all the machinery in the real plant rooms be wired to the simulation model. Until recently, many machines showed a scripted demonstration loop (`plantAt` in `src/toolkit/gallery/logic/control-room-demo.ts`) or fixed pictures, whatever the world was doing: pumps, the pump panels, the control room, the dosing controller and pumps, the UV units, the tank levels, the filters' gauges, the ozone generators. Most of these now read the world. The hard part is knowing, and proving, that nothing is missed. A machine can look right while showing nothing real.

## What the wiring agent has done

All of it is on `main`. The relevant commits are `414be97`, `34b1b5e`, `a9c7aba`, `20b4a4f`, `97a733c` and the commits near them.

- **`src/toolkit/gallery/logic/world-reading.ts`** (`plantReadingOf`) is a pure reading of the world in the shape the machines and the control room show: a pool's duty and standby pumps from their isolators and its circulation, flow, levels, temperatures, chemistry, currents and the annunciator's alarms. `src/toolkit/gallery/rooms/plant/live-plant.ts` (`currentPlant`) gives it to the views.
- **Static models gained `show(...)` methods,** bound in `src/toolkit/gallery/views/room-equipment.ts` (`modelFor`, which now knows its room and so its pool).
- **`src/toolkit/gallery/logic/world-bindings.ts`** (`WORLD_BINDINGS`) is a register by equipment kind, the key prefix in `room-equipment.ts`. Each kind is one of:
  - `world`, with what it reads;
  - `passive`, with why it need not be wired;
  - `todo`.

  Its test, `world-bindings.test.ts`, walks your `equipmentCatalogue()` and fails if any catalogued kind has no binding. The `todo` list is pinned so that it can only shrink. Nine remain: the motor control centre, distribution board, rotary isolators, central battery, BMS outstation, fire repeater, pressurisation unit, calorifier, and the contact tank (which still shows the dev room's ozone model).

## The limits of that approach, as the wiring agent sees them

1. **It is per kind, not per installed asset.** Two balance tanks of one kind pass together, even if one were wired to the wrong pool. Your catalogue knows each installed asset (asset ID, tag, room); the register does not.
2. **It is a claim, not a check.** A kind marked `world` is believed, not tested: nothing proves its view actually reads the address it names, or changes when the world changes.
3. **It does not know the model's addresses.** It describes what a machine reads in words ("its pool's balance-tank level"), not as an address in the world. Your design gives parts addresses and states. The wiring is, in effect, a binding from your asset IDs to world addresses.
4. **Some machines are controls, not displays.** The motor control centre has its own starters (isolators, HAND·OFF·AUTO, START, STOP, RESET; `createMotorControlCentre` in `src/toolkit/components/plant/views/electrical-switchgear.ts`). Properly wired, it should drive the world's pumps, not only show them. The world's isolators and your installed valves are the same kind of thing: controls with world state.
5. **Two registers would drift.** `WORLD_BINDINGS` and your catalogue each list kinds, and your `InventoryEntry` already has a `source` field (`model`, `control`, `placement`) that sounds like the same question asked another way.

## What we would like your advice on

1. Should each catalogued asset carry its binding to the model: the world addresses it reads, and those it writes if it is a control? Or should that stay a separate register keyed by asset ID? Which is the single source of truth?
2. Could the binding be checked rather than claimed? For example:
   - a test that builds each room's views headless (as `room-equipment.test.ts` already does);
   - changes the world at each asset's declared address (a pump isolated, a tank drained, a store emptied);
   - and asserts the asset's shown state changes.

   What would the asset need to expose for that to work (a `shown()` per asset, say)? Is it worth it?

3. How should kind-level knowledge (every balance tank reads a level) combine with instance-level facts (this tank reads `pools.pool_01.balance`) without listing every instance by hand?
4. What does your `source: 'model' | 'control' | 'placement'` mean today? Could it become the wiring status, with `placement` meaning "placed, not yet wired"?
5. How should controls that drive the world be catalogued: the motor control centre's starters, the switch-fuses, the isolators, your installed valves? Are they parts of their parent asset, with a world address each?
6. Are there machines your catalogue knows of that the wiring agent's register does not cover, or the reverse? The register test only checks keys present in `equipmentCatalogue()`.
7. In what order would you do this, given your own remaining items in `doc/prompts/007-identification-pilot-review.md`, especially permanent asset IDs?

## Keep it short

This is a quick question between pieces of your own work. Spend a short time on it: answer from what you already know of your catalogue, a page or so, then go back to the task you were doing. Do not start any of the work you recommend.

## Rules

- Advice only: do not change code for this prompt.
- Follow `CLAUDE.md`.
- Markdown is one paragraph per line, never hard-wrapped.
- Commit only the file you write, naming it in `git add`.

## Return path

Write your answer to `doc/reports/catalogue-and-world-wiring-advice.md`.

- Start with a line naming yourself (model and tool) and the UTC date.
- Answer questions 1–7 by number.
- Then give a recommended design in outline and the first step you would take.
- End with any question only the owner can decide, one per line.

Commit it with the message `advice(wiring): <one-line summary>` and push; rebase if `main` has moved, never force-push. The wiring agent will find it with `git log --grep='advice(wiring)'` and reply in `doc/reports/catalogue-and-world-wiring-response.md`.
