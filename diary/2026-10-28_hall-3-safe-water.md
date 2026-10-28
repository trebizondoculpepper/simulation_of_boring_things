# Development Diary Entry - 2026-10-28

## Context
- **Date**: 2026-10-28 22:30 UTC
- **Branch**: main
- **Contributors**: Claude Code + User

## Problem Statement
Build the museum's Hall 3, Safe water (107c): a closed dosing loop on the ideal pool, every control workable, reset on entry, time on a 24-hour chart.

## Our Approach
Following Hall 1's pattern: a pure model (`museum-3-dosing.ts`), then the layout with the voxel router, then the mimic and the words, then the view. The model reuses the world's controller, sample cell and metering pump heads on the bench's three-cell pool.

## Implementation
Model, layout, mimic, placards and tests; new views for the chart recorder, the DPD kit, the SWIMMERS dial, the fault pedestal and the small day tanks; tuning menus on the DC-1; a key binding on the diaphragm pump view.

## Outcomes
- The brief's DMX 1602 could not keep up with this pool. It sat near 100 % every evening, and after a fault the two-hour dose limit latched it off again and again, so the pumps were swapped.
- The standard diaphragm head's overnight off-gassing gas-locked the idle pump by itself each morning. That is a real effect, but the hall needed a degassing head to avoid it.
- A 1 mg/l integral wind-up during a fault overshoots to about 2.7 mg/l on recovery. That is the lesson of "the controller must not panic", in reverse.

## Next Steps
Click through every Try-it step in the browser, add the new displays to the component benchmark, and get the owner's answers on the pump sizes.
