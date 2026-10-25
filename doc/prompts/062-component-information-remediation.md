# 062: Component information, what remains

Status: opened 2026-10-25 by the overnight session that implemented prompt [060](060-inferred-component-descriptions.md) (descriptions) and stage 1 of prompt [061](061-component-information-overlay.md) (the inspection overlay), at the owner's request: "If you think there's a problem with them, get as much as you can done, and then make a new mission called Mission 62 to remediate what's left." Each item says what is wrong or unfinished, where, and what done looks like. Items are ordered by how much they block the owner's acceptance of 061's stage 1.

## 1. Stage 1's remaining acceptance checks

Checked in Chrome so far: PL3-BT1-IV1's and PL3-BT1's lines, P-101A Off then On with the pointer still, a wall clearing the line, dev0's controls named by their parts. Still to check in the browser, as 061's test list asks:

- Pointer lock (centre aim), a gamepad and touch (both centre aim; the code path is the pointer lock's, untested by hand).
- Narrow screens: the two-line help on a phone width, where `.controls-help` moves to the top for touch.
- Ladders, carrying, noclip, the pause menu, the console and room changes taking precedence or clearing the line (in the code: `first-person.ts`, the `inspecting` condition).
- **A closed cabinet door.** Picking blocks at the first surface, and a scene test proves it, but no room yet has a separately marked component behind a door: the jacuzzi cabinet's internals and its door are all PL3-CAB1, so the browser check is vacuous. Done when one inspectable component stands behind a door (for example the jacuzzi cabinet's pump, or the switch-fuse's internals) and is named only with the door open.

## 2. Components not yet marked

The overlay names only what scene builders mark (`markComponent`). Marked: placed layout equipment, room pipework and cabinet services valves, flowmeters, switch-fuses, PL3-BT1 and the four circulation pumps. Not yet:

- Controls nested in plant: the jacuzzi cabinet's buttons and display, the motorised valve panels' switches, the pump panels' starters, mimic and control panel buttons. They have no plant tags; 061 says an untagged item shows its name alone, so mark them `{ name }` from their parts' names (dev0 does this through `identify`), or give them tags in a register if the owner wants them tagged.
- The footbath's identified model parts (PL4-CAB1-SW1, PL4-PW1-RV1 and the rest): described in the inventory, not marked in the scene.
- Rooms not wired: the pool halls (`poolrooms-world.ts`), corridors, and the dev rooms other than dev0. Only dev0, the plant rooms and the shell rooms pass `inspect`.

## 3. Statuses the world could give but does not yet

Prompt 060's status policies are wired for motors, pump sets, balance, break and backwash tanks, the booster set, the jacuzzi cabinet and the footbath cabinet's switch. Each of these kinds has the policy `none` for now, so its line stops at its room:

- Olympic sand filters (In service / Backwashing): needs the battery's flow helper bound by filter number (`olympic-plumbing`, the flowmeters' readings).
- AHU stacks: the catalogue's AP-AHU1… and the world's AHU-801… are different tags; add an explicit mapping before any status (060 forbids joining by array index).
- UV units, dosing, heat exchangers, boilers: only where an existing pure helper proves the state.

## 4. Drawn and network valve names still disagree

The owner (2026-10-25): "if we have misnamed valves in the network, now would be a very good time to fix it … make sure all of our names are unique and all of our components are properly registered". The lounge's two backwash conflicts are fixed (network waste BV1, supply BV2). The rest are listed in the section below as reconciliation proceeds.

## 5. Single items

- **PL2-F-RV1**, the Olympic battery's side-stream regulating valve, has no description: it throttles rather than isolating a route, so the valve template does not fit. Needs either a regulating-valve template ("Regulates water flowing from … to …") from the owner, or a rare authored purpose.
- **PL4-PW1-IV2**, "Overflow from the spa valve" in the footbath room, is a valve on a gravity overflow; the owner removed the same thing from the jacuzzi (PL3-JZ1-IV2, 2026-10-25: "A gravity overflow is never valved; shut, it would flood the deck"). Owner to rule whether the footbath's goes too.
- **The first pick's cost**: about 40 ms in the Olympic plant room while bounding boxes are computed lazily; warm them when the room is built (or in idle time) so the first hover does not hitch.
- **Stage 2 (action narratives)** has not begun: 061 says it starts once stage 1 is accepted.

## 6. Notes for whoever picks this up

- Another agent was editing the same checkout overnight (the engineers' office storage cupboards: `room-equipment.ts`, `world-bindings.ts`, `engineer-storage-*.ts`, `engineers-office-electrical.ts`). Its uncommitted work makes `room-equipment.test.ts` fail ("Parts stores cupboard: expected -2.25 to be greater than -2.2") and `engineers-office-electrical.ts` fail to typecheck; neither is this mission's. The `storage-cupboard` kind was added to `equipment-kinds.ts` so the catalogue accepts its items.
- `src/game/world.test.ts`'s "come as usual while the plant runs…" timed out once under the full parallel suite and passes alone.
