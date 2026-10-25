# 064: The jacuzzi, from the model

Status: specified 2026-10-25 from the owner's direction; step 1 built the same night (`world-in-model.test.ts`). Follows [063](063-component-information-remediation.md), which has the background and the owner's rulings.

## The goal

At the end of this, every single visual thing exists in the simulation unless it is explicitly declared decorative. The benefit (the owner): "it should be way easier to debug why things aren't working, because you don't actually need to debug the visual model, you just need to debug the simulation." The jacuzzi is the first room taken all the way; the test makes the rest measurable.

## The owner's direction (2026-10-25)

- "We're going to start by adding the tests. Then we're going to improve the process as in the way that I've described. And then … clear the pipes from the jacuzzi and try and get everything laid out to our new standard, and then do a test that everything in the jacuzzi plant room and the jacuzzi pool room is something that exists in our world simulation model."
- "It's okay to have things in the simulation that aren't yet attached to machines in the visual space, but every machine in the visual space must exist on a node in the simulation. So we should be able to run the tests and find which components are unbound, and then we could also fix that by correcting the bindings."
- "When we attach a machine into the world, it needs to either be attached to a node in the port graph, or it needs to be marked as decorative, in which case it just sits there and doesn't do anything."
- The process: "It begins with the schematic, with all of the machines and valves in place. Then we put the machines into the room and try to optimize their layout. And then the plumber's job is to put in the pipes and the valves, which are already described in the schematic. And then we can go through the scoring process." Machines are placed first, valves not: "the valves will go in the run of the pipes and we don't know where the pipes are going yet." The plumber may add valves its rules imply, enhancing the model, but "the plumber shouldn't have to add anything if our model was correct."
- The enhanced network is the source of truth; nothing is hand-written; everything is derived algorithmically from the game's model; tags are hierarchical (room, group, item). If the network changes, the saved game state may be thrown away.

## Step 1: the tests (built 2026-10-25)

`src/toolkit/gallery/logic/world-in-model.ts` lists what each plant room draws (machines, valves, flowmeters, isolators, electrical components, pipes), from the same data its scene builders draw from, each with the model id it is drawn from; `world-in-model.test.ts` pins each room's count of things neither in its enhanced network nor decorative, so a count can only fall, and anything new drawn outside the model fails. Its first run: 361 of the 479 things the plant rooms draw are unbound; the Olympic plant room binds 107 of its 143; the jacuzzi plant room binds none of its 32.

Still to add in this step:

- **The jacuzzi pool room** (the pool_03 hall, `pool-hall-room.ts`) in the same listing: the tub on its plinth, its jets and air ring, its main drains and gutter, the wall plate's START and STOP, the speakers and music cabinet, the fibre-optic wall and its illuminator, the plant door. Each is bound to a node of the jacuzzi's model or marked decorative.
- **Decorative as a mark, not a guess.** Today "decorative" is a kind classed decorative (signs, furniture). Give the binding an explicit form: a drawn thing is either `{ node: <model id> }` or `{ decorative: true }`, set where it is built, and the listing reads it; a thing with neither is unbound.
- **The report.** A test (or the console's `unbound` command) that names each unbound thing by room, kind and name, so the bindings can be corrected one by one.

## Step 2: the process, as the owner described it

Written into `doc/room-layout-guide.md` (section 1) and `AGENTS.md`. In the code:

- **The schematic holds the valves.** A room's schematic (its port graph) names every valve and isolator, each with its function, normal state and tag, as nodes on the links they sit in. The plumber's expansion (`expandForPlumbing`, `plumbing-expansion.ts`) today infers every isolating valve from its `isolate` rules; it is to take the schematic's valves as given, place them, and add only what its rules imply and the schematic lacks, reporting each addition (an addition means the schematic is incomplete).
- **Placement places machines only.** Valves are `inline` items, left out of placement (as `machine-placement.ts` already allows) for the plumber to set in their lines.
- **Tags and names derived.** Each node's tag follows from its place in the hierarchy (room, group, item) and its kind (IV, BV, RNV, DV for valves, by function), never from a table written by hand.
- **Scoring unchanged:** the gates and weighted dimensions of `room-scorer.ts`.

## Step 3: the jacuzzi, cleared and remade to the standard

1. **Clear the jacuzzi plant room's pipes:** the hand-drawn cabinet services (`cabinet-pipes.ts` for plant_pool_03: the cabinet's runs, their valves, the balance tank's make-up, suction, overflow and drain, the valve panel's bindings) and their hand-written register entries (`installed-valves.ts`'s PL3 valves).
2. **The schematic:** the jacuzzi's machines and every valve and isolator, from what the world already simulates (`world.ts`'s jacuzzi, its cabinet, its balance tank `spa-balance-tank.ts`, the water balance; the cabinet trial `jacuzzi-trial.ts` has its water circuit): the tub and its gutter, the balance tank with its float make-up and overflow, the packaged cabinet (circulation pump, filter, heater, UV, dosing), the jet pump, the air blower, the heating flow and return, the make-up water service, the drains to waste, and power to each machine; and on its links every valve (the tank's make-up and drain, the circulation suction, the return, the jets' suction and discharge, the air, the heating flow and return, the tub's drain), each with its function, normal state, and how it is worked (manual or motorised, as today).
3. **Place the machines** in the plant room, optimised (the owner's earlier rulings for this room stand: the balance tank north of the cabinet in the north-west corner, the cabinet against its wall with its doors clear).
4. **The plumber** routes the pipes and sets the schematic's valves in their lines; it should add nothing.
5. **Score** the room; every gate passes.
6. **Bind the world to the model:** the jacuzzi's simulation reads each valve's state by its model id (the save may be thrown away); the overlay, inventory and console describe each item from the model (prompt 060), so PL3's valves read "Isolates … flowing from … to …" again, derived.

## Step 4: the jacuzzi's test

Everything drawn in the jacuzzi plant room and the jacuzzi pool room is bound to a node of the jacuzzi's model, or marked decorative: their pins in `world-in-model.test.ts` reach 0. Things in the simulation not yet drawn are allowed. A failing run names what is unbound, and the fix is a corrected binding (or a node added to the schematic), never a hand-written register entry.

## Acceptance

- `world-in-model.test.ts` covers the jacuzzi pool room, with explicit node or decorative bindings, and names unbound things.
- The plumber takes a schematic's valves as given and reports any it adds; the jacuzzi's schematic needs none added.
- The jacuzzi plant room is laid out, plumbed and scored from its schematic; its pins and the jacuzzi pool room's are 0.
- The jacuzzi works as before in the browser (the cabinet circulates, jets and air run, the tank's make-up, drain and low-low trip, heating, the tub's drain-down), and hovering PL3's valves shows their derived descriptions.
- The project's five checks pass.
