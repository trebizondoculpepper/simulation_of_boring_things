# 071: Every ladder climbable, by one ladder helper

Status: not started (written 2026-10-26).

## The request

The owner, 2026-10-26: review all the ladders in the game and make sure every one is climbable. Ladders should not work like Half-Life's, where you go down a ladder pointing downwards: you use a ladder, which lets you ascend or descend it, and as soon as you reach the bottom (or the top) normal control is returned. And a ladder helper should draw all the kinds of ladder in the game (safety ladders, utility ladders, swimming pool ladders): it is the helper's job to make each ladder's physical manifestation and, with it, its bounding boxes, and to make it climbable. No ladder is drawn any other way.

## What there is now (checked 2026-10-26)

- **Climbing, in the controls** (`src/toolkit/controls/logic/ladder-zone.ts`, `src/toolkit/controls/input/first-person.ts`): a room passes `ladders: () => LadderZone[]`; Use within 0.9 m of an end's exit, at that end's floor, mounts the ladder; W or the stick forward climbs, S descends, at 0.9 m/s, facing the rungs; at either end the walker is set down at that end's exit and walks again. This is already the behaviour the owner asks for. Use mounts a ladder before anything else is used, so a ladder offered where something else is to be used (a hatch beside a ladder's top) takes the use from it.
- **Where it is used:** only the swimming pools' ladders (`poolLadderZones` in `src/toolkit/gallery/views/pool-ladder.ts`), in `pool-room.ts`, `pool-hall-room.ts`, `donut-pool-room.ts` and `arched-rooms.ts`.
- **A second, unused climb** (`src/toolkit/components/architectural/logic/ladder-climb.ts`): a pure climb action (held, carried rung by rung, let go at the end, no stopping halfway) that no room uses. One of the two must go.
- **Ladders drawn but not climbable:**
  - the stainless tank access ladder (`createTankLadder`, `src/toolkit/components/plant/views/tank-ladder.ts`): the balance tank hall's tank (`rooms/plant/balance-tank-hall.ts`: its gate works, but walking stays on the gantry, `TODO.md`) and the wet hall's backwash pit (`backwash-pit.ts`, down its east wall under its hatch);
  - the sectional tanks' caged ladders up their faces (`TANK_LADDER` in `blockout.ts`, drawn with `createTank`): the break tank and every GRP tank;
  - the fixed ladder with cage in the services exhibits (`rooms/plant/services.ts`) and the architectural fixtures' `ladder` (`architectural-fixtures.ts`);
  - its gate (`ladder-gate.ts`), a part, not a ladder.
- Cable ladder (`cable-containment.ts`, the services ceiling) is containment, not a ladder, and is out of scope.

## What to build

1. **A ladder helper** (one module, in `src/toolkit/components/`), the only way a ladder is made. Given a ladder's kind and its placing (its foot, its top, the wall or edge it stands at, which way it faces), it returns its drawing, its solids (stiles, cage, stand-offs: what bars the walker), and its `LadderZone` (rungs, both ends' floors and exits). Its kinds at least:
   - **pool ladder:** deck-mounted grab rails arching over the edge, treads under the water (as `createPoolLadder`);
   - **access ladder:** a fixed stainless ladder into a wet chamber, no cage, its stiles carried above the rim as handholds or stopped under a hatch (as `createTankLadder`);
   - **safety ladder:** a fixed steel ladder with a hoop cage above 3 m (BS EN ISO 14122-4), for tank tops, roofs and gantries;
   - **utility ladder:** a short fixed ladder up a plinth or into a low space.
2. **Every ladder drawn through it,** replacing `createPoolLadder`, `createTankLadder`, the sectional tanks' ladders and the fixtures' ladder, each as before to look at, and each now climbable.
3. **Each room offers its ladders' zones** to the controls, and its floors at each end: a tank's or pit's floor walkable once you are down (`floorAt`, the walker's previous height telling a pit's floor from the deck over it), its walls and contents solid there.
4. **A ladder behind a hatch or gate** is offered only while it is open (the backwash pit's hatch, the tank hall's gate), so Use on the closed hatch beside it works the hatch, and Use on the open one at its top mounts the ladder.
5. **One climb mechanism:** keep the controls' `LadderZone`; remove `ladder-climb.ts` (or fold anything worth keeping into the controls).

## Done when

- Every ladder in the game is made by the helper, and every one can be climbed both ways; a test lists every ladder the rooms draw and checks each has a zone whose ends are on walkable floors.
- Normal control returns the moment the walker steps off either end.
- In the backwash pit and the tank hall, a player can open the way in, climb down, walk the floor, work what is down there within reach (the pit's hatch from below), and climb out.
- Noclip stays for viewing only: it uses nothing, ladders included (the owner, 2026-10-26).
