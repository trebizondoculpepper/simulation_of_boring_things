# 040: A direct/indirect "halo" ceiling panel

Status: partly done (checked 2026-10-26): tried in dev30's lighting-styles booth (`haloPanel`, Lumenhaus, its own dimmer); not yet on the lighting model's circuits nor hung in the public spaces.

## What it is

A direct/indirect luminaire, sold as a suspended or floating "halo" panel: a large rectangular LED panel hung just below the ceiling, its opal diffuser in a slim dark frame lighting the room below (direct), and light from its edges or top washing the ceiling around it (indirect), so the ceiling glows brightest close to the frame and fades away from it: a halo. It is the reverse of cove lighting, where hidden light washes the ceiling from a recess at its edge and there is no diffuser.

## What to model

- **The panel:** a flat rectangle, its diffuser evenly lit, its thin dark frame; hung a short way below the ceiling on fine wires or a concealed bracket.
- **The halo:** the ceiling lit around it, brightest at the frame and falling off over about the panel's own width; drawn with the rooms' baked or local lighting rather than a dynamic light per panel, so many can hang in one space.
- **A real, working fitting:** switched and dimmed by the lighting model (`lighting.ts`, its zone and breaker), lit only when its circuit is; its own maker in `brands.ts`.

## Where

The modern public spaces when they are put back (the reception, the changing village; prompt 039 and `TODO.md`), a present-day fitting beside older ones, as the game's period rule has it (`AGENTS.md`).

## Seen beside it

In the photograph a ceiling-mounted CCTV dome camera at the wall's corner: a possible later item (a dome camera, under a fictional maker; the real brand in the photograph is not to be copied).

## Order of work

Not now. When taken up: in a dev room first, beside the rooms' existing luminaires, then in the public spaces.

## Remaining (checked 2026-10-26)

- Put the panel on `lighting.ts`: lit only while its zone and RCBO are, not by a booth dimmer.
- Hang it in the modern public spaces (reception, changing village) once [039](039-reception-speed-gates.md) puts them back.
- Later, perhaps: a ceiling dome CCTV camera under a maker of our own.
