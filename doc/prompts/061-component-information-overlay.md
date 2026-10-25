# 061: Component information overlay

Status: specified 2026-10-25 from the owner's requests and rulings, and the reviewed research in [`doc/research/component-information-overlay.md`](../research/component-information-overlay.md), which holds the detail this prompt summarises (picking, input modes, occlusion, merged geometry, event correlation). Stage 1 built 2026-10-25, awaiting the owner's acceptance (see the implementation note at the end, and [063](063-component-information-remediation.md) for what remains). Its second line follows prompt [060](060-inferred-component-descriptions.md), reviewed and ready to implement in its documented order; stage 1 can begin with the first line while the description data layer and its required network reconciliation are implemented.

## The request

The owner, 2026-10-25: show a component's identifier, its item and what it does in the overlay now used for the controls' instructions, when the pointer passes over it (or the view's centre rests on it). Later the same day: operating a valve, button or machine should also produce a short narrative of what the player did.

## What the player sees

**On hover or aim**, two lines in the instructions overlay:

```text
PL3-BT1-IV1: Balance tank make-up valve
Isolates water flowing from the water service to the balance tank.
```

```text
P-101A: Olympic pool duty circulation pump
1st Pump in PL2, currently Off
```

- The first line is the item's printed tag and its name. An item with no tag shows its name alone; nothing is given a made-up identifier, and a wall, a decorative pipe or an unclassified mesh shows nothing.
- The second line is its description, inferred as prompt 060 sets out: a valve "Isolates <commodity> flowing from <source> to <destination>", an isolator "Isolates power for <destination>", other equipment "<Cardinality> <equipment type> in <location>, currently <status>", live. An authored narrative replaces it only rarely. Where there is none, the second line is left out: no generic filler.
- The same resolver supplies descriptions to the inventory, printed manual and console's `status`. Wording matches for the same component and context; a snapshot-free manual omits live status, as prompt 060 specifies. PL2-P1 remains the pump-set assembly, separate from its individual P-101A/P-101B pumps.

**After an action** (stage 2), a short narrative in the same place:

```text
You opened PL3-BT1-IV1 (Balance tank make-up valve).
You closed PL3-BT1-DV1 (Balance tank drain valve).
You set PL3-JZ1-IV1 to OPEN (Return to the spa valve).
You pressed Jacuzzi cabinet RESET.
You switched off the jacuzzi cabinet.
```

- A manual valve that actually moves: "You opened …" or "You closed …".
- A motorised or actuated valve: one message, at once, when the command is accepted ("You set … to OPEN (…)"); none when it arrives, as its limit lamps show that.
- A momentary button: "You pressed …", even if nothing happens, never implying the machine started or stopped. A switch that actually switches: "You switched on/off …".
- Only the player's own confirmed operations; never automatic changes, interlocks, reloads or the attract sequence's. A refused or unchanged command says so briefly ("already open"), never success.

## The owner's rulings

- **Two stages**, each accepted before the next: stage 1, inspection; stage 2, action narratives.
- **Descriptions inferred**, as prompt 060 (with its six answers): valves' ends recorded in their register, the jacuzzi plant room first; live status shown; "1st Pump in PL2, currently Off"; type words and status wording in the catalogue's kinds; one description for the overlay, inventory and `status`; none where unknown.
- **Motorised valves narrated once, at once.**
- **Everything registered**: every tag the game draws or names is in a register (`registration.test.ts` enforces it), so the overlay's lookup is complete.

## Stage 1: inspection

**Input** (the one control scheme, `src/toolkit/controls/`; rooms bind nothing of their own): with a free mouse, the item under the pointer inside the canvas, re-evaluated as the camera or the item moves; with pointer lock, gamepad or touch, the item at the view's centre. Within 3 m to begin with, configurable apart from the use reach. Inspecting never uses anything.

**The overlay**: the existing `.controls-help` element, one owner of its text. The description replaces the instructions while an item is identified and gives way to them when it is not, without restarting their fade timer; climbing and carrying feedback take precedence; hidden behind the pause menu and the console, on the title screen, and for a room not on screen. A short acquisition delay (150 ms to start) stops flicker between neighbouring parts; one stable key per component, so moving from a valve's lever to its body does not restart it. The text, and its polite announcement, change only when the identity or the wording changes (the live status included), never every frame.

**Picking**: the first surface hit blocks: a wall or a closed cabinet door hides what is behind it; the most specific described owner on its parent chain wins (a switch over its cabinet; a valve's plaque, lever and body are one valve). Deliberate hidden pick meshes keep their owner; ordinary hidden meshes are ignored. Merged static geometry keeps each described component as a merge boundary. Not through open doorways into a second scene in this version.

**Where the data comes from**: a pure lookup from the registers and catalogue (tags, names, kinds, makers) and prompt 060's descriptions, built once per room, never per frame; scene builders attach each described object's identity when they build it. The controls' logic stays free of Three.js and of the game; picking is a view helper; the app joins them.

**Delivery**: prototype on dev0's boards first (a tagged instrument, a nested control, an untagged item, an item with no description), then the jacuzzi plant room (PL3-BT1-IV1, PL3-BT1-DV1, the tank, the cabinet and its controls, bodies as well as controls).

## Stage 2: action narratives

Begun once stage 1 is accepted, reusing its identity lookup. Built on the existing action boundary (`describe-action.ts`, the event log's `by: 'you' | 'console'`) and the parts' `press`, `on`, `off` and `refused` events, correlated so one interaction gives one narrative, from structured facts (never by parsing the log's English). A nonmodal notice in the overlay for four seconds of real time, independent of the simulation's speed, above the hover text and below climbing and carrying feedback; a short queue (three) keeping order, coalescing repeats; cleared on New Game, room change, the menu and the console; never replaying old events when a room is reopened. Prototyped on dev0: a switch, a powered and an unpowered button, a manual valve and a travelling actuator.

## Tests and acceptance

- Pure: the overlay's formatting (first line with and without a tag, second line present or absent), the description lookup (one source with the inventory and `status`), target and timing policy, the narrative formatter for each sentence form and the refused, unchanged and motorised cases.
- Scene: ownership through parents, merged geometry and hidden pick meshes; occlusion by walls and closed cabinet doors.
- Browser: hover, pointer lock, gamepad and touch aim; leaving the canvas; a still pointer with a moving camera; narrow screens; ladders, carrying, noclip, the menu, the console and room changes; the status updating while hovered without re-announcing every frame.
- Inspecting never dispatches an action, plays a sound or changes the save. Measure picking cost and draw calls in the Olympic plant room before the overlay is rolled out to every room. The project's five checks pass before each commit.

Accepted when, in the jacuzzi plant room, hovering PL3-BT1-IV1 shows its tag, name and "Isolates water flowing from the water service to the balance tank."; the Olympic plant room's first pump reads "1st Pump in PL2, currently Off" with its pumps stopped and updates when one starts; an item behind a closed cabinet door cannot be inspected; and (stage 2) opening and closing the make-up valve, setting a motorised valve and pressing the cabinet's RESET each give exactly one true sentence.

## Progress check — 2026-10-25 02:19 UTC

Work in progress: `inspection.ts` already handles the 150 ms acquisition delay, stable target keys, immediate loss, and live wording updates with pure tests; `component-identity.ts` marks scene owners, and the room pipework and feeder are gaining marks. The shared description resolver from prompt 060 is committed. Before stage 1 is accepted, check the actual pointer/centre selection and first-surface occlusion, especially a closed cabinet door; keep one `.controls-help` text owner and verify carrying/menu precedence and a stationary pointer while live status changes. Stage-2 narratives remain separate from this inspection pass.

## Implementation note — stage 1, 2026-10-25

- Pure timing and text: `src/toolkit/controls/logic/inspection.ts` (150 ms acquisition, stable keys, immediate loss, wording-only changes), tested.
- The one owner of `.controls-help`'s text stays `first-person.ts`, which takes an `inspect(x, y)` option and asks it ten times a second at the free pointer (while over the canvas, still counted as over it when the console's catcher covers it) or at the centre (pointer lock, gamepad, touch). Not while flying, climbing, carrying, held (the title), paused or with the console down. The text is written only when it changes; `.is-inspecting` shows it unfaded on two lines without restarting the controls' fade timer.
- Identity: `src/toolkit/components/core/views/component-identity.ts` marks owners; `src/toolkit/gallery/views/inspect-pick.ts` picks (first visible surface blocks; hidden meshes pass, `userData.pick` meshes count; nearest marked owner up the parents; meshes culled by bounding box within reach before triangles are tested); `src/game/plant/component-inspection.ts` gives the two lines from the registers and prompt 060's resolver, with no formatting of its own.
- Marked so far: placed layout equipment, room pipework and cabinet services valves, flowmeters, switch-fuses, PL3-BT1, and P-101A/B and P-201A/B within their pump sets. Wired in dev0 (controls named by part name, DEV-FT1 tagged), every plant room (`plant-room-shell-room.ts`) and the other shell rooms (`shell-room.ts`).
- Verified in Chrome: PL3-BT1-IV1 and PL3-BT1 lines; P-101A Off and On while the pointer stayed still; a wall clears the line; dev0's RESET push button. Measured picking in the Olympic plant room: 11 ms a pick before culling (mostly the services ceiling's merged meshes), 3.2 ms after (the first pick about 40 ms while bounding boxes are computed).
