# The museum's words: PLANTROOMS at The Dyehouse

This file holds every piece of text a visitor can read or hear in the museum (rooms `museum0` to `museum9`), gathered in one place so the owner can edit and rewrite it. It was extracted from the code on 2026-10-28. It is a copy, not the source: the game still reads its words from the code, so every entry names its source (`path:line` and the identifier or field), and an edit made here has to be carried back to that place by hand.

How to read it:

- Paths are relative to `src/` unless they start with `doc/` or `resources/`. A line number points at the start of the entry (its object, its `station:` line or its `fillText` call).
- Text is given exactly as it is in the code, curly quotes included. Where a value is worked out by the code (a tag, a number from the model, a template), the text is shown as it renders today, and the template is named in brackets. Tags such as `M1-B1`, `FQ1` or `P2-V2` are derived from the model and must not be rewritten by hand: change the wording round them.
- Placards on lecterns (`createLectern`, `toolkit/gallery/views/museum-exhibit.ts:162`, `paintPlacard`) always print, in this order: the station number, the **Headline**, the **Title** (machine name and tag), **Joins** (Hall 2 only, with a full stop added), the **Body**, then `Did you know? ` followed by the **Fact**, and a box headed `TRY IT` holding the **Try it** text.
- Entrance panels (`paintEntrance`, `toolkit/gallery/views/museum-exhibit.ts:289`) print a small heading, the **Title**, the **Subtitle**, the **Introduction**, the fixed heading `FOLLOW THE WATER` (in every hall, even where nothing flows), the route (station number, name, and what it is), and the **Reset** line in a red strip.
- Left out: pure equipment tags and numeric readouts, maker's badges on equipment, and the hover names and status lines of the inspect overlay (`markComponent` `name` and `status`), which describe a part rather than tell the visitor anything. See the gaps listed at the end.

## Hall 0: Welcome

Hall 0 is the tiled welcome hall with a painted pool, where every visit starts and ends.

### Title wall (south wall)

Source: `toolkit/gallery/views/museum-hall.ts:1073` (`paintTitleWall`); brand words from `toolkit/gallery/logic/museum-brand.ts:47` (`MUSEUM_EXHIBITION`) and `toolkit/components/core/logic/brands.ts:529` (`plantrooms`)

- Wordmark (one letter to a tile): PLANTROOMS (`brands.ts` `wordmark`)
- Strapline: The real backrooms of the Poolrooms (`brands.ts` `tagline`)
- Tagline and hashtag: Can YOU find the plant room? #FindThePlantRoom (`MUSEUM_EXHIBITION.tagline`, `.hashtag`)
- Paragraph 1 (`museum-hall.ts:1090`): There is almost nothing we take for granted more than a swimming pool. Its user interface is the simplest there could be: dive in, and the water is simply there, clean, clear and warm.
- Paragraph 2 (`museum-hall.ts:1091`): Behind the tiles lives a world of complexity: pumps, filters, boilers and careful chemistry, working all day and all night to keep it that simple. Come and see it.
- Footer, left (`MUSEUM_EXHIBITION.museum`, `.museumLine`, upper-cased): THE DYEHOUSE · MUSEUM OF SCIENCE AND WORK
- Footer, right (`MUSEUM_EXHIBITION.wink`): Unlike the Poolrooms, every room here is real, and every machine in it works.

### Banners (two, hung from the ceiling near the title wall)

Source: `toolkit/gallery/views/museum-hall.ts:1176` (`paintBanner`)

- Running up the banner: PLANTROOMS
- At its foot: #FindThePlantRoom

### Welcome panel (free-standing, by the doorway into Hall 1)

Source: `toolkit/gallery/views/museum-hall.ts:1111` (`paintWelcome`); words from `toolkit/gallery/logic/museum-plan.ts:321` (`HALL_BRIEFS.museum0`)

- Heading: Welcome
- Under it: PLANTROOMS · How a swimming pool really works (`MUSEUM_EXHIBITION.name` · `.subtitle`)
- Body (`willShow`): Nothing we take for granted more than a swimming pool: its user interface is the simplest there could be. Dive in, and the water is simply there, clean, clear and warm. Behind the tiles lives a world of pumps, filters, boilers and chemistry, working all day and all night so that it stays that simple.
- Box heading: THE BIG IDEA
- Big idea (`bigIdea`): The simplest thing in the world, diving in, takes a world of engineering to make.
- List heading: TRY THIS FIRST
- Try 1 (`tryIt[0]`): Look for the water in this room. (There is none: it is paint.)
- Try 2 (`tryIt[1]`): Follow the arrows north through the doorway and find out what is behind the tiles.
- Route heading (`museum-hall.ts:1168`): THE ROUTE: FIVE HALLS ROUND THE COURTYARD, AND BACK HERE
- Route strip (`routeStrip`, `museum-hall.ts:848`): the nine halls as numbered discs, titled only where the hall has a theme: 1 Warm water, 2 Clean water, 3 Safe water, 4 The chemistry of pools, 5, 6, 7, 8 (numbers only), 9 The whole plant.

Subject line, used on the doorway sign back into Hall 0 (`HALL_BRIEFS.museum0.subject`): Behind the tiles

### Signs over Hall 0's doorways

Source: `toolkit/gallery/views/museum-hall.ts:977` (`paintArchHeader`)

| Doorway           | Small line          | Title                   | Under it                  |
| ----------------- | ------------------- | ----------------------- | ------------------------- |
| On, into Hall 1   | THROUGH HERE        | What’s behind the tiles | 1 · Warm water            |
| Back, into Hall 9 | THE ROUTE ENDS HERE | The whole plant         | Control and fault finding |

### Hall 0's notices (safety and visitor information)

Source: `toolkit/gallery/views/museum-safety.ts` (each `case`), placed by `toolkit/gallery/logic/museum-safety.ts:472` to `:509`

| Item                             | Source                                                                               | Text                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Way-finding sign, by the doorway | `museum-safety.ts:349` (`wayfinding`)                                                | ← Way out, stairs to the ground floor / ← Toilets, accessible toilet, baby change / ← Cloakroom, café and shop: ground floor / → The exhibition: PLANTROOMS |
| Occupancy notice                 | `museum-safety.ts:370` (`occupancy`)                                                 | NOTICE / Maximum occupancy / of these galleries: / 150 people                                                                                               |
| CCTV notice                      | `museum-safety.ts:303` (`cctv-notice`)                                               | Images are being / recorded / for the safety of visitors / and staff and the prevention / of crime. This scheme is / controlled by The Dyehouse.            |
| Hearing loop sign                | `museum-safety.ts:332` (`hearing-loop`)                                              | T / Hearing loop / Switch to T                                                                                                                              |
| Defibrillator cabinet            | `museum-safety.ts:254` (`aed`)                                                       | AED (above), Defibrillator (below)                                                                                                                          |
| First-aid sign                   | `toolkit/components/general-safety/views/escape-signs.ts:166` (`createFirstAidSign`) | First aid                                                                                                                                                   |
| Fire exit door, on its leaf      | `museum-safety.ts:387` (`fire-exit-door`)                                            | FIRE EXIT / KEEP CLEAR                                                                                                                                      |
| Fire exit door's push bar        | `toolkit/components/fire/views/detection-and-exits.ts:135`                           | PUSH BAR / TO OPEN                                                                                                                                          |
| Fire door sign on the leaf       | `escape-signs.ts:150` (`createFireDoorSign`)                                         | FIRE DOOR / KEEP SHUT                                                                                                                                       |
| Sign beside the fire exit        | `museum-safety.ts:401` (`ground-floor-sign`)                                         | EXIT / ↓ / Ground floor                                                                                                                                     |

## Hall 1: Warm water

Hall 1's exhibit is installed (`toolkit/gallery/rooms/museum/hall-1-warm-water.ts`).

### Title on the street wall

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); words from `toolkit/gallery/logic/museum-plan.ts:336` (`HALL_BRIEFS.museum1`)

- Number: 1
- Title: Warm water
- Subject: Heating, energy and a first pump
- Footer: PLANTROOMS · How a swimming pool really works

The brief's other fields (`bigIdea`, `willShow`, `tryIt`, `museum-plan.ts:342` to `:349`) are shown only while a hall has no exhibit, so Hall 1's are not seen. They are: Big idea: To warm a pool we must move its water: a pump carries it through a heat exchanger, where a boiler’s heat passes into it without the two waters ever mixing. Will show: A real gas boiler and a heat exchanger connected to an ideal pool, with one pump to move the water, and the thermometers that show the heat going in. Try: Turn the heating on and watch the pool warm, a fraction of a degree at a time. / Stop the pump and see the heat stop reaching the pool. / Change the setpoint and watch the boiler answer.

### Entrance panel

Source: `toolkit/gallery/logic/museum-1-placards.ts:145` (`hall1Entrance`); drawn at `toolkit/gallery/rooms/museum/hall-1-warm-water.ts:864` with the heading `Hall 1 · Warm water`

