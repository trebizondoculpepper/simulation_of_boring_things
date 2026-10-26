# Prompt 071: human ladder implementation plan

Status: researched 2026-10-26. This is the implementation plan for [prompt 071](../prompts/done/071-ladders.md). No other prompt blocks the work.

## Classification and scope

**Human access ladders** carry a person between two walkable surfaces. The helper covers pool ladders, stainless tank access ladders, fixed caged ladders and short utility ladders. Every visible human access ladder must have an exit at each end; a visual roof or wall without a walkable landing does not count. The helper must produce the visual ladder, its solid parts and its climb zone from one placement.

**Cable ladders** carry cables, not people. This includes the misleading `ladder` fixture in `src/toolkit/components/architectural/logic/architectural-fittings.ts` and `architectural-fixtures.ts` (documented there as a Legrand Swifts cable ladder), as well as `site-dressing/views/service-parts.ts`, `service-ceiling.ts` and corridor cable containment. Rename ambiguous fixture identifiers to `cable-ladder` where possible; none gets a climb zone. Gates, hatches and cages are parts of an access route, not ladders by themselves.

**Handrails** provide a grip beside a step or seat but are not rung routes. `gallery/views/pool-hall.ts` calls `createPoolLadder` with width `0.01` for a stair handrail and `0.4` for a hot-tub seat grab rail. Give these dedicated handrail drawings and exclude them from the ladder audit. Other `createPoolLadder` calls must be classified at implementation time.

## Code and room audit

| Existing piece                          | Current location                                                                              | Required change                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Shared Use/W/S climb                    | `controls/logic/ladder-zone.ts`, `controls/input/first-person.ts`                             | Keep one mechanism; check mounting priority, solid filtering and floor handoff.              |
| Pool ladder and traversal-derived zones | `gallery/views/pool-ladder.ts`; pool, donut and arched rooms                                  | Move real pool access ladders to helper; remove traversal once all rooms use returned zones. |
| Bespoke pool zone                       | `gallery/rooms/pool-room.ts` (`BACK_LADDER`)                                                  | Generate from the helper's placed ladder.                                                    |
| Stainless access ladder                 | `components/plant/views/tank-ladder.ts`; balance tank hall and backwash pit                   | Preserve its appearance and maker badge, add bounds/zone and gated availability.             |
| Fixed caged ladder                      | `components/plant/views/railings.ts`; `blockout.ts`, `balance-plant.ts`, `plant/services.ts`  | Add a walkable, guarded top landing or change the display so it has one.                     |
| Second climb algorithm                  | `components/architectural/logic/ladder-climb.ts`                                              | Remove after checking its consumers; do not maintain two movement models.                    |
| Cable ladder fixture                    | `components/architectural/logic/architectural-fittings.ts`, `views/architectural-fixtures.ts` | Rename/classify as cable containment; leave outside helper and tests.                        |

Search all constructors and zone literals again before editing. Record each human ladder's room/exhibit, transform, floor heights, exits, gate/hatch and safe-entry rule in a data-backed audit. This table is a starting inventory, not proof of completeness.

## Research applied to the game

