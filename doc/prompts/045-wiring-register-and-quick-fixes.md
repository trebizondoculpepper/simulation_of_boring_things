# 045: The wiring register made true, and the quick fixes

Status: planned 2026-10-24, from the [wiring audit](../reports/wiring-audit-2026-10-24.md). Do this first: it is small, and it stops the register hiding the rest.

## The register

`src/toolkit/gallery/logic/world-bindings.ts` records how each machine meets the world, and says `world` for machines that are not: the boiler cascade, gas train, gas safety, combustion panel, the boiler house's two mimics, the ozone generator, the jacuzzi cabinet (`jacuzzi-pack`), the sand filters and the CCTV. Add a fourth kind, `partial` (shows the world but has controls or readouts that do not reach it), with what is missing, and set each of those to `todo` or `partial` truthfully, citing the prompt that fixes it (046 to 053). Its test pins the list of `todo` and `partial` kinds, which only shrinks. Note in the register's comment the faults it exists to catch: state kept in a view's module, controls that change only the page, readouts from constants.

## Quick fixes (each small, each misleading today)

- **The Olympic balance tank panel's START and STOP** work the pumps' isolators (STOP isolates both, START restores only P-101A). Make them the starters' START and STOP (`motor/starter`), as the pump panel's mimic does.
- **The Olympic's UV and ozone isolators** are in the world but drawn nowhere: give them their isolator stands, as the lounge's have (`room-pipes.ts`, `roomIsolators`).
- **The poolside information sign** (`pool-hall-room.ts`): its hall air and humidity from the world's `hallAir` and `hallRh`, its combined chlorine refreshed.
- **The lounge's dosing controller and dosing pumps** carry the Olympic's tags (AIC-101, DP-101A): their own (the plant identification's). Its dosing pumps' running from the world's dosing as the pool model decides it (held off by the lounge's shut filter path).
- **The pump gauges' formula**, tuned to the Olympic's flow: per pool, from its design flow.
- **The air mimic** (control room and air plant): its supply and extract RUN and its filter DIRTY from the world's units (`air-handling.ts`); a hall's own units, not one fixed hall.
- **The readout board's** supply and extract amps from the units' speeds; the boilers' left until 046.
- **The POOLMON desk**: the lounge called the lounge, not LEARNER; the Olympic's chemistry page labelled as the Olympic's.

## Acceptance

Each fix has a test where its logic is pure; the register's test passes with the corrected entries; typecheck, lint, format, tests and build pass.
