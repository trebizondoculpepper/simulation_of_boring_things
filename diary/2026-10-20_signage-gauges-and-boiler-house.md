# Development Diary Entry - 2026-10-20

## Context

| Time      | Branch | Commit        | Task                                                            |
| --------- | ------ | ------------- | --------------------------------------------------------------- |
| 11:00 UTC | main   | after e2810d7 | Signage room, dial gauges, small controls, working boiler house |

## What we were asked to do

The owner wanted labels with a DIY feel as well as formal ones (marker on duct tape through to engraved brass with the maker's logo, plus stencils), a dev room for signage, the pump's gauges as reusable components, the boilers' control panels modelled on real displays and buttons, a gas circuit mimic and gas isolating valves, and every button and rocker modelled as a component and shown in dev0 (gas valves excepted: they belong to a future gas plumbing room).

## What we did

Added hand labels (`hand-labels.ts`: tape, pipe flow tape, Dymo, tie tags, in the bundled Permanent Marker font, Apache 2.0) and formal signs (`plant-signs.ts`: engraved laminate, brass plates with brand marks, stamped valve tags, laminated notices, handwritten sheets, spray stencils), shown in dev13. Wrote a live EN 837-1 dial gauge (pressure, compound, bimetal thermometer) that every plant gauge now uses, tried on dev0's DIAL GAUGES board and driven on the circulation pumps. Modelled the boiler house as logic (`boiler-house.ts`: each boiler's purge, ignition, firing, lockout and Remeha-style status codes; the gas house's ECV, SSOV, emergency stop and detection), a period Remeha-style boiler panel with shared membrane keys and illuminated rockers (`small-parts.ts`, on dev0's SMALL CONTROLS board), a gas ball valve (`gas-fittings.ts`), and a gas mimic board, and wired dev_boiler so that the stop, valves and detector really stop the boilers. Fixed the flue's corner with a radiused bend. Researched Benfield Control Systems' panels for the next pass on mimics and annunciators.

## Outcome

All five checks pass (476 tests). Striking the emergency stop in dev_boiler shut the safety valve, dropped the gas to zero and locked both boilers out, flashing E 02, as tested. Plant rooms merged the stock parts' geometry, so their buttons could not be clicked; clickable parts of live exhibits are now kept out of the merge.

## What we learned

The current Gas 220 Ace has a colour touchscreen, so the period panel had to come from its predecessor, the Gas 310 ECO. Benfield Control Systems is a US switchgear panel builder, not a UK firm; its photographs still give good mimic and annunciator detail.
