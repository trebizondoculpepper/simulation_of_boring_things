# Development Diary Entry - 2026-10-22

## Context

| Time      | Branch | Commit        | Task                                                                                                                  |
| --------- | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| 07:11 UTC | main   | (this commit) | The wet hall in the world model, its booster set and mimic, the pools' bathers, and research for a richer water model |

## Problem Statement

The owner asked whether switching off the hypochlorite drives every pool's pH down, and whether switching off the mains water drains the pools. The first was only a rule with a narrow test; the second showed the model was wrong: the pool pumps depended on mains water, so cutting the mains stopped them at once and nothing ran down. The owner then asked for the wet hall to be modelled properly in the world, its machines redesigned to fit the model, and its pipes reconnected. Before the water's chemistry and biology are made richer, the owner also wanted research on existing models (chemistry after failures, and how the water looks when it goes wrong) and a count of the pools' unseen users, opening 08:00 to 21:00 with real peak times.

## Our Approach

Model first, then the machines. The wet hall became a block in the world with its own state (break tank, booster set, meter, backwash tank), stepped with the pools so the make-up the pools draw comes out of it and their backwash goes into it. The pools' pumps now need only power. The booster set's low-level trip latches until someone resets it, which gives the owner the indicator they asked for: a pump failed for want of water. Two research agents ran in the background while this was built. The bathers are a separate, seeded, saved model that nothing downstream uses yet.

## Implementation

- `src/game/plant/wet-hall.ts` (new): the break tank (13.2 m³, the sizing's), filled by the main through its float valve; the booster set (15 m³/h), sharing its rate among the pools' float valves, tripping below 15 % and resettable above 30 %; the meter; the backwash holding tank (29.5 m³) and its discharge pump to sewer; alarms. Tested in `wet-hall.test.ts`.
- `src/game/plant/pools.ts`: the pumps no longer need mains water; `stepPoolsWater` returns the make-up drawn and the backwash sent; `makeUpDemand`.
- `src/game/world.ts`: `wetHall` and `bathers`, the `plant/booster-reset` action, `WORLD_VERSION` 7 with migrations 5 and 6 (`save.ts`). A world test runs the mains off for a fortnight: break tank down, booster trips, pools' tanks run down and their pumps trip, then reset and recovery. The hypochlorite test now checks every pool, hour by hour.
- `src/game/bathers.ts` (new): bathing loads by PWTAG's rule (lounge 70, Olympic 312, jacuzzi 8 seats, footbath 6), hourly timetables for leisure, lane swimming and spa, weekday and weekend, a daily busyness, random arrivals and stays, everyone out at closing, everyone wading the footbath on the way in; a seeded generator kept in the world. Tested over a simulated week.
- The wet hall's machines: a new Grundflow booster set after the Grundfos Hydro Multi-E (`components/plant/views/booster-set.ts`, logic and tests in `logic/booster-set.ts`) with a working controller; the meter's register now counts the world's make-up; a Penfold mimic of the make-up and backwash (`gallery/logic/wet-hall-mimic.ts`, `gallery/views/wet-hall.ts`) with the booster's RESET; all bound to the world. The machines stand along the north wall in the water's order; their ports are declared (`machine-ports.ts`, with a shared `tankFrame`). The level-instruments box is gone.
- Research: `doc/research/pool-water-chemistry-and-biology.md` and `doc/research/pool-water-appearance-when-wrong.md`.

## Outcomes

- The mains-off run behaves as a real plant would, in three stages: the break tank carries the pools for some hours, the booster set trips on low water, then each pool's balance tank runs down over days until its pumps trip. Nothing empties: only evaporation and backwash take water out.
- The research found no published model of a pool going wrong, but good parts: the US EPA's MIT-licensed chloramine simulator (Jafvert and Valentine), per-bather inputs (about 80 mg nitrogen, 3 to 11 g chlorine demand, 30 litres of dilution), Chick–Watson kill rates, and ocean-colour formulas for the water's look. It also found the current pH, redox, chlorine decay and chloramine rules to be crude, and listed how.
- A simulated week of bathers gives 260 to 500 lounge visits a day and 1,800 to 2,600 Olympic, near the research's figures; the jacuzzi is often full in the evenings.
- Lesson: an experiment run before a test is written finds model errors that a test written to the model would have enshrined (the pumps' dependence on mains water).

## Afterwards: the wet hall piped

The wet hall is now piped port to port (`wetHallPipework` in `room-pipes.ts`) and is in both connection tests: the town main down in front of the break tank and over its roof by a chain-worked stop valve, the outlet to the booster set, the booster to the meter, the make-up main up into the roof, the backwash main down into the holding tank, its discharge riser over the tank's front to the sewer, and each tank's overflow and drain into the floor. The valve-reach test pushed the drain valves out past the tanks' ladders and the main's stop valve over open floor. The booster set and the wet hall mimic are also in the balance development room, running on their own.

## Afterwards: the supply from the switch room, and a main switch

The owner found the switch room's trunking far too small and asked for the supply to be seen going from the switch room everywhere, and for a master isolator that switches off the whole world. The 300 mm stubs into the nearest wall became steel trunking rising from each piece of switchgear (the board's 600 mm wide) to a 600 mm heavy-duty cable ladder at 4.4 m round the switch room, out over its door, and round the main corridor's ring under its outside walls, turning into every room's door, the wet hall's across the corridor (`cable-containment.ts`, logic and view, tested). A main incoming switch-disconnector after the ABB OT1600 (Voltara's) hangs by the switch room's door, the incoming supply rising out of the floor into it: its red-on-yellow rotary handle is bound to the world's `plant.sources.power`, with SUPPLY, ON (red) and OFF (green) lamps and a voltmeter. Off, no room has any service, every pool stops, the booster set stops; the boilers (a new `powered` input) and the air handling units (`airHouse.supply`), which keep their own state, are now bound to their rooms' supply too. Lighting and the panels' own displays do not yet go dark.

