# Component information in the controls overlay

Research requested by the owner on 2026-10-25. This is a proposal grounded in the current implementation, not an implemented feature. The owner's requirement is to show a component's identifier, item type and, where known, specific function in the overlay currently used for instructions when the mouse passes over it. The owner extended the request the same day: operating a valve, button or machine should also produce a short narrative confirmation of what the player did.

Status: reviewed with the owner on 2026-10-25 and ready to implement, in two stages (below). Its one prerequisite, registering the jacuzzi plant room's balance tank, is done (see Delivery).

## The owner's decisions (2026-10-25)

- **Two stages.** Stage 1 is inspection: the hover and centre-aim overlay showing tag, name and purpose. Stage 2 is the action narratives, built on stage 1's identity lookup once stage 1 is accepted. Each is delivered and accepted on its own.
- **Purposes, room by room.** For stage 1, every valve and item in the jacuzzi plant room (`plant_pool_03`, the demonstration room) gets a specific, authored purpose. Elsewhere the overlay shows the tag and name only, with no generic filler such as "Isolates or admits flow in the named pipe run.", until each room's purposes are written; that work is tracked room by room in `TODO.md`.
- **Motorised valves are narrated once, at once.** Pressing OPEN or SHUT for a motorised or actuated valve says straight away "You set PL3-JZ1-IV1 to OPEN (Return to the spa valve)." There is no second message when it arrives; its limit lamps and position show that.

## Proposed player experience

```text
PL3-BT1-IV1: Balance tank make-up valve
This allows clean mains water into the balance tank.
```

Use the plant's existing designation for the first field: `PL3-BT1-IV1` is an installation tag, distinct from an internal asset ID such as `valve-0102` or a manufacturer's serial number. Reuse the tag printed on the equipment and accepted by the console; do not allocate another numbering scheme. The user's example is now registered in `src/game/plant/installed-valves.ts`.

The first line names the particular item rather than just its generic family: “Balance tank make-up valve”, rather than “Butterfly valve”. The second describes its job in plain language. It should describe capability (“This allows…”) rather than imply it is currently open or flowing. In this model the make-up isolator permits supply to the tank's automatic make-up; the float's demand and the availability of water still determine whether water enters. Keep live readings and diagnoses on the instruments and in the console.

When the function is unknown, show only the first line. When an item has no registered tag, show its known name without a made-up identifier. An unclassified mesh, wall or decorative pipe should not acquire a description merely from its Three.js object name. An item can be informative without being operable: tanks, gauges, filters and equipment bodies qualify too.

## What is already available

| Existing facility                                                                                          | Location                                                                                   | Implication                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| One shared input controller, including unlocked pointer coordinates, centre aiming, touch and gamepad      | `src/toolkit/controls/input/first-person.ts`                                               | Add inspection here; rooms must not attach hover handlers.                                                                                       |
| The instruction element `.controls-help`, with `aria-live="polite"`, input-specific layout and fade timers | `first-person.ts`; `src/styles/main.css`                                                   | Reuse the same place and visual language. Its text is currently reset every update, so inspection needs a single owner of the displayed content. |
| Room raycasts and a 3 m use range                                                                          | `src/toolkit/gallery/rooms/plant-room-shell-room.ts`, `usableAt`                           | The geometry can be picked already, but the existing result is an action callback, not an identity.                                              |
| Stable tags and asset IDs for placed equipment and installed valves                                        | `src/game/plant/installed-asset-ids.ts`; `installed-valves.ts`                             | Use these identities across rooms, labels, inventory and console.                                                                                |
| Catalogue records containing name, kind and purpose; identified model parts with purpose                   | `src/game/plant/equipment-catalogue.ts`; `identification.ts`                               | Most prose exists already; extend this source rather than create a separate tooltip catalogue.                                                   |
| Valve builders have their installation record and display name at construction                             | `src/toolkit/gallery/views/cabinet-services.ts`; `room-pipework.ts`                        | Attach the identity where it is known instead of recovering it from text on a plaque.                                                            |
| Equipment placement has the room and item key/label                                                        | `src/toolkit/gallery/views/room-equipment.ts`, `createRoomEquipment`                       | Resolve a placement against its existing catalogue record once during construction.                                                              |
| Static geometry merging, with hidden originals retained for some clickable parts                           | `src/toolkit/components/core/views/merge-static.ts`; `gallery/views/scenario-simulator.ts` | Inspection must preserve ownership through merging and distinguish deliberate pick geometry from hidden contents.                                |

