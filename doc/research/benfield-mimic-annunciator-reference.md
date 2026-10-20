# Benfield Control Systems: mimic panel and annunciator reference

Research note for the control room's mimic boards and alarm annunciator. Compiled 2026-10-20 from Benfield's own web pages and the photographs on them. No images were copied into the repository; each is linked and described in words.

## Contents

- [Who Benfield is (a correction)](#who-benfield-is-a-correction)
- [What the pages state](#what-the-pages-state)
- [The photographs, described](#the-photographs-described)
- [1. Mimic panels](#1-mimic-panels)
- [2. Annunciators](#2-annunciators)
- [3. Internals: behind the door](#3-internals-behind-the-door)
- [4. Period and UK context](#4-period-and-uk-context)
- [5. Modelling recommendations](#5-modelling-recommendations)
- [Sources](#sources)

## Who Benfield is (a correction)

The brief says Benfield Control Systems is a UK company. It is not. Benfield Control Systems, Inc. (BCS) is based in Mount Vernon, New York (240 Washington St., Mt. Vernon, NY 10553), with a second office in White Plains, NY. It was established in 1978 and is a wholly owned subsidiary of Benfield Electric Supply Company, Inc. It builds UL508A control panels, and its mimic panels are switchgear breaker-control panels for American medium- and high-voltage power distribution, many for Con Edison (New York's utility). The group does have a UK arm, Benfield Electric Europe Limited of Rochdale (Companies House no. 02643271, formerly Benfield Electric Limited), but its page is about electrical supply and says nothing about mimics or annunciators. I searched for a UK "Benfield" maker of mimics or annunciators under several spellings and on Companies House, and found none.

Benfield's site has no annunciator product page, no mosaic-tile system, no datasheets and no PDFs about mimics. What it does have is a handful of good workshop photographs, front and back, of real hard-wired mimic panels, one of which carries a 56-window annunciator. Those photographs are the useful material, and most of this note describes them. Numbers marked "est." are my estimates, scaled from the photographs. They are not stated anywhere.

## What the pages state

These are the only statements Benfield's pages make about mimics. All are quoted or closely paraphrased.

- "Benfield Control Systems will design and fabricate UL508A mimic panels to safely control and monitor MV and HV circuit breakers in your power distribution system." (Mimic Panels page.)
- "These panels can be either hard wired or PLC/HMI based depending on the application, your industry, and your exact requirements." (Mimic Panels page.)
- Benfield's engineers supply "the design, software development and point to point interconnect diagrams", plus field service for start-up and commissioning. (Mimic Panels page.)
- Its project list includes "ConEdison EO-2022 medium voltage switchgear and secondary paralleling gear as well as power monitoring and mimic panels", and "switchgear, motor control centers, mimic panel, PLC for 5 breaker control system (Main, Tie, Main, Gen 1, Gen 2)". (Projects page.)
- Its protective relay panels promise that "all wiring is labeled and done to our engineered plans", and are witness-tested in the factory. (Protective Relay Panels page.)
- It builds NEMA 4X panels for corrosive environments and NEMA 6P panels for submersible use, and offers stainless steel. (Products page.) This matters for a pool plant: a chlorine-laden plant room is a corrosive environment.

The pages give no sizes for windows, lamps, lines or tiles, and they name no alarm sequences.

## The photographs, described

All are on benfieldcontrolsystems.com under `/wp-content/uploads/`. The EXIF data of the 2018 set dates the photographs to 9 November 2015 (Canon EOS Rebel T3i).

| Image | What it shows |
|---|---|
| [mimic1.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic1.jpg) | A free-standing two-door switchgear mimic, front, in the workshop. A 56-window annunciator at top left, a black single-line bus diagram, breaker control switches with four pilot lights above each, and a row of pushbuttons. |
| [mimic2.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic2.jpg) | The same panel opened. The back of the annunciator and of every lamp and switch is on the doors, and eight vertical terminal rails stand on the back panel. The best image for an opened door. |
| [mimic.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2021/02/mimic.jpg) | "SWITCHGEAR SWGR-1 BREAKER CONTROL AND STATUS PANEL" for Con Edison. A two-door free-standing enclosure on legs, with a blue bus diagram, transformer and pump symbols, and green/amber/red lamp clusters. Portrait, 960×1280. |
| [mimic4.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic4.jpg) | A hybrid panel: a red-line mimic of breaker switches on the left door, and two Allen-Bradley PanelView touch screens on the right door. A Benfield nameplate is at the top left. |
| [mimic5-1.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic5-1.jpg) | The inside of the PLC-driven version. Allen-Bradley ControlLogix racks, I/O cards, DIN-rail terminals, grey slotted wiring duct, and a mimic door with 16 switch bodies wired in blue. |
| [mimic3.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic3.jpg) | "TRACK 2", a brushed-aluminium engraved mimic plate on a grey enclosure door. Line drawings of switches and resistors, rows of amber and red/green pilot lights, key switches, a transfer key block and printed instructions. |
| [bridge2.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/bridge2.jpg) | A stainless desk-style console for a movable bridge, its sloping lid propped open. The back of every lamp and switch is wired in red, with a PLC and terminal rails in the tub beneath. |
| [bridge1.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/bridge1.jpg) | The same kind of console seen from the front: brushed stainless, engraved labels, red/green/amber lamps, selector switches, an analogue meter and a mushroom emergency stop. |
| [epo11.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/epo11.jpg), [epo2.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/epo2.jpg) | A yellow Emergency Power Off (EPO) relay panel, shown front and inside. The front has pilot lights and selector switches with small labels above each; the inside has rows of relays and contactors on DIN rail. |
| [relay1.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/relay1.jpg) | A small wall-hung relay panel, open. Its door carries a three-lamp cluster wired in red, and its back panel holds a terminal strip and contactors. |
| [prot1.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/prot1.jpg), [relay-1.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/relay-1.jpg), [relay2.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/relay2.jpg), [relay3.jpg](https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/relay3.jpg) | Protective relay panels. Tall grey free-standing panels covered in rack-mounted relays, test switches and red LED meters. The inside of one shows racks and terminal columns. |

## 1. Mimic panels

**Construction (observed).** Every Benfield mimic in the photographs is drawn directly on the steel door of an ordinary painted control-panel enclosure. None is a mosaic-tile board or a separate enamelled board. The enclosures are floor-standing, two doors wide, with lifting eyes on top. One stands on bolted leg kits and others on a plinth. Each has a three-point latch handle on the door edge. The finish is a light grey powder coat, which I judge to be ANSI 61 grey, the usual American switchgear colour (inference). From the pallets and door handles I estimate each enclosure at about 1.8 m wide × 1.8–2.1 m high × 0.5–0.6 m deep, with doors about 0.9 m wide (est.). Two other forms appear too. One is an engraved, brushed-aluminium plate fixed to the door (mimic3, "TRACK 2"), which is the engraved laminate style. The other is a stainless desk console with a sloping, hinged lid (bridge1/bridge2). There is no wall-hung mimic among the photographs. Benfield does not offer mosaic tiles at all. For that system, see the UK note in section 4.

**How the circuit is drawn (observed).** The bus and feeders are flat, applied strips of solid colour. In mimic1 they are black, in mimic4 red, and in mimic.jpg mid-blue with a thin white edge. I estimate them at roughly 10–15 mm wide for the bus and the same for the feeders (est.). They run only horizontally and vertically, with square tee-junctions, and short gaps where a switch interrupts the line. The symbols are kept to a minimum. In mimic.jpg a transformer is drawn as two interlocking rows of blue arcs (coil loops), and a pump as a solid blue disc about 90 mm across (est.), with white text such as "200 HP PUMP". Breakers are not drawn as symbols. The breaker control switch itself sits on the line, so the switch is the symbol. The labels are white engraved laminate plates with black capitals in a narrow sans-serif, for example "BKR 52-2A", "XFMR-PUMP #12", "VFD-PUMP #12" and "MAIN BREAKER A MCC (BUS A)". There is one plate per device, set just below its lamps. The title is a larger plate at the top: "SWITCHGEAR SWGR-1 / BREAKER CONTROL AND STATUS PANEL". Small plates above that carry the utility reference ("CON EDISON FOR NO. UTL-7079"). One feeder in mimic1 has a red plate, which marks a main or incoming breaker.

**What is inset (observed).** Above each breaker there is a cluster of pilot lights, each with a chromed or black bezel. The cluster is green, amber and red in mimic.jpg, and white, green, amber and red in mimic1. The lamps are the round 30 mm industrial type, with domed coloured lenses about 22–25 mm across (est.). Below the lamps sits a breaker control switch: a black square-faced rotary switch about 60–70 mm square (est.), with a pistol-grip handle and a small green/red flag window on its face. It turns left to trip and right to close, and in mimic1 and mimic4 it has a white legend plate beneath it. mimic1 has a row of eight black 22–30 mm pushbuttons under the annunciator. The left one is a white illuminated button, and a plate at the right end names the row. The legend is unreadable at this resolution, but I would guess the row is ACKNOWLEDGE / SILENCE / RESET / TEST and similar (inference). mimic3 adds key switches, a transfer-key interlock block with six coloured keys, and toggle switches marked OFF/ON. bridge1 adds an analogue panel meter of the 4½-inch switchboard type and a red mushroom emergency stop. mimic4 has two PanelView touch screens. No Benfield mimic shows LED bargraphs, seven-segment readouts or 3/5/10 mm LEDs. Its lamps are all full-size industrial pilot lights.

**Colours (observed, with inference).** On the Benfield breaker mimics the clusters are green, amber and red. The US switchgear convention is red for closed or energised, green for open, amber for tripped or alarm, and white for spring charged or available. That reading is my inference from standard practice. The pages do not say it.

**How indication is driven (stated).** The page says panels are "either hard wired or PLC/HMI based". The photographs show both. mimic2 is hard-wired: each lamp and switch is wired through looms to terminal rails, with no PLC in sight. mimic5-1 is PLC-driven: an Allen-Bradley ControlLogix with rows of I/O cards, and the same kind of switch door wired to it. The pages mention no serial-driven mimic.

## 2. Annunciators

Benfield publishes no annunciator product, datasheet, sequence list or rating. The only annunciator in its material is the one fitted to the mimic1 panel. What follows is observed from that photograph.

- **Grid.** The grid is 8 columns × 7 rows, which makes 56 windows. It sits in a black-framed bezel about 0.5 m wide × 0.45 m high (est.), mounted flush in the upper left of the left door.
- **Windows.** The windows are square, about 55–60 mm across (est.), separated by narrow dark mullions about 5 mm wide (est.). They are white or translucent milky white when unlit.
- **Legends.** Each legend is black capitals on white in two or three lines, with a smaller sub-legend line beneath. Examples that can be read are "52-1A TROUBLE", "52-2A TRIP", "BUS A", "BATTERY SYSTEM", "BATTERY CHARGER", "HVAC BATTERY ROOM", "ATS BUS A TROUBLE" and "SPARE". The bottom row ends in four SPARE windows. All windows are the same colour. Alarm colour comes from the backlight, or there is none, rather than from coloured lenses.
- **Top fitting.** There is a small red fitting at the top centre of the frame. It may be a sounder or a power lamp (unclear).
- **Controls.** The pushbutton row below the annunciator is presumably its control station (inference, see above). The panel has no separate horn, so the sounder is probably built in (inference).
- **Rear (mimic2).** The back of the annunciator is a single steel chassis, about the size of the window grid, bolted through the door. It holds a dense grid of black plug-in logic or LED cards in vertical slots, with green two-part pluggable terminal blocks along the card edges. Yellow and blue wires are laced into fans running to each block. Its shape is consistent with a modular, multi-point, card-per-window industrial annunciator of the Ronan, Ametek Panalarm or Rochester type, but the maker is not identified (inference).

Benfield's material does not cover ISA 18.1 sequences (A, M, first-out and so on), ratings, 16/24/32/48-way formats or window size options. For those, use an annunciator maker's datasheet, not Benfield.

## 3. Internals: behind the door

This is all observed, from mimic2, mimic5-1, bridge2, relay1 and epo2.

- **Everything on the door is wired on the door.** Lamps, switches and the annunciator are each fixed through the door skin. Their bodies stand proud of the back face by roughly 50–100 mm (est.).
- **Pilot lights from behind.** Each lamp shows as a small black rectangular contact or lamp block on its body. They stand in rows exactly matching the clusters on the front.
- **Breaker switches from behind.** Each switch is a black cylinder, about 60 mm in diameter and 80–100 mm long (est.), with a white end cap. They are wired by many small conductors with ring or fork terminals.
- **Looms.** Wiring is laced into neat looms with cable ties every 50–80 mm (est.). The looms follow the rows of devices horizontally and drop vertically to a trunk at the hinge side. In mimic2 the conductors are yellow and blue (in American practice, yellow usually marks a circuit fed from an external source and blue marks DC control, an inference). In mimic5-1 they are blue, and in bridge2 and relay1 red.
- **Hinge crossing.** The loom crosses from door to cabinet at the hinge inside black flexible protection: corrugated or split loom tube, about 25–30 mm in diameter (est.), in three or four loops so the door can swing.
- **Back panel, hard-wired (mimic2).** Eight vertical DIN-rail terminal columns, each nearly full height, stand on a grey sub-panel, with grey wire-duct strips between them. Every conductor arrives from the looms and lands on a grey terminal with a white marker. A single module sits at the top of one column, probably a power supply or a relay (inference).
- **Back panel, PLC-driven (mimic5-1).** This one is laid out in tiers. At the top are two ControlLogix chassis and a network switch. Below them is a long row of grey Flex or ControlLogix I/O modules with coloured front labels. Next comes a row of DIN-rail breakers and power supplies, and a row of terminals with fuses. At the bottom are columns of terminals and relay sockets for field wiring. The tiers are separated by horizontal grey slotted duct about 80–100 mm wide (est.). There is a duplex service socket at the bottom centre.
- **Document pocket.** A white plastic drawing pocket is fixed inside the right door, low down (mimic2 and mimic5-1).
- **Cable entry.** No photograph shows the gland plate. In the free-standing panels, field cables plainly come in through the open base or plinth into the terminal columns from below (inference).
- **Desk console (bridge2).** The sloping lid lifts on a hinge with stays. Its underside is a field of lamp and switch backs in a red-wired loom. Beneath it, the tub holds a PLC and vertical terminal rows.

## 4. Period and UK context

Every Benfield photograph was taken in 2015 or later. These are modern American panels. Even so, the hard-wired breaker-control mimic, with lamps, switches and a window annunciator, is a technology that changed little from the 1970s to the 2000s. mimic1 and mimic2 would look right in 2000 if the PanelView screens were left out. The giveaways of the modern era are the touch screens (mimic4), ControlLogix racks (mimic5-1) and LED pilot lamps. Around 2000 the lamps would more likely have been filament or neon lamps behind similar 30 mm lenses (inference).

**UK differences (inference unless stated).**

- **Mosaic tiles.** A UK leisure centre in 2000 would have had a British building-services or water-industry panel, not a US switchgear mimic. In the UK, large mimics were often mosaic-tile boards. L.B. Foster's Subklew SM24 is made in Nottingham, and its brochure states a "metal galvanised grid system" with "tiles, indicators, annunciators, and push buttons", a non-reflective surface, an MTBF of "2.5 million uses", and "over 40 years" of supply. The name implies a 24 mm grid, but the brochure gives no size. Automation Displays Inc. tiles are stated as 24 × 24 mm and 48 × 48 mm. For a pool plant, the usual form would be a painted or screen-printed panel on a motor control centre door, which is closer to Benfield's style than to mosaic.
- **Paint and labels.** BS 381C colour 631 light grey or RAL 7032/7035 would replace ANSI 61. Labels would be traffolyte, which is engraved white-on-black or black-on-white laminate.
- **"Egg boxes".** The Science Museum Group holds an annunciator from the Becca Hall, Leeds, National Grid mimic board. The record states it dates from circa 1980, measures 405 × 270 × 160 mm and weighs 6.65 kg, and that the board was in use until 1997. It also states that these annunciators were nicknamed "egg boxes". That nickname is a good model for a deep-celled British window annunciator.
- **Lamp colours.** In UK industrial (non-switchgear) practice, as in BS EN 60204-1, red means fault or danger, amber means warning and green means normal or running (inference from the standard, not from Benfield).

## 5. Modelling recommendations

These are aimed at `src/toolkit/components/industrial-control/views/mimic-board.ts`, `createAnnunciatorPanel` in `src/toolkit/components/industrial-control/views/cabinet-fittings.ts` and `createAnnunciatorAssembly` in `src/toolkit/components/plant/views/control-panels.ts`. All are inference drawn from the photographs.

1. **Lines: applied strips, not drawn infographics.** Real mimic lines are flat applied strips of one solid colour, about 10–15 mm wide, running only horizontally and vertically with square tees. They have no outlines, and their symbols are minimal. In the canvas, draw lines as thick flat strokes in one colour per system with butt caps and square joins. Make the symbols simpler and more stylised, like Benfield's solid pump disc with white text and its transformer of coil loops. Consider a 1–2 px light edge, as in mimic.jpg, and a slight relief, as on a raised strip.
2. **Labels: separate plates.** Each device's legend is a separate white engraved plate, about 15–20 mm high, with black narrow capitals, fixed just below the device. The board should carry a larger title plate at the top. `createMicroLabel` plates set slightly proud of the board, at z +1 mm, would read better than text painted into the texture. Use tag-number style ("P-01 PUMP", "52-1") for authenticity.
3. **Board: the door is the board.** Instead of an enamelled board in a dark frame, consider making the mimic the painted door of a grey free-standing cubicle (RAL 7035 or BS 381C 631), with a three-point latch handle and lifting eyes. The current framed board suits a wall-hung version. Both forms are real.
4. **Lamps: size, colour order and clusters.** Model industrial pilot lights as 30 mm bezels with domed lenses about 22 mm across. Put them in clusters, one per device, in a fixed colour order (green, amber, red, or for UK industrial practice red = fault, green = running). Use these on the main plant items. Keep the small inset LEDs (5 mm) for line-state dots along flow paths, which are a feature of late-1990s printed mimics. Lamps should be dark-tinted when off, not grey: each lens keeps its colour at about 25% brightness.
5. **Controls on the line.** Where a pump or valve can be operated from the board, put the control (a selector or pistol-grip switch) on the line, as Benfield does with its breaker switches. Do not gather the controls into a separate row. A HAND/OFF/AUTO selector under each pump's lamps would be period-correct.
6. **Readouts.** Benfield shows none, but a 2000-era UK building-services mimic plausibly had red seven-segment panel meters (DIN 96 × 48 mm bezels) set in the board. Keep the 4-digit LED readouts. The LCD legends could instead be engraved plates beside each meter, which would be more period-correct than small LCDs.
7. **Annunciator: grid and windows.** Real windows are square or near-square, about 50–60 mm. The current `ch = cell * 0.7` makes them landscape. Separate the windows with narrow dark mullions about 5 mm wide, and give them deep cells (an "egg box" depth of 20–30 mm). Use a white legend sheet with black two-line capitals and a smaller sub-legend line. Fill the unused cells with "SPARE" windows, since the grids are always oversized. 24 windows (6 × 4) is a plausible size, and 8 × 7 = 56 is the Benfield example. Colour from the backlight on a white window, rather than a pre-tinted lens, matches the photograph. A red (first row) / amber split is a convention some sites used and is fine as an option.
8. **Annunciator controls and sounder.** Put the ACCEPT / MUTE / RESET / LAMP TEST buttons in a single row of identical 22–30 mm buttons directly beneath the window grid, with one plate naming the row. A sounder built into the annunciator, or a small separate buzzer, is more typical than a large red horn. A horn on top is still plausible for a plant room.
9. **Opened door.** For an opened cubicle, model the following: the backs of the lamps as small black blocks and of the switches as black cylinders about 60 × 90 mm; laced looms in one wire colour, with ties every 60 mm, running along each device row and down to a hinge trunk; and two or three loops of black corrugated tube, 25 mm across, crossing at the hinge. On the back panel, put vertical DIN-rail terminal columns with grey duct between them, and a drawing pocket inside the door. The annunciator's back is a steel card cage of vertical black cards with green plug-in terminal blocks. For a hard-wired 2000 panel, add a row of plug-in relays (11-pin or square-base) and a small 24 V DC power supply on a top rail, and leave out any PLC rack. A PLC panel of the period would show a single rack.

## Sources

Benfield (primary):

- https://benfieldcontrolsystems.com/products/mimic-panels/
- https://www.benfieldelectric.com/benfield-control-systems
- https://www.benfieldelectric.com/benfield-products
- https://www.benfieldelectric.com/benfield-control-projects
- https://www.benfieldelectric.com/benfield-electric-europe
- https://www.benfieldelectric.com/gallery
- https://benfieldcontrolsystems.com/products/relay-panels/
- https://benfieldcontrolsystems.com/products/protective-relay-panels/
- https://benfieldcontrolsystems.com/products/plc-panels/
- https://benfieldcontrolsystems.com/products/movable-bridges/
- https://benfieldcontrolsystems.com/products/system-integration/
- https://benfieldcontrolsystems.com/project/
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic1.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic2.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic3.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic4.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/mimic5-1.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2021/02/mimic.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/bridge1.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/bridge2.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/epo11.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/epo2.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/relay1.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/prot1.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/relay-1.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/relay2.jpg
- https://benfieldcontrolsystems.com/wp-content/uploads/2018/06/relay3.jpg

Company identity:

- https://cisleads.com/company/details/4055
- https://growjo.com/company/Benfield_Control_Systems
- https://find-and-update.company-information.service.gov.uk/search/companies?q=benfield+control

UK and mosaic context (not Benfield):

- https://lbfoster.com/assets/brochures/lb-foster-subklew-sm24-mosaic-brochure.pdf
- https://lbfoster.com/en-gb/rail/technology-solutions/electrical-solutions/subklew-sm24-mosaic-mimic-system
- https://www.energy-xprt.com/products/adi-mosaic-mimic-panels-for-process-control-1092960
- https://collection.sciencemuseumgroup.org.uk/objects/co8415453/annunciator-panel
- https://collection.sciencemuseumgroup.org.uk/objects/co8415454/annunciator-panel
- https://www.acrastyle.co.uk/?p=198