- Title: Warm water
- Subtitle: Hall 1: heating, energy and a first pump
- Introduction: A pool is a huge bath that is always going cold. Heating it is a chain: gas burns, hot water carries the heat, and an exchanger hands it to the pool without the waters ever mixing. To warm this pool by one degree takes 547 kWh: about 3,250 kettles. Everything here works: every valve, switch and dial is yours to try. (547 and 3,250 computed by `hall1Facts()`: `kWhPerK` and kettles rounded to the nearest 50.)
- Route (from the placards: headline, then the machine's name): 1 The gas, Ideal gas main · 2 The boiler, Condensing boiler · 3 The exchanger, Plate heat exchanger · 4 The pump, Pool pump · 5 The pool, Ideal pool · 6 Where the heat goes, The pool’s heat balance · 7 The gas it burns, Gas burnt now
- Reset: Can’t break it: the big red RESET SIMULATION button puts everything back to the start.

### RESET sign (beside the RESET pedestal)

Source: `toolkit/gallery/logic/ideal-pool-plant-placards.ts:273` (`RESET_SIGN`), drawn at `hall-1-warm-water.ts:873`; the same sign stands in Halls 1 to 6

- Headline: Don’t worry, you can’t break anything!
- Body: This is a simulation. If you get the plant into a muddle, press this button and everything goes back to the start.

### Placard 1: The gas

Source: `toolkit/gallery/logic/museum-1-placards.ts:69` (`hall1Placards`, station 1)

- Headline: The gas
- Title: Ideal gas main · M1-GS1
- Body: Gas from the street, counted by the meter FQ1. The yellow lever GS1-V1 is the emergency control valve: one quarter-turn shuts off the whole building. The gauge PI3 shows the gas’s pressure, in millibars.
- Fact: A cubic metre of natural gas holds about 10.6 kWh of energy. (10.6 from `GAS_ENERGY`)
- Try it: Watch the meter’s red drums speed up when the boiler fires.

### Placard 2: The boiler

Source: `toolkit/gallery/logic/museum-1-placards.ts:79` (station 2)

- Headline: The boiler
- Title: Condensing boiler · M1-B1
- Body: A flame heats water to about 73 °C, and the flue takes the burnt gases up through the roof. The boiler will not fire unless the pool’s water is flowing, and if its flame fails it locks itself out until someone presses RESET on the boiler itself. (73 °C computed: the boiler's flow temperature after an hour)
- Fact: A condensing boiler is about 95 % efficient: it even recovers the heat in the steam of its own flue gases. (95 from `BOILER_EFFICIENCY`)
- Try it: Shut the gas cock B1-V1 while the boiler fires: watch it lock out. Open the cock and press RESET on the boiler.

### Placard 3: The exchanger

Source: `toolkit/gallery/logic/museum-1-placards.ts:89` (station 3)

- Headline: The exchanger
- Title: Plate heat exchanger · M1-HX1
- Body: Two waters, one hot and one cool, pass each other through thin steel plates. The heat crosses; the water never does. The boiler’s water goes round its own sealed circuit, pumped by the twin-head pump P1.
- Fact: The boiler’s water leaves about 17 degrees cooler; the pool’s only 0.6 of a degree warmer, because there is so much more of it. (17 and 0.6 computed from the model's temperatures)
- Try it: Compare TI3 and TI4 with TI1 and TI2.

### Placard 4: The pump

Source: `toolkit/gallery/logic/museum-1-placards.ts:99` (station 4)

- Headline: The pump
- Title: Pool pump · M1-P2
- Body: Water does not move by itself. The pump pushes it round, 185 m³ an hour; the gauges either side show the pressure it adds, and the flow switch FS1 tells the boiler the water is moving. (185 computed: the model's flow)
- Fact: Shut the pump’s valve and it can only churn the same water: it warms up, and its thermostat trips it to save it.
- Try it: Close the valve P2-V2 notch by notch: the flow FT1 falls and the pressure PI2 rises.

### Placard 5: The pool

Source: `toolkit/gallery/logic/museum-1-placards.ts:109` (station 5)

- Headline: The pool
- Title: Ideal pool · M1-IP1
- Body: The thermostat TC1 calls for heat until the pool reaches its setting (28 °C to start; it is 27 °C now). ON-OFF: the boiler fires flat out, then stops, and the pool saw-tooths round the setting. MODULATING: the boiler turns itself down as the pool nears it, and the temperature settles. (28 and 27 from `START_SET` and `START_C`)
- Fact: To warm this 470 m³ pool by one degree takes 547 kWh: about 3,250 kettles. (computed, as on the entrance panel)
- Try it: Turn the thermostat’s dial, and switch its CONTROL between ON-OFF and MODULATING.

### Placard 6: Where the heat goes

Source: `toolkit/gallery/logic/museum-1-placards.ts:120` (station 6)

- Headline: Where the heat goes
- Title: The pool’s heat balance · M1-QI1 to M1-QI4
- Body: Most of a pool’s heat leaves from its surface, as water evaporates: about 21 kW of the 23 kW this pool loses at 28 °C. A little goes into the ground; a warm hall gives a little back. (These meters are the museum’s model of the heat balance: no real plant measures them. Heat lost as radiation is left out.) (21 and 23 computed by `poolLosses`)
- Fact: Swimmers splashing roughly 2× the evaporation; a cover cuts it by about 9-tenths. (2× and 9-tenths computed; the sentence seems to lack a verb, "double" perhaps)
- Try it: Turn the SWIMMERS dial, then close the cover (key switch, CLOSE) and watch the evaporation needle drop.

### Placard 7: The gas it burns

Source: `toolkit/gallery/logic/museum-1-placards.ts:131` (station 7)

- Headline: The gas it burns
- Title: Gas burnt now · M1-EC1
- Body: Every kWh of heat in the pool came from gas the meter counted. This display shows the gas the boiler is burning right now, in cubic metres an hour and as kilowatts of heat going in; watch it drop as the boiler turns itself down, or stop when it cycles off. The heat meter HM1 counts what reached the pool; the difference is the boiler’s loss.
- Fact: Holding this pool at 28 °C takes about 591 kWh of gas a day, just to stand still. (591 computed)
- Try it: Press TIME ×3600, close the cover, and watch the gas fall as the pool needs less.

### Clock placard

Source: `toolkit/gallery/rooms/museum/hall-1-warm-water.ts:821`

- Heading: THE HALL’S TIME
- Line: Press a TIME button on the map and watch it race.

### The losses board's header

Source: `toolkit/components/plant/views/museum-heating-parts.ts:348`

- Heading: WHERE THE HEAT GOES
- Line: The museum’s model of the pool’s heat balance: no real plant measures these.

### Captions, legends and displays

| Where                     | Source                                                        | Text                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Mimic title               | `toolkit/gallery/logic/museum-1-mimic.ts:106` (`HALL1_MIMIC`) | THE MAP: HOW THE HEAT GETS FROM THE GAS TO THE POOL                                                                                      |
| Mimic captions            | `museum-1-mimic.ts` `labels`                                  | GAS, FLUE, WHERE THE HEAT GOES, TIME                                                                                                     |
| Mimic readout legends     | `museum-1-mimic.ts:51` (`READOUTS`)                           | FQ1 m³/h, EC1 GAS kW, TI3 °C, TI4 °C, HM1 kW, TI1 °C, TI2 °C, FT1 m³/h, POOL TI5 °C, QI1 EVAP kW, QI2 AIR kW, QI3 GROUND kW, QI4 LOST kW |
| Mimic lamps               | `museum-1-mimic.ts` `lamps`                                   | FIRING, LOCKOUT, P1 RUN, FS1, P2 RUN, TC1 CALL, COVER OFF, COVER ON                                                                      |
| Mimic buttons             | `museum-1-mimic.ts`                                           | ×1, ×60, ×600, ×3600, READINGS                                                                                                           |
| Losses board meters       | `hall-1-warm-water.ts:910`                                    | QI1 EVAPORATION, QI2 TO THE AIR ±10, QI3 TO THE GROUND, QI4 TOTAL LOST                                                                   |
| Losses board dial         | `museum-heating-parts.ts:383`, `:391`                         | SWIMMERS: NONE · A FEW · BUSY · GALA                                                                                                     |
| Boiler's control selector | `museum-heating-parts.ts:433`, `:441`                         | CONTROL: ON-OFF · MODULATING                                                                                                             |
| Pool thermostat           | `museum-heating-parts.ts:207`, `:224`, `:231`                 | SET °C 20–35 (range from `TC_RANGE`), CALL, TC1 THERMOSTAT                                                                               |
| Pool cover station        | `museum-heating-parts.ts:110` to `:157`                       | KEY, OPEN, CLOSE, OPEN (lamp), CLOSED (lamp), CV1 POOL COVER                                                                             |
| Gas burn display          | `museum-heating-parts.ts:277` to `:280`                       | EC1 GAS BEING BURNT NOW; Heat going in, kW; GAS FLOW m³/h                                                                                |
| Pool temperature display  | `hall-1-warm-water.ts:382`                                    | °C POOL TI5                                                                                                                              |
| Pool's own display        | `hall-1-warm-water.ts:369`                                    | WATER 27.0C 470m3 / IN 185m3/h IDEAL (values live)                                                                                       |
| Plant time display        | `hall-1-warm-water.ts:855`                                    | TIME hh:mm:ss / SPEED x1 (values live)                                                                                                   |
| Pump station              | `toolkit/gallery/views/museum-exhibit.ts:537` to `:601`       | RUN, START, STOP, TRIPPED, RESET, P2 CIRCULATION PUMP, PUSH                                                                              |
| RESET pedestal            | `museum-exhibit.ts:466`, `:474`                               | RESET SIMULATION, PUSH                                                                                                                   |

## Hall 2: Clean water

Hall 2's exhibit is installed (`toolkit/gallery/rooms/museum/hall-2-clean-water.ts`).

### Title on the street wall

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); `toolkit/gallery/logic/museum-plan.ts:352` (`HALL_BRIEFS.museum2`)

- Number: 2
- Title: Clean water
- Subject: Filtration and backwash
- Footer: PLANTROOMS · How a swimming pool really works

Unseen brief fields (`museum-plan.ts:358` to `:365`): Big idea: A bed of sand catches the dirt the swimmers bring in, and once it is full we wash it out by running the water backwards. Will show: The ideal pool plant from the development rooms (dev51) will be installed here: a sand filter, its pressure gauges, the five valves that turn it round, and a sight glass to watch the dirt come out. Try: Watch the gauges across the filter creep apart as the sand fills with dirt. / Set the five valves for a backwash and watch the sight glass run brown, then clear. / Rinse the bed and put the filter back to work.

### Entrance panel

Source: `toolkit/gallery/logic/museum-2-placards.ts:208` (`hall2Entrance`); assembled and drawn at `toolkit/gallery/rooms/museum/hall-2-clean-water.ts:1245` with the heading `Hall 2 · Clean water`

- Title (`headline`): Clean water
- Subtitle (written in the scene, `hall-2-clean-water.ts:1253`): Hall 2: sand, ozone and ultraviolet light
- Introduction (`bigIdea`, then `fact`): Swimmers bring dirt, sweat and skin with them. The plant takes it out all day: it strains the water through sand, then treats it with ozone and ultraviolet light. This pool’s whole volume goes through the plant every 2.6 hours. (2.6 computed: turnover)
- Route: 1 The balance tank, Ideal balance tank · 2 The pump, Circulation pump · 3 The sand filter, Sand filter · 4 Ozone, Ozone generator · 5 The contact tank, Contact tank · 6 The carbon filter, Carbon deozoniser · 7 Ultraviolet light, UV unit · 8 Back to the pool, Ideal pool
- Reset: Can’t break it: the big red RESET button puts everything back to the start. (Halls 1, 3, 4, 5 and 6 say "RESET SIMULATION button")

### RESET sign

Source: `toolkit/gallery/logic/ideal-pool-plant-placards.ts:273` (`RESET_SIGN`), at `hall-2-clean-water.ts:1267`; the same words as Hall 1's.

### Filter settings card

Source: `toolkit/gallery/logic/museum-2-placards.ts:192` (`filterSettingsCard`), drawn by `paintSettings` (`hall-2-clean-water.ts:236`) at `:1285`

- Headline: Our filter’s settings
- Line 1: Bed: 2.8 m across, 6.16 m² of sand, 1.0 m deep.
- Line 2: Flow: 184 m³/h, a filtration velocity of 30 m/h, at the fast end of what a commercial sand filter is rated for.
- Line 3: Turnover: 2.6 hours for the whole pool.
- Line 4: Pressure drop across the bed: 0.42 bar clean; we backwash at 0.82 bar.
- Line 5: Backwash: 196 m³/h up through the bed (32 m/h) for 5 minutes, about 16 m³ to drain, then a rinse.
- Invite: Think these settings are wrong? Tell us.

(Every number is computed by `filterSettings()`.)

### Placard 1: The balance tank

Source: `toolkit/gallery/logic/museum-2-placards.ts:116` (`hall2Placards`, station 1)

- Headline: The balance tank
- Title: Ideal balance tank · M2-BT1
- Joins: From the ideal mains water and ideal pool; to the circulation pump (computed by `joins()` from the schematic)
- Body: The pool brims over its edge into channels all round, and the water falls by gravity into this tank. The surface, where the grease and dirt float, is skimmed all the time. The tank also takes the water the swimmers push out of the pool, and the mains tops it up through a float valve.
- Fact: Its level gauge LI1 shows 30 m³ at its working level.
- Try it: Shut the make-up valve BT1-V1 and backwash for a long time: the tank runs down until its low level stops the pump.

### Placard 2: The pump

Source: `toolkit/gallery/logic/museum-2-placards.ts:125` (station 2)

- Headline: The pump
- Title: Circulation pump · M2-P1
- Joins: From the ideal balance tank; to the filter feed tee
- Body: You met a pump in Hall 1. This one draws from the balance tank and pushes all the pool’s water through the plant. Its two gauges show what it adds: suction on one side, discharge on the other.
- Fact: A pump working against a shut valve turns all its power into heat in the little water trapped inside it. This one trips after about 63 seconds, and can be reset at the pump about 28 seconds later, once it has cooled. (63 and 28 computed by `deadheadTiming()`)
- Try it: Shut the filter outlet F1-V2 with the pump running, wait for TRIP, open it again, then press RESET and START at the pump.

### Placard 3: The sand filter

Source: `toolkit/gallery/logic/museum-2-placards.ts:134` (station 3)

- Headline: The sand filter
- Title: Sand filter · M2-F1
- Joins: From the filter feed tee; to the waste tee and side-stream tee
- Body: A metre of sand catches what the swimmers bring. As it fills, the gap between its two gauges (PDI1) grows and the flow falls. Backwashing reverses the water through the five valves F1-V1 to F1-V5: the sand lifts and the dirt goes to the drain.
- Fact: Each drop of the pool passes through the sand about 9 times a day: the whole pool every 2.6 hours.
- Try it: Speed time up to ×3600 for a day of swimming, then backwash: watch the sight glass run brown, then clear.

### Placard 4: Ozone

Source: `toolkit/gallery/logic/museum-2-placards.ts:143` (station 4)

- Headline: Ozone
- Title: Ozone generator · M2-OZ1
- Joins: From the ideal dry air; to the venturi injector
- Body: Ozone is oxygen with a third atom. The generator makes it from dry air with an electric discharge, and a small booster pump drives some of the water through a venturi that sucks the gas in. Ozone oxidises the fine dirt the sand lets through and kills bugs that chlorine struggles with, such as Cryptosporidium.
- Fact: It makes 192 g of ozone an hour: about 1.0 g in every m³ of water.
- Try it: Turn the generator’s output knob, or stop the booster P2: with no suction at the venturi the generator trips.

### Placard 5: The contact tank

Source: `toolkit/gallery/logic/museum-2-placards.ts:152` (station 5)

- Headline: The contact tank
- Title: Contact tank · M2-CT1
- Joins: From the side-stream return tee; to the carbon deozoniser and off-gas destructor
- Body: The ozonised water spends a couple of minutes here, long enough for the ozone to do its work. The gas that does not dissolve rises to the top and goes through the destructor on its roof, which turns it back into oxygen.
- Fact: The water stays about 2.3 minutes; AI1 reads the ozone left as it leaves, about 0.8 mg/l.
- Try it: Switch off the destructor DS1: ozone reaches the air, the monitor AI3 alarms and stops the generator. Switch it on, wait for the air to clear, and reset both.

### Placard 6: The carbon filter

Source: `toolkit/gallery/logic/museum-2-placards.ts:161` (station 6)

- Headline: The carbon filter
- Title: Carbon deozoniser · M2-CF1
- Joins: From the contact tank; to the uv unit
- Body: Ozone must never reach the swimmers. A bed of activated carbon destroys what is left of it, so the water leaves with almost none.
- Fact: AI2 reads about 0.001 mg/l after the carbon.
- Try it: Compare AI1 before the carbon with AI2 after it.

### Placard 7: Ultraviolet light

Source: `toolkit/gallery/logic/museum-2-placards.ts:170` (station 7)

- Headline: Ultraviolet light
- Title: UV unit · M2-UV1
- Joins: From the carbon deozoniser; to the ideal pool
- Body: A medium-pressure lamp shines through the water as it passes. Its ultraviolet breaks down the chloramines that make a pool smell, and kills bugs. Like ozone it leaves nothing behind in the pool, which is why a pool still needs chlorine: see Hall 3.
- Fact: Its sensor RI1 reads 180 W/m² at full output; its lamp has run 2,150 hours.
- Try it: Stop the pump: with no water flowing the lamp goes out. Start it again and watch the lamp warm up.

### Placard 8: Back to the pool

Source: `toolkit/gallery/logic/museum-2-placards.ts:179` (station 8)

- Headline: Back to the pool
- Title: Ideal pool · M2-IP1
- Joins: From the uv unit; to the ideal balance tank
- Body: The flowmeter FT1 tells the operator how much water is being cleaned: flow divided by the pool’s volume gives its turnover.
- Fact: 184 m³/h into a 470 m³ pool: once round every 2.6 hours. The water stays at 27 °C: heating was Hall 1.
- Try it: Throttle F1-V2 notch by notch and watch FT1 fall.

### Activity card

Source: `toolkit/gallery/logic/museum-2-placards.ts:225` (`hall2ActivityCard`), drawn by `paintActivity` (`toolkit/gallery/views/museum-exhibit.ts:347`) at `hall-2-clean-water.ts:1164`

- Title: Try this! (with `ACTIVITY CARD` printed beside it)
- Step 1: Shut the filter outlet F1-V2 notch by notch: PI2 rises, FT1 falls to nothing.
- Step 2: Leave it shut: after about 63 seconds the pump trips. Open the valve, wait about 28 seconds, then RESET and START at the pump.
- Step 3: Press TIME ×3600 for 24 seconds: a day of swimming. Watch PDI1 climb and the flow fall.
- Step 4: Backwash: STOP the pump. Shut F1-V1 and F1-V2; open F1-V3 and F1-V4. START, and watch SG1 run brown, then clear.
- Step 5: Rinse: STOP. Shut F1-V3 and F1-V4; open F1-V1 and F1-V5. START for a minute.
- Step 6: Back to service: STOP, shut F1-V5, open F1-V2, START.
- Step 7: Switch off the ozone destructor DS1 at ×60: watch AI3 rise until it stops the generator.
- Step 8: Stop the pump: the UV lamp goes out and the ozone generator waits for the water to flow again.
- Warning (yellow box): Why stop the pump first? Swinging a valve on moving water stops it suddenly: a pressure surge, “water hammer”. Try it with the pump running and watch PI2 kick.
- Reset (red strip; the entrance panel's reset line, `hall2Entrance().reset`): Can’t break it: the big red RESET button puts everything back to the start.

### Clock placard

Source: `toolkit/gallery/rooms/museum/hall-2-clean-water.ts:1199`

- Heading: THE PLANT’S TIME
- Line: Press a TIME button on the map and watch it race.

### Captions, legends and displays

| Where                             | Source                                                        | Text                                                                                                 |
| --------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Mimic title                       | `toolkit/gallery/logic/museum-2-mimic.ts:101` (`HALL2_MIMIC`) | THE MAP: HOW THE WATER IS CLEANED                                                                    |
| Mimic captions                    | `museum-2-mimic.ts` `labels`                                  | MAINS, TO DRAIN, OVERFLOW, TIME                                                                      |
| Mimic readout legends             | `museum-2-mimic.ts`                                           | LI1 m3, PI1 bar, PI2 bar, PDI1 bar, SG1 g/m3, OZ1 g/h, AI1 mg/l, AI2 mg/l, RI1 W/m2, FT1 m3/h, TI1 C |
| Mimic lamps                       | `museum-2-mimic.ts` `lamps`                                   | P1 RUN, P1 TRIP, LOW LEVEL, BED LIFTED, P2 RUN, OZ1 RUN, OZ1 ALARM, OZONE IN AIR, UV1 LAMP           |
| Mimic buttons                     | `museum-2-mimic.ts`                                           | ×1, ×60, ×600, ×3600, READINGS                                                                       |
| Plant time display                | `hall-2-clean-water.ts:1233`                                  | PLANT hh:mm:ss / TIME x1 (values live)                                                               |
| Ozone generator display           | `hall-2-clean-water.ts:199`                                   | its status, or MAINS OFF                                                                             |
| Pump station (P1), RESET pedestal | `toolkit/gallery/views/museum-exhibit.ts`                     | as in Hall 1, the plate reading P1 CIRCULATION PUMP                                                  |

## Hall 3: Safe water

Hall 3's exhibit is installed (`toolkit/gallery/rooms/museum/hall-3-safe-water.ts`).

### Title on the street wall

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); `toolkit/gallery/logic/museum-plan.ts:368` (`HALL_BRIEFS.museum3`)

- Number: 3
- Title: Safe water
- Subject: Automatic disinfection
- Footer: PLANTROOMS · How a swimming pool really works

Unseen brief fields (`museum-plan.ts:374` to `:381`): Big idea: Chlorine keeps the water safe, but swimmers use it up: a controller measures it all day long and doses just enough, at the right pH. Will show: A pool with its chemistry: free and combined chlorine, pH, the pollution swimmers bring, and a dosing controller with its sample cell and metering pumps. Try: Send in a crowd of swimmers and watch the chlorine fall and the dosing pumps answer. / Change the controller’s setpoints and see the water follow. / Read the controller and the gauges, and say whether the water is safe.

### Entrance panel

Source: `toolkit/gallery/logic/museum-3-placards.ts:133` (`hall3Entrance`); drawn at `toolkit/gallery/rooms/museum/hall-3-safe-water.ts:760` with the heading `Hall 3 · Safe water`

- Title: Safe water
- Subtitle: Hall 3: automatic disinfection
- Introduction: Clear water can still carry germs. The plant keeps a little chlorine in it all the time, measures it every second, and adds more as the swimmers use it up. Everything here works: every valve, key and dial is yours to try.
- Route: 1 The swimmers, Swimmers · 2 The sample, Sample cell · 3 The controller, Dosing controller · 4 The pumps, Hypochlorite dosing pump · 5 The tanks, Hypochlorite day tank · 6 The test kit, DPD test kit · 7 When it goes wrong, Fault pedestal
- Reset: Can’t break it: the big red RESET SIMULATION button puts everything back to the start, the controller’s settings too.

### RESET sign

Source: `toolkit/gallery/logic/ideal-pool-plant-placards.ts:273` (`RESET_SIGN`), at `hall-3-safe-water.ts:769`; the same words as Hall 1's.

### Placard 1: The swimmers

Source: `toolkit/gallery/logic/museum-3-placards.ts:59` (`hall3Placards`, station 1)

- Headline: The swimmers
- Title: Swimmers · M3-BA1
- Body: Every swimmer brings sweat, skin and worse: about 3.7 g of chlorine demand each. Chlorine destroys it, and is used up doing so. NORMAL is a public day of 600 swimmers, busiest in the evening; CROWD sends 100 in for the next hour. (3.7 from `BATHER.demand`; 100 from `CROWD_BATHERS`, `game/plant/museum-3-dosing.ts:524`)
- Fact: The pool smell is not chlorine: it is chloramines, and it means the water has more dirt than its chlorine can deal with.
- Try it: Send in a crowd and watch the chlorine dip and the controller answer.

### Placard 2: The sample

Source: `toolkit/gallery/logic/museum-3-placards.ts:70` (station 2)

- Headline: The sample
- Title: Sample cell · M3-SC1
- Body: A trickle of the pool, about 40 litres an hour, runs past two probes all day: free chlorine AE1 and pH AE2. The float FS1 shows it is flowing; without flow the controller stops dosing after 120 seconds, because it can no longer trust what it reads. (120 from the controller's settings)
- Fact: Standing still, the probe uses up the chlorine in its own little cell in a few minutes: it reads low while the pool is fine.
- Try it: Shut the sample valve SC1-V1: watch the lamp go out, the reading fall, and the controller stop. Open it again.

### Placard 3: The controller

Source: `toolkit/gallery/logic/museum-3-placards.ts:80` (station 3)

- Headline: The controller
- Title: Dosing controller · M3-DC1
- Body: It compares what it measures with what it is set to, and doses in proportion to the difference: set to 1.3 mg/l, full output 0.5 below it, and a little more the longer it stays low (integral 6 hours). pH is set to 7.3. Two hours at full output and it stops itself (E dt): something must be wrong. (1.3, 0.5, 6 and 7.3 from `PLANT_SETTINGS`)
- Fact: pH decides how strong chlorine is: at pH 7.3 about 59 % of it is the strong kind, at 7.6 only 42 %. A dose takes over an hour to reach the far side of the pool, so the controller must not panic. (59 and 42 computed by `hoclFraction`)
- Try it: Press ◄► to SEt, XP or tn, ↵ to change, ▲ ▼, ↵ to keep. ↵ on the reading acknowledges an alarm.

### Placard 4: The pumps

Source: `toolkit/gallery/logic/museum-3-placards.ts:91` (station 4)

- Headline: The pumps
- Title: Hypochlorite dosing pump · M3-DP1; Acid dosing pump · M3-DP2
- Body: Each stroke pushes out a fraction of a millilitre. The hypochlorite pump gives up to 7.5 litres an hour, the acid pump 2.1. Hypochlorite pushes the pH up, so acid is dosed too, at its own injection point.
- Fact: A bubble in the pump’s head and it strokes away delivering nothing: the plant keeps running and the water slowly gets worse.
- Try it: Watch the stroke lamp speed up as the chlorine falls. A pump showing its fault: open its bleed valve DP1-V1 for 5 seconds, shut it, and press START on the pump. (5 from `BLEED_SECONDS`)

### Placard 5: The tanks

Source: `toolkit/gallery/logic/museum-3-placards.ts:101` (station 5)

- Headline: The tanks
- Title: Hypochlorite day tank · M3-DT1; Acid day tank · M3-DT2
- Body: Each day tank holds 60 litres, a few days’ chemical, read on its sight gauge (LI1, LI2). Refill it from its store by holding its fill valve open. (60 from `DAY_TANK_L`)
- Fact: Never let acid and hypochlorite meet: they make chlorine gas. That is why they have separate tanks, pumps, colours and injection points.
- Try it: Hold DT1-V1 open to fill the hypochlorite tank.

### Placard 6: The test kit

Source: `toolkit/gallery/logic/museum-3-placards.ts:111` (station 6)

- Headline: The test kit
- Title: DPD test kit · M3-TK1
- Body: Never trust a probe you have not checked. DPD 1 turns pink with free chlorine; DPD 3 shows the total, and the difference is the combined chlorine; phenol red gives the pH.
- Fact: Pools test by hand at least three times a day, and check the controller against the test every day.
- Try it: Press TEST and compare with the controller.

### Placard 7: When it goes wrong

Source: `toolkit/gallery/logic/museum-3-placards.ts:121` (station 7)

- Headline: When it goes wrong
- Title: Fault pedestal · M3-FP1
- Body: AIR IN THE PUMP puts a bubble into the hypochlorite pump’s head. WEAK DELIVERY makes the next hypochlorite into the day tank weaker than it should be. Neither trips the plant; find each from the plant’s own displays.
- Fact: A weak delivery sets off no alarm: the controller simply doses more, and the day tank empties faster.
- Try it: Press a fault, then put it right. RESET SIMULATION clears both.

### Staff-only door (on the street wall)

Source: `toolkit/gallery/views/museum-safety.ts:430` (`staff-door`), placed by `toolkit/gallery/logic/museum-safety.ts:465`

- STAFF ONLY
- FIRE DOOR / KEEP SHUT (`createFireDoorSign`)

### Captions, legends and displays

| Where                             | Source                                                                | Text                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Mimic title                       | `toolkit/gallery/logic/museum-3-mimic.ts:71` (`HALL3_MIMIC`)          | THE MAP: HOW THE PLANT LOOKS AFTER THE WATER BY ITSELF                                                                            |
| Mimic captions                    | `museum-3-mimic.ts` `labels`                                          | SWIMMERS IN, HYPOCHLORITE, ACID, DC1 CONTROLLER, TIME                                                                             |
| Mimic readout legends             | `museum-3-mimic.ts`                                                   | LI1 l, LI2 l, DC1 Cl mg/l, DC1 pH, Cl OUT %, pH OUT %, FT1 m³/h                                                                   |
| Mimic lamps                       | `museum-3-mimic.ts` `lamps`                                           | DP1 STROKE, DP1 FAULT, DP2 STROKE, DP2 FAULT, P1 RUN, FS1, DC1 ALARM                                                              |
| Mimic buttons                     | `museum-3-mimic.ts`                                                   | ×1, ×60, ×600, ×3600, READINGS                                                                                                    |
| Swimmers dial                     | `toolkit/components/plant/views/museum-dosing-parts.ts:316` to `:334` | CLOSED · QUIET · NORMAL · CROWD; IN THE WATER; BA1 SWIMMERS                                                                       |
| Fault pedestal                    | `museum-dosing-parts.ts:395`, `:427`                                  | AIR IN THE PUMP, WEAK DELIVERY, FP1 WHEN IT GOES WRONG                                                                            |
| Test kit                          | `museum-dosing-parts.ts:210` to `:281`                                | DPD 1, DPD 3, PHENOL RED; ticket: TK1 / PRESS / TO TEST, then FREE, TOTAL, COMB with their values; button TEST; TK1 POOL TEST KIT |
| Day tank labels                   | `museum-dosing-parts.ts:549`                                          | DT1 SODIUM HYPOCHLORITE 14% · CORROSIVE; DT2 HYDROCHLORIC ACID 10% · CORROSIVE                                                    |
| Chart recorder paper              | `museum-dosing-parts.ts:88`, `:90`                                    | FREE Cl₂ 0–3 mg/l · pH 6.5–8.0; 24 HOURS · M3-QR1                                                                                 |
| Balance tank display              | `hall-3-safe-water.ts:402`                                            | BALANCE TANK / 30m3 IDEAL                                                                                                         |
| Pump station (P1), RESET pedestal | `toolkit/gallery/views/museum-exhibit.ts`                             | as in Hall 1, the plate reading P1 CIRCULATION PUMP                                                                               |

## Hall 4: The chemistry of pools

Hall 4's exhibit is built (`toolkit/gallery/rooms/museum/hall-4-chemistry.ts`, 107d) but not installed: `museum4` is in neither `HALL_EXHIBITS` (`toolkit/gallery/rooms/museum/exhibits.ts:23`) nor `EXHIBIT_HALLS` (`toolkit/gallery/logic/museum-plan.ts:822`). So today a visitor sees the coming-soon panel and two benches; the exhibit's words follow, for when it is put in.

### What a visitor sees today: title on the street wall

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); `toolkit/gallery/logic/museum-plan.ts:384` (`HALL_BRIEFS.museum4`)

- Number: 4
- Title: The chemistry of pools
- Subject: A hands-on chemistry lab
- Footer: PLANTROOMS · How a swimming pool really works

### What a visitor sees today: the coming-soon panel

Source: `toolkit/gallery/views/museum-hall.ts:898` (`paintComingSoon`); `toolkit/gallery/logic/museum-plan.ts:384` (`HALL_BRIEFS.museum4`)

- Header: 4, The chemistry of pools, A hands-on chemistry lab
- Kicker: EXHIBIT COMING SOON
- Will show: A set of ideal tanks, a dosing station with buttons to add chemicals of your choice, and a readout in a simulated swimming pool of the chemistry your choices produced.
- THE BIG IDEA: Every chemical added to a pool changes its water: the art is in the balance.
- YOU WILL BE ABLE TO TRY: Add chemicals with the dosing station’s buttons and read what they did to the pool. / Make the water safe, clear and comfortable, then try to upset it. / Reset it at the end and try again.
- Route strip, with "You are here" over 4.

### Exhibit (not yet installed): entrance panel

Source: `toolkit/gallery/logic/museum-4-placards.ts:106` (`hall4Entrance`); drawn at `hall-4-chemistry.ts:459` with the heading `Hall 4 · The chemistry of pools`

- Title: The chemistry of pools
- Subtitle: Hall 4: a hands-on chemistry lab
- Introduction: Keeping a pool safe is a balancing act. Every chemical you add changes more than one thing. Here, you are the pool’s chemist. The pool’s 500 cubic metres weigh 500 tonnes: a 10-litre dose is like less than half a teaspoon in a bath. (500 from `VOLUME`)
- Route: 1 The tanks, Ten ideal tanks · 2 The station, Dosing desk · 3 The readout, The museum’s ideal analyser, which knows the water exactly · 4 The swimmers, Ideal swimmers · 5 The challenges, Challenge cards
- Reset: Can’t break it: the big red RESET SIMULATION button puts everything back to the start.

### Exhibit (not yet installed): RESET sign

Source: `RESET_SIGN`, at `hall-4-chemistry.ts:491`; the same words as Hall 1's.

### Exhibit (not yet installed): Placard 1, The tanks

Source: `toolkit/gallery/logic/museum-4-placards.ts:43` (`hall4Placards`, station 1); the body is built from `TANKS` (`game/plant/museum-4-lab.ts:73`), each tank's `code`, `product`, `purpose` and `sideEffects`

- Headline: The tanks
- Title: Ten ideal tanks · M4-CT1 to M4-FW1
- Body: CT1 Sodium hypochlorite 14 %: chlorine: kills germs; adds salt (TDS), a little alkalinity, and raises the pH. CT2 Calcium hypochlorite 65 %: chlorine, as granules; brings calcium (hardness) with it. CT3 Hydrochloric acid 10 %: acid: brings the pH down; takes alkalinity away, adds chloride (TDS). CT4 Sodium bisulphate (dry acid): dry acid: brings the pH down; takes alkalinity away, adds sulphate, which eats grout above 360 mg/l. CT5 Carbon dioxide: brings the pH down, leaving the alkalinity alone; leaves to the air over hours, so the pH creeps back up. CT6 Sodium bicarbonate: raises alkalinity, the buffer; hardly moves the pH; adds TDS. CT7 Soda ash (sodium carbonate): raises the pH; raises alkalinity too, and the pH sharply. CT8 Calcium chloride: raises calcium hardness; hardly moves the pH; adds TDS. CT9 Sodium thiosulphate: takes chlorine away; the pH rises afterwards: check it and add acid. FW1 Fresh water from the mains: dilutes everything towards the mains water; the only cure for TDS, sulphate and stabiliser; costs water and heat.
- Fact: Never let acid and hypochlorite meet: together they make chlorine gas. (Tank you won’t find here: coagulant. It works on dirt, not on chemistry.)
- Try it: Find the tank that raises alkalinity without moving the pH.

### Exhibit (not yet installed): Placard 2, The station

Source: `toolkit/gallery/logic/museum-4-placards.ts:55` (station 2)

- Headline: The station
- Title: Dosing desk · M4-DS1
- Body: Choose a chemical, dial how much on the thumbwheels, press DOSE. Its valve opens, the dose runs down the header to the dosing pot DP1 and into the pool’s return. CANCEL stops it. The teleprinter TP1 writes every dose down against the time.
- Fact: Here you are the controller: nothing doses itself.
- Try it: Dose 12.7 litres of acid (CT3) and watch the pH fall to about 7.24.

### Exhibit (not yet installed): Placard 3, The readout

Source: `toolkit/gallery/logic/museum-4-placards.ts:66` (station 3)

- Headline: The readout
- Title: The museum’s ideal analyser, which knows the water exactly · M4-AN1
- Body: Green means within the recommended range (PWTAG). Free chlorine kills germs; combined chlorine is chlorine used up on swimmers; pH decides how much chlorine works; alkalinity is the buffer; hardness keeps the water from eating the grout; TDS is everything dissolved; sulphate above 360 mg/l attacks cement grout (see what it does in the Grout hall).
- Fact: At pH 7.4 about 54 % of the free chlorine is working (HOCl); at pH 8.0 only about a quarter. (54 computed by `readWater`)
- Try it: Add soda ash and watch the HOCl meter fall as the pH rises.

### Exhibit (not yet installed): Placard 4, The swimmers

Source: `toolkit/gallery/logic/museum-4-placards.ts:76` (station 4)

- Headline: The swimmers
- Title: Ideal swimmers · M4-BA1
- Body: Every swimmer brings sweat and urine. Chlorine reacts with them and is used up, and makes combined chlorine (chloramines): the “chlorine smell” of a pool is really trichloramine. Enough chlorine, about eight times the nitrogen (7.6 in theory), breaks them down: breakpoint.
- Fact: Urea from swimmers breaks down slowly: half of it lasts about 63 hours.
- Try it: Press +20 SWIMMERS, then TIME ×600, and watch the free chlorine fall.

### Exhibit (not yet installed): Placard 5, The challenges

Source: `toolkit/gallery/logic/museum-4-placards.ts:87` (station 5)

- Headline: The challenges
- Title: Challenge cards
- Body: Pick a card on the CHALLENGE selector and press START. Something is wrong with the water: put it right. Keep the readout in range for an hour of pool time and the log prints PUT RIGHT. 11 cards, from high pH to a faecal incident. (11 is `CARDS.length`)
- Fact: In practice the pH rises after dechlorination: check it and add acid.
- Try it: Try HIGH PH first, then FAECAL at TIME ×3600.

### Exhibit (not yet installed): the challenge cards board

Source: `toolkit/gallery/rooms/museum/hall-4-chemistry.ts:426`; the cards from `CARDS` (`game/plant/museum-4-lab.ts:661`)

- Heading: THE CHALLENGE CARDS
- Line: Choose a card on the desk (◄ ►), press START, put the water right and keep it so for an hour.

| No. | Title         | Symptom (printed on the teleprinter)                 | GOAL:                                                           |
| --- | ------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| 1   | COMBINED CL   | UV FAILED, BUSY WEEK: CHLORINE SMELL, RED EYES       | COMBINED < 0.5 AND < HALF FREE, FREE 1-3                        |
| 2   | LOW ALK       | PH SWINGING WITH EVERY DOSE                          | ALKALINITY 80-200, PH 7.0-7.4                                   |
| 3   | HIGH PH       | ACID PUMP FAILED 2 DAYS: CHLORINE WORKING POORLY     | PH 7.0-7.4                                                      |
| 4   | ACID OVERDOSE | ACID PUMP STUCK ON OVERNIGHT: STINGING EYES          | PH 7.0-7.4, ALKALINITY 80 OR MORE                               |
| 5   | LOW HARDNESS  | REFILLED FROM SOFT MAINS: WATER EATING THE GROUT     | HARDNESS 80+, BALANCE -0.5 TO +0.5                              |
| 6   | HIGH TDS      | TDS 1600 ABOVE THE MAINS: DULL WATER                 | TDS AT MOST MAINS + 1000                                        |
| 7   | DECHLORINATE  | SHOCKED TO 20 MG/L: CANNOT REOPEN                    | FREE 1-3, PH 7.0-7.4                                            |
| 8   | FAECAL        | DIARRHOEAL INCIDENT: POOL CLEARED AND CLOSED         | HOLD 20 MG/L AT PH<=7.5 FOR CT 15300, THEN FREE 1-3, PH 7.0-7.4 |
| 9   | STABILISER    | WRONG DELIVERY: CHLORINE READS FINE BUT WORKS POORLY | HOCL SHARE ABOVE HALF THE RESET WATER'S, FREE 1-3               |
| 10  | HARD WATER    | WHITE CRUST ON THE HEATER: SCALING                   | BALANCE -0.5 TO +0.5, HARDNESS 300 OR LESS                      |
| 11  | SULPHATE      | A SEASON OF DRY ACID: SULPHATE OVER THE GROUT LIMIT  | SULPHATE UNDER 360, PH 7.0-7.4                                  |

### Exhibit (not yet installed): the Balance Beam's plaque

Source: `toolkit/gallery/logic/museum-4-placards.ts:100` (`BEAM_PLAQUE`), drawn by `createBalanceBeam` (`toolkit/components/plant/views/museum-chemistry-parts.ts:700`), headline upper-cased, caution run on after the body

- Headline: The balance index (printed THE BALANCE INDEX)
- Body: Langelier’s index puts pH, hardness, alkalinity, temperature and TDS into one number. Below −0.5 the water is aggressive and eats grout and concrete; above +0.5 it scales the plant. Raising pH by 0.1 raises it by 0.1; doubling hardness or alkalinity raises it by 0.3. The same water at 37 °C is about 0.17 higher: warm water scales sooner.
- Caution: pH and free chlorine take precedence over other factors (PWTAG).

### Exhibit (not yet installed): captions, legends and displays

| Where                      | Source                                                       | Text                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mimic title                | `toolkit/gallery/logic/museum-4-mimic.ts:42` (`HALL4_MIMIC`) | THE MAP: WHERE YOUR CHEMICALS GO                                                                                                                                                                                       |
| Mimic captions and legends | `museum-4-mimic.ts`                                          | DOSING HEADER, INJECTION, SWIMMERS IN, AI1 FREE CL mg/l, AI4 pH, AI10 BALANCE; lamps GROUP, P1 RUN; READINGS                                                                                                           |
| Readout board header       | `museum-chemistry-parts.ts:516`                              | THE POOL’S WATER, NOW                                                                                                                                                                                                  |
| Readout board caption      | `museum-chemistry-parts.ts:518`                              | AN1: the museum’s ideal analyser, which knows the water exactly. Green: within the recommended range (PWTAG).                                                                                                          |
| Readout meters             | `game/plant/museum-4-lab.ts:1190` (`METER_LABEL`)            | FREE CHLORINE mg/l, COMBINED CHLORINE mg/l, TOTAL CHLORINE mg/l, pH, CHLORINE WORKING % (HOCl), ALKALINITY mg/l CaCO3, CALCIUM HARDNESS mg/l, TDS ABOVE MAINS mg/l, SULPHATE mg/l (marked GROUT at 360), BALANCE INDEX |
| Balance Beam scale         | `museum-chemistry-parts.ts:646` to `:689`                    | AGGRESSIVE: EATS GROUT, BALANCED, SCALING; SOFT WATER, HARD WATER; pH, HARDNESS, ALKALINITY, TEMP + TDS, INDEX                                                                                                         |
| Dosing desk                | `museum-chemistry-parts.ts:331` to `:451`                    | SELECT A CHEMICAL, AMOUNT, DOSE, CANCEL, +20 SWIMMERS, SWIMMERS (NONE · NORMAL · BUSY), TIME (×1, ×60, ×600, ×3600), CHALLENGE 1–11, START                                                                             |
| Tank plates                | `museum-chemistry-parts.ts:28`, `:115`                       | each tank's code and product (as in placard 1) with its hazard: CORROSIVE, OXIDISER, IRRITANT, ENVIRONMENT, GAS UNDER PRESSURE                                                                                         |
| Chemical usage counters    | `museum-chemistry-parts.ts:162`                              | USED l, USED kg, USED m3                                                                                                                                                                                               |
| Teleprinter log            | `game/plant/museum-4-lab.ts:985` to `:1090`                  | DOSE CT3 HCl 10% 12.7 l; CANCEL … AFTER …; SWIMMERS …; CARD n TITLE: SYMPTOM; GOAL: …; PUT RIGHT (duration)                                                                                                            |
| Pool display               | `hall-4-chemistry.ts:376`                                    | FC 1.50 PH 7.40 / 500m3 NORMAL (values live)                                                                                                                                                                           |
| Lab time display           | `hall-4-chemistry.ts:291`                                    | LAB TIME KI1 (tag derived)                                                                                                                                                                                             |

## Hall 5: A Day in the Life

Hall 5's exhibit is installed (`toolkit/gallery/rooms/museum/hall-5-day-in-the-life.ts`, 107l with 107f's skimmer).

### Title on the street wall

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); `toolkit/gallery/logic/museum-plan.ts:305` (`waiting(5)`, `HALL_BRIEFS.museum5`)

- Number: 5
- Title: Coming soon
- Subject: Its theme is still to be chosen
- Footer: PLANTROOMS · How a swimming pool really works

Hall 5's brief has not been updated for its exhibit, so its street-wall title, the route strips and the doorway signs in Halls 4 and 6 still call it "Coming soon".

### Entrance panel

Source: `toolkit/gallery/logic/museum-5-gallery.ts:322` (`hall5Entrance`); drawn at `hall-5-day-in-the-life.ts:849` with the heading `Hall 5 · A Day in the Life`

- Title: A Day in the Life
- Subtitle: Hall 5: a poolman’s duties through the decades
- Introduction: Before the first swimmer arrives, somebody has already been round the pool. For a hundred years the day has run the same way: open up, empty the skimmers, test the water, take the deliveries, backwash the filters, lock up. The tools changed, from a yellow comparator and a chalkboard to a touch screen and a pager. The skimmer basket did not. Walk the photographs from the 1920s to today, and empty the skimmer yourself.
- Route: 1 The 1920s to the 1970s, north wall · 2 The 1980s to today, east wall · 3 What’s in the Skimmer?, the poolside
- Reset: Can’t break it: the big red RESET SIMULATION button fills the skimmer again.

### RESET sign

Source: `RESET_SIGN` (`toolkit/gallery/logic/ideal-pool-plant-placards.ts:273`), at `hall-5-day-in-the-life.ts:858`; the same words as Hall 1's.

### The photographs, decade by decade

Source: `toolkit/gallery/logic/museum-5-gallery.ts:38` (`DECADES`), drawn by `hall-5-day-in-the-life.ts:186` to `:241`. Each bay prints the decade and its strapline; each frame is a placeholder printed with `{decade} · {MORNING|MIDDAY|NIGHT}` and `PHOTOGRAPH TO COME`, and under it the time of day and the caption.

#### 1920s: The baths superintendent and his attendant

Source: `museum-5-gallery.ts:40`

- Morning: Six o’clock. The attendant skims the floating dirt off by hand with a long-handled net, then chalks the water’s temperature on the board.
- Midday: Testing: a few drops of orthotolidine turn a tube of pool water yellow, matched by eye against coloured glass.
- Night: Closing: the steam valve to the calorifier shut by its handwheel, the pump’s starter arm thrown back to OFF.

#### 1930s: Filtered and chlorinated, the new way

Source: `museum-5-gallery.ts:62`

- Morning: The scum channel round the pool hosed clean, its strainer emptied into a bucket before the first swimmers.
- Midday: An enamel jug of bleach tipped into the balance tank; the bigger baths already dose chlorine gas.
- Night: Backwashing the pressure filters: the valves turned in their order by hand, the dirty water run to waste.

#### 1950s: The brown panel

Source: `museum-5-gallery.ts:84` (there is no 1940s bay)

- Morning: The new wall skimmers, one basket at a time: hair, leaves and a hair grip or two into the bin.
- Midday: The gas chlorinator’s glass rotameter read and its rate knob nudged; still the yellow comparator on the shelf.
- Night: The circular chart recorder’s paper changed: one turn a day, the pool’s temperature drawn in ink.

#### 1960s: Pink, not yellow

Source: `museum-5-gallery.ts:106`

- Morning: Opening checks on a clipboard: skimmer baskets, hair traps, pool clear, lifesaving pole on its hooks.
- Midday: The first DPD tablets: the water turns pink, and free and combined chlorine can be told apart at last.
- Night: A sack of soda ash hauled in for the pH, the plant room door locked, the boiler left to its thermostat.

#### 1970s: Metric, and the leisure centre

Source: `museum-5-gallery.ts:128`

- Morning: The new leisure centre’s skimmers emptied before the doors open; the thermometer reads in Celsius now.
- Midday: A chlorine drum delivery signed for at the back door, stacked in the store under its warning signs.
- Night: The vacuum cleaner run along the floor of the empty pool, its hose snaking across the deck.

#### 1980s: The big panel

Source: `museum-5-gallery.ts:150`

- Morning: The pump selector from HAND to AUTO, the time switch’s pins checked, then out to the poolside with the basket hook.
- Midday: A pink DPD test on the poolside, written in the log against the moving-coil chlorine meter on the panel.
- Night: An annunciator window lit (LOW CL); ACCEPT pressed, the analyser’s sample line cleared, RESET.

#### 1990s: The numbers

Source: `museum-5-gallery.ts:172`

- Morning: Red seven-segment readings checked against the hand test; hair and plasters out of the skimmers, as ever.
- Midday: E 07 on the controller: low sample flow. The manual, chained to the desk, says what that means.
- Night: Backwash by the clock: the filter’s pressure differential written down before and after.

#### 2000s: The menus, and the pager

Source: `museum-5-gallery.ts:194`

- Morning: The BMS fault log scrolled on a small LCD, one line at a time, before the skimmers and the hair traps.
- Midday: A tanker delivery of sodium hypochlorite, the fill point unlocked and the hose coupled by the book.
- Night: The pager goes off at home: the building has rung someone up because it is unhappy.

#### 2010s: The screen

Source: `museum-5-gallery.ts:216`

- Morning: A tablet with the opening checklist ticked on the poolside; the skimmer basket still emptied by hand.
- Midday: The colour touch screen of the dosing controller compared, as always, with a pink DPD test.
- Night: The pool cover rolled out over the water to keep the heat in until the morning.

#### 2020s: Today

Source: `museum-5-gallery.ts:238`

- Morning: The skimmer baskets, the first job of the day, as they were a hundred years ago. Hair still floats.
- Midday: Water samples logged on a phone; the pool test kit and its pink tablets still in the plant room drawer.
- Night: Last round: the plant room’s gauges read, the lights off, the pool left still and dark until six.

### Placard: What’s in the Skimmer?

Source: `toolkit/gallery/logic/museum-5-gallery.ts:339` (`SKIMMER_PLACARD`), on a lectern at `hall-5-day-in-the-life.ts:877`

- Station: 3
- Headline: What’s in the Skimmer?
- Title: Why skimmers matter
- Body: Most of a pool’s dirt floats: hair, skin, sun cream, leaves and insects. A skimmer draws off the top few millimetres of water, and its basket stops the big things before they reach the pump and the filter. Somebody has to empty it. Today, that’s you.
- Fact: Emptying the skimmer baskets is one of the first jobs on a pool’s morning checklist, and has been since skimmers were invented.
- Try it: Lift the lid and put it to one side. Click the skimmer to take something out. Put it in the skip. Empty the skimmer!

### Skimmer cut-away panel

Source: `toolkit/gallery/rooms/museum/hall-5-day-in-the-life.ts:255` (`paintCutaway`), placed at `:882`

- Heading: Inside a skimmer
- Labels: LID, WEIR FLAP, BASKET, TO THE PUMP (capped), WATER
- Caption (`:303`): The weir flap floats on the water and lets only the top few millimetres in. The basket catches the big things before the pump. This one is dry: its suction line is capped.

### Opening checks sheet

Source: `hall-5-day-in-the-life.ts:891`; items from `toolkit/gallery/logic/museum-5-gallery.ts:358` (`OPENING_CHECKS`), the first three ticked

- Heading: OPENING CHECKS
- ✓ Plant room: pumps running, no leaks
- ✓ Pool water tested (free and total chlorine, pH)
- ✓ Empty skimmer baskets
- Hair traps cleaned
- Pool clear, floor visible
- Rescue equipment in place
- Poolside clean, no glass

### The skip's sign

Source: `toolkit/gallery/logic/museum-5-gallery.ts:352` (`SKIP_SIGN`), drawn at `hall-5-day-in-the-life.ts:575`

- Headline: For things found in the skimmer
- Body: In real life, a bin bag. Here, a skip, because there’s so much of it.
- Count: In the skip: 0 (live)
- When the skimmer is empty, the sign turns yellow: SKIMMER CLEARED! / You took out 14 things. Lovely. (`CLEARED_LINE`, `toolkit/gallery/logic/museum-5-skimmer.ts:310`; the number is the count of finds, 12 to 15)

### What’s in the Skimmer? The finds (caption card and voice clip)

Source: `toolkit/gallery/logic/museum-5-skimmer.ts:50` (`FINDS`); each caption is shown on the caption card (`hall-5-day-in-the-life.ts:618`) when the find is picked up, and is also the script for its voice clip `resources/sound/voice/skimmer/<id>.mp3` (none recorded yet; `resources/sound/voice/skimmer/index.md`). A fill holds 12 to 15 finds; the hair clump is always on top; the false teeth turn up one time in five. The Name column is used in the overlay.

| Id (line)               | Name                        | Caption                                                                                     |
| ----------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| hair-clump (`:52`)      | a clump of hair             | A clump of hair. Hair floats, so the skimmer catches lots of it. Yuck.                      |
| hair-bobble (`:58`)     | a hair bobble               | A hair bobble. Somebody’s ponytail came undone.                                             |
| hair-grips (`:63`)      | hair grips                  | Hair grips. They sink, rust and stain the tiles, so we’re glad to catch these.              |
| plaster (`:69`)         | a sticking plaster          | A plaster. Warm water makes them peel off. Ew.                                              |
| verruca-sock (`:74`)    | a verruca sock              | A verruca sock. Only ever one: where do the other ones go?                                  |
| leaves (`:79`)          | a handful of leaves         | Leaves, blown in through the doors.                                                         |
| bee (`:84`)             | a drowned bee               | A bee. Insects land on the water and can’t climb out.                                       |
| frog (`:89`)            | a rubber frog               | A frog! Only a rubber one. Outdoor pools get the real thing.                                |
| earring (`:94`)         | an earring                  | An earring. Lost property will be pleased.                                                  |
| coins (`:99`)           | a few coins                 | Coins: 47p. Nobody knows why people swim with money.                                        |
| sixpence (`:104`)       | an old sixpence             | An old sixpence. They stopped making these over fifty years ago.                            |
| wedding-ring (`:109`)   | a wedding ring              | A wedding ring! Cold water shrinks fingers and rings slip off. Somebody will be very happy. |
| car-key (`:115`)        | a locker key on a wristband | A locker key. Somebody is standing in a towel, waiting.                                     |
| goggle-lens (`:120`)    | a goggle lens               | Half a pair of goggles.                                                                     |
| nose-clip (`:125`)      | a nose clip                 | A nose clip, for synchronised swimmers and people who hate water up their nose.             |
| earplug (`:131`)        | an earplug                  | An earplug. It’s been in someone’s ear.                                                     |
| swimming-badge (`:136`) | a cloth swimming badge      | A 25 metres badge, sewn on and come off. Well done, whoever you are.                        |
| dummy (`:142`)          | a baby’s dummy              | A dummy. Somebody small is very upset about this.                                           |
| dinosaur (`:147`)       | a toy dinosaur              | A toy dinosaur. It’s extinct now.                                                           |
| rubber-duck (`:152`)    | a rubber duck               | A rubber duck, where it belongs, nearly.                                                    |
| grapes (`:157`)         | a bunch of grapes           | Grapes. Somebody brought a picnic into the pool.                                            |
| crisp-packet (`:162`)   | a crisp packet              | A crisp packet. No eating on the poolside!                                                  |
| contact-lens (`:167`)   | a contact lens              | A contact lens. Very hard to spot. Well found!                                              |
| tampon (`:172`)         | a tampon                    | A tampon. They do not flush, and they do not swim either. Into the skip.                    |
| vibrator (`:178`)       | a small pink vibrator       | A small pink vibrator. Waterproof, as advertised. Nobody has asked at lost property.        |
| condom-wrapper (`:184`) | an empty condom wrapper     | An empty condom wrapper. The pool closes at ten. We will not be asking.                     |
| false-teeth (`:190`)    | a set of false teeth        | FALSE TEETH! The rarest find of all. Somebody laughed too hard on the flume.                |

### The skimmer's other spoken lines

Source: `toolkit/gallery/logic/museum-5-skimmer.ts:324` (`actOnSkimmer`), shown on the caption card

| Line                    | Text                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `:329`, `:340`, `:372`  | Your hands are full.                                                  |
| `:333`                  | The lid lifts off. Put it to one side.                                |
| `:334`                  | The lid.                                                              |
| `:338`                  | The lid goes back on.                                                 |
| `:339`                  | Lift the lid off first.                                               |
| `:342`                  | The basket is empty.                                                  |
| `:350`                  | The skip takes only what came out of the skimmer. The lid stays here. |
| `:310` (`CLEARED_LINE`) | SKIMMER CLEARED! You took out 14 things. Lovely.                      |

The voice clip list (`resources/sound/voice/skimmer/index.md`) also names an optional `intro` clip, played the first time the lid is lifted, with no script yet.

### Captions, legends and displays

| Where               | Source                                                | Text                     |
| ------------------- | ----------------------------------------------------- | ------------------------ |
| No running sign     | `hall-5-day-in-the-life.ts:921`                       | No running               |
| Lost property chair | `hall-5-day-in-the-life.ts:1029`                      | LOST PROPERTY            |
| Skimmer lid         | `hall-5-day-in-the-life.ts:546`                       | CERTIKIND (maker's mark) |
| Swimming badge find | `toolkit/gallery/rooms/museum/hall-5-finds.ts:150`    | 25m                      |
| RESET pedestal      | `toolkit/gallery/views/museum-exhibit.ts:466`, `:474` | RESET SIMULATION, PUSH   |

## Hall 6: Grundflow’s Amazing World of Pumps

Hall 6's exhibit is built (`toolkit/gallery/rooms/museum/hall-6-world-of-pumps.ts`, 107j) but not installed: `museum6` is in neither `HALL_EXHIBITS` nor `EXHIBIT_HALLS`, and its brief is still the waiting one. So today a visitor sees the coming-soon panel and two benches; the exhibit's words follow, for when it is put in.

### What a visitor sees today: title on the street wall

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); `toolkit/gallery/logic/museum-plan.ts:305` (`waiting(6)`)

- Number: 6
- Title: Coming soon
- Subject: Its theme is still to be chosen
- Footer: PLANTROOMS · How a swimming pool really works

### What a visitor sees today: the coming-soon panel

Source: `toolkit/gallery/views/museum-hall.ts:898` (`paintComingSoon`); `toolkit/gallery/logic/museum-plan.ts:305` (`waiting`); the same panel stands in any hall still waiting for its theme

- Header: 6, Coming soon, Its theme is still to be chosen
- Kicker: EXHIBIT COMING SOON
- Will show: This hall is waiting for its exhibit. Its theme is still being chosen: carry on round the ring to the next hall.
- THE BIG IDEA: Every hall of the museum teaches one idea about how a swimming pool works.
- YOU WILL BE ABLE TO TRY: Carry on round the ring: the route goes on through the next archway.
- Route strip, with "Coming soon" and "You are here" over 6.

### Exhibit (not yet installed): entrance panel

Source: `toolkit/gallery/logic/museum-6-placards.ts:116` (`hall6Entrance`); drawn at `hall-6-world-of-pumps.ts:660` with the heading `Hall 6 · Grundflow’s Amazing World of Pumps`

- Title: Grundflow’s Amazing World of Pumps
- Subtitle: Hall 6: pumps for every occasion
- Introduction: A swimming pool needs pumps of every size, from one that pushes out a few drops a minute to one that could empty a swimming pool in an afternoon. Press any pump’s button and watch the tank. Each sign tells you how long that pump would take to fill it. The biggest pump here moves water about 300,000 times faster than the smallest. When the tank is full, the pumps stop: press RESET to empty it. (300,000 computed by `hall6Facts()`, rounded to 10,000)
- Route (model name without "Grundflow", and its kind): 1 DMX 1602, solenoid diaphragm dosing pump · 2 DDS 7.5-16, stepper diaphragm dosing pump · 3 DMH 21-10, motor-driven diaphragm dosing pump · 4 PERI 30, peristaltic dosing pump · 5 MX 6, magnetic-drive centrifugal pump · 6 Unilift 12, submersible sump pump · 7 SPA 7, self-priming spa pump · 8 MAGNA D 65-120, twin-head in-line circulator · 9 NKC 125-250, end-suction centrifugal pump · 10 NKC 150-315, end-suction centrifugal pump · 11 HSC 250-500, horizontal split-case pump
- Reset: Can’t break it: the big red RESET SIMULATION button empties the tank and puts everything back to the start.

### Exhibit (not yet installed): RESET sign and clock badge

Source: `RESET_SIGN` at `hall-6-world-of-pumps.ts:721` (the same words as Hall 1's); the clock badge at `hall-6-world-of-pumps.ts:705`

- Clock badge: GRUNDFLOW · REAL TIME

### Exhibit (not yet installed): the pumps' plaques

Source: `toolkit/gallery/logic/museum-6-placards.ts:91` (`pumpPlaque`), drawn by `paintPlaque` (`hall-6-world-of-pumps.ts:131`), which prints Title, Headline, Body, Fact and Try it with no "Did you know?" and no TRY IT heading. Each is assembled from the model and the hall's words:

- Title: `{n}. {model} · {tag}` (model from `PUMPS`, `game/plant/museum-6-pumps.ts:94`)
- Headline: `At this rate it would take {duration} to fill the tank.` (`fillSentence`, `game/plant/museum-6-pumps.ts:770`)
- Body: `{family}: {kind}. {how} In a pool: {job}. {power}; here it delivers {flow}.` (family is "Positive displacement" or "Centrifugal"; kind and job from `PUMPS`; how from `WORDS`, `museum-6-placards.ts:23`)
- Fact: from `WORDS`
- Try it: `Press RUN. {slogan}` (the three slogans in turn, `SLOGANS`, `museum-6-placards.ts:71`: Grundflow: we’ve got your back-pressure. / Grundflow: every drop counts. / Grundflow: under pressure since 1952.)

#### Plaque 1

Source: `museum-6-placards.ts:24` (`WORDS[1]`)

- Title: 1. Grundflow DMX 1602 · M6-P1
- Headline: At this rate it would take 20 days to fill the tank.
- Body: Positive displacement: solenoid diaphragm dosing pump. A solenoid flicks a rubber diaphragm back and forth; valves let the water in on one stroke and out on the next. In a pool: dosing hypochlorite. 20 W; here it delivers 2.1 litres an hour.
- Fact: Each click is one stroke, about a fifth of a millilitre. It would need about five million to fill the tank.
- Try it: Press RUN. Grundflow: we’ve got your back-pressure.

#### Plaque 2

Source: `museum-6-placards.ts:28` (`WORDS[2]`)

- Title: 2. Grundflow DDS 7.5-16 · M6-P2
- Headline: At this rate it would take 5.6 days to fill the tank.
- Body: Positive displacement: stepper diaphragm dosing pump. A stepper motor pushes the diaphragm, slowly out and quickly back. In a pool: dosing acid. 25 W; here it delivers 7.5 litres an hour.
- Fact: Its slow push and quick return make the chemical flow smoothly, not in spurts.
- Try it: Press RUN. Grundflow: every drop counts.

#### Plaque 3

Source: `museum-6-placards.ts:32` (`WORDS[3]`)

- Title: 3. Grundflow DMH 21-10 · M6-P3
- Headline: At this rate it would take 48 hours to fill the tank.
- Body: Positive displacement: motor-driven diaphragm dosing pump. An electric motor and a worm gear drive the diaphragm through a full, adjustable stroke. In a pool: a big pool’s hypochlorite. 110 W; here it delivers 21 litres an hour.
- Fact: Built to push against 10 bar, ten times a car tyre; here it pushes against a sixth of a bar.
- Try it: Press RUN. Grundflow: under pressure since 1952.

#### Plaque 4

Source: `museum-6-placards.ts:36` (`WORDS[4]`)

- Title: 4. Grundflow PERI 30 · M6-P4
- Headline: At this rate it would take 33 hours to fill the tank.
- Body: Positive displacement: peristaltic dosing pump. Rollers on a spinning rotor squeeze a tube, pushing the water along in front of them. In a pool: dosing flocculant. 100 W; here it delivers 29.9 litres an hour.
- Fact: Nothing touches the liquid but the tube. Rollers squeeze it like toothpaste.
- Try it: Press RUN. Grundflow: we’ve got your back-pressure.

#### Plaque 5

Source: `museum-6-placards.ts:40` (`WORDS[5]`)

- Title: 5. Grundflow MX 6 · M6-P5
- Headline: At this rate it would take 10 minutes to fill the tank.
- Body: Centrifugal: magnetic-drive centrifugal pump. A spinning impeller throws water outward; a magnet turns it through a solid wall. In a pool: transferring hypochlorite to a day tank. 400 W; here it delivers 6 m³ an hour.
- Fact: No shaft seal: the chemical cannot leak out along the shaft.
- Try it: Press RUN. Grundflow: every drop counts.

#### Plaque 6

Source: `museum-6-placards.ts:44` (`WORDS[6]`)

- Title: 6. Grundflow Unilift 12 · M6-P6
- Headline: At this rate it would take 5.6 minutes to fill the tank.
- Body: Centrifugal: submersible sump pump. A sealed motor and impeller that live under the water they pump. In a pool: emptying a plant room’s sump. 1.5 kW; here it delivers 11 m³ an hour.
- Fact: It lives underwater and only wakes when its float says so.
- Try it: Press RUN. Grundflow: under pressure since 1952.

#### Plaque 7

Source: `museum-6-placards.ts:48` (`WORDS[7]`)

- Title: 7. Grundflow SPA 7 · M6-P7
- Headline: At this rate it would take 8.6 minutes to fill the tank.
- Body: Centrifugal: self-priming spa pump. An impeller throws water outward; a strainer pot in front catches hair and leaves. In a pool: a spa’s circulation. 300 W; here it delivers 7 m³ an hour.
- Fact: Self-priming: it can suck the air out of its own pipe to get started.
- Try it: Press RUN. Grundflow: we’ve got your back-pressure.

#### Plaque 8

Source: `museum-6-placards.ts:52` (`WORDS[8]`)

- Title: 8. Grundflow MAGNA D 65-120 · M6-P8
- Headline: At this rate it would take 2 minutes to fill the tank.
- Body: Centrifugal: twin-head in-line circulator. Two impellers and motors in one body, set straight into the pipe. In a pool: a boiler’s heating circuit. 1.1 kW; here it delivers 30 m³ an hour.
- Fact: Two pumps in one: one works, one waits, and they swap so both wear evenly.
- Try it: Press RUN. Grundflow: every drop counts.

#### Plaque 9

Source: `museum-6-placards.ts:56` (`WORDS[9]`)

- Title: 9. Grundflow NKC 125-250 · M6-P9
- Headline: At this rate it would take 23 seconds to fill the tank.
- Body: Centrifugal: end-suction centrifugal pump. Water enters the eye of the impeller and is flung out round the spiral casing. In a pool: a 25 m pool’s circulation. 7.5 kW; here it delivers 160 m³ an hour.
- Fact: This one turns over a 25 m pool’s water every few hours, all day, every day.
- Try it: Press RUN. Grundflow: under pressure since 1952.

#### Plaque 10

Source: `museum-6-placards.ts:60` (`WORDS[10]`)

- Title: 10. Grundflow NKC 150-315 · M6-P10
- Headline: At this rate it would take 12 seconds to fill the tank.
- Body: Centrifugal: end-suction centrifugal pump. A bigger impeller, a bigger motor: the same idea, scaled up. In a pool: a big pool’s circulation. 22 kW; here it delivers 300 m³ an hour.
- Fact: Its impeller is 315 mm across: the number in its name.
- Try it: Press RUN. Grundflow: we’ve got your back-pressure.

#### Plaque 11

Source: `museum-6-placards.ts:64` (`WORDS[11]`)

- Title: 11. Grundflow HSC 250-500 · M6-P11
- Headline: At this rate it would take 5.8 seconds to fill the tank.
- Body: Centrifugal: horizontal split-case pump. Water enters both sides of one impeller at once; the casing splits along the shaft, so the top lifts off for maintenance. In a pool: an Olympic pool’s circulation. 45 kW; here it delivers 625 m³ an hour.
- Fact: This is the size of pump that keeps an Olympic pool moving: its whole 2,500 cubic metres through the filters every four hours.
- Try it: Press RUN. Grundflow: every drop counts.

### Exhibit (not yet installed): Two families of pump

Source: `toolkit/gallery/logic/museum-6-placards.ts:134` (`FAMILIES`), drawn at `hall-6-world-of-pumps.ts:740`

- Headline: Two families of pump
- Positive displacement: Push a fixed amount each stroke or turn, almost whatever the pressure. That is why they dose: count the strokes, and you know how much went in. Pumps 1 to 4.
- Centrifugal: A spinning impeller throws the water outward. How much flows depends on what it pushes against: its curve meets the system’s. Close a valve and the flow falls. Pumps 5 to 11.

### Exhibit (not yet installed): captions, legends and displays

| Where                  | Source                                                              | Text                                                                                                        |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Mimic title            | `toolkit/gallery/logic/museum-6-mimic.ts:36` (`HALL6_MIMIC`)        | GRUNDFLOW’S AMAZING WORLD OF PUMPS: WHERE THE WATER GOES                                                    |
| Mimic captions         | `museum-6-mimic.ts`                                                 | IDEAL RESERVOIR, INLET HEADER HD1, TO DRAIN DR1, LEVEL; lamps RUN (×11), LSH1, TANK FULL · LOCKED; READINGS |
| Reservoir display      | `hall-6-world-of-pumps.ts:249`                                      | CLEAN WATER IDEAL / ATMOSPHERIC CW1                                                                         |
| Flow readouts          | `hall-6-world-of-pumps.ts:176` (`flowLines`)                        | FI1 FLOW … FI11 FLOW, in l/h or m3/h (values live)                                                          |
| Test tank              | `toolkit/components/plant/views/museum-pump-parts.ts:114` to `:188` | LI1 LITRES, FULL, LSH1, TEST TANK 1000 L, LITRES LI1                                                        |
| Split-case pump gauges | `museum-pump-parts.ts:300`                                          | SUCT, DISCH                                                                                                 |
| Each pump's RUN stand  | `museum-pump-parts.ts:435`, `:442`                                  | RUN, PUSH                                                                                                   |

## Hall 7: Grout: The Unsung Hero of the Aquatics World

Hall 7's exhibit is installed (`toolkit/gallery/rooms/museum/hall-7-grout.ts`, 107k). It has no state and no RESET button.

### Title on the street wall (the hall's brief)

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); `toolkit/gallery/logic/museum-plan.ts:305` (`waiting(7)`)

- Number: 7
- Title: Coming soon
- Subject: Its theme is still to be chosen
- Footer: PLANTROOMS · How a swimming pool really works

The brief has not been updated for the exhibit, so the street wall, the route strips and the doorway signs in Halls 6 and 8 still say "Coming soon".

### The exhibit's own title wall

Source: `toolkit/gallery/logic/museum-7-grout.ts:171` (`TITLE_WALL`), drawn at `hall-7-grout.ts:410`

- Line: Perhaps no substance is more important to a swimming pool than grout.
- Title: Grout: The Unsung Hero of the Aquatics World
- Corner mark (`hall-7-grout.ts:437`): PLANTROOMS

### Introduction panel

Source: `toolkit/gallery/logic/museum-7-grout.ts:185` (`INTRODUCTION`), drawn at `hall-7-grout.ts:444`

- Heading: Grout
- Paragraph 1: A swimming pool is held together by its grout. Every tile is set in it; every joint is filled with it; every day it is soaked, scrubbed, chlorinated and stood on. Here, for the first time, grout takes its rightful place in the history of aquatics.
- Paragraph 2: The tiles get the credit; the grout does the work. It keeps the water out of the bed and the structure behind, takes the swimmers’ feet and the cleaners’ brushes, resists the pool’s chemistry and must harbour no germs. Over a century and a half it went from lime to cement to polymer and resin, because pool water, chlorine and acid cleaners attack the simpler kinds.
- Paragraph 3: A 25-metre pool, 12.5 metres wide and 1.5 metres deep, has about 425 square metres of tile. In 150 mm tiles that is nearly six kilometres of grout joint (about 5.7 km), in the tank alone. (5.7 computed by `jointLength()`, `museum-7-grout.ts:177`)
- Paragraph 4: Grouts today are classed by BS EN 13888; tiling for swimming pools is guided by BS 5385-4.
- Paragraph 5: Walk slowly. Look closely. Can you tell them apart?
- Corner mark (`hall-7-grout.ts:475`): PLANTROOMS

### Card in place of a RESET button

Source: `toolkit/gallery/logic/museum-7-grout.ts:196` (`NOTHING_TO_RESET`), drawn at `hall-7-grout.ts:483`

- Headline: There is nothing to reset.
- Body: Grout endures.

### The plaques

Source: `toolkit/gallery/logic/museum-7-grout.ts:33` (`PLINTHS`), drawn by `paintPlaque` (`hall-7-grout.ts:85`), which prints the number, the name, the years, What, then `In its favour: ` followed by both Benefits, `Against it: ` followed by both Drawbacks, and the Reverence line. The plinths stand in date order round the hall. As extracted, a bronze timeline in the floor was marked 1850, 1900, 1950 and 2000 (`hall-7-grout.ts:310`); the hall's layout was being rearranged in the working tree at the time (uncommitted changes to `museum-7-grout.ts`), so check whether it survives.

#### Plaque 1: Lime mortar and lime putty

Source: `museum-7-grout.ts:35`

- Years: From about 1840 to about 1900
- What: Lime and sand, setting slowly as it takes up carbon dioxide from the air. Victorian glazed tiling was generally set close, with fine joints.
- Benefits: Workable and to hand. Forgiving of movement.
- Drawbacks: Soft, and slow to harden. Dissolved by soft or acid water, so it needed renewing.
- Reverence: It was there first.

#### Plaque 2: Early Portland cement grout

Source: `museum-7-grout.ts:49`

- Years: From about 1850 to about 1950
- What: Joseph Aspdin patented “Portland cement” in 1824; the hotter-burned cement that resembles today’s dates from the 1840s. Used neat, or with fine sand.
- Benefits: Hard and durable. Cheap.
- Drawbacks: Porous and brittle. Leached by water low in calcium, or with a negative saturation index.
- Reverence: It set the standard, and then it set.

#### Plaque 3: Sanded cement grout

Source: `museum-7-grout.ts:63`

- Years: The twentieth century to today
- What: Cement with graded sand, for the wider joints: by a rule of the trade, about 3 mm and up.
- Benefits: Strong in wide joints. Resists shrinkage cracking.
- Drawbacks: Coarse and porous. Takes up water and dirt.
- Reverence: It filled the gaps others could not.

#### Plaque 4: Unsanded cement grout

Source: `museum-7-grout.ts:74`

- Years: The twentieth century to today
- What: Cement without sand, for the fine joints of glazed tiles and mosaic: BS 5385 guidance is about 2 mm on walls.
- Benefits: Fills fine joints smoothly. A neat, close finish.
- Drawbacks: Shrinks and cracks if used too wide. Porous.
- Reverence: It asked for nothing.

#### Plaque 5: Coloured cement grout

Source: `museum-7-grout.ts:85`

- Years: The 1970s
- What: Cement grout, pigmented to match the coloured bathroom suites of the decade. Avocado was among the defining colours of the British suite.
- Benefits: It matched the suite. In every other way, a cement grout.
- Drawbacks: In every way, a cement grout. Pigment can set patchy or fade.
- Reverence: The museum presents this specimen without comment.

#### Plaque 6: Latex- and polymer-modified cement grout

Source: `museum-7-grout.ts:99`

- Years: From about the 1960s to today
- What: Installers mixed cement grout with a latex admixture in place of water; it later came premixed from the factory, and is now the most popular kind.
- Benefits: Denser and less absorbent. A better bond.
- Drawbacks: Still cement. Still attacked by aggressive water and acid cleaners.
- Reverence: It made cement better, and did not pretend otherwise.

#### Plaque 7: Furan resin grout

Source: `museum-7-grout.ts:113`

- Years: From the 1940s
- What: A reaction-resin grout of great chemical resistance, laid in dairies, chemical plants and some pools.
- Benefits: Resists acids and solvents. Hard-wearing.
- Drawbacks: Difficult to apply. Generally black.
- Reverence: Furan grouts are generally black. The museum regrets that its specimen is not.

#### Plaque 8: Epoxy grout

Source: `museum-7-grout.ts:125`

- Years: From the 1940s; in pools from about the 1960s
- What: Epoxy emulsion grouts came in the 1940s, true epoxy grouts into general use by about the 1960s and 70s. Class RG under BS EN 13888: the pool’s choice where the water is soft or aggressive; some are rated for seawater.
- Benefits: Impervious, hygienic and easy to clean. Resists pool chemicals and acid cleaners.
- Drawbacks: Costly; two parts, a short pot life, unforgiving to lay. The pool waits at least 21 days to be filled.
- Reverence: It is what the water deserves.

#### Plaque 9: Improved cement grout, CG2WA

Source: `museum-7-grout.ts:142`

- Years: Today
- What: BS EN 13888’s class CG2, improved, with reduced water absorption (W) and high abrasion resistance (A); often with mould inhibitors, some rapid-setting.
- Benefits: Takes up less water. Suits pools with balanced, hard water, and their surrounds.
- Drawbacks: Still cement where the water is aggressive. The pool waits three weeks to fill (BS 5385-4).
- Reverence: The old way, made as good as it can be.

#### Plaque 10: Coda: the movement joint

Source: `museum-7-grout.ts:159`

- Years: Wherever a pool must move
- What: A flexible sealant (silicone, polysulphide or polyurethane) at perimeters, changes of plane and over the structure’s joints, to BS 5385-4. In this specimen, one joint is sealant.
- Benefits: Lets the tiling move. Keeps the grout from cracking.
- Drawbacks: Not grout. Must be renewed in its time.
- Reverence: Not grout. But grout could not do its work without it.

### Closing card (by the way out)

Source: `toolkit/gallery/logic/museum-7-grout.ts:201` (`CLOSING_CARD`), drawn at `hall-7-grout.ts:537`

- Next time you swim, look down. The grout is looking after you.

## Hall 8: Never again: putting safety first

Hall 8's exhibit is installed (`toolkit/gallery/rooms/museum/hall-8-never-again.ts`, 107i). The story is fiction; every real-world claim is traced in `doc/research/pool-chlorine-releases.md`.

### Title on the street wall (the hall's brief)

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); `toolkit/gallery/logic/museum-plan.ts:305` (`waiting(8)`)

