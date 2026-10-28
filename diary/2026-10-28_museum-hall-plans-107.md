# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 UTC
- **Branch**: main
- **Mission**: 107, the pool science museum: the halls planned as sub-prompts
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner reordered the museum's halls (warmth first, with a real gas boiler and an exchanger heating an ideal pool; then filtration; then chemical dosing; then a hands-on chemistry lab; then the whole plant) and asked for one lettered prompt per hall, each building on the one before. During the session the owner added three rules for every hall (reset on entry with time at now; each hall's own way of showing time; halls empty until built) and a new layout: a ring of 14 rooms round a courtyard two by three, Hall 0 in the south-west corner, 13 exhibit halls.

## Our Approach

A planning task only: no game code. The code was surveyed for what each hall could reuse (the boiler house's HW boiler, its panel and the heat loop; dev51's model, mimic and museum fittings; the chemistry model, the bench's scenarios, the Chlorella controllers, the Grundflow metering pumps, the annunciators), and each hall was written against those paths, with its expected numbers taken from the models' tests and the research doc where they exist and marked indicative where hand-worked.

## Implementation

- `doc/prompts/107-0-exhibit-groundwork.md`: what every exhibit plugs into, since a museum hall cannot yet take input (`use: () => {}`): the exhibit hook, reset on entry, one hall clock, the re-signing, room codes.
- `doc/prompts/107a-…` to `107e-…`: Halls 1 to 5.
- Prompt 107: the new order, layout, rules and an index of the sub-prompts; the stage plan redone (groundwork, four halls in parallel, the new shell, then the finale). TODO and CHANGELOG.

## Outcomes

- One pool throughout (470 m³, dev51's and the bench's), so the numbers carry from hall to hall.
- Each hall shows time differently: the pool clock (Halls 1 and 2), a chart recorder (3), a teleprinter log sheet (4), a station clock (5).
- Findings worth keeping: no fault injection exists anywhere yet; the location annunciator has MUTE, not SILENCE; no pool cover, tariff or radiation loss is modelled; the plate exchanger's view carries no maker; there is no `dev51` alias yet.

## Next Steps

The owner's questions, one at a time (107b's dev51 heating, 107e's finale placement first); then 107-0, then the halls.
