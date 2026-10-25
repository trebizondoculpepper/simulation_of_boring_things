# Development Diary Entry - 2026-10-22

## Context

- **Date**: 2026-10-22 01:00 UTC
- **Branch**: main
- **Commit**: after 9543847
- **Contributors**: Claude Code + User, and a second session working on room services, tees and the boiler house in the same checkout

## Problem Statement

The owner wanted every room's machines placed, with room to walk to and reach them all. Then they wanted the rooms piped and wired, starting with the simplest (the footbath and jacuzzi plant rooms) and working up to the Olympic plant room, the most complex in the game. The rules were that pipes may vanish into the floor or ceiling, and drains into a super-sewer. They also asked an experiment: shut off the water supply, and do the pools drain?

## Our Approach

- **Placing machines:** the layout is pure logic (`room-equipment.ts`). Most rooms pack their machines against walls, west wall first; the Olympic and footbath rooms are laid out by hand. Tests walk a 10 cm grid at a walker's width from the door to the front of every machine, panel, valve and isolator.
- **Ports:** machines show ports, not pipework. `machine-ports.ts` is the one source of truth, and the nozzles are drawn from it. Routing belongs to the room (`room-pipes.ts`, `cabinet-pipes.ts`), port to port, each service at its own height.
- **Clash tests:** tests check that runs are square, that no run meets another but at its tees, that none passes through a machine or a doorway below its head, and that the north and south rule holds. Clashes the tests missed were found in the owner's renders, and each became a test.

## Implementation

- **Machines in every room:**
  - the development rooms' working models where they fit;
  - a tank helper drawing real GRP sectional tanks at any panel count, and upright vessels;
  - a placeholder helper for anything without a model yet.
- **Rooms resized:**
  - the Olympic balance tank is taller and smaller in plan;
  - the large and medium plant rooms are 8 m tall;
  - the acid store is 5 × 5 m.
- **Cabinet rooms:**
  - the spa's water goes north; lagged heating and the supply come from the south;
  - the drain falls into a tundish on a floor gully;
  - a working isolator on the wall interlocks the cabinet's power;
  - fire collars or sleeves at every wall crossing, and BS 1710 bands and labels on every run.
- **Olympic room:** the whole water loop is piped.
  - suction from the tank's floor through a duct to the pumps' suction header; the pumps' discharge header;
  - the filter battery's inlet and outlet headers, branches and valves, with chain wheels on the out-of-reach inlet valves, and backwash into grated floor channels;
  - then the heat exchanger, the ozone contact tank, the UV and the return north;
  - heating, make-up, dosing and chemical supplies from the stores;
  - isolators on stands for the pumps, UV and ozone;
  - the tank's drain.
- **Pipe helpers:** pipe markings (`pipe-markers.ts`) and supports (`pipe-supports.ts`): hangers overhead, stands low down.
- **Switch room:** its switchgear stands flush to the walls, with 300 mm trunking into the walls.
- **The experiment** is a tested water-balance model (`src/game/water/water-balance.ts`).

## Outcomes

- **The experiment.** With the make-up shut off, the Olympic balance tank falls about 29 m³ a day, and the pumps trip on day 4. The main drains then run on into the tank by gravity and it overflows to waste. After 60 days the pool is 376 mm below its lip, and from then on it falls only by evaporation, about 3 mm a day.
- **Bugs the tests caught:**
  - a rounding error that sent filter branches sideways;
  - port data that ignored the exhibits' shifts (UV, heat exchanger, pumps);
  - nozzles floating off the curved shell;
  - a tank suction port in mid-air;
  - an isolator inside a wall.
- **Working with two sessions.** They collided several times on the same files. Reading each file immediately before editing it, and dividing the work, kept either from losing the other's.

## Next Steps

- Isolators to switch their machines through the services model's feeders.
- Tees drawn as tees once the pipe helper has them.
- The lounge plant room laid out by hand and piped like the Olympic.
- The water balance in the world state, so the make-up valve in the wet hall drives it.
- The independent review, `doc/prompts/done/004-machine-ports-check.md`.

## Later the same day: every port connected, checked

- **Everything connected to everything.** `port-connections.test.ts` takes every port of every machine in the four piped pool plant rooms (95 of them) and checks that some run ends exactly on it, of the right kind of pipe for its service, leaving within 5° of the port's direction. Unpiped rooms' ports are listed rather than failed: only the wet hall's two tanks remain.
- **Visual compliance.** `views/visual-connections.test.ts` builds each piped room's Three.js scene and probes just outside each port for a drawn pipe, conduit or duct, and just inside it for the machine's nozzle. It found the lounge tank's suction drawn with no pipe.
- **The lounge plant room** is now laid out by hand and routed by the same router as the Olympic (`poolPlantPipework`), with its own isolators (P-201A/B, lounge UV and ozone) in the world state. The room-services lounge routing is retired.
- **Isolators** in the rooms and on the cabinets now dispatch to the world and follow it.
- **Water model** sub-steps are now 5 s. A small pool's level settles on its weir in seconds, though it takes most of an hour to fill.

