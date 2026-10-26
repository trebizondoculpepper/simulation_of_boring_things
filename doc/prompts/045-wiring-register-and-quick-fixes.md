# 045: The wiring register made true, and the quick fixes

Status: partly done (checked 2026-10-26): later work made several register entries true (the boiler gas, ozone, the jacuzzi cabinet, the central battery), but the `partial` kind and most of the quick fixes are not done.

## Review checkpoint — 2026-10-26

**Classification:** Partial / active. **Filed:** `doc/prompts/045-wiring-register-and-quick-fixes.md`.

**Delivered:** partly done

**Still outstanding:** Retain the prompt’s required work and current root TODO entries.

**Evidence:** Current prompt, its Remaining section and source check. Reviewed against source `e5078c4`.

The original request and earlier implementation notes below are retained as history; this checkpoint supersedes any conflicting old completion claims. Outstanding work remains open in the root TODO.

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

## Remaining (checked 2026-10-26)

- The `partial` binding kind in `world-bindings.ts`, saying what is missing; every entry re-audited; the `todo` and `partial` lists pinned in the ratchet test.
- The Olympic balance tank panel's START and STOP through `motor/starter`.
- Isolator stands for the Olympic's UV and ozone isolators.
- The poolside sign's hall air and humidity from `hallAir` and `hallRh`, its combined chlorine refreshed.
- The lounge's dosing controller and pumps given their own tags (not DP-101A, AIC-101), their running from the world.
- Each pool's pump gauge formula from its own design flow.
- The air mimic's RUN and DIRTY lamps from `air-handling.ts`, per hall.
- The readout board's supply and extract amps from the units' speeds.
- The POOLMON desk: the lounge named as the lounge (not LEARNER), the Olympic's chemistry page labelled as the Olympic's.