- Number: 8
- Title: Coming soon
- Subject: Its theme is still to be chosen
- Footer: PLANTROOMS · How a swimming pool really works

The brief has not been updated for the exhibit, so the street wall, the route strips and the doorway signs in Halls 7 and 9 still say "Coming soon".

### Opening panel (by the way in)

Source: `toolkit/gallery/logic/museum-8-incident.ts:191` (`OPENING`), drawn by `paintOpening` (`hall-8-never-again.ts:209`) at `:474`

- Kicker: HALL 8
- Title: Never again: putting safety first
- Big idea: Two of the chemicals that keep a pool safe must never meet. Mixed, they make chlorine gas. This is the story of a morning when they did.
- Assumes: Pools are dosed with sodium hypochlorite, to disinfect, and with acid, to hold the pH. Both are delivered by tanker into bulk tanks.
- Fact: “The accidental addition of acid to hypochlorite is the commonest cause of chlorine release incidents in pool buildings.” HSE inspector, 2023.
- Own voice: Deliveries are one of the moments it can happen.
- Try it: Press HEAR WHAT HAPPENED and follow the story round the walls. Then look in the case: could you connect the wrong hose?
- Footer: Sponsored by Chlorella Chemicals. A dramatisation based on real incidents. The people, places and newspaper are fictional. (`SPONSOR.maker` and `DRAMATISATION`, `museum-8-incident.ts:14`)