The next steps are:

- chemical stocks that run out (hypochlorite and acid), with pH falling when acid is dosed without hypochlorite;
- fixed values for what is taken as reliable (three-phase supply, gas pressure).

Biology waits on research, which is in hand.

## Later still: the switch room and the boiler house

- **Switch room cabinets** are working parts now:
  - the switchboard's breakers are red-and-yellow rotary handles, and its meters read the ways switched on;
  - the motor control centre has isolators, HAND-OFF-AUTO, START, STOP and RESET, pilot lights and emergency stops, with starter logic in `electrical-room.ts`;
  - the central battery has pilot lights, test buttons and a 20 × 4 LCD.
- **Labels** now name the plant we have: P-101A/B on the drives, P-201A/B, P-501A/B and the make-up booster on the starters, and the building's own boards on the switchboard's ways. Boilers are tagged B-501 to B-506 across the three cascades.
- **LCDs** draw a real 5 × 7 dot font (`font-5x7.ts`, after the HD44780's character set), as does the ozone generator's message display.
- **Boiler house:** one flue per cascade, straight up through the roof; a gas header from the gas train, with a ball valve on each boiler's drop. These are in the port-connection and visual checks, with `boiler-pipes.test.ts`.

Next: the boilers' flow and return to the low-loss header, and the rest of the boiler house; the engineers' office door into the viewing gallery.

## The boiler house's heating, the review's fixes, and chemical stocks

- **The boilers' green connectors** (LTHW flow and return) were drawn by the boiler model but never declared as ports, so no test knew of them. A new visual test finds every connector a model draws (each mesh named "… port") and requires a declared port on it; it caught all twelve at once.
- **The boiler house's heating** is now piped:
  - flow and return headers behind the boilers, to the low-loss header;
  - its system side over the doorway to the twin-head circulator;
  - a tee taking the flow out through the south wall to the building and north to the calorifier's coil;
  - the return main, joined by the building's return and the pressurisation fill;
  - the calorifier's cold feed, hot water and secondary return to the services ceiling.
- **The combustion and ventilation panel** moved to the east wall, right of the boiler mimic.
- **Fixes from the independent review:**
  - each filter's inlet valve now sits on the drop above the backwash tee, so backwashing one filter cannot drain the inlet header;
  - the Olympic contact tank's nozzles sit on its round shell;
  - the development room's sand filters have their face pipework and working valves back, generated from their ports.
- **Chemical stocks** (`src/game/plant/chemicals.ts`) are world state (version 5):
  - 12,000 l of hypochlorite and a 1,000 l acid IBC, drawn down by each pool's dosing;
  - a dry store stops that chemical's dosing;
  - pH heads for 7.4 with both chemicals, falls with acid alone and rises with hypochlorite alone;
  - a delivery action refills a store.
- **Fixed supplies** (`SUPPLIES`): 400 V three-phase at 50 Hz, and gas at 21 mbar.

## Overnight: valves within reach, the air plant, the boiler controller and the switchboard

- **Every valve reachable.** A test now requires every valve to be within an arm's reach (0.8 m in plan) of somewhere to stand. The filters' drain valves moved onto their drops; the balance tanks' drains run out beyond their ladders before dropping, their valves on the drop.
- **The air plant** is rebuilt round the real Dantherm DanX XWPS range (its data sheet's sizes: 2/4 to 16/32).
  - The largest unit stacked is the 9/18, so the Olympic hall takes nine and the sizing's largest unit is now 20,000 m³/h.
  - The units are working machines: dampers, fans, a heat pump on humidity, and filters that load and trip, each with its controller.
  - The Olympic's stand three high under two gantries and a stair, in a room made 10 m tall. The walker passes under a gantry or walks on it, by the height it came from, and handrails stop only those up on it.
  - Every duct leaves a unit's end and turns into the wall behind, so none crosses another.
  - Merging each unit's still parts was needed for the room to draw at all in the headless renderer.
- **The air plant's mimic and control panel** by the door shows every unit's lamps and each hall's air. Each hall's OCCUPIED and UNOCCUPIED buttons are its time programme, which the units follow in AUTO.
- **The boiler controller**: − and + now set the flow temperature from any display, and a FLOW °C knob does the same; the two agree, as one setpoint.
- **The switchboard's breakers** are bound to the world's feeders (`switch-room.ts`): switching DB-OLYMPIC off cuts the Olympic plant room's power, and so its pumps.
