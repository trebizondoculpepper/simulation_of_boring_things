# To do

The project's one to-do list (the owner, 2026-10-23): every task not yet finished, and every item for future delivery, is recorded here. Each item links the prompt that describes it, where there is one. Tick an item off when it is done, with the date and the commit; add new items as they come up, each under the section of its kind.

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

Sorted by kind (the owner, 2026-10-23): gameplay, architecture, lighting, and the plant.

### Performance

- [ ] **Incremental room preparation:** nearest-door prefetch now imports code only, because speculative synchronous scene construction and first-frame effects caused pauses during play. Split expensive builders into bounded jobs (moving pure layout work to workers where useful), make GPU upload/effect preparation incremental, and measure frame gaps before restoring background scene preparation. Also reduce Olympic static draw calls and profile the ozone-generator view factory. Measurements, priorities and acceptance checks: [plant-room loading report, 2026-10-24](doc/reports/plant-room-load-performance-2026-10-24.md).

### Gameplay features

- [ ] **Other music zones:** independent music for the lazy pool and footbath, with the Olympic pool initially silent. The reusable source/amplifier components and four-zone model exist; only the jacuzzi has tracks and an installed cabinet so far. Assign other zones their own programmes without reusing the jacuzzi's owner-supplied tracks.
- [ ] **Sound between rooms** ([037](doc/prompts/037-sound-between-rooms.md)): a room is heard through an open door by how far it stands open (full above about 20 % open, about −20 dB at 5 %, silent and its sounds stopped when shut), not by which room the player is in.
- [ ] **Noclip, a free camera** ([038](doc/prompts/038-noclip-camera.md)): toggled on the escape screen; flying freely in three directions (Space up, Shift down, Ctrl faster, as Minecraft's), through everything in the room but kept within its walls, floor and ceiling; with a readout of the camera's place and a way to copy its address, to set up the shots for the title's attract sequence.

### Architectural features

- [ ] **The reception, the changing village and the showers, put back as new sections** (the owner, 2026-10-23), with the reception's **speed gates** ([039](doc/prompts/039-reception-speed-gates.md), reference photographs in `doc/research/reception-turnstiles/`): glass swing-wing turnstiles, free-flow, opening as the walker passes through; their appearance and their motion modelled in a dev room first.
- [ ] **A ceiling dome CCTV camera** (seen beside the halo panel in `doc/research/lighting/01-direct-indirect-halo-panel.jpg`; [040](doc/prompts/040-direct-indirect-panel.md)): a possible later item, under a fictional maker.

### Lighting features

- [x] **Dev30, lighting styles** (done 2026-10-23): a dev room of six booths, each lit one way: the halo panel, cove lighting, wall grazing, a shadow-gap slot, a fibre-optic starlight ceiling and a luminous ceiling. Its second six (2026-10-23): downlights and wall-washers, globe pendants, up/down wall cylinders, tile lights and bulkheads on a tiled wall, neon and a curved grazer on a curved tiled wall, curved sconces on a round column. Next for it: more styles, and fitting the chosen ones to the rooms.
- [ ] **A direct/indirect "halo" ceiling panel** ([040](doc/prompts/040-direct-indirect-panel.md), photograph in `doc/research/lighting/`): a suspended LED panel lighting the room through its diffuser and washing the ceiling round it, for the modern public spaces.

### Plant features

- [ ] **The wet hall's tanks as built** ([036](doc/prompts/036-wet-hall-tanks.md)): the break tank stays sectional GRP; the backwash holding tank and the Lounge pool's balance tank in cast concrete.
- [ ] **The foot spa cabinet's pump protection and gravity drain** (the owner, 2026-10-23; after the other editor's uncommitted `pools.ts`/`world.ts`/`spa-pack.ts` work lands): its feeder (PL4-PW1-IV2, on the overflow from the spa) read by the water model; the pump trips on dry running within seconds of the feeder shutting, or when pumping the bath empty, and the trip latches (the low-level trip too, which now clears itself) until a RESET on the cabinet panel, beside a PUMP TRIP lamp, clears it once its cause has gone. The drain-down runs by gravity (the plant floor 3.5 m below the deck) whenever the feeder and drain valve are open and there is water, pump or no pump, faster when pumped with the return shut; the drain gurgle (`footbathDischarging`) follows that, with no pump in its condition.
- [ ] **The other pools on the Olympic's pattern:** each pool's circulation, filters and balance tank driven by its own plant's valves and model, as the Olympic's now are, once the Olympic works.

## Test scenarios ([scenarios](doc/prompts/scenarios.md))

- [ ] **5. Chemical dosing with a measurement loop** ([028](doc/prompts/028-scenario-chemical-dosing.md)): not started.
- [ ] **6. Gas leak and detection** ([023](doc/prompts/023-gas-leaks.md)): its "still to do" list: the vent and detector views, a dev room, room air in the world state, the alarms to the control room's annunciator and the fans' purge, other disasters on the same air.
- [ ] **7. Power distribution** ([030](doc/prompts/030-scenario-power-distribution.md)): not started.
- [ ] **8. A small pool loop end to end** ([031](doc/prompts/031-scenario-pool-loop.md)): not started.

## Wiring the plant rooms' machines to the world