The newer console object-status work in the current working tree also reads `plantInventory()` and exposes object purpose. This is useful evidence of reuse, but inspection should not depend on console presentation code. Some valve purposes in `plantInventory()` are currently inferred from name fragments and otherwise generic (“Isolates or admits flow in the named pipe run.”). The make-up example needs an explicit, authored purpose in the canonical valve metadata, shared by inventory, console and overlay. An explicit per-installation description should override a generic equipment-family purpose. By the owner's decision, the overlay shows only authored purposes: a valve whose purpose is still the generic inferred line shows its tag and name alone, so the overlay never presents filler as fact. Stage 1 authors them for the jacuzzi plant room only.

## Input and overlay behaviour

These are recommended defaults for implementation, rather than additional owner rulings.

- With a free mouse, inspect the component under the pointer while it is inside the canvas. Entering the canvas establishes a fresh pointer position; leaving it clears the target. A stationary pointer must still be reevaluated when the camera or an object moves.
- With pointer lock, inspect the centre of the view. With a gamepad or touch, use the same centre target. Touch needs no additional tap, since tapping already operates equipment. Switching input mode clears stale pointer targeting.
- Start with a 3 m inspection range in metres, matching current use reach. Keep the range configurable independently of use reach. A future longer inspection distance must not make controls operable from farther away.
- Replace the baseline instructions while a component is identified. Restore the appropriate walking or noclip help when it is no longer identified, respecting the help timer instead of restarting its full countdown after every hover. Inspection stays legible while its target remains selected, even if the instruction timer has expired.
- Climbing and essential carrying feedback take priority over descriptive text. Hide inspection behind the pause menu and console, on the title screen, for hidden rooms and for a room following another room's camera. Noclip inspection can remain read-only, just as ordinary inspection never invokes Use.
- A short target acquisition delay, initially 150 ms, can suppress flicker between adjacent details. Keep a stable component key so moving from a valve's handle to its body does not restart it. Clear immediately on room change, pause, loss of target eligibility or occlusion; any optional gap tolerance must never show an occluded or departed room's item.
- Show two logical lines, allowing wrapping on narrow screens. Use text nodes and the existing HUD style. Update DOM text and polite announcements only when the identity or displayed text changes, not every frame. Avoid moving the overlay with the cursor.

The current `.controls-help` is pointer-transparent and fades after a minute, or ten seconds on touch. Both behaviours need deliberate treatment. In free-mouse mode, allow the displayed description to remain while the pointer moves onto the information panel so it can be read. The existing Esc/menu route hides it; do not add a competing Escape handler. The [W3C guidance on hover content](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus/) identifies persistence, dismissal and the ability to move over displayed content as relevant concerns. Centre aiming supplies a route without mouse hover, but does not by itself establish screen-reader accessibility for a 3D scene.

## Proposed implementation

Keep the descriptive data pure. A small display record can be `{ key, tag?, name, purpose? }`, with `key` a stable target identity and `tag` the optional printed designation. Build a lookup from the catalogue and model-part manifests once per mounted room or catalogue revision; do not rebuild the entire plant inventory or walk the world every animation frame. Presentation metadata creates no saved state and therefore needs no world-version migration.

At scene construction, associate an equipment root, individual valve or instrument with its display record or a stable reference to one. A reusable helper in component core can own a `WeakMap<Object3D, ...>` or a clearly named metadata property. The scene adapter resolves the game catalogue; reusable components receive data through props and never import the game. In dev rooms, supply representative tags and purposes explicitly, without registering demonstration items as live plant assets.

Extend the shared controller with an optional `inspectAt(x, y)` callback returning a plain display record or null. Its type and formatting policy can live in `src/toolkit/controls/logic/`, without DOM or Three.js. Scene picking belongs in a reusable view helper outside pure logic. The controls package must not import component core or the game. Rooms supply their pick root/resolver and callback; the controller owns pointer tracking, timing, modes and DOM presentation.

A proposed game helper such as `src/game/plant/component-information.ts` resolves metadata without Three.js or DOM. Explicit functions for individual valves should be added to their existing register and consumed by the catalogue, keeping the overlay, inventory and console consistent. Known generic purpose is a fallback, not a reason to invent specific connections. Any wiring gaps must remain visible as missing metadata during development.

## Narrative confirmations after an action

The owner also wants a narrative popup when the player operates a component. The requested wording is:

```text
You opened <part> (<description>).
You closed <part> (<description>).
You pressed <button name>.
You switched off <machine name>.
```