### The narration button

Source: `toolkit/gallery/rooms/museum/hall-8-never-again.ts:532`, `:540`

- Legend: HEAR WHAT HAPPENED
- Under it: PUSH · AGAIN TO STOP

### The chapters round the walls

Source: `toolkit/gallery/logic/museum-8-incident.ts:53` (`CHAPTERS`). Each chapter has a photograph placeholder (`paintPlaceholder`, `hall-8-never-again.ts:115`: time, title, `photograph to come`, caption), a newspaper clipping where there is one (`paintClipping`, `:139`: THE PELLINGFORD EVENING LAMP, date, `{page} · 28p`, headline, standfirst, body; paper from `PAPER`, `museum-8-incident.ts:18`), and a plaque (`paintPlaque`, `:186`: `{n} · {time} · {title}`, What went wrong, then `Lesson: ` and the lesson). The Narration is the script read aloud by the HEAR WHAT HAPPENED button: one clip `resources/sound/voice/never-again/account.mp3`, or `chapter-1.mp3` to `chapter-6.mp3`, none recorded yet; a reading copy is kept in `resources/sound/voice/never-again/index.md`, so an edit here must be made there too. Each chapter lights for 20 seconds (`CHAPTER_SECONDS`).

#### Chapter 1 · 07:42 · The delivery

