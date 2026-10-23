# 035: The Olympic plant room, working

Status: started 2026-10-23. The to-do list for making the Olympic plant room (prompt 033) one working plant, the owner's order: item 1 first.

The owner, 2026-10-23: the room looks finished, but its parts follow different models. The valves and the flowmeters follow the world's valve states (`installedValves`, `olympic-battery.ts`); the machines (pumps, filter gauges and sight glasses, UV, dosing) follow the older whole-pool reading (`plantReadingOf`), which knows nothing of the room's valves; the tank hall runs a balance tank of its own.

## To do

- [x] **1. One model for the Olympic's water** (done 2026-10-23: `olympic-battery.ts`, `world.olympic`, WORLD_VERSION 16; the pools' step takes the Olympic's circulation and waste from it; the filters' gauges and sight glasses, the meters, and the reading's filter pressure differences read it; tested in `olympic-battery.test.ts`; seen in the game, a backwash of filter 2 reading −134.6 m³/h on its meter, its bed lifted and its water brown). Note: the Olympic now backwashes only when its valves are worked, so unattended its beds foul and its circulation falls (a backwash sequence on its controls would do it). An Olympic circulation model in the world state, built on the battery model: the balance tank, the pump pair, the five-valve battery, the contact tank and UV, back to the pool, with the heat exchanger's side-stream; each filter's dirt kept in the world, fouling in service and washing out in a backwash. Every machine, gauge, sight glass and meter in the room reads it.
- [ ] **2. The tank hall in the same model.** The hall's tank is the world's (`pools.pool_02.balance`), so the pumps draw from the tank one sees and the overflow and make-up fill it. The balance tank panel (Dev28's) and the make-up solenoid valve into the Olympic plant room, beside the tank hall doors.
- [ ] **3. The mimic wall** (prompt 034). Four Penfold tiles (treatment, filter battery, circulation, electrical), each tried on dev0's boards first; built twice, local under the east gantry and remote in the new control room (which is to be built); the Olympic's heat exchanger branch on the existing heating board.
- [ ] **4. Fittings implied but not drawn:** the pumps' non-return valves; each machine's local power isolator; the busbar's fused tap-offs.
- [ ] **5. Safety:** the chlorine and ozone gas detectors (prompt 022); the warning signs on the tank hall doors (from the background agent's research).
- [ ] **6. Housekeeping:** the diary entry for 2026-10-23; the room-name overlay after a hand-over through a door; the stray `retired0` git tag (remove if the owner wishes).