Use the same identity and name resolution as hover inspection. For a tagged valve, `<part>` is its printed tag and `<description>` is its specific item name, not a second tag or the full purpose sentence. This keeps the narrative brief and distinguishable from the hover explanation:

```text
You opened PL3-BT1-IV1 (Balance tank make-up valve).
You closed PL3-BT1-DV1 (Balance tank drain valve).
You pressed Jacuzzi cabinet RESET.
You switched off the jacuzzi cabinet.
```

With an untagged but named component, use its name directly and omit empty parentheses. A button's name must identify its owning equipment where a legend such as START, STOP or RESET would otherwise be ambiguous. Complementary actions use the same pattern: “You switched on …”. Do not invent a name or specific function when the metadata is absent.

Recommended presentation: a nonmodal notification in the same HUD area as inspection and instructions, temporarily taking precedence over hover text. It remains after the pointer moves away, then returns to the currently applicable inspection or instructions. Start with four seconds of real elapsed display time, independent of simulation speed. Keep critical climbing/carrying feedback above the narrative; otherwise use action confirmation → inspection → ordinary instructions. Give consecutive actions a small bounded queue, initially three pending messages, preserving order and allowing identical repeated messages to coalesce. A single interaction should normally produce one narrative, not a separate popup for every consequent model write, lamp change or pump response. An automatic response is still recorded in the plant log.

The notification describes a confirmed operation, not simply a click. A manual lever valve that actually changes position says “You opened …” or “You closed …”. A motorised or actuated valve takes time to travel, or may not move at all without power, so by the owner's decision it is narrated once, when the command is accepted: “You set PL3-JZ1-IV1 to OPEN (Return to the spa valve).” No second message follows when it arrives; its limit lamps and position show that. For a command that is rejected or changes nothing, do not report success: a short refusal or “already open” response can explain the result.

A momentary button is a distinct case: “You pressed …” reports the physical press even when an unpowered circuit does nothing. It must not imply that the requested machine started, stopped or reset. Likewise “You switched off …” describes an actual confirmed switching operation; if the model only accepted an OFF command, say so rather than claiming the machine has stopped. Internal model updates, remote save adoption, reloads, attract scenes, interlocks and automatic control changes must never be narrated as things “You” did.

### Existing event support and the missing connection

`src/game/events/describe-action.ts` already receives before/action/after and emits an action event, including “no change” where appropriate. `src/game/events/game-event.ts` carries `subject`, `kind`, `text` and `by: 'you' | 'console'`; `src/toolkit/save/world-store.ts` appends these to the player's event log when an action is dispatched. Reuse that action boundary and the canonical component catalogue. Do not parse the log's English strings to recover the operation, outcome or identity; expose structured presentation facts from the action description path instead, keeping its existing log output intact.

World actions do not cover every physical button press. `Part.onEvent` already forwards named component events, including `press`, `on`, `off` and `refused`. In `createMomentary()` (`src/toolkit/components/core/logic/world/components.ts`), `press` is emitted even when power or a latch prevents its action. This is exactly why press feedback and successful model changes must be treated separately. The shared interaction route should pass explicit player-origin context into an event adapter, correlate a component press with any model actions it causes, and choose one appropriate narrative. Default `by: 'you'` on a dispatch is insufficient evidence by itself that a physical player interaction just occurred.

Proposed implementation: add a pure narrative formatter and structured operation/outcome data beside the existing game event descriptions; route reusable component press events through a generic callback without making the toolkit import game code. The app joins those events to component metadata and feeds one notification presenter. Keep message sequence/correlation IDs and the display queue in ephemeral UI/event state, not in the saved world. Do not deduplicate by world time or array length: several actions can happen at one simulation time, and the existing log is a bounded ring. Subscribe only to newly emitted events, so mounting or reopening a room never replays previous successes. The popup itself must never dispatch an action or be required for an action to succeed.

Dev0's prototype should include a working switch, a powered and unpowered momentary button, a manual valve and a travelling actuator. Add acceptance checks for the four requested sentence forms, known and missing descriptions, a refused or unchanged operation, a press with no resulting model change, one press causing multiple model writes, automatic changes, rapid alternating open/close operations, all three input modes, movement away from the target, room changes, pause/console transitions, announcement stability and queue expiry at different simulation speeds. Clear pending notices on New Game and suppress stale notices while the menu or console owns the screen. Choose explicitly whether a still-recent notice resumes after returning to play; do not build an unlimited backlog while hidden. No changes to saved-world shape are required.

## Picking correctly