Source: `museum-8-incident.ts:55`

- Photograph caption: The tanker at the loading bay, before the duty technician’s shift began.
- What went wrong: The tanker came early, its driver new to the site. Nobody met it. The two fill points stood side by side in an open recess.
- Lesson: Every delivery is met by a trained member of staff, who checks the delivery note against the tank before anything is connected.
- Clipping: Tuesday, 15 April 1997 · Page 1
  - Headline: GAS ALERT AT THE BATHS
  - Standfirst: Swimmers led out into the car park as fumes spread through leisure centre
  - Body: Early swimmers and staff were led out of Pellingford Baths this morning after a cloud of choking gas was released in the plant room. / Fire crews in protective suits were called to the building shortly after eight o’clock. Several people were treated at the scene for breathing difficulties. / The centre will stay closed while the cause is investigated.
- Narration: Pellingford Baths, a spring morning in 1997. At seventeen minutes to eight a chemical tanker pulls into the loading bay. It is early. The duty technician has not yet started his shift, and the driver has never been here before. Nobody comes out to meet him.

#### Chapter 2 · 07:51 · The mix-up

Source: `museum-8-incident.ts:80`

- Photograph caption: Two identical couplings, their labels faded to nothing.
- What went wrong: The two fill points had the same coupling, so either hose fitted either. Four hundred litres of acid went into the hypochlorite tank.
- Lesson: Fill points must be impossible to confuse: a different coupling for each chemical, labelled and locked.
- Clipping: Wednesday, 16 April 1997 · Page 1
  - Headline: WHO CHECKED THE TANKER?
  - Standfirst: Questions for the council as it emerges no member of staff met yesterday’s delivery
  - Body: The tanker that delivered chemicals to Pellingford Baths arrived before any technician was on duty, the Lamp can reveal. / Acid is understood to have been pumped into a tank holding sodium hypochlorite, the bleach-like liquid used to keep the water clean. / A council spokesman said a full inquiry was under way.
