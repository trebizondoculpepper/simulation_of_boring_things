# Installed plant identity: current gap audit

2026-10-22. This is a progress record against the owner's target: each visible installed valve has exactly one physical asset identity, a readable tag, one World-owned position, a working view control and a causal place in the simulated circuit. A valve is complete only when all five links exist. Development-room exhibits are separate disposable examples.

## What is connected now

- The three footbath service valves (`PL4-PW1-RV1`, `PL4-PW1-DV1`, `PL4-MU1-LCV1`) have visible controls and labels. Their positions are saved in `World.identifiedPlant`; return, drain and make-up positions affect the footbath water model. The cabinet power switch also has a World binding.
- The 43 valves authored in `roomPipes` for PL1, PL2, the wet hall and boiler house have explicit permanent asset IDs and display tags in `installed-valves.ts`. Their scene controls and web inventory read the same saved position in `World.installedValves`. The view sends the permanent ID as its command target; the display tag is an alias.
- Placed equipment has an explicit asset ID and display tag register, independent of layout order. The web and PDF schedules use that register and identify entries that still await circuit migration.

## Gaps that must remain visible

- The 43 room-pipework valve positions do not yet change pump flow, filter routing, water balance or gas flow. A World-owned position is necessary, but it is not yet a working process valve. The next circuit slice needs typed port connections and negative line-up tests before the manual can call them operational.
- `plantTools.butterflyValve` still draws unbound levers inside production machine models: balance tanks and break tank (`balance-plant.ts`), the booster set (`booster-set.ts`), pump sets (`pumps-plant.ts`), boiler twin-head pump (`boiler-plant.ts`) and other component views. These need individual installed child IDs, World bindings and circuit effects, or an explicit decision that a particular visible fitting is passive/cosmetic. A parent machine's catalogue row does not count as a row for each valve.
- The gas emergency control valve built in `gallery/rooms/plant/boiler.ts` has local state. It needs an installed asset ID, an operator plate and a binding to the existing gas-safety model.
- Development-room sand-filter face valves in `gallery/rooms/plant/pumps.ts` are local demonstration controls. Keep them outside the installed catalogue, with a clear exhibit namespace.
- The footbath block tree still uses the displayed tag as its state address. Its installed controls need permanent IDs and a save migration before changing tags or moving assets. Do not create a second copy of their position in `installedValves`.
- The current placed-equipment register is a catalogue of parent objects. It does not prove that every lever, gauge or switch inside each parent is catalogued or simulated.

## Required validation for the 1:1 rule

For every production view binding, validate an installed asset ID; for every operable installed asset, validate a reachable view binding and a World action. Validate unique IDs and display tags, typed media and ports, connected required ports, and one state owner. Verify the effect of each line-up through `applyAction` and `advance`, including closed-route/no-flow cases and saved-world reloads. Finally inspect representative scenes for readable labels and unobstructed access. A catalogue row alone cannot pass this check.

## Containment and display names

An integral valve belongs to its installed machine or cabinet, not to a room-level valve list. Its catalogue entry has an explicit `parentAssetId`; the display path can therefore read `PL1.CAB1.V_RET_1` for a cabinet return valve, while `PL1.P2` names a pump. A valve on connecting room pipework belongs to an explicitly named pipework parent. These are display paths, not save keys. Existing hyphenated tags stay as aliases until the labels, manual and saves are migrated together; no rename should create another physical asset or another state field.

Ports and indicators may follow the same hierarchy, with different semantics. `PL1.P1.SUCTION` and `PL1.P1.DISCHARGE` identify typed water connection ports; `PL1.P1.RUN_LAMP` identifies a physical indicator child with a reading derived from World state. Generic `INPUT` and `OUTPUT` are ambiguous on a machine that also has electrical power and control signals. A port appears in topology and the catalogue but has no independently mutable valve position. An indicator has a view binding and a reading, but is not a flow link.

The full path belongs in instructions and the catalogue; the physical port need only say `SUCTION` or `DISCHARGE` when a clearly labelled parent pump makes the context obvious. The validator checks that the visible short label belongs to the intended installed child. It must not require every child to print its full path.
