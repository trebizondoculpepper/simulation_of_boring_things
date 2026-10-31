# 114: The Aqualis dosing controller and Dr Aqualis

The owner, 2026-10-31: the plant has long needed a visible chemical dosing computer, and it now has its maker. Aqualis Interactive, the brand made for Hall 4's ClearDose Studio console (mission 113) and the company that sponsors that exhibit, also makes chemical dosing systems. Agreed over several rounds of questions; nothing is built yet. Read the root `CLAUDE.md` first (the plant model, the enhanced network, the period rule, local-only controls, alarms on both control rooms, displays redrawing only on change, input through `src/toolkit/controls`), then `doc/plant-model.md`, `doc/room-layout-guide.md` and `doc/design/control-interface-archetypes.md`. Mission 113 (`doc/prompts/113-hall-4-dosing-console.md`, its plans in `doc/plans/113/`) holds most of the parts this mission reuses.

## What it is

An Aqualis dosing controller of the early 2000s: a white cabinet, mostly touch-screen controlled, with an LCD monitor, in the Windows Vista era's look. It is a real working component modelled on real pool controllers of the period, bound to its pool's model like every other machine; a touch screen is allowed under the period rule because it brings its own kind of interface, and the plant around it keeps its single-purpose instruments.

- **Sampling loop**: it draws water from its pool's circulation through a sampling loop and returns it to a re-injection point downstream; both are connections in the room's schematic, routed by the plumber like any other pipe.
- **Analysis (deliberate science fiction)**: until the chemical test kits exist as items, the controller's analyser measures every reading itself: free, combined and total chlorine, pH, total alkalinity, calcium hardness, the balance index (LSI), TDS, sulphate and temperature. This is a stated exception to the no-peeking rule (`overlay-no-peeking`): do not "fix" it by making the analyser blind to readings real probes cannot measure. When test kits arrive, the owner will decide whether it keeps this power.
- **Dosing it controls**: only sodium hypochlorite and acid. In the game world these are the only chemicals dosed automatically; it drives those two dosing pumps. Every other chemical (sodium bicarbonate, soda ash, calcium chloride, thiosulphate, dilution with fresh water and the rest) is dosed by hand.
- **HAND · OFF · AUTO**: a traditional three-position selector on the cabinet itself, a local control (it stays on the cabinet, not the control-room boards). AUTO: the controller holds free chlorine and pH at their set points by driving the hypochlorite and acid pumps. HAND: the player runs those two pumps from the touch screen. OFF: no dosing. In every mode it measures, alarms and advises.
- **Alarms**: it reports to its pool's mimic and to the annunciator with water-composition warnings (chlorine low or high, pH out, combined chlorine high, balance aggressive or scaling, and so on), shown on the old control room and the bridge as the alarms rule requires. Its warnings need a failure model before they say more than on and off (`status-words-need-failure-model`).
- **Where**: one for the Olympic pool and one for the Lounge pool (the owner called it "the lazy pool"; confirm which pool is meant before installing). Model and try it in a development room first, as every new piece of equipment is, and try its screens on their own before it goes into the plant rooms. The Olympic plant is partly automated and the Lounge mostly manual (`varied-automation`): expect the Olympic's controller to live in AUTO and the Lounge's to be run more by hand.

## Its screen and Dr Aqualis

The interface leans into early-2000s skeuomorphism: brushed metal and glass, glossy buttons, gauges drawn as dials, tabbed panels; the Frutiger Aero widget kit in `src/ui2d/aero/` is the starting point, extended as needed.

- **Diagnosis and direction, not prescriptions** (the owner chose this): the advice says what is wrong and which chemical puts it right ("Alkalinity low (62 mg/l): the pH will be unstable. Raise the alkalinity with sodium bicarbonate."), not how much. A **Show dose** button reveals the exact amount for anyone stuck, worked out through the real chemistry model at the pool's real volume (the Hall 4 dose table and solver, `src/game/plant/museum-4-doses.ts`, `museum-4-solver.ts`, are the place to start; the amounts belong in that chemical's own unit). Advice for hand-dosed chemicals points at where they go: the balance tank, or the pool itself.
- **Dr Aqualis**, an animated helper in the spirit of Microsoft Agent, an original character and not a copy of any Microsoft one: the Aqualis water-drop logo come to life, a glossy, blobby blue droplet in a white lab coat with a head mirror and a stethoscope. He gives the advice in speech bubbles. Animations, at no more than 10 Hz and redrawn only while they play: idle (a gentle bob), concerned (a frown, tapping his clipboard), alarmed (wide eyes, a little jump), pleased (a thumbs up when the water is good), pointing (at the reading his advice is about).
- **Readings**: every reading the analyser has, with its band, the set points for chlorine and pH, the two pumps' state, and the selector's position.

## The hand-dosing game to come (not this mission)

Later, a separate mission: the player picks up containers of chemicals into an inventory, carries them, and adds them to a balance tank or straight into a pool. The controller's advice is written for that game ("add sodium bicarbonate to the balance tank"); until it exists, hand doses can be given the way Hall 4 gives them, or by a stand-in the implementer proposes to the owner first.

## Order of work

1. A plan, critiqued (as mission 113 did, `doc/plans/113/`), with the owner asked one question at a time about anything not settled here.
2. Pure, tested logic: the controller's state, AUTO control of chlorine and pH, HAND and OFF, the diagnosis rules and their advice texts, the Show dose amounts, the alarm conditions.
3. The cabinet and its screens in a development room, with Dr Aqualis and his animations; benchmarked (`bench.html?bench=components`) and within budget.
4. The sampling loop, the re-injection point and the two dosing pumps in the room's schematic, plumbed; the alarms on the mimic, the annunciator and both control rooms.
5. Installed for the Olympic pool and the Lounge pool.

## Open questions for the owner

- Which pool "the lazy pool" is (the Lounge pool assumed).
- Which acid the automatic acid pump uses (hydrochloric acid, sodium bisulphate solution, or CO₂ where a pool has it).
- The set points and dead bands for AUTO, and how fast it doses.
- Whether Dr Aqualis speaks (narrated clips) or only shows speech bubbles.
