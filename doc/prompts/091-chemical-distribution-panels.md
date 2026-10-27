# 091: WH-CP1 replaced by two modern chemical distribution panels

Status: designed 2026-10-27, with the owner's answers; not started. The second mission after [089](089-layout-improvements.md).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply: real, working, branded engineering items bound to the world; new controls tried on dev0's boards and control assemblies in dev39 first; all input through `src/toolkit/controls/`; pure logic in `logic/` folders with tests; a world shape change bumps `WORLD_VERSION` (45 when this was written) with a migration. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27, of WH-CP1, the wet hall's chemical distribution panel: "Can you make it show the quantities in litres rather than %. I think I want to change this to 2 modern style control panels, each with a 2-line LCD display. One control panel for hypochlorite, one for acid, but both working the same way. Perhaps buttons: Mode (cycles between monitor, set, command); Back (cancels, steps up the menu); Select (chooses an item); D-pad (up, down, left, right). I can cycle between pumps by pressing left and right. Choosing select enters the menu for that pump: I can set the tank high/low. In command mode I can set it to fill now, or stop."

Owner's answers (2026-10-27):

- Left and right step through the **day tanks** (PL1 lounge, PL2 Olympic, PL3 jacuzzi, PL4 footbath, and the store), not the dosing pumps.
- **STOP inhibits** the tank: it is not filled, even when it calls at low, until put back in service; a fill in progress stops too.
- **Litres only on the new panels**: the old panel's meters are not re-scaled; they go when it is replaced.
- **Wet hall only**: the panels replace WH-CP1 in the wet hall; the control room keeps what it shows now. Setting levels and commanding fills means going to the wet hall.

## What there is now (checked 2026-10-27)

- WH-CP1 is `createDistributionPanel` (`src/toolkit/components/plant/views/chemical-handling-kit.ts`), Penfold Controls', the `chem-panel` node of `transferSelectors()` (`src/game/plant/schematic-parts.ts`), placed on the wet hall's south wall (`CHEM_AT.wet_hall`, `room-equipment.ts`), 1.6 × 1.1 m, bound by `chemicalModel` (`src/toolkit/gallery/views/chemical-distribution-views.ts`, `readDistribution`). A section per chemical: the store's contents and four day tanks' levels on moving-coil meters as a share of full, an outlet lamp lit while served, the selector's AUTO and HAND, the pump's RUN, IN AUTO and TRIP; an annunciator across the top (a day tank low, a line tripped, a store low) with ACCEPT, RESET and LAMP TEST. It only shows.
- The model (`src/game/plant/chemical-distribution.ts`, `world.distribution`): per chemical, one transfer pump at its store (HAND · OFF · AUTO, at the store), one six-way selector on the wet hall's dirty side (AUTO serving calls in turn, or HAND on a picked outlet), and four day tanks (hypochlorite 300, 1,000, 60 and 30 L; acid 60, 500, 30 and 15 L). A tank calls at a fixed low (20%) and stops at a fixed high (90%) (`DISTRIBUTION`); any tank's high-high (98%) trips the line until RESET.
- Two-line LCDs exist to reuse (the DoseCell head's 16 × 2, `liveLcd` in `dosing-equipment.ts`, the balance tank panel's), and push buttons (`createPartSet`, `pushButton`).

## Design

Two panels side by side where WH-CP1 is, one for hypochlorite (yellow band) and one for acid (red band), identical but for their chemical. Each a modern wall-mounted controller in a small IP65 enclosure (late 2010s, after a Danfoss MCX or a Siemens LOGO! with its TDE text display), Penfold Controls' with its mark; a 16 × 2 character LCD, backlit; the keys MODE, BACK, SELECT and a four-way D-pad; RUN, CALL and ALARM LEDs; its tag (WH-CP1 hypochlorite, WH-CP2 acid, derived from the model, not written by hand).

The menu, the same on both (pure logic, a state machine in a `logic/` file, with tests):

- **MODE** cycles MONITOR → SET → COMMAND → MONITOR; the top line shows the mode at its right.
- **LEFT / RIGHT** step through the line's items: STORE, PL1, PL2, PL3, PL4 (wrapping). In MONITOR the screen shows the item: e.g. `PL1 LOUNGE  MON` / `142 L/300 CALL` (its litres, its size, and CALL, FILL, INHIB or OK); the store as `STORE HYPO   MON` / `8420 L  PUMP RUN`.
- **SELECT** enters the item's menu in the current mode; **BACK** cancels an edit or steps up a level.
- **SET mode**, a day tank: UP / DOWN choose LOW LEVEL or HIGH LEVEL, SELECT edits it, UP / DOWN change it in litres (steps of 1, 5 or 10 L by tank size), SELECT stores it, BACK abandons. Limits: low at least 10% of the tank, high at most 95% (below the fixed high-high trip at 98%, which stays a safety and is not settable), and high at least 10% above low; the store has nothing settable.
- **COMMAND mode**, a day tank: UP / DOWN choose FILL NOW, STOP (inhibit) or RESUME (back in service), SELECT asks `CONFIRM? SEL/BCK`, SELECT again does it. FILL NOW makes the tank call at once (filled to its high level in its turn, AUTO); STOP inhibits it (not served, a fill in progress ended, INHIB shown) until RESUME. The store: nothing commanded here (the pump's selector and reset stay at the store).
- Alarms: a tank at high-high, the line tripped or a store low lights ALARM and shows on the bottom line in MONITOR until accepted (SELECT on the alarm), as the annunciator does now; the trip RESET stays at the store.

The model changes (`chemical-distribution.ts`, `world.ts`): each day tank gains its own low and high setpoints in litres (defaulting to today's 20% and 90%) and an inhibited flag; the calling rule uses the setpoints; an inhibited tank never calls and is not served; FILL NOW sets its call. A `WORLD_VERSION` bump with a migration that fills the defaults. Actions in the world's reducer for setting a level, inhibiting, resuming and filling now; every one logged.

## Steps

1. The menu logic, pure, and its tests (every key in every state, limits, wrapping, confirm and cancel).
2. The model's setpoints, inhibit and fill-now, the world version and migration, and tests (a tank calls at its own low, stops at its own high, an inhibited tank is never served, FILL NOW fills it to high, high-high still trips).
3. The panel, tried on dev0's boards (its LCD and keys) and assembled in dev39, then on the wet hall's south wall in place of WH-CP1, with the schematic's `chem-panel` node split into two (one per chemical), their tags derived; inspection shows each panel's state.
4. The old `createDistributionPanel` retired (its demo too, or kept in a gallery as the old design if the owner wants).

## Checks

Typecheck, lint, format, tests and build; screenshots of both panels in the wet hall and on dev39; a short scripted walk through the menus in a browser: set PL4's high level, FILL NOW on PL1, STOP and RESUME on PL3, each seen in the model.
