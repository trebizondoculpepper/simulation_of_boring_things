---
title: 'A bridge, a museum, and chemistry you can play'
date: '2026-10-31'
update_number: 3
status: published
previous_post: '2026_10_26_002_filters_fault_lights_and_a_plant_you_can_read.md'
coverage_start: '2026-10-26'
coverage_end: '2026-10-31'
from_commit_exclusive: '98cf707'
to_commit_inclusive: 'b883df97'
build_version: '0.8.0'
deployment_verified: true
deployment_note: 'Release v0.8.0 (tag v0.8.0, commit b883df97) published on GitHub Releases on 2026-10-31 at 17:00 UTC. The Release workflow (run 41222182601) checked the tag, published the GitHub release and pushed the web build to itch.io (salimfadhley/the-pool, channel html5, userversion 0.8.0); the itch.io page shows an update at 31 October 2026 17:00 UTC. Both desktop build jobs (ubuntu-latest and macos-latest) failed at "Package the desktop app", so the GitHub release has no installers attached. Releases v0.2.0 to v0.7.0 were cut in this period too; this post covers them all.'
published_at: '2026-10-31'
itch_url: 'https://salimfadhley.itch.io/the-pool/devlog/1742801/a-bridge-a-museum-and-chemistry-you-can-play'
---

# A bridge, a museum, and chemistry you can play

This update covers six days, 26 to 31 October, and seven releases, from v0.2.0 to today's v0.8.0, now on itch.io. It was begun as a post about the first two days and never went out, so it has grown into a general catch-up. The headline is a whole new wing: PLANTROOMS, a museum of pool plant in ten halls, where you can play with working miniature plant, fish treasure out of a skimmer and, in Hall 4, try to balance a pool's water on a set of glossy touch screens. Behind the control room door there is also a starship bridge, and the chemicals now travel through the building from the goods yard to every pool.

## PLANTROOMS, the museum

Take the new freight lift to floor 4 and you arrive in Hall 0, the welcome hall, with a painted pool lit by moving caustics from a ceiling projector and a welcome panel pointing you west into the exhibition. From there ten halls run round a courtyard, joined by big, tall industrial corridors with high arched windows, way-finding signs hung from the deck, and decals and framed pictures on their walls: die-cut cut-outs of boilers, filters and pumps, a Victorian baths, the plant below the waterline, and posters of pipe colours and valve specimens.

The halls that hold plant are working plant, each its own small simulation with its own pumps, valves, gauges and lamps:

- **Hall 1, Warm water**: heating a pool, with a losses board and a big pool temperature display.
- **Hall 2, Clean water**: filtration, laid out round the corner of the hall.
- **Hall 3, Safe water**: a closed dosing loop with a sample cell and a controller whose tuning menus are open to visitors, and a DPD test kit.
- **Hall 4, The chemistry of pools**: see below.
- **Hall 5, A Day in the Life**: thirty photographs of Reg the poolman, decade by decade from the 1920s to the 2020s, and a skimmer marked TRY ME.
- **Hall 6, Grundflow's Amazing World of Pumps**: six of the game's own pumps, smallest to largest, feeding a 1,000 litre test tank, with blue chaser LEDs running along the mimic the way the water goes.
- **Hall 7, Grout**: a black box of grout specimens on plinths in date order, each lit by a spotlight as you come near, with its own era's music and, for the 1970s, a disco oil-wheel projector. There is a pair of gallery benches in the middle, to sit and take in the wonder of grout.
- **Hall 8, Never again**: another black box, six photographs telling the story of a chemical release, each with a HEAR WHAT HAPPENED button. The corridor between Halls 7 and 8 is black too.
- **Hall 9, The whole plant**: the first three halls' plant joined into one working pool plant, the finale.

Hall 5's skimmer is the museum's party piece. Lift its lid and the game plays a little film, a parody of a 1990s adventure game's treasure chest: gold caustics rise from the rim in two rings, a suspense cue plays, and the camera takes one of three routes to the mouth (an orbit, a slow-motion lob along a parabola, or a corkscrew dive), never the same twice running, before your find is held up to a fanfare. Finds include hair, a plaster, earrings and worse; an empty basket gets its own banner.

