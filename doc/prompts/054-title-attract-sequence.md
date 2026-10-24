# 054: Title attract sequence

Status: specified 2026-10-24; under way. The sequence runs (`src/toolkit/title/logic/attract-sequence.ts`, `src/main.ts`): three placeholder orbits in three rooms (the owner, 2026-10-24: pick three orbits from different rooms, to be changed later), fades through black, the player's world paused under it. Each shot shows a prepared world of its own (done 2026-10-24). Still to do, as `TODO.md` lists: authored shots, more presets, the sight-glass shot, floating props, and background preparation of the next scene.

## Purpose

Play a repeating sequence of authored camera moves behind the title menu while the existing theme plays continuously. Noclip supplies the camera angles and view links used to author shots. This replaces the single Olympic backdrop; retain the title, controls, source link and build details over the sequence.

## Shots and scenarios

Each shot declares a stable ID, room, world scenario, duration and camera path. A path consists of timed presets containing x/y/z in metres, yaw/pitch in degrees and optional zoom; support copying these from noclip views. Keep interpolation and timing pure, use smooth movement and shortest-arc rotation, and make the shot list easy to edit without editing room builders. A nominal scenario is the initial preset; allow explicit per-shot world actions for later scenes. Do not invent additional rooms or equipment for the sequence.

The attract simulation must be independent of the player's simulation: no reading its faults as scenario settings, no changes to its state, no stepping its clock, no saves, locks or updates to its Continue bookmark. Start every shot from its declared scenario rather than whichever state another shot left. Room-local apparatus and cameras must also be isolated, so entering the game cannot inherit attract-only state. Demonstrate isolation with a deliberately altered player save and an attract scenario that differs from it.

## Prepared worlds (the owner, 2026-10-24)

The attract sequence never uses the player's game state. It has worlds of its own, prepared just for it: simple presets (lighting status, some pools empty, and the like), each made once from a new world by a few actions and frozen (`src/game/attract-scenarios.ts`). Each shot names its preset; when it plays, a copy runs on from it in memory (`createScenarioStore` in `world-store.ts`), never saved, so the same shot starts the same every time and still moves while it is seen. Rooms take their world from `roomWorld()`, never from a save slot by name; the attract sequence builds its rooms on canvases of its own, never reusing the player's, each on its shot's world, and lets them go as it moves on. Shots to come: a pan past a filter's sight glass with its animation running; props floating in a pool, placed for the shot only, for the camera to pan alongside.

## Camera paths (the owner, 2026-10-24)

The camera keys a shot passes through (noclip links: x, y, z, yaw, pitch, roll, zoom, each with a time) are joined into smoothed three-dimensional Bézier splines, so the camera glides through them as a film camera on a rail would. The research and the proposed design are in `doc/research/camera-splines.md`: a centripetal Catmull-Rom curve (equivalently, Bézier segments with automatic handles) through the positions, an arc-length table and a monotone time-to-distance curve for the timing, the angles (shortest way round) and the logarithm of the zoom smoothed through time, all pure and tested.

## Playback and loading

Build and prepare the next scene in the background before its turn, including the first rendered frame and GPU preparation. Keep a bounded active/next scene set and dispose obsolete scenes. Do not repeat the synchronous speculative-loading hitches documented in the room-loading report: measure transition frame gaps and keep expensive preparation away from the visible camera motion where practical.

Fade the scene to black, switch while fully black, then fade in the next scene; the title menu remains usable and the music continues without restarting between shots. If the next scene is late, hold black rather than exposing a partially built room. Handle loading failure with a usable menu and a recoverable scene fallback. Stop pending loads/camera work and release attract-only resources promptly on New Game, Continue, the developer panel or another departure from the title. Returning starts the sequence cleanly. Respect the existing master-volume and graphics settings.

## Acceptance

Verify at least two distinct rooms, a preset scenario per shot, timed camera motion, seamless music, next-scene preparation, black transitions, a full repeating cycle, cancellation during loading/fades, repeated title/game visits without accumulating contexts or streams, and unchanged player save/state/bookmark. Test interpolation/timing independently and check the sequence visually in a browser, recording transition frame gaps and resource counts. Run the standard five project checks, update the changelog and diary, and keep unfinished delivery in TODO.md.
