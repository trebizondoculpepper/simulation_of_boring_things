# 107: The pool science museum, five exhibit halls on how a swimming pool works

Status: written 2026-10-28. Stage 1 (the shell: five empty halls joined by archways, their finishes, lighting and signs) is today's work and is built (see "Stage 1, built"). The brand choice and the open questions below wait for the owner; stages 2 to 7 wait for them.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it, above all: the enhanced network is the one source of truth (every room's schematic first, with every valve, its function, normal state and derived tag; the plumber routes the pipes; nothing is drawn that is not in the model); every engineering item is real, working and branded; the inspection overlay says only what a thing's own display, lamp or position shows (no peeking); displays redraw only when what they show changes; all input goes through `src/toolkit/controls/`; `logic/` is pure and tested beside it. Then read `doc/plant-model.md`, `doc/room-layout-guide.md` and mission 106 (`doc/prompts/106-ideal-pool-plant.md`), whose dev51 is this museum's first working exhibit.

## The request

The owner, 2026-10-28: "Consider a series of exhibits in a science museum, all of them collectively about how swimming pools work. We'll rename this room from dev to museum. All the museum rooms will have museum followed by a number. They will all be interconnected rooms with no doors. Imagine a tall-ceilinged, municipal, prestigious science museum. White walls, friendly signage, and a series of exhibits, each one after the other. Five in total. Connected rooms that you can wander through from one space to the next, that teach the principles of how a swimming pool works … from basic to advanced … Everything using idealised sources … each modelled as a separate room, but each would allow you to walk from one to the next."

And: "Yes, I love that concept. We'll need to create a brand for this exhibition, and we can use our industrial ceiling generator as decoration. Start planning out each of those rooms. And yes, reuse Dev 51 as one of the exhibit spaces in this museum."

Then, bringing the first step forward: "Begin by actually defining this as a mission. Let's create the spaces first, and we can resize them later. I just want the interlinked rooms with the museum style signage. Put some signage in the empty rooms describing what each exhibit will show. And the test is that we can walk between the exhibit halls."

**The look (the owner, 2026-10-28).** The museum is a converted warehouse in an industrial quarter of an important city, East Berlin or Manchester in spirit, and keeps that character: high white-painted walls (painted brick or plaster) and a polished concrete floor with a soft sheen, faint trowel marks and saw-cut joints; its industrial bones left showing, exposed steel roof trusses or cast-iron columns, the industrial services ceiling (cable trays, ducts, sprinkler pipes) high overhead, and perhaps tall factory windows or north-light roof glazing letting in daylight; archways knocked through the old brick walls between bays; and a clean gallery fit-out: museum signage, gallery track lighting, benches. For now this is window dressing only: the spaces, the architecture, the finishes, the lighting and the signs, no exhibits. Cheap on the low and medium graphics presets (mission 087) and within the component budgets (mission 094).

## The five halls (agreed with the owner)

