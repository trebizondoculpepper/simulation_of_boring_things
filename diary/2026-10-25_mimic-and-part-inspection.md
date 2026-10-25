# Development Diary Entry - 2026-10-25

## Context

- **Date**: 2026-10-25, afternoon (UTC)
- **Branch**: main
- **Commits**: 63e2d0d (the LED chaser) through b2cd02c (prompt 068 done)
- **Contributors**: Claude Code, Codex (reviews of 066 and 069, kept in `doc/reviews/`), and the owner (rulings throughout)

## Problem Statement

Mission 066: redesign the lounge pool's local panel, PL1-CP1, as a schematic mimic grouped by filter, showing its flows, one component shared with the control room. Then a pump bug the owner found, an ozone monitor without a reading, and prompt 068: hovering a button, lamp or display inside a component should describe that part, not its panel.

## Our Approach

Codex reviewed 066 first. Its findings shaped the build: the four lounge valves per filter can make a true backwash path; the control room has no wall space without moving something (the owner's to decide); `checkMimic` could not prove a layout, so a footprint check was written. The owner added a development room for assemblies (dev39), dev0 staying for single components.

## Implementation

- The mimic LED chaser (`mimic-chaser.ts`): one LED in four lit, stepping in real time in the flow's direction, dark under 1 m³/h; lines without a flow draw as before.
- The true backwash in `loungeValveFlows`: signed per-filter flows, the pool's return dropping by the backwash; two new flowmeters, PL1-F1-FT1 and PL1-F2-FT1, in the model.
- `LOUNGE_FILTER_MIMIC` and `createLoungeFilterMimic`, laid out against `mimic-layout.ts` (no overlaps, 30 mm round every button); PL1-CP1's fascia now uses it.
- The owner's bug: a lounge pump counted its partner's open discharge valve as its own, so a duty pump with its valve shut never starved and the standby never started. Each pump now pumps only through its own valve.
- Prompt 068: a typed part contract (`part-inspection.ts`): a command carries the action its press sends; readings and lamps their selector and condition. Then every part in the part library describes itself as it shows itself, so the audit counts 0 undescribed parts in every room.
- Prompt 069 written (each machine's own states), reviewed by Codex.

## Outcomes

- The owner liked the mimic and worked it in dev39; a bug there was dev39 sharing the `dev` save with another tab, which overwrote what was done (it now has its own world).
- The owner's rulings, given mid-build, reshaped the overlay: it says only what the thing itself shows, or what someone beside it would see, hear or feel (a pump's hum), never a peek into the model; On and Off for things without a fault model. Buttons no longer say their target's live state; meters read exactly as their displays (size and arrow; O-R over range).
- Codex's 069 review found that the lounge's actuated valves were described by their command, not their travel; fixed.

## What we learned

- An accessibility overlay is a second display, not a debugger: its words must be derivable from what is on screen or sensible in the room.
- A part library is the right place for the baseline description: one change covered about 400 parts that family-by-family work would have taken hours to reach.
- Shared save slots in dev rooms make tests in the browser lie; dev rooms should have worlds of their own.

## Next Steps

- The owner's decision on the control room's wall space, so the lounge mimic's second copy can be installed.
- The mimic's polish: the readout legend cut short, lines behind valve units, the decimal point.
- The owner's review of 069, then each machine's state vocabulary.