- Narration: Two fill points stand side by side in an open recess: one for acid, one for sodium hypochlorite. They have the same coupling, and their labels faded long ago. The driver connects his acid hose to the hypochlorite fill. Four hundred litres of acid go into the bulk hypochlorite tank.

#### Chapter 3 · 07:58 · The gas

Source: `museum-8-incident.ts:104`

- Photograph caption: The plant room: a haze at the tank’s vent, and the gas detector’s cable hanging loose.
- What went wrong: Acid and hypochlorite together give off chlorine gas. The plant room’s gas detector had been disconnected after false alarms.
- Lesson: Chlorine gas detection in the plant room and the stores, with an alarm and ventilation, kept working.
- Clipping: Tuesday, 15 April 1997 · Page 3
  - Headline: ‘IT CAME UP LIKE A GREEN FOG’
  - Standfirst: Swimmer tells of the moment the gas reached the pool hall
  - Body: “There was a smell like strong bleach, then everyone was coughing,” said a swimmer who had been in the water since seven. / “A lifeguard blew the whistle and told us all to get out. Nobody stopped to get changed.” / Chlorine gas is heavier than air and gathers in low places.
- Narration: Mixed, acid and hypochlorite give off chlorine: a choking, yellow-green gas, heavier than air. It rises from the tank’s vent into the plant room, and the air handling draws it towards the pool hall. The plant room’s gas detector should have raised the alarm. It had been disconnected, weeks before, after false alarms.

