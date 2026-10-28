# 107b: PLANTROOMS Hall 2, "Clean water": dev51 moved in

Status: planned 2026-10-28, not started. A sub-prompt of mission 107 (`doc/prompts/107-pool-science-museum.md`), after 107-0 (`doc/prompts/107-0-exhibit-groundwork.md`). It is the old stage 3: the ideal pool plant of mission 106 (`?room=dev51`) becomes the museum's second hall, `museum2`. It can be built before or after 107a; it only reads Hall 1's lessons, it does not need its code.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first and follow it. Then read mission 107, 107-0, 107a (`doc/prompts/107a-warm-water-heating.md`, what the visitor has just learnt) and above all mission 106 (`doc/prompts/106-ideal-pool-plant.md`), which built everything this hall shows.

## The owner's request

The owner, 2026-10-28: "Start planning out each of those rooms. And yes, reuse Dev 51 as one of the exhibit spaces in this museum." And, setting the order: "I think warmth could be the first one … All of the basic systems, warmth, filtration, and then we do chemical dosing. … And like all the other exhibits, you can reset it at the end."

## Rules for every hall (the owner, 2026-10-28)

1. **Every hall starts from its reset state the moment you step into it.** Its time is set to now, the visitor's real local time, and its exhibit is put in its reset condition. Walking in is the same as pressing its RESET button. No hall's state carries over from an earlier visit.
2. **Time.** A hall's simulated time starts at now. If the visitor speeds it up, the hall's time display follows. Halls may show time in different ways. **Hall 2 keeps dev51's:** the Poolguard pool clock high on the wall, its PLANT TIME readout, and the mimic's TIME buttons ×1, ×60, ×600 and ×3600 (a day's fouling in 24 real seconds).
3. **Halls start empty.** `museum2` begins with set decoration only; this sub-prompt moves dev51's exhibit in.

**How the rules fit dev51.** dev51 already builds a fresh state on every entry (`prepareRoom` in `src/toolkit/gallery/rooms/plant/ideal-pool-plant.ts`, `newIdealPlant(localNow())`) and sets its clock to the visitor's real local time on load and on RESET (the owner's correction in mission 106). So rule 1 and rule 2 hold as it stands; the only change is that entry is now a hand-over from Hall 1 or Hall 3 rather than a page load, and both must take the same path (107-0's reset on entry). One consequence: the heat meter's sign counted "since the demo started", from page load and on through RESET; under rule 1 it counts from the moment the visitor walked in, so its words become "Heat used since you came in" (and RESET still leaves it counting, so pressing RESET does not hide what the visitor has used).

## What the hall teaches, and what it builds on

**Assumes (from Hall 1):** a pump makes flow and a closed valve trades flow for pressure; gauges either side of a pump; a mag meter's reading; the plate heat exchanger and why the waters do not mix; an interlock (no flow, no heat); a local reset at the machine; plant time and ×3600 on the pool clock.

**Adds:**

- **Why a pool has a balance tank:** the pool overflows by gravity into it, so the surface (where the dirt floats) is always skimmed, and the tank takes up the water the swimmers displace; the pump draws from the tank.
- **Filtration:** a sand bed catches what the swimmers bring; it slowly fills; the differential pressure across it (PDI1) is the sign, and the flow falls as it clogs.
- **Backwash:** the five-valve nest worked in the right order, the flow reversed to lift and wash the bed, the sight glass going from brown to clear, then a rinse and back to service.
- **Valves can hurt the plant:** a slammed valve's surge (water hammer), and a dead-headed pump heating its own water until it trips, reset only at the pump once it has cooled.
- **Flow divides:** the exchanger's bypass and four flow meters show the flow splitting and rejoining.

**Leads on:** "The water is warm, clean and clear. But clear is not the same as safe: next, how the plant keeps it free of germs, by itself." (Hall 3.)

## Dev51's heating: keep it, re-signed (recommended)

Hall 1 now teaches heating with a real boiler, so dev51's heating (an ideal LTHW source HS1 feeding a plate exchanger HX1 on the return, the motorised interlock valve HX1-V6, the heat meter HM1 and the kettles sign) overlaps it. Three choices:

- **Keep it, re-signed (recommended).** Nothing in the model changes. Station 5's placard and the entrance panel say: "You met the exchanger in Hall 1, fed by a real boiler. Here its hot water comes from an ideal source, so this hall can concentrate on the filter. Notice where the exchanger is: after the filter, so only clean water reaches its thin plates." Reasons: dev51 is the owner's published demo, and its `dev51` link must land in a working exhibit that behaves as it did (every mission 106 reading unchanged is this hall's acceptance); its numbers are tested; the exchanger after the filter teaches something Hall 1 cannot (the order of a real plant); the interlock repeats Hall 1's lesson in a second form; and removing it would cost work, risk the tested readings and change a published demo for no gain.
- **Simplify it:** drop the heat meter sign and the primary's flow meter, keep the exchanger. Saves little; the sign is popular.
- **Move it** (take the heating out, leaving the hall purely clean water): breaks the published demo's behaviour, and Hall 1 already has the better heating exhibit.

This is question 1 for the owner.

## The schematic

Unchanged: `src/game/plant/ideal-pool-plant.ts` (`NODES`, `LINKS`, `FITTINGS`, `VALVES`, `INSTRUMENTS`, `TAGS`), as mission 106 records it: the ideal pool IP1 (470 m³) overflowing by gravity to the ideal balance tank BT1; pump P1 (Grundflow NKC 150-315) through its suction valve, non-return valve and discharge valve; the sand filter F1 (Ø2.8 m, 1 m bed, `ideal-filter.ts`, sand loss off) with its five-valve nest V1 to V5; the electromagnetic meter FT1; the split through the throttling bypass HX1-V1 and the exchanger HX1's secondary; the return to the pool; the ideal LTHW source HS1 and return HS2 through HS1-V1 and the motorised interlock valve HX1-V6; the backwash waste through tees TE3 and TE4 to the ideal drain DR1 with sight glass SG1. Instruments PI1 to PI4, PDI1, TI1 to TI5, FT1, FI2 to FI4, HM1, SG1.

**The tags follow the hall.** `ROOM_CODE` is `IPP` today; in the museum it is `M2`, so `IPP-P1-V1` becomes `M2-P1-V1` everywhere it is derived (placards, mimic, overlay), with no tag written by hand. The model keeps its code as a parameter so its tests run unchanged against either.

## The mimic

Dev51's (`IDEAL_PLANT_MIMIC` in `src/toolkit/gallery/logic/ideal-pool-plant-mimic.ts`, Penfold), unchanged but for its title ("The map: how the water is cleaned") and the derived tags; its `checkMimic` test stays.

## The museum panels (text outline)

Dev51's words (`src/toolkit/gallery/logic/ideal-pool-plant-placards.ts`), restyled to the PLANTROOMS brand (`museum-brand.ts`) and lightly edited so that Hall 1's lessons are named, not repeated:

- **Entrance panel.** Headline "Clean water". Big idea: "Swimmers bring dirt, sweat and skin with them, about three grams each an hour. The plant takes it out by passing all the water through sand, all day." Fact: "This pool's whole volume goes through the filter every two and a half hours." Route: 1 pool, 2 balance tank, 3 pump, 4 filter, 5 heat exchanger (you met it in Hall 1), 6 back to the pool, 7 backwash. RESET pedestal and sign beside it.
- **Station placards 1 to 7**, the hot-water source's and the mimic's signposts, the pool clock's and the heat-used sign: as dev51's, with "you met this in Hall 1" on the pump's and the exchanger's.
- **The activity card** keeps dev51's steps (below).

## Try it, with the expected results (all from mission 106's browser readings; the model's tests pin them)

At the normal duty (every valve open, the bypass at notch 3 of 5, heating off): FT1 184.7 m³/h (turnover 2.5 h), FI2 150.7, FI3 34.0, FI4 0; PI2 2.02 bar, PDI1 0.42 bar; 27.0 °C.

1. **Shut the filter outlet F1-V2, notch by notch:** 0.6 open: FT1 178.5, PI2 2.03; 0.4: 156.0, 2.07; 0.2: 67.0, 2.18; shut: 0, 2.21 bar, PDI1 0.
2. **Leave it shut** (dead-headed) at ×60: the pump's casing heats and it trips after about 371 plant seconds at 45 °C; START is refused; after about 152 plant seconds the casing is below 42 °C and RESET at the pump's station clears it.
3. **Let the filter foul:** ×3600 for 24 real seconds (24 plant hours): PDI1 0.42 → 0.82 bar, FT1 183 → 160 m³/h.
4. **Backwash** (pump stopped, then F1-V1 and V2 shut, V3 and V4 opened, pump started): about 196 m³/h up through the bed, BED LIFTED on the mimic, SG1 2,710 g/m³ after 12 s and 13 g/m³ after five minutes; rinse (V5) to 4 g/m³; back in service 183 m³/h and PDI1 0.42 bar. A throttled backwash (V4 at notch 1) does not lift the bed and leaves it dirty.
5. **Slam a valve with the pump running:** PI2's surge, about 2.3 bar, dying away in under a second.
6. **Heating on** (HS1-V1 open): FI4 3.07 m³/h, 181 kW; TI2 31.3 °C; the heat meter and the kettles sign count. Bypass HX1-V1 shut: FI3 = FT1 = 104.1 m³/h.
7. **RESET SIMULATION** (and walking back in): every valve to its normal notch, the pump running, a clean bed, the heating shut, ×1 at the visitor's local time, 27.0 °C.

## Moving it in

- **The exhibit, not the room.** Dev51 is an equipment room today (`startEquipmentRoom` in `src/toolkit/gallery/rooms/plant-room.ts`, loading `src/toolkit/gallery/rooms/plant/ideal-pool-plant.ts`). Refactor its room module into a museum exhibit plugged into `museum2` through 107-0's hook: its machines, pipes, mimic, lecterns, clock, signs and RESET pedestal; its own walls, floor and ceiling dropped for the hall's.
- **The fit.** Dev51's room is 18 × 13 m, 5.2 m high (`ROOM` in `src/toolkit/gallery/logic/ideal-pool-plant-layout.ts`); in today's shell `museum2` is 13.4 × 31.4 m inside, 9.5 m high; in the owner's new ring (mission 107, "The new layout": Hall 2 on the west side, between Hall 1 to the south and Hall 3 to the north, its route running north) it is one bay of the ring, its size set when the shell is rebuilt, so check the fit then, and resize the ring rather than crowd the plant. The plant, placed along dev51's north wall in the water's order, goes along one of the hall's long walls (its west, the outer wall, keeping the courtyard windows clear), turned so the water's order runs with the route; the routed pipes move with it unchanged (a rigid transform of the layout, so `ideal-pool-plant-layout.test.ts` holds). The extra length is the approach from Hall 1 (entrance panel, RESET) and the way on to Hall 3. Check the columns (`hallColumns`) and the safety layer's fittings clear the plant; move a column only through `museum-plan.ts`.
- **The link.** `?room=dev51` lands in `museum2`: an alias table in `src/toolkit/gallery/logic/dev-room-links.ts` (`resolveRoomId` today only checks `ROOMS`), tested. The dev51 room id is retired to the alias (its `DEV_ROOM_NAMES` entry kept for old links, its colour the museum's).
- **The overlay** as dev51's, with the derived `M2` tags.

## Reuses (paths checked 2026-10-28)

Everything of mission 106: `src/game/plant/ideal-pool-plant.ts`, `ideal-filter.ts`, `pump-deadhead.ts`, `five-valve-filter.ts`, `src/game/sim/hydraulics.ts`; `src/toolkit/gallery/logic/ideal-pool-plant-layout.ts`, `ideal-pool-plant-mimic.ts`, `ideal-pool-plant-placards.ts`; `src/toolkit/gallery/rooms/plant/ideal-pool-plant.ts`; `src/toolkit/gallery/views/museum-exhibit.ts`; the views `throttle-valve.ts`, `small-flowmeters.ts`, `ideal-vessel.ts`, `heat-meter.ts`, `mag-flowmeter.ts`, `pumps-plant.ts` (in `src/toolkit/components/plant/views/`), `dial-gauge.ts`, and `pool-clock.ts`.

**New:** only the exhibit refactor, the room code as a parameter, the alias, and the edited words.

## Acceptance

- Every mission 106 reading above unchanged in the hall (the model's tests unchanged, plus a test of the readings with `M2` tags).
- `?room=dev51` lands in `museum2` (tested in logic, checked in the browser).
- **Walking in from Hall 1:** through the archway from Hall 1 the hall is at its reset state, its clock at the visitor's local time; walk on into Hall 3 and back, and it is reset again; the hand-over works at both its archways with no jump.
- The overlay shows only displays; RESET as above; screenshots and camera links recorded here.

## Performance budget

Dev51 alone ran at about 97, 106 and 119 fps on high, medium and low; in the hall, with the shell and a neighbour seen through an archway, it must keep at least 60 fps on medium and 50 on high, within mission 094's `DEFAULT_BUDGET` for every component, nothing added to `KNOWN_OVER_BUDGET`; the neighbour halls' exhibits drawn at their reset state, not stepped (107-0). Draw calls measured on each preset and recorded here.

## Open questions for the owner (one at a time, in this order)

1. **Dev51's heating:** keep it as it is, re-signed as "you met this in Hall 1" (recommended), simplify it, or take it out?
2. **The dead-head trip's timing** (mission 106's open question): about six minutes dead-headed to trip and two and a half to cool, in plant time; shorter for the museum?
3. **Dev51 itself:** retired to the alias (recommended), or kept as a separate development room as well?
