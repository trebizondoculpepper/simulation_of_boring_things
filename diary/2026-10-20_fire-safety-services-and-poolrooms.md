# Development Diary Entry - 2026-10-20

## Context

| Time      | Branch | Commit        | Task                                                                     |
| --------- | ------ | ------------- | ------------------------------------------------------------------------ |
| 07:30 UTC | main   | after d76f2f1 | Fire safety, dev10 services, dev11 poolrooms, dev12 pool fittings, GPL-3 |

## What we were asked to do

The owner asked for every internal space of the leisure centre to carry the safety equipment British standards require (detection, emergency lighting, extinguishers, exit signs); for a development room of pipework, ducting and railings; then for research into the "poolrooms" aesthetic and how to render it, a development room that looks like one, three variant looks to compare on a lectern of knobs (after the Encabulator's pattern), and the drains, inlets and overflow a real pool needs, modelled first in a development room of their own. The project was also to be licensed under the GPL.

## What we did

Fire safety is placed by rule in `src/game/fire-safety-plan.ts` (tested against Approved Document B, BS 5839-1, BS 5266-1, BS EN ISO 7010 and BS 5306-8 rules) and drawn by `src/scene/fire-safety.ts`; final exits and a second stair were added first, because the building had one way out. dev10 shows pipe sizes, valves, supports, ductwork, dampers, guard rails, a caged ladder and floor surfaces at true size. dev11 is a tiled wading pool with an arcade, built in `src/toolkit/gallery/rooms/pool-room.ts`: tiles drawn in the shader in world space with per-tile tilt and glaze waviness, caustics, a faked (captured) water reflection, ambient occlusion at half resolution, bloom and ACES. Its lectern switches three looks (`pool-looks.ts`): overcast area light with captured bounce, sunlight after ZhUyU1997/poolrooms, and values read from the MIT Unity project rfsheffer/PoolRooms. dev12 shows the pool fittings (`components/pool/views/pool-fittings.ts`), and the same components are set into dev11: paired main drains, floor inlets, wall lights, vacuum points, eyeball inlets, deck gullies and a deck-level overflow grating all round, laid out by tested logic in `pool-room-plan.ts`.

## Outcome

All five checks pass (390 tests). The first poolrooms renders were badly overexposed and hazy: the captured bounce light (which also tinted the room green, having seen the cyan pool), bloom catching white walls, AgX's greyed whites and fog. Real mirror reflections, three area lights and full-resolution ambient occlusion took a frame from 59 ms to 18 ms once replaced. The project is GPL-3.0-or-later (the licence text was already in the repository); `CREDITS.md` lists the copied recordings and textures, and one, `fluorescent-ballast-start.wav`, has no stated licence and must be replaced before release.

## What we learned

Poolrooms is a lighting problem before it is a materials problem: the artists describe warm sun against corners left dark, and every soft, even scheme read as flat. Bloom in three.js adds rather than blends, so a threshold is needed where Unity's settings have none. Faked reflections from a captured cube map are indistinguishable in a still room. Real products' dimensions for the fittings were being researched when the owner called the pool done; that refinement, and the brand markings, are left for later.