1. **Museum 1, "Moving water": circulation.** An ideal pool spilling over its edge into a balance tank, one pump, pipes and valves. It teaches flow, pressure, the pump curve, throttling and turnover. Visitors throttle a valve to see the flow fall and the pressure rise, and stop the pump to see the pool's level and its overflow.
2. **Museum 2, "Clean water": filtration and backwash.** This is dev51 (`?room=dev51`, mission 106), reused: the sand filter, its fouling, differential pressure, the five-valve backwash and the sight glass.
3. **Museum 3, "Warm water": heating and energy.** An ideal heat source, a heat exchanger, the pool losing heat (evaporation above all), a pool cover, the kWh meter and what it costs, and heat recovery if it earns its place.
4. **Museum 4, "Safe water": disinfection and chemistry.** The chemistry model (`src/game/water/pool-chemistry.ts`, `circuit.ts`, `chemistry-bench.ts`, `src/game/plant/water-treatment.ts`) on an ideal pool: free and combined chlorine, pH, bathers' pollution and breakpoint; a dosing controller (mission 105's Chlorella CX-7 or DC-1, `dosing-controller.ts`) with its sample cell and metering pumps (mission 102's family); a DPD test kit; the bench's problem-and-treatment scenarios as activities.
5. **Museum 5, "The whole plant": control and fault finding.** Halls 1 to 4 joined into one small working plant, with a mimic, an annunciator and alarms, and a "cause a random fault" button so visitors diagnose and put it right: the game in miniature, and the finale.

## The brand

Both the museum and the exhibition are our own invention: no real museum, gallery or exhibition is named, imitated or echoed (in particular not Manchester's Science and Industry Museum, the Deutsches Technikmuseum, the Science Museum or any real "engine shed"). Three options for the owner; stage 1 uses option A as a working brand, defined in one place (`src/toolkit/gallery/logic/museum-brand.ts`) so a choice is one edit, and no sign says it is provisional.

|              | A (working brand)                                                                                                     | B                                                                          | C                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Museum       | **The Dyehouse, Museum of Science and Work**: a converted dye works                                                   | **Spreewerk, City Museum of Science**: a riverside works, Berlin in spirit | **The Bonded Warehouse Science Hall**: a customs warehouse, Manchester in spirit   |
| Exhibition   | **Making a Splash**                                                                                                   | **Behind the Deep End**                                                    | **Water Works**                                                                    |
| Strapline    | How a swimming pool works                                                                                             | The hidden machine that keeps a pool swimmable                             | Clean, warm, safe: the science of the swimming pool                                |
| Logo concept | A water drop whose inside is a loop of two arrows (the water going round), three orange strokes of splash at its foot | A pool ladder's two handrails curling over into a "D", water lines below   | Five concentric ripples, each numbered as a hall, the outermost broken by an arrow |
| Palette      | Pool blue `#0b6fa4`, signal orange `#f26b21`, ink `#14212b`, gallery white `#fbfaf6`, pale blue `#dcecf4`             | Deep teal `#0e5c63`, lane-rope red `#d23c2f`, lane white, ink              | Chlorine yellow `#f2c230`, navy `#1d2f5c`, white, slate                            |
| Type         | A rounded geometric sans, bold headings, plain sentence case (after Avenir or Nunito)                                 | A grotesque in capitals for titles, a humanist sans for text               | A slab serif for titles, a plain sans for text                                     |
| Tone         | Friendly, family                                                                                                      | Curious, a little knowing                                                  | Civic, confident                                                                   |

**In code.** `src/toolkit/components/core/logic/brands.ts` is the makers' catalogue (each a `Brand`: id, name, tagline, founded, country, what it makes, promise, `BrandMark`, three colours, wordmark type), drawn by `brand-logo.ts` from its `mark`. Once the owner has chosen, add the museum as a brand there (id `dyehouse` for A; `makes`: "Exhibitions and the museum's own fit-out"; a new `BrandMark`, `'drop-loop'`, drawn in `brand-logo.ts` beside `ripple`, which it resembles but is not), and the exhibition's identity stays in `museum-brand.ts` (its sign palette and type, which a maker's three colours do not cover), reading the museum's name and colours from `BRANDS`. Exhibit cases, lecterns and RESET pedestals are the museum's own make; plant inside exhibits keeps its makers (Grundflow, Kessler-Moody and the rest), and mimics stay Penfold's (CLAUDE.md).

## The architecture

**One hall, one room, one scene.** Each hall is its own room (`museum1` … `museum5`), built by `src/toolkit/gallery/rooms/museum-hall-room.ts` from `src/toolkit/gallery/views/museum-hall.ts`, its plan pure in `src/toolkit/gallery/logic/museum-plan.ts` (tested). Each hall's size is one constant (`MUSEUM_SIZES`, provisional: 18 × 24, 16 × 22, 16 × 20, 16 × 22 and 20 × 26 m, 9.5 m to the roof deck). They stand in a row running north, every one centred on x = 0, joined by shared 0.6 m brick walls, each with a round-headed archway 3.6 m wide, 5.2 m to its crown, in its middle.

**The hand-over, recommended: the pool loop's way, through the joints of `door-joins.ts`.** Each hall registers a lazy joint at each archway (its frame on the shared wall's middle line, +z into the hall), open only for the archway the visitor is in or about to cross, or else the one most nearly ahead (`archToSee`, with hysteresis), since `src/main.ts` draws one room beyond at a time; crossing the middle line hands the visitor over (`crossedInto` → `enterDevRoom(…, through)` → `handOver`), its eye, heading and zoom carried through. The other archway shows a plain stand-in of the hall beyond (white plaster, the same floor), rarely seen. Lazy joints build both neighbours while a hall is shown and let them go when not next door. Shared walls of one scene (the `facility-plan.ts` idea CLAUDE.md names) were the alternative; rejected because the owner asked for each hall as its own room and scene, and because one scene of five halls would cost all five on every frame and grow with every exhibit.

**No perspective jump.** Today's fix for the pool loop (`8656cf1`: the corridor's tile laid alike in both scenes from the corridor's own frame, and `handOver` carrying the zoom) is applied by construction: both halls at an archway build its wall from the same function at the same width (`sharedWallWidth`, the wider hall's), so its geometry and its brick's UVs are identical in both scenes; the floor's concrete bays are laid from the museum's own origin (`hallOrigin`), so their saw cuts meet across the archway; the daylight and hemisphere light are the same in every hall; and `handOver` carries the zoom. Tested: each archway's frames meet at the same museum point and face each other, and `throughDoor` carries any pose to the same museum point both ways.

