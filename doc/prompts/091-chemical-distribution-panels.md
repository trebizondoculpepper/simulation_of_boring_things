# 091: WH-CP1 replaced by two modern chemical distribution panels

Status: in progress. Stages 1 to 3 built in the dev rooms only (2026-10-27, `5f64d77`, `3b2f63d`, `b8bbdb7`), finished and polished for the owner's look at dev44 (2026-10-28, see "For the owner to look at" below), awaiting that look; the wet hall, the world and WH-CP1's retirement are a later step (the owner, 2026-10-27: "mostly a design task", nothing in the real game world yet). Designed 2026-10-27, with the owner's answers (terminals and a control box agreed the same day). The second mission after [089](089-layout-improvements.md).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply: real, working, branded engineering items bound to the world; new controls tried on dev0's boards and control assemblies in dev39 first; all input through `src/toolkit/controls/`; pure logic in `logic/` folders with tests; a world shape change bumps `WORLD_VERSION` (45 when this was written) with a migration. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27, of WH-CP1, the wet hall's chemical distribution panel: "Can you make it show the quantities in litres rather than %. I think I want to change this to 2 modern style control panels, each with a 2-line LCD display. One control panel for hypochlorite, one for acid, but both working the same way. Perhaps buttons: Mode (cycles between monitor, set, command); Back (cancels, steps up the menu); Select (chooses an item); D-pad (up, down, left, right). I can cycle between pumps by pressing left and right. Choosing select enters the menu for that pump: I can set the tank high/low. In command mode I can set it to fill now, or stop."

Owner's answers (2026-10-27):

- Left and right step through the **day tanks** (PL1 lounge, PL2 Olympic, PL3 jacuzzi, PL4 footbath, and the store), not the dosing pumps.
- **STOP inhibits** the tank: it is not filled, even when it calls at low, until put back in service; a fill in progress stops too.
- **Litres only on the new panels**: the old panel's meters are not re-scaled; they go when it is replaced.
- **Wet hall only**: the panels replace WH-CP1 in the wet hall; the control room keeps what it shows now. Setting levels and commanding fills means going to the wet hall.

The owner, 2026-10-27, on how it is built: "a lightweight plastic control panel which is just the user interface. It will link to a control box, elsewhere in the room, which contains the main electronics." And the answers that followed:

- **One control box for both chemicals**, a single point of failure: its supply lost, both lines stop.
- **The box decides in AUTO**: each transfer selector in AUTO opens the outlet the box tells it; HAND on the selector still overrides locally, so a line can be filled by hand with the box dead (a remote/local arrangement).
- **At the box**, the player can switch it off and on at its door isolator (a restart that clears a hung controller), open its door to read its controller's RUN, STOP and FAULT and I/O LEDs live, and reset its MCB if it trips. No keypad inside: the terminals are the only way to read and set it.

## What there is now (checked 2026-10-27)

- WH-CP1 is `createDistributionPanel` (`src/toolkit/components/plant/views/chemical-handling-kit.ts`), Penfold Controls', the `chem-panel` node of `transferSelectors()` (`src/game/plant/schematic-parts.ts`), placed on the wet hall's south wall (`CHEM_AT.wet_hall`, `room-equipment.ts`), 1.6 × 1.1 m, bound by `chemicalModel` (`src/toolkit/gallery/views/chemical-distribution-views.ts`, `readDistribution`). A section per chemical: the store's contents and four day tanks' levels on moving-coil meters as a share of full, an outlet lamp lit while served, the selector's AUTO and HAND, the pump's RUN, IN AUTO and TRIP; an annunciator across the top (a day tank low, a line tripped, a store low) with ACCEPT, RESET and LAMP TEST. It only shows.
- The model (`src/game/plant/chemical-distribution.ts`, `world.distribution`): per chemical, one transfer pump at its store (HAND · OFF · AUTO, at the store), one six-way selector on the wet hall's dirty side (AUTO serving calls in turn, or HAND on a picked outlet), and four day tanks (hypochlorite 300, 1,000, 60 and 30 L; acid 60, 500, 30 and 15 L). A tank calls at a fixed low (20%) and stops at a fixed high (90%) (`DISTRIBUTION`); any tank's high-high (98%) trips the line until RESET.
- Two-line LCDs exist to reuse (the DoseCell head's 16 × 2, `liveLcd` in `dosing-equipment.ts`, the balance tank panel's), and push buttons (`createPartSet`, `pushButton`).