Three.js returns ray intersections nearest first and can return an instance ID for instanced meshes; see its [Raycaster documentation](https://threejs.org/docs/pages/Raycaster.html). Start at the first eligible blocking surface and walk up its ownership chain to the most specific described component. A switch should win over the cabinet that contains it; a valve's plaque and handle should identify the same valve. If that first surface has no component owner, it still blocks equipment behind it. Do not scan past walls, closed cabinet doors or unrelated equipment looking for a tagged hit.

Visibility needs an explicit policy. A genuinely hidden cabinet interior or closed lobby is ineligible, including when an ancestor is hidden. However, the merger intentionally retains some hidden original meshes for picking and disables raycasting on their visible merged copies. Filtering every invisible mesh would break those targets. Mark intentional pick proxies, retain their logical owner and visibility boundary, and exclude ordinary hidden meshes. Existing Use behaviour must remain unchanged.

Preserve identity when merging: for the first version, keep described component roots as merge boundaries and merge within each root, retaining the parent chain. Where a builder already merges across several components, extend its grouping to include the logical component owner, or provide an exact owner mapping for the merged triangles. Do not disable room-wide batching or add large bounding-box pick volumes that select equipment through empty space. Instanced geometry needs an instance-to-owner map wherever instances represent different assets. Test draw calls and picking cost before spreading this across the larger rooms.

An open door can show a second independently rendered scene. Local raycasting alone cannot identify its equipment. For the initial version, stop at the local scene boundary and clear stale information during handover. Treat inspection through an open doorway as a follow-up with transformed rays, distance accounting, clipping and occlusion across both scenes; do not imply it already works.

## Delivery and acceptance

### Before stage 1: register what it will describe

Done 2026-10-25: the jacuzzi plant room's balance tank, PL3-BT1, drawn by `cabinet-services.ts` outside the room's layout, was unregistered; it is now in `src/game/plant/installed-fixtures.ts` (with the Olympic balance tank and its six flowmeters, likewise unregistered), in the inventory and the console's `status`. `src/game/plant/registration.test.ts` fails on any plant tag written in the code that no register holds, so a new item cannot be drawn without an identity. The spa overflow valve PL3-JZ1-IV2 was removed on 2026-10-25 and is not part of it.

### Stage 1: inspection

1. Prototype on dev0's boards, as project guidance requires for a new display/control behaviour: a tagged instrument, a nested control, an untagged item, and an item with no function text. Establish one overlay presenter and the pure formatting and target-selection policy first.
2. Author specific purposes for every valve and described item in the jacuzzi plant room, in the canonical registers (shared with the inventory and the console's `status`); elsewhere show tag and name only. Add a `TODO.md` item to write the other rooms' purposes, room by room.
3. Demonstrate in the jacuzzi plant room using `PL3-BT1-IV1` (make-up) and `PL3-BT1-DV1` (drain), plus the tank and cabinet. Cover non-operable bodies and individual controls. The example's make-up description must remain true whether the valve is open or closed.
4. Verify pointer hover, pointer lock, stationary-pointer camera movement, gamepad and touch centre aim, leaving the canvas, switching input, narrow viewports, expired instruction timers, ladders, carrying, noclip, menus and room handover. Merely inspecting must never dispatch an action, play an operation sound or modify a save.
5. Test occlusion by walls and closed doors; an internal control must disappear behind its cabinet door. Verify moving controls, merged geometry, deliberate hidden pick proxies and multiple parts of one component. Every rollout to a merged builder must retain these checks.
6. Pure tests cover formatting, optional fields, specific-purpose precedence (and that a generic purpose is not shown) and timing/priority. Scene tests cover ownership and occlusion; browser checks verify actual overlays, input modes and announcement stability. Measure picking cost and draw calls in the Olympic plant room before broad rollout, then run the project's five checks before committing.

### Stage 2: action narratives

Begun once stage 1 is accepted, reusing its identity and name lookup.

1. Prototype on dev0: a working switch, a powered and an unpowered momentary button, a manual valve and a travelling actuator.
2. Verify the narratives for opening and closing manual valves, setting a motorised valve (one message, at once), pressing named buttons and switching machines off, including the event-origin, outcome and deduplication cases above, and the acceptance checks listed under "Existing event support".
3. Run the project's five checks before committing.

Research is complete and reviewed; implementation remains, in the two stages above. Later decisions can be made against the prototype: whether inspection should reach beyond 3 m, and whether to add readings, manufacturer/model details or inspection through open doors. None is needed to deliver the requested two-line identification and action narratives.
