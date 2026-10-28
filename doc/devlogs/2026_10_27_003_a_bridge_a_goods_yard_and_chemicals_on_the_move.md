---
title: 'A bridge, a goods yard, and chemicals on the move'
date: '2026-10-27'
update_number: 3
status: draft
previous_post: '2026_10_26_002_filters_fault_lights_and_a_plant_you_can_read.md'
coverage_start: '2026-10-26'
coverage_end: '2026-10-27'
from_commit_exclusive: '98cf707'
to_commit_inclusive: 'aa6d8ba'
build_version: '0.1.646'
deployment_verified: false
deployment_note: 'Not rechecked on itch.io. GitHub Actions run 40596829308 (77aa194, build 0.1.646) passed and deployed to GitHub Pages and itch.io. Every CI run from 4cc0dae onwards, including HEAD aa6d8ba, fails at format:check on doc/research/bridge-console-paging.md, so the commits after 77aa194 (console paging, sitting on chairs, REBOOT DISPLAYS, the later console sounds and the settings panel trial) are not deployed yet.'
published_at: null
itch_url: null
---

# A bridge, a goods yard, and chemicals on the move

This update covers two busy days, 26 and 27 October. The biggest surprise is behind the main corridor's control room doors: turn a small knob first and they open onto a starship bridge, a whole new control room in which every console works the real plant. Behind the scenes, the pools' chemicals now travel from bulk tanks to each pool's own day tank, and the building finally has an outside: a rebuilt loading dock opening onto a goods yard.

## A bridge behind the control room door

Next to the control room doors in the main corridor is an old pointer knob on a grey plate, labelled in Dymo tape CONTROL ROOM MODE, OLD and NEW. Leave it at OLD and the doors lead to the familiar control room. Turn it to NEW before going through and they open onto the bridge. The knob won't turn while the doors are open, and its choice is saved with your game.

The bridge is lit like a television starship set: cove lighting, a lit dome, peach carpet, a burgundy and oak horseshoe and soft chairs. Its six forward stations belong to officers with suitably grand titles, from the Flow Navigator to the Boiler Helmsman and the Chief Electrical Engineer, with standing consoles at the back and Central Control on the desk in the middle. The panels are touch screens wired to the same world as the rest of the game, so a pump started from the bridge is seen running on the Olympic plant room's mimic. As in the old control room, local controls such as trip resets and HAND · OFF · AUTO selectors are refused with LOCAL CONTROL ONLY: you still have to walk to the plant room.

The main viewscreen shows the Olympic pool's circulation live, with water moving while its pumps run, until an alarm comes up and takes it over. Accepting alarms is now shared across the game and saved, so an alarm cleared on the bridge stays cleared on the annunciators elsewhere. One console, OLYMPIC FILTER WASHING, shows each of the Olympic's five filters with its dirt level and lets you start a wash immediately.

Your first visit gets an entrance. The room starts dark apart from an emergency glow, the displays boot one by one through an emblem of the Federated Municipal Baths, the bridge's own theme, "Boldly Into the Deep End", plays, and the main lights come on in a sweep round the room with the dome last. The bridge has its own room tone and console sounds, which you can also hear from the corridor while its doors are open. An illuminated RESET on the knob's plate puts the bridge back as you first found it, ready for the entrance again.

The bridge was worked out in new development rooms first: dev45 is a Bond-villain version of the same room, dev46 the starship version, and dev48 reimagines every panel in the game as a touch screen.

## Chemicals on the move

Sodium hypochlorite and hydrochloric acid are now delivered and distributed in the game. Each chemical store has 4,000 litre bulk tanks in galvanised frames and one transfer pump. In the wet hall, two six-way selectors send each chemical to the plant room that needs it. Every pool now doses from its own day tank, and the stores run down as the day tanks are topped up.

