# 093: A starship-bridge widget kit, for swimming pools

Status: stage 1 under way (2026-10-27). Built: the kit as its own generic layer, `src/ui2d/` (the owner: separate and reusable, depending on nothing in the game; its API in its `README.md`), tested; the generic touch surface (`src/toolkit/components/industrial-control/{logic,views}/touch-surface.ts`): a black backing frame of any outline with ui2d screens set coplanar into it inside a bezel, uses routed to the tree at the touched pixel, bleeps on its sounds; dev47 (`?room=dev47`), touch panels of every shape. Next: the dev0 board, then the later stages below. Written 2026-10-27 from the owner's request.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first, `doc/design/control-interface-archetypes.md` (the starship bridge touch station) and mission 092. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27: "Can you see if someone has made a two-dimensional LCARS style widget library that we can use to create the Star Trek style interfaces? It would be really funny if we could create, let's say, the main forward viewing screen could be used to display a variety of different things depending on what instructions are put to it. Like, it could show security camera footage, it could show an animated schematic in the LCARS style." Then, on the libraries found: "if those libraries are legal, we can probably create our own two-dimensional widget library that uses design elements of those, since they're MIT licensed. We are not copying the exact ... existing control panel designs ... We're copying the design language ... We can take the 2D library and turn it into something that works in 3D, and then use that in our parody by making it about swimming pools rather than spaceships."

## What exists (checked 2026-10-27)