**The ceiling.** The procedural services ceiling (`createServiceCeiling`, `src/toolkit/components/site-dressing/`) over every hall, on its metal deck, its two steel cellular beams at ±w/4 (`beamEvery` half the width), kept clear of the cast-iron columns' heads, at density 0.8.

**The finishes and fit-out.** Painted old brick walls (a canvas texture, three bricks along and eight courses up, faces painted, the reveals of the knocked-through archways and the windows left bare red brick); polished concrete (roughness 0.32, soft clouding, faint trowel arcs, aggregate specks, saw cuts on a 4 m grid); cast-iron columns in two rows under the beams every 6 m, clear of the axis through the archways; tall segmental-headed factory windows of obscured (glowing) glass with steel glazing bars on each west wall, and daylight from the west; gallery track lighting, two tracks per hall with heads every 2 m, and four warm pools of light; oak benches on black steel; the title wall in Museum 1 washed by a spot.

**The signs** (`museum-hall.ts`, painted once on canvases, set decoration): over each archway on its approach side the hall it leads to ("NEXT EXHIBIT · 2 · Clean water · Filtration and backwash", an arrow on); over the archway back, the hall before ("BACK TO · 1 · Moving water"); each hall's number and title big on its east wall as gallery vinyl; Museum 1's south wall the exhibition's title wall (the mark, name, strapline, an introduction, the route 1 to 5 and the museum's name); Museum 5's north wall the end of the route; and in each hall, for now, a free-standing "Exhibit coming soon" panel (what the exhibit will show, the big idea, what visitors will be able to try, the route with "You are here"). The words are data in `HALL_BRIEFS`.