Most day tanks are now self-contained dose bottles with a powered head on the lid. Each head has a small dot-matrix display, HI, LO, CALL and PUMP lamps, and working keys. A new peristaltic dosing pump has a turning roller head and a TFT display, and leak detection has a working probe and a four-zone monitor with a sounder. The wet hall's distribution panel shows each store and day tank on LED readouts.

It all needs power. Switch off a store's supply or the wet hall's and nothing is transferred, the day tanks run down, and the panel goes dark. The chemical lines are double-contained, marked with bands and flow arrows, and run overhead from the stores through the wet hall to each plant room. Every bunded tank now has a hazard-stripe border and the chemical's name stencilled on the floor. The lounge now injects its chemicals through quills, each with its own valve.

## Out to the goods yard

The loading dock has been rebuilt with two drive-in lorry channels, roller shutters, dock lights, chocks, fire points and pallets of deliveries. Through the pier door and down the steps is the goods yard: tarmac and markings, a skip with graffiti, forklift gas cylinders, and the building's roof with its sign, boiler flue and a rooftop 5G mast. The roller shutter was worked out in dev43, where it runs up and down on its controller to a recording of a real shutter.

The site's intake is on the outside wall. The water, gas and electricity supplies each have a meter and a lever that shuts that service off to the whole site, and the meters count what the centre uses. The electricity meter has working buttons, and the water meter's drums turn over litre by litre. Inside the loading bay, the tanker's delivery cabinet opens, with couplings piped into both stores, and a generator connection cabinet is cabled to the switch room. The switch room now has a mains/generator changeover switch with a proper rotary handle, labelled in Dymo tape, along with a fire point and insulating matting.

New wayfinding signs at the main corridor's corners point the way, in engraved white-on-black laminate.

## The wet hall at work

The wet hall has been laid out again and plumbed from its schematic. Its booster set, worked out first in dev42, now runs the pools' make-up water. It holds a steady pressure, keeps running for a minute after the last demand instead of switching on and off, and has DUTY, RUN, STOP and BOOST buttons. The backwash pit is emptied by two submersible pumps, run from a panel that shows the pit's depth and its float switches. You can watch the backwash pour in through the gratings and hear it land.

Ladders can now be climbed. Pool, tank, pit, caged and utility ladders work from both ends, and you can get down into the Olympic balance tank and the backwash pit while their gates or hatches are open and the water is low. That fixes the known issue in the last update, where the tank hall's gate opened but its ladder could not yet be climbed.

The Olympic plant room also has the Lidoluxe Wash-O-Tron, a filter-washing console with a lit button for each filter's states, an LCD and an automatic programme that washes filters one at a time and moves the room's real valves.

## Getting about, and smaller things

- Doors now stay open while you stand near them, and a closing door swings open again if you step back into it.
- The ring corridor carries its services overhead: heating, make-up water, backwash and chemical mains, each branching off beside the door of the room it serves.
- Ctrl+Shift+K (Cmd+Shift+K on a Mac) copies a full-resolution PNG of the view with no interface over it, on the title screen too. If the browser blocks the clipboard, the image is downloaded instead.
- Ctrl+Shift+N turns noclip on and off.
- Light switches have small locator lamps, so you can find them in the dark.
- Heavy pipes rest on oak bearer blocks.

## Coming in the next build

These are already in the source but haven't reached a published build yet. Each bridge console gets a small ◄ LOCK ► strip for paging through roles and screens, and your choices are saved. You can sit in any chair, and a console's chair turns you to face its panel. Central Control can reboot every display on the bridge.

## Next

The wet hall's chemical distribution panel is being replaced by two Penfold OT-216 operator terminals with 16 × 2 LCDs and a control box. For now they are on trial in the development rooms only. The settings menu is also being rebuilt as a Penfold instrument panel, with knobs, meters and lit buttons; it is an early trial and not part of the game yet.

[Play the latest browser build](https://trebizondoculpepper.github.io/the_pool/) · [Project page](https://salimfadhley.itch.io/the-pool) · [Source code](https://github.com/trebizondoculpepper/the_pool)
