# Museum halls: each a model, bound as the plant rooms are

The owner's rule (2026-10-30): every museum hall that holds plant works the same way as our plant rooms. Each is a self-contained simulation with a world model of its own, and every engineering component in it is drawn from, and bound to, a component of that model, checked by a unit test. This page sets the standard, says where each hall stands, and describes the test.

## How the plant rooms do it

A plant room begins with its schematic (`src/game/plant/schematics.ts` and the rooms' schematic modules): a port graph of machines and links, with every valve and isolator given as a fitting with its function, normal state and tag. The plumber (`expandForPlumbing`, `src/game/plant/plumbing-expansion.ts`) expands it into the room's enhanced network: nodes (machines), fittings (valves, meters, isolators, which are also nodes of the expanded graph) and links (pipes and cables). The scene only binds: each drawn machine, valve and pipe is marked with `markComponent(object, { tag, model })` (`src/toolkit/components/core/views/component-identity.ts`), its `model` naming a node, fitting or link, or it is marked `decorative`. `src/toolkit/gallery/logic/world-in-model.ts` gives each room's model (`roomModel`) and lists what each room draws from its layout data (`drawnThings`, pinned in `world-in-model.unbound.json`); `src/toolkit/gallery/views/world-in-model-scene.ts` (`unboundInScene`) walks the built scene and names every mesh whose owner is neither bound nor decorative, and `world-in-model-scene.test.ts` requires that list to be empty. Tags come from the model, never written by hand.

## The standard for a museum hall

Each hall is a plant hall or a display hall, classed by what it actually contains (`HALL_CLASS` in `src/toolkit/gallery/logic/museum-hall-model.ts`).

A plant hall holds machines, valves or pipes. It is a self-contained simulation: its schematic and its own state live in its module under `src/game/plant/` (`museum-1-heating.ts` and the rest), held as a plant room holds its, and reset when the visitor walks in. Its schematic is expanded by the plumber into the hall's enhanced network, exactly as a plant room's is, and that network is the one source of truth for the hall.

Every engineering component in a plant hall (pumps, valves, filters, tanks, pipes, gauges, meters, controllers, starters, mimics, the controls a visitor works) is drawn from, and bound to, a node, fitting, link or instrument of that hall's model, by `markComponent`'s `model` or by a tag the model derives. A control or lamp that is part of a bound machine's panel is bound through its panel. Nothing goes into the hall that is not already in its model, and nothing in the model is left undrawn, except nodes that stand for the world beyond the hall (the atmosphere, the bathers), which are never drawn.

Tags and names are derived from the model algorithmically (each hall module's `TAGS`, `machineTag`, `fittingName`), with the hall's room code (M1, M2, ...), never written by hand.

Pure display items are exempt, but must be marked `decorative` so the test can tell them from an unbound machine: placards, captions, engraved pipe plates and flow arrows (or bind them to their pipe's link), signs, photographs, clocks, grout specimens, the painted pool, banners, bins, set dressing. A display hall holds only such things and is exempt from simulation and binding; a display hall that gains a machine must be reclassified as a plant hall.

## The hall classes

| Hall                       | Class   | What it holds                                                                                                                                                                                                   |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| museum0, Welcome           | display | Placards and the welcome; no exhibit. Its caustics projector (`caustics-projector.ts`) and the freight lift's landing (`freight-lift.ts`) are working components bound elsewhere, not part of a hall model.     |
| museum1, Warm water        | plant   | The ideal pool and its heating (`museum-1-heating.ts`).                                                                                                                                                         |
| museum2, Clean water       | plant   | dev51's ideal plant: tank, pump, filter, ozone, carbon, UV (`museum-2-clean-water.ts`).                                                                                                                         |
| museum3, Safe water        | plant   | Chemistry: dosing, sample cell, controllers (`museum-3-dosing.ts`).                                                                                                                                             |
| museum4, Chemistry         | plant   | The lab: chemical tanks, dosing pot, pump, analyser (`museum-4-lab.ts`).                                                                                                                                        |
| museum5, A Day in the Life | display | Purely decorative by the owner's ruling (2026-10-30): the painted pool, finds, captions. Its wall skimmer (M5-SK1) is dry and capped, a display piece; if it is ever made to work, Hall 5 becomes a plant hall. |
| museum6, World of Pumps    | plant   | Two pumps, a tank and header (`museum-6-pumps.ts`).                                                                                                                                                             |
| museum7, Grout             | display | Grout specimens.                                                                                                                                                                                                |
| museum8, Never Again       | display | The incident story: stands and HEAR WHAT HAPPENED buttons, which work the exhibit's narration, not plant.                                                                                                       |
| museum9, The whole plant   | plant   | The whole plant, with faults (`museum-9-plant.ts`, `museum-9-faults.ts`).                                                                                                                                       |

## Where each plant hall stands (2026-10-30)

Every plant hall has a schematic, expanded by the plumber, with tags derived from it, and its pipes, valves and principal machines are already marked with their model ids. None yet passes the binding test in full; the test lists each gap.

| Hall    | Own simulation | Drawn from the model                                                                                                                     | Verdict |
| ------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| museum1 | yes            | machines, valves and pipes mostly; 72 owners unbound (pipe plates, labels, panel parts); 10 model components undrawn (its instruments)   | partly  |
| museum2 | yes            | as Hall 1; 70 unbound (plates, line markings, panel parts); 13 undrawn (instruments)                                                     | partly  |
| museum3 | yes            | as Hall 1; 63 unbound (the DC1 controllers and their keys, the chemistry board); 13 undrawn (sample fittings, instruments)               | partly  |
| museum4 | yes            | tanks, pipes, pot, pump, analyser bound; 37 unbound (the challenge desk's buttons and selectors); 15 undrawn (header, the tanks' valves) | partly  |
| museum6 | yes            | as Hall 1; 28 unbound (plates, labels, lamp test, clock); 5 undrawn (P2 gauges, tank level instruments)                                  | partly  |
| museum9 | yes            | as Hall 1; 47 unbound (DC1, fault key switch, panel parts, thermometer board); 25 undrawn (sample fittings, instruments)                 | partly  |

Display halls 0, 5, 7 and 8 conform by being exempt.

## The binding test

`src/toolkit/gallery/rooms/museum/museum-bindings.test.ts` builds each plant hall's exhibit as the game does (`HALL_EXHIBITS`, with a stub canvas from `walkways.test-support.ts`) and walks every mesh. A mesh passes if it, or any whole it is part of, is marked decorative or is bound to the hall's model (`hallModel` and `hallBound` in `museum-hall-model.ts`: a node, fitting, link or instrument, by `model` or by a tag the model derives). It then checks the other way: every node, fitting, link and instrument of the model is drawn by something bound to it. Each failure names what is unbound or undrawn, by the owner's decision left failing, not skipped: the failures are the to-do list. Display halls are skipped with their reason, and a sibling check fails if a display hall gains a model or a component bound to one, so it is reclassified.

## The facing rule (owner, 2026-10-30)

When laying out a plant hall, each machine faces the room. Its front (the side with its controls, gauges, nameplate and placard) faces the centre of the hall wherever that is clear-cut. A machine against a wall faces straight out from that wall: along a long side it faces across into the room from the long side; along a short side it faces out from the short side. In a corner, or where neither direction is clear-cut, choose whichever makes the front most visible to a visitor coming in, and say why in the layout code. The test does not yet check this: the exhibits do not yet declare each machine's front, so a check (the front normal's dot product with the vector from the machine to the hall's centre, or with the wall's inward normal, positive) waits on that; it is on the to-do list.
