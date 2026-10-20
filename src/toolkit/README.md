# Toolkit

The reusable part of the Encabulator: a first-person control scheme, a catalogue of simulated industrial, fire-safety, general-safety and architectural components, and a gallery to show them off. It lives inside the game for now, arranged so that it can later be lifted out into a package of its own and used by other games, or to simulate real industrial controls.

## Layers

Each layer imports only the ones before it (`layering.test.ts` checks this):

1. `controls/`: how inputs work. One scheme for keyboard and mouse, trackpad, touch (dual stick) and gamepad; walking, looking, zoom and crouch; collision with walls and solid things; knob-turning; picking up, carrying, dropping and the physics of a fall.
2. `components/`: the simulated things, by category:
   - `core`: the parts system and world graph, the panel kit, labels, textures and materials, wear and damage, positional part audio and its recordings, brands and badges, signage, and the shared tools for building fittings.
   - `industrial-control`: operator controls, indicators and displays, power and motor control devices, electronics and cards, enclosures and racks, control stations.
   - `fire`: active fire safety: detection, alarm panels, the voice alarm, sprinklers and their valve set, extinguishers, held fire doors, flames and embers.
   - `general-safety`: emergency lighting and exit signs, floor safety markings, warning signs, welfare alarms, skip lamps.
   - `architectural`: doors and ironmongery, the electrical installation, switching and lighting, climate, communications, the warehouse catalogue and the building services models.
   - `sound`: synthesised machine tones, computer cues and the boot beep.
   - `site-dressing`: skips, graffiti, chair stacks, warehouse props, throwing things into bins.
3. `gallery/`: the exhibition rooms and their framework (portals, the room chain).

Within a layer or category, files are arranged by kind: `logic/` (pure logic, no DOM or Three.js, tested beside it), `views/` (drawing only), `parts/` (working parts: a view, its behaviour and its sounds), `audio/` (sounds and `audio/assets/`), and the gallery's `rooms/`.

## Before extracting it

- The room chain (`gallery/logic/dev-room-links.ts`) still lists the game's own rooms and reads the training room's door from the game's plan; the game should hand the gallery its chain instead.
- `components/core/parts/render-style.ts` reads its style from the page URL, and `components/core/audio/part-audio.ts` starts itself from window-wide listeners; both should become set-up calls the game makes.
- Three.js and `@preact/signals-core` should be peer dependencies, so a game and the toolkit share one copy.
- Sound credits for the recordings in `components/*/audio/assets/` are in the game's `CREDITS.md` and should travel with them.
