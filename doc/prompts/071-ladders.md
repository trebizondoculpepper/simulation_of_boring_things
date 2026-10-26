# 071: Every human access ladder climbable, by one ladder helper

Status: implemented 2026-10-26. The [implementation plan](../plans/071-human-ladders.md) gives the inventory, helper contract, floor and hatch changes, sequence, research and verification.

## The request

The owner, 2026-10-26: review all the ladders made for people to climb and make sure every one is climbable. Ladders should not work like Half-Life's, where you go down a ladder pointing downwards: you use a ladder, which lets you ascend or descend it, and as soon as you reach the bottom (or the top) normal control is returned. A ladder helper should draw all kinds of human access ladder in the game (safety ladders, utility ladders, swimming pool ladders): it makes each ladder's physical manifestation, bounds and climb zone. No human access ladder is drawn any other way. Cable ladders carry cables and are outside this request.

## What there is now (checked 2026-10-26)

- **Climbing, in the controls** (`src/toolkit/controls/logic/ladder-zone.ts`, `src/toolkit/controls/input/first-person.ts`): a room passes `ladders: () => LadderZone[]`; Use within 0.9 m of an end's exit, at that end's floor, mounts the ladder; W or the stick forward climbs, S descends, at 0.9 m/s, facing the rungs; at either end the walker is set down at that end's exit and walks again. This is already the behaviour the owner asks for. Use mounts a ladder before anything else is used, so a ladder offered where something else is to be used (a hatch beside a ladder's top) takes the use from it.
- **Where it is used:** swimming pools' ladders (`poolLadderZones` in `src/toolkit/gallery/views/pool-ladder.ts`), in `pool-room.ts`, `pool-hall-room.ts`, `donut-pool-room.ts` and `arched-rooms.ts`; `pool-room.ts` also has a bespoke `BACK_LADDER` zone.
- **A second, unused climb** (`src/toolkit/components/architectural/logic/ladder-climb.ts`): a pure climb action (held, carried rung by rung, let go at the end, no stopping halfway) that no room uses. One of the two must go.
- **Ladders drawn but not climbable:**
  - the stainless tank access ladder (`createTankLadder`, `src/toolkit/components/plant/views/tank-ladder.ts`): the balance tank hall's tank (`rooms/plant/balance-tank-hall.ts`: its gate works, but walking stays on the gantry, `TODO.md`) and the wet hall's backwash pit (`backwash-pit.ts`, down its east wall under its hatch);
  - the sectional tanks' caged ladders up their faces (`TANK_LADDER` in `blockout.ts`, drawn with `createTank`): the break tank and every GRP tank;
  - the fixed ladder with cage in the services exhibits (`rooms/plant/services.ts`), which currently has no walkable upper platform.
- **Not human ladders:** the architectural fixture named `ladder` in `architectural-fixtures.ts` is a Legrand Swifts **cable ladder** according to `architectural-fittings.ts`. It joins the cable ladders in `cable-containment.ts`, the main corridor and services ceiling: all are containment, never climbable. The `createPoolLadder` calls used as a 0.01 m-wide step handrail and hot-tub seat grab rail in `pool-hall.ts` are handrails, not ladder routes. Give them their own drawing before auditing human ladders.

## What to build

1. **A human-ladder helper** (one public component helper with pure layout logic), the only way a human access ladder is made. Given a ladder's kind and its placing (its foot, its top, the wall or edge it stands at, which way it faces), it returns its drawing, tight solids (stiles, cage and stand-offs) and its `LadderZone` (rungs, both ends' floors and exits). Its kinds at least:
   - **pool ladder:** deck-mounted grab rails arching over the edge, treads under the water (as `createPoolLadder`);
   - **access ladder:** a fixed stainless ladder into a wet chamber, no cage, its stiles carried above the rim as handholds or stopped under a hatch (as `createTankLadder`);
   - **safety ladder:** a fixed steel ladder with configurable hoop cage where the selected design calls for one, for tank tops, roofs and gantries; a cage is not by itself complete fall protection;
   - **utility ladder:** a short fixed ladder up a plinth or into a low space.
2. **Every human access ladder drawn through it,** replacing the real pool ladder calls, `createTankLadder` and the sectional tanks' caged ladders, each as before to look at and each climbable when access is open and the destination is safe. Keep cable ladders and step/seat handrails outside it.
3. **Each room offers its enabled ladders' zones** to the controls, and its actual floors at both ends: a tank's or pit's floor walkable once you are down (`floorAt`, the walker's previous height telling a pit's floor from the deck over it), its walls and contents solid there. Tank roofs and dev exhibits need real upper landings before their ladders can be enabled.
4. **A ladder behind a hatch or gate** is offered only while access is open and the tank/pit water is low enough for maintenance entry (the backwash pit's hatch and gate, the tank hall's gate). Use on the closed access works it; Use at an enabled ladder end mounts it. Prevent the hatch/gate trapping a player below.
5. **One climb mechanism:** keep the controls' `LadderZone`; remove `ladder-climb.ts` (or fold anything worth keeping into the controls).

## Done when

- Every human access ladder in the game is made by the helper and can be climbed both ways when its access conditions are met; a test lists each one and checks its zone ends are on walkable floors. Cable ladders and handrails have no climb zones.
- Normal control returns the moment the walker steps off either end.
- In the backwash pit and the tank hall, a player can open the way in, climb down, walk the floor, work what is down there within reach (the pit's hatch from below), and climb out.
- Noclip stays for viewing only: it uses nothing, ladders included (the owner, 2026-10-26).
