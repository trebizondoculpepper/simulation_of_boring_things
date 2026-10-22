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

## Stages

Built in stages, each ending in a checkpoint the owner can see or try before the next begins. Each stage is committed and pushed on its own.

1. **The screen itself.** The title, the four menu items and the version and build bottom right, over a plain dark background; the menu worked by mouse, arrow keys and Enter, and gamepad. New game and Continue do nothing yet. The developer room list moves to `?dev`, and `?room=…` links skip the title screen. CI passes `VITE_BUILD`. _Checkpoint: open the site and see the title screen._
2. **Instructions.** The controls for keyboard and mouse, touch and gamepad, and what the player is there to do, with a way back to the title. _Checkpoint: read it._
3. **Settings, saved.** _Built first, on the owner's choice (2026-10-22), opened in the game by a gear among each room's view tools, since Esc frees the mouse._ The six settings as controls that remember their values per player, with a way back. Nothing in the game uses them yet. _Checkpoint: change them, reload, and see them kept._
4. **Settings, applied.** _Built 2026-10-22: graphics quality applies at once, every room's post-processing following its renderer (`createComposer` in `render-style.ts`)._ Volume, look sensitivity and invert Y, field of view, graphics quality and the on-screen controls take effect in every room. Erase saved game waits for stage 6. _Checkpoint: change one and feel it in the game._
5. **The game's own save.** A `game` save slot for the real game, separate from the dev rooms' `dev` slot, which every machine in the building is bound to today. No visible change. _Checkpoint: the dev rooms and the game no longer share a world._
6. **New game.** A fresh world in the game slot, starting at a fixed spot in the footbath, asking first if a save would be overwritten. Erase saved game now works. _Checkpoint: start a new game and arrive in the footbath._
7. **Continue.** The save records the player's room and position as well as the world; Continue puts the player back there, and is greyed out with no save. _Checkpoint: play, reload, continue, and be where you were._
8. **One room behind the title.** The Olympic hall rendered behind the menu at a quarter of the resolution, blurred, from a fixed high camera. _Checkpoint: judge the look._
9. **High camera paths for all six rooms.** A slow drift or arc through each, from above; each shot checked for faces modelled only to be seen from eye height, and either the model finished or the path changed. _Checkpoint: a still from each room._
10. **The cycle.** The six rooms in turn, about 20 seconds each, cross-faded, the next one preloaded unseen so the change does not stutter. _Checkpoint: watch a full cycle._
