# 106: The ideal pool plant (dev51), a working three-dimensional schematic

Status: built 2026-10-28; the owner's review of the framings and the open questions below remain.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it, above all: the enhanced network is the one source of truth (the schematic first, with every valve, function, normal state and derived tag; the plumber routes the pipes; nothing is drawn that is not in the model); engineering items are real, working, branded components; displays redraw only when what they show changes; all input goes through `src/toolkit/controls/`; `logic/` is pure and tested. Then read `doc/plant-model.md` and `doc/room-layout-guide.md`.

## The request

The owner, 2026-10-28: "Build me a new demo plant room, this time using idealized sources where possible … to show that we can simulate three-dimensional schematics with ideal sources to show the entire process of a swimming pool, use manual valves, but create a mimic to show how the system works. … use this as a demo for people on Reddit to show that I can create a working 3D schematic of how an idealized pool works, complete with flows, flow diagrams that work, and all simulation, all components simulated work. Let's make it simple for ourselves. Single pumps for everything … all tanks and pools will be replaced with idealized source models. … We'll use real pipes … and we'll confine ourselves to using real components like pumps where possible."

## The owner's answers

1. **Scope: circulation and filtration, plus heating.** Not dosing, backwash or make-up. The loop: an idealised pool, an idealised balance tank, one real circulation pump, a real sand filter, and back to the pool. The heating: an idealised hot-water source feeding a real heat exchanger on the return, with the pool's temperature responding.
2. **The mimic goes on the room's wall:** a Penfold mimic board with the circuit as a live flow diagram: lit flow lines, pump and valve states, temperatures and flow readings, and Penfold's mark.
3. **The 3D pipes look real:** plain painted pipes with flow arrows and labels, as in a real plant room. Flow shows only on the mimic and the gauges; no animated or coloured flow in the pipes.
4. **A stand-alone dev room** at the next free number, dev51, with its own fresh state, opened by its own link, `?room=dev51`, so a Reddit visitor lands straight in it, titled `DEV51 · THE IDEAL POOL PLANT`.
5. **Hands-on, with a printed guide.** Visitors work everything themselves: start and stop the pump, open and shut the manual valves, and turn the heating on. A laminated "Try this" card on the wall suggests steps: shut the filter outlet and watch the pump's discharge pressure rise and the flow fall; throttle the heat exchanger's primary and watch the return temperature; stop the pump and watch the flow go to zero.

Further, the same day:

- **Flow meters** ("add flow meters"): beyond the one on the circulation, a real, working, branded flow meter on each line where the flow matters, so a visitor can read the flow at each stage: the circulation, the heat exchanger's bypass, its secondary (pool side) and its primary (hot-water side). Real types suited to each line: an electromagnetic meter with an LCD on the main circulation, a paddle-wheel meter and variable-area meters on the smaller lines. Each in the schematic with its tag and its reading on the mimic, and a "Try this" step that uses them (throttle a valve and watch the flows redistribute).
- **Signposts by each machine** (pump, filter, heat exchanger, ideal pool, balance tank, hot-water source, the flow meters and the mimic), each saying what the machine does, why it is there in a pool's process, and what the visitor can do with it, legible at a couple of metres, plain English for a general audience. Set decoration, static. Names, tags and connections derived from the model; only the explanatory prose hand-written. Out of the pipework's way and out of the camera framings' main lines.
- **The exhibit framing:** the whole room works like a museum's working model, made for edutainment:
  - an **entrance panel** with the exhibit's title, a one-paragraph introduction ("How a swimming pool keeps its water clean and warm") and a numbered route round the room;
  - **numbered stations** following the water's path: 1 pool, 2 balance tank, 3 pump, 4 filter, 5 heat exchanger, 6 back to the pool, each placard carrying its number;
  - **placards** as museum interpretation panels on angled lecterns at hip height: a bold headline, two or three short sentences, a small diagram or icon, and a "Try it" line set apart in a coloured box, in plain language with one memorable fact each;
  - **visitor controls** marked clearly with a museum-style "push" or "turn" tag, so it is obvious what may be touched;
  - **the mimic** captioned as the "map" of the whole system; the "Try this" card becomes the exhibit's activity card;
  - **the look:** a clean exhibit-hall look round the working plant, floor markings for the route and good lighting on each station; the plant itself real and honest.
- **A RESET SIMULATION button:** a real, working, big museum-style push button near the entrance panel and the mimic, which puts the whole exhibit back to its start through the room's own state and actions (no page reload): the pool's and tank's water and temperature, every valve to its normal position, the pump to its start state, the heating at its start; it lights briefly and the mimic resets. Beside it a friendly sign: "Don't worry, you can't break anything! This is a simulation. If you get the plant into a muddle, press this button and everything goes back to the start." Mentioned on the entrance panel and the activity card. Tested in logic and in the browser.

## The design

