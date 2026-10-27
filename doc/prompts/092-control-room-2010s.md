# 092: The control room, a bit of every era

Status: to do (written 2026-10-27 from the owner's request; its layout and the screens question settled by the owner the same day, below). A design mission first: try it in a dev room before the control room changes.

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first, and `doc/design/control-interface-archetypes.md`. Markdown is one paragraph per line.

## The request

The owner, 2026-10-27: "for the main control room, I want to have something that is dramatically different. I'm thinking like a late 2010s interface in which computer-based screens are starting to become normal. So there might be quite large LED matrix screens showing the flow of fluids and processes, animated stuff. It'd be really fun if we could bring back some satirical. I feel like bringing back Clippy as a mascot, like saying, 'It looks like you're trying to clear a filter bed.' So, maybe for the control room, I want to create something that has an aspect of a 2010s, mid-2010s, elaborate, modern-ish control room with period features of early computer-based displays."

## What there is now

The control room (`control_room`, a shell room, `layoutRoom` in `src/toolkit/gallery/logic/room-equipment.ts`) holds the operator's desk (POOLMON), an alarm printer, a water-test kit, wall mimics for the main pool circuit, the heating and the air handling, and an alarm annunciator: the 1980s large-panel archetype throughout, reading the one world state.

## The idea

A third archetype for the control room: the mid-2010s control room, where screens have arrived but are still a novelty, alongside what came before.

- **A video wall of large LED-matrix panels:** coarse, bright, pixel-visible displays (after the LED message and process-display boards of the period) showing animated process views drawn from the world: water moving through the circulation, filters, heat exchangers and chemical lines, flows and levels changing as they do in the plant. Its own simulated interface, drawn by the game (not a web page in a texture), each panel its own controller and its own failures (a dead tile, a stuck row).
- **Operator workstations of the period:** a pair of wide 16:9 LCD monitors on arms showing a SCADA-style HMI of the time (flat colours, tabbed screens, trend plots, an alarm banner), worked through the game's own control scheme, keyboard and mouse as props.
- **The assistant mascot, satirical:** an over-eager on-screen assistant in the HMI that pops up with unhelpful help ("It looks like you're trying to clear a filter bed. Would you like help?"), pointing at the wrong thing, dismissable, coming back. An original character in the spirit of the late-1990s office assistant, not Microsoft's Clippy itself (its name, likeness and artwork are theirs): for example a talking float switch or a cheerful test-kit pot with eyes, named in the game's own way.
- **The period features:** a wall clock synced by radio, a CCTV quad monitor, the alarm printer kept on as a backup nobody reads, laminated quick-reference cards, a coffee-ringed keyboard, a wall-mounted flat TV on a news channel.
- **What stays:** the control room still diagnoses; putting things right often means going to the room concerned (`CLAUDE.md`: some controls are only local). The screens show and command what the mimics do now (valves' OPEN and SHUT, pumps' START and STOP); mode selectors and trip resets stay local.

## The owner's answer: a bit of everything (2026-10-27)

"I want to kind of keep the bit of everything thing going. So the control room, I would like it to have a central desk with a sort of a console that puts some important controls within arm's reach of a controller sat at a desk. And beyond the controller's desk, which will have physical controls, there will be various kinds of wall controls or consoles, and these will be in different styles from different eras. So perhaps the discrete industrial components of the 80s, there will be the LCD displays of the 90s, and maybe a couple of computer-generated displays of the mid-2010s."

So the screens do not take over (the `CLAUDE.md` rule stands): they are a couple of the room's consoles among many.

- **The controller's desk, in the middle:** a seated operator's console with physical controls within arm's reach: the important commands (the pumps' START and STOP, the valves' OPEN and SHUT that the mimics carry, an alarm ACCEPT and RESET, the plant-wide stops), lit push buttons and selectors on its sloping desk top, a few key readouts on its upstand. Local-only controls (mode selectors, trip resets) still stay in the plant rooms.
- **Beyond it, round the walls, consoles of different eras, each after its archetype:** the 1980s discrete industrial components (the existing mimics and annunciator, large panels of 30 mm devices, moving-coil meters); the 1990s LCD displays (character and segment LCD panels, the early-2000s compact terminals of mission 091 and their like); and a couple of mid-2010s computer-generated displays (the LED-matrix process wall and a period HMI workstation with its assistant mascot, as above).
- Each console its own kind of interface, all reading and working the one world, so the room shows the same plant several ways.

## Stages

1. Design note: the archetype added to `doc/design/control-interface-archetypes.md` once approved; the video wall's tiles, the HMI's screens and the mascot's character and lines sketched.
2. A dev room prototype (dev39, the control assemblies room): the desk console first, then one LED-matrix tile animating one process from a trial state; one workstation screen with its tabs, trend and alarm banner; the mascot popping up on cues.
3. The control room laid out: the controller's desk console in the middle; round the walls the 1980s panels (the existing mimics and annunciator kept or moved), the 1990s LCD consoles and the couple of mid-2010s screens; the period features; all bound to the world and its enhanced network.
4. Checks: screenshots, the layout tests, frame time in the control room (the display-only updates research, `doc/research/display-only-updates.md`: redraw only on change, throttle the LED wall).