#### Chapter 4 · 08:05 · The evacuation

Source: `museum-8-incident.ts:128`

- Photograph caption: The car park: swimmers in foil blankets, fire crews in gas-tight suits, the tanker still at the bay.
- What went wrong: The early swimmers and staff got out, and a handful were treated for breathing difficulties. Nobody died. There was no rehearsed plan: it could have been so much worse.
- Lesson: A written, rehearsed emergency and evacuation plan. In a real incident in 2022, about 200 people were evacuated and 29 taken to hospital.
- Clipping: none
- Narration: A lifeguard clears the pool. Swimmers and staff stand in the car park in foil blankets while fire crews in gas-tight suits go in. A handful are treated for breathing difficulties. Nobody dies. But there was no plan, and nobody had practised one.

#### Chapter 5 · Weeks later · The inquiry

Source: `museum-8-incident.ts:142`

- Photograph caption: A closed sign on the front doors.
- What went wrong: The inspectors found no risk assessment for deliveries, untrained staff at the chemicals, and a contractor nobody had checked. The council was fined £40,000 and the baths shut for six weeks.
- Lesson: Only trained, competent people handle pool chemicals, under a risk assessment, as a 2021 case prosecuted by HSE showed again.
- Clipping: Friday, 2 May 1997 · Page 5
  - Headline: BATHS SHUT FOR SIX WEEKS
  - Standfirst: Inspectors’ report finds no checks on deliveries and staff untrained
  - Body: Pellingford Baths will stay closed until June while the plant room is rebuilt, the council confirmed last night. / Inspectors found that no risk assessment had been made for chemical deliveries and that staff had not been trained to handle the chemicals. / The council now faces prosecution.