[ISO 14122-4:2016](https://www.iso.org/standard/61283.html) covers fixed access ladders to stationary machinery and certain building structures serving machinery. Its public abstract establishes scope, not free access to detailed dimensions. The 2016 edition postdates much of the game's circa-2000 plant, so use it as a modern design reference without claiming the fictional installation originally complied with it.

The [HSE safety alert on hooped ladders](https://www.hse.gov.uk/safetybulletins/hoopedladders.htm) says hoops alone do not provide complete fall arrest and can interfere with some fall-arrest systems. Keep cage geometry configurable and guard the destination and opening separately. [HSE work-at-height guidance](https://www.hse.gov.uk/work-at-height/faqs.htm) treats falls through openings as work-at-height risks; it does not supply a universal cage-start height for every game ladder.

[HSE confined-space guidance](https://www.hse.gov.uk/confinedspace/introduction.htm) says tank/pit entry should be avoided where possible and, when necessary, controlled for flooding, atmosphere, isolation and rescue. For this mission, balance-tank and backwash-pit climbing is a maintenance action: require an open gate/hatch and a low-enough water level, with visible feedback when access is unavailable. Do not invent a full permit-to-work system. Pool ladders remain routinely usable in water and are not subject to that tank-entry gate.

## Helper contract

Expose one public `createHumanLadder` helper from `src/toolkit/components/architectural/views/` or the corresponding shared component location. Its discriminated kind is `pool | tank-access | caged | utility`. Put dimensions, rung/exit anchors, tight collision footprints and invariants in a sibling pure `logic/ladder-layout.ts`; logic must not import Three.js. The public result has a stable ID, a Three.js group, physical solids and a `LadderZone`, all derived from the same geometry in metres and transformed together into room coordinates. The caller supplies top and bottom floor heights and an external enabled predicate for gate, hatch and water-level rules.

Preserve the existing pool-ladder form and the branded stainless and caged designs. Do not use one solid rectangle across an entire cage and both exits: it would block mounting and dismounting. Register tight stile, bracket and cage obstructions and the allowed rung passage. While attached, the walker may need to ignore only that ladder's own solids; surrounding walls remain solid. Validate that top and bottom exit discs lie on actual floors and outside other solids at the respective heights.

## Implementation order

1. **Inventory and prototype.** Classify all constructor calls and explicit zones. Implement the pure layout and helper, then draw each kind in a two-level dev exhibit with actual lower and upper floors. Test rotated/transformed anchors. Replace the two false pool-ladder handrails with handrail models before relying on the audit count.
2. **Shared movement.** Reuse `LadderZone`; retire `ladder-climb.ts`. Mount only with Use at an enabled end, use W/S and existing gamepad/touch equivalents for motion, and release onto the first reached exit. Maintain noclip's no-interaction behaviour. Test that `floorAt` does not snap the walker back to the old level on release.
3. **Use and gating.** Closed gate/hatch means no ladder zone is offered, so Use can operate the gate/hatch. Open access offers a zone only when its destination passes the water-level rule. Make the interaction priority explicit: carried-object use, reachable closed gate/hatch, enabled ladder, then other controls. Do not steal Use outside the ladder approach side and end reach. Keep access open while occupied or provide a reachable inside release so the player cannot be trapped below.
4. **Balance tank hall.** `tank-hall-room.ts` currently returns floor 0 everywhere. Add `TANK.floor` inside the tank at the lower level, using previous height to choose between gantry and tank floor where they overlap. Keep walls, gantry rails, pipes and water solid at their own elevations. Feed the gate's actual state and the world tank level into zone availability. From a suitably drained tank, the player must descend, walk a maintenance area, turn around, re-mount and reach the gantry.
5. **Backwash pit.** `wetHallFloorAt` currently returns the hall floor across the pit. Add the pit-floor level inside the actual shifted pit footprint using previous height. `backwash-pit.ts` currently includes `hatchArea` in solids when the lid is **open**; convert this to a guarded opening for ladder use, while the closed cover remains solid. Expose gate and hatch state to `shell-room.ts`. The pump, sump, walls and all non-entry rim areas remain solid. Provide an inside release or hold-open behaviour and test exit after descending.
6. **Elevated destinations.** Caged ladders on sectional and balance tanks need supported tank-roof or service-platform floors at their exact top heights, with guarded edges and level-specific collision. The services exhibit needs an actual upper platform, not a dead-end display wall. If a room cannot fit a usable landing, move or omit that human ladder rather than keeping a decorative dead end. This work must precede enabling its zone.
7. **Pool migration.** Replace real pool ladder construction and the bespoke `BACK_LADDER` zone with helper results, keeping depth, side and rotation from each basin. Verify shallow/deep and curved rooms, underwater bottom exits and dry top exits. Remove `poolLadderZones` traversal only when no room depends on it. Cable ladders and step/seat handrails remain without zones.

## Acceptance and verification

- A data-backed audit enumerates every visible human access ladder in shipped rooms and dev exhibits. Each has one helper result, one enabled or gated zone and two physically supported exits. No old human-ladder constructor is called outside the helper. Cable ladders and the two handrails are explicitly excluded.
- Pure tests cover transformed anchor and floor alignment, end clearance, gate/hatch and water-level availability, Use priority, both dismounts and no immediate floor snap. Room tests cover balance tank and backwash pit at both elevations; pool tests cover distinct basin shapes. Browser-walk one of each kind, including down-and-up in both wet tanks and onto a caged tank top.
- The closed access gives an actionable reason instead of mounting. The player cannot be trapped below by a cover/gate or clip through walls, cage, roof, water or machinery. Normal walking resumes at either end; noclip does not operate ladders.
- Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build` before committing. A save migration is needed only if access state becomes persisted world state.
