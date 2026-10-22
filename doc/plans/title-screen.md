# Plan: the title screen

Agreed with the owner on 2026-10-22; not yet built.

## What it shows

- **Title:** "Boring Simulations Presents:" set small and spaced, above "The Pool", large. Boring Simulations is the studio's name. The game's title is "The Pool"; the browser tab says so too.
- **Background:** a live 3D render of the game, like Minecraft's title panorama. It is rendered at a quarter of the screen's resolution in each direction (a sixteenth of the pixels), stretched to fill the screen and lightly blurred with CSS, so it costs very little, even on a Steam Deck.
- **The cycle:** six rooms, each held for about 20 seconds with the camera drifting slowly, then cross-faded to the next. The next room is built and drawn unseen during the fade, as the pool loop preloads its neighbours, so the change does not stutter. The order:
  1. the Olympic pool hall;
  2. the rotunda;
  3. the boiler house;
  4. the control room;
  5. the main corridor;
  6. the footbath.
- **Camera:** every view is from high up in the room, near the ceiling, looking down at about 25° to 40°: an angle the player can never reach, so the title sequence looks different from playing (the owner's requirement). In low rooms (the rotunda's 2.85 m ceiling, the corridor's 2.5 m) that means just under the ceiling. Cameras stay below any services ceiling. Each shot is checked for faces modelled only to be seen from eye height (cabinet tops, the backs of fittings), and either the model is finished or the path changed.
- **Bottom right:** the version (`versionLabel()` in `src/game/version.ts`), and the build, passed by CI as `VITE_BUILD` (the commit's short hash and date, read by Vite with no config change), for example "v0.1.0 · build 3fe13af · 22 Oct 2026"; "development build" on the dev server.

## The menu

Worked by mouse, keyboard (arrows and Enter) and gamepad alike: a Steam Deck requirement (`doc/research/steam-and-desktop-release.md`).

- **New game:** a fresh world, starting in the footbath (`pool_04`) at a fixed spot. If a save exists, it asks before overwriting it.
- **Continue:** resumes the saved game where the player left it. It is greyed out when there is no save. The save must therefore record the player's room and position as well as the world, which it does not today.
- **Settings:** a placeholder until the game knows what it needs:
  - master volume;
  - look sensitivity, with invert Y;
  - field of view;
  - graphics quality (rendering resolution);
  - show or hide the on-screen controls;
  - erase the saved game, after a confirmation.

  Kept per player in browser storage.

- **Instructions:** the controls for keyboard and mouse, touch and gamepad (from the HUD's help text), and a few lines on what the player is there to do.

## Underneath

- **Save slots:** the game gets its own `game` save slot. Today every machine in the building is bound to the `dev` slot, which the dev rooms keep.
- **Developer access:** the developer room list moves off the front page to `?dev`. Direct URLs (`?room=…`) still skip the title screen.
- **Pausing:** the title screen is also where Esc or the gamepad's Start button returns to, once the game has a pause menu.
