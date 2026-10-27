# Control interface archetypes

One of the game's ideas is a deliberately wide range of control interfaces (the owner, 2026-10-27; and `CLAUDE.md`'s rule on technology spanning the 1980s to the late 2020s). Each control panel should be built after one of these archetypes, and a room's panels should not all be the same one. Add an archetype here when the owner approves a new one.

## 1980s large control panel

A big painted steel panel, front to back one view of the plant: a mimic line diagram, 30 mm pilot devices (lever selectors, lit push buttons, mushroom stops), moving-coil meters and annunciator windows, engraved traffolyte legends, Penfold's mark. One control does one thing. Examples: the pump panels, WH-CP1 (the wet hall's chemical distribution panel), the mimic boards.

## Early 2000s compact control panel

Approved by the owner, 2026-10-27, from mission 091's prototype: "a sort of early 2000s style compact control panel, which differs from the 1980s style big control panels". A small light grey operator terminal (the Penfold OT-216: 200 × 140 × 50 mm) with a 16 × 2 character STN LCD, RUN, CALL and ALARM LEDs, a membrane keypad (F1 MON, F2 SET, F3 CMD, ESC, ENTER, cursor keys in an inverted T) and a LOCAL ACCESS key switch, wired in conduit to a separate steel control box that holds the logic (door isolator, MCB, 24 V supply, a small controller with an LED per input and output, a comms module, interposing relays, field terminals, the wiring diagram in the door's pocket). The terminal only shows and sends; the box decides. Menus: monitor, set and command modes, a confirm step for commands, alarms breaking into the bottom line, a timeout that dims it, a power-up self test and NO COMMS when its link is lost. Built in `src/toolkit/components/industrial-control/logic/ot216-terminal.ts` and its views, the control box in `src/toolkit/components/plant/views/chem-control-box.ts`, on trial in dev44 and dev39 (mission 091). Use it for other compact controllers where a menu suits the job better than a wall of switches.

## Site-made box

A small enclosure made up by the site's own electrician: a standard grey steel box, a few heavy-duty devices on its door, its legends on embossed Dymo tape, only its warning a printed sticker. Example: the switch room's mains / generator changeover switch (the owner, 2026-10-27).

## Starship bridge touch station (parody)

Approved by the owner, 2026-10-27, for the control room (mission 092): the pool's operations in the manner of a late-1980s television starship's bridge: flat, sloping, touch-sensitive panels of colour-blocked rounded bars and buttons on black, each touch answered with a bleep, a station for each major system round the operator's chair, and a giant main screen ahead. In the game's own design, lettering and sounds, never another work's artwork, fonts, names or logos. The joke is the grandeur applied to a swimming pool.
