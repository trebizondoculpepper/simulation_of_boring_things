# 096: Menus as Penfold control panels

Status: stage 0 done (2026-10-27), for the owner to see: the settings menu as a full-screen instrument panel behind `?menu=panel` (open `?room=dev39&menu=panel`). Its results are under stage 0 below; the owner's rulings, which reshaped it, come next. Written 2026-10-27 from the owner's request.

You are working on "The Pool", a browser game in TypeScript and Three.js that simulates a leisure centre's pool plant (this repository). Read these first:

- `CLAUDE.md`, especially the rules on the one control scheme, the dev rooms (dev0 for single controls, dev39 for assemblies), Penfold Controls, the period mix and the pure `logic/` folders.
- `doc/design/control-interface-archetypes.md`.
- `src/toolkit/controls/CLAUDE.md`.
- `src/ui2d/README.md`.
- The cost work, [display-only updates](../research/display-only-updates.md) and [the component cost report](../reports/component-cost-2026-10-27.md).

Markdown is one paragraph per line.

## Owner's rulings (2026-10-27)

These came after the investigation below and override it where they differ.

- **Start with a trial panel.** There are two kinds of menu panel: the opening title menu, which runs alongside the reduced-resolution 3D render of the game, and the in-game menu. The first thing wanted is concept art that works: "what would a fully rendered settings menu actually look like in our game?"
- **The in-game menu does not pause the game.** It cannot: the game is a simulation tied to time, and unless time is stopped it carries on. Stopping time is a later, separate fix (its own entry in `TODO.md`). The room behind the panel keeps running. This reverses finding 11's "paused"; the DOM menu keeps its present behaviour while it is the default.
- **Full screen, not a little modal.** The settings menu fills the screen and need not fit on it. Decided in stage 0: the panel scrolls (the wheel, or a drag on an empty part of it, or a touch drag), rather than paging with physical buttons, because one long panel reads as one real panel and paging would bring tabs back by another name.
- **No sliders.** The widget library has no slider: a continuous value is a knob with its value shown beside it. An on/off choice is an illuminated latching push button in place of a checkbox.
- **A real control panel layout, not slabs in rows** (the owner): "Imagine how aircraft control panels have lots of little sub-control panels bolted in, each with four screws at each corner." The menu is one big panel into which small modules are bolted, each its own plate with a fastener at each corner and its own engraved title, sized to what it holds, one setting's controls each, grouped by function (GAME, PICTURE, SOUND, CONTROLS, MAINTENANCE) and arranged as an instrument panel is, its sizes varied. This replaces the zone rows of the recommendation below.
- **Knobs drive meters.** "To adjust the field of view, or the quality from worst to best, maybe a knob connected to a gauge, a meter with a needle, and the needle follows the knob after a few seconds." Each continuous setting's module is a knob and a moving-coil meter whose needle follows with a damped lag of two or three seconds (a real meter's ballistics, slowed to be seen), with a seven-segment readout as well. Render quality's knob turns from worst to best.
- **Use a variety of our real parts** across the modules: "in a game about control panels, I want my control panel to be a control panel."
- **Second round, from the first renders** ("I like the idea"): the controls about half their first on-screen size, so more of the panel is seen at once; the modules on a regular grid (avionics racks: standard widths and heights in whole units, aligned edges, even gutters, rows of one height, columns running on across groups); each module a separate metal plate bolted into a frame (a rack opening with a visible edge, a dark seam round each plate, four real fasteners, domed and slotted, catching the light, and the plate's thickness showing); the painted group outlines replaced by the rack, with small legends on the frame. And: each knob's scale its own setting's (field of view in degrees, volume in per cent, quality WORST to BEST), a clear decimal point on the readouts, and a better legend for render quality.
- **Blanking plates** (third round): "We can have metal blanking plates put in, screwed in the blank spaces between units. That's what you would do on an aircraft if there was a missing component or a component that didn't need to be fitted." Every rack place a group leaves empty is covered by plain plates of the modules' finish, thickness, seam and four fasteners, in whole rack units, as few as tile the gap, each with only a small stamped part number.
- **A grid layout system** (third round): "Can we do this on a grid, the same way typical component layout systems work? They're just component layouts. The only difference is our grid is sometimes going to be visible, and we want it to look like components made of sheet metal." The layout is a reusable, pure grid system (`rack-grid.ts`), separate from the drawing; menus are declared as items with spans, and the renderer only turns each placed cell into a plate with its part.
- **No gaps, rounded plates** (fourth round): "I want them aligned to each other, so there's no gap between them. Also I want the edges of each to be slightly rounded … There are no arbitrary gaps in an avionics panel. It's all just one thing next to another." The plates butt edge to edge (no gutter, only a hairline seam), groups sit edge to edge with no frame between them, and every row runs full width, its ends blanked off: one continuous field of plates inside the bezel. Each plate has slightly rounded corners and a softened edge, and four avionics fasteners (domed, slotted, quarter-turn heads in a shallow countersink), one in from each corner, of one size and inset on every plate. Group names are dropped from the frame; the module titles carry the grouping (GAME's buttons, the knob modules and so on sit together).
- **Machined metal and lights** (fifth round, "That's much more like it"): "We need some texture on the metal: imagine it's machined metal, each piece machined at a slightly different angle, so there are score marks in the plate. Imagine a light or two behind the camera that sometimes catches the sheen or shimmer of the machined metal as it moves … We want it to look a bit 3D." Every plate brushed, each at its own angle and a slightly different tone; lamps behind the camera and an environment for reflections; the sheen moving as the panel scrolls and as the pointer moves; still drawn only on change; lettering kept clear of glare.
- **The title box** (2026-10-28, stage 2): "I just want the menu options: there'll be a single panel with four buttons, and a text legend to the right of each. And I want my title menu options in the bottom left of the screen." This replaces the recommendation's title box (Dymo strip, THE POOL plate, sound lamp, rating plate): the title's own heading, sound hint and build corner stay as they are in the DOM.
- **The panels the default** (2026-10-28, stage 4 brought forward): "use both of these in place of the existing settings menus." The plain DOM menus remain as the fallback: `?menu=plain`, no WebGL 2, or a panel that fails to start.
- **Every input** (2026-10-28): "We absolutely need to support touch, mouse, gamepad, and keyboard." Keyboard and gamepad navigation of both panels is part of making them the default, through the one control scheme.
- **Sound front centre, and the phone** (2026-10-28): "We might have to do an alternative thing for the phone. And we need to place any sound for the buttons and knobs just front centre." The panels' sounds now play unpositioned (below); the phone gets its own presentation, to be designed with the owner (`TODO.md`), not built yet.
- **A picture first.** The owner asked to see working concept art before any more wiring or measurement: stage 0 stops at the picture and waits for feedback.

Today every menu in the game is flat HTML and CSS laid over the 3D view. This mission replaces those menus with small 3D control panels, drawn with an isometric (orthographic) camera and built from the game's own control parts: real push buttons, knobs, switches, lamps and readouts, each lettered the way such panels really are. The menus become part of the game's world of instruments.

## The request

The owner, 2026-10-27: "At the moment, all of our game start menus and the system menus are two-dimensional rendered things. I wonder if we could try a completely new approach. Imagine if all of the game menus were rendered as isometric 3D components from our control panel widget set, so we actually keep everything in game. For the main in-game control panel, that's easy: it's just an isometrically rendered screen in which we use the control toolkits, and we have some lettering, maybe a combination of the different kinds of lettering we have. For the opening screen, I'd love to keep a little box with the menu options in it, but keep the low-resolution rendered background. Could we start a new mission where we begin to investigate the feasibility of how this will work?" The owner also asked that the result be a prompt with detailed instructions for how it will be done: this file.

## What is known (the investigation, 2026-10-27)

### The menus and 2D surfaces today

Every one of them is DOM and CSS built in TypeScript. None uses canvas 2D, `src/ui2d` or Three.js.

| Surface                                                   | Files                                                                                                                                                                            | What it is and does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Input                                                                                                                                                                                                  | Notes                                                                                                                                                                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Title screen                                              | `src/toolkit/title/title-screen.ts`, mounted in `src/main.ts` (`createTitleScreen`, `startTitleBackdrop`)                                                                        | A `div.title-screen` (z-index 40). It holds "Boring Simulations Presents:", the title `h1` "The Pool", a `nav` "Main menu" with NEW GAME, CONTINUE (disabled when there is no save), SETTINGS and INSTRUCTIONS, a sound hint ("Click or press a key for sound", `aria-live`), and the build corner (`buildLine()` in `src/game/version.ts`: version, commit, date, "development build", and a "Source code" link).                                                                                                                                                     | Its own keydown handler (arrows, Enter, Space), its own gamepad poll (d-pad, stick, A) and mouse. Only `[` and `]` and the screenshot chord go through `src/toolkit/controls/` (`bindTitleShortcuts`). | Initial focus is on the menu. New game overwrites the save without asking.                                                                                                                             |
| Title backdrop (the "low-resolution rendered background") | `src/toolkit/title/logic/attract-sequence.ts`, `camera-path.ts`, `title-orbit.ts`; `src/game/attract-scenarios.ts`; `startTitleBackdrop` in `src/main.ts`                        | Each shot builds a real room module on its own cloned canvas with its own `WebGLRenderer`, at a quarter of the resolution each way (`setPixelRatio(full / 4)`). CSS then blurs it, darkens it and scales it by 1.04 (`.on-title #app canvas` in `src/styles/main.css`). Each shot runs its own frozen scenario world, never saved. The DOM `.attract-veil` fades between shots; the title theme plays and game audio is muted.                                                                                                                                         | None.                                                                                                                                                                                                  | `paused` is true throughout. This is kept as it is (the owner).                                                                                                                                        |
| Pause and settings menu (Esc, gamepad Start, the gear)    | `src/toolkit/settings/pause-menu.ts`; `settings-store.ts` (a signal kept in localStorage `pool-plant:settings`); `logic/settings.ts` (defaults, `RANGES`, `renderScale`)         | A `role=dialog` panel with four `role=tab` pages:<br>• **Game:** RESUME, SAVE (with a "Saved at …" status), NOCLIP (checkbox), COPY CAMERA LINK, QUIT TO TITLE, optional QUIT TO DESKTOP, and a wrench to the dev panel.<br>• **Graphics:** render quality 0–10 (shown as 1:x) and field of view 40–90.<br>• **Audio:** master volume.<br>• **Controls:** look sensitivity, INVERT Y, on-screen controls (automatic, always, never), a bindings table and touch help.<br>Opened from the title with `inGame: false` as SETTINGS or INSTRUCTIONS, the Game page hidden. | Its own capture-phase keydown (Esc, Q and E for tabs) and its own gamepad poll (Start, B, LB/RB, d-pad, A). None of it goes through the control scheme.                                                | No focus trap. Its `BINDINGS` table duplicates `controls.ts`. Opening from the title sets `paused` false (`pause-menu.ts`, `open`): a probable bug, since the title then un-pauses the player's clock. |
| In-game HUD                                               | `createFirstPerson()` in `src/toolkit/controls/input/first-person.ts`; `showOnTop` and the location overlay in `src/main.ts`; `hud-policy.ts`; `touch-sticks.ts`; `menu-hint.ts` | The crosshair; the amber movement pad and USE (`.hud-movement`); top-right tools (torch, pin/camera link, screenshot, gear); a speed readout "▶▶ 1×" that does not work yet; the room title, top left; touch twin sticks, CROUCH and INSPECT; noclip's altitude buttons and readout; the help line (`.controls-help`, `aria-live`), which shows flight or ladder help, the inspection target, the seated hint or the one-off menu hint.                                                                                                                                | Direct DOM handlers in `first-person.ts`.                                                                                                                                                              | Touch sticks are `aria-hidden`.                                                                                                                                                                        |
| Console                                                   | `src/toolkit/console/console-view.ts`, `logic/commands.ts`                                                                                                                       | A drop-down command line for developers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | The console key, Esc and typing.                                                                                                                                                                       | Stays DOM: a developer's tool that needs text entry.                                                                                                                                                   |
| Manual                                                    | `src/toolkit/manual/plant-manual.ts` (`?manual`, a DOM bill of parts); `src/manual/` (an offline LaTeX PDF)                                                                      | Reference pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Links.                                                                                                                                                                                                 | Stays DOM; out of scope.                                                                                                                                                                               |
| Dev panel                                                 | `#room-index` in `index.html` (`?dev`); several dev rooms' own note divs                                                                                                         | A list of links to rooms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Links.                                                                                                                                                                                                 | Stays DOM.                                                                                                                                                                                             |
| Error                                                     | `showError` in `src/main.ts`, `#error` in `index.html`                                                                                                                           | "The game could not start. Please use a browser with WebGL 2 enabled."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | None.                                                                                                                                                                                                  | Must stay DOM. There is no up-front WebGL check.                                                                                                                                                       |
| Screenshot notice                                         | `src/main.ts` (`captureView`, the notice)                                                                                                                                        | A status line with an optional SAVE button for downloading.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Mouse.                                                                                                                                                                                                 | Stays DOM: the download needs a user gesture on a real element in some browsers.                                                                                                                       |
| Dialogs                                                   | none                                                                                                                                                                             | There are no confirmations anywhere. `doc/plans/title-screen.md` plans one for overwriting a save.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                                                                                                                                                                      | —                                                                                                                                                                                                      |

There is no loading screen (the attract sequence's black hides build time), no fullscreen, and no save slots (one autosave, kept in two rotating copies, with tab ownership by Web Locks: `src/toolkit/save/world-store.ts`). So no text entry is needed today.

Audio is unlocked by a capture-phase `pointerdown` or `keydown` on the window (`part-audio.ts`). Any click on a canvas counts.

### The parts we would build from

**The part contract** (`src/toolkit/components/core/parts/parts.ts`):

- A `Part` has `object`, `uses: Map<Object3D, (direction?) => void>`, `update(delta)`, `onEvent`, `setAudible` and `dispose`.
- `beginPart` gives a builder: `voice` (a sound per event, played at the part), `legend` (the engraved plate) and `shows` (feeds the inspection overlay).
- `createPartSet()` merges parts' uses into one map.
- Picking is a raycast against `uses.keys()`, walking up the parents of the hit object, then `work(knobDirection(object, hitPoint, camera))`. `knobDirection` (`src/toolkit/controls/input/knob-turning.ts`) projects through any camera, so an orthographic camera works unchanged.
- State is held in `@preact/signals-core` signals.
- The behaviours are pure, in `src/toolkit/components/core/logic/world/components.ts` (`createMomentary`, `createLedPushbutton`, `createSwitch`, `createSelector`, …).

**Parts with behaviour, ready to use:**

| Part                                                                  | Factory                                                                                        | Sound                                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 30 mm push button, plain or illuminated                               | `pushButton`                                                                                   | `button-press.wav`                                             |
| Illuminated latching push button                                      | `ledPushbutton`                                                                                | `button-press.wav`                                             |
| Studio short-travel switch                                            | `studioSwitch`                                                                                 | synthesised click                                              |
| Pilot light, push to test                                             | `pilotLight`                                                                                   | `button-press.wav`                                             |
| Lever, cam, key and XB4 selectors                                     | `selector`                                                                                     | `switch-click.wav` detents; key ratchet; a rattle when refused |
| Rotary potentiometer, `.share` 0–1, 10 steps by default               | `potentiometer`                                                                                | a quiet click per step                                         |
| Mushroom stop                                                         | `mushroomStop`                                                                                 | synthesised                                                    |
| Key switch 0/I                                                        | `keySwitch`                                                                                    | key turn, or a rattle when locked                              |
| Pushbutton station                                                    | `pushbuttonStation`                                                                            | `button-press.wav`                                             |
| Drive keypad and operator terminal                                    | `driveKeypad`, `operatorTerminal`                                                              | `key-thock.wav`                                                |
| Membrane key; illuminated I/O rocker                                  | `membraneKey`, `illuminatedRocker` (`small-parts.ts`)                                          | a quiet press                                                  |
| The OT-216 terminal: 16 × 2 LCD, nine membrane keys, LOCAL ACCESS key | `createOt216Terminal` (`views/ot216-terminal.ts`), its pure logic in `logic/ot216-terminal.ts` | beeps                                                          |

**Views only (they need part wrappers before use):** toggle (bat handle), rocker, slide switch, the knob styles and keypads in `panel-switchgear.ts`. These are wired by hand today in `src/rendering/effects-console.ts` and `exhibit-panel.ts`, with `stepKnob` and `stepSelector`. There is no fader or slide lever anywhere.

**Displays:**

- `createPanelMeter` (a DH-670 moving-coil meter with an eased needle) and `createRoundGauge`.
- `createCharacterLcd` (5 × 7 dots, `font-5x7.ts`, repaints only the dots that change), `createVfd`, `createLedMatrix` and `createJewelLamp` (`panel-instruments.ts`).
- `createSevenSegment` and `createBarGraph` (`core/views/eighties-controls.ts`).
- `createNixieScreen` (`core/views/screens.ts`).
- The `ui2d` touch surface (`views/touch-surface.ts`): it repaints when its tree is dirty, at most `PAINT_HZ = 10`.

**Lettering.** Every kind draws a Canvas 2D texture on a plane. There is no SDF text and no text geometry. `createCanvasTexture` sets anisotropy 8 and sRGB.

| Kind                                    | Function                                                                    | Typeface and resolution                          |
| --------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| Printed or silk-screen                  | `createMicroLabel` (`eighties-controls.ts`)                                 | `PANEL_FONT`, 16 px a line; does not take clicks |
| Black anodised legend plate             | `createLegendPlate`                                                         | —                                                |
| Engraved traffolyte                     | `createEngravedPlate` (`core/views/plant-signs.ts`, colours in `LAMINATES`) | 640 px wide, Arial Narrow                        |
| Engraved signs                          | `engrave()` and the signs in `general-safety/views/engraved-sign.ts`        | 1000 px/m                                        |
| Dymo tape                               | `createDymoLabel` (`core/views/hand-labels.ts`)                             | Arial Narrow bold with per-letter jitter         |
| Marker pen                              | `core/views/hand-labels.ts`                                                 | Permanent Marker                                 |
| Stencil                                 | `createStencilText`                                                         | —                                                |
| Brand wordmarks                         | `brand-logo.ts`                                                             | —                                                |
| Seven-segment, 5 × 7 dot, VFD and nixie | the displays above                                                          | —                                                |
| The bridge's parody style               | `ui2d` `BLOCK_THEME`                                                        | Antonio                                          |

`label-visibility.ts` fades small labels by their projected height. Menus must switch that off.

**Assembly:**

- Boards are placed by hand in metres. `createBoard(kit, {title, width, height, scale})` in `src/toolkit/gallery/rooms/test-boards.ts` returns `place(part, x, y, size)` and a caption. The effects console in `effects-console.ts` uses a fixed pitch (52 mm, rows 62 mm).
- `panelMakerMark` (`core/views/panel-maker-mark.ts`) puts Penfold's badge in the top right corner, or the bottom right where the top right is in use.
- Objects that change at run time carry `userData.live` so `merge-static.ts` leaves them alone.
- dev0 is `controls-room.ts` (single controls on test boards). dev39 is `rooms/plant/control-assemblies.ts`, whose `EXHIBITS` hold `PlantExhibit`s (`plant/exhibit.ts`).

### Rendering

- One factory, `createRenderer` (`core/parts/render-style.ts`), makes a renderer per room canvas: antialiased, pixel ratio capped at 2, then multiplied by `renderScale(renderLevel)` (`1/ln(e + level)`). A room's own renderer is therefore deliberately soft at the lower quality settings.
- Rooms draw every frame in their own `setAnimationLoop`, even while paused. A room seen through a doorway is drawn by a second renderer.
- The only orthographic cameras are the full-screen passes in `src/rendering/ghost-overlay.ts` and `pattern-overlay.ts`. These are a working precedent for drawing a second scene over a room's frame with the same renderer.
- Nothing calls `forceContextLoss`, so several WebGL contexts can be alive at once: the room, the doorway room, the title shots. Browsers lose the oldest beyond about 16.

### Costs

From [the report](../reports/component-cost-2026-10-27.md):

- Draw calls dominate, at about 15 µs each. Panels are expensive: the pump panel is 336 draw calls.
- The budgets for a display: idle, at most 12 uploads and 250 k texels a second; an update at most 200 µs.
- A menu panel of 20–30 parts is likely to be 300–600 draw calls. That is fine drawn only when something changes, but not every frame on top of a busy room.

## Feasibility: the questions answered

1. **An isometric overlay is feasible.**
   - A transparent canvas of its own, above the room canvases and below the DOM fallback, with its own `WebGLRenderer` (`alpha: true`, its pixel ratio the device's, not scaled by `renderLevel`, so lettering stays crisp at the lowest render quality).
   - An `OrthographicCamera` posed by pure maths (`iso-view.ts`, below) and a small scene of its own with a fixed key-and-fill light and a `RoomEnvironment`. The parts use `createPs1Material` and need light to look right.
   - Drawing into each room's own renderer after the room instead (the ghost overlay's pattern) was weighed and rejected: those renderers are scaled down by the render quality and change at every room handover, and the title's backdrop canvas is blurred by CSS.
   - The cost of the extra canvas is one persistent WebGL context, which stage 0 must check against the doorway and title canvases (count the contexts live at the title, in a room with a doorway, and after ten room changes).
2. **Small text at an angle.**
   - True isometric (35.26° down, 45° round) foreshortens a panel's face too much for 3 mm legends.
   - Use a "desk" view instead: the camera 30° down and 20–30° round, and the panel's face raked back so it is nearly face-on. The parts and their depth still read as 3D: the caps stand proud, the knobs have skirts, and the bezels cast shading.
   - Size every lettering canvas from its on-screen size: at least 2 texels per device pixel at the panel's drawn scale, rounded to a power of two, mipmapped, anisotropy 8.
   - Set the camera's frustum so a panel millimetre is a whole number of CSS pixels where possible (`iso-view.ts` snaps the zoom).
   - Smallest legend: about 9 CSS px cap height on a 360 px wide phone. Check this at device pixel ratios 1, 2 and 3.
3. **Picking and navigation through the one control scheme.**
   - Pointer and touch: raycast with the overlay's camera into the panel's `PartSet` uses, exactly as rooms do (`knobDirection` already works with any camera). A press on the overlay is consumed and never reaches the room.
   - Keyboard and gamepad: there is no focus or menu-navigation abstraction today. The title and pause menu each poll the gamepad themselves, against `src/toolkit/controls/CLAUDE.md`.
   - This mission adds one: `src/toolkit/controls/logic/menu-navigation.ts`, pure. It does spatial focus movement over the controls' projected centres (up, down, left, right to the nearest control in that direction's cone), plus ACTIVATE, TURN −/+ (a knob, selector or potentiometer), BACK and HOME. `src/toolkit/controls/input/menu-input.ts` is the one keyboard and gamepad reader for menus: it replaces both pollers and adds the menu's bindings to `CONTROL_SCHEME`, so the help and bindings come from one table.
   - The focused control shows a diegetic focus mark: a thin amber ring on the panel round it, the HUD's amber, drawn only when the last input was not the pointer.
4. **Text entry.** None is needed: there are no save slot names. If slots come later, they are a rotary slot selector (numbered positions), each slot's date and room shown on a 16 × 2 character LCD (the OT-216's). Names, if wanted, are entered on the OT-216's cursor keys (letter up and down, cursor left and right), with the DOM mirror's text field (below) for keyboard and screen-reader users.
5. **Sliders become rotary parts.**
   - Continuous values become potentiometers with a printed scale (`potentiometer`, `steps` set per setting) and a readout beside them: seven-segment, or the moving-coil meter for the volume.
   - Choices of three to five become lever or cam selectors.
   - On or off becomes an illuminated latching push button or a toggle switch.
   - A fader is not needed. If the owner wants one, it is a new part, tried in dev0 first.
6. **Accessibility.**
   - The menu is a pure model with two views: the 3D panel and an accessible DOM mirror. The mirror is visually hidden but in the accessibility tree: real `button`s, `input type=range`, `select` and `role=radiogroup`, with the legends' words as their names.
   - Keyboard Tab, screen readers and switch access operate the mirror natively. The 3D panel follows its focus and state, and the pointer on the 3D panel drives the same model.
   - A setting, MENU STYLE (PANEL or PLAIN), shows the mirror as a visible, high-contrast plain menu instead of the panel. It is also the automatic fallback when WebGL is missing or the overlay fails to start.
   - `prefers-reduced-motion` turns off the panel's slide and the camera's ease; parts still move, their travel being state.
   - The inspection overlay's "no peeking" rule holds: inspecting a menu control says its legend and what its own lamp, pointer or readout shows, nothing more.
   - Add the pause dialog's missing focus trap in the mirror.
7. **Performance.**
   - The overlay draws only on change: on input, while a part animates (a cap's travel, a needle's ease, a lamp's fade), or when a bound value changes. Then it stops.
   - Open and idle, it must not upload textures or draw. Closed, its canvas is hidden and its loop stopped.
   - Statics are merged (`merge-static.ts`), with live parts marked.
   - Add the panel to `bench.html?bench=components` and hold it to the report's budgets.
   - The room behind keeps drawing as it does today.
8. **Sound.**
   - The parts' own voices play: presses, detents, key ratchets, deny rattles.
   - Through `partAudio`, positional sound needs a listener. The overlay plays the menu's sounds unpositioned (centre, a fixed level) under the game's master volume. They must be heard on the title, where game audio is muted (`setGameMuted`), so they route like the title theme (`partAudio.hold`).
   - The volume knob plays a click per step and moves the meter, so the owner hears the level as it is set.
9. **Labels and their length.** The game is English only. Each plate in the layout has a character budget, checked by a test, so a legend that grows fails the build instead of overflowing its plate. Fixed text is engraved; values are on displays.
10. **The title's box over the low-res background.**
    - The backdrop stays exactly as it is: quarter-resolution room canvases, CSS blur, the veil and the theme.
    - The box is a small panel on the transparent overlay canvas. Only its own rectangle takes pointer input (`pointer-events` on the canvas, with hit-testing outside the panel's projected bounds passed through).
    - The DOM title nav becomes the hidden mirror.
11. **How the in-game panel appears.**
    - Esc (or Start, or the gear) dims the room as the settings backdrop does now. The system panel then slides up into view from below the screen's edge (250 ms, eased), and slides down when RESUME is pressed. With reduced motion it appears at once.
    - A diegetic panel in the room (walking to it) was weighed and rejected: settings must be reachable anywhere, at once, paused.
12. **What stays DOM:**
    - the error message and the no-WebGL fallback;
    - the console; the manual and the dev panel;
    - the screenshot notice's SAVE (a real element for the download gesture);
    - the "Source code" link (the panel's SOURCE button may open it from inside the click handler, which counts as a gesture, but the mirror keeps a real link);
    - the touch sticks (multi-touch at low latency);
    - the accessible mirror itself;
    - any future file input.

    Audio unlock needs nothing new: a click on the overlay canvas is a gesture.

No code spike was run for this write-up. Stage 0 is that spike, and it must answer the measurements above (contexts, legibility at each device pixel ratio, draw calls, idle uploads) before stage 1 starts.

## The recommendation

The approach is a hybrid: a 3D overlay for what is seen, and a DOM mirror for what is accessible and for the fallback, both driven by one pure menu model.

| Option                                 | Verdict                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| A pure 3D overlay                      | Rejected: it would lose screen readers and keyboard Tab.                                 |
| A diegetic panel in the room           | Rejected: it is not reachable everywhere, and the camera would have to leave the walker. |
| DOM menus restyled to look like panels | Rejected: not what the owner asked for.                                                  |

The system panel is one Penfold-made desk panel in the 1980s large-panel archetype, light grey, with engraved traffolyte zone headings and Penfold's mark top right. It has no tabs, because a real panel does not page. Its zones:

| Zone                 | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GAME                 | • RESUME: a green illuminated push button.<br>• SAVE: a push button. Its status ("SAVED 14:32", "SAVING", "READ ONLY", the last when another tab holds the save) shows on a VFD line.<br>• QUIT TO TITLE: a push button with a confirm step. The first press lights it and shows "PRESS AGAIN TO QUIT" on the VFD for 3 s.<br>• QUIT TO DESKTOP, where available: the same, with a confirm step.<br>• COPY VIEW LINK: a push button; the VFD says "LINK COPIED". |
| PICTURE              | • RENDER QUALITY: a potentiometer with 11 steps and a printed 0–10 scale, its ratio "1:2.4" on a seven-segment readout.<br>• FIELD OF VIEW: a potentiometer over 40–90 in steps of 5, the degrees on a seven-segment readout.                                                                                                                                                                                                                                    |
| SOUND                | • MASTER VOLUME: a potentiometer, 0–10.<br>• A DH-670 moving-coil meter beside it reads the game's output level live (an `AnalyserNode` on the master bus: a real, working instrument).                                                                                                                                                                                                                                                                          |
| CONTROLS             | • LOOK SENSITIVITY: a potentiometer with a seven-segment readout.<br>• INVERT Y: an illuminated latching push button.<br>• ON-SCREEN CONTROLS: a three-position lever selector, AUTO · ON · OFF.                                                                                                                                                                                                                                                                 |
| MAINTENANCE          | Developers only:<br>• NOCLIP: a key switch.<br>• DEV PANEL: a push button.<br>Both are labelled on Dymo tape: a site addition.                                                                                                                                                                                                                                                                                                                                   |
| The instruction card | The bindings and touch help, beside the panel: a printed laminated card in a holder, small print in `PANEL_FONT`, generated from `CONTROL_SCHEME`. INSTRUCTIONS on the title focuses and enlarges it.                                                                                                                                                                                                                                                            |
| The rating plate     | Engraved: PENFOLD CONTROLS · SYSTEM PANEL SP-1 and the version, build and date from `buildLine()` (e.g. SER v0.1.0 · BUILD 3fe13af · 22 OCT 2026). It replaces the title's build corner. "DEVELOPMENT BUILD" is a red Dymo strip under it.                                                                                                                                                                                                                       |

**The title's box:** a small Penfold enclosure, the compact archetype's size, in the lower middle of the screen, over the unchanged backdrop.

- "Boring Simulations Presents:" on Dymo tape across its top.
- THE POOL on a large engraved traffolyte plate.
- Four illuminated push buttons:
  - NEW GAME (with a confirm step when a save exists: "OVERWRITES SAVE · PRESS AGAIN" on a 16 × 2 LCD);
  - CONTINUE (lit when a save exists; refused with the deny rattle when none does);
  - SETTINGS (opens the system panel without its GAME zone);
  - INSTRUCTIONS (the card).
- An amber pilot lamp, SOUND · PRESS ANY KEY, which blinks until audio runs.
- The rating plate, small, on its side.

This gives the lettering mix the owner asked for: engraved plates for fixed names, Dymo for site additions, printed small type on the card, segment and character displays for values, and the VFD for messages.

## The work, in stages

Each stage is testable on its own and committed after `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build` pass (check their exit status, not a grep of the summary). Pure logic goes in `logic/` folders, tested beside it (`*.test.ts`, importing from `vite-plus/test`). Every notable change goes under Unreleased in `CHANGELOG.md`, and the `TODO.md` entry is updated after each stage.

### Stage 0: the spike, in the dev rooms

Reshaped by the owner's rulings above: the whole settings menu as a working trial, full screen, behind `?menu=panel`, in place of the two-control spike. The dev39 exhibit and the title box are left for later (the owner asked for a picture first). The plan as first written follows the results.

#### Stage 0 results (2026-10-27)

Open `?room=dev39&menu=panel` (any room works): the panel opens over the room on arrival; RESUME or Esc closes it; Esc (with the mouse free) or the gear opens it again. The DOM menus are untouched and remain the default without the flag.

**What was built.**

- Pure logic in `src/toolkit/menus/logic/`, tested beside it: `settings-panel.ts` (the modules, zone by zone, as offered here; each knob's detents and readout over its setting's range; the meters' scales; the confirm step; the status line), `panel-layout.ts` (modules bolted into groups, the groups packed into centred shelves across a panel of given width; every title within its plate's budget and nothing overlapping, tested at four widths), `iso-view.ts` (the desk view's pose, the panel's width and scale for a screen, the scroll range) and `meter-ballistics.ts` (a damped spring: the needle lags, swings a little past, and settles in two to three seconds).
- **The grid layout system** (third round), `src/toolkit/menus/logic/rack-grid.ts`, pure and generic (it knows nothing of settings or Three.js), tested in `rack-grid.test.ts`:
  - A `Grid` has rack-unit columns and rows (`RackUnit`: column width, row height, gutter). Its children are leaves (`GridLeaf`: an item and its `span`, columns × rows) or grids (a group: a cell holding a sub-grid), nested to any depth.
  - Placement: a child may name its cell (`at`); the rest are auto-placed in reading order. `dense` flow is first fit, scanning rows from the top and each row from the left (CSS Grid's `row dense`); `shelf` flow sets children side by side and wraps them into shelves as a flex row does, `gap` empty columns apart, each shelf `justify`-ed (`start` or `center`), with an optional `band` above each shelf (metres, for legends on the frame) and, with `stretch`, each sub-grid on a shelf made as tall as the shelf (narrowed as far as its children allow).
  - Sizing: a grid's width is `columns` if given, else fitted: the block that wastes least within the room its parent gives (`maxColumns`); `rows` sets a least height.
  - Gap-filling: a grid with `blank` gets blanking plates over every cell its children leave empty, as few as a sweep finds (each free cell starts a plate as wide as the free run, carried down while the rows below are free), never wider than `widestBlank`.
  - Output: a flat list of placed cells (`grid`, `leaf`, `blank`), each in cells and in metres from the root's top left, with its parent grid.
  - The settings panel is declared on it (`panelGrid` in `panel-layout.ts`): a centred, stretched shelf-flow grid of groups, one column apart, under legend bands; each group a dense, blanked sub-grid of its modules, spans from `MODULE_UNITS`. The title box will be declared the same way.
- Fourth round: the rack unit is 20 mm by 85 mm with no gutter; modules are 5 × 1 (push button, latching button, key switch), 6 × 1 (selector), 8 × 1 (VFD), 11 × 2 (knob and meter) and 16 columns (card). The root is a blanked shelf grid with no gap or band, fitted to the room that wastes least (`minColumns`, three fifths of the room, keeps it from fitting itself too narrow), so the ends of short shelves are blanked and every row is full width. The drawing: one dark opening with a metal lip in the bezel, filled by the plates; each plate an extruded rounded rectangle (2.5 mm corners, 0.5 mm bevel), drawn a hairline smaller than its cell so a seam shows; a filler strip too narrow for two fasteners side by side has one at its top and one at its foot.
- The layout (second round): a rack grid of 20 mm columns and 85 mm rows with 4 mm gutters. A push button, latching button or key switch module is 4 columns by 1 row, the lever selector 5 × 1, the VFD 7 × 1, a knob-and-meter module 9 × 2 and the instruction card 13 columns by as many rows as it needs. Each group is packed first-fit into the block that wastes least, the groups are set in shelves one empty column apart, each block narrowed to its shelf's height, and the panel is cut to its widest shelf. Each group sits in a dark rack opening with a metal lip; each plate shows its edge and a lighter face, has four domed, slotted quarter-turn fasteners, and stands just proud of the frame.
- `src/toolkit/menus/views/settings-panel-view.ts` builds the panel from the game's parts; `menu-overlay.ts` is its own transparent full-screen canvas and `WebGLRenderer` (the device's pixel ratio up to 3, not scaled by the render quality), an orthographic camera 14° above the face and straight on (the first renders' 5° round tilted the rows), picking through the parts' uses with `knobDirection`, scrolling, and drawing only on change. `src/main.ts` mounts it when the flag is set.
- `withLetteringScale` (`core/views/lettering-resolution.ts`) builds a panel's lettering (micro labels, engraved plates, Dymo tape) at three times its usual canvas resolution, so it stays crisp drawn large and close; rooms are unchanged (scale 1).

**Item to part, and what is wired.** Everything is wired to the real settings and actions; nothing is a local model.

| Option (DOM menu)              | Module and part                                                                                                                                                                                | Wired to                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Resume                         | RESUME: green 30 mm push button                                                                                                                                                                | closes the panel                        |
| Save, and its "Saved at" note  | SAVE: white push button; STATUS: a 24-column VFD ("SAVED 23:31", "SYSTEM READY", "READ ONLY - OTHER TAB")                                                                                      | `saveGame`; the world store's `holding` |
| Copy camera link               | VIEW LINK: blue push button; the VFD says "VIEW LINK COPIED"                                                                                                                                   | `copyCameraLocation`                    |
| Quit to title                  | QUIT TO TITLE: red illuminated push button, "PRESS TWICE": lit, with "PRESS AGAIN TO QUIT" on the VFD, for 3 s                                                                                 | save, then the title                    |
| Quit to desktop                | QUIT, the same, where offered (not in a browser)                                                                                                                                               | —                                       |
| Render quality 0–10            | RENDER QUALITY: potentiometer (11 detents) on a dial printed WORST to BEST; DH-670 meter "% RES" (the resolution drawn, per cent of full each side, 39–100); seven-segment readout of the same | `settings.renderLevel`                  |
| Field of view 40–90            | FIELD OF VIEW: potentiometer (2° detents) on a dial printed 40°–90°; meter DEG 0–90 with 40–90 banded green; seven-segment                                                                     | `settings.fov`                          |
| Master volume                  | MASTER VOLUME: potentiometer (5 % detents) on a dial printed 0–100; meter %; seven-segment                                                                                                     | `settings.volume`                       |
| Look sensitivity               | LOOK SENSITIVITY: potentiometer (0.25 detents) on a dial printed 0.25–3; meter x 0–3; seven-segment                                                                                            | `settings.sensitivity`                  |
| Invert up and down             | INVERT Y: amber latching LED push button, "LIT = ON"                                                                                                                                           | `settings.invertY`                      |
| On-screen controls             | ON-SCREEN CONTROLS: three-position lever selector, AUTO · ON · OFF printed round it                                                                                                            | `settings.onScreenControls`             |
| Noclip                         | NOCLIP: key switch 0 / I, its title on Dymo tape                                                                                                                                               | `noclip`, as the DOM menu sets it       |
| The wrench (developer panel)   | DEV PANEL: black push button, its title on Dymo tape                                                                                                                                           | `?dev`                                  |
| The bindings table, touch help | INSTRUCTIONS: a printed, laminated card in a holder (`BINDINGS`, `controlsHelp('touch')`)                                                                                                      | —                                       |
| The build corner               | an engraved white rating plate, PENFOLD CONTROLS · SYSTEM PANEL SP-1 and `buildLine()`; DEVELOPMENT BUILD on red Dymo tape                                                                     | —                                       |

Also on it: the engraved SETTINGS · SYSTEM PANEL SP-1 name plate, Penfold's mark top right, and each group's legend silk-screened on the frame above its rack opening. Each knob has its own dial, printed on a black disc behind it: a tick at every detent and its setting's figures. The seven-segment decimal point was moved clear of its digit (in `createSevenSegment`, so every such readout in the game gains it).

**Fifth round: the finish and the lights.**

- `logic/machining.ts` (pure, tested): each plate's machining angle (one of six steps over a half turn) and tone (one of three), from a steady hash of its rack cell, so a plate looks the same every time and neighbours differ.
- `views/machined-metal.ts`: one 512 px procedural texture of fine score lines (drawn once, wrapping), used as each plate's roughness and bump map on a metal `MeshStandardMaterial` (metalness 0.8, roughness 0.55), one clone per angle (sharing the image, so one upload), 18 materials in all. The bezel is a dark, matt anodised finish. Three's anisotropic `MeshPhysicalMaterial` was tried first and blew some plates out white at certain angles, so it was dropped; the turned roughness and bump maps read as machining without it.
- `polishParts`: the panel's own parts (caps, lenses, knob skirts, screws) made a little glossier and more reflective; anything with a map (lettering, printed faces, dials) left matt, so no glare washes it out. The bezel's badges are left as they were.
- The lights (`menu-overlay.ts`): a soft ambient and fill, the room environment at 0.6, and two small point lamps (warm and cool) carried with the camera, above and either side of it, so as the panel scrolls under them their highlights glide over the plates; they lean after the pointer (up to 25 cm across and 18 cm up and down) and ease back, drawn only until they settle.
- Cost, before and after (the same window): 397 draw calls and 28,906 triangles both; textures 51 to 52; frame 5.4 to 4.2 ms; the first frame (shader compilation) 110 to 107 ms; idle, no frames in 2 s both. Moving the pointer over the panel draws while it moves and for a moment after.
- Screenshots: `settings-panel-sheen-a.png` (pointer top left) and `-b.png` (bottom right) show the highlight moving.

**Fourth round** (the same window): the panel is a single field about 0.65 m wide, wholly in view, its blanks a plate at the end of the GAME row, one under DEV PANEL and a one-column filler strip at the right of the bottom shelf.

**Measurements, third round** (the same window): the panel 0.95 m by 0.6 m on screen, wholly in view; 372 draw calls and 19,932 triangles a frame (the blanking plates add about 20); 56 textures, 369 geometries; build 10 ms; idle, no frames in 2 s. Packed by the grid system, PICTURE's two knob modules sit side by side and the panel is two shelves deep instead of three.

**Measurements, second round** (the same window): drawn at 0.95 CSS px a millimetre, the whole panel (0.95 m by 0.77 m) fits the screen without scrolling. 350 draw calls and 18,376 triangles a frame (the fasteners, plates and rack add about 180 calls); 54 textures, 347 geometries; frame cost 2.6–3.8 ms, the first 89 ms; build 8–10 ms; idle, no frames in 2 s. Module titles' capitals are about 5 CSS px: legible at ratio 2 but small; the card's print is near the limit.

**Measurements, first round** (Chrome, 1376 × 881 CSS px, device pixel ratio 2, over dev39):

- 167 draw calls a frame for the visible part of the panel (5,032 triangles); 55 textures and 338 geometries for the whole panel.
- Frame cost (the panel's update and draw, CPU) 0.8–4.4 ms; the first frame 61 ms (shader compilation). Building the panel 7 ms.
- Idle: no frames drawn in 2 s open and still, so no draws and no uploads. Turning a knob one detent draws about 170 frames (the needle's swing, about 2.8 s), then stops. Closed, the canvas is hidden and nothing runs.
- WebGL contexts: one more, created the first time the panel opens and kept (3 canvases in the page over dev39). Not yet counted: the title, and after ten room handovers.
- Text: with lettering at three times resolution, titles, headings, the card's small print and the meters' scales are crisp at ratio 2. Not yet checked at ratios 1 and 3. The seven-segment decimal point is faint (1.00 reads as "100" at a glance): to fix in stage 1.
- Scale: the panel is drawn at 1.9–2.4 CSS px a millimetre (a module title's capitals about 9 px). At 1376 px wide the panel is 0.69 m wide and about two screens tall. A phone (360 px) gets the narrowest panel, 0.27 m, at about 1.2 px a millimetre: too small to read, and not yet screenshotted. Stage 1 should let a phone zoom or pan sideways.

**Findings for stage 1.**

- Sound: the parts' voices play through `partAudio`, placed at the overlay scene's coordinates relative to the room's listener, so they may be faint or panned oddly. Stage 1 must route them unpositioned under the master volume, as planned (finding 8).
- Input: picking and knob direction go through the control scheme's `knobDirection`; the wheel and a drag scroll; Esc is read by the overlay's own capture listener (as the DOM menu's is), and while open it keeps the game's keys from the room. Keyboard and gamepad navigation need stage 1's `menu-navigation.ts` and `menu-input.ts`: focus moved between the modules' parts by direction, ACTIVATE, TURN − and +, and a scroll that follows the focus.
- The potentiometer's printed scale is white, made for dark panels; on the light grey modules it sits on a black dial plate. The meter's own needle easing is bypassed (the ballistics are the panel's).
- The label fade (`label-visibility.ts`) needs nothing: the orthographic camera stands 1 m from the panel, within the fade's reach.
- The panel does not touch `paused`, per the ruling.

#### Stage 0 as first planned

1. **The pure modules,** in `src/toolkit/menus/logic/`, each with tests:
   - `menu-model.ts`: a declarative menu. Each item has an id, a kind (`push`, `latch`, `selector`, `pot`, `key`, `readout`, `plate`), a legend, a binding (get and set over a signal), steps or positions, an enabled predicate and a confirm flag. A reducer applies `activate`, `turn(±1)`, `focus` and `back`, and the confirm step (armed, timed out at 3 s).
   - `iso-view.ts`: the camera's pose and frustum, fitted to a panel's bounds and the viewport's aspect with a margin, with the zoom snapped to whole CSS pixels per panel millimetre where possible.
   - `panel-layout.ts`: places items in zones on a fixed pitch (the effects console's 52 mm by 62 mm as a starting point), sizes the panel, and checks each legend against its plate's character budget.
2. **The overlay,** in `src/toolkit/menus/views/menu-overlay.ts`:
   - its own transparent canvas and renderer (pixel ratio the device's, capped at 3), an orthographic camera from `iso-view.ts`, its own scene and lights;
   - drawn only on change (a `dirty` flag set by input, by bound signals' effects and by animating parts until they settle);
   - raycast picking into its `PartSet`;
   - `open`, `close` and `dispose`.
3. **The builder,** `src/toolkit/menus/views/panel-builder.ts`: builds the parts from the layout with the existing factories (`pushButton`, `ledPushbutton`, `selector`, `potentiometer`, `keySwitch`, `createSevenSegment`, `createVfd`, `createPanelMeter`, `createEngravedPlate`, `createDymoLabel`, `panelMakerMark`), with `applyLabelFade` off.
4. **dev39:** an exhibit, SYSTEM PANEL SP-1 (a menu panel), standing in the room at true size, with two working controls bound to the real settings: MASTER VOLUME (a potentiometer with a seven-segment readout) and INVERT Y (a latching push button).
5. **The overlay switch:** a URL flag, `?menu=panel`, that shows the same two-control panel as an overlay over any room (dev39 first). Esc opens it in place of the DOM menu, only while the flag is set.
6. **Measure and record** in `doc/research/diegetic-menus-spike.md`, with screenshots:
   - live WebGL contexts (title, a room with a doorway, after ten handovers);
   - the overlay's draw calls, idle uploads (must be 0) and frame cost open and closed;
   - legend legibility at device pixel ratios 1, 2 and 3 and at 360 px, 1280 px and 2560 px wide;
   - the pointer, touch and gamepad paths.

   The owner looks before stage 1.

### Stage 1: the system panel, behind the flag

1. **Navigation:** `src/toolkit/controls/logic/menu-navigation.ts` (spatial focus over projected centres; activate, turn, back, home) and `src/toolkit/controls/input/menu-input.ts` (the one keyboard and gamepad reader for menus). Add the menu's actions to `CONTROL_SCHEME`. Port the title's and the pause menu's own pollers onto them, so the DOM menus also use it: this fixes the existing breach of the control-scheme rule whatever happens to the panels.
2. **The accessible mirror,** `src/toolkit/menus/views/dom-mirror.ts`: built from the same `menu-model`. It is visually hidden, has a focus trap, and its focus is followed by the panel's focus ring. With MENU STYLE at PLAIN, or when the overlay cannot start, it is shown as a visible, high-contrast plain menu.
3. **The full system panel:** `src/toolkit/menus/logic/system-panel.ts` (the spec above, built from `settings`, the game session and `buildLine()`), with each zone and the instruction card. Any part not yet behaviour-backed (a toggle switch, if chosen over a latching button) is wrapped as a part and tried on a dev0 board first.
4. **Sound:** the parts' voices routed unpositioned under the master volume, audible with game audio muted. The volume meter reads the master bus.
5. **Pausing:** fix the title's un-pausing bug (`open` with `inGame: false` must leave `paused` as it was), with a test.
6. **Settings:** a new setting, `menuStyle: 'panel' | 'plain'`, in `logic/settings.ts`, defaulting to `plain` until stage 4. `?menu=panel` sets it.
7. **Checks:**
   - every item reachable and workable by mouse, touch, keyboard only, gamepad only, and a screen reader (VoiceOver on macOS at least);
   - every setting's effect the same as through the DOM menu (a test drives both views of the model);
   - idle uploads 0 and no draws while unchanged (the bench);
   - screenshots at three widths.

### Stage 2: the title's box

#### Stage 2 results (2026-10-28)

Open `?menu=panel` with no room: the title as before (the attract sequence, the heading, the sound hint, the build corner), its DOM list hidden, and in the bottom left a single machined plate with four illuminated push buttons in a column, each with its engraved legend to its right: NEW GAME (green), CONTINUE (amber), SETTINGS (white), INSTRUCTIONS (blue).

- `src/toolkit/menus/logic/title-box.ts` (pure, tested): the four options, the box declared on the rack grid (a button cell of 3 columns and a legend cell of 8 to each row, rows of 46 mm), its layout, and what a press does (`titlePress`: act, arm, or refuse).
- `src/toolkit/menus/views/title-overlay.ts`: its own small canvas covering only the box (so the rest of the title takes its own clicks), fixed 24 px in from the bottom left corner, at 1.7 CSS px a millimetre (smaller on a small screen); the same plate geometry, fasteners, machined metal, polish and lamps as SP-1 (`settings-panel-view.ts` now exports them); drawn only on change.
- Behaviour, kept from the DOM title: NEW GAME starts a game; when there is a save it would overwrite it lights and shows a red PRESS AGAIN plate over its legend for 3 s, and a second press starts it. CONTINUE is lit when there is a save and does nothing when there is none. SETTINGS and INSTRUCTIONS open SP-1 without its GAME zone and with a MENU zone holding BACK, which closes it (Esc closes it too). A press on the box is a pointer gesture on the page, so it also lets the browser start sound.
- Nothing collides: the heading is top centre, the box bottom left, the sound hint bottom centre and the build corner bottom right.
- Still to do: keyboard and gamepad on the box (the DOM list's arrow keys and pad no longer have a visible target while it is hidden), the accessible mirror, and its cost measured (it is a few dozen draw calls, drawn only on change).

#### The panels made the default, with every input (2026-10-28)

- **Default:** `src/main.ts` uses the panels unless `?menu=plain` is given or WebGL 2 is missing; if a panel throws while starting (its renderer, say), the app falls back to the plain menus for the rest of the session (`panelsFail`). In a room, Esc (with the pointer free), a pad's Start or the gear open SP-1; on the title, the box replaces the DOM list (hidden).
- **Navigation, pure** (`src/toolkit/controls/logic/menu-navigation.ts`, tested): what each key and pad button means to a menu (`keyIntent`, `padIntents` with edge-triggered buttons and a repeating stick), spatial focus movement (`moveFocus`: the nearest control that way, distance across counted twice so the focus keeps to its row or column), reading-order cycling (`cycleFocus`) and `menuStep`, which turns a focused knob or selector with Left and Right (as arrows move a slider) and presses anything else.
- **Input, once** (`src/toolkit/controls/input/menu-input.ts`): the one keyboard and gamepad reader for menus. Menus listen (`listenMenu`); the newest is asked first; one that takes an intent stops it, and a modal one (SP-1 open) holds every other key back from the game. The title's and pause menu's own gamepad polling now go through it (their keys stay the browser's own, as they are DOM). `menuOpen` (`controls/logic/menu-open.ts`) holds the walker still while SP-1 is open, without pausing the world.
- **On the panels:** an amber ring (the HUD's amber) round the focused control; SP-1's focus starts on its first control when opened by key or pad, scrolls into view, and hides when the pointer is used; Esc, B or Start close it; on the title box, Enter or A press the ringed button as a click would (NEW GAME still asks again).
- **Checked in the browser:** the title by arrows and Enter (focus ring, SETTINGS opening SP-1), SP-1 by arrows, Tab and Left (the field of view turned 52 to 50 and back), Esc opening it in a room and Enter on RESUME closing it, the gamepad path through a DEV handle (`menuIntent('toggle', 'gamepad')` and so on: opened, moved, turned render quality and back, closed by B), and `?menu=plain` giving the DOM pause menu on Esc. A real gamepad was not available to the automation.
- **Still owed:** the accessible DOM mirror (screen readers and switch access; while the box shows, the title's DOM list is hidden), the menu bindings in `CONTROL_SCHEME`'s help text, sounds unpositioned, the phone layout, and the plain menu's title SETTINGS un-pausing bug.

#### Sound front centre (2026-10-28)

`components/core/audio/front-centre.ts` marks a panel's root (`markFrontCentre`); `partAudio` plays any part under a marked root straight to the master bus, centred and at its own level under the master volume, never through a panner placed in the room, and heard on the title, where the game's own sound is muted. Both panels' roots are marked, so every click, detent, clunk and key turn on them is front centre. Tested (`front-centre.test.ts`); in the browser, a mouse press of SAVE and keyboard and gamepad turns of the knobs created no panner node.

#### Stage 2 as first planned

1. `src/toolkit/menus/logic/title-box.ts`: the box's spec (above), and the NEW GAME confirm step when a save exists.
2. Mount it on the overlay over the unchanged backdrop. Pointer input passes through outside the box. The DOM nav becomes its mirror. The sound lamp blinks until `partAudio.running()`.
3. SETTINGS opens the system panel without GAME. INSTRUCTIONS opens the card.
4. Check the backdrop's frame time with the box open (the overlay must draw only on change, so the backdrop's cost is unchanged), and that the theme, veil and shots are untouched.

### Stage 3: the remaining surfaces, each for the owner to rule on

Propose each in dev0 or dev39 and screenshot it. Do not ship it without the owner's word:

- **The help line:** an LED dot-matrix message strip (`createLedMatrix`) at the screen's foot.
- **The room title:** an engraved plate, top left.
- **The speed readout:** a seven-segment display, once the speed control works.
- **The top-right tools:** a small row of push buttons.
- **The movement pad:** a pendant pushbutton station (`pushbuttonStation`).

These are always visible and drawn every frame, so the cost decides. The touch sticks stay DOM.

### Stage 4: the panels the default

Once parity is proven (the stage 1 checks passing for the system panel and the title box), set `menuStyle` to `panel` by default. Remove the DOM menus' visual styling, keeping the mirror and the plain fallback (no WebGL, or MENU STYLE PLAIN). Update the README's controls section and `doc/design/control-interface-archetypes.md` with the menu panel's archetype, and propose to the owner a `CLAUDE.md` line: menus are Penfold panels drawn over the view, with an accessible mirror.

## Out of scope

- Save slots and naming them (the design is above, for when they come).
- Fullscreen.
- Localisation.
- The console, the manual, the dev panel and the error message.
- Graphics presets: their own entry in `TODO.md`. When they come, they are a rotary cam selector, LOW · MEDIUM · HIGH · ULTRA, in the PICTURE zone.
- The attract sequence's shots.

## Acceptance

- The stage 0 spike runs in dev39 and as an overlay with `?menu=panel`. Its measurements are recorded and the owner has seen them.
- Behind the flag, the system panel works every setting the DOM menu does, by mouse, touch, keyboard only, gamepad only and screen reader, through `src/toolkit/controls/`, with no menu polling input of its own.
- The title shows the small box over the unchanged low-resolution backdrop, its buttons working, CONTINUE refusing when there is no save, and NEW GAME confirming before overwriting.
- Open and idle, the overlay neither draws nor uploads. Closed, it costs nothing.
- Without WebGL, or with MENU STYLE at PLAIN, the plain DOM menu works as today.
- Lettering is legible at device pixel ratios 1–3 down to a 360 px wide screen, and every legend fits its plate (tested).
