# Development Diary Entry - 2026-10-28

## Context

- **Date**: 2026-10-28 UTC
- **Branch**: main
- **Contributors**: Claude Code + User

## Problem Statement

The owner asked for an annunciator for each major location in the old control room, at least the Olympic pool, the lazy (lounge) pool and the wet hall, each showing its own location's faults, the wet hall's also in the wet hall, and every one of those faults on the bridge too (mission 099).

## Our Approach

The lounge's annunciator already existed with its own state and actions. Rather than copy it twice, its ISA sequence M with first-out was made generic (`location-annunciator.ts`), and a registry (`location-annunciators.ts`) gives each location its windows, engravings and sensing function. The world's `loungeAnnunciator` became `locationAnnunciators` (version 56, migrating the lounge's state), with one pair of actions taking the board's location, or none for the bridge.

## Implementation

The Olympic's 24 windows read its pool's conditions exactly as the main board does (mapping ids), adding the ones the main board lacks; the wet hall's 18 windows read the world's wet hall, chemical distribution, sewer monitor, intake and fire alarm. The board view was generalised from the lounge's, sized to its rows and columns. The bridge's annunciator, viewscreen, sweep, Central Control rows and alarm bleep now take every location's windows in; the viewscreen had been counting only the main board's.

## Outcomes

- The control room (5.5 × 8.5 m) had no wall left for two more boards and its staff noticeboard: the packer is greedy and the operator's desk blocks the north and west walls. It is now 10 m deep.
- A wall item in a modelled room needs its schematic node and its place in `roomElectrics`, or the model tests find its feed and control stub drawn outside the model.
- In the browser, URL navigation reloads the page and can lose faults set by the dev handle just before; set faults after the page has loaded. Buttons work with E at the crosshair, not in noclip.

## Next Steps

The chemical control box's windows once 091 puts its faults in the world; the faults wanted but not yet modelled are listed in `TODO.md`.
