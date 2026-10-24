# 050: The control room, fully live

Status: planned 2026-10-24, from the [wiring audit](../reports/wiring-audit-2026-10-24.md). Before, or as part of, the control room's rebuild: its boards should already tell the truth.

## Now

The control room reads the Olympic (pool_02) almost throughout: the lounge and jacuzzi appear only as temperatures, the footbath not at all. The heating mimic, the air mimic and some readouts are constants and formulas (045 fixes the smallest, 046 the heating). Eight annunciator windows can never light (boiler lockout, gas detected, LTHW low, chemical leak, fire alarm, pool alarm, generator running, spare). The annunciator's ACCEPT and RESET and the alarm printer's log are page state, timed by the page's clock. The BMS outstation, fire repeater and CCTV are painted.

## To do

- **Every pool**: the lounge's, jacuzzi's and footbath's circulation, chemistry, levels and alarms on the control room's boards and desk pages, each labelled; their pumps' starters worked from here as the Olympic's are.
- **Every annunciator window** fed by the world: boiler lockout and LTHW low (046), gas detected (the world's gas zones), chemical leak (the stores), fire alarm (053), pool alarm (a pool's own alarms), generator running (052); a spare left blank and labelled SPARE. Its ACCEPT, RESET and MUTE state in the world, so a second board or a reload agrees; the printer's log in the world, stamped with world time.
- **The BMS outstation**: its module lamps and comms from the world's plant (its points: the pumps, the boilers, the air units, the alarms), or retired.
- **The CCTV**: real views from cameras placed in the building (rendered small), or registered honestly as decorative.

## Acceptance

Every lamp, readout and button in the control room reads or works the world, for every pool; nothing scripted remains. Checks pass.
