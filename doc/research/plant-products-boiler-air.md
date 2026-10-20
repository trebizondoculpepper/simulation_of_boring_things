# Boiler room and air handling: products modelled

Researched 2026-10-20 for the `dev_boiler` and `dev_air` development rooms (`src/toolkit/gallery/rooms/plant/boiler.ts`, `air.ts`; models in `src/toolkit/components/plant/views/boiler-plant.ts` and `air-handling.ts`). Each model is built at the size of the product named, under a maker of the game's own in that maker's livery (`brand-livery.ts`). Where a source gave no figure, the model's proportion is an estimate and is marked so.

## Boiler room

| Exhibit                       | After                                                                | Key dimensions                                                                                | Our maker        |
| ----------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------- |
| Condensing boilers in cascade | Remeha Gas 220 Ace, 160–300 kW (Baxi)                                | 800 W × 1662 H × 657 D mm; flue, flow/return and gas on top at the back (positions estimated) | Hamwarmy         |
| Low-loss header               | Hamworthy's sizing guidance: length 4 × diameter, flow under 0.5 m/s | DN200 × 1.0 m (sized, not one product)                                                        | Gorskiy          |
| Twin-head LTHW circulator     | Grundfos MAGNA3 D 65-120 F                                           | DN65, 45 m³/h, 12 m head; 340 mm port to port (as the DN65 D range), about 523 mm wide        | Grundflow        |
| Expansion vessel              | Reflex G 300                                                         | Ø634 × 1272 mm (6 bar version)                                                                | Hamwarmy         |
| Pressurisation unit           | Stuart Turner Mikrofill MIDI                                         | 504 H × 415 W × 270 D mm                                                                      | Hamwarmy         |
| Hot-water calorifier          | ICS Cool Energy Calorifier 1000                                      | overall Ø1000 × 1850 mm, cylinder Ø900 mm                                                     | Hamwarmy         |
| Gas meter                     | Itron (Actaris) G25 diaphragm meter, DN50                            | 335 × 457 × 289 mm, 280 mm centres (BK-G25/U40 listing)                                       | Trager-Feinstein |
| Gas safety shut-off valve     | Elektrogas VMR6 2"                                                   | 165 mm installation length (DN50)                                                             | Warden           |
| Dosing pot                    | Flamco 11 litre                                                      | Ø215 × 935 mm, ¾", 16 bar                                                                     | Gorskiy          |
| Gas detection panel           | Crowcon Gasflag single-channel                                       | 210 × 145 × 46 mm; methane head about 300 mm below the ceiling (Macurco guidance)             | Kessler-Moody    |
| Boiler house emergency stop   | generic red mushroom stop in a yellow enclosure                      | about 90 × 90 mm                                                                              | Hartwell & Bligh |

## Air handling

| Exhibit                     | After                                                       | Key dimensions                                                                                                                     | Our maker |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Pool hall air handling unit | Dantherm DanX 3/6 XWPS (plate heat exchanger and heat pump) | about 4135 W × 1960 H × 880 D mm, 1.3 t; sections and their widths estimated; control cabinet after Menerga's (900 × 480 × 210 mm) | Mistral   |
| Splitter attenuator         | typical rectangular splitter attenuator (Caice and others)  | 1200 mm long, 800 × 600 duct, 100 mm splitters (typical, not one maker's drawing)                                                  | none      |
| Changing area extract fan   | Systemair MUB 062 630D4 multibox                            | about 720 mm square (from its 718 mm outlet adapter), Ø630 connections, about 137 kg; length estimated                             | Bonk      |
| Weather louvre              | Gilberts WG75                                               | 75 mm pitch, 45° blades, 100 mm frame (Bridge Louvre BL75 proportions)                                                             | none      |

## Sources

- [Baxi: Remeha Gas 220 Ace](https://www.baxi.co.uk/commercial/our-solutions/gas-boilers/floor-standing-boilers/gas-220-ace)
- [Hamworthy: what is a low loss header](https://hamworthy-heating.com/articles/what-is-a-low-loss-header) and [how to size one](https://hamworthy-heating.com/articles/how-to-size-a-low-loss-header)
- [Grundfos MAGNA3 D 65-120 F datasheet (Bosta)](https://www.bosta.com/datasheet/download/3ae9ebb38da3e21041d2ec2d0e9bd06a); [MAGNA3 D 65-150 F, 340 mm port to port (Wolseley)](https://test1api.wolseleyexpress.com/en/GRU98126863)
- [Reflex G 300 (Pumps UK)](https://www.pumpsukltd.com/reflex-g-300-grey-standing-expansion-vessel-6-3-5-bar.html)
- [Mikrofill MIDI (BIMobject)](https://www.bimobject.com/en/stg/product/mikrofill-MIDI-pressurisation-unit-150-250)
- [ICS Cool Energy Calorifier 1000](https://www.icscoolenergy.com/it/assunzioni/prodotti/calorifier-1000/)
- [Itron/Actaris G25 and G40 brochure](https://www.euromekanik.se/app/uploads/brochure-itron-g25-g40-en-v3-0-2011-08.pdf); [BK-G25/U40, 280 mm centres (Bellflow)](https://www.bellflowsystems.co.uk/50mm-diaphragm-gas-meter-qmax-40m3-h.html)
- [Elektrogas VMR6 2" (Weinmann & Schanz)](https://www.weinmann-schanz.de/gb/en/Installation/Gas-fittings/Gas-solenoid-valves/Elektrogas-gas-solenoid-valves-type-VMR/Gas-solenoid-valve-VMR6-5-2-max-500-mbar-sid444297.html)
- [Flamco dosing pot 11 litre (Complete Pump Supplies)](https://www.completepumpsupplies.co.uk/flamco-dosing-pot-11-litre-16-bar)
- [Crowcon Gasflag](https://www.lavastica.com/fire-gas/Crowcon-Gasflag/); [Macurco boiler gas detection guide](https://www.carotek.com/userfiles/macurco/boiler-gas-detection-guide.pdf)
- [Dantherm DanX XWPS](https://www.danthermgroup.com/products/dantherm-danx-xwps/print); [Menerga technical catalogue](https://www.menerga.si/wp-content/uploads/2016/08/Menerga_TechnicalCatalog_2016.pdf)
- [Systemair MUB 062 outlet adapter (718 / 630)](https://shopstage.systemair.com/en/ccm--inlet--mub062--d630/p118291)
- [Bridge Louvre BL75 series](https://www.specifiedby.com/bridge-louvre-co/bl-75-series)
