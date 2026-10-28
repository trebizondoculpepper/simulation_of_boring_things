# Bridge console paging: design and implementation plan

Status: implemented 2026-10-27, as changed by the owner's rulings while it was built: see [Implemented as](#implemented-as) at the end, which overrides the plan where they differ. Part of mission [095](../prompts/095-the-bridge.md); the widget belongs to mission [093](../prompts/093-bridge-widget-kit.md)'s `ui2d` kit.

## Contents

- [The request](#the-request)
- [What is on the bridge now](#what-is-on-the-bridge-now)
- [The page registry](#the-page-registry)
- [Which consoles show which pages](#which-consoles-show-which-pages)
- [The pager widget](#the-pager-widget)
- [Mounting a pageable console](#mounting-a-pageable-console)
- [The world: state, action, migration](#the-world-state-action-migration)
- [The viewscreen chosen from Central Control](#the-viewscreen-chosen-from-central-control)
- [Files to change](#files-to-change)
- [Risks and conflicts](#risks-and-conflicts)
- [Tests](#tests)
- [Estimate](#estimate)
- [Implemented as](#implemented-as)

## The request

The owner, 2026-10-27: "I wonder if we need something that's consistent, perhaps in the bottom left of each of the consoles, that I can page left and right and lock each of the consoles in place, and it should remember what I've chosen for each console. That way I can set the room up in a more useful way. And perhaps in the main console control, I should be able to set what is on the view screen in addition to the main console."

So: a page registry; one small pager strip in the bottom left of every console's touch screen (◄, ►, LOCK, the page's short title), the same look everywhere; each console's page and lock kept in the one world state (saved, surviving room changes and reloads); and from Central Control, a choice of what the main viewscreen shows, kept the same way, the alarm takeover staying.

## What is on the bridge now

Everything is mounted by `installConsoles` in `src/toolkit/gallery/rooms/bridge-room.ts`, its places from `src/toolkit/gallery/logic/control-room-prototype.ts`. Measured from the code (2026-10-27; `y` includes the bridge's `STOREY`; yaw and tilt in radians). Each wired panel is built by `createParodyPanel` (`views/parody-panel.ts`) at its spec's size (`spec.size`, default 1.6 × 1.0 m) and scaled by `min(fit.w / (w + 0.1), fit.h / (h + 0.1))` into its place; the schematic screens are `createStationSchematic` / `createSchematicSurface` (`views/station-schematics.ts`) at their place's size, scale 1.

### Wired panels (`bridgePanelPlaces`)

| Proposed console id               | Where                     | Default page (code) | Title                                | Middle (x, y, z)      | Yaw   | Tilt | Fit w × h (m) | Spec size  |
| --------------------------------- | ------------------------- | ------------------- | ------------------------------------ | --------------------- | ----- | ---- | ------------- | ---------- |
| `flow-navigator.panel`            | forward station           | PL2-CP1             | PRIMARY CIRCULATION COMMAND          | (−5.57, 8.89, −5.32)  | −0.37 | 1.31 | 1.70 × 0.84   | 1.6 × 1.0  |
| `disinfection-tactical.panel`     | forward station           | PL2-CP2             | WATER CHEMISTRY ORACLE               | (−3.90, 8.89, −7.42)  | −0.23 | 1.31 | 1.70 × 0.84   | 1.6 × 1.0  |
| `boiler-helmsman.panel`           | forward station           | CR-MP2              | THERMAL WARP CORE · LTHW             | (−1.50, 8.89, −8.62)  | −0.08 | 1.31 | 1.70 × 0.84   | 1.6 × 1.0  |
| `life-support-officer.panel`      | forward station           | CR-MP3              | ATMOSPHERIC PROCESSING · POOL HALL   | (1.50, 8.89, −8.62)   | 0.08  | 1.31 | 1.70 × 0.84   | 1.6 × 1.0  |
| `chief-electrical-engineer.panel` | forward station           | SR-IS3              | PRIMARY POWER TRANSFER CONDUIT       | (3.90, 8.89, −7.42)   | 0.23  | 1.31 | 1.70 × 0.84   | 1.3 × 0.85 |
| `security-chief.panel`            | forward station           | CR-CP6              | COMBUSTION EVENT REPEATER            | (5.57, 8.89, −5.32)   | 0.37  | 1.31 | 1.70 × 0.84   | 1.2 × 0.85 |
| `central-control.panel`           | desk, front segment       | CC-01               | CENTRAL CONTROL                      | (0.00, 8.84, −4.55)   | 0.00  | 1.37 | 4.40 × 0.64   | 3.0 × 0.62 |
| `assistant-duty-manager.panel`    | desk, right segment       | ADM-01              | ASSISTANT DUTY MANAGER               | (2.67, 8.84, −4.05)   | −1.28 | 1.37 | 0.56 × 0.64   | 1.1 × 0.62 |
| `bather-welfare-counsellor.panel` | desk, left segment        | BWC-01              | BATHER WELFARE COUNSELLOR            | (−2.67, 8.84, −4.05)  | 1.28  | 1.37 | 0.56 × 0.64   | 1.1 × 0.62 |
| `east-wall.panel`                 | front wall, east (side 1) | CR-MP1              | OLYMPIC HYDRODYNAMIC OVERVIEW        | (12.94, 9.75, −7.68)  | −1.28 | 0    | 3.20 × 1.90   | 2.0 × 1.0  |
| `west-wall.panel`                 | front wall, west (side 6) | CR-CP2              | CONDITION RED · AQUATIC ALERT MATRIX | (−12.94, 9.75, −7.68) | 1.28  | 0    | 3.20 × 1.90   | 1.8 × 1.05 |
| `water-science-officer.panel`     | rear station              | CR-CP3              | TEMPORAL DATA ARCHIVE                | (−5.13, 10.14, 6.68)  | 2.51  | 1.23 | 1.90 × 0.64   | 1.8 × 0.9  |
| `drainage-officer.panel`          | rear station              | WH-T2               | WASTE EVACUATION PUMPS               | (−6.93, 10.14, 5.36)  | 2.51  | 1.23 | 1.90 × 0.64   | 1.6 × 1.0  |
| `loading-bay-chief.panel`         | rear station              | LB-CAB1             | TANKER DOCKING PORT                  | (6.93, 10.14, 5.36)   | −2.51 | 1.23 | 1.90 × 0.64   | 1.3 × 0.9  |
| `operations-officer.panel`        | rear station              | WH-CP1              | MOLECULAR DISTRIBUTION NEXUS         | (5.13, 10.14, 6.68)   | −2.51 | 1.23 | 1.90 × 0.64   | 1.6 × 1.0  |

### Schematic screens (`stationScreenPlaces`, `deskScreenPlaces`)

| Proposed console id                | Where                                      | Default page                      | Middle (x, y, z)                           | Glass w × h (m) |
| ---------------------------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------ | --------------- |
| `flow-navigator.screen`            | forward station's upper screen (tilt 0.35) | FLOW NAVIGATOR browser            | (−5.35, 9.32, −5.88)                       | 1.00 × 0.52     |
| `disinfection-tactical.screen`     | ditto                                      | DISINFECTION TACTICAL browser     | (−3.77, 9.32, −8.00)                       | 1.00 × 0.52     |
| `boiler-helmsman.screen`           | ditto                                      | BOILER HELMSMAN browser           | (−1.45, 9.32, −9.21)                       | 1.00 × 0.52     |
| `life-support-officer.screen`      | ditto                                      | LIFE SUPPORT OFFICER browser      | (1.45, 9.32, −9.21)                        | 1.00 × 0.52     |
| `chief-electrical-engineer.screen` | ditto                                      | CHIEF ELECTRICAL ENGINEER browser | (3.77, 9.32, −8.00)                        | 1.00 × 0.52     |
| `security-chief.screen`            | ditto                                      | SECURITY CHIEF browser            | (5.35, 9.32, −5.88)                        | 1.00 × 0.52     |
| `water-science-officer.screen`     | aft wall over its console                  | WATER SCIENCE OFFICER browser     | (−5.37, 10.80, 7.00)                       | 1.70 × 0.92     |
| `drainage-officer.screen`          | ditto                                      | DRAINAGE OFFICER browser          | (−7.17, 10.80, 5.68)                       | 1.70 × 0.92     |
| `loading-bay-chief.screen`         | ditto                                      | LOADING BAY CHIEF browser         | (7.17, 10.80, 5.68)                        | 1.70 × 0.92     |
| `operations-officer.screen`        | ditto                                      | OPERATIONS OFFICER browser        | (5.37, 10.80, 7.00)                        | 1.70 × 0.92     |
| `desk.0.1` … `desk.0.4`            | desk front upstand, west to east           | CENTRAL CONTROL browser (×4)      | (−2.12 / −0.71 / 0.71 / 2.12, 9.19, −4.96) | 0.86 × 0.34     |
| `desk.1.1`                         | desk right upstand                         | WATER SCIENCE OFFICER browser     | (3.04, 9.19, −4.26)                        | 0.87 × 0.34     |
| `desk.2.1`                         | desk right-rear upstand                    | FLOW NAVIGATOR browser            | (3.02, 9.19, −2.80)                        | 0.95 × 0.34     |
| `desk.5.1`                         | desk left-rear upstand                     | SECURITY CHIEF browser            | (−3.02, 9.19, −2.80)                       | 0.95 × 0.34     |
| `desk.6.1`                         | desk left upstand                          | MAIN VIEWSCREEN browser           | (−3.04, 9.19, −4.26)                       | 0.87 × 0.34     |

Desk screen ids are `desk.<segment side>.<k from 1>`, so they are stable while `upstandScreens` gives the same count per segment.

### Back-wall displays (`backWallScreenPlaces`) and the viewscreen

| Proposed console id    | Wall               | Default page                                                            | Middle (x, y, z)     | Glass w × h (m) | Pixels/m |
| ---------------------- | ------------------ | ----------------------------------------------------------------------- | -------------------- | --------------- | -------- |
| `back.site-status`     | side 4, high       | SITE STATUS rotator (Central Control's designs)                         | (−5.97, 13.45, 6.56) | 4.8 × 2.6       | 200      |
| `back.the-whole-plant` | side 3, high       | THE WHOLE PLANT rotator (main viewscreen's designs)                     | (5.97, 13.45, 6.56)  | 4.8 × 2.6       | 200      |
| `back.main-pools`      | side 4, eye height | MAIN POOLS rotator (olympic, lounge)                                    | (−2.35, 10.80, 9.22) | 3.0 × 1.5       | 320      |
| `back.small-pools`     | side 3, eye height | SMALL POOLS rotator (jacuzzi, footbath)                                 | (2.35, 10.80, 9.22)  | 3.0 × 1.5       | 320      |
| `back.heat-and-gas`    | side 4, eye height | HEAT AND GAS rotator (heating, gas)                                     | (−9.83, 10.80, 3.73) | 3.0 × 1.5       | 320      |
| `back.air-and-power`   | side 3, eye height | AIR AND POWER rotator (air, power)                                      | (9.83, 10.80, 3.73)  | 3.0 × 1.5       | 320      |
| `viewscreen`           | big wall (side 0)  | MAIN VIEWSCREEN browser; ALERT alarm list while any alarm is unaccepted | (0, 12.4, −10.82)    | 18.8 × 6.55     | 150      |

40 consoles in all. Interaction reaches only 3 m (`usableAt` in `shell-room.ts`), so the viewscreen's own strip cannot be pressed from the floor (hence its control at Central Control), and the two high back-wall displays' strips are reachable only standing close under them on the stage (their bottom edge is 3.1 m above the stage); the plan keeps their strips anyway for consistency, with their pages also settable as described below.

## The page registry

A new pure module, `src/toolkit/gallery/logic/bridge-pages.ts` (no Three.js, no DOM), lists every page a console can show, in paging order:

```ts
export type BridgePageKind =
  | 'panel'
  | 'schematics'
  | 'overview'
  | 'display'
  | 'custom';

export interface BridgePage {
  /** Stable, lower-case, kebab-case; what the world stores. Never renamed once shipped. */
  id: string;
  /** Its full title (the panel's spec title, the browser's station, the overview's title). */
  title: string;
  /** At most 14 characters, for the pager's strip. */
  short: string;
  kind: BridgePageKind;
  /** Which kinds of console may show it (see the next section). */
  suits: readonly ConsoleClass[];
  /** 'panel': its spec code (`BRIDGE_BINDINGS`); 'schematics': its station; 'overview': its overview id; 'display': its design list. */
  source: string | readonly string[];
}
```

The view side (`src/toolkit/gallery/views/bridge-pages.ts`) maps each kind to a builder, `buildPage(kit, page, size, context, shared): LiveExhibit`, reusing what exists: `createParodyPanel(kit, bridgeSpec(code), …, { binding: BRIDGE_BINDINGS[code], … })` for panels, `createStationSchematic` for station browsers, `designScreen([{ kind: 'overview', overview }], { mode: 'single' })` with `createSchematicSurface` for overviews, and `designScreen(designs, { mode: 'rotator' })` for displays.

| Id                                                                                                                                             | Kind              | Title                                                                                                                                                   | Short                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pl2-cp1`                                                                                                                                      | panel             | PRIMARY CIRCULATION COMMAND                                                                                                                             | CIRCULATION                                                                                                                                                     |
| `pl2-cp2`                                                                                                                                      | panel             | WATER CHEMISTRY ORACLE                                                                                                                                  | DOSING                                                                                                                                                          |
| `cr-mp2`                                                                                                                                       | panel             | THERMAL WARP CORE · LTHW                                                                                                                                | HEATING                                                                                                                                                         |
| `cr-mp3`                                                                                                                                       | panel             | ATMOSPHERIC PROCESSING · POOL HALL                                                                                                                      | AIR                                                                                                                                                             |
| `sr-is3`                                                                                                                                       | panel             | PRIMARY POWER TRANSFER CONDUIT                                                                                                                          | CHANGEOVER                                                                                                                                                      |
| `cr-cp6`                                                                                                                                       | panel             | COMBUSTION EVENT REPEATER                                                                                                                               | FIRE                                                                                                                                                            |
| `cc-01`                                                                                                                                        | panel             | CENTRAL CONTROL                                                                                                                                         | CENTRAL CTRL                                                                                                                                                    |
| `adm-01`                                                                                                                                       | panel             | ASSISTANT DUTY MANAGER                                                                                                                                  | ASST DUTY MGR                                                                                                                                                   |
| `bwc-01`                                                                                                                                       | panel             | BATHER WELFARE COUNSELLOR                                                                                                                               | WELFARE                                                                                                                                                         |
| `cr-mp1`                                                                                                                                       | panel             | OLYMPIC HYDRODYNAMIC OVERVIEW (the main pool mimic)                                                                                                     | MAIN POOL                                                                                                                                                       |
| `cr-cp2`                                                                                                                                       | panel             | CONDITION RED · AQUATIC ALERT MATRIX (the annunciator)                                                                                                  | ANNUNCIATOR                                                                                                                                                     |
| `cr-cp3`                                                                                                                                       | panel             | TEMPORAL DATA ARCHIVE                                                                                                                                   | RECORDERS                                                                                                                                                       |
| `wh-t2`                                                                                                                                        | panel             | WASTE EVACUATION PUMPS                                                                                                                                  | PIT PUMPS                                                                                                                                                       |
| `lb-cab1`                                                                                                                                      | panel             | TANKER DOCKING PORT                                                                                                                                     | FILL CABINET                                                                                                                                                    |
| `wh-cp1`                                                                                                                                       | panel             | MOLECULAR DISTRIBUTION NEXUS                                                                                                                            | DISTRIBUTION                                                                                                                                                    |
| `olympic-filter-washing`                                                                                                                       | custom (or panel) | OLYMPIC FILTER WASHING                                                                                                                                  | FILTER WASH                                                                                                                                                     |
| `schematics.flow-navigator` … `schematics.main-viewscreen`                                                                                     | schematics        | each of `STATION_NAMES`' browser (12)                                                                                                                   | the station, shortened (FLOW NAV, BOILERS, ELECTRICAL, DISINFECTION, LIFE SUPPORT, SECURITY, WATER SCI, DRAINAGE, LOADING BAY, OPERATIONS, CENTRAL, VIEWSCREEN) |
| `overview.olympic` … `overview.make-up`                                                                                                        | overview          | each of `OVERVIEWS` (12: olympic, lounge, jacuzzi, footbath, heating, gas, hypochlorite-distribution, acid-distribution, air, power, backwash, make-up) | OLYMPIC, LOUNGE, JACUZZI, FOOTBATH, HEATING, GAS, HYPO, ACID, AIR, POWER, BACKWASH, MAKE-UP                                                                     |
| `display.site-status`, `display.the-whole-plant`, `display.main-pools`, `display.small-pools`, `display.heat-and-gas`, `display.air-and-power` | display           | the back walls' rotators (`BACK_WALL_SCREENS`)                                                                                                          | SITE STATUS, WHOLE PLANT, MAIN POOLS, SMALL POOLS, HEAT & GAS, AIR & POWER                                                                                      |

46 pages. Panels are generated from `BRIDGE_BINDINGS` (its keys in a fixed order list, so a binding added later appears where it is listed, never reordering the rest), the schematics from `STATION_NAMES`, the overviews from `OVERVIEWS`, the displays from `BACK_WALL_SCREENS`. Ids are written out, not derived at run time from titles, so a retitled panel keeps its saved choice.

### How OLYMPIC FILTER WASHING joins (for the agent building it)

Either of two ways, whichever its page is:

1. **If it is a wired panel** (a `ParodySpec` with a `PanelBinding`): add its binding to `BRIDGE_BINDINGS` and its spec to `bridgeSpec`, as every other panel, then add one line to `BRIDGE_PAGE_ORDER` in `logic/bridge-pages.ts`: `{ id: 'olympic-filter-washing', code: '<its code>', short: 'FILTER WASH' }`. Nothing else: the builder for `panel` pages does the rest.
2. **If it is its own view** (a `ui2d` tree on a touch surface, or a `LiveExhibit`): register a custom builder: `registerBridgePage({ id: 'olympic-filter-washing', title: 'OLYMPIC FILTER WASHING', short: 'FILTER WASH', kind: 'custom', suits: ['panel', 'screen', 'wall', 'back', 'viewscreen'] }, (kit, size, context) => LiveExhibit)` in `views/bridge-pages.ts`. The builder must draw within `size` (metres, glass about its origin facing +z, as `createSchematicSurface`), read the world only through `context()` (`{ world, reading }`), dispatch only world actions, and dispose its parts. A test in `bridge-pages.test.ts` will fail if a registered page has no builder or a duplicate id.

To make it some console's default, set that console's `defaultPage` in `src/game/bridge-consoles.ts` (below); existing saves that never chose a page for that console will then show it.

## Which consoles show which pages

Each console has a class, and pages a `suits` list; a console pages through the registry, in its order, keeping only pages that suit its class, with its own default first so ► from a fresh console goes to the next sensible page and ◄ wraps to the last.

| Console class | Consoles                                   | Pages it pages through                                                                                                                      |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `panel`       | the 15 wired-panel places                  | all panels, filter washing, the 12 station browsers                                                                                         |
| `screen`      | 10 station screens, 8 desk upstand screens | the 12 station browsers, the 12 overviews, the 6 displays, filter washing, and (on the 1.70 × 0.92 rear screens only, by aspect) the panels |
| `wall`        | the two front-wall panels (3.2 × 1.9 fit)  | everything (46)                                                                                                                             |
| `back`        | the six back-wall displays                 | station browsers, overviews, displays, filter washing                                                                                       |
| `viewscreen`  | the main viewscreen                        | everything (46)                                                                                                                             |

A page shown in a place of another aspect is built at its own natural size and scaled to fit, centred (letterboxed), as panels are scaled now; a schematic page in a panel place is built at that place's default panel's natural size, so it covers the same footprint. The rule "a panel's aspect may not be letterboxed to less than half the place's area" excludes panels from the 2.5:1 desk upstands (a 1.6:1 panel would be a third of the screen). Two consoles may show the same page: each is its own instance reading the one world (the annunciator is the world's, so two copies of CR-CP2 or CC-01 accept alike).

## The pager widget

A generic `ui2d` component, `ConsolePager`, in a new `src/ui2d/pager.ts` (exported from `index.ts`, described in `src/ui2d/README.md`): no game imports, nothing of pools or the bridge. It is a row on the theme's black ground:

```
┌──────┬──────┬────────┬──────────────────────┐
│  ◄   │  ►   │  LOCK  │  SHORT TITLE    3/46 │
└──────┴──────┴────────┴──────────────────────┘
```

- **Its tree:** a `Stack('row')` of a `Button` ◄ (half-pill, left cap), a `Button` ► (square, no cap), a `Toggle` LOCK (half-pill, right cap; lit in the theme's `lit` colour while locked, dark otherwise), and a `Label` (the page's short title, left aligned, with a small `index/count` at its right in the `dim` colour).
- **Its API:** `new ConsolePager({ onStep(dir: -1 | 1): UiSound | void, onLock(locked: boolean): UiSound | void, colour? })` and `pager.set({ title, index, count, locked })`, which marks it dirty only when something shown changes. While locked, ◄ and ► are disabled (drawn in `dim`, a press answers `'deny'`); the LOCK toggle works either way. The host (the bridge) decides what a step means and calls `set` with the world's answer; the widget keeps no page state of its own, so a page changed elsewhere (another console, a reload) shows at once.
- **Pixels:** drawn on its own canvas, always 320 × 64 px, laid out ◄ 0–56, ► 60–116, LOCK 120–196, title 204–320, so it looks the same everywhere whatever its physical size.
- **Physical size per console:** height `hp = clamp(0.055 × H, 0.035, 0.36)` m where H is the console's glass height as shown, width `5 hp`. So: forward-station and rear-station panels (glass about 1.22 × 0.76 after scaling) 42 × 210 mm; Central Control (about 2.67 × 0.55) 35 × 175 mm; the side desk panels (0.51 × 0.29) 35 × 175 mm, which is a third of their width (acceptable; they are small); desk upstand screens (0.34 high) 35 × 175 mm; station screens (0.52) 35 × 175 mm; rear screens (0.92) 51 × 253 mm; front-wall panels (about 2.9 × 1.6) 88 × 440 mm; eye-height back-wall displays (1.5) 83 × 413 mm; high back-wall displays (2.6) 143 × 715 mm; the viewscreen (6.55) 360 × 1800 mm.
- **Where:** in the bottom-left corner of the console's glass, inset by the glass's corner radius plus 4 mm (`screenCornerRadius`) from its left and bottom edges, so it clears the rounded corner. On a `Frame` page (every panel and every schematic browser) it lies inside the frame's bottom-left elbow (the elbow is H/6 high and 0.43 H wide; the strip is 0.055 H high and 0.275 H wide), which is decoration, so it hides nothing that reads or works. Shaped panels (CR-CP6 and WH-T2 appear to have trapezium or hexagon outlines in `parody-specs.ts`; to be confirmed) put it at the outline's lowest-left point inside, found from the outline polygon.
- **How it is drawn:** its own touch surface (`createTouchSurface`, one screen, `bezel: 0`, `depth: 0.002`, its corner radius the default's), 3 mm in front of the console's glass, a child of the console's holder, so it is tilted and turned with it. It is not part of the page's tree, so every page, old or new, gets the same strip without being changed.
- **Sounds:** the kit's: `page` for a step, `confirm` for LOCK, `deny` for a step while locked.

## Mounting a pageable console

A new view, `src/toolkit/gallery/views/bridge-console.ts`: `createBridgeConsole(kit, console, context, store, shared): Part`, used by `installConsoles` for every console in place of today's three loops (keeping each place, scale rule, `markComponent` and name as now).

- **Holder:** a `Group` at the console's place (position, `rotation.order = 'YXZ'`, `rotation.set(-tilt, yaw, 0)` as now). Inside it the current page's `LiveExhibit` and the pager's surface.
- **Choosing the page:** `pageOf(world, consoleId)` = the world's `page` if it names a page that suits the console, else the console's default. Read twice a second with the rest (the existing 0.5 s reads) and on any world change; the content is rebuilt only when that id changes (redraw only on change). A rebuild disposes the old exhibit (its parts, its textures, `panel.dispose`) before building the new.
- **Presses, with content that changes:** the room's part set copies each part's `uses` when it is added (`createPartSet().add` in `parts.ts`, consumed by `shell-room.ts`), so a rebuilt page's meshes would not be found. The console's `Part` therefore registers one use for its holder group, a forwarder: on a press, it asks `touchPoint(object)` (`controls/input/touch-point.ts`, set by `touchingAt` for the duration of the press; non-null only when the touch is on that object or a mesh within it) of each key of the pager's and the current page's `uses`, and calls the first that was touched, so the touch surface inside then reads its own touch point as it does now. Raycasting already walks from the hit mesh up through its parents to the holder. No change to the shared part set or the shell room.
- **Paging:** ◄ / ► dispatch `bridge/console` with the next or previous suiting page (wrapping); LOCK dispatches `locked`. The pager's `set` follows the world on every read.
- **Unchanged:** the places, the scale rule (so alignment and flush fit stay), the plaques (`plaques` list, per station, not per page), the collision (from desks, stations and rear consoles, never from panels), the ready-room reserve, the back walls' fin clearance.

## The world: state, action, migration

A new pure module, `src/game/bridge-consoles.ts` (no gallery imports, so the game layer stays pure):

```ts
export interface ConsoleChoice {
  /** A page id from the bridge's registry; null for the console's own default. */
  page: string | null;
  /** Locked on its page: ◄ ► refused. */
  locked: boolean;
}
/** Every console on the bridge, by id, and its default page id (data only; the gallery's registry test checks each resolves). */
export const BRIDGE_CONSOLES: readonly { id: string; defaultPage: string }[] = [
  /* the 40 above */
];
export const newBridgeConsoles = (): Record<string, ConsoleChoice> =>
  Object.fromEntries(
    BRIDGE_CONSOLES.map((c) => [c.id, { page: null, locked: true }]),
  );
export function chooseConsole(
  state,
  id,
  change: { page?: string | null; locked?: boolean },
); // same object if nothing changes; unknown id ignored; a page change refused while locked
```

- **World field:** `bridgeConsoles: Record<string, ConsoleChoice>` on `World` (`src/game/world.ts`), `newWorld()` setting `newBridgeConsoles()`. The viewscreen is the console `viewscreen` in the same record.
- **Action:** `{ type: 'bridge/console'; console: string; page?: string | null; locked?: boolean }`, through `applyAction`, logged like the knob's. The world does not know the page registry: it stores the id; the view falls back to the default for an id it does not know, so a page removed later cannot break a save.
- **Defaults:** `page: null` (each console's default, today's assignment) and `locked: true`, so today's layout is kept and a stray click while walking past does not page a console; the owner unlocks the ones he wants to set. (If the owner would rather start unlocked, it is the one constant in `newBridgeConsoles`.)
- **Saving:** `fillDefaults` (`save.ts`) iterates the default's keys, so a record keyed by console id fills every console present in `BRIDGE_CONSOLES`, drops consoles that no longer exist, and keeps a saved `page` string against the default `null` (the null rule already in `fillDefaults`).
- **Migration:** `WORLD_VERSION` is 49 today (49 = the annunciator, 2026-10-27). At implementation time, immediately before the bump, re-read `WORLD_VERSION` and `MIGRATIONS` in `save.ts` and the working tree's uncommitted diffs to `world.ts` and `save.ts` (the alarm and filter-washing agents may have bumped it); take the next free number N, add `MIGRATIONS[N - 1] = (world) => world` (an identity migration: `fillDefaults` adds every console at its default, locked), commented `// (N-1) → N: the bridge's consoles' pages and locks (the owner, 2026-10-27)`, after theirs in the chain. If a merge brings in a competing bump to the same number, renumber ours to the next and keep both migrations in order.
- **Health:** an entry in `src/game/health.ts`'s field table: `bridgeConsoles: 'not health: what the bridge's consoles show and whether locked'` (the table is `satisfies Record<keyof World, string>`, so typecheck demands it).
- **Dev rooms:** dev46, dev47, dev48 and dev49 are not changed and start fresh; only the game's bridge uses the world field.

## The viewscreen chosen from Central Control

- **Central Control's pager strip carries two rows:** its own (CC-01's page, as every console) and, directly above it, a second `ConsolePager` labelled for the viewscreen (its title prefixed `VS ·`, e.g. `VS · OLYMPIC`), working the console `viewscreen` in the world. Same widget, same look, stacked in Central Control's bottom-left corner, both inside its frame's elbow (two strips 35 mm each, 4 mm apart, under the elbow's 100 mm). No change to CC-01's spec or binding (`bridge-bindings.ts` is left to the filter-washing agent).
- **The viewscreen itself:** `createViewscreen` (`views/bridge-viewscreen.ts`) takes the chosen page: its `SCHEMATIC` page becomes the chosen page's exhibit (default: the MAIN VIEWSCREEN browser, as now), rebuilt only when the choice changes; its `ALARMS` page and `viewscreenShows` stay as they are, so while any alarm is unaccepted the alert list takes over whatever is chosen and the chosen page returns after ACCEPT. Its own strip in its bottom-left shows the same state (readable from the room, 360 mm high), though out of reach. The browser's own list stays usable on its default page.
- **Pages for it:** all 46. A wired panel on the viewscreen is drawn at 150 px/m over 18.8 m (about 2800 px wide), legible from the room.

## Files to change

New:

- `src/ui2d/pager.ts` and `src/ui2d/pager.test.ts`: `ConsolePager` (layout, disabled while locked, dirty only on change, press outcomes and sounds).
- `src/game/bridge-consoles.ts` and `src/game/bridge-consoles.test.ts`: console ids and defaults, `ConsoleChoice`, `newBridgeConsoles`, `chooseConsole`.
- `src/toolkit/gallery/logic/bridge-pages.ts` and `bridge-pages.test.ts`: the registry, `BRIDGE_PAGE_ORDER`, `consolePages(console)`, `stepPage(console, current, dir)`, `pageOf(world, console)`, the suiting rule.
- `src/toolkit/gallery/views/bridge-pages.ts`: `buildPage`, `registerBridgePage` for custom pages.
- `src/toolkit/gallery/views/bridge-console.ts`: `createBridgeConsole` (holder, rebuild on change, forwarder, pager placement).

Changed (minimal edits):

- `src/game/world.ts`: the field, `newWorld`, the action and its case.
- `src/game/save.ts`: the migration; `WORLD_VERSION` in `world.ts`.
- `src/game/health.ts`: the field's entry.
- `src/game/save.test.ts`: a save from the version before ours loads with every console at its default, locked; a chosen page and lock survive a round trip; an unknown console is dropped.
- `src/toolkit/gallery/rooms/bridge-room.ts`: `installConsoles`' three loops and the viewscreen block replaced by `createBridgeConsole` per console (the rest of the file, the alarm bleep, chatter, ambience and light switch, untouched).
- `src/toolkit/gallery/views/bridge-viewscreen.ts`: the chosen page in place of the fixed browser.
- `src/ui2d/index.ts`, `src/ui2d/README.md`: export and describe the pager.
- Records: `CHANGELOG.md` (Unreleased), `doc/prompts/095-the-bridge.md` (a section "Console paging"), `TODO.md` (the mission's entry, ticked when done), a diary entry.

## Risks and conflicts

- **Shared files in motion:** `bridge-room.ts` (alarm bleep, room tone: the other agent's uncommitted work is in it now), `world.ts` and `save.ts` (alarm acceptance, perhaps the filter-washing agent), `parody-panel.ts` (uncommitted changes now), `bridge-bindings.ts` (the filter-washing agent). Mitigation: put nearly everything in new files; touch the shared ones in small, separate hunks, re-read each immediately before editing, never stage another's hunks (stage by name only after checking `git diff` is ours alone), merge `origin/main` before and after.
- **`WORLD_VERSION` races:** as above; the identity migration is trivial to renumber.
- **Rebuild cost and leaks:** building a wired panel makes a canvas texture and its meshes (tens of ms); paging is a rare press, so acceptable, but each old exhibit must be disposed (textures, geometries) or GPU memory grows as the owner pages. Test by paging 50 times in the game and watching `renderer.info.memory`.
- **Presses on rebuilt content:** handled by the holder's forwarder; if `touchPoint` is not set for some input path (keyboard use of the crosshair), the forwarder falls back to the pager or to the page's first use. To check in the browser with the crosshair and with a click.
- **Inspection overlay:** `markComponent` on each holder must read the current page (its status the page's), and the world-in-model test (every panel bound to its node) must accept a console whose node follows its page; each page's `model.node` comes from its binding, the schematic pages' from `operator-desk`, as now.
- **Two copies of a stateful panel:** a panel's own UI state (its page within its frame, a refusal notice) is per instance and lost when paged away; only world state persists. Acceptable; say so in the mission record.
- **The pager covering content:** inside the frame's bottom-left elbow on every frame page; a custom page without a frame (filter washing, if built so) should leave its bottom-left 0.06 H × 0.3 H clear: noted in its joining instructions.
- **Reach:** the viewscreen's strip and the high displays' strips are out of or at the edge of the 3 m reach; the viewscreen is worked from Central Control; the high displays are reachable from the stage under them (to be checked; if not, give each high display a mirror strip on the rear station below it, a later decision for the owner).
- **Locked by default** may surprise: the first press of ◄ on a fresh save is refused with a deny bleep and LOCK lit. That is the point of the lit LOCK; to confirm with the owner.

## Tests

- `ui2d/pager.test.ts`: its layout in 320 × 64; ◄ and ► call `onStep(-1/1)` and sound `page`; while locked they are disabled and sound `deny`, `onStep` not called; LOCK calls `onLock` either way; `set` with the same values does not mark it dirty, with a new title does.
- `game/bridge-consoles.test.ts`: `newBridgeConsoles` has every id once, each `{ page: null, locked: true }`; `chooseConsole` returns the same object when nothing changes, refuses a page change while locked, accepts a lock change, ignores an unknown console; ids unique and stable (snapshot of the id list, so a rename is a conscious act).
- `game/world.test.ts` or `save.test.ts`: `bridge/console` through `applyAction`; a migrated older save; a round trip keeps a choice; a stale page id in a save survives loading (the view falls back).
- `gallery/logic/bridge-pages.test.ts`: every page id unique and kebab-case; every `panel` page's code in `BRIDGE_BINDINGS` and every binding a page; every station and overview has a page; every console's `defaultPage` resolves and suits it; every console's list starts with its default and contains only suiting pages; `stepPage` wraps both ways; `pageOf` falls back to the default for an unknown or unsuitable id; the pager's rectangle lies inside every console's glass (and inside a shaped panel's outline) and inside a `Frame`'s bottom elbow; Central Control's two strips do not overlap.
- The existing layout tests (panels flush, plaques, the walkway flood, the ready-room reserve, clear of the fins) run unchanged and must still pass.
- In the browser (`http://127.0.0.1:5175/?room=bridge&slot=pager102`): page a forward station's panel and its screen, lock one, leave to the corridor and return, reload, and see both kept; choose a viewscreen page from Central Control; raise an alarm (the Olympic plant room's feeder off) and see the takeover, ACCEPT, and the chosen page return; screenshots before and after.

## Estimate

About a day of agent time once the others have finished: the registry and its tests 1.5 h; the world field, action, migration and tests 1.5 h; the pager widget and its tests 1.5 h; the console mount with rebuild and the forwarder 2.5 h; the viewscreen choice 1 h; records, browser check, merges and the gates (typecheck, lint, format, tests, build) 1.5 h. Most of the risk is in the press forwarding and disposal, so those are done first and checked in the browser before the rest.

## Implemented as

Built 2026-10-27. The owner saw it live while it was built and ruled several times; where this section and the plan above differ, this section is what was built.

### The owner's rulings (2026-10-27)

- **Roles, not free paging, at a workstation.** "The lower display you set determines which upper displays are available, so for example if you select filtration officer, then all of the upper displays should be related to filtration." A workstation's lower console (its input panel) is set to a role, an officer, by ◄ and ►, and shows that role's panel; its upper displays then page only through that role's displays. Setting a new role resets each upper display to its own entry of the new role's list: the first, or a different one each where a station has several upper screens (Central Control's four desk screens). The role is the lower console's page, so it persists in the world like every console's page.
- **Lower for control, upper for information** (a loose rule, both take some input): the lower console's page for a role is its control panel (starts and stops, valves, set points); the upper displays' pages are schematic browsers, overviews and the back walls' displays (plus OLYMPIC FILTER WASHING, which is a page of touch input but suits any console).
- **LOCK only where a display turns by itself.** "The lock is only needed on the schematic displays ... not on the workstation LCARS input panels, since those do not advance automatically." The stations' and desk's upper screens, the back walls' displays and the main viewscreen (and Central Control's viewscreen strip) have ◄ LOCK ►; the workstations' lower panels and the front walls' panels have ◄ ► alone.
- **What LOCK does.** "The lock should prevent the display from advancing." LOCK holds the page's own rotation on the design it shows (its rotator paused, `hold` on `SchematicScreen`, `createSchematicSurface` and `createViewscreen`); unlocking lets it turn again. ◄ and ► still work while locked: they choose the page that is then held. (The plan's "locked: ◄ ► refused" was dropped.)
- **The strip's look.** The order is ◄, LOCK, ► (the lock between the arrows), the three buttons the same size (pill-proportioned blocks 64 px wide on the strip's 320 × 64 px surface); without a LOCK, ◄ and ► the same size side by side. The arrows are drawn arrowheads, large and centred in their blocks, about the size of the LOCK lettering, which is centred too.

### Choices made where the plan left one open

- **Unlocked by default:** every console starts on its default page, unlocked (`newBridgeConsoles`), so its own rotation runs as before.
- **Central Control's viewscreen strip** sits beside its own strip (to the right, along the frame's bottom bar), not above it: above, it covered the left end of ACCEPT ALARMS. It is titled `VS · ` and the page's short name.
- **Presses on a strip:** a strip's sheet and screen lie in one plane, so the ray can strike the sheet first; the console's forwarder (its one use on its holder) therefore hands any touch inside a strip's rectangle to that strip's screen by its point in the plane, and anything else to whichever of the page's pieces was touched (`touchPoint`).
- **Pixels:** a schematic page is drawn at 600 px/m under 1.2 m high, 320 under 2 m, 200 above (the canvas capped at 2048 px a side as before); a panel at its own 560 px/m, scaled to fit.
- **Rear screens and panels:** the plan's "panels on the 1.70 × 0.92 rear screens by aspect" was not built: panels suit panel places, the front walls and the viewscreen only.
- **Pages that do not turn** (a wired panel, a single overview, the filter washing page) ignore LOCK beyond showing it lit.
- **Disposal on rebuild:** a paged-away exhibit's geometries, its textures and materials (taken out of the kit's lists again) and its boot screens (out of the room's boot group) are freed.
- **Two consoles may show the same page**; a panel's own UI state (its page within its frame, a refusal notice) is lost when paged away; only world state persists.

### The roles and their displays (`ROLE_PAGES`, `logic/bridge-pages.ts`)

The first entry is the role's panel (the lower console's page); the rest are the upper displays' pages (those suiting a screen).

| Role                      | Lower (panel) | Upper displays                                                                                                                           |
| ------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Flow Navigator            | PL2-CP1       | FLOW NAVIGATOR browser, OLYMPIC FILTER WASHING, overviews olympic, lounge, jacuzzi, footbath, backwash; displays MAIN POOLS, SMALL POOLS |
| Disinfection Tactical     | PL2-CP2       | DISINFECTION TACTICAL and WATER SCIENCE OFFICER browsers; overviews olympic, lounge; MAIN POOLS                                          |
| Boiler Helmsman           | CR-MP2        | BOILER HELMSMAN browser; overviews heating, gas; HEAT AND GAS                                                                            |
| Life Support Officer      | CR-MP3        | LIFE SUPPORT OFFICER browser; overview air; AIR AND POWER                                                                                |
| Chief Electrical Engineer | SR-IS3        | CHIEF ELECTRICAL ENGINEER browser; overview power; AIR AND POWER                                                                         |
| Security Chief            | CR-CP6        | SECURITY CHIEF browser; overview gas; SITE STATUS                                                                                        |
| Central Control           | CC-01         | CENTRAL CONTROL and MAIN VIEWSCREEN browsers; SITE STATUS, THE WHOLE PLANT                                                               |
| Assistant Duty Manager    | ADM-01        | CENTRAL CONTROL browser; SITE STATUS, THE WHOLE PLANT                                                                                    |
| Bather Welfare Counsellor | BWC-01        | MAIN VIEWSCREEN browser; MAIN POOLS, SMALL POOLS                                                                                         |
| Water Science Officer     | CR-CP3        | WATER SCIENCE OFFICER and DISINFECTION TACTICAL browsers; overviews olympic, lounge, jacuzzi, footbath; MAIN POOLS, SMALL POOLS          |
| Drainage Officer          | WH-T2         | DRAINAGE OFFICER browser; overviews backwash, make-up                                                                                    |
| Loading Bay Chief         | LB-CAB1       | LOADING BAY CHIEF and OPERATIONS OFFICER browsers                                                                                        |
| Operations Officer        | WH-CP1        | OPERATIONS OFFICER and LOADING BAY CHIEF browsers; overview make-up                                                                      |

Which lower console governs which upper displays (`governor` in `game/bridge-consoles.ts`): each forward and rear station's screen its own station's panel; the desk's four front screens and its right-rear and left-rear screens Central Control's; its right screen the Assistant Duty Manager's; its left screen the Bather Welfare Counsellor's. A lower console pages through the thirteen roles' panels, its own default first. The front walls' panels, the back walls' displays and the viewscreen are no workstation's: each pages through every page that suits it, its default first. An upper display's default stays today's page where its role (at the start, its station's own) lists it.

### Where it lives

- `src/ui2d/pager.ts` (`ConsolePager`, generic, tested in `pager.test.ts`).
- `src/game/bridge-consoles.ts`: the 40 consoles, their kinds, defaults, roles and governors; `ConsoleChoice`, `chooseConsole`. The world's `bridgeConsoles` (`WORLD_VERSION` 52, migration 51 → 52 an identity, `fillDefaults` adding every console), the action `bridge/console`, its health entry and its log line.
- `src/toolkit/gallery/logic/bridge-pages.ts`: the registry (panels, the filter washing page, the 12 station browsers, the 10 overviews, the 6 displays: 44 pages), `ROLE_PAGES`, `consolePages`, `pageOf`, `stepPage`, `roleOf`, `chooseRole`, the console ids of the places and the strip's placement; tested in `bridge-pages.test.ts`.
- `src/toolkit/gallery/views/bridge-console.ts`: `buildPage`, `createBridgeConsole` (holder, rebuild on change, the forwarder, the strips, LOCK's hold) and `installBridgeConsoles`, which `bridge-room.ts` now calls in place of its own loops.
- `src/toolkit/gallery/views/bridge-viewscreen.ts`: its own browser blank behind another chosen page, `alarms()` for the takeover over it, `hold`.
