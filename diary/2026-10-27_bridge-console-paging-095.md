# Development Diary Entry - 2026-10-27

## Context

- **Date**: 2026-10-27 UTC
- **Branch**: main
- **Contributors**: Claude Code + the owner

## Problem Statement

The owner asked for "something consistent ... in the bottom left of each of the consoles, that I can page left and right and lock each of the consoles in place, and it should remember what I've chosen", and for Central Control to choose what the main viewscreen shows. A plan had been written earlier (`doc/research/bridge-console-paging.md`).

## Our Approach

Follow the plan's staging: a generic pager widget in `ui2d`, the consoles' choices in the world, a page registry in the gallery's logic, and one view mounting every console with its page rebuilt only when the world's choice changes. While it was built the owner watched and ruled four times: the order ◄ LOCK ► with equal buttons and larger, centred arrows; LOCK only on the displays that turn by themselves; LOCK holds the turning, not the paging; and, most important, roles: a workstation's lower panel chooses its officer, which decides the upper displays' pages (lower for control, upper for information).

## Implementation

`src/ui2d/pager.ts` (`ConsolePager`); `src/game/bridge-consoles.ts` (40 consoles, kinds, defaults, roles and governors; `bridgeConsoles` in the world, `WORLD_VERSION` 52, action `bridge/console`); `src/toolkit/gallery/logic/bridge-pages.ts` (44 pages, `ROLE_PAGES`, paging, role changes, strip placement); `src/toolkit/gallery/views/bridge-console.ts` (`buildPage`, `createBridgeConsole`, `installBridgeConsoles`, replacing `bridge-room.ts`'s loops); the viewscreen blank behind a chosen page, with the alarm takeover over it; `hold` on the schematic screens for LOCK.

## Outcomes

- Pressing a strip at first did nothing: the touch surface's sheet and screen lie in one plane, and the ray struck the sheet. The console's forwarder now hands any touch inside a strip's rectangle to its screen by its point in the plane.
- Central Control's viewscreen strip went beside its own, not above: above, it covered ACCEPT ALARMS.
- A role's panel shown at another station is scaled into that station's place as panels always were, so a narrow panel (ADM-01) looks small at Central Control's wide place.

## Next Steps

The owner to try the roles live and adjust `ROLE_PAGES`; perhaps a panel size per place for roles' panels shown at other stations.
