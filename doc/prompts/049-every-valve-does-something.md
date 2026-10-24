# 049: Every installed valve does something

Status: planned 2026-10-24, from the [wiring audit](../reports/wiring-audit-2026-10-24.md).

## Now

Every registered installed valve (`installed-valves.ts`) is operable and saved, but only the lounge's eleven and the Olympic's battery valves change flows. About 25 do nothing: the wet hall's six (shutting the town main's stop valve does not stop the break tank filling; the backwash discharge valve shows shut while the world discharges), the jacuzzi's seven, the footbath's overflow and heating valves, the Olympic's five filter drains, its regulating valve and its four heat exchanger valves, and the boiler house's gas and LTHW valves (with 046).

## To do

- Each room's flow model reads its valves: the wet hall's (`stepWetHall`: the main's stop valve, the break tank's inlet and outlet, the backwash tank's inlet and discharge), the jacuzzi's and the footbath's circuits, the Olympic's filter drains (a filter drained down), regulating valve (its flow) and heat exchanger valves (its pool's heating through the exchanger, isolated or bypassed).
- A valve that, on reflection, has no part in the model is either given one or retired from the register, never left operable and dead.
- **The lounge's filters** on the Olympic's pattern (`olympic-battery.ts`): each bed's flow from its valves, its dirt, its pressure difference, its backwash; its filter alarm able to fire. (With the open item "the other pools on the Olympic's pattern".)
- A test that walks the register: for each valve, shutting it changes some flow, level or temperature in the world, or it is listed as deliberately inert with a reason.

## Acceptance

No installed valve is operable without an effect. Checks pass.