The owner then found that wall box far too small for something that switches off the whole site, and asked for the Encabulator's leftmost cabinet instead. Its separate incoming isolator turned out to be no bigger (0.70 × 1.28 m), so, asked, the owner chose the line-up's full-height MAIN INCOMING section. The main incoming switchboard is now one such section, 0.8 m wide and 2.39 m high, floor-standing on the east wall: line voltmeters, the big red handle bound to the whole site's supply, a power monitor, the lamps, a trapped-key interlock (the owner asked whether "Kirk key" was a real term: it is a trade name, Kirk Key Interlock Company's; Castell is the usual British one, so the label is generic). The incoming supply rises in 400 mm trunking out of the floor beside it and in at its foot; 600 mm trunking rises from its top to the ladder. Recorded in `doc/reuse-inventory.md`.

That was a misreading: the owner meant the Encabulator's incoming supply isolator itself, the box with the heavy-throw switch, which I had dismissed as no bigger than my wall box. It is now copied across (`incoming-isolator.ts`, with a small options argument) and stands on its posts on the east wall, its handle the whole site's supply; the cubicle is gone. Decorative trunking now runs from its side into the motor control centre beside it, as the Encabulator's fed its line-up, and from the motor control centre's top along the north wall and down into the main switchboard. Lesson: when the owner names a thing by where it is ("the leftmost box"), take them at their word rather than second-guess it on size.

## Afterwards: the Hyperplasc Scenario Simulator

The owner asked for the Encabulator's Hyperplasc Scenario Simulator in the engineer's office, its panel cleared but for FULL OFF, FULL ON and SLOW START. Copied (`scenario-simulator.ts`, its dependencies already here and identical) and placed on the office's east wall. Its switches act on the whole plant through three new world actions (`src/game/plant/startup.ts`, `WORLD_VERSION` 8): FULL OFF opens the main switch and every feeder; FULL ON closes everything, isolators too, and resets the booster set; SLOW START closes the main switch and then each room's feeder in turn, five seconds apart, supplies first, held in the world so it carries on wherever the player goes, its lamp lit until done. The owner's fiction: the simulator comes from another timeline, draws its power from branching universes, and moves its user between realities; so it is never bound to the building's supply.

The owner asked whether its door went through the wall when open. It did: hinged on the left and opening to 109°, its pull swung 0.21 m past the cabinet's side, and the cabinet stood 0.12 m from the north wall, so the open door was 10 cm into it. A test now opens the door in the built room and checks it against every wall and every other machine. At the owner's suggestion the rack cabinet's door now takes an allowed swing (`doorSwing`); the simulator's stops square, and its space on the floor allows 0.1 m on its hinge side for the pull.

## Next Steps

- Make the pools' pumps' low-low trip latch, and drive the control room's annunciator from the world.
- Feed the bathers into the water's chemistry: chlorine demand, nitrogen, particles, then urine and faecal incidents; fix the redox reading.
