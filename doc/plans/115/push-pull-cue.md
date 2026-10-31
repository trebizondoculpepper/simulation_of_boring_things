# Mission 115, part two: the crosshair says what a use will do

Research only, 2026-10-31. Nothing here is built yet. It follows mission 115 (`doc/prompts/115-knob-turn-crosshair.md`, Codex's review `codex-critique.md` beside this file), which put a curved turn arrow over the crosshair for the part kit's knobs and selectors.

## The owner's request

The owner, 2026-10-31, quoted: "on anything that can be pushed, we get a downward pointing arrow, towards the target (green), anything that can be pulled, we get a downward pointing arrow away from the target (e.g. emergency buttons), so the idea now is that for most interactions the arrow tells you what we can do. Green circle with no arrow implies use in some other way for now. Research this."

### How I have read it

- **The aim**: for most things a use can work, the cue over the crosshair says what the use will physically do, as the turn arrow already does for knobs. Green says it will happen; red says it will not (as for the turn arrow, and as the carrying cues already use).
- **"Downward" means into the screen** (confirmed by the owner through the lead, 2026-10-31): a push is an arrow that seems to go into the screen, towards the target, as a finger pressing the button; a pull is an arrow that seems to come out of the screen, away from the target and towards the player, as a hand drawing an emergency stop's head back out. The drawings below are designed for that; the flat-screen reading (both arrows pointing down the screen) is set aside.
- **"Green circle with no arrow implies use in some other way, for now"**: anything usable whose gesture is none of these (a card presented to a reader, a fuse replaced, a touch screen, a blind's wand) shows the ring green with no arrow. Today such things turn the ring amber (`#ffb43a`, `first-person.ts`). I read the request as replacing that amber with green, so that the ring always says something: green with an arrow (do this), green with none (use it some other way), red (it will not go). That is a question for the owner too, since it changes the look of every use in the game at once.

## 1. Every kind of usable thing, and what using it does

How the game delivers a use today: every working part is built on `beginPart` (`src/toolkit/components/core/parts/parts.ts`), whose `uses` map runs from an object (a cap, a lever, a leaf) to what a use on it does, taking a direction for knobs. Rooms collect parts in a `PartSet` and each room's `useAt` raycasts its own groups, walks up from the mesh hit to an object in a `uses` map, and calls it with `knobDirection(object, hit.point, camera)`. Some views keep a `uses` map of their own (the same shape) that rooms merge in; a few rooms add uses of their own; picking up and putting down is the handling system (`src/toolkit/controls/input/object-handling.ts`). The `Wiring` column says which: **kit** is a part's own `uses` (from `beginPart`), **view** a view's own map, **room** a room file's, **handling** the carrying system.

The gesture names: **push**, **pull**, **turn** (already cued for kit knobs), **turn by state** (a toggle that turns the way its state says, whichever half is clicked, so its arrow points the way it will go, not the way the pointer falls), **flip up / flip down** (a lever, rocker or dolly thrown up or down, the direction by its state), **open/close** (a hinged door or lid swung), **slide**, **pick up**, **touch** (a touch screen), **other** (the plain ring).

### The shared part kit (`src/toolkit/components/core/parts/parts.ts`)

| Kind                                                         | Use object                         | What a use does                                                                                                                                                            | Gesture                                        | State decides it?      | Refused (red) when                                                                        |
| ------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `pushButton` (30 mm momentary, flush, extended, illuminated) | `view.cap`                         | presses in, springs back, does `action`                                                                                                                                    | push                                           | no                     | unpowered or latched (`createMomentary.press`: it always clicks but does nothing)         |
| `ledPushbutton` (push-on, push-off)                          | `view.cap`                         | toggles its state                                                                                                                                                          | push                                           | no                     | unpowered or latched                                                                      |
| `studioSwitch` (momentary or latching)                       | `view.group`                       | as the two above                                                                                                                                                           | push                                           | no                     | unpowered or latched                                                                      |
| `pilotLight` (push-to-test)                                  | `view.lens` (and its off lens)     | lights the lamp a moment                                                                                                                                                   | push                                           | no                     | never (a burnt-out bulb stays dark, but the press happens)                                |
| `selector` (2, 3, 4 positions, XB4, cam, key, changeover)    | `view.knob`                        | a detent each way                                                                                                                                                          | turn                                           | side of the knob       | latched, end stop (done, `markTurnable`)                                                  |
| `potentiometer`                                              | `view.group`                       | a step each way                                                                                                                                                            | turn                                           | side of the knob       | end stop (done)                                                                           |
| `mushroomStop`                                               | `view.head`                        | out: struck in (stop applied); in: **pulled** back out (`createMushroomStop`: "stays in when struck and is pulled back out to release"; this one pulls, it does not twist) | push when out, pull when in                    | yes, `stop.pushed`     | never: it cannot be latched out, which is the point of it                                 |
| `disconnectHandle`, flange or heavy-throw                    | `view.lever`                       | ON up, OFF down; TRIPPED (between) goes to OFF                                                                                                                             | flip down from ON or TRIPPED, flip up from OFF | yes, `handle.position` | latched (padlocked): it shudders against its stop                                         |
| `disconnectHandle`, `rocker` or `dolly` (MCB, RCBO)          | `view.lever` (the rocker or dolly) | as above; a dolly is up for ON (`createDinDolly`)                                                                                                                          | flip up / flip down                            | yes                    | latched                                                                                   |
| `disconnectHandle`, `rotary`                                 | `view.lever`                       | a quarter turn clockwise OFF to ON (`createRotaryIsolatorHandle`), back anticlockwise                                                                                      | turn by state                                  | yes                    | latched                                                                                   |
| `keySwitch`                                                  | `view.key`                         | turned 0 or I (`createSwitch.flip`)                                                                                                                                        | turn by state (0 to I clockwise)               | yes                    | latched (a TODO follow-up of 115)                                                         |
| `pushbuttonStation`                                          | each `cap.cap`                     | momentary                                                                                                                                                                  | push                                           | no                     | unpowered                                                                                 |
| `driveKeypad`                                                | each `key.group`                   | momentary key                                                                                                                                                              | push                                           | no                     | unpowered                                                                                 |
| `operatorTerminal`                                           | each `key.cap`                     | momentary key                                                                                                                                                              | push                                           | no                     | unpowered                                                                                 |
| `doorLatch` (quarter-turn wing latch)                        | the part's `object`                | opens the cabinet door or shuts it (`door.flip`)                                                                                                                           | turn by state, or open/close                   | yes, `door.state`      | latched (the motor control unit's interlock, a bound latch)                               |
| `doorBack` (a door's vented back)                            | the part's `object`                | shuts the shared door if it is open                                                                                                                                        | push (shut it)                                 | yes                    | the door is already shut (nothing happens)                                                |
| `rackUnit` (chassis or drawer on slides)                     | `view.group`                       | runs out on its slides, or back in                                                                                                                                         | pull when in, push when out                    | yes, `out.state`       | latched                                                                                   |
| `motorControlUnit`, handle                                   | `view.handle`                      | as the disconnect's operating handle                                                                                                                                       | flip up / flip down                            | yes                    | padlocked                                                                                 |
| `motorControlUnit`, door                                     | `view.door`                        | opens or shuts                                                                                                                                                             | open/close                                     | yes                    | the handle is ON (the door's latch is `handle.on`)                                        |
| `overloadRelay`, dial                                        | `view.dial`                        | a detent each way (`relay.dial` is a `createSelector`)                                                                                                                     | turn                                           | side                   | end stop. **Not marked turnable today**, though it could be in one line, as `selector` is |
| `overloadRelay`, RESET                                       | `view.reset`                       | resets it once cool                                                                                                                                                        | push                                           | no                     | not tripped, or not yet cool (`heat >= 1`): it presses but does nothing                   |
| `overloadRelay`, TEST                                        | `view.test`                        | trips it                                                                                                                                                                   | push                                           | no                     | never                                                                                     |
| `fuse`                                                       | `view.cartridge`                   | pulled and a new one fitted                                                                                                                                                | other                                          | no                     | never                                                                                     |
| `electrolyticCapacitor`, `capacitorBoard`                    | the can                            | replaced                                                                                                                                                                   | other                                          | no                     | never                                                                                     |
| `contactor`, `motor`                                         | none                               | not usable                                                                                                                                                                 | none                                           |                        |                                                                                           |

### Other core parts

| Kind                                | File                         | Wiring | What a use does                    | Gesture                                                                | State decides? | Refused when |
| ----------------------------------- | ---------------------------- | ------ | ---------------------------------- | ---------------------------------------------------------------------- | -------------- | ------------ |
| `membraneKey`                       | `core/parts/small-parts.ts`  | kit    | dips the key, `action`             | push                                                                   | no             | never        |
| `fasciaKey`                         | `core/parts/small-parts.ts`  | kit    | clicks, `action`                   | push                                                                   | no             | never        |
| `illuminatedRocker` (I/O rocker)    | `core/parts/small-parts.ts`  | kit    | rocks over, `action`               | flip up / flip down                                                    | yes            | never        |
| `piezoButton`                       | `core/parts/wet-parts.ts`    | kit    | flashes its ring, `action`         | push                                                                   | no             | never        |
| `swingHandle` (EMKA cubicle handle) | `core/parts/swing-handle.ts` | kit    | steps home, out, turned, out, home | pull (home to out), turn (out to turned, and back), push (out to home) | yes, its step  | never        |

### Architectural parts (`src/toolkit/components/architectural/parts/`)

| Kind                                                                             | File                                            | Wiring | What a use does                                                                                                                                                                     | Gesture                                                                    | State decides?                    | Refused when                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| `lightSwitch` (plate rocker per gang)                                            | `building-parts.ts`                             | kit    | throws the gang                                                                                                                                                                     | flip up / flip down                                                        | yes                               | never                                               |
| `gridSwitchPlate` rockers                                                        | `building-parts.ts`                             | kit    | throws the zone                                                                                                                                                                     | flip up / flip down                                                        | yes                               | never                                               |
| `gridSwitchPlate` EM TEST key                                                    | `building-parts.ts`                             | kit    | turns the test key                                                                                                                                                                  | turn by state                                                              | yes                               | never                                               |
| `springDoor` (portal doors in the dev rooms)                                     | `building-parts.ts`, `gallery/views/portals.ts` | kit    | opens one way only (`opens`), eases shut                                                                                                                                            | push from its face side, pull from behind (or the reverse for `opens: -1`) | yes: which side the player stands | never                                               |
| `closerDoor`, `risingButtDoor`                                                   | `building-parts.ts`                             | kit    | opens, closes itself                                                                                                                                                                | push or pull by side                                                       | side                              | never                                               |
| `dimmer`                                                                         | `building-parts.ts`                             | kit    | a detent each way, 0 to 10                                                                                                                                                          | turn                                                                       | side                              | end stop (a 115 follow-up)                          |
| `thermostat` (dial)                                                              | `building-parts.ts`                             | kit    | 1 °C each way, 5 to 30                                                                                                                                                              | turn                                                                       | side                              | end stop (a 115 follow-up)                          |
| `radiator` (TRV head)                                                            | `building-parts.ts`                             | kit    | a step each way, 0 to 5                                                                                                                                                             | turn                                                                       | side                              | end stop (a 115 follow-up)                          |
| `pullCordSwitch`                                                                 | `building-parts.ts`                             | kit    | toggles the light                                                                                                                                                                   | pull                                                                       | no                                | never                                               |
| `twinSocket` rockers                                                             | `building-parts.ts`                             | kit    | switches each side                                                                                                                                                                  | flip up / flip down                                                        | yes                               | never                                               |
| `fusedSpur`                                                                      | `fused-spur.ts`                                 | kit    | switches it                                                                                                                                                                         | flip up / flip down                                                        | yes                               | never                                               |
| `floorBox` lid                                                                   | `building-parts.ts`                             | kit    | lifts or shuts                                                                                                                                                                      | open/close                                                                 | yes                               | never                                               |
| `distributionBoard`, cover and latch                                             | `building-parts.ts`                             | kit    | opens or shuts the cover                                                                                                                                                            | open/close                                                                 | yes                               | never                                               |
| `distributionBoard`, main switch and MCBs                                        | `building-parts.ts`                             | kit    | throws each                                                                                                                                                                         | flip up / flip down                                                        | yes                               | never                                               |
| `acController` buttons (power, mode, up, down)                                   | `building-parts.ts`                             | kit    | beeps, changes its setting                                                                                                                                                          | push                                                                       | no                                | up at 30 °C, down at 16 °C (clamped silently today) |
| `windowWithVent`, handle and sash                                                | `building-parts.ts`                             | kit    | opens or shuts the vent                                                                                                                                                             | open/close                                                                 | yes                               | never                                               |
| `windowWithVent`, blinds                                                         | `building-parts.ts`                             | kit    | turns the slats                                                                                                                                                                     | other                                                                      | yes                               | never                                               |
| `accessDoor`, reader                                                             | `building-parts.ts`                             | kit    | a card presented                                                                                                                                                                    | other                                                                      | no                                | never                                               |
| `accessDoor`, exit button                                                        | `building-parts.ts`                             | kit    | push to exit                                                                                                                                                                        | push                                                                       | no                                | never                                               |
| `accessDoor`, green emergency release                                            | `building-parts.ts`                             | kit    | breaks the glass                                                                                                                                                                    | push                                                                       | yes                               | already broken                                      |
| `accessDoor`, release key                                                        | `building-parts.ts`                             | kit    | resets the glass                                                                                                                                                                    | turn by state                                                              | yes                               | not broken                                          |
| `accessDoor`, leaf                                                               | `building-parts.ts`                             | kit    | opens or shuts it                                                                                                                                                                   | push or pull by side                                                       | side, open or shut                | locked (`props.work()` returns false)               |
| `intercom`                                                                       | `building-parts.ts`                             | kit    | rings reception                                                                                                                                                                     | push                                                                       | no                                | never                                               |
| `cardReader` (beside every plant and equipment door)                             | `card-reader.ts`                                | kit    | a card presented: green three seconds                                                                                                                                               | other                                                                      | no                                | never                                               |
| `plantRoomDoor` (Ironside FD60)                                                  | `plant-door.ts`                                 | kit    | opens, closes itself. Its leaf swings out into the hall (pull handle on the hall side, push plate on the plant side), though `logic/plant-door.ts` says it opens "from either side" | pull from the hall side (+z), push from the plant side                     | side                              | never                                               |
| `equipmentDoors` (pair)                                                          | `equipment-doors.ts`                            | kit    | each leaf opens, closes itself                                                                                                                                                      | pull from the pull side (`swing`), push from the other                     | side and `swing`                  | never                                               |
| `ladderGate`                                                                     | `ladder-gate.ts`                                | kit    | opens away from the pit                                                                                                                                                             | push from outside, pull from the pit side                                  | side                              | never                                               |
| `createMeshCagePart` door                                                        | `mesh-cage.ts`                                  | view   | opens or shuts                                                                                                                                                                      | open/close                                                                 | yes                               | never                                               |
| `architecturalPart('testvalve')` actuator                                        | `architectural-parts.ts`                        | kit    | opens or shuts the sprinkler test drain                                                                                                                                             | turn by state                                                              | yes                               | never                                               |
| `presenceDetector`, `occupancySensor`, `luminaire`, `acCassette`, `extractorFan` | `building-parts.ts`                             | none   | not usable                                                                                                                                                                          | none                                                                       |                                   |                                                     |

### Fire and general safety

| Kind                                 | File                                   | Wiring | What a use does                                             | Gesture                                               | State decides? | Refused when                                                                      |
| ------------------------------------ | -------------------------------------- | ------ | ----------------------------------------------------------- | ----------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `callPoint` face                     | `fire/parts/fire-parts.ts`             | kit    | pressed in (resettable element)                             | push                                                  | yes            | already latched                                                                   |
| `callPoint` key                      | `fire/parts/fire-parts.ts`             | kit    | resets it                                                   | turn by state                                         | yes            | not latched                                                                       |
| `firePanel` buttons and keys 1 to 4  | `fire/parts/fire-parts.ts`             | kit    | each does its own; refusal known only by doing it (`act()`) | push                                                  | no             | keys 1 and 3 always; reset when there is nothing to reset (needs a `can` written) |
| `firePanel` access key               | `fire/parts/fire-parts.ts`             | kit    | turned                                                      | turn by state                                         | yes            | never                                                                             |
| `valveSet` main valve handwheel      | `fire/parts/fire-parts.ts`             | kit    | opens or shuts the riser                                    | turn by state (open anticlockwise)                    | yes            | never                                                                             |
| `valveSet` reset                     | `fire/parts/fire-parts.ts`             | kit    | resets the alarm valve                                      | push                                                  | no             | never                                                                             |
| `extinguisher`                       | `fire/parts/fire-parts.ts`             | kit    | ready: pin pulled; unpinned: discharges; empty: a fresh one | pull (pin), then push (squeeze), then other (replace) | yes            | while discharging (nothing happens)                                               |
| `heldFireDoor`                       | `fire/parts/fire-parts.ts`             | kit    | opens or shuts                                              | push or pull by side                                  | side           | never                                                                             |
| `keyPlate` (emergency lighting test) | `general-safety/parts/safety-parts.ts` | kit    | turns the key                                               | turn by state                                         | yes            | never                                                                             |
| `toiletAlarmCord`                    | `general-safety/parts/safety-parts.ts` | kit    | pulled                                                      | pull                                                  | no             | never                                                                             |
| `toiletAlarmReset`                   | `general-safety/parts/safety-parts.ts` | kit    | pressed                                                     | push                                                  | no             | nothing to reset                                                                  |

### Plant views (`src/toolkit/components/plant/`) and the plant rooms' own wiring

The game's plant rooms are built largely from the kit: pump START and STOP and every panel button are `pushButton`s (128 call sites), HAND · OFF · AUTO and the like are `selector`s (79), MCBs are `disconnectHandle` dollies or the distribution board's, the Wash-O-Tron's buttons are all `pushButton`s (`plant/views/wash-o-tron.ts`), and the Trio's lower door catch is a `doorLatch` (`plant/views/aqualis-cabinet.ts`). So all of those come with the kit.

| Kind                                             | File                                                                                                                        | Wiring                           | What a use does                                                      | Gesture                              | State decides? | Refused when                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------- | ------------------------------------ | -------------- | ------------------------------------------------------------ |
| Wafer butterfly valve, lever                     | `plant/views/water-butterfly-valve.ts` (placed by `gallery/views/room-pipework.ts`)                                         | kit                              | opens or shuts (notched lever)                                       | turn by state                        | yes            | never                                                        |
| The same, overhead, chain wheel                  | `water-butterfly-valve.ts` `addChainWheel`                                                                                  | room (`room-pipework.ts`)        | pulling the chain works it                                           | pull                                 | no             | never                                                        |
| Throttle valve lever (notched, stepped)          | `plant/views/throttle-valve.ts`                                                                                             | kit                              | a notch each way, with ends                                          | turn                                 | side           | at either end (not marked; it takes a direction like a knob) |
| Actuated ball and butterfly valves, red override | `actuated-ball-valve.ts`, `actuated-butterfly-valve.ts`, `gallery/views/cabinet-services.ts`                                | kit, room                        | pressed, works it by hand                                            | push                                 | no             | never                                                        |
| Chemical ball valve lever                        | `plant/views/chemical-ball-valve.ts`                                                                                        | kit                              | quarter turn open or shut                                            | turn by state                        | yes            | never                                                        |
| Gas ball valve lever                             | `plant/views/gas-fittings.ts`                                                                                               | kit                              | quarter turn                                                         | turn by state                        | yes            | never                                                        |
| Inline isolating valve                           | `plant/views/inline-fittings.ts`                                                                                            | kit                              | opens or shuts                                                       | turn by state                        | yes            | never                                                        |
| Motorised valve MAN knob                         | `plant/views/dosing-valves.ts`                                                                                              | kit                              | toggles its command                                                  | push (a red knob; a guess)           | no             | never                                                        |
| Solenoid valve coil (manual)                     | `dosing-valves.ts`                                                                                                          | kit                              | energises it by hand                                                 | other                                | yes            | never                                                        |
| PRIME knob                                       | `dosing-valves.ts`                                                                                                          | kit                              | quarter turn on or off                                               | turn by state                        | yes            | never                                                        |
| Check valve body                                 | `dosing-valves.ts`                                                                                                          | kit                              | cleaned (descaled)                                                   | other                                | no             | never                                                        |
| Relief valve cap (1.5, 3, 5 bar)                 | `dosing-valves.ts`                                                                                                          | kit                              | the next setting, wrapping round                                     | turn (always clockwise)              | no             | never                                                        |
| TANK / COLUMN lever                              | `dosing-valves.ts`                                                                                                          | kit                              | quarter turn                                                         | turn by state                        | yes            | never                                                        |
| Dosing pump stroke-length dial                   | `plant/views/motor-dosing-pump.ts`                                                                                          | kit (`dialPart`)                 | a step each way                                                      | turn                                 | side           | end stop (a 115 follow-up)                                   |
| Dosing pump relief and bleed valve               | `motor-dosing-pump.ts`                                                                                                      | kit (`bleedPart`)                | left opens, right shuts                                              | turn                                 | side           | already there (a 115 follow-up)                              |
| Dosing pump fascia keys                          | `plant/views/membrane-key.ts`                                                                                               | kit                              | pressed                                                              | push                                 | no             | never (unpowered: worth checking)                            |
| ISO tank foot valve and outlet levers            | `plant/views/iso-tank-container.ts`                                                                                         | kit                              | opens or shuts                                                       | flip or turn by state                | yes            | never                                                        |
| ISO tank outlet cap                              | `iso-tank-container.ts`                                                                                                     | kit                              | capped or open                                                       | other (unscrew)                      | yes            | while a hose is coupled (returns silently)                   |
| Leak detection drain lever                       | `plant/views/leak-detection.ts`                                                                                             | view                             | opens or shuts the drain                                             | turn by state                        | yes            | never                                                        |
| Leak monitor TEST, SILENCE, RESET                | `leak-detection.ts`                                                                                                         | kit buttons                      | as pushbuttons                                                       | push                                 | no             | as kit                                                       |
| Sample cell tap                                  | `plant/views/sample-cell-panel.ts`                                                                                          | kit                              | dips, draws a sample                                                 | push (down)                          | no             | never                                                        |
| Tank drain handwheel                             | `plant/parts/tank-drain.ts`                                                                                                 | kit                              | opens or shuts                                                       | turn by state                        | yes            | never                                                        |
| CO₂ changeover lever, isolation handle           | `plant/parts/co2-supply.ts`                                                                                                 | view                             | throws the lever; isolates the line                                  | flip (lever), turn by state (handle) | yes            | never                                                        |
| Gas cylinder handwheel valves                    | `plant/views/gas-cylinder.ts`                                                                                               | none                             | not usable: no `uses` anywhere (the 115 follow-up's check, answered) | none                                 |                |                                                              |
| Backwash pit gate and covers                     | `plant/views/backwash-pit.ts`                                                                                               | view                             | open or shut                                                         | open/close                           | yes            | never                                                        |
| Chemical control box door and latch              | `plant/views/chem-control-box.ts`                                                                                           | view                             | open or shut                                                         | open/close                           | yes            | never                                                        |
| Switchboard and MCC cabinet doors                | `plant/views/electrical-switchgear.ts`                                                                                      | view                             | open or shut                                                         | open/close                           | yes            | never                                                        |
| Rotary power isolator (each machine's)           | `industrial-control/views/panel-switchgear.ts` `createPowerIsolator`, wired in `room-pipework.ts` and `cabinet-services.ts` | room                             | a quarter turn clockwise OFF to ON, and the world told               | turn by state                        | yes            | never                                                        |
| Switch-fuse handle                               | `industrial-control/views/switch-fuse.ts` `useSwitchFuse`                                                                   | view                             | up ON, down OFF                                                      | flip up / flip down                  | yes            | the door's interlock and hasp (`logic/switch-fuse.ts`)       |
| Switch-fuse door                                 | `switch-fuse.ts`                                                                                                            | view                             | open or shut                                                         | open/close                           | yes            | while ON (interlocked)                                       |
| Switch-fuse carriers                             | `switch-fuse.ts`                                                                                                            | view                             | drawn out or pushed home                                             | pull when home, push when out        | yes            | door shut                                                    |
| Trio (Dr Aqualis) touch screen                   | `plant/views/aqualis-cabinet.ts`                                                                                            | view (`CabinetHost.screenTouch`) | a touch at a pixel                                                   | touch                                | no             | `screenAimed` false                                          |
| Trio lower door and catch                        | `aqualis-cabinet.ts`                                                                                                        | kit `doorLatch`                  | open or shut                                                         | turn by state or open/close          | yes            | never                                                        |
| Trio CONTROL knob and main switch                | `aqualis-cabinet.ts`                                                                                                        | kit `selector`                   | turns                                                                | turn (already cued)                  | side           | latched, end stop                                            |
| Museum chemistry up and down keys                | `plant/views/museum-chemistry-parts.ts`                                                                                     | view                             | a step each way                                                      | push                                 | no             | at the end of its range                                      |
| Sight glasses, gauges, meters, lamps             | `plant/views/sight-glass.ts`, `pipe-sight-glass.ts` and the rest                                                            | none                             | not usable (displays)                                                | none                                 |                |                                                              |

### Industrial control, site dressing and other views

| Kind                                                 | File                                                                                                  | Wiring | What a use does                                          | Gesture                     | State decides? | Refused when                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------- | --------------------------- | -------------- | --------------------------------------- |
| Touch surfaces (the bridge, touch panels)            | `industrial-control/views/touch-surface.ts`                                                           | kit    | a touch at a pixel                                       | touch                       | no             | nothing there (the screen's own answer) |
| Backplane supply connector                           | `industrial-control/parts/machine-components.ts`                                                      | kit    | plugged or unplugged                                     | push when out, pull when in | yes            | never                                   |
| A machine component's breaker handle                 | `machine-components.ts`                                                                               | kit    | `handle.operate`                                         | flip up / flip down         | yes            | latched                                 |
| A machine module (lever or screw)                    | `machine-components.ts`                                                                               | kit    | connected or not                                         | other                       | yes            | while carried                           |
| Engineer's storage cupboard drawers                  | `site-dressing/views/engineer-storage-cupboard.ts`                                                    | view   | out or in                                                | pull when in, push when out | yes            | the doors shut (`drawersAccessible`)    |
| Engineer's storage cupboard doors                    | `engineer-storage-cupboard.ts`                                                                        | view   | open or shut                                             | open/close                  | yes            | never                                   |
| Period PC power button                               | `site-dressing/views/period-pc.ts`                                                                    | view   | power on or off                                          | push                        | no             | never                                   |
| Period PC keyboard, mouse, screen                    | `period-pc.ts`                                                                                        | view   | wakes it                                                 | other                       | no             | never                                   |
| Tractor unit cab door                                | `loading-dock/views/tractor-unit.ts`                                                                  | kit    | open or shut                                             | open/close                  | yes            | never                                   |
| Dock roller door                                     | `gallery/views/dock-door.ts`                                                                          | kit    | up or down                                               | slide up / slide down       | yes            | never                                   |
| Yard intake: meter buttons, kiosk doors and fittings | `gallery/views/yard-intake.ts`                                                                        | kit    | page the meter; open or shut                             | push; open/close            | yes            | never                                   |
| CONTROL ROOM MODE knob                               | `gallery/views/control-room-mode-knob.ts`                                                             | kit    | turns to its other position from either side             | turn by state               | yes            | latched (`locked`) (not marked today)   |
| Hand-built console knobs and buttons                 | `src/rendering/effects-console.ts`, `src/rendering/exhibit-panel.ts`                                  | view   | knobs step each way; buttons press; exhibit toggles flip | turn (side); push; flip     | side; state    | end stop                                |
| Rooms' own trial buttons and fittings                | `gallery/rooms/*.ts` (for example `co2-cage-room.ts`'s TRIAL buttons, `test-boards.ts`, museum halls) | room   | each its own                                             | mostly push                 |                | each its own                            |

### Handling (`src/toolkit/controls/input/object-handling.ts`)

| Kind                                                    | What a use does                                                 | Gesture                                                               | Refused when                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| A portable thing (a board, a capacitor, a software box) | picked up: `aimed()` is true while `canPickUp` and within 3.2 m | pick up                                                               | `canPickUp` false (not shown today: the ring simply is not amber) |
| Carrying, at a place to put it                          | put back or into a carton                                       | already cued: green ring (fits) or red × (does not), `targetFeedback` | as now                                                            |

### Counts

- **Kinds listed**: about 120 rows above, of which 9 are not usable (displays and machines with no use), so about 110 usable kinds.
- **By gesture** (roughly): push about 40; turn (side, as a knob) 12, of which 2 cued now; turn by state about 25; flip up and down about 15; pull, push or pull by side, or pull and push by state about 20 (doors, drawers, the mushroom stop, cords, chains, rack units, carriers); open/close about 15; other or touch about 15; pick up 1.
- **State-dependent gestures**: the mushroom stop, the rack unit, drawers and carriers (pull or push by state); every door (push or pull by the side the player is on); toggles (up or down, clockwise or anticlockwise, by state); the swing handle and the extinguisher (a cycle of gestures).
- **Can say red now, with no new state**: the kit's momentary buttons (power, latch), latched switches, handles, keys and selectors, end-stopped knobs, the MCU door (interlock), the access door (locked), the call point (latched), the cupboard drawers (doors shut), the switch-fuse (interlock). Most others never refuse.

## 2. How far the mission 115 mechanism stretches

### What 115 built

- `markTurnable(object, { canTurn })` (`src/toolkit/controls/input/knob-turning.ts`): puts the turnable on `object.userData.turnable` and in a module-level `Set`; returns the unmarking, pushed onto the part's disposers.
- The probe in `createFirstPerson` (`first-person.ts`, `turnableAt`): every `INSPECT_EVERY_MS` (100 ms), only while the crosshair or a free cursor is over the canvas, it raycasts the marked objects in its scene (`turnablesIn`, which walks the whole set and keeps those whose root is the scene and which are visible), then raycasts the whole scene up to that distance and accepts the knob only if the first visible mesh is the knob's own. At the centre, the room's own `aimed()` must also be true.
- The pure rule `src/toolkit/controls/logic/turn-cue.ts`: `turnSide`, `turnCue` (pointer: one direction and whether possible; pad: both) and `turnCueKey`, so the DOM is rebuilt only on change.
- The drawing: `turnArrow` and `turnCueMarkup` in `first-person.ts`, an inline SVG in `turnCueBox` above the ring; and the ring itself turns green or red under a pointer cue.

### Yes: it generalises to `markUsable`

The registry and probe know nothing about knobs except two things: `canTurn` and the projected centre. Both generalise to one question, asked of the marked object when the probe finds it: "what would a use here do, and would it work?"

```ts
// src/toolkit/controls/logic/use-cue.ts (pure: no Three.js)
export type Gesture =
  | 'turn' // ↻ or ↺
  | 'push'
  | 'pull'
  | 'flip-up'
  | 'flip-down'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'use'; // the plain ring: some other way
export interface UseAnswer {
  gesture: Gesture;
  /** For a turn: -1 anticlockwise, 1 clockwise. */
  direction?: -1 | 1;
  possible: boolean;
}

// src/toolkit/controls/input/use-marking.ts (input: Three.js allowed)
export interface UseQuery {
  /** The marked object, the world point hit, and the eye. */
  object: Object3D;
  point: Vector3;
  camera: Camera;
  /** A gamepad's use: no pointer side. */
  pad: boolean;
}
export type Usable = (at: UseQuery) => UseAnswer | null;
export function markUsable(object: Object3D, usable: Usable): () => void;
```

`markTurnable(object, { canTurn })` becomes a thin wrapper: `markUsable(object, (at) => ({ gesture: 'turn', direction: knobDirection(at.object, at.point, at.camera), possible: canTurn(direction) }))`, with the pad case giving both directions as now. A function rather than a plain record is needed because three things are only known at the moment of aiming: the side of a knob the pointer falls on, the side of a door the player stands on, and the part's state (pushed in or out, ON or OFF, latched or not). It is called only by the probe, ten times a second at most, and must be pure and cheap: it reads signals (`peek`) and does no use.

Helpers beside it, for components to build answers without each doing geometry:

- `turnAt(at, canTurn)`: the knob rule above.
- `sideOf(object, camera)`: +1 if the eye is on the object's +z side (its face), −1 behind: what every door needs to say push or pull.
- `flip(on: boolean, possible)`, `pushOrPull(isIn: boolean, possible)`: one-liners for toggles and the mushroom stop.

### How each kind supplies its gesture and whether it is possible

- **Kit parts**: `beginPart` gains `a.cue(object, usable)`, which calls `markUsable` and pushes the unmarking onto `disposers`. Each part marks the same object it puts in `uses`. Examples:
  - `pushButton`: `a.cue(view.cap, () => ({ gesture: 'push', possible: button.powered.peek() && !button.latched.peek() }))`.
  - `mushroomStop`: `a.cue(view.head, () => ({ gesture: stop.pushed.peek() ? 'pull' : 'push', possible: true }))`.
  - `disconnectHandle`: `position === 'on' || 'tripped'` gives `flip-down`, `off` gives `flip-up` (or, for `style: 'rotary'`, a turn by state); possible `!handle.latched.peek()`.
  - `rackUnit`: `pull` when in, `push` when out; possible `!out.latched.peek()`.
  - `plantRoomDoor`: `sideOf(a.object, camera) > 0 ? 'pull' : 'push'` (the hall side is +z and the leaf swings towards it).
  - `springDoor`: `sideOf(...) === opens ? 'push' : 'pull'`.
- **Views with their own `uses` map** (switch-fuse, cupboards, cabinets, the CO₂ supply, the mesh cage): they import `markUsable` and mark the same objects. They already import from the controls layer or may (the components may import controls; `layering.test.ts`).
- **Rooms' own uses**: these need marking in the room, or they fall back to the plain ring (see below).
- **The fallback**: with the crosshair at the centre, if the room's `aimed()` is true and nothing marked is found, the ring shows plain green: "use it some other way". So every use in the game gets a cue on the day the vocabulary lands, before a single part is marked; marking only makes it more specific. The fallback cannot say red, since the room does not know.

### What changes in `turn-cue.ts` and the drawing

- **Rename `turn-cue.ts` to `use-cue.ts`**, keeping `turnSide`. `turnCue` becomes `useCue(answer, pad)`: for a pointer, the answer as it is; for a pad, a turn still gives both directions (LB, RB), and every other gesture gives its one glyph labelled **A** (a push or pull has no second way to go). `turnCueKey` becomes `useCueKey`, the same idea over the new fields.
- **The drawing** in `first-person.ts` gains one SVG builder per glyph, made once as `TURN_ARROW` is, in the same style: a coloured fill with a half-pixel dark edge (`CUE_EDGE`), green `#44df70` or red `#f04b43`. Push and pull are the perspective arrow (see the sketches), which stands up and to the right of the ring, so the cue box is anchored at its lower left there rather than above the ring; flips stand beside the ring and slides above it. The plain cue draws nothing in the box; only the ring changes colour.
- **The ring's colour** follows the answer as it does for turns now: green when possible, red when not. Amber goes if the owner agrees (question 3).
- **Move the drawing out of `first-person.ts`**: it is 1848 lines; the glyphs belong in their own `input/use-cue-markup.ts`, tested for the markup's key per cue.

### Touch and gamepad

- **Gamepad**: the crosshair is at the centre, so the probe works as now. A turn shows LB and RB; everything else its one glyph with an **A** under it. No change to the scheme.
- **Touch**: no crosshair and no hover, so no cue, as 115 decided. A touch uses where the finger first lands, at once (or on a hold, `TOUCH_HOLD_DELAY`), so a cue would arrive after the use. The 115 follow-up stands: a cue from the finger's first point while it is held. Nothing in this design makes touch worse.
- **Free cursor**: the probe at the cursor works as now (3 m reach). The plain-ring fallback needs the room's `aimed()`, which only looks at the centre, so with a free cursor only marked things get a cue; the system cursor stands in for the ring there anyway.

### Performance of the probe

- **Today**: `turnablesIn` walks every marked object in every live room (the set is module-wide) and walks each one's parents to its root and to check visibility; then one raycast against the marked objects, then, if one is hit, a second against the whole scene. With only knobs marked (a few hundred) this is cheap.
- **Generalised**, the set would hold thousands of objects (128 push button sites alone, many placed many times; every door, every lever) across all live rooms, and the first raycast would hit something usable most of the time, so the second (whole-scene) raycast would run on most probes.
- **Proposal: drop the registry's walk.** Raycast the scene once, to the probe's reach, take the first visible mesh, and walk up its parents to the first `userData.usable`. That is one raycast instead of two, no per-probe walk of a global set, no leak if a part is never disposed (the mark lives on the object and goes with it), and the occlusion rule (the first visible mesh must be the thing's own) comes free. The `Set` can stay for tests and the audit, or go.
- **Cache the hit** while the camera and pointer have not moved (compare the camera's world matrix and the aim point), and re-ask only the marked object's `usable` each probe, which is cheap: a click changes state without moving the camera, and the cue must follow (red at the end stop the moment it is reached).
- **Keep 10 Hz and the gates** (pointer over the canvas, not carrying, not flying, room shown), and run dev0 and a plant room through the component benchmark before and after; if a whole-scene raycast is too dear in the biggest rooms, raycast only the room's live groups, which merged statics already reduce (`mergeTree` keeps worked objects separate, so marks survive merging; check that a mark on a group is not lost when its children are merged).

### What the kit covers with no room changes, and what needs marking by hand

- **No room changes**: every kind built on `beginPart` is marked in its own component file: the 22 usable kit kinds in `parts.ts`, the 5 other core parts, about 28 architectural, 11 fire and safety, and about 25 plant and industrial kinds whose files build their own parts. That is about 90 of the 110 usable kinds, and by placement far more than that, since push buttons, selectors, pilot lights and handles are most of what is placed in the plant rooms and the control rooms.
- **Views with their own `uses` maps** (about 12 kinds: the switch-fuse, the CO₂ supply, the mesh cage, cupboards, cabinets, the backwash pit, the switchgear doors, the leak detection drain, the period PC, museum chemistry keys): marked in the view's file, still no room change.
- **By hand, in rooms or gallery views** (about 8 kinds): the rotary power isolators wired in `room-pipework.ts` and `cabinet-services.ts`, the chain wheels (`room-pipework.ts`), the actuated valves' override buttons in `cabinet-services.ts`, the hand-built knobs and buttons of `effects-console.ts` and `exhibit-panel.ts`, and rooms' own trial buttons (`co2-cage-room.ts`, `test-boards.ts`, museum halls). Until marked, they show the plain ring.
- **Not marked though they could be in one line each**: the overload relay's dial (a `createSelector`), the CONTROL ROOM MODE knob (a `createSelector`), and the throttle valve (stepped, with ends).

## 3. The proposed design

### The cue vocabulary

All are drawn in the reticle's style: a coloured fill with a thin dark edge, green when the use will work, red when it will not. The ring is the crosshair; `( o )` below. The sketches are rough; the real glyphs follow the turn arrow's taper and head.

**Turn** (done): a curved arrow above the ring, clockwise on the right half, anticlockwise on the left. A turn by state uses the same arrow, its direction from the state, not the pointer.

```
     .-->               <--.
    (  o  )            (  o  )
  clockwise ↻        anticlockwise ↺
```

**Push** (recommended): one straight arrow in perspective, coming in from the upper right at about 45° and shrinking as it goes, so it seems to go into the screen and meet the ring far away. Its tail, nearest the player, is wide and in full colour; it narrows along its length to a small head whose point touches the ring; the far end fades a little (the turn arrow's fade, used here for distance). The head is small but still clearly an arrowhead: about 5 px across at the default scale, against the tail's 7 px.

```
                    ████
                 ████
              ███
           ██
         ▸
      ( o )

   push: near and wide at the upper right, small and far at the ring
```

**Pull**: the same arrow reversed: its tail starts thin and faint at the ring (far away), and it widens as it comes out towards the upper right, ending in a big head in full colour, near the player. It is drawn the way the turn arrow already is (a faint, thin tail growing to a big head), so the two read as one family.

```
                    ◥██
                 ███
              ██
           ▪
         ·
      ( o )

   pull: thin and faint at the ring, growing to a big head at the upper right
```

The diagonal is chosen so that neither arrow can be mistaken for a flip (flips are upright, beside the ring) or a turn (curved, above it). The arrow stands in its own place, up and to the right of the ring, and never covers it, so the ring's colour still reads. In SVG it is built once, as `TURN_ARROW` is: a quadrilateral tapering along a straight line from (30, 4) to (12, 22) in a 34 × 26 box, plus a head polygon at the far or the near end, and a linear gradient along the same line from the far end (opacity 0.35) to the near end (1).

**Flip up** and **flip down**: a straight arrow beside the ring, to its right, with a dot at its tail for the lever's pivot, so it reads as a lever thrown rather than a direction to walk.

```
   ( o )  ^             ( o )  .
          |                    |
          .                    v
      flip up              flip down
```

**Slide** (a roller door, a shutter): a straight arrow above the ring for up or down, beside it for left or right, with a bar across its tail for the runner. Nothing in the game needs left or right yet.

```
      ^                    -
      |                    |
      -                    v
   ( o )                ( o )
  slide up            slide down
```

**Some other way**: the ring alone, green (or red when a marked thing refuses).

```
   ( o )   green: use it some other way
```

**On a gamepad**: the same glyph, with the button under it: LB and RB for a turn, as now; **A** for everything else.

```
                 ████
              ███
           ▸
      ( o )
        A
```

### Alternatives for push and pull, and why the perspective arrow is recommended

- **The perspective arrow** (recommended, above): it shows depth the way the eye already reads it (big is near, small is far) and needs no learning; it is the turn arrow's own style (a tapered body, a fade, a dark edge), so the cues look like one set; and its diagonal keeps it clear of the flip and turn glyphs. Its weakness is size: the far end is small, so the push head must not shrink below about 5 px, and the taper is kept modest (7 px to 3 px of body) so the arrow still looks like an arrow and not a wedge.
- **⊗ and ⊙**, the into-page and out-of-page symbols (an arrow's tail feathers going in, its point coming out), styled to match: a filled green or red disc round the ring with a dark edge, a bold × of the same weight as the turn arrow's head for push, a bold dot for pull. Compact and precise, and an engineer will know it, but most players will not; and the × collides with the red × that already means "does not fit here" while carrying (`targetFeedback`), so a red push would look like a refused drop. Not recommended.
- **Chevrons round the ring**: four short chevrons converging on the ring for push (`> o <`, and above and below), diverging for pull (`< o >`). Easy to draw and symmetrical, but they read as "zoom in" and "zoom out" or "aim here", and do not show depth so much as direction on the screen.
- **Two or three perspective arrows converging** on the ring from different sides, for a stronger "into the screen". Clearer still, but busier than one arrow, and it covers more of what the player is looking at.

### Colour rules

- **Green**: the use will do what the glyph shows. A powered START button; an emergency stop that is out (push) or in (pull: it can always be pulled out); a disconnect handle at OFF (flip up); a drawer behind open doors (pull); any door (push or pull by side).
- **Red**: the use will be refused or do nothing. A button whose panel is unpowered or latched; a padlocked handle; a selector at its end stop; the MCU's door while its handle is ON; an access door locked; a call point already broken; a drawer while the cupboard's doors are shut; an overload relay's RESET while not tripped or still hot.
- **The plain ring**: green for anything the room says is usable but nothing has said how; red only for a marked "other" use that refuses (a hose coupled to the ISO tank's cap).
- **Carrying**: unchanged: the green ring where the part fits and the red × where it does not, and no use cue while holding.

### Which kinds get which cue now

- **Turn** (the 115 arrow): the kit's selectors and potentiometers (done); add the overload relay dial, the CONTROL ROOM MODE knob and the throttle valve (one line each), and the 115 follow-ups (dimmer, thermostat, radiator valve, dosing pump dial and bleed).
- **Turn by state**: key switches, the rotary disconnect and the rotary power isolators, quarter-turn valve levers (chemical, gas, inline, PRIME, TANK/COLUMN, butterfly), handwheels (sprinkler main, tank drain), key resets (call point, access door, fire panel, emergency lighting).
- **Push**: every momentary and latching push button, keypad and membrane key, the pilot lights' push-to-test, a mushroom stop that is out, RESET and TEST buttons, call point faces, the exit button and green release, intercom, the override buttons, the PC's power button, the sample tap.
- **Pull**: a mushroom stop that is in, pull cords (light and toilet alarm), chain wheels, the extinguisher's pin.
- **Push or pull by state**: rack units and drawers, switch-fuse carriers, the backplane connector, the swing handle's steps.
- **Push or pull by side**: every door (plant room, equipment, spring, closer, rising butt, held fire door, access door, ladder gate).
- **Flip up and down**: disconnect handles, MCB dollies, rockers (light switches, sockets, spurs, the I/O rocker, grid switches), the MCU and switch-fuse handles, the distribution board's switches, the ISO tank's levers, the CO₂ changeover lever.
- **The plain ring for now**: hinged lids and cabinet doors (open/close), card readers, fuses and capacitors replaced, touch screens, blinds, the PC's keyboard and mouse, the solenoid's manual override, the check valve's cleaning, machine modules, picking a thing up, and everything rooms wire by hand until it is marked.

### Order of work

1. **The plain ring**: amber becomes green wherever `aimed()` is true (once the owner agrees). One line in `first-person.ts`; the whole game says "usable" in the new colour at once.
2. **The pure rule**: `logic/use-cue.ts` (from `turn-cue.ts`): the gestures, `useCue` for pointer and pad, `useCueKey`. Tested.
3. **The marking**: `input/use-marking.ts` with `markUsable`, `turnAt`, `sideOf`; `markTurnable` rewritten on it; the probe changed to one scene raycast and a walk up to `userData.usable`, with the hit cached while the aim stands still. Tested.
4. **The glyphs**: the perspective push and pull arrows, flip up, flip down, slide, in `input/use-cue-markup.ts`; the cue box placed up and to the right of the ring for push and pull. Screenshots in dev0 for each, green and red, pointer and pad.
5. **The kit**: `a.cue` on `beginPart`; push buttons and their family, the mushroom stop, disconnect handles, key switch, rack unit, MCU, overload relay (and its dial), fuse and capacitors (plain).
6. **Doors** by side: plant room, equipment, spring, closer, rising butt, held fire door, access door, ladder gate.
7. **The rest of the components**: architectural, fire and safety, plant views, industrial control and site dressing, in that order, each file's parts marked where they are built.
8. **By hand**: the power isolators, chain wheels and overrides in `room-pipework.ts` and `cabinet-services.ts`, the CONTROL ROOM MODE knob, the hand-built consoles; rooms' own trial buttons last, or never (they keep the plain ring).
9. **The bench**: dev0 and the biggest plant room through the component benchmark, before and after step 3.
10. **TODO.md and the changelog**: tick off, and record what is left (touch; the plain-ring kinds that might later get a glyph of their own, such as open/close and pick up).

### Tests

- `use-cue.test.ts`: each gesture's pointer cue and key; a turn's direction from `turnSide`, centre counting as clockwise; a pad turn gives both directions and any other gesture gives one labelled A; the key changes when the gesture, direction or possibility changes and not otherwise.
- `use-marking.test.ts` (with Three.js objects, as the 115 registry's tests): marking and unmarking; the walk up from a child mesh to its marked ancestor; a hidden ancestor hides it; something in front of it hides it; `sideOf` for an eye in front and behind, and with the object turned.
- Components, each beside its logic or part: `pushButton` red unpowered and latched, green otherwise; `mushroomStop` push when out and pull when in, always green; `disconnectHandle` flip up at OFF, flip down at ON and TRIPPED, red padlocked, a turn for the rotary style; `rackUnit` pull in and push out, red latched; the MCU door red while the handle is ON; `plantRoomDoor` pull from the hall and push from the plant side; `springDoor` push or pull by side and `opens`; the overload relay's dial red at its ends.
- The probe: the answer re-asked after a use with the camera still (a selector turned to its end stop goes red at once); no cue while carrying, flying, on a ladder or with the room hidden; with a free cursor, only marked things.

## 4. Questions for the owner, to ask one at a time

1. Is one perspective arrow, coming in from the upper right and shrinking into the ring for a push, and growing out of it for a pull, the drawing you want, or would you rather have the ⊗ and ⊙ symbols?
2. Should toggles (light switches, MCBs, disconnect handles, levers) get an up or down arrow for the way they will go, or the plain green ring for now?
3. Should the amber ring you see today over anything usable become the plain green ring, so that the ring is always green (with or without an arrow) or red?
4. Should doors show push or pull by the side you are standing on (pull from the hall into a plant room, push from inside), or the plain ring?
5. For quarter-turn valves, key switches and rotary isolators, which a use throws to their other position whichever half you click: should the turn arrow show the way it will go, whichever side the pointer is on?
6. Should a button that will do nothing because it is unpowered or latched, or an overload RESET pressed before it has cooled, show red, though the button itself still clicks in?
7. Should hinged doors and lids (cabinet doors, the floor box, the Trio's lower door) get a swing arrow of their own later, or stay the plain ring?
8. Should picking a thing up get a cue of its own (a lift arrow), or the plain ring?