## Design

**Two terminals** side by side where WH-CP1 is, one for hypochlorite (yellow band) and one for acid (red band), identical but for their chemical: Penfold Controls' operator terminal of the 1990s to early 2000s (the owner, 2026-10-27; after the Siemens OP3/OP7, the Allen-Bradley DTAM Micro and the Mitsubishi FX-10DU), a light grey moulded case about 200 × 140 × 50 mm screwed to the wall at eye height, Penfold's mark; a 16 × 2 character STN LCD, yellow-green with an LED backlight; a membrane keypad with tactile domes and printed legends: F1 MON, F2 SET, F3 CMD (one key per mode), ESC, ENTER and four separate cursor keys ▲ ◀ ▼ ▶ in an inverted T, as on a PC keyboard of the time (no D-pad: a later, video-game idea, the owner); RUN, CALL and ALARM LEDs; one cable gland underneath, its cable in conduit to the box. No logic in it: it shows what the box sends and sends back its keys. With the box unpowered it is blank; with its link broken it shows `NO COMMS`. Its tag derived from the model, not written by hand (the two terminals and the box each a node).

**The control box** on the wall near the transfer selectors, on the dirty side: a steel enclosure about 600 × 400 × 200 mm, Penfold Controls', its door isolator on the front; inside on DIN rail an MCB, a 24 V power supply, the controller (a small PLC, after a Siemens LOGO! 8 or S7-1200) with its RUN, STOP and FAULT LEDs and an LED for every input and output, a comms module for the terminals, interposing relays for the selectors' outlets and the transfer pumps' remote run, and terminals for the day tanks' level signals; a wiring diagram in the door's pocket. It holds what matters: each tank's low and high levels and its inhibit and fill-now (kept through a power cut, in the world), and the serving logic (which tank in turn). Its door opens; its LEDs are live; its isolator and MCB work.

**In the model**: the schematic gains the two terminals and the box: data links terminal to box, control links box to both selectors and both transfer pumps (remote run), signal links from the eight day tanks' level heads to the box, and power from the wet hall's board to the box. The selectors in AUTO follow the box; in HAND they follow their own pick, box or no box. The pumps' HAND · OFF · AUTO and the trip resets stay at the stores (local). Faults the arrangement gives: the box unpowered (both terminals blank, AUTO filling stops on both lines, HAND still works), its MCB tripped (likewise, the cause found inside), a terminal's link broken (that terminal `NO COMMS`, the other carries on).

### The interface (the owner, 2026-10-27)

Defined for these two terminals only (the owner: "really just this"); the older Penfold panels are not retrofitted. The same on both, one per chemical. Pure logic, a state machine in a `logic/` file, with tests of every key in every state.

**Items.** HYPO LINE (or ACID LINE), the line's summary; STORE; PL1 LOUNGE; PL2 OLYMPIC; PL3 JACUZZI; PL4 FOOTBATH.

**Screen.** 16 × 2 characters. The top line names what is shown, its mode in the last three characters (MON, SET, CMD). The bottom line its value and state. A `>` in column 1 marks the line ▲ ▼ act on; a blinking block cursor marks a figure being edited. Quantities in litres, never per cent.

**Keys**, the same meaning everywhere:

- **F1 MON, F2 SET, F3 CMD** go straight to that mode, abandoning any edit.
- **◀ ▶** step through the items, wrapping, whenever not inside an item's menu.
- **▲ ▼** step through an item's lines, or change a figure being edited; held, they repeat, faster after 2 s.
- **ENTER** goes into the item, starts an edit, stores it, or confirms.
- **ESC** cancels an edit or goes up a level; at the top it does nothing.

**F1 MON, monitor: read only, focused on what is active.**