- [ ] **The Olympic's busbar by the pipe helper, and its tap-offs drawn** (the owner, 2026-10-24: busbars always by the plumber and pipe helper, every part a component): its busbar ring is laid by a hand-written rule and drawn as containment, and its fused tap-offs exist only in its plumbing logic and plan; lay it as `busbar-trunking` and hang a tap-off unit (`createBusbarTapOff`, fused and pole-worked) at each drop, each switching its machine's supply in the world.
- [ ] **Fully operational: the wiring audit's work** ([audit](doc/reports/wiring-audit-2026-10-24.md), the owner, 2026-10-24), in this order:
  - [ ] **The wiring register made true, and quick fixes** ([045](doc/prompts/045-wiring-register-and-quick-fixes.md)): the register's false `world` entries corrected; the Olympic balance tank panel's START/STOP to the starters; the Olympic's UV and ozone isolators drawn; the poolside sign, the lounge's dosing tags, the pump gauges, the air mimic's lamps, the readout amps and the desk's labels from the world.
  - [ ] **The boiler house in the world** ([046](doc/prompts/046-boiler-house-in-the-world.md)): its boilers, gas safety, combustion and pressure saved and run in the world; the pools' and halls' heat from the boilers actually firing; the circulator on starters; the heating mimics from it.
  - [ ] **Ozone and UV treatment in the world** ([047](doc/prompts/047-water-treatment-in-the-world.md)): the ozone plant out of its view; a pool's water treated by what actually runs.
  - [ ] **The spa cabinets and the jacuzzi in the world** ([048](doc/prompts/048-spas-in-the-world.md)): the jacuzzi's POWER, JETS and AIR, both cabinets on their room's power, their readouts from the world, the hall's tub on pool_03.
  - [ ] **Every installed valve does something** ([049](doc/prompts/049-every-valve-does-something.md)): the wet hall's, the jacuzzi's, the footbath's and the Olympic's dead valves read by their flow models; the lounge's filters on the Olympic's pattern.
  - [ ] **The control room, fully live** ([050](doc/prompts/050-control-room-fully-live.md)): every pool on its boards; every annunciator window fed; its acknowledgements and printer in the world; the BMS and CCTV real or retired.
  - [ ] **The utility flags retired** ([051](doc/prompts/051-utility-flags-retired.md)): heat, air and chemicals from the machines; the extract fans and valve actuators on what drives them; chemical deliveries; each tank its own level.
  - [ ] **Emergency power** ([052](doc/prompts/052-emergency-power.md)): the central battery in the world, emergency light fittings, a hired generator.
  - [ ] **A fire alarm system** ([053](doc/prompts/053-fire-alarm.md)): panel, detectors, call points, sounders, the repeater and its interfaces.
- [x] **The switch room, only what works** ([043](doc/prompts/043-switch-room-tidy.md), the owner, 2026-10-24): stage one of its redesign: remove the motor control centre, the sample rotary isolators and the spare distribution board, none wired to the world; rename the switchboard's "MCC-1" way to the wet hall it feeds; re-route the trunking from the main switch straight to the switchboard. Done 2026-10-24, d7190c4.
- [ ] **Motor panels in the plant rooms** ([044](doc/prompts/044-plant-room-motor-panels.md), the owner, 2026-10-24): stage two: a starter per motor in the world (isolator, HAND-OFF-AUTO, START/STOP, trip and RESET, current), the pool model's pumps following them, and a motor panel in each plant room to work them, room by room; the rebuilt control room to drive the same starters later. Begun 2026-10-24: the Olympic's and the lounge's circulation pumps, on their existing local panels; the boiler house's, the wet hall's and the spas' to come (see the prompt's progress).
- [ ] **The machines still to wire** (`UNWIRED` in `src/toolkit/gallery/logic/world-bindings.ts`, which the tests let only shrink): among them the BMS outstation, the calorifier, the central battery (emergency lighting, [011](doc/prompts/011-emergency-lighting.md)), the contact tank, the distribution boards, the fire repeater, the MCC, the pressurisation unit and the rotary isolators.

## The operator's manual

- [ ] **Finish the operator's manual** ([005](doc/prompts/005-finish-operators-manual.md)): its phases 3 to 6, a chapter for each remaining room in the boiler house's pattern, the schematics and their symbols, and the alarm response for every annunciator window (only the boiler house's chapter is written so far).

## Housekeeping

- [ ] **How to make the world model faster, an investigation** ([042](doc/prompts/042-world-model-speed-investigation.md), the owner, 2026-10-24): experiments, not delivery: measure a world step (about 25 µs today, 45 % of it finding the foot spa's valves by tag) and an hour's catch-up (about 0.8 s), try resolving addresses once, caching flow solutions by line-up, event-driven catch-up, a compiled numerical form and a worker, and report which steps give the most benefit for their cost.
- [ ] **The diary entry for 2026-10-23** (`diary/`): the Olympic plant room's redo, the tank hall, the solenoid valves, the five-valve battery, the world's battery and tank, the water effects.
- [ ] **The room-name overlay after a hand-over through a door:** check it updates (it did when walking into the tank hall on 2026-10-23).
- [ ] **The stray `retired0` git tag:** a non-release tag made on 2026-10-23, harmless to CI; remove it if the owner wishes.
