# To do

The project's one to-do list (the owner, 2026-10-23): every task not yet finished, and every item for future delivery, is recorded here. Each item links the prompt that describes it, where there is one. Tick an item off when it is done, with the date and the commit; add new items as they come up.

## Now: the Olympic plant room, working (prompt 035)

The owner's priority: the Olympic is the hardest of the pools, and once it works the others follow its pattern.

- [x] **One model for the Olympic's water** ([035](doc/prompts/035-olympic-room-working.md), item 1; done 2026-10-23, `845a5ab`): the filter battery in the world; the pool's circulation and waste from its valves; every gauge, sight glass and meter reading it.
- [x] **The tank hall in the same model** ([035](doc/prompts/035-olympic-room-working.md), item 2; done 2026-10-23, `0e146c5`): the world's tank as built, its make-up OFF, AUTO or HAND, the hall and the plant room's balance tank panel bound to it.
- [ ] **The make-up's solenoid valve** in the Olympic plant room's make-up line, drawn and bound to the world's make-up (the tank hall's filler already follows it; the valve itself is not drawn).
- [ ] **The mimic wall** ([034](doc/prompts/034-olympic-mimic-wall.md)): four Penfold tiles in flow order (treatment, filter battery, circulation, electrical), each tried on dev0's boards first, then built twice, local under the plant room's east gantry and remote in the control room, both bound to the same world state (no LOCAL/REMOTE switch). The filter battery tile first. The Olympic's heat exchanger branch on the existing heating board.
- [ ] **A backwash sequence** on the filter battery's controls (with the mimic): the Olympic now backwashes only when its valves are worked, so unattended its beds foul and its circulation falls; a sequence (drain down, backwash, rinse, return to service), started by hand or on a timer, as a controller of around 2000 had, would let it look after itself.
- [ ] **The control room**, new, to take the remote copy of the mimic wall.
- [ ] **Fittings implied but not drawn:** the pumps' non-return valves; each machine's local power isolator; the busbar's fused tap-offs.
- [ ] **The chlorine and ozone gas detectors** in the Olympic plant room ([022](doc/prompts/022-component-variants-and-detectors.md)).
- [ ] **The warning signs on the tank hall doors** (risk of drowning and the rest, from the background agent's research of 2026-10-23).

## Later, not now

- [ ] **The wet hall's tanks as built** ([036](doc/prompts/036-wet-hall-tanks.md)): the break tank stays sectional GRP; the backwash holding tank and the Lounge pool's balance tank in cast concrete.
- [ ] **Sound between rooms** ([037](doc/prompts/037-sound-between-rooms.md)): a room is heard through an open door by how far it stands open (full above about 20 % open, about −20 dB at 5 %, silent and its sounds stopped when shut), not by which room the player is in.
- [ ] **Noclip, a free camera** ([038](doc/prompts/038-noclip-camera.md)): toggled on the escape screen; flying freely in three directions (Space up, Shift down, Ctrl faster, as Minecraft's), through everything in the room but kept within its walls, floor and ceiling; with a readout of the camera's place and a way to copy its address, to set up the shots for the title's attract sequence.
- [ ] **The other pools on the Olympic's pattern:** each pool's circulation, filters and balance tank driven by its own plant's valves and model, as the Olympic's now are, once the Olympic works.

## Test scenarios ([scenarios](doc/prompts/scenarios.md))

- [ ] **5. Chemical dosing with a measurement loop** ([028](doc/prompts/028-scenario-chemical-dosing.md)): not started.
- [ ] **6. Gas leak and detection** ([023](doc/prompts/023-gas-leaks.md)): its "still to do" list: the vent and detector views, a dev room, room air in the world state, the alarms to the control room's annunciator and the fans' purge, other disasters on the same air.
- [ ] **7. Power distribution** ([030](doc/prompts/030-scenario-power-distribution.md)): not started.
- [ ] **8. A small pool loop end to end** ([031](doc/prompts/031-scenario-pool-loop.md)): not started.

## Wiring the plant rooms' machines to the world

- [ ] **The machines still to wire** (`UNWIRED` in `src/toolkit/gallery/logic/world-bindings.ts`, which the tests let only shrink): among them the BMS outstation, the calorifier, the central battery (emergency lighting, [011](doc/prompts/011-emergency-lighting.md)), the contact tank, the distribution boards, the fire repeater, the MCC, the pressurisation unit and the rotary isolators.

## The operator's manual

- [ ] **Finish the operator's manual** ([005](doc/prompts/005-finish-operators-manual.md)): its phases 3 to 6, a chapter for each remaining room in the boiler house's pattern, the schematics and their symbols, and the alarm response for every annunciator window (only the boiler house's chapter is written so far).

## Housekeeping

- [ ] **The diary entry for 2026-10-23** (`diary/`): the Olympic plant room's redo, the tank hall, the solenoid valves, the five-valve battery, the world's battery and tank, the water effects.
- [ ] **The room-name overlay after a hand-over through a door:** check it updates (it did when walking into the tank hall on 2026-10-23).
- [ ] **The stray `retired0` git tag:** a non-release tag made on 2026-10-23, harmless to CI; remove it if the owner wishes.
