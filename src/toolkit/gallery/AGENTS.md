# Toolkit: gallery

An exhibition space for the components: rooms where each kind of thing can be seen, tried and heard, and where a new component is tried out before a game uses it. `CLAUDE.md` is a symlink to this file; the toolkit as a whole is described in `../README.md` and the game's own guide is the repository's `AGENTS.md`, which describes each room in full.

## What goes here

- **Exhibition rooms** (`rooms/`), one per category or theme:
  - Controls and displays: test boards, the machine-component plinths and backplane, cabinet fittings.
  - Racks.
  - Brands and logos.
  - Fire safety: a working fire alarm demonstration.
  - Building fittings.
  - Machine tones; computer beeps and bloops.
  - The wandering button and the button in every condition.
  - Putting things in the bin; the appearing skip.
  - The graffiti collection.
- **Exhibit furniture**: plinths, test panels, numbered specimen boards and captions (`rooms/catalogue-specimens.ts`, `rooms/test-boards.ts`, `rooms/device-pedestals.ts`).
- **The room framework**: portals and the chain of rooms they join (`views/portals.ts`, `logic/dev-room-links.ts`).
- **Logic only an exhibit needs**: the wandering button's modes, the button's conditions, the beeps room's selector, the appearing skip's vanishing rule, which controls work each machine-gallery plinth.

## What does not

- The things on show: they are components, in `../components/`, and a room only places them, labels them and wires them to a model. If a room starts to grow a component of its own, move it into its category.
- Inputs: every room is walked and worked by `../controls/`, and never binds an input itself. (One exception, by the owner's leave: the appearing skip room's on-screen SPAWN SKIP test button.)
- The game's own rooms (its places, its levels, its effects experiments).

## Rules

- The gallery may import `../controls/` and `../components/`; nothing in the toolkit imports the gallery (`../layering.test.ts`).
- A room shows a component by its own category, and may also show it where a visitor would look for it (the emergency light is in both the fire and the building fittings rooms).
- Each room has development hooks on `window` (`devControls`, `devFittings` and the like) and `?view=` starts; they bind no input.
- Every room must be reachable through portals that can be both walked into and clicked; add a new room to the chain and the portal network test covers it.
- Known exception, to be removed before the toolkit is extracted: the room chain still lists the game's own rooms beside the gallery's, and reads the training room's door from the game's plan. The game should hand the gallery its chain instead.
