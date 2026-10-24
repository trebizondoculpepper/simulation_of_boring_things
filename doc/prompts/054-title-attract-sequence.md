# 054: Title attract sequence

Status: specified 2026-10-24; implement after noclip (038). The owner asked for prompts and TODO entries first, then noclip only.

## Purpose

Play a repeating sequence of authored camera moves behind the title menu while the existing theme plays continuously. Noclip supplies the camera angles and view links used to author shots. This replaces the single Olympic backdrop; retain the title, controls, source link and build details over the sequence.

## Shots and scenarios

Each shot declares a stable ID, room, world scenario, duration and camera path. A path consists of timed presets containing x/y/z in metres, yaw/pitch in degrees and optional zoom; support copying these from noclip views. Keep interpolation and timing pure, use smooth movement and shortest-arc rotation, and make the shot list easy to edit without editing room builders. A nominal scenario is the initial preset; allow explicit per-shot world actions for later scenes. Do not invent additional rooms or equipment for the sequence.

The attract simulation must be independent of the player's simulation: no reading its faults as scenario settings, no changes to its state, no stepping its clock, no saves, locks or updates to its Continue bookmark. Start every shot from its declared scenario rather than whichever state another shot left. Room-local apparatus and cameras must also be isolated, so entering the game cannot inherit attract-only state. Demonstrate isolation with a deliberately altered player save and an attract scenario that differs from it.

## Playback and loading

Build and prepare the next scene in the background before its turn, including the first rendered frame and GPU preparation. Keep a bounded active/next scene set and dispose obsolete scenes. Do not repeat the synchronous speculative-loading hitches documented in the room-loading report: measure transition frame gaps and keep expensive preparation away from the visible camera motion where practical.

Fade the scene to black, switch while fully black, then fade in the next scene; the title menu remains usable and the music continues without restarting between shots. If the next scene is late, hold black rather than exposing a partially built room. Handle loading failure with a usable menu and a recoverable scene fallback. Stop pending loads/camera work and release attract-only resources promptly on New Game, Continue, the developer panel or another departure from the title. Returning starts the sequence cleanly. Respect the existing master-volume and graphics settings.

## Acceptance

Verify at least two distinct rooms, a preset scenario per shot, timed camera motion, seamless music, next-scene preparation, black transitions, a full repeating cycle, cancellation during loading/fades, repeated title/game visits without accumulating contexts or streams, and unchanged player save/state/bookmark. Test interpolation/timing independently and check the sequence visually in a browser, recording transition frame gaps and resource counts. Run the standard five project checks, update the changelog and diary, and keep unfinished delivery in TODO.md.
