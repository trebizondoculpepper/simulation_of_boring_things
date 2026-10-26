# 084: Chemical distribution, from the fill ports to the dosing points

Status: to do (written 2026-10-26 with the owner).

You are working on "The Pool", a browser game in TypeScript and Three.js simulating a leisure centre's pool plant (this repository). Read `CLAUDE.md` first; its rules apply, above all that the enhanced network is the one source of truth: each chemical's path goes into the schematic first, with every valve and its tag, and the plumber routes the pipes; nothing is drawn that is not in the model. Read `doc/plant-model.md` and `doc/room-layout-guide.md`.

## The request

The owner, 2026-10-26: there are no lines from the fillers to the chemical store, and none from the chemical store to the pools. Lay the chemical distribution, hydrochloric acid and sodium hypochlorite, end to end; and the schematic must include the filler ports in the loading bay.

## What there is now

- `src/game/plant/back-room-schematics.ts`: `LOADING_BAY_SCHEMATIC` has two `fill-cabinet` nodes, each with an abstract link to a `chemical-store` stand-in; `HYPO_STORE_SCHEMATIC` and `ACID_STORE_SCHEMATIC` each have a `delivery` stand-in feeding their tanks and a `dosing` stand-in drawing them. No valves, no routed pipe, nothing drawn between rooms.
- The yard's fill cabinet (`createFillCabinet`, `yard-kit.ts`, `chemicals-storage.ts`): one lockable cabinet with two couplings, 2" and 1½", and a tank-full alarm. The schematic has two cabinets; settle which is true (one cabinet holding two separate, labelled ports is usual), and make the model and the scene agree.
- Hypochlorite: three 1,000 L-class bunded bulk tanks in its store. Acid: one IBC on a spill pallet, to be replaced by a fixed bunded bulk tank ([081](081-acid-supply.md): both chemicals by bulk tanker).
- Deliveries: [076](076-chemical-delivery.md) (the delivery mechanic), [081](081-acid-supply.md), [080](080-goods-yard.md) (the yard).

## The arrangement (decided with the owner)

Each chemical has its own path, wholly separate from the other's, from its port in the yard to each pool's return pipe:

1. **Fill port** in the loading bay's yard cabinet, a node in the loading bay's schematic, with its own incompatible coupling (sizes and types differ: camlock, Guillemin, Storz), a cap, a drip tray, and a label. The port is where the network starts.
2. **Fill line** from the port to its bulk tank: an isolating valve at the port, a non-return valve, the pipe falling back to its own bunded tank so it drains into the tank and never back out of the cabinet; double-contained (pipe in pipe) wherever it crosses the building, with leak detection on the interstitial space.
3. **Bulk tank(s)** in its store, in a bund of 110%: level gauge, high-level alarm seen and heard at the fill port, an independent overfill stop (a high-high switch closing an actuated valve on the fill line), a vent (the acid's through a fume scrubber), a draw-off isolating valve.
4. **Transfer** from each store: a transfer pump (duty and standby, as the sizing suggests) lifting the chemical up to plant-room level along one transfer main, with isolation, non-return, a pressure relief back to the tank, and double containment.
5. **Day tank** in each plant room that doses, one per chemical, bunded, with its level: low level calls the transfer pump and opens that room's actuated inlet valve; high level shuts it. PWTAG: no dosing straight from a bulk tank without an intermediate day tank unless a risk assessment supports it.
6. **Dosing**: each pool's controller (pH; free chlorine or ORP) drives diaphragm metering pumps drawing from the day tanks and injecting into that pool's treated-water return, after the filters and heater, the acid and hypochlorite injection points well apart. Dosing is interlocked with the pool's circulation flow (HSG179): no flow, no dosing, so no slug of chemical or chlorine gas on restart.

## Storage in each store

The owner, 2026-10-26: each chemical store gets suitable storage facilities, sized for its chemical and modelled as real components:

- **Hypochlorite store**: opaque, UV-stabilised HDPE or MDPE bulk tanks (keep the three, or resize them from the sizing), each in a bund, or one common bund of 110% of the largest tank (and at least 25% of the total), kept cool and out of light, vented to outside; hypochlorite degrades with heat and light, so the room's temperature matters.
- **Acid store** (5 × 5 m): the IBC replaced by a fixed HDPE or GRP bulk tank in its bund of 110%, its vent through a fume scrubber (activated carbon or a wet scrubber) before outside, every fitting acid-resistant, since HCl fumes corrode steel nearby.
- **Both**: the bund sealed and chemical-resistant, with no drain out of it, a bund-leak (liquid) detector, and a sump to pump a spill from; a contents gauge readable from the door; each tank labelled with its chemical, CLP pictograms and capacity; the store's extract and gas detection (the existing `STORE_DETECTION`) kept; the stores physically separate, each door signed for its chemical; an eyewash and safety shower outside the door (decoration, by the owner's ruling).
- Real products as models (Enduramaxx, Harlequin and the like, as `chemicals.ts` already names), each carrying its maker's brand.

Acid and hypochlorite never share a pipe, a duct, a bund or an injection point; mixing them gives chlorine gas (Wells, 1989).

## What to decide

- Which plant rooms dose which pools, so which rooms have day tanks; whether the transfer main runs to each room in turn or branches.
- Tank sizes and transfer rates from the sizing (`src/game/plant-sizing/`), and the acid's strength (the bulk tank at 081's size).
- How the cross-room links are modelled: the paths cross the loading bay, the stores, the corridor and the plant rooms; each room's schematic shows its part, joined by ports, addressed by path, tagged hierarchically (LB-…, HS-…, AS-…, PL2-…).
- What the world saves: tank and day-tank levels, transfer pumps, valve positions, the leak and level alarms; bump `WORLD_VERSION` with a migration. Dosing consumption draws the day tanks down; deliveries ([076](076-chemical-delivery.md)) fill the bulk tanks.
- What is worked where: the fill port and its valve in the yard (local), the transfer pumps' HAND · OFF · AUTO in the store (local), the levels and alarms repeated on the control room's mimic.

## Done when

- The schematics hold both paths from fill port to injection point, every valve with its function, normal state and tag, and the plumber adds nothing (anything it adds means the schematic is incomplete).
- The plumber routes every pipe; the scene draws them, double-contained where required, and binds each valve and pump to its node.
- The model runs: a delivery fills the bulk tank; the transfer keeps the day tanks between their levels; dosing draws them down; the alarms, the overfill stop and the circulation interlock work, with tests beside the logic.
- Tried first in a development room, then placed in the building; `TODO.md` and `CHANGELOG.md` updated.