- Narration: Weeks later, the inspectors report. There was no risk assessment for deliveries. The staff had not been trained to handle the chemicals. Nobody had checked the contractor. The council is fined forty thousand pounds, and the baths are shut for six weeks.

#### Chapter 6 · The changes · Never again

Source: `museum-8-incident.ts:166`

- Photograph caption: The new fill cabinet: a different coupling for each chemical.
- What went wrong (here, what changed): Separate lockable cabinets, a different coupling for each chemical, clear labels, every delivery met, gas detection with an alarm, and separate bunded stores.
- Lesson: Make the mistake impossible: the plant room you have just walked through is built this way.
- Clipping: Thursday, 12 June 1997 · Page 7
  - Headline: NEW SAFETY RULES AFTER BATHS SCARE
  - Standfirst: Pellingford Baths reopens with rebuilt plant room
  - Body: Pellingford Baths reopened this morning with a rebuilt chemical store, new gas alarms and fill points that cannot be mixed up. / Every delivery will now be met by a trained member of staff. / “It must never happen again,” said a council officer.
- Narration: Pellingford Baths reopened with its fill points rebuilt: a different coupling for each chemical, each in its own locked cabinet, clearly labelled. Every delivery is met. The gas detector works, and the stores are apart. The fix is to make the mistake impossible. Never again.

### The central case

Source: `toolkit/gallery/logic/museum-8-incident.ts:204` (`CASE_PLAQUES`), drawn by `paintCaseCard` at `hall-8-never-again.ts:681` to `:699`

- Card 1, title: Before (1997)
- Card 1, body: Two identical 2-inch camlocks in an open recess, their labels faded blank. Either hose fitted either point.
- Card 2, title: The fix: make the mistake impossible.
- Card 2, body: After a fatal mix-up at a German chemical depot in 2007, the hypochlorite fill was given left-hand threads so no other hose could fit, and every fill point was locked and labelled.
- Card 3, title: After (now)
- Card 3, body: Hypochlorite: a 2-inch brass camlock. Acid: a 1½-inch polypropylene Guillemin. Each in its own lockable cabinet, colour-coded and labelled. The acid’s hose cannot couple to the hypochlorite’s port.
- Card 4, title (written in the scene, `hall-8-never-again.ts:699`): Museum specimens
- Card 4, body: Museum specimens: connected to nothing. You will find these in the leisure centre’s own loading bay.
- Labels in the case (`hall-8-never-again.ts:620`, `:623`): SODIUM HYPOCHLORITE · 2" CAMLOCK; HYDROCHLORIC ACID · 1½" GUILLEMIN
- Plinth mark (`hall-8-never-again.ts:582`): PLANTROOMS

### Chlorella’s sponsor panel

Source: `toolkit/gallery/logic/museum-8-incident.ts:221` (`SPONSOR`), drawn by `paintSponsor` (`hall-8-never-again.ts:288`) at `:479`

- Maker: Chlorella Chemicals
- Slogan line: Clear water, clear conscience · Since 1956
- Headline: Never again: putting safety first.
- Pride: Chlorella is proud to support this exhibition.
- Heading: THE LESSONS
- 1: Accidentally adding acid to hypochlorite is the commonest cause of chlorine releases in pool buildings.
- 2: Fill points cannot be confused: a different coupling for each chemical, labelled and locked.
- 3: Every delivery is met by trained staff, who check the note and the tank before anything is connected.
- 4: Only trained, competent people handle pool chemicals.
- 5: Acid and hypochlorite are stored apart, each in its own bund.
- 6: Chlorine gas detection, alarmed, with ventilation.
- 7: A written, rehearsed emergency plan.

## Hall 9: The whole plant

Hall 9, the finale, has no exhibit yet: it shows the coming-soon panel, its title and the closing words.

### Title on the street wall

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`); `toolkit/gallery/logic/museum-plan.ts:404` (`HALL_BRIEFS.museum9`)

- Number: 9
- Title: The whole plant
- Subject: Control and fault finding
- Footer: PLANTROOMS · How a swimming pool really works

### The coming-soon panel

Source: `toolkit/gallery/views/museum-hall.ts:898` (`paintComingSoon`); `toolkit/gallery/logic/museum-plan.ts:404` (`HALL_BRIEFS.museum9`)

- Header: 9, The whole plant, Control and fault finding
- Kicker: EXHIBIT COMING SOON
- Will show: A working model of an entire swimming pool, all of its major components put together, with a mimic of the whole system, an alarm panel and its alarms.
- THE BIG IDEA: Every part you have met works together, and when something goes wrong the plant tells you: if you know how to listen.
- YOU WILL BE ABLE TO TRY: Press the fault button to cause a random fault somewhere in the plant. / Read the alarms and the mimic, and track down what has gone wrong. / Put it right, reset the alarms, and try another.
- Route strip, with "You are here" over 9.

### Closing words (end wall, on the street wall)

Source: `toolkit/gallery/views/museum-hall.ts:1203` (`paintEndWall`)

- Heading: Thank you for visiting
- Under it: PLANTROOMS: how a swimming pool really works (`MUSEUM_EXHIBITION.name` and `.subtitle`, lower-cased)
- Body: Now you’ve seen it, now you understand how a swimming pool works, you probably won’t take it for granted anymore, will you? The way out is straight on, into the welcome hall.
- Hashtag: #FindThePlantRoom

## Shared across halls

### Signs over the archways

Source: `toolkit/gallery/views/museum-hall.ts:977` (`paintArchHeader`). Over each archway, on the visitor's side, a sign names the hall beyond, with its number in a disc and an arrow. The words are the hall beyond's title and subject from `HALL_BRIEFS` (`museum-plan.ts:320`); the small line above them is fixed:

| Archway                         | Small line                        | Title and subject                                                                     |
| ------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| The way on, from Halls 1 to 8   | NEXT EXHIBIT                      | the next hall's title and subject                                                     |
| The way back, from Halls 2 to 9 | BACK TO                           | the previous hall's title and subject                                                 |
| From Hall 1 back into Hall 0    | BACK TO THE                       | Welcome hall / Behind the tiles                                                       |
| From Hall 9 on into Hall 0      | THE WAY OUT · BACK TO THE         | Welcome hall / Behind the tiles                                                       |
| From Hall 0 (see Hall 0)        | THROUGH HERE; THE ROUTE ENDS HERE | What’s behind the tiles / 1 · Warm water; The whole plant / Control and fault finding |

So, with today's briefs, a visitor reads (title / subject): Warm water / Heating, energy and a first pump; Clean water / Filtration and backwash; Safe water / Automatic disinfection; The chemistry of pools / A hands-on chemistry lab; Coming soon / Its theme is still to be chosen (Halls 5 to 8); The whole plant / Control and fault finding.

### Each hall's street-wall title

Source: `toolkit/gallery/views/museum-hall.ts:1045` (`paintHallTitle`): the number, the brief's title and subject, an accent bar, and the line `PLANTROOMS · How a swimming pool really works` (`MUSEUM_EXHIBITION.name` · `.subtitle`). Given under each hall above.

### The route strip

Source: `toolkit/gallery/views/museum-hall.ts:848` (`routeStrip`), on the welcome panel and every coming-soon panel: halls 1 to 9 as numbered discs, each titled where its brief is themed (`HALL_BRIEFS[...].themed`), and `You are here` over the current hall.

### The coming-soon panel's fixed words

Source: `toolkit/gallery/views/museum-hall.ts:898` (`paintComingSoon`): EXHIBIT COMING SOON; THE BIG IDEA; YOU WILL BE ABLE TO TRY. The waiting brief (`museum-plan.ts:305`, `waiting`) is given under Hall 6.

### Placards, entrance panels, activity cards and RESET

Source: `toolkit/gallery/views/museum-exhibit.ts`

| Item                                   | Line             | Fixed text                                                        |
| -------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| Placard (`paintPlacard`)               | `:209`, `:222`   | Did you know? (before the fact); TRY IT                           |
| Entrance panel (`paintEntrance`)       | `:317`           | FOLLOW THE WATER                                                  |
| Activity card (`paintActivity`)        | `:363`           | ACTIVITY CARD                                                     |
| RESET pedestal (`createResetPedestal`) | `:466`, `:474`   | RESET SIMULATION; PUSH                                            |
| Pump station (`createPumpStation`)     | `:537` to `:601` | RUN, START, STOP, TRIPPED, RESET, `{tag}  CIRCULATION PUMP`, PUSH |

The RESET sign's words (`RESET_SIGN`, `toolkit/gallery/logic/ideal-pool-plant-placards.ts:273`), shared by Halls 1 to 6: Headline: Don’t worry, you can’t break anything! Body: This is a simulation. If you get the plant into a muddle, press this button and everything goes back to the start.

### Mimic buttons and readings

The mimics of Halls 1 to 3 carry the speed buttons ×1, ×60, ×600 and ×3600 under the caption TIME (Halls 4 and 6 have none on the mimic), and every mimic has a mode button READINGS.

### Safety and services in every hall

Source: `toolkit/gallery/views/museum-safety.ts`, placed by `toolkit/gallery/logic/museum-safety.ts`

| Item                                                   | Where                                                               | Source                                                                                     | Text                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Please do not touch" notice                           | at each exhibit hall's way in (Halls 1 to 9)                        | `museum-safety.ts:240` (`do-not-touch`)                                                    | Please do not touch / except where you / see the hand sign                                                                                                                                                                                                                                                                                                                                                                    |
| Exit signs, over each way out and hung along each hall | every hall                                                          | `toolkit/components/general-safety/views/escape-signs.ts:137` (`createEscapeSign`)         | FIRE / EXIT, with an arrow                                                                                                                                                                                                                                                                                                                                                                                                    |
| Fire alarm call point                                  | beside each hall's way out                                          | `toolkit/components/fire/views/fire-fittings.ts:67` (`createCallPoint`)                    | FIRE / PUSH HERE                                                                                                                                                                                                                                                                                                                                                                                                              |
| Fire point board                                       | the odd-numbered halls (`FIRE_POINT_HALLS`, `museum-safety.ts:297`) | `toolkit/components/fire/views/detection-and-exits.ts:185`                                 | FIRE POINT; extinguishers WATER and CO2 (`fire-fittings.ts:745`)                                                                                                                                                                                                                                                                                                                                                              |
| Fire action notice, on the fire point board            | the odd-numbered halls                                              | `toolkit/components/general-safety/views/safety-notices.ts:337` (`createFireActionNotice`) | FIRE ACTION / If you discover a fire: 1 Raise the alarm at the nearest fire alarm call point. 2 Call the fire brigade: dial 999. 3 Tackle the fire only if trained and it is safe to. / On hearing the alarm: 1 Leave by the nearest exit. Help bathers out of the water. 2 Close doors behind you. Do not use the lifts. 3 Do not stop for belongings. Do not go back in. / Assembly point: Assemble at: Car park, east side |

The fire action notice is the leisure centre's, shared with the game's plant rooms ("Help bathers out of the water", "Car park, east side"): it reads oddly in a fourth-floor museum, and changing it changes it everywhere.

### Not for visitors

The dev panel and room readout name each hall `MUSEUM0 · PLANTROOMS · 0 WELCOME` and so on (`hallName`, `toolkit/gallery/logic/museum-plan.ts:423`); listed only so it is not mistaken for a missing sign.

## Gaps and loose ends found while extracting

- Halls 4 and 6 are built but not installed: their exhibits (`hall-4-chemistry.ts`, `hall-6-world-of-pumps.ts`) are not in `HALL_EXHIBITS` or `EXHIBIT_HALLS`, so a visitor sees the coming-soon panel and benches there.
- The briefs for Halls 5 to 8 (`museum-plan.ts:400` to `:403`) are still `waiting(n)`, though Halls 5, 7 and 8 have exhibits and Hall 6 one built: their street-wall titles, the route strips and the neighbouring doorway signs say "Coming soon / Its theme is still to be chosen". Hall 7's own title wall says "Grout: The Unsung Hero of the Aquatics World" while the street-wall title in the same hall says "Coming soon". Hall 4's brief still describes its exhibit in the future tense ("A set of ideal tanks …").
- The welcome panel says "THE ROUTE: FIVE HALLS ROUND THE COURTYARD, AND BACK HERE" (`museum-hall.ts:1168`), but the ring has nine exhibit halls.
- The entrance panels' fixed heading is "FOLLOW THE WATER" in every hall, including Hall 5 (photographs) and Hall 4 (chemicals).
- Hall 2's reset line says "RESET button" where every other hall says "RESET SIMULATION button".
- Hall 1, placard 6's fact, "Swimmers splashing roughly 2× the evaporation", seems to lack a verb.
- Hall 8's narration exists twice: in `museum-8-incident.ts` (`narration`) and as a reading copy in `resources/sound/voice/never-again/index.md`.
- Not extracted: the inspect overlay's names and status lines (`markComponent`), for example "Ideal pool (25 × 12.5 m, 470 m³)" or "Losses board (the museum’s model of the heat balance, no real plant measures these)"; maker's badges and model plates on equipment (Hamwarmy, Trager-Feinstein, Penfold Controls and others); the dosing controller's own menus and codes in Hall 3 (SEt, XP, tn, E dt, from `toolkit/components/plant/logic/dosing-controller.ts`); and the gauges' and meters' scale markings. Generic components shared with the rest of the game (boiler controls, pump faces, the twin-head pump's display) may carry further short legends not listed here.
