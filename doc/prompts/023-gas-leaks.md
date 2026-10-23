# Prompt: modelling gas leaks (parked)

Written by Claude (Opus 5.5, Claude Code), 2026-10-23, for future work. Parked by the owner the same day ("stay focused on modelling rooms and getting basic stuff working"); pick it up only when the owner asks. It is now scenario 6 of the owner's eight test scenarios (prompts 024 to 031), and uses the experimental sources (Dev20) and their sinks. Read `AGENTS.md`, then prompt 022 (gas detectors) and `src/game/plant/experimental-source.ts` (experimental sources).

**Status:** Not started (a draft air model only: `src/game/plant/room-air.ts`).

## The idea (the owner, 2026-10-23)

Model gas leaks, as a start on modelling disasters of all kinds. The first experiment: an experimental ozone source, joined to a manual ball valve, joined to a new component, a **vent**. The vent works for gaseous fluids (chlorine, ozone): while its valve is open it lets the gas leak into the room's air, which trips an ozone detector.

## The design so far

A draft, pure and tested, is in `src/game/plant/room-air.ts` (with `room-air.test.ts`). It is not used by any room yet.

- **Room air.** A grid of cells, a cubic metre each (the owner's choice), each holding each gas's concentration in mg/m³. Each step:
  - a leak adds to its cell;
  - each gas spreads to its neighbours (diffusion standing in for the room's mixing; walls reflect);
  - a gas denser than air sinks (ozone 1.66, chlorine 2.45 against air), a lighter one rises;
  - ventilation carries off a share by its air changes an hour.
- **Vent.** Releases at its rated rate (g/h), drawn from its source, while its valve is open and the source has gas; nothing otherwise.
- **Detector.** Samples its cell, converts to ppm (25 °C, one atmosphere), follows with a first-order lag (t90, about 30 s), and latches a low and a high alarm until reset with the air clear. Working levels after EH40: ozone 0.1 and 0.2 ppm; chlorine 0.5 and 1 ppm.
- **Showing the cloud.** Tint each cell faintly by concentration: chlorine slightly green (the owner; it is a yellow-green gas), ozone a faint blue (a game convention; ozone is colourless at these levels).

## Still to do

1. A vent view and a detector view (a real product: its maker, its head low on a wall or a post, its alarm lamps and a reset), bound to the model; reuse the lever ball valve (`createInlineFitting`, `isolating-valve`, `hand`) and the experimental source view.
2. A dev room: ozone source → ball valve → vent, a near and a far detector; then a chlorine line beside it. Open the valve; the near detector alarms first.
3. Room air in the world state (`src/game/world.ts`), per room, if a leak must carry on while the player is elsewhere (bump `WORLD_VERSION`, add a migration).
4. The detectors' alarms to the control bus and the control room's annunciator; the ventilation's fans driving `airChanges`, so purging a room is something the player does.
5. Other disasters on the same air: a gas main leak (natural gas, lighter than air, rising), a chemical mix in the dosing room making chlorine.