**Later, each hall gets** a RESET SIMULATION pedestal (dev51's, `museum-exhibit.ts`) and a pool clock (`architectural/views/pool-clock.ts`) on its plant time, and the route's number on the floor at each archway.

**Naming and access.** `?room=museum1` … `?room=museum5` (in `ROOMS`, `DEV_ROOM_NAMES`, `DEV_ROOM_COLOURS`, `src/main.ts`'s room starter, and Museum 1 listed on the dev panel in `index.html`). Dev51 becomes Museum 2 in stage 3; its old link must keep working: `resolveRoomId` maps `dev51` to `museum2` (an alias table in `dev-room-links.ts`, with a test), so a Reddit link lands in the exhibit, and dev51's own files stay its own until then (another session is working in them).

**Performance.** Each hall draws two scenes while an archway is seen through (itself and the hall beyond), as the pool loop does. The halls' geometry is merged by material (columns, tracks, benches, glazing bars; the services ceiling merges its own), with no shadows; the passes follow the preset (`followEffectSettings`: AO and bloom off or cut on low and medium). Budgets (mission 094): each hall's draw calls and frame time measured on high, medium and low, and the services ceiling's density cut on low if it is the cost.

## Each hall in detail (stages 2 to 6)

Every hall's exhibit follows mission 106's pattern: an ideal-source schematic first (`src/game/plant/museum-<n>-….ts`, tested: nodes, links, every fitting given with its function, normal state and derived tag, the plumber adding nothing); the layout and plumbing by the router; a Penfold mimic captioned as the map; lecterns with a headline, the key idea, one memorable fact and a "Try it" box; visitor controls tagged PUSH or TURN; the RESET pedestal; the overlay on every machine, valve and instrument; tags derived (`M1-P1`, `M1-P1-V1`, `M1-FT1`). Each hall's state is its own (fresh on load, as the dev rooms), not the world's.

### Museum 1, "Moving water"

- **Schematic.** Ideal pool IP1 (a reservoir at its overflow head, its level shown) spilling by gravity over its edge (an overflow weir, unvalved) to the ideal balance tank BT1; pump P1 (Grundflow NKC, on its curve) drawing through suction valve V1, discharging through its non-return valve and a throttling butterfly V2 on a notch plate; the return to the pool's inlets; a bypass back to the tank through V3 (to show recirculation without the pool). Instruments: PI1 suction, PI2 discharge (dial gauges), FT1 (Kessler-Moody mag meter), LI1 (the tank's sight gauge), LI2 (the pool's level on a staff gauge), the pump's kW (a moving-coil wattmeter on its starter).
- **Mimic.** The loop with lit flow lines, the pump's RUN lamp, V2's opening, FT1, PI2, and a live pump curve: a small X–Y plotter (a real component: pen on a duty point) tracing head against flow as V2 is throttled.
- **Panels.** "Round and round": a pool's water is never still. Key idea: a pump trades flow for pressure; close a valve and the pressure rises as the flow falls. Fact: a 25 m pool's whole volume goes round its plant every three or four hours, about six times a day. Try it: throttle V2 notch by notch and watch the dot climb the curve; stop the pump and watch the tank fill as the pool stops spilling; open the bypass and see where the water goes.
- **Teaches, and leads on.** Flow, head, the pump curve, throttling, turnover, why there is a balance tank. "All that water carries dirt: next, how we take it out."
- **Reuses.** `ideal-pool.ts`, `balance-tank.ts`, `solveNetwork` and `solveWithDeadEnds` (106), `throttle-valve.ts`, the Grundflow pump view, the mag meter, dial gauges, `museum-exhibit.ts`.
- **New.** The overflow weir as a visible ideal (a sheet of water over the edge, its thickness from the flow), the pool's staff gauge, the X–Y pump-curve plotter.
- **Acceptance.** Every valve throttles and the readings follow the curve (tested numbers); stopping the pump drains the weir and fills the tank by the pool's surge volume; RESET restores; the overlay shows only displays; frame rate within budget on all presets.

### Museum 2, "Clean water" (dev51)

- **Schematic, instruments, mimic, panels:** dev51's as mission 106 built them (pool, tank, pump, sand filter F1 with its five-valve nest, PDI1, the sight glass, the heat exchanger, the heat meter, the pool clock, the dead-head trip and the heating interlock).
- **Moving it in (stage 3).** The museum hall's shell (walls, ceiling, signs, archways) wrapped round dev51's plant, scaled to it; dev51's room module started inside `museum2`, its entrance panel restyled to the brand; the alias `dev51` → `museum2`; Museum 1's lessons not repeated. Whether its heating moves to Museum 3 is the owner's question 2.
- **Teaches, and leads on.** Filtration, fouling and differential pressure, backwash. "Clean water still has to be warm enough to swim in."
- **New.** Nothing beyond the shell and the alias.
- **Acceptance.** Every mission 106 reading unchanged in the hall; the old link lands in Museum 2; the handover works at both its archways.

### Museum 3, "Warm water"

- **Schematic.** An ideal LTHW source HS1 (fixed flow temperature) through a motorised valve and a plate heat exchanger HX1 (ε–NTU, `pool-heating.ts`), the pool loop's secondary through it; the pool as a thermal mass losing heat by evaporation (`evaporation.ts`), convection, radiation and conduction, each loss shown; a motorised pool cover (a real component: a roller with its motor, limit switches and a key switch) that cuts evaporation; the ultrasonic heat meter HM1 (Splashonomics) and a tariff display turning kWh into money; heat recovery as a run-around coil from the hall's exhaust air, if the owner wants it (question 4).
- **Instruments.** Thermometers on both sides of HX1, the pool's temperature on a big digital display, a hygrometer for the hall air, the heat meter, a "losses" bar meter of four moving-coil meters (evaporation, convection, radiation, conduction).
- **Mimic.** Both circuits, the cover's position, each loss in kW.
- **Panels.** "Keeping it warm". Key idea: most of a pool's heat leaves from its surface as water evaporates. Fact: an uncovered 25 m pool can evaporate a bath of water every hour or so. Try it: heat the pool and watch it warm; close the cover and watch the evaporation meter fall; read the meter and the tariff.
- **Teaches, and leads on.** Heat transfer without mixing, where the heat goes, what it costs. "Warm water is perfect for bacteria too: next, keeping it safe."
- **Reuses.** `pool-heating.ts`, `heat-loss.ts`, `evaporation.ts`, the plate exchanger view, dev51's heat meter and kettles sign.
- **New.** The pool cover, the losses meter bank, the tariff display.
- **Acceptance.** The losses add up to the heat balance (tested); the cover's saving is the evaporation model's; RESET; budgets.

### Museum 4, "Safe water"

- **Schematic.** An ideal pool with the chemistry model's state (`pool-chemistry.ts`, one well-mixed water or the circuit's cells), its circulation through a sample tapping to a sample cell (`sample-cell.ts`) and a Chlorella controller (the DC-1 pair, the hands-on one, or the CX-7: question 5), driving a Grundflow DMX 1602 (hypochlorite) and a DDS 7.5-16 (acid) from day tanks; bathers as an ideal source of pollution (a dial of swimmers); a Chlorella PT-3 photometer and a DPD test kit on a bench, with the sample tap.
- **Instruments.** The controller's own displays, the pumps' own displays, the photometer, a big free/combined chlorine and pH board (moving-coil meters with green bands), a turbidity meter.
- **Mimic.** The loop, the sample line, the dosing points, each pump's stroke lamp, free and combined chlorine and pH.
- **Panels.** "Just enough chlorine". Key idea: chlorine is used up by swimmers, and works best at the right pH. Fact: the "chlorine smell" at a pool is not chlorine but chloramines, made when chlorine meets sweat and urine, and it means too little chlorine, not too much. Try it: test the water yourself; send in a crowd and watch the controller answer; solve a challenge card.
- **Activities.** The bench's scenarios (`SCENARIOS` in `chemistry-bench.ts`: combined chlorine, low alkalinity, high pH, acid overdose, low hardness, high TDS, dechlorination, weak delivery, loss of dosing, faecal incident) as challenge cards: a lectern button sets the problem, the visitor diagnoses by test kit and controller, treats (a hand dose, a setpoint, a superchlorination, dilution), and the card says how it went.
- **Teaches, and leads on.** Disinfection, pH, breakpoint, control loops. "You have met every part. Now run the whole plant."
- **Reuses.** `pool-chemistry.ts`, `circuit.ts`, `chemistry-bench.ts`, `water-treatment.ts`, `dosing-controller.ts`, `dc1-face.ts` or `cx7-hmi.ts`, `sample-cell.ts`, `dosing-pumps.ts`, dev44's sample-cell panel and photometer.
- **New.** The DPD test kit as an item (comparator, tablets, the colour), the bathers dial, the challenge cards.
- **Acceptance.** Each challenge reproduces its bench scenario's numbers (tested); the controller's readings are the model's through ideal probes; no overlay peeking at the water.

### Museum 5, "The whole plant"

- **Schematic.** Halls 1 to 4 joined, single everything: pool, tank, pump, filter with backwash, heat exchanger, sample cell and controller, two dosing pumps.
- **Control.** A Penfold mimic of the whole plant, a Benfield-style annunciator (mission 099's location annunciator) with its ACCEPT, SILENCE and RESET, and the alarms' sounder; local controls stay at each machine (CLAUDE.md: the fault is put right where it is).
- **The fault button.** A big museum pedestal "CAUSE A RANDOM FAULT" (a key switch for the attendant to choose one, too): a pure fault model picks from a list (a blocked strainer, a filter needing a backwash, a tripped pump, a stuck valve, a heating valve failed shut, a dosing pump out of chemical, a sample flow fail, a drifted probe), each with its symptoms on the plant's own instruments and alarms and its correct fix; a scoreboard of time to diagnose and fix.
- **Panels.** "Running the plant". Key idea: a plant tells you what is wrong, if you read it from cause to effect. Fact: a real pool plant room is often run by one person on a shift. Try it: press the button, read the alarm, find it, fix it, reset.
- **Teaches.** Diagnosis; the game in miniature. The end of the route, and the way back.
- **Reuses.** Everything above; `annunciator.ts`, `location-annunciator.ts`, `pump-deadhead.ts`.
- **New.** The fault model and its pedestal, the scoreboard.
- **Acceptance.** Every fault is reachable, shows on the plant's own instruments, and is fixed only by its fix (tested); RESET clears; budgets.

## Delivery, in stages

1. **The shell (today, built):** five halls, archways, hand-over, finishes, lighting, signs, access, the logic test and a walk 1 → 5 and back in the browser. Small to medium.
2. **The brand chosen:** the owner's choice into `museum-brand.ts` and `brands.ts` (`BrandMark` and its drawing), the signs repainted. Small. Can run beside 3 to 6.
3. **Museum 2, dev51 moved in:** when mission 106's session has finished with dev51. Medium. Independent of 4 to 6.
4. **Museum 1, "Moving water".** Medium (the overflow weir and the plotter are new). Independent.
5. **Museum 3, "Warm water".** Medium. Independent, but after the owner's question 2.
6. **Museum 4, "Safe water".** Large (the challenge cards and the test kit). Independent.
7. **Museum 5, "The whole plant":** after 3 to 6, since it joins them. Large.

Stages 3, 4, 5 and 6 can run in parallel in separate sessions: each touches only its own hall's files (and adds its own lines to `museum-plan.ts`'s briefs and sizes, which merge easily). Stage 7 waits for them. Each stage: its schematic and tests first, then layout, mimic, panels, the room; browser checks on high, medium and low; screenshots and camera links in this prompt; TODO and CHANGELOG.

## Stage 1, built (2026-10-28)

- `src/toolkit/gallery/logic/museum-plan.ts` (pure, tested in `museum-plan.test.ts`): the halls, their provisional sizes, the briefs, the archways and their frames, the museum origin, the walking solids (a stop at each archway's middle until the hall beyond is seen through it), the hand-over line (`crossedInto`), which archway to see through (`archToSee`), arrivals and starts.
- `src/toolkit/gallery/logic/museum-brand.ts`: the working brand (option A).
- `src/toolkit/gallery/views/museum-hall.ts`: the hall as above; `src/toolkit/gallery/rooms/museum-hall-room.ts`: its scene, lights, passes, walker, joints and hand-over.
- Registered in `dev-room-links.ts`, `src/main.ts` and `index.html`.
- The test, in logic: each archway leads to the next hall and back, its two frames at the same museum point facing each other, `throughDoor` carrying any pose to the same museum point both ways; the hand-over only on crossing the middle line within the archway; the stop until seen; the axis clear. In the browser: walked 1 → 5 and back (below).

## Browser checks (2026-10-28)

- **The walk.** From Museum 1 to Museum 5, walking north along the axis, and back to Museum 1 walking backwards: every archway handed over on its middle line (the visitor's position continuous across each, for example Museum 2 at z = 10.34 m to Museum 1 at z = −11.49 m a second later), the hall beyond drawn through the archway before it was reached, and the far archway switching from its stand-in to the next hall as soon as the visitor was clear of the last.
- **No jump.** Screenshots either side of the Museum 1 → 2 hand-over show the same framing and zoom; the archway's wall, bare brick reveal and floor joints match, as the logic test requires. Signs stand 12 mm off their walls and the panel's face 8 mm off its board, so nothing z-fights at distance.
- **Cost.** Looking through an archway (two scenes drawn): 67 fps on high (AO and bloom on) and 120 fps, the display's limit, on low, on the owner's machine with other sessions running.
- **A gotcha for scripted walks.** A hall built after a key went down never heard the keydown, so a walker handed into it stood still until the key repeated; real keyboards repeat, so play is unaffected.

Camera links:

- Museum 1's title wall: `?room=museum1&x=0&y=1.6&z=-2&yaw=180&pitch=6`
- Museum 1 towards the archway, Museum 2 and Museum 3's sign seen through it: `?room=museum1&x=-1&y=1.6&z=9.5&yaw=0&pitch=8`
- Standing in the Museum 1 → 2 archway, mid-crossing: `?room=museum1&x=0.5&y=1.6&z=-12.2&yaw=-35&pitch=4`
- Just before the hand-over: `?room=museum1&x=0.6&y=1.6&z=-12.1&yaw=20&pitch=6`
- Museum 2's coming-soon panel: `?room=museum2&x=-3&y=1.6&z=6&yaw=345&pitch=0`
- Museum 3: `?room=museum3&x=-1&y=1.6&z=7.5&yaw=0&pitch=8`
- Museum 4, Museum 5's end wall through the archway: `?room=museum4&x=-1&y=1.6&z=8.5&yaw=0&pitch=8`
- Museum 5 and the end of the route: `?room=museum5&x=1&y=1.6&z=10.5&yaw=0&pitch=6`

## Open questions for the owner (ask one at a time, in this order)

1. **The brand.** A ("Making a Splash" at The Dyehouse), B ("Behind the Deep End" at Spreewerk) or C ("Water Works" at the Bonded Warehouse Science Hall), or a mix?
2. **Dev51's heating.** Move it to Museum 3, leaving Museum 2 purely clean water, or keep it in Museum 2 (it works today, and Museum 3 then goes deeper into losses and the cover)?
3. **A sixth hall on air?** Evaporation, humidity, dehumidification and chloramines in the air: a "Fresh air" hall between Safe water and The whole plant, or leave air out?
4. **Heat recovery in Museum 3:** worth a run-around coil from the exhaust air, or keep Museum 3 to the pool, the cover and the meter?
5. **Museum 4's controller:** the Lounge's DC-1 pair (hands-on, period) or the Olympic's CX-7 touch screen?
6. **Museum 5's faults:** visitors' random only, or also an attendant's key switch to choose one (for a demonstration)?
7. **The sizes:** the halls at 16–20 m by 20–26 m and 9.5 m tall are provisional; resize now, or once each exhibit is laid out?