**The process, one schematic** (`src/game/plant/ideal-pool-plant.ts`): the ideal pool overflows by gravity (unvalved, as every overflow) to the ideal balance tank; the single circulation pump P1 draws from the tank through its suction valve and pushes through its non-return and discharge valves into the sand filter F1; from the filter's outlet the electromagnetic flowmeter carries the whole circulation to a split: most of it through a throttling bypass valve, the rest through the plate heat exchanger HX1's secondary; the two join and return to the pool through its inlets. The heating side: an ideal hot-water (LTHW) source at a fixed pressure and temperature feeds HX1's primary through a throttling valve and a variable-area meter, and leaves to an ideal LTHW return sink. Every valve is manual (a lever with a notch plate, so it can be throttled); each is a given fitting of the schematic with its role and normal state; the plumber adds nothing.

**Tags are derived** from the schematic, never written by hand: the room's code `IPP`, a machine's its code (`IPP-P1`), a fitting its machine's and its own (`IPP-P1-V1`), an instrument its kind and number (`IPP-FT1`, `IPP-PI1`, `IPP-TI1`).

**The physics, honest:** the water network is solved by the plant's own solver (`solveNetwork`, `src/game/sim/hydraulics.ts`) each time a valve or the pump changes: the ideal pool and tank are reservoirs at fixed heads, the pump on its curve (Grundflow NKC 150-315: 22 m shut off, 18 m at 300 m³/h), the clean sand bed's resistance from the ideal filter's physics (`filterSizing`), each valve's resistance from its opening (a butterfly's characteristic), the exchanger's passes and the pipes as resistances. The heat: the exchanger by effectiveness (ε–NTU, `effectiveness` from `pool-heating.ts`), the pool a thermal mass losing heat to its hall, the thermometers lagging the water. A TIME button (×1, ×60, ×600) on the mimic runs the pool's slow warming in minutes.

**The room:** machines placed by hand in process order round a ring walkway, the pipes routed between their ports by the voxel router (`routeVoxelLines`), each fitting set into its line where the schematic's `along` order puts it. Mimic, activity card and entrance panel on the walls, the RESET button beside the entrance panel.

## Steps

1. The schematic, model and tests (`ideal-pool-plant.ts` and its test): every fitting given, tags derived, the network converging, the readings at the normal duty, each "Try this" step responding as physics says, reset.
2. The layout and plumbing (`src/toolkit/gallery/logic/ideal-pool-plant-layout.ts` and its test): every line routed, no clashes, the walkway clear.
3. The mimic (`ideal-pool-plant-mimic.ts`), its spec checked, its state from the model.
4. The placards, derived from the model (`ideal-pool-plant-placards.ts`).
5. The new components: a throttling butterfly valve with notch plate, a paddle-wheel flowmeter, a variable-area flowmeter, the museum lectern and the big RESET button.
6. The room module, registered as dev51, with the inspection overlay.
7. Browser checks on high, medium and low graphics; screenshots and camera links below.

## What was built

- **The model** (`src/game/plant/ideal-pool-plant.ts`, tested): nine nodes (the ideal pool IP1 and balance tank BT1, pump P1, filter F1, the bypass and return tees, heat exchanger HX1, the ideal hot-water source HS1 and its return HS2), ten links, fifteen given fittings (ten manual throttling valves, the pump's non-return valve, four flowmeters) and ten instruments (PI1–PI4, PDI1, TI1–TI5); `expandForPlumbing` adds nothing. The network is solved by `solveNetwork` behind `solveWithDeadEnds`, which prunes the branches a shut valve leaves fed from one side (the solver's known failure) and carries the still water's head into them, so a dead-headed pump reads its shut-off head and a stopped pump's non-return valve holds back the pool. The pool and tank are reservoirs at the heads their drawn water stands at (1.7 m and 1.2 m), the pump on the Grundflow NKC 150-315's curve (22 m shut off, 18 m at 300 m³/h), the bed's resistance from `filterSizing` (Ø2.8 m, 1 m bed), each butterfly's flow coefficient the square of its opening on a six-notch plate. The heat: ε–NTU (`effectiveness`), the pool's 470 m³ losing 12.5 kW/K over 20 °C, the tank following the pool by its turnover, still water drifting to the room, thermometers lagging 6 s.
- **The room** (`src/toolkit/gallery/logic/ideal-pool-plant-layout.ts`, tested): machines placed by hand in the water's order along the north wall, every pipe routed by the voxel router (two straight runs laid as fixed), the overflow by gravity, the visitors' floor kept clear below 2.6 m, every fitting set in the plumber's order on its line, the variable-area meters in rising pipes.
- **The mimic** (`ideal-pool-plant-mimic.ts`, tested with `checkMimic`): every instrument repeated, valve lenses green, amber or red by the lever, pump RUN and START/STOP, HEATING, TIME ×1/×60/×600.
- **The words** (`ideal-pool-plant-placards.ts`, tested): six numbered lecterns plus the hot-water source and mimic signposts, names, tags, connections and every number derived from the model; the entrance panel, activity card and RESET sign.
- **Components**: `throttle-valve.ts` (lever and notch plate, TURN tag), `small-flowmeters.ts` (Gorskiy metal-tube VA meter and glass rotameter, Trager-Feinstein paddle wheel), `ideal-vessel.ts`; the Kessler-Moody mag meter and digital thermometers, dial gauges, and the pump, filter and plate exchanger views as they were. `gallery/views/museum-exhibit.ts`: lecterns, wall panels, the RESET pedestal and the pump's local station.
- **The overlay**: `plant-room.ts` gives dev51 the inspector; every machine, valve and instrument is marked with its tag, its model binding and what its own display shows.

## Readings (checked in the browser, 2026-10-28)

At the normal duty (every valve open, the bypass at notch 3 of 5, heating off): FT1 184.7 m³/h (the pool turned over every 2.5 h), FI2 bypass 150.7, FI3 exchanger 34.0, FI4 0; PI1 suction 0.01 bar, PI2 discharge 2.02, PI3 filter in 1.74, PI4 filter out 1.31, PDI1 0.42; TI1–TI3 27.0 °C, the primary's still water at 22.0.

- **Shut the filter outlet F1-V2, notch by notch:** 0.6 open: FT1 178.5, PI2 2.03; 0.4: 156.0, 2.07; 0.2: 67.0, 2.18; shut: 0, 2.21 bar (the tank's head plus the whole shut-off head), PDI1 0.
- **Heating on, HS1-V1 open:** FI4 3.07 m³/h, 181 kW; TI2 exchanger out 31.3 °C, TI3 return 27.8, TI4 80.0, TI5 28.9. Throttled to 0.4: FI4 2.19, 133 kW, return 27.6; to 0.2: FI4 0.74, 46 kW, return 27.3.
- **Bypass HX1-V1 shut:** FI2 0, FI3 = FT1 = 104.1 (the exchanger's resistance now carries everything), PI2 2.15.
- **TIME ×600 with the heating on:** the pool from 27.00 to 27.55 °C in 20 real seconds.
- **Pump STOP:** every flow 0, the chasers still; PI2 0.05 (the tank's head behind the non-return valve), PI3 0.03 (the pool's static head); with the hot water still flowing and nothing on the secondary, TI5 rises to 80.
- **RESET SIMULATION**, pressed by its button after the steps above: every valve to its normal notch, the pump running, the heating shut, time ×1, the water at 27.0 °C, the mimic with it; its lamp lights for 2.5 s.

The mimic's readouts are the instruments' own readings from the same model (the gauges ease to them); the overlay names each thing by its tag and says only what its own display shows.

Frame rate on the owner's machine: about 97 fps on high, 106 on medium, 119 on low.

## Camera links

- Hero, the whole plant from the south: `?room=dev51&x=0.2&y=2.6&z=2.6&yaw=355&pitch=-14`
- Wide, from the south wall: `?room=dev51&x=0.5&y=3.0&z=6.0&yaw=0&pitch=-16`
- The pump and its gauges: `?room=dev51&x=-2.2&y=1.55&z=-2.9&yaw=325&pitch=-12`
- The heat exchanger, rotameter and hot-water source: `?room=dev51&x=4.2&y=1.7&z=-1.4&yaw=40&pitch=-15`
- A signpost with its machine (station 4, the filter): `?room=dev51&x=-0.8&y=1.55&z=0.4&yaw=8&pitch=-14`
- The filter outlet valve and FT1, for the first Try-this step: `?room=dev51&x=1.3&y=1.6&z=-2.5&yaw=305&pitch=-32`
- The mimic, square on: `?room=dev51&x=1.6&y=1.65&z=3.2&yaw=180&pitch=0`
- The activity card and RESET: `?room=dev51&x=-2.8&y=1.6&z=3.4&yaw=190&pitch=-8`
- The entrance panel: `?room=dev51&x=-6.3&y=1.65&z=4.1&yaw=270&pitch=0`

## Open questions

1. Placement is by hand, in the water's order, not by `layoutSizedPlantRoom`'s annealing: the route and the camera framings wanted a fixed, readable row. Should the room go through the sizer and placement search instead (it would move the machines with every change)?
2. The pump runs dead-headed for as long as F1-V2 is shut; nothing models its heating up. Should the demo trip it (a thermal cut-out) after a while?
3. With the pump stopped the hot water keeps flowing through the exchanger; a real plant interlocks the heating to the circulation. Add the interlock, or leave it for visitors to discover?
4. The pool's warming is slow at ×1 (about 0.1 K an hour with the heating on); TIME ×600 shows it. Is ×600 enough for the video, or is ×3600 wanted?