| Library                                                                                     | What                                                                   | Licence                                         | Last pushed |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- | ----------- |
| [joernweissenborn/lcars](https://github.com/joernweissenborn/lcars)                         | CSS/HTML framework: elbows, bars, pill buttons, colour palette, layout | MIT (© 2014 Garrett, © 2020 Jörn Weißenborn)    | 2021        |
| [agent-P/LCARS-Javascript-Framework](https://github.com/agent-P/LCARS-Javascript-Framework) | JavaScript building SVG components (screen, button, keypad, clock)     | MIT (© 2019 Perry Spagnola)                     | 2019        |
| [louh/lcars](https://github.com/louh/lcars)                                                 | Vue responsive layout                                                  | GPL-3.0 (do not use: it would bind the project) | 2026        |
| [crstmkt/LCARS-SDK](https://github.com/crstmkt/LCARS-SDK)                                   | CSS plus JS API, Illustrator mock-ups                                  | none stated (do not use)                        | 2021        |

## The decision (the owner, 2026-10-27)

Build the game's own 2D widget kit taking its design language from the two MIT libraries: their shapes and proportions (elbows joining bars, rounded end caps, pill buttons, bar-and-block frames, the colour-blocked palette, condensed capitals), adapted to draw on a canvas texture in 3D. Where code, CSS values or geometry are taken from them, keep their MIT notices (in `CREDITS.md`, with the files and what was adapted recorded in `doc/reuse-inventory.md`, as the project does for the Encabulator). Copy no existing on-screen panel designs from the show, and no Star Trek names, logos or Paramount artwork; the panels are about swimming pools ("FILTRATION", "BACKWASH SEQUENCE", "CHLORINE RESIDUAL"). Lettering in a free condensed face (for example Antonio, SIL Open Font Licence), not the show's own fonts.

## How it draws

Not HTML in the scene: the browser cannot draw the DOM into a WebGL texture, and a CSS3D overlay would not be lit, occluded or post-processed and would sit outside the one control scheme. So the kit draws with Canvas 2D onto a `CanvasTexture`, as the game's dot-matrix, LCD and seven-segment displays do: pure layout and state in a `logic/` module (tested), a view that paints it, redrawn only when what it shows changes (`doc/research/display-only-updates.md`). Touches come through the control scheme (`src/toolkit/controls/`) as uses on the panel's parts, mapped from the hit point on the surface to the widget under it; each touch answers with a bleep (the game's own synthesised sounds, a family of short tones).

## Stages

1. The kit: elbows, bars, frames, pill buttons (pressed and lit states), labels, numeric read-outs, bar gauges, a small trend, an alarm banner that flashes; a layout of a frame with sidebar buttons and a content area; page switching; hit-testing a touch to its widget. Tried on a dev0 board first (a touch panel showing a pool's readings with a few working buttons and bleeps).
2. The main viewscreen as a component with modes, chosen from a station (or the operator's console): the CCTV feed (the game's existing cameras, `cctv` monitors); an animated schematic of a system, drawn from its room's enhanced network, water moving and levels changing as the world does; trends; the alarm list; and a full-screen alert when something trips. On trial in dev46 first, on its full-height front wall.
3. The six system stations in dev46 (circulation and filtration, chemical dosing, heating, air handling, power, building), each a sloping touch panel built from the kit, showing and working its system through the world as the mimics do; local-only controls stay in the plant rooms (`CLAUDE.md`).

## Acceptance

- The kit's logic tested (layout, hit-testing, page state); the dev0 board works by touch with bleeps; screenshots.
- The viewscreen switches modes and shows live world state in dev46; screenshots of each mode.
- `CREDITS.md` and `doc/reuse-inventory.md` record what came from which MIT library; nothing GPL or unlicensed used; no Star Trek names, logos or fonts.

## The owner's refinements (2026-10-27, during stage 1)

- **A separate layer:** "keep the 2D widget kit as a distinctly separate, generic user-interface components layer that could be lifted out and reused in another project." So `src/ui2d/`: no imports from Three.js, the game or the toolkit; a component tree that lays itself out in a pixel rectangle, paints to a canvas context, says when it needs painting, takes presses in its own pixels and answers with an action and a sound for the host to play; one theme among possible others. The game's side holds the adapters.
- **Generic tools for 2D controls in 3D:** a touch surface: a black backing frame of any outline (rectangles, rounded rectangles, trapezia, raked console tops, concave outlines, curved strips), one or more ui2d screens inset in it with a bezel (4 mm a side by default, 0 allowed), coplanar with the frame and drawn over it by render order and polygon offset rather than nudged forward; a 3D hit mapped to the screen's pixel; its pure parts tested.
- **The dev room's scope:** "I just want to see a variety of different controls on a variety of different shapes. It just doesn't matter if any of it makes any sense. The question is, can we lay out things? Can we lay out LCARS things in a 2D space in a 3D world?" So dev47 shows touch surfaces of many shapes with an assortment of widgets under pool-flavoured nonsense, answering every touch, bound to nothing. Re-imagining the game's real panels and mimics on touch screens (the pump panel, WH-CP1, a mimic, the annunciator, the changeover switch, the readings), each working on a trial state, is deferred, with the viewscreen's modes, to the later stages.

## Every panel reimagined: dev48 (the owner, 2026-10-27)

The owner, on seeing dev47: "I love it ... they look hilarious", then: ALL the game's existing control panels reinterpreted in this style in a dev room, on trial state, each labelled with the original it parodies; "Some of them are going to be great, some of them will be terrible, but the big joke is that we're rendering pool maintenance panels science fiction style." Dev47's east wall title card was to give way to panels too (done: two of them, the card a small sign over the door).

Built: dev48 (`?room=dev48`), 69 touch screens in two tiers round four walls (`logic/gallery-walls.ts`), each from data (`logic/parody-specs.ts`) by one builder (`views/parody-panel.ts`) on a small trial of its own (`logic/parody-trial.ts`): the same controls, lamps and read-outs as the original, grandly renamed. The inventory was taken from `room-equipment.ts`'s MODELS, the plant galleries and the dev rooms' panels (2026-10-27); it is complete as far as that search found, less the panels defined but never placed (`createStoreHandlingPanel`, `createDayTankPanel`, `createWaterControllerDisplay`, `createPoolAlarm`, `createGeneratorCabinet`), dev rooms' hand-set panels (`createWaterLevelPanel`, `createSpaEffectsPanel`) and dev0's component boards.

| Original                                                               | Reimagined as                                 | Code      |
| ---------------------------------------------------------------------- | --------------------------------------------- | --------- |
| PL2-CP1, THE FILTER PUMPS’ LOCAL CONTROL PANEL                         | PRIMARY CIRCULATION COMMAND                   | PL2-CP1   |
| THE MAIN POOL MIMIC (CONTROL ROOM)                                     | OLYMPIC HYDRODYNAMIC OVERVIEW                 | CR-MP1    |
| THE HEATING MIMIC, LTHW (CONTROL ROOM)                                 | THERMAL WARP CORE · LOW TEMPERATURE HOT WATER | CR-MP2    |
| AP-MP1 AND CR-MP3, THE AIR HANDLING MIMIC (AHU-801 TO 812)             | ATMOSPHERIC PROCESSING · POOL HALL            | CR-MP3    |
| THE BOILER HOUSE GAS MIMIC                                             | PLASMA CONDUIT SAFETY · NATURAL GAS           | BH-MP1    |
| THE CONTROL ROOM ALARM ANNUNCIATOR                                     | CONDITION RED · AQUATIC ALERT MATRIX          | CR-CP2    |
| WH-CP1, THE CHEMICAL DISTRIBUTION PANEL (WET HALL)                     | MOLECULAR DISTRIBUTION NEXUS                  | WH-CP1    |
| THE OT-216 OPERATOR TERMINALS (HYPOCHLORITE AND ACID)                  | SUBSPACE DOSING INTERFACE                     | PROTO-OT1 |
| THE MAINS/GENERATOR CHANGEOVER SWITCH (SWITCH ROOM)                    | PRIMARY POWER TRANSFER CONDUIT                | SR-IS3    |
| PL1-CP1 AND THE LOUNGE FILTER MIMIC                                    | LOUNGE POOL · FILTRATION ARRAY                | PL1-CP1   |
| THE DOSING CONTROLLER AND SAMPLE CELLS (AFTER DULCOMARIN)              | WATER CHEMISTRY ORACLE                        | PL2-CP2   |
| THE DELIVERY FILL CABINET (CHEMICAL STORE)                             | TANKER DOCKING PORT                           | LB-CAB1   |
| THE CHEMICAL STORE’S EXTRACT AND CHLORINE DETECTION                    | TOXIC ATMOSPHERE CONTAINMENT FIELD            | HS-AHU1   |
| THE OZONE GENERATOR (AFTER BONOZON)                                    | TRIATOMIC OXYGEN REACTOR                      | PL2-OZ1   |
| THE BOILER HOUSE GAS DETECTION AND EMERGENCY STOP (AFTER GASFLAG)      | METHANE INCURSION DEFENCE GRID                | BH-CP1    |
| THE COMBUSTION AND VENTILATION PANEL                                   | COMBUSTION REACTION MONITOR                   | BH-CP2    |
| THE BOILER STATUS AND HEAT OUTPUT MIMIC                                | HEAT OUTPUT · WARP FACTOR                     | BH-MP2    |
| THE LV MAIN SWITCHBOARD (AFTER PRISMASET)                              | MAIN POWER DISTRIBUTION MATRIX · MSB-1        | SR-DB1    |
| THE MOTOR CONTROL CENTRE                                               | PROPULSION CONTROL CENTRE                     | MCC 01    |
| THE EMERGENCY LIGHTING CENTRAL BATTERY                                 | AUXILIARY POWER RESERVE                       | SR-DB2    |
| THE DISTRIBUTION BOARD (AFTER HAGER, 12-WAY TPN)                       | CIRCUIT PROTECTION LATTICE                    | DB 01     |
| THE ROTARY ISOLATORS                                                   | LOCAL ISOLATION ARRAY                         | ISO 01    |
| THE GENERATOR CONNECTION POINT (LOADING BAY)                           | EXTERNAL POWER DOCKING CLAMP                  | LB-FX1    |
| THE OPERATOR’S DESK, POOLMON (BBC MICRO)                               | CENTRAL COMPUTER CORE · POOLMON               | POOLMON   |
| THE CHART RECORDERS                                                    | TEMPORAL DATA ARCHIVE                         | CR-CP3    |
| THE READOUT BOARD (LED INDICATORS AND AMMETERS)                        | SYSTEMS STATUS BOARD                          | CR-CP4    |
| THE BMS OUTSTATION (AFTER TREND IQ4)                                   | AUTONOMOUS BUILDING INTELLIGENCE              | CR-CP5    |
| THE FIRE ALARM REPEATER (AFTER SYNCRO VIEW)                            | COMBUSTION EVENT REPEATER                     | CR-CP6    |
| THE CCTV MONITOR (FOUR CAMERAS IN QUARTERS)                            | VISUAL SURVEILLANCE ARRAY                     | CR-FX3    |
| THE LIDOLUXE WASH-O-TRON 5 FILTER WASH CONTROLLER (WOT-5)              | AUTOMATED SAND PURIFICATION SEQUENCER         | WOT-5     |
| PL2-CP3, THE OLYMPIC BALANCE TANK PANEL                                | RESERVOIR EQUILIBRIUM CONTROL                 | PL2-CP3   |
| THE UV UNIT CONTROLLER (PL1-UV1, PL2-UV1)                              | ULTRAVIOLET STERILISATION BEAM                | PL2-UV1   |
| THE HYPOCHLORITE DOSING SET, DP-101A DUTY AND DP-101B STANDBY          | CHLORINE INJECTION THRUSTERS                  | PL2-DP1   |
| DP-102, THE ACID DOSING PUMP (pH CORRECTION)                           | ACIDITY RECALIBRATION INJECTOR                | PL2-DP2   |
| THE TRANSFER SELECTORS, 6-WAY (WH-XS1 HYPOCHLORITE, WH-XS2 ACID)       | CHEMICAL ROUTING JUNCTION                     | WH-XS1    |
| THE TRANSFER PUMP SKID CONTROL BOX (HS-P1, AS-P1)                      | BULK TRANSFER PROPULSION                      | HS-P1     |
| THE DOSECELL HEAD ON THE DAY-TANK DOSE BOTTLES                         | DOSE VESSEL INTELLIGENCE                      | PL1-DT1   |
| THE FRAMED DAY-TANK STATION (PL2-DT1, 1,000 L)                         | PRIMARY CHLORINE RESERVOIR                    | PL2-DT1   |
| THE BOILER CONTROL PANEL (EACH OF B-501 TO B-506)                      | INDIVIDUAL REACTOR CONTROL                    | B-501     |
| THE PRESSURISATION UNIT (BH-T1)                                        | HYDRAULIC PRESSURE STABILISER                 | BH-T1     |
| THE AHU CONTROLLERS (AHU-801 TO AHU-812)                               | LIFE SUPPORT · ATMOSPHERIC UNIT               | AHU-801   |
| SR-IS1, THE MAIN INCOMING SWITCH                                       | SITE POWER INTAKE GATE                        | SR-IS1    |
| DB-L1, THE LIGHTING DISTRIBUTION BOARD                                 | ILLUMINATION GRID                             | SR-DB4    |
| THE ROOMS’ SUPPLY SWITCH-FUSES (PL1-SF1 AND EVERY ROOM’S)              | COMPARTMENT POWER COUPLING                    | PL1-SF1   |
| THE SPA CABINET POWER ISOLATORS                                        | SPA POWER SEVERANCE                           | ISO 02    |
| THE ELECTRICITY METERING CABINET (YARD INTAKE)                         | ENERGY CONSUMPTION LEDGER                     | METER 01  |
| CR-CP1, THE ALARM PRINTER                                              | HARD COPY ALARM CHRONICLE                     | CR-CP1    |
| THE SPA CABINETS (PL3-CAB1 JACUZZI, PL4-CAB1 FOOTBATH) AND THEIR MIMIC | HOT TUB LIFE SUPPORT POD                      | PL3-CAB1  |
| DC1, THE SPA DOSING CONTROLLER                                         | MICRO-DOSING NANOCONTROLLER                   | DC1       |
| THE MOTORISED VALVE PANELS (JACUZZI VALVES, FOOT SPA VALVES)           | HYDRAULIC GATE ARRAY                          | VALVES 01 |
| THE JACUZZI WATER CIRCUIT MIMIC                                        | BUBBLE DYNAMICS OVERVIEW                      | MIMIC 06  |
| THE SPA FIBRE ILLUMINATOR                                              | STARFIELD PROJECTOR · SPA                     | FIBRE 01  |
| THE JACUZZI MUSIC CABINET (SYNCLEX)                                    | AMBIENT HARMONIC GENERATOR                    | MUSIC 01  |
| THE POOLSIDE JACUZZI CONTROL PLATE                                     | BATHER JET AUTHORISATION                      | JETS 01   |
| WH-MP1, THE WET HALL MIMIC (MAKE-UP AND BACKWASH)                      | MUNICIPAL WATER INTAKE · BACKWASH RECLAMATION | WH-MP1    |
| WH-P1, THE MAKE-UP BOOSTER SET CONTROLLER                              | PRESSURE AMPLIFICATION ENGINES                | WH-P1     |
| THE BACKWASH PIT PUMP PANEL (P-601, P-602)                             | WASTE EVACUATION PUMPS                        | WH-T2     |
| WH-FQR1, THE SEWER OUTFALL MONITOR                                     | EFFLUENT DISCHARGE SURVEILLANCE               | WH-FQR1   |
| WH-FQR2, THE MAKE-UP WATER RECORDER                                    | TOWN MAIN CONSUMPTION CHRONOGRAPH             | WH-FQR2   |
| WH-FT1, THE MAKE-UP FLOWMETER CONVERTER                                | ELECTROMAGNETIC FLOW SENSOR                   | WH-FT1    |
| THE OZONE ALARM ENCLOSURES (PL1-GD1, PL2-GD1)                          | TRIATOMIC LEAK SENTRY                         | PL2-GD1   |
| EO-CP1, THE HYPERPLASC SCENARIO SIMULATOR                              | MULTIVERSE SCENARIO ENGINE                    | EO-CP1    |
| THE DUTY/STANDBY PUMP PANEL (DEV ROOM)                                 | REDUNDANT PROPULSION SELECTOR                 | DUTY 01   |
| THE FILTER BACKWASH PANEL, FILTER 1 (FIVE-VALVE DEV ROOM)              | SINGLE VESSEL PURGE CONTROL                   | FILTER 01 |
| THE POOL HEATING MIMIC, BOILER B-1 AND HX-1 (DEV ROOM)                 | THERMAL TRANSFER REGULATOR                    | HX-1      |
| THE PUMP LOCAL PANEL (BATTERY-BACKED PUMP)                             | UNINTERRUPTIBLE PROPULSION INDICATOR          | PUMP 01   |
| THE LM4 LEAK MONITOR (DEV44)                                           | HULL BREACH DETECTION                         | LM4       |
| THE JACUZZI TRIAL CONSOLE (DEV38)                                      | EXPERIMENTAL HOT TUB TEST STAND               | TRIAL 01  |
| THE SECURITY OFFICE CCTV MONITOR (DEV18)                               | DEEP SPACE SURVEILLANCE · DEV16 POOL          | CAM 01    |

Not yet: binding any of them to the world (the owner: trial state is enough for now); the viewscreen's modes and the bridge's six stations (stages 2 and 3).
