# Development Diary Entry - 2026-10-20

## Context

- **Date**: 2026-10-20
- **Branch**: main
- **Commit**: (uncommitted at writing; follows e200195)
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked for the ozone plant and the sampling bypass to be modelled, and for an ozone facility: a room of working ozone machines.

## Our Approach

Two forks built the models in parallel as pure, tested blocks: the ozone plant as one composite (`src/game/plant/ozone.ts`: air dryer, booster and injector, generator, contact tank, deozoniser, off-gas destructor, room monitor) and the sampling bypass and water-quality controller (`src/game/plant/sampling.ts`). Meanwhile the main session built the room: a new brand, Trioxa Ozone Systems (its mark the bent ozone molecule), the machines' views (`src/toolkit/components/plant/views/ozone-plant.ts`), a new equipment dev room `dev_ozone`, and the room's logic (`src/toolkit/components/plant/logic/ozone-room.ts`) that steps the plant a second at a time and binds the machines' parts to its ports.

## Implementation

The generator is after ProMinent's Bono Zon BONa 2D (160 g/h, exactly our 160 m³/h at 1 g/m³): its message display, output meter and digits, POWER, OZONE ON and ALARM lamps, START, STOP, RESET, a mains switch and an output setting, a window onto its six dielectric tubes that glow violet with the corona as it makes ozone, the cooling water's rotameter and thermometer, and the venturi's vacuum gauge. The dryer alternates its towers and shows its dew point; the booster has a tri-state indicator and HAND · OFF · AUTO; the contact tank and deozoniser carry residual analysers; the destructor and the room monitor (with its low sampling head and beacon) hang on the wall. A commissioning fault simulator of key switches puts each of PWTAG's stopping faults on the plant.

## Outcomes

- All five checks pass (593 tests); the room loads and runs in the browser, the generator making 160 g/h with under 0.001 mg/l left after the carbon.
- The owner set out the game's concept (the pool rooms and the plant rooms as two codependent dimensions, joined by doorways that need not respect either's geometry, TARDIS-like) and a three-layer reading of the plant (rooms, machines, atomic components); both recorded in `doc/design/two-realms.md` and `doc/plant-model.md`.

## Next Steps

- The sampling bypass is modelled but not yet in a room: the flow cell and controller in the dosing room, the tapping in the pump room.
- An ozone mimic for the control room; the booster's own fault (losing vacuum alone).
- A more fantastical pool room, as the owner directs.

## Later: the duck, the camera and the security office

The owner asked for a rubber duck (then four) bobbing about one of the dev pools, a security camera watching it from the corner, and a security office next door whose monitor shows the pool at low resolution (first 1/32, then 1/16). The duck (`src/toolkit/components/security/logic/duck.ts`) drifts as a function of time alone, so any room asking where it is gets the same answer, and ripples dev16's simulated water as it goes. The camera's picture travels as a video signal (`logic/cctv-signal.ts`): dev16 transmits 96 × 72 frames, the monitor in the new dev18 receives them and shows snow when none arrive. The office opens off dev16 through its own door (the corridor's doors were all taken, and the two-realms idea frees us from that anyway), and asks for dev16 to be built and kept running unseen while its monitor watches (`pool-plant:run-room` in `main.ts`).

Two lessons. A render target is drawn without the renderer's tone mapping, and the water library's own shaders write finished colour, so no single correction fits both: the camera's picture is drawn through the ordinary screen path, into a corner of the canvas, read back, and then overdrawn by the room. And at 1/16 a duck drifting slowly fifteen metres away barely moves a pixel: it now drifts faster, pushed by the inlets, and the camera has a narrower lens.