The museum is big, so it is drawn with care: the hall you are in is drawn in full, its neighbours through the archways at lower resolution until you approach, and halls further off as simplified copies of their exhibits in a pass of their own.

## Hall 4: ClearDose Studio

Hall 4's centrepiece is a dosing console by a new brand, Aqualis Interactive, running ClearDose Studio on three touch screens in a glossy Frutiger Aero style: one for the scenario, one for the chemical and one for the dose, with a big green DOSE button and no physical buttons at all. Behind it stand the hall's chemical tanks, clear cylinders showing what they hold, each labelled with its real hazard pictograms.

Pick a chemical and a dose size and press DOSE, and the hall's water responds. The lab clock runs at a thousand times real speed, so you see the chemistry settle. After a dose the button reads REPEAT DOSE, for one more of the same. In free play you can simply experiment; for a game, pick one of eight challenge cards at Journeyman (fix the major fault) or Pool Pro (fix it and put every other reading right too). Each card has a briefing, a clue if you are stuck, a par number of doses and a glossy closeness bar showing how near the water is to balanced. The cards run from stinging eyes to card 8, "Faecal incident: The Floater", which follows the real guidance for a formed stool.

Win and the console plays a bright fanfare, with fireworks, smiles and a thumbs up across all three screens, and tells you, in the words of the route you took, why it worked. Run out of doses and you get a sad trombone, a rain cloud and a RETRY. Every touch, tick and slide has its own Aero interface sound.

## A bridge behind the control room door

Next to the control room doors in the main corridor is an old pointer knob on a grey plate, labelled in Dymo tape CONTROL ROOM MODE, OLD and NEW. Leave it at OLD and the doors lead to the familiar control room. Turn it to NEW before going through and they open onto the bridge. The knob won't turn while the doors are open, and its choice is saved with your game.

The bridge is lit like a television starship set: cove lighting, a lit dome, peach carpet, a burgundy and oak horseshoe and soft chairs, and you can now sit in any of them; a console's chair turns you to face its panel. Its six forward stations belong to officers with suitably grand titles, from the Flow Navigator to the Boiler Helmsman, with Central Control on the desk in the middle. The touch screens are wired to the same world as the rest of the game, so a pump started from the bridge is seen running on the Olympic plant room's mimic. Each console has a small ◄ LOCK ► strip for paging through roles and screens, and Central Control can reboot every display. As in the old control room, local controls such as trip resets and HAND · OFF · AUTO selectors are refused with LOCAL CONTROL ONLY: you still have to walk to the plant room.

The main viewscreen shows the Olympic pool's circulation live until an alarm takes it over, and the bridge now warns of every annunciator's alarms. Accepting an alarm is shared and saved, so one cleared on the bridge stays cleared elsewhere. Your first visit gets an entrance: the room starts dark, the displays boot one by one through an emblem of the Federated Municipal Baths, the bridge's theme, "Boldly Into the Deep End", plays, and the lights come on in a sweep round the room. An illuminated RESET on the knob's plate puts it all back for another go. The bridge also has a freight lift landing, so you can arrive by lift.

## Chemicals on the move, and the goods yard

Sodium hypochlorite and hydrochloric acid are now delivered, stored and distributed. A tanker's delivery cabinet in the rebuilt loading dock fills the stores' 4,000 litre bulk tanks; transfer pumps and selectors in the wet hall send each chemical to the plant room that needs it, worked from two Penfold OT-216 operator terminals with 16 × 2 LCDs; and every pool doses from its own day tank, most of them self-contained dose bottles with a working head on the lid. The lines are double-contained, marked with bands and flow arrows, and run overhead through the building. Switch off a supply and the transfers stop and the day tanks run down.

