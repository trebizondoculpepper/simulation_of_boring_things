# Development Diary Entry - 2026-10-27

## Context

| Time      | Branch | Commit  | Task                                                                |
| --------- | ------ | ------- | ------------------------------------------------------------------- |
| 00:30 UTC | main   | 73bd15c | Dev44 committed: framed tanks, transfer, selector, day tanks, trial |
| 01:30 UTC | main   | 0216ab7 | The chemical distribution in the world                              |
| 02:30 UTC | main   | 09911de | The distribution's machines placed in every room                    |

## Problem Statement

The owner asked for the chemical handling to be designed end to end and to see, by morning, the model updated and the new tanks placed in each room. Before that, through the evening of 2026-10-26: realistic models for dev44 (the owner liked a DENIOS-style framed black HDPE tank), level by ultrasonic or radar rather than sight glasses, a single transfer pump (light work; a failed one is soon swapped), a six-way transfer selector with two outlets blanked for pools to come, the manifolds in the wet hall's dirty side, day tanks sized to each pool, and hover text saying how full each tank is and whether it fills or drains.

## Our Approach

Model first, as the project's rules ask. The dev44 trial's logic (an ideal source, one pump, a selector, several day tanks: tested) became the world's `chemical-distribution.ts`: each chemical a line of day tanks in its selector's outlet order, the stores' bulk litres staying in `world.chemicals` so every existing reader still works. Each pool now doses from its own day tank (`PoolStock` lets the pools model take a stock per pool), and the transfers draw the stores down. Then the machines: every one bound to the world through an adapter that makes the world's line look like the dev44 trial's state, so the same kit models serve both.

## Implementation

- `src/game/plant/chemical-distribution.ts` and its tests: day tank sizes and footprints, the switches (low 20%, high 90%, high-high 98% trip), the selector (AUTO in turn, HAND the pick), the store's low-level cut-out, litres conserved; a line saved with fewer tanks is padded.
- `world.ts`: `distribution`, its action, its step (`stepChemicals`); `WORLD_VERSION` 45. The acid store is one 4,000 l tank.
- Schematics: `schematic-parts.ts` gained `dayTanks`, `storeTransfer` and `transferSelectors`; the stores, the wet hall, the lounge, jacuzzi and footbath, and the Olympic's annex carry the new nodes and links (the Olympic keeps its drawn `hypo-supply` and `acid-supply` ids, now from its day tanks).
- Placement: `room-equipment.ts` lists the new items; the stores pack them (enlarged to 6 × 9 m and 6 × 6 m to keep the shower and extract); the hand-laid rooms place them by `CHEM_AT`. Registries: kinds, asset ids and tags (HS-P1, AS-P1, WH-XS1/2, PLn-DT1/2; asset-0055 retired), world bindings, health.
- Views: `chemical-distribution-views.ts` binds each key to the world; the day tank station is sized by litres.

## Outcomes

- Every check passes; the rooms were looked at in the browser. The selectors first sat over the wet hall's fire point and under the backwash pit's davit, and the Olympic's acid tank across its south door's path: all moved.
- A save from mid-evening carried three acid day tanks; the world failed to step until a short line was padded.
- The footbath needed an acid day tank after all: the pools model holds pH only with acid, so the plan's "no acid for the footbath" was wrong for this model.

## Next Steps

- The mains and branches as routed, double-contained pipes; the controls (the wet hall's distribution panel, the stores' panels, each plant room's day tank panel, the control room's mimic); deliveries into the bulk tanks (076); dosing rates from the pools' bather load.
