---
title: 'A title sequence that flies through the building'
date: '2026-10-25'
update_number: 1
status: published
previous_post: null
coverage_start: '2026-10-24'
coverage_end: '2026-10-25'
from_commit_exclusive: '536f9f0'
to_commit_inclusive: 'f93cb85'
build_version: '0.1.265'
deployment_verified: true
published_at: '2026-10-25T00:55:35Z'
itch_url: 'https://salimfadhley.itch.io/the-pool/devlog/1727746/a-title-sequence-that-flies-through-the-building'
publicly_accessible: false
visibility_note: 'Post published; the project remains in Draft access mode, so anonymous visitors receive HTTP 404.'
---

# A title sequence that flies through the building

The Pool now opens with a film of itself. Behind the title menu, the camera glides through the building in short shots: low over the lounge pool's water, along the Olympic hall, between the pipes of the plant rooms and round the main corridor, rolling as it goes. Each shot lasts eight beats of the theme before fading to black, and the next is chosen at random, cutting between the pool halls and the back rooms by turns.

This is the first devlog. It covers everything since The Pool first went up on itch.io on 24 October, and every build since then has reached this page automatically.

## What's new

- **The title's flying camera.** Six shots, each framed by hand and joined into one smooth move, with the camera banking, panning and zooming through them. They play in a random order, each from a random point along its path, and only the theme is heard while they do.
- **A free camera of your own.** Open the pause menu and turn on noclip to fly anywhere, through walls and floors. Q and E roll the view, R levels it. In noclip the location pin becomes a camera, and its link opens the same shot again, rolled and zoomed as you left it.
- **A developer console.** Press the key left of 1 (` on most keyboards, § on a UK Mac) for a Quake-style console. It keeps a log of everything you and the plant do, a pump starting, a pool tripping, a gas alarm, and its commands move you between rooms, list and work the valves, switches and motor starters, and pause the plant's clock.
- **The jacuzzi grows up.** It fills through its jets, the water rising until a level switch lets the jets and bubbles run. It has its own balance tank, a cabinet with its own controller and display, a fibre-optic starlit wall, and music in the hall, faint through the plant room wall. Its drain-down runs by gravity, and you can hear and see the water falling into the tundish.
- **Every actuated valve is electric.** The plant's motorised valves now look and sound alike: a geared motor running up and down, a relay's click and a thud at the end stop. They spring shut when their power fails, and each has a red manual override to work it by hand.

## Fixes and improvements

- The drain's gurgle has been rebuilt from a real recording's sound, and the jacuzzi's air blower now screams like a regenerative blower instead of sounding like the jet pump.
- The spa cabinets' doors have vents outside to match the ones inside, and the jacuzzi plant room's lighting console no longer sits on top of its music rack.
- The title music waits politely for the browser to allow sound, says so on screen, and starts at once where the browser lets it.
- The developers' valve test room, where new valves are tried out, now holds one of each kind, with a power switch for testing what happens when the supply fails.

## Known issues

- Browsers won't play sound until you click or press a key on the page, so the theme starts on your first click unless your browser allows it sooner.
- The title's shots last eight beats but don't yet land exactly on the beat, as the screen waits on black while each room is built.

[Play The Pool](https://salimfadhley.itch.io/the-pool) · [Source code](https://github.com/trebizondoculpepper/the_pool)
