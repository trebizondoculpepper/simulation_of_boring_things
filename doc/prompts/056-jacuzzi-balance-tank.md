# 056: The jacuzzi's balance tank

Status: specified 2026-10-24. Stage 1 done (1305a28), stage 2 done 2026-10-24; a trial room, dev38, tests the cabinet with an ideal spa, tank and sources.

## Purpose

The jacuzzi is deck-level: its water spills over its rim into a gutter, and the gutter drains to a balance tank, from which the circulation pump draws. The only thing standing in for that tank today is the treatment cabinet's surge vessel, about 35 L drawn, while the water model uses 0.84 m³. Neither is right, and without a tank of the proper size the system could never work: eight bathers getting in would overflow it, and the pump would draw it dry when they got out (the owner, 2026-10-24). The cabinet keeps its size and becomes a cabinet that works with an external balance tank, which stands beside it in the plant room.

## Sizing

A spa's balance tank is sized from what it must absorb, not as a share of its volume as a pool's is (5–10 %). From the PWTAG code of practice as summarised by Pool & Spa News (about 80 L displaced per bather), with every seat taken, since a spa is often full:

| Allowance                                                              | Jacuzzi (8 seats, 4.5 m², 28 m³/h)      |
| ---------------------------------------------------------------------- | --------------------------------------- |
| Bathers, 8 × 80 L                                                      | 0.64 m³                                 |
| Water in transit (gutter and pipes, draining back when the pump stops) | 0.13 m³                                 |
| Lift from the air and jets, 20 mm over the surface                     | 0.09 m³                                 |
| Working reserve, 30 s of the pump's flow                               | 0.24 m³                                 |
| Total                                                                  | 1.10 m³                                 |
| With a 10 % margin, to the next 0.1 m³                                 | 1.3 m³ (about 45 % of the spa's 2.8 m³) |

The make-up float holds the tank low enough that the bathers' surge and the air's lift fit above it, and the low-low cutout leaves the working reserve below it.

## Stage 1: the model, with an ideal tank

- A pure sizing module for a spa's balance tank (allowances above), and the jacuzzi's tank from it: 1.3 m³, a GRP cylinder 1.1 m across and 1.55 m tall, its float and low-low levels set by the allowances. The world's water balance uses it for `pool_03`.
- The cabinet's controller (`jacuzzi-cabinet.ts`) is given the tank it draws from as an input: its fill, whether it is at low-low (the pump held off, TRIP: TANK LOW, restarting by itself as it recovers) and whether its make-up is filling it. Its display shows the tank's fill (TANK 34%, FILLING).
- An ideal balance tank (always at its working level, never low) for testing the cabinet alone. Every cabinet test runs against the ideal tank first; the world's tests then run it against the real one.
- Tests: the sizing (the surge fits above the float, the reserve below it); the cabinet with the ideal tank (every existing behaviour); with a tank run low (trips, restarts, display); and the world's (`jacuzzi-systems.test.ts`).

## Stage 2: the tank installed, and the plumbing redone

- A balance tank component (a vertical GRP tank, its level sight gauge, its make-up float valve, its overflow and its connections as ports), tried in a development room first.
- Installed beside the cabinet in the jacuzzi's plant room: the spa's overflow (gutter) into it, the pump's suction from it, its make-up from the water service, its overflow and drain to the gully. The cabinet's surge vessel becomes its pump's strainer pot. Every run laid by the plumber between ports; the valve registry, the valve panel and the mimics updated to match; no clashes (`cabinet-ports.test.ts`).
- Its sight gauge shows the world's tank level.

## Acceptance

The five project checks; the changelog; TODO.md ticked with dates and commits; the plant room checked in a browser after stage 2.
