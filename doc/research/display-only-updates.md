# Segregating the model: slow parts and display-only work

Status: research only (2026-10-27, for the owner). Nothing implemented; no code changed. Measured at `bc5aaa5` on this Mac (Apple M5, Node through the project's vitest), with temporary scratch tests that were deleted afterwards. Anything marked **(guess)** is reasoning, not a measurement.

## Contents

- The question
- Short answer
- How the simulation runs now
- How the rooms show it
- Measurements
- Display audit
- Proposal (a): slow-rate updates for slow, manually driven parts
- Proposal (b): display-only work gated by room, distance and view
- Things that must not be gated
- Recommendation and estimated impact
- Phased plan (for a mission prompt)

## The question

The owner (2026-10-27), paraphrased: can we improve performance by segregating the model? (1) Some parts change slowly and only by hand (isolators, feeders, switches), and anything downstream of them changes slowly, so they need not be refreshed every frame. (2) Many parts are display-only (a component's dot-matrix, LCD or seven-segment readout, gauges, lamps, chart recorders, mimics); a display has no downstream effect except when someone looks at it, so could it be computed and drawn only when the player is in the same room, or only within about 5 m, so no time is spent working out what every flow meter, pump or dosing system displays?

## Short answer

- **The world model is not where the frame time goes.** One world step costs about 0.08 ms and runs ten times a second: under 1 ms of main-thread time per real second, about 0.1 % of the frame budget at 60 fps. Making slow parts update less often (proposal a) cannot make the game noticeably faster at 1×. It would matter for two other things: catching up after the game was closed (an hour now blocks the page for about 3 s), and the planned time acceleration. For both, the right tool is to make the step cheaper by memoising what only changes when the player acts, not to step parts at different rates. Two hot spots found in the profile account for about half the step.
- **Display-only work is already segregated by room.** Only the room the player is in, plus at most one room seen through an open doorway, runs its frame loop; every hidden room's loop returns at once, and rooms not next door are not built at all. Nothing computes what an off-room flow meter shows. So the "only when in the same room" idea is the status quo; the remaining question is whether, within the drawn room, displays waste work: redrawing and re-uploading canvas textures that have not changed, and deriving their state 60 times a second from a world that changes 10 times a second. The audit below finds most readouts already redraw only on change; the waste is a few unguarded redraws (the worst a 512 × 512 chart recorder every frame in the control room) and per-frame derivation and string building in front of the guards. That is real but modest CPU work; the dominant cost is GPU and draw calls (post-processing, shadows, 1,600+ draw calls in the Olympic plant room), already covered by the graphics presets research.
- **Recommended:** do the cheap, safe wins in the views (redraw a canvas only when what it shows changes; derive view state once per world change, not once per frame; optionally throttle and distance-gate redraws), and memoise the two hot spots in the world step. Do not split the world into fast and slow rates. Put the main performance effort into the GPU-side work (graphics presets, draw-call merging, room preparation).

## How the simulation runs now

**One world, one clock.** `src/toolkit/save/world-store.ts` holds the world in a `@preact/signals-core` signal. A `setInterval` every `STEP` (0.1 s, `world.ts:1327`) calls `advance(world, elapsed, STEP, onStep)` (`world.ts:1335`), which runs `stepWorld` in fixed 0.1 s steps over the real time that passed (so a throttled background tab catches up in one tick), and `diffWorld` (`src/game/events/watchers.ts:132`) after every step to log what the plant did by itself. The clock stops while paused. It saves every 10 s and on every player action (`dispatch`). On load it catches up the time the game was closed, up to `CATCH_UP_LIMIT` = 3,600 s (`save.ts:24`), in the same 0.1 s steps. The title's attract sequence runs its own scenario world the same way (`createScenarioStore`).

**The step.** `stepWorld` (`world.ts:808`) wraps `stepPlant` (`world.ts:851`) with the site intake's meters. `stepPlant` steps everything, every step, regardless of which room the player is in: the Wash-O-Tron, SLOW START, the lounge's valve travel, the motors' starters, the air handling, the jacuzzi cabinet, the spa cabinets and filters, the pools' water (`stepPoolsWater`), the wet hall, music, the boiler gas, the filter beds, the make-up and sewer recorders, the bathers, the gas zones, the lighting, the central battery and the chemical distribution. Everything is immutable: an unchanged part returns the same object, so reference equality is a cheap "has this changed?" test.

**What in the world exists only for displays.** Very little, and none of it is waste:

- _Chart recorders' history_ (`sewer` and `makeUpRecord`, `plant/sewer-monitor.ts`) is state, not display: a sample every 300 s, a week kept, so the chart survives the player being elsewhere and a reload. Its per-step cost is a few additions. It must keep running everywhere.
- _Display strings_ are not computed by the world step. Formatting functions live in `src/game/plant/` (`bottleReadout` and `bottleLcd` in `dose-bottle.ts`, the jacuzzi cabinet's lines in `jacuzzi-cabinet.ts:211`, the spa filter's timer in `spa-filter.ts:204`, the Wash-O-Tron's clock in `wash-o-tron.ts:208`, `flowmeterLines` in `part-inspection.ts:199`), but they are pure functions called from views or from the inspector on demand, not from `stepWorld`. So "compute display strings lazily" is already true at the world level.
- _Totalisers and meter counts_ (the intake's meters, the sewer total) are state a display shows, and also feed the event log and the health checks; they are cheap.

So the distinction the owner draws is already the code's: the world holds state (including what a recorder has recorded); displays derive what they show from it, in the room's frame loop.

**Events.** `diffWorld` runs after every step (about 0.7 µs, measured below); it is negligible.

## How the rooms show it

**Only drawn rooms run.** Each room has its own `WebGLRenderer` and frame loop (`renderer.setAnimationLoop`). Every room loop begins with `if (canvas.parentElement?.hidden) return;` (for example `plant-room-shell-room.ts:510`, `pool-hall-room.ts:691`), so a built but hidden room does no updates and no drawing. `src/main.ts` builds only the current room, the pool loop's lazy neighbours (`lazyNeighbours`, built hidden, not drawn), the room behind an open door (`ensureBuilt` in `checkDoors`, `main.ts` around 1475) and the PR_A cluster (`preloadCluster`, `main.ts:1686`); rooms that are no longer next door are released and disposed (`release`). The nearest closed `onOpen` door (the plant rooms) only has its module imported, not built (`prefetchedNeighbour`). At most two rooms run their loops at once: the current room, and the room seen through an open doorway, drawn after it (`startSeeing`, `topDraw.after`, `main.ts:1449-1451`), whose loop runs fully (its parts update, its composer renders) because it is paused only in the sense of being driven by the room on top. A staircase seen through (the dry peek) is a third in a few places.

So off-room machines are not updated at all, and the owner's idea (1) of "only in the same room" is already in force for views.

**Polling, not reactive.** Views do not subscribe to the world; they poll it. Each room's loop calls `parts.update(delta)`, `machines.update(delta)` (`room-equipment.ts:1541`, which calls `update` on every `LiveExhibit` and its parts), `services.update`, `roomLights.update` and `roomPower.update` every animation frame. Each part's update reads `world.value` (or a `computed` over it) and pushes the result into its view: a lamp's `setLit`, a needle's angle, a readout's `show(...)`. `world.value` is referenced in about 125 places in views; `store.read(pick)` (a cached `computed`) is used only 14 times. Signals (`computed`) are evaluated lazily and cached until the world changes, so a part that reads a `computed` costs little; a part that calls a derivation itself each frame (for example `jacuzziMimicState(world)` at `plant-room-shell-room.ts:543`, which runs `jacuzziCabinetPanel(world)` every frame) repeats it 6 times per world change at 60 fps, 12 at 120 Hz. Settings use signals and `effect`s that fire on change only; they cost nothing per frame.

**Periodic scans.** `bindRoomLights` (`gallery/views/room-lights.ts:45`) and `bindRoomPower` (`gallery/views/room-power.ts:37`) traverse their room's scene every couple of seconds to find lamps and displays; the room-transition report already flagged these as small periodic hitches (inferred).

**The inspector overlay** does not read what a view drew. `inspectComponent` (`src/game/plant/component-inspection.ts`) and `flowmeterLines` (`part-inspection.ts:199`) derive "what its display shows" from the world itself, on demand, when the player looks at a thing. So throttling or gating a view's redraw cannot make the overlay disagree with the world, although for a display redrawn only every 200 ms the overlay may be up to 200 ms ahead of the glass (harmless).

**The control room** exists (`control_room`, `src/toolkit/gallery/logic/room-equipment.ts:1109`): POOLMON, the alarm printer, three mimics, the annunciator, chart recorders, a readout board and a CCTV CRT; the full mimic wall is still to come (TODO "The mimic wall"). Its displays show other rooms' plant from the same world state (memory: mimic copies share one node), not from the plant rooms' views, so under room gating they run only while the player is in the control room, which is exactly right.

## Measurements

Scratch vitest file in `src/game/`, run once and deleted; Node on the same M5. Not browser figures, but V8 is the same engine and the world step is pure TypeScript.

| What                                                     | Cost                      |
| -------------------------------------------------------- | ------------------------- |
| `stepWorld`, 0.1 s step, warm                            | 0.082 ms                  |
| `stepWorld`, 1 s step                                    | 0.081 ms                  |
| `diffWorld` after a step                                 | 0.0007 ms                 |
| `serialiseWorld` (save)                                  | 0.010 ms; save is 13.7 kB |
| `deserialiseWorld` (load)                                | 0.12 ms                   |
| `advance` 1 hour at 0.1 s (the load-time catch-up limit) | 2,911 ms                  |
| `advance` 24 hours at 1 s steps                          | 7,183 ms                  |

At 1× the world costs 10 × 0.082 ≈ 0.8 ms per real second: about 0.05 ms per 60 fps frame, against a 16.7 ms budget. Even removing the world entirely would not be visible as frame rate. The step cost has grown from 0.033 ms on 2026-10-25 (`doc/research/time-acceleration.md`) to 0.082 ms now, 2.5 times in two days as the model grew; it will keep growing, but has a long way to go before it matters per frame.

It does matter in two places now:

- **Catch-up on load or on returning to a tab.** An hour's catch-up is 36,000 steps, about 3 s of frozen page (more on a slower machine: **(guess)** 6–10 s on a mid-range laptop). The same path runs when a tab hidden for a long time becomes visible again (`visibilitychange` calls `tick`, which catches up to an hour in 0.1 s steps with `diffWorld` after each).
- **Time acceleration** (TODO, prompt 059): at 10,000× with 10 s steps it needs 1,000 steps a real second, about 82 ms per second (8 % of the main thread) at today's step cost; at 1 s steps it could not keep up.

**Where the step's time goes** (CPU profile of 30 simulated minutes, inclusive time as a share of `stepWorld`):

| Function                                                                                   | Share | Why                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `olympicBatteryFlows` (`plant/olympic-battery.ts`)                                         | 27 %  | Called many times per step (by each motor's `flowing` callback in `stepMotors`, by `stepPoolsWater`, by `loungeFlowsOf`, and others). It has a cache, but building its string key (every valve of every filter looked up, joined into a string) is itself the cost.    |
| `footbathLineup` → `identifiedPart` → `walkIdentified` (`plant/identification.ts:190-288`) | 26 %  | Every `partOpen`/`partOn` walks the whole identified-plant tree into a fresh list and then `find`s one part; `footbathLineup` does it four times, and it is called several times per step (`footbathThroughFilter`, `footbathCabinetPowered` via `cabinetBootInputs`). |
| `installedValveOpen` / `installedValveByCommandId` (`plant/installed-valves.ts`)           | 11 %  | `installedValveOpen` scans `Object.values(INSTALLED_VALVES)` for the tag on every call.                                                                                                                                                                                |
| `stepPoolsWater` (`plant/pools.ts`)                                                        | 17 %  | The real physics; fine.                                                                                                                                                                                                                                                |
| `stepMotors`                                                                               | 16 %  | Mostly the `flowing` callback above.                                                                                                                                                                                                                                   |
| `parseAddress` / `blockAt` (`sim/blocks.ts`)                                               | 6 %   | Splits address strings on every read.                                                                                                                                                                                                                                  |

Every one of the top three is a lookup over something that changes only when the player (or a controller) acts: valve positions, isolators, the identified plant tree. That is the owner's idea (1) in its useful form.

**Rendering, from earlier reports** (not re-measured here): the Olympic plant room's scene pass issued 1,637 draw calls and about 359,000 triangles, with following frames of 57–120 ms there against 3–8 ms in the jacuzzi plant room (`doc/reports/plant-room-load-performance-2026-10-24.md`); players report about 10 fps (`doc/research/graphics-quality-presets.md`), which that research attributes to GTAO, bloom, shadows, per-fitting lights and the doubled cost of a room seen through a doorway. Those numbers are two to three orders of magnitude larger than the world step. The bottleneck is very likely GPU and draw-call submission, not simulation **(inference from the measurements, not a browser profile)**.

## Display audit

Read-only audit of every `texture.needsUpdate = true` site and its caller (paths under `src/toolkit/`). Classes: **A** redraws and re-uploads on every call (every frame when called from a frame loop); **B** guarded (compares a key and returns early when unchanged); **C** drawn once at build. Line numbers approximate.

**Most canvas readouts are already guarded (B).** The seven-segment (`core/views/eighties-controls.ts` `createSevenSegment`), character LCD, VFD and LED matrix (`industrial-control/views/panel-instruments.ts`), hour meter, message display and drive keypad (`industrial-displays.ts`), trend recorder, power monitor (`cabinet-fittings.ts`), utility meters, level instruments, the balance plant's register, the UV display, the dosing LCDs, gas detection, the cub monitor, and the dose-cell heads all compare before redrawing. The annunciator swaps materials, not canvases. So the texture re-upload problem is smaller than feared.

**Unguarded or frequent redraws, most important first:**

| Display                            | Where                                                                                                                                | What happens                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Circular chart recorder            | `industrial-control/views/period-instruments.ts:199-221`, driven every frame by `createRecorderPanel.show` (`control-panels.ts:213`) | A 512 × 512 canvas redrawn and uploaded every frame; in the control room's chart recorders exhibit and test boards                                                                                                              |
| CCTV monitor                       | `security/views/cctv.ts:242-258`                                                                                                     | While on, a DataTexture uploaded every frame with a CPU pixel loop (`adjust`, `snow`), though frames arrive at 12.5 Hz                                                                                                          |
| CCTV camera                        | `gallery/rooms/water-room.ts:260-284, 400-416, 452`                                                                                  | Renders the scene into a small viewport at 12.5 Hz and reads it back with a synchronous `gl.readPixels` (a GPU stall); while the water room is hidden but watched, it still steps its water simulation and caustics every frame |
| Strip chart recorders, LCD monitor | `cabinet-fittings.ts:739` (4 Hz), `:585` (12 Hz)                                                                                     | Unconditional redraws at a fixed rate; two strip recorders in the control room                                                                                                                                                  |
| Peristaltic pump TFT               | `plant/views/peristaltic-pump.ts:346-361`                                                                                            | Guarded, but its key includes the rotor phase, so it redraws a 480 × 288 canvas (8,640 `fillRect`s) about 26 times a second while running                                                                                       |
| Sight glass                        | `plant/views/sight-glass.ts:266-290`                                                                                                 | 15 Hz while churning                                                                                                                                                                                                            |
| Operator terminal                  | `industrial-displays.ts:371-391`                                                                                                     | Unguarded, every frame; test boards (gallery) only                                                                                                                                                                              |

**Guarded uploads, but expensive work before the guard (every frame):**

- _Dose-cell heads_ (`plant/views/dose-cell-head.ts:136-187`, called every frame from `chemical-distribution-views.ts`): each frame allocates a 96 × 40 dot buffer, rasterises its text into it, then builds the key with `[...fr.dots].join('')` (a 3,840-element array and string), all to find that nothing changed. Keying on the inputs (the bottle's values, page, power) before rasterising would make the common case free.
- _Seven-segment_, _LED matrix_, _cub monitor_ (`JSON.stringify([lines, cursor])`), _readout board_ (`control-panels.ts:278`), _POOLMON page_ (`control-panels.ts:504`, about 13 formatted lines a frame), _Wash-O-Tron_ (`plant/views/wash-o-tron.ts:474-511`, `color.set(string)` on about 25 lamps and string building), _mimic boards_ (`industrial-control/views/mimic-board.ts:479-522`, a CSS colour string parsed for every lamp each frame; the lounge mimic's `flows` is a new object each call, so its LED chaser re-uploads instance colours every frame): each builds strings or parses colours every frame before comparing.
- _Uncached plant readings_: `plantReadingOf` (`gallery/logic/world-reading.ts:47`, via `currentPlant`) is called separately by about six control-room exhibits and about five Olympic plant-room exhibits every frame, each call running `withIntake`, `olympicFlowsOf` (rebuilding its cache key), `hallHandling` and the alarm list; the Olympic room's five filters each call `olympicFlowsOf` per frame (`room-equipment.ts:684-721`). `room-lights.ts` calls `withIntake` once per light per frame rather than once per zone.

**Other per-frame work found.** The teleprinter rewrites its ribbon's 297 vertices and recomputes normals every frame even when idle (`teleprinter.ts:286`). Label fade and face-camera hooks (`core/views/label-visibility.ts:62`, `eighties-controls.ts:139`) walk world matrices in `onBeforeRender`, which runs twice a frame because GTAO draws the scene a second time with a normal material. Every plant and shell room's composer (`plant-room-shell-room.ts:180-224`, `shell-room.ts:568-610`) runs render (half float, MSAA 4×), GTAO (12 samples and denoise, a second scene draw), bloom, output and film each frame: by far the largest per-frame cost in those rooms.

**Per-frame callback counts.** The Olympic plant room (`plant_pool_02`) has about 17 live exhibits (5 filters, pumps, tank panel, contact tank, UV, local panel, ozone generator, heat exchanger, dosing controller, hypo and acid pumps, 2 day tanks with dose-cell heads, the Wash-O-Tron), each with its parts' updates; per frame that is about ten rebuilds of the Olympic battery's flow key and two dose-cell rasterisations. The control room (`control_room`, `gallery/logic/room-equipment.ts:1109`) places 12 items, 9 with per-frame updates (operator desk, alarm printer, 3 mimics, annunciator, chart recorders, readout board, CCTV CRT).

**What it means.** Unchanged displays mostly do not re-upload textures already. The waste is (1) a handful of unguarded or fast-keyed redraws, the worst a 512 × 512 chart every frame in the control room, and (2) widespread per-frame derivation and string building in front of the guards, repeating 6–12 times work that only needs doing once per world change (10 Hz). Both are CPU-side and fixable locally; neither is in the same league as the composer's GPU cost. **(guess)** The CPU waste is around 1–3 ms per frame in the control room and the Olympic plant room; a browser profile would settle it.

## Proposal (a): slow-rate updates for slow, manually driven parts

**Desirable?** Not for frame rate: the whole world is under 0.1 % of a frame. Yes for catch-up and time acceleration, but there a cheaper step helps more than a slower one.

**Possible?** Yes in principle: split `stepPlant` into a fast group (water, flows, temperatures, motors' run-up) and a slow group (electrical, isolators, feeders, lighting, battery) stepped every N steps with `N × STEP`. But the slow parts are not computationally expensive in themselves (`stepLighting`, `stepCentralBattery`, `serviceAvailable` are each 1–2 %); what is expensive is the fast parts _re-deriving_ facts from the slow ones every step (which valves are open, which isolators are on, what path the Olympic battery's water takes).

**Risks of multi-rate stepping:**

- _Correctness and ordering._ `stepPlant` is written as one consistent snapshot: each subsystem sees the others "as the step begins". A slow group stepped every N steps lets the fast group see stale electrical state for up to N × 0.1 s: an isolator switched off would stop a pump up to N steps late, a trip and its reset could fall between slow steps and be missed by `diffWorld` (the reason `advance` reports every step to `onStep`).
- _Determinism._ `advance(world, s)` is the same whether called once for an hour or 36,000 times for 0.1 s; tests depend on it, and so do saves (a save is caught up with `advance`). A slow group's phase (which step of N we are in) would become hidden state that is not saved, so a reload would shift it and the same world would evolve differently. It would have to be added to the world and migrated.
- _Tests._ Many tests advance a few steps and assert an immediate effect of an action; multi-rate stepping would break them or force them to know N.
- _Player actions are instant anyway._ An isolator or switch is changed by `applyAction` (`world.ts:442`) the moment the player acts, not by the step; only its consequences flow through the step. So "slow parts" do not cost step time in the first place.

**The safe form: memoise, don't slow down.** Because the world is immutable, a derivation that depends only on slowly changing parts can be cached on the identity of those parts and recomputed only when they change, every step still seeing the current truth:

- `walkIdentified(root)`: cache by `root` in a `WeakMap`, and give `identifiedPart` a `Map` by id built once per tree. The tree only changes when the player works a part.
- `installedValveOpen`: a `Map` from tag to valve built once at module load (the valve table is static).
- `olympicBatteryFlows`: check `installedValves`, `battery.dirt` (by reference) and the two booleans before building the string key; and compute it once per step in `stepPlant` instead of in each motor's `flowing` callback.
- `parseAddress`: cache parsed addresses in a `Map` (the set of addresses is finite).

None of this changes behaviour, determinism or saves; every existing test stands as the check. Estimated effect **(guess from the profile shares)**: the step from about 0.08 ms to about 0.035–0.045 ms, so an hour's catch-up from about 3 s to about 1.3–1.6 s, and time acceleration's headroom doubled. A further, separate fix for catch-up: on load, catch up in bigger steps (the time-acceleration research measured 10 s steps agreeing with 0.1 s steps) or in slices across frames behind the loading screen, so the page never freezes.

## Proposal (b): display-only work gated by room, distance and view

**Room gating** is already done (see above): hidden rooms do nothing. The only remaining doubling is the room seen through an open doorway, which runs all its updates; gating its display redraws (it is seen only through a doorway, usually from far off) is a small extra win.

**Within the drawn room**, the candidate measures, cheapest and safest first:

1. **Redraw a canvas only when what it shows changes, and key on the inputs.** Each display keeps the last thing it drew (the text, or a small key of its values, lamp states and power) and returns early when the new one is equal; only then set `texture.needsUpdate = true`. This removes the GPU texture re-upload (and mipmap regeneration, since `createCanvasTexture` in `core/views/screens.ts:4` leaves mipmaps on) for every unchanged display, which at 60 fps is most of them most of the time. No behaviour changes: a display still shows the latest value within one frame. Most displays already do this (see the audit); the fix is the few that do not, and keying on the inputs (the values, page, power) before rasterising or formatting, so the guard is cheap. Displays that animate on their own (a scrolling dot-matrix, a blinking cursor, a chart's pen creeping) include their animation phase in the key, so they redraw only when a pixel would change.
2. **Derive view state once per world change, not once per frame.** Where a part computes from `world.value` each frame (`jacuzziMimicState`, `jacuzziCabinetPanel`, the mimic boards' states, `bottleReadout`), move it into `store.read(pick)` (a cached `computed`) or a `WeakMap` keyed on the world object, so it runs at 10 Hz, not 60–120 Hz. Combined with (1), an unchanged reading costs one reference comparison per frame.
3. **Throttle redraws of changing displays to a few hertz.** The world only changes at 10 Hz, so no display can usefully redraw faster than that except for its own animation; real seven-segment and LCD instruments update 2–5 times a second anyway. A shared helper (a redraw budget in `createCanvasTexture`, or a small scheduler that spreads redraws across frames) caps uploads per frame. This is the "instrument redraw rate" row in the graphics presets research (5 Hz Low, 10 Hz Medium, each change High and Ultra).
4. **Distance and view gating.** Skip redrawing a display farther than about 5 m or outside the camera's frustum, and redraw it the first frame it comes back in range or into view (it must be correct the moment it is seen; with (1) it only needs to compare its key then). Beyond about 5 m a 256-pixel LCD is a few pixels tall on screen, so a slower rate (say 1 Hz) is invisible; frustum culling of canvas updates is safe because an unseen texture's content does not matter. Lamps (an emissive material colour) and needles (a rotation) are cheap enough that they do not need gating at all; gating them would only add bookkeeping.
5. **Do not gate the model.** Gating applies only to drawing and to view-side derivation; nothing the world steps or records is skipped.

**Impact.** Measures 1 and 2 remove almost all display work for unchanged displays: the canvas 2D drawing (CPU), the texture upload (CPU-to-GPU bandwidth and driver time) and the repeated derivations. Since most displays are already guarded, **(guess)** the gain is about 1–3 ms per frame in the control room and the Olympic plant room, less elsewhere, and a smoother frame (fewer driver stalls from texture uploads), but nothing like the tens of milliseconds the GPU-side work costs in the Olympic plant room. Measures 3 and 4 add little once 1 is done, since a display whose value changes every world step would still redraw at most 10 times a second; they are worth having as the presets' Low and Medium settings.

## Things that must not be gated

- **Chart recorders' history.** It is world state (`sewer`, `makeUpRecord`); it records in every step whether or not anyone is looking. Only the drawing of the chart may be gated, and it changes once every 300 s of world time per sample (plus the paper's creep), so it is an ideal candidate for redraw-on-change.
- **Anything a control reads back.** A lamp or readout that a controller, interlock or the event log consults is model state, not display; check each before gating that its view does not hold the only copy. The project rule (the model owns state; views only show it) says none should, but rooms still being migrated (`doc/prompts/done/063-component-information-remediation.md`) and view-owned simulations (for example `pit.update(delta)`, `filter.update(...)` and the Wash-O-Tron view in `room-equipment.ts`) still keep some behaviour in views. Those simulations already stop when the player leaves the room, which is a separate correctness issue the time-acceleration research also flags ("the rooms' own models moved into the world first"); gating them by distance would make it worse, so they are out of scope for gating.
- **The inspector overlay.** It derives from the world, so it is unaffected; keep it that way (never have it read a view's last-drawn text).
- **Sounds.** Part sounds follow their state through `setAudible` and component events; do not tie them to display throttling.
- **Screenshots and the attract sequence.** `captureView` and the title's shots must force every display in view to redraw before capture.

## Recommendation and estimated impact

| Step                                                                                                                                        | Effort                 | Risk                                       | Expected effect                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Fix the unguarded redraws (circular chart, CCTV monitor, strip recorders, peristaltic TFT) and key guards on inputs (dose-cell heads first) | Small                  | Very low                                   | **(guess)** 1–3 ms/frame in the control room and Olympic plant room, fewer upload stalls  |
| Derive view state per world change (`store.read`, or `plantReadingOf` and `olympicFlowsOf` memoised by world)                               | Small                  | Very low                                   | Removes 5–11 of every 6–12 derivations per world change                                   |
| Memoise the world's lookups (identified tree, valve tags, Olympic battery, addresses)                                                       | Small                  | Very low (pure, tested)                    | Step about 2× cheaper **(guess)**: catch-up 3 s → about 1.5 s; time acceleration headroom |
| Catch up in bigger or sliced steps on load and tab return                                                                                   | Small–medium           | Low                                        | Removes the multi-second freeze on load                                                   |
| Throttle and distance/frustum-gate redraws                                                                                                  | Medium (shared helper) | Low                                        | Small on top of the first row; useful as preset settings                                  |
| Multi-rate world stepping                                                                                                                   | Medium–large           | High (ordering, determinism, saves, tests) | Negligible at 1×; avoid                                                                   |

The frame rate players complain about (about 10 fps) will not be fixed by any of these; it needs the GPU-side work: the graphics presets (AO, bloom, shadows, lights), draw-call merging and instancing in the Olympic plant room, and cheaper doorway underlays. Do the display and memoisation work because it is cheap, safe and keeps the CPU side from growing into a problem as more instruments are added, not as the fix for the reported frame rate.

## Phased plan (for a mission prompt)

1. **Measure first.** Add the frame-time readout from the graphics presets research (DOM text: fps, median and worst frame ms, `renderer.info` draw calls, triangles, and a count of `texture.needsUpdate` uploads per frame, counted by wrapping `createCanvasTexture`'s texture). Record the Olympic, lounge and jacuzzi plant rooms and a pool hall, standing still, with a doorway open and shut. This tells us how much display work there is before anyone changes it.
2. **Redraw on change.** Fix the audit's unguarded displays (circular chart recorder, CCTV monitor and its camera readback, strip recorders, peristaltic TFT, teleprinter ribbon) and move the dose-cell head's key ahead of rasterising; then memoise `plantReadingOf`/`currentPlant` per world and move per-frame view derivations into `store.read` computeds. Re-measure uploads per frame (target: near zero standing still) and frame time.
3. **Memoise the world step.** `walkIdentified` by root, valve lookup by tag, Olympic battery flows once per step with a reference check, cached address parsing. All existing tests must pass unchanged; add a test that `advance` over an hour gives an identical world before and after (deep equality), and a timing note in the diary.
4. **Catch-up without freezing.** On load and on tab return, catch up in longer steps (validated against 0.1 s steps as the time-acceleration research did) or in slices behind the loading screen, keeping `diffWorld` per step so no trip is missed.
5. **Optional: throttle and gate redraws** through a shared helper (rate by distance, skip outside the frustum, force on screenshot), exposed as the presets' instrument redraw rate. Only if step 1 shows display work still matters after step 2.

Out of scope: multi-rate world stepping; gating any world state, recorder history or view-owned simulation.