The pools' water chemistry is now in the world, and the dosing pumps are real: each doses from its tank into its pool, the water's chlorine and pH respond, and each pump has its own sound, from the solenoid pumps' tick to the stepper pump's rattle.

The loading dock opens onto a goods yard with tarmac, a skip, forklift gas, a locked CO₂ cylinder cage and the site's intake: water, gas and electricity meters that count what the centre uses, each with a lever to shut that service off. The switch room has a mains/generator changeover switch.

## The plant at work

- **Annunciators everywhere.** Each major plant location now has its own annunciator, with a twin in the control room, and their ACCEPT, RESET and MUTE buttons are coloured so they are no longer black on black. The wet hall's has moved to face the aisle.
- **The wet hall** has been re-plumbed from its schematic: a booster set that holds a steady pressure, a backwash pit emptied by two pumps with a panel showing its depth, and a sewer outfall monitor.
- **The Olympic's Wash-O-Tron**, a filter-washing console with a lit button for each filter and an automatic programme, now starts in AUTO. Sand filters' sight glasses show the bed as it looks, dirt and all.
- **Ladders** can be climbed, into the Olympic balance tank and the backwash pit among others, fixing the known issue in the last update.
- **The freight lift** runs between the plant corridor, the bridge and the museum, with centre-opening telescopic doors, a chime at every landing and a ride that speeds up and slows down.
- **The engineer's office** has a desk with a beige Gateway 3000 PC showing BookIt! Pro and a rubber-duck screensaver, and a 1990s wall shelf of software boxes, Pool Simulator 97 among them, which you can pick up, turn over and drop into the computer's carton.
- **Knobs show which way they will turn.** Hover a knob or rotary selector and the crosshair shows an arrow for the way it will go, its ring turning green when it can.

## Looks, settings and the title screen

- **Ambient occlusion**, the soft shadowing in corners and under things, is now worked out once per room instead of every frame. SIMPLE, a cheap version from the room's walls and largest objects, is the default; BAKED, a slower ray-traced version, can be chosen from the settings panel's new LIGHTING module.
- **Graphics presets** (Low, Medium and High) and a lighter first-run setting suit less powerful machines, along with a maximum resolution switch and an overlay scale.
- **The menus are Penfold control panels**, with knobs, meters and lit buttons, and have accessible copies for screen readers and switch access.
- **The title screen** has a new logo, and a released build's title screen now links to its release notes on GitHub. The game has a favicon too.
- **LCDs wash out off-angle** as real twisted-nematic panels do, and signs' lettering fades in as you come within reading distance.

Behind the scenes, error reports now say which build they came from (itch.io, the GitHub Pages preview or local), versions only change with a release, and each GitHub release carries notes sorted into features and fixes.

## Known issues

- **No desktop downloads yet.** The game has been packaged as a desktop app, and each release is meant to attach Linux and macOS builds, but the desktop builds failed for v0.8.0, so the release has none. Play in the browser for now.
- **The museum's first visit can stutter** while a hall's shading is worked out, especially on slower machines; BAKED ambient occlusion can take a minute or more to appear in a large room.

## Next

The Dr Aqualis Trio, a dosing controller by Aqualis Interactive with its own screens, First Aid programmes for faecal incidents and a talent for crashing, is being built in a development room and already runs the Lounge's and Olympic's dosing in the world's logic, but it is not yet in the plant rooms. CO₂ dosing, fed from the goods yard's cylinder cage, is modelled in the same way and is planned to follow it in. The desktop builds need fixing before the next release. An early experiment, the pool rooms, imagines the pools themselves as an endless, impossible space, its main hall a gothic chapel of water; it is a bare blockout for now and not part of the game.

[Play the latest release on itch.io](https://salimfadhley.itch.io/the-pool) · [Release notes for v0.8.0](https://github.com/trebizondoculpepper/the_pool/releases/tag/v0.8.0) · [Bleeding-edge browser build](https://trebizondoculpepper.github.io/the_pool/) · [Source code](https://github.com/trebizondoculpepper/the_pool)