- Home is what is active (the owner): while a fill runs, the tank being filled and the pump (`PL1 LOUNGE  MON` / `FILL 142L/300L`); when nothing is active, the line's summary (`HYPO LINE    MON` / `STORE 8420L   OK`, or `NEXT PL3    CALL` when a tank is calling and waiting its turn). When a fill starts or ends while MON is on its home, the screen follows it.
- ◀ ▶ page through every item, active or not: a tank as `PL4 FOOTBATH MON` / `22L/30L  OK` (its state OK, CALL, FILL or INHIB); the store as `STORE HYPO   MON` / `8420L  PUMP RUN` (RUN, STOP or TRIP).
- ENTER on a tank shows its detail, ▲ ▼ scrolling: low level, high level, last filled, outlet open or shut; ESC back.
- Alarms: a tank at high-high, the line tripped, or the store low flash ALARM and break into the bottom line in turn (`ALM PL2 HI-HI`); ENTER in MON acknowledges, the lamp then steady until the cause clears. The trip RESET stays at the store.

**F2 SET, settings: each tank's levels.** Needs the access key switch at ON (otherwise `ACCESS LOCKED`).

- ◀ ▶ choose the tank, ENTER opens it; ▲ ▼ choose LOW LEVEL or HIGH LEVEL; ENTER edits it; ▲ ▼ change it in litres (steps of 1, 5 or 10 L by the tank's size); ENTER stores it (a beep; kept through a power cut, by the box); ESC abandons.
- Limits: low at least 10% of the tank, high at most 95% (below the fixed high-high trip at 98%, which is a safety and not settable), high at least 10% above low; at a limit, `LIMIT` for a second.
- Nothing is applied while it is being changed. The summary and the store: `NO SETTINGS`.

**F3 CMD, commands.** Needs the access key switch at ON.

- ◀ ▶ choose the tank, ENTER opens it; ▲ ▼ choose FILL NOW (call at once, filled to its high level in its turn), STOP (inhibit: never filled, even below low, a fill in progress ended, INHIB shown) or RESUME (back in service); ENTER asks `CONFIRM? ENT/ESC`; ENTER does it, ESC does not.
- The summary and the store: `NO COMMANDS` (the pump's HAND · OFF · AUTO and its reset are at the store, local).

**Access.** A small key switch on each terminal, LOCAL ACCESS OFF · ON (the owner: a key switch, a period favourite): at OFF, SET and CMD show `ACCESS LOCKED`, MON works as ever.

**Timeout.** No key for 60 s: any edit abandoned, back to MON's home (what is active), the backlight dimmed until the next key.

**Lamps.** RUN: steady healthy, flashing starting up, out with no comms. CALL: lit while any of the line's tanks calls or fills. ALARM: flashing unacknowledged, steady acknowledged and still present.

**Power-up and comms.** On power-up `CHLORELLA OT-216` (`PENFOLD OT-216` until the terminals became Chlorella's, 2026-10-28) / `V2.04 SELF TEST`, then MON's home. With its link to the box broken, `NO COMMS` on the bottom line, RUN out, keys dead.

**Logged.** Every stored setting and every command goes in the world's log with the terminal's tag.

The model changes (`chemical-distribution.ts`, `world.ts`): each day tank gains its own low and high setpoints in litres (defaulting to today's 20% and 90%) and an inhibited flag; the calling rule uses the setpoints; an inhibited tank never calls and is not served; FILL NOW sets its call. A `WORLD_VERSION` bump with a migration that fills the defaults. Actions in the world's reducer for setting a level, inhibiting, resuming and filling now; every one logged.

## Steps

1. The menu logic, pure, and its tests (every key in every state, limits, wrapping, confirm and cancel).
2. The model's setpoints, inhibit and fill-now, the world version and migration, and tests (a tank calls at its own low, stops at its own high, an inhibited tank is never served, FILL NOW fills it to high, high-high still trips).
3. **A prototype in the dev room first** (the owner, 2026-10-27): both terminals and the control box built in dev44, chemical handling (`src/toolkit/gallery/rooms/plant/chemical-handling.ts`), beside today's WH-CP1 demo (`createDistributionPanelDemo`), driven by the same trial of two distribution lines ten times fast, so old and new are compared side by side and every menu, command, fault (box off, MCB tripped, a terminal's link broken) can be tried there; the owner looks at it and agrees it before anything goes into the wet hall. Then both in the wet hall, the terminals in place of WH-CP1 and the box by the selectors, the schematic's `chem-panel` node replaced by the two terminals and the box with their links, their tags derived; inspection shows each one's state (the box's RUN, FAULT, OFF or TRIPPED; a terminal's comms).
4. The old `createDistributionPanel` retired (its demo too, or kept in a gallery as the old design if the owner wants).

## Checks

Typecheck, lint, format, tests and build; screenshots of both panels in the wet hall and on dev39; a short scripted walk through the menus in a browser: set PL4's high level, FILL NOW on PL1, STOP and RESUME on PL3, each seen in the model.

## Progress (2026-10-27)

The owner narrowed the scope while it was being built (2026-10-27): the end result is the new panels in the dev rooms only. Nothing in the real game world changes yet: no `world.ts`, `save.ts`, `WORLD_VERSION` or migration, no change to WH-CP1 in the wet hall, its room layout or the distribution views the game uses. The dev-room panels run on their own trial state, as dev44's kit does.

- **Stage 1, the menu logic** (`5f64d77`): `src/toolkit/components/industrial-control/logic/ot216-terminal.ts`, a pure state machine fed by what the box sends (`TerminalFeed`) and sending back `TerminalCommand`s, with a test of every key in every state (`ot216-terminal.test.ts`): items, the three modes, ENTER's detail and acknowledgement, the SET edit in the tank's steps with its limits and `LIMIT`, the CMD confirmation, the access key, the 60 s timeout and dimming, the power-up self test, `NO COMMS` and the LEDs. Held cursor keys repeat in the logic (`heldRepeats`), but the control scheme gives parts clicks only, so on screen each click is one step.
- **Stage 2, the model** (`3b2f63d`): not the world's model but a trial of its own, `src/toolkit/components/plant/logic/chem-control-trial.ts` and its tests: the one control box (isolator, MCB, a controller that starts and can hang), each day tank's own low and high levels in litres (today's 20% and 90% to begin with), STOP (inhibit), RESUME and FILL NOW kept by the box; AUTO follows the box, HAND does not need it (with the pump in HAND too, as its AUTO runs on the box's remote-run relay); high-high still trips until RESET at the store; each terminal's link; every setting and command logged with the terminal's tag.
- **Stage 3, the prototype** (`b8bbdb7`): the terminal (`industrial-control/views/ot216-terminal.ts`, with the character LCD `createCharacterLcd`), the box (`plant/views/chem-control-box.ts`: its door opens on its latch, isolator, MCB, controller, comms, relays and terminals all live, the wiring diagram in the door's pocket) and the prototype assembly (`plant/views/chem-control-prototype.ts`) with a trial station for the local controls and the faults. In dev44 it stands beside today's WH-CP1, both driven by the same trial ten times fast, in place of the old panel's own demo; in dev39 without WH-CP1; the character LCD and cursor keys have a board of their own in dev0. Without the wet hall's power both the old panel and the new terminals go dark and nothing is transferred. Tags are `PROTO-OT1`, `PROTO-OT2` and `PROTO-CB1` until the wet hall's model gives them theirs. In a browser walk through the menus: PL4's high level set to 25 L, FILL NOW on PL1 (calling, waiting its turn behind PL2), STOP and RESUME on PL3, each seen in the trial and in its log; the MCB tripped and both lines stopped.

Left for later (in `TODO.md`): the owner's review of the dev44 prototype; installing it in the wet hall (the schematic's `chem-panel` node replaced by the two terminals and the box with their links and derived tags, the world's setpoints, inhibit and fill-now with a `WORLD_VERSION` bump and migration, the selectors in AUTO following the box, inspection); retiring `createDistributionPanel`; press-and-hold for the cursor keys if the control scheme gains it.

## For the owner to look at (2026-10-28)

The owner, 2026-10-28: "I'd like you to design those control panels and show them to me in the chemical room." Dev44 (`?room=dev44`) now shows them, still in the dev rooms only: the wet hall keeps WH-CP1 until the owner agrees the design.

What changed overnight:

- **Dev44 laid out without overlaps.** The square layout gave every wall five exhibits, so the 15.6 m transfer trial's wall ran past the corner and its pump panel stood in front of the control box and the trial station. Dev44 is now 22 m square and laid out with `fit` (`layoutSquarePlantRoom(sizes, links, { side, fit })` in `plant-room-layout.ts`: exhibits may move from one wall to the next and any two footprints overlapping count as a fault; off by default, so other rooms keep their places), with a test. The panels are on the south wall, at its east end.
- **The control box's contents carry their makers' badges** (CLAUDE.md: the box is Penfold's, what it holds is bought in): Voltara's MCB and door isolator, Neumann Dynamik's 24 V supply, Quorvane's QL-12/24RC controller (after a LOGO! 8; it said PENFOLD PC-12 before), Fankel's CM-485 comms module and Hartwell & Bligh's interposing relays. An I/O schedule card beside the controller names every input and output LED (I1 to I6, Q1 to Q10, and each output's relay).
- **Small fixes**: the terminal's `OT-216 PROTO-OTn` no longer runs off its band; the box's ISOLATOR plate moved below the handle, which covered it; each trial station control has a printed caption readable from the floor.
- **For a script in the browser** (development only): `window.chemControlTerminals.hypochlorite.press('F2')`, `.turnKey()` and `.status()` (and the same for `acid`), and `window.chemControlBox.open()`, beside `window.chemControlTrial()`.

What to look at (camera URLs, each with `&noclip=true`; screenshots taken 2026-10-28):

1. **Old and new side by side**: `?room=dev44&x=7.2&y=1.5&z=6.8&yaw=180&pitch=-6`. Today's WH-CP1 on the left (its meters in per cent), the two OT-216 terminals, the control box PROTO-CB1 with their conduits into its glands, and the trial station, all driven by one trial ten times fast.
2. **The two terminals close up**: `?room=dev44&x=7.09&y=1.55&z=9.45&yaw=180&pitch=-2`. Turn a terminal's LOCAL ACCESS key, then F1 MON, F2 SET, F3 CMD, ◀ ▶ through the tanks, ENTER, ESC. Seen in the walk: MON's home following the fill in progress (`PL2 OLYMPIC  MON` / `FILL 184L/1000L`), `ACCESS LOCKED` with the key at OFF, SET on PL4 editing its high level with the block cursor (`HIGH LEVEL  26L`), and CMD's `CONFIRM? ENT/ESC`.
3. **Inside the control box**: `?room=dev44&x=6.25&y=1.42&z=9.25&yaw=180&pitch=-4`, then click its door. The controller's RUN, STOP and FAULT, its I/O LEDs, the relays' LEDs and the comms ports' TX and RX flicker live; the MCB trips and resets; the door isolator switches the box off (both terminals blank, AUTO filling stops) and on (`PENFOLD OT-216` / `V2.04 SELF TEST`, then MON).
4. **The trial station**: `?room=dev44&x=5.4&y=1.35&z=8.7&yaw=180&pitch=-8`. Each line's selector HAND · AUTO and pick, the pump's HAND · OFF · AUTO and trip RESET, each terminal's link (CUT gives `NO COMMS`), the wet hall's power, TRIP BOX MCB, HANG CONTROLLER (FAULT flashes; switch the isolator off and on to clear it) and OVERFILL HYPO PL4 (high-high: the line trips, ALARM flashes, RESET at the store).

Screenshots for the owner, in the session's scratchpad: `091-1-overview.jpg`, `091-2-terminals.jpg`, `091-3-control-box-open.jpg`, `091-4-trial-station.jpg`.

Design questions for the owner, to be asked one at a time:

1. Is the terminal right as it is, a real 200 × 140 mm OT-216 at eye height with a membrane keypad and one LOCAL ACCESS key each, or should it be larger or simpler?
2. In the wet hall, should the control box stand by the transfer selectors on the dirty side, as designed, with the terminals' conduits running to it, or beside the terminals where WH-CP1 is now?
3. Are the box's bought-in makers right (Quorvane controller, Voltara MCB and isolator, Neumann Dynamik supply, Fankel comms, Hartwell & Bligh relays)?
4. Should the control room learn anything of the new arrangement, a CHEM CONTROL BOX FAULT window on its annunciator for instance, or keep exactly what it shows now, as agreed on 2026-10-27?
5. Once the wet hall has the new panels, should WH-CP1 be deleted, or kept in a gallery as the old design?
6. Is press-and-hold for the cursor keys (faster after 2 s, already in the terminal's logic) worth adding to the control scheme, or is one step a click enough?

## The owner's answers (2026-10-28)

1. **The terminal: as designed, 20% bigger** (about 240 × 168 mm), so its LCD reads more easily. "It's a small device. It's a different era to the bigger control cabinets, which often combined control machinery and interface in one box. In the early 2000s … typically small microprocessors connected to larger switching gear with just simple serial buses."
2. **The control box stays in the wet hall, by the manifolds**, labelled up, and it should look like a control box: two serial inputs from the terminals entering through glands, and switching gear inside. The owner asked whether large plants used hub and spokes (a central controller in a switch room, remote I/O on a fieldbus, local operator panels): not here, where the transfer is a packaged system, but planned for the future water slides zone, whose regional control systems lean into a mid-2020s style (`TODO.md`).
3. **The bought-in makers are right** (Quorvane controller, Voltara MCB and isolator, Neumann Dynamik supply, Fankel comms, Hartwell & Bligh relays): "I really like that."
4. **An annunciator for each major location.** The old control room has at least three annunciators, one each for the Olympic pool, the lazy pool (`pool_01`) and the wet hall, each showing the fault conditions of its own location. The wet hall's shows everything that can go wrong there, a window each: the drainage (backwash) tank high, the clean water (make-up) tank low, the hypochlorite transfer fault, the acid transfer fault, and the like. It is shown in the wet hall and in the control room. Every one of these fault conditions must also be able to show on the bridge (the owner's standing rule: any change to warning and error states updates the bridge too). Its own mission: [099](099-location-annunciators.md).
5. **WH-CP1 is kept**, as a working exhibit in a dev room flagged obsolete, once the new panels replace it in the wet hall.
6. **Press-and-hold for the cursor keys: yes, to try** ("Let's test it out and see if it works. If it doesn't, we'll just have to click very rapidly"): a held input in the one control scheme, for mouse, touch, gamepad and keyboard, driving the terminal's existing repeat.

## The terminals redesigned: Chlorella's, a green clamshell (the owner, 2026-10-28)

After the answers above, the owner changed the terminals' design (2026-10-28), keeping the 20% size increase:

- **Chlorella's, not Penfold's.** "These are specialist Chlorella equipment for automating the distribution of chlorine around a plant." The transfer control system is Chlorella Chemicals' product (`brands.ts`, its livery): the two OT-216 terminals, and the control box's enclosure and tag plate as the system supplier's (its enclosure in Chlorella's green, a green engraved tag plate, Chlorella's maker's plate and rating plate, `CHLORELLA OT-216` on power-up). The bought-in parts inside the box keep their own makers' badges (Quorvane, Voltara, Neumann Dynamik, Fankel, Hartwell & Bligh), as the owner approved. This is a deliberate exception to CLAUDE.md's rule that every mimic, control board and control panel is Penfold's: it is specialist supplier equipment, the way instruments set into a panel keep their own makers.
- **A moulded clamshell, common in the 2000s**: two shell halves meeting at a parting line round the edge, rounded corners, screw bosses at the corners and a slightly domed front. The shell is pale green moulded plastic with a slightly rough, textured finish.
- **A printed fascia**: a darker green, smooth printed polyester overlay covering the front, which protects the rougher shell and wipes clean, as industrial equipment of that era had. Chlorella's logo is printed on it.
- **Membrane keys are not separate buttons**: they are printed patches of the same fascia, each key a printed outline with its legend, very slightly embossed, under one continuous overlay. The LCD sits behind a clear window in the fascia; the lamps are printed LED windows in it.
- **How it is rendered** (the owner): no modelled or moving key parts. The fascia is one flat mesh; the keys' raised patches, embosses and the window's edges are a subtle bump map with a matching roughness map, drawn procedurally onto canvases as the game's other textures are, so the raised patches catch the light slightly and the smooth fascia is a little glossier than the rough shell. Presses work as before, through hit areas on the flat fascia (`fasciaKey`), with feedback from the key's click and from the LCD or lamp responding rather than from geometry moving. The bump and roughness maps are drawn once and shared by the terminals in a room (`fasciaMaps`); nothing is redrawn each frame.

Built in `industrial-control/views/ot216-terminal.ts` (`OT216_LIVERY`, `FASCIA_KEYS`, `drawFascia`, `fasciaMaps`), `core/parts/small-parts.ts` (`fasciaKey`) and `plant/views/chem-control-box.ts`.
