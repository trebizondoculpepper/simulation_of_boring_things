# Prompt: emergency lighting and its central battery, in the world

Superseded (2026-10-25) by [052](../052-emergency-power.md), the wiring audit's emergency power prompt, which takes in all of this (the central battery in the world, its tests from its panel, emergency lighting on a mains failure) and adds emergency light fittings and a generator. Nothing of this was built; its detail (EN 50171 duration, a sub-circuit relay per lighting zone, the battery's discharge by load) is still useful to 052.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply.

## Why

The owner's rule for what to model: if it is an interesting part of the systems engineering, model it, especially what most people never think about, such as what keeps the lights on. All lighting, emergency lighting and the electrics are in. When the mains fails, a building does not simply go dark: its escape lighting, fed from a central battery, comes on, and runs for its rated three hours while the battery runs down.

## What is there now (checked 2026-10-22)

- **The world's lighting** is in `src/game/plant/lighting.ts`: zones, each a way on the lighting distribution board, with `zoneLit(plant, lighting, zone)`. A zone is lit while the site's supply, the switch room's feeder, DB-LIGHTING and its own breaker are all on. Otherwise its rooms are dark, apart from daylight in the two halls. There is no emergency lighting in the world.
- **The rooms** take their light from the world: `src/toolkit/gallery/views/room-lights.ts`, and `poolLight` in `src/toolkit/gallery/rooms/pool-hall-room.ts`.
- **The central battery's logic** is in `src/toolkit/components/plant/logic/electrical-room.ts`, tested:
  - state of charge, rated three hours at full load (EN 50171), recharging to 80 % within 12 hours;
  - function and duration tests (BS 5266-1), lamps, volts and its 20 × 4 display text.

  It assumes that "the mains never fails of itself": it discharges only during a test.

- **The battery cabinet** is in the switch room: `createCentralBattery` in `src/toolkit/components/plant/views/electrical-switchgear.ts`. It is built after the RP-Technik MCS, with its display, MAINS, CHARGE, FAULT and BATT LOW lamps, and FUNCTION TEST and DURATION TEST keys. It keeps a private battery of its own, not the world's.
- **The emergency fittings' light on the floor** is calculated in `src/toolkit/components/general-safety/logic/emergency-lighting.ts` (BS 5266-1 illuminance), used by a dev room.
- **The annunciator** already has MAINS FAIL and GEN RUNNING windows. MAINS FAIL comes from the world (`src/toolkit/gallery/logic/world-reading.ts`).
- **The binding register** `src/toolkit/gallery/logic/world-bindings.ts` lists `central-battery` as still to wire.

## What to build

1. **The battery in the world.** Add the central battery's state to `World` (bump `WORLD_VERSION`, add a migration and its test). Step it in `advance`:
   - its charger is fed while the switch room has power;
   - lose that, or run a test, and it discharges at the rate its load sets;
   - restore it and it recharges.

   Extend `stepCentralBattery` with a `mains` input rather than writing a second model, and keep its tests passing with new ones for a mains failure.

2. **Emergency lighting by zone, pure:** a zone's emergency lights are on when its normal lighting has failed (or a test is running) and the battery has charge. That is a sub-circuit monitoring relay per lighting circuit, as a real centrally supplied system has. The battery's discharge rate scales with how many zones are on emergency. Test it: the whole site's mains lost; one zone's breaker off (only that zone's emergency lights on); a duration test; the battery running flat after about three hours, and the lights going out.
3. **The rooms show it.** A zone on emergency lighting drops to a dim emergency level, cooler and much lower than normal: enough to find the way out, not to work by. It is dark once the battery is flat.
4. **The battery cabinet shows and tests the world's battery:** its display, lamps and keys. A test key dispatches a world action.
5. **Update the binding register:** `central-battery` becomes `world`, and its pinned to-do list shrinks.

## Checks

- Before committing run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build`; commit only when all pass.
- **Another agent works in this same checkout.** Commit only the files you changed, naming them in `git add`, never `git add -A`. Leave others' uncommitted files alone. If `world.ts` or `save.ts` have someone else's uncommitted changes, stop and say so in your report rather than editing over them.
- Render a room (`?room=control_room`) with the switch room's feeder off, and check the emergency level by eye.
- Add the change to `CHANGELOG.md` under Unreleased, unless someone else has uncommitted edits to it.
- Markdown is one paragraph per line, never hard-wrapped.

## Return path

Commit as `emergency-lighting: <what changed>` and push; rebase if `main` has moved, never force-push. When done, or if you stop, write `doc/reports/emergency-lighting-progress.md`:

- start with a line naming yourself (model and tool) and the UTC date;
- say what you built, with commit hashes;
- give anything left undone.

Commit it as `report(emergency-lighting): <summary>`.
