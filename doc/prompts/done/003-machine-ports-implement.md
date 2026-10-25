# Machine ports: implement

You are working in `/Users/salimfadhley/workspace/simulation_of_boring_things`, a Three.js and TypeScript game about the plant rooms of a leisure centre. Read `AGENTS.md` (the project's rules), `doc/plant-model.md` (the plant model, and the principles for placing machinery) and this prompt before you start. Work in the repository's own checkout on its current branch. Do not create a git worktree, and do not commit: the owner commits.

## Background

Each plant room's machines are laid out by pure logic in `src/toolkit/gallery/logic/room-equipment.ts`. Most rooms are packed automatically; the Olympic pool's plant room (`plant_pool_02`) is laid out by hand in `FIXED`, around the water's loop. Only the pool's own water crosses that room's north wall (over the viewing gantry); everything the central plant supplies or takes away crosses the south wall (heating water, make-up water, backwash and drainage, electricity, dosing chemicals). The machines are built by `src/toolkit/gallery/views/room-equipment.ts` from the development rooms' working models, with `createTank` and `createPlaceholder` (`src/toolkit/components/plant/views/blockout.ts`) where no model fits.

`src/toolkit/gallery/logic/room-pipes.ts` routes the Olympic room's pipework as square runs, each service at its own height, and `room-pipes.test.ts` checks it. Its ends are guesses. They land on points roughly in front of each machine, because the machine models carry their own built-in connection pipework and valves: the sand filter's face piping, for example, is sculpted into `createSandFilter` (`src/toolkit/components/plant/views/pumps-plant.ts`). The routed pipes and the built-in ones clash, and the built-in valves cannot be on the schematic's pipes, as the plant model requires.

## What the owner wants

Machines show **ports**, not pipework: each machine carries only what is truly part of it, a flanged nozzle or a stub at each connection, and **all pipe routing, valves included, belongs to the room's layout**, generated port to port. Keep the fittings on the components to the minimum: a nozzle and its flange at each port, and nothing that is really pipework between machines.

## The design

1. **Ports as pure data, one source of truth.** Add a pure logic module (no DOM, no Three.js; for example `src/toolkit/gallery/logic/machine-ports.ts`) giving each machine kind's ports in the machine's own frame, which is the exhibit convention: metres, origin on the floor at the middle of its footprint, front toward +z. Each port has:
   - a name (`inlet`, `outlet`, `drain`, `suction`, `discharge`, `primaryFlow`…);
   - its position;
   - its outward direction (a unit axis);
   - its nominal bore (DN) or outside diameter;
   - the service it carries.

   Port positions must follow the machine's size where the model is parametric: a sand filter's ports by its diameter, a tank's by its panels. The views draw each nozzle **from this data**, so the drawing and the routing cannot drift apart.

2. **Strip the components to their ports.** Start with the machines in the Olympic plant room:
   - sand filter (`createSandFilter`): remove its face piping and its valves, keeping the vessel, its base, its gauges and its sight glass;
   - circulation pump pair;
   - sectional tank (`createTank`, sectional) and the contact vessel (`createTank`, vessel);
   - UV unit;
   - plate heat exchanger;
   - ozone contact tank and ozone generator.

   Remove pipework that joins one machine to another, and keep only nozzles with flanges at the ports. Internal pipework that is really part of the product stays: a pump's own casing ports, a filter's air bleed, a skid's piping inside a packaged cabinet.

3. **Route port to port in the room.** Rewrite `room-pipes.ts` so every run starts and ends exactly at a port. Transform each port into the room's frame from the placement (`Placed`: x, z, yaw; floor y). Each run then:
   - leaves its port along the port's direction for a short straight;
   - climbs or drops to its service's level;
   - runs square;
   - comes back into the far port along that port's direction.

   Keep the existing service levels and the north/south rule. Headers (the filters' inlet and outlet headers) are points of the room's routing, not of any machine.

4. **Valves on the routed pipes.** The valves that were on the components go on the routed pipework as part of the room layout. On each filter, that means inlet, outlet, backwash and drain isolation, near its ports. A second Claude session has just made those filter valves into working parts: `src/toolkit/components/plant/views/water-butterfly-valve.ts` (`createWaterButterflyValve`), wired in `createSandFilter`. **Keep that work**: use that part for the valves on the routed pipework, so they stay working (clickable, animated), and remove them from the filter body only by moving them into the routing. Represent valves as data in the routing (which run, how far along it, which kind, which way its handle faces). Put them in the room view as parts in the room's part set, so the room routes their clicks and updates them.
5. **Keep the development rooms looking complete.** The `dev_pumps` exhibits (`src/toolkit/gallery/rooms/plant/pumps.ts`) that showed face piping should get a short run of face pipework and valves from their ports, generated by the same routing helpers. This way a filter on its plinth in dev_pumps still shows how it is piped.

## Constraints

- **Don't overwrite another session's work.** The other session may still be editing `pumps-plant.ts` and related files. Read each file immediately before you edit it, and keep changes you did not make. If a file changes on disk while you work, re-read it and merge; never revert it.
- **Logic is pure and tested.** Everything in `logic/` folders is pure (no DOM, no Three.js), with tests beside it (`*.test.ts`, importing from `vite-plus/test`).
- **Formatting and style.**
  - Format with `npx vp fmt`.
  - Comments in the code's existing style: plain English sentences, UK spelling.
  - Markdown one paragraph per line.
- **Engineering items stay real and working.** A valve must be a working part, not a static prop (`AGENTS.md`).
- **Don't expand the scope:**
  - don't place new machines;
  - don't change the room layouts beyond what the ports need;
  - don't route pipes in rooms other than `plant_pool_02`, apart from the dev_pumps face pipework.

## Tests to add or update

- **Ports:** every machine kind with ports has them; a filter's ports scale with its diameter; every port is on or just outside its model's declared footprint.
- **Routing:**
  - every run starts and ends exactly on a port, in the room's frame (within a millimetre), leaving and entering along the port's direction;
  - every length is straight along one axis;
  - no run passes through a machine but those it joins;
  - the pool's water only through the north wall; central services only through the south.
- **Valves:** every filter has its four isolating valves, each on a run that joins that filter, within a metre of its port.
- **Built models:** a view test that every drawn nozzle is where its port says. Build the machines, find the nozzle meshes, and compare them with the port data.
- **Existing tests:** the layout tests in `src/toolkit/gallery/logic/room-equipment.test.ts` must still pass. That includes reach, with the low pipework as obstacles.

## Before you finish

Run `npm run typecheck`, `npm run lint`, `npm run format:check` (ignore `.firecrawl/`), `npm test` and `npm run build`. All must pass.

Then report:

- what you changed, file by file;
- which machines now have ports, and which still have built-in pipework, and why;
- anything you could not do.

Do not commit.
