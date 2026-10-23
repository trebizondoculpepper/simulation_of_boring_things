# 034: The Olympic's mimic wall

Status: planned 2026-10-23; nothing built yet.

The owner, 2026-10-23, once the Olympic plant room was redone (prompt 033) and its valves made solenoid-operated: the controls and mimics are redesigned for the new plant, in two identical copies, one local in the plant room and one remote in the new control room.

## Local and remote: one node, two views

The owner's ruling (2026-10-23): no LOCAL/REMOTE key switch. Both copies drive, and are driven by, the same world state: each lamp, readout and switch on either board binds to the same address in the plant model (`doc/plant-model.md`), so working one is working the other, and both always show the same thing. A real plant would make one of them command and the other display; ours does not, on purpose.

## The boards

Four mimic tiles by Penfold Controls, the same height, standing side by side in the order the water flows, each pipe line leaving one tile's edge carrying on at the same height on the next, so the wall reads left to right as the water's path through the plant (as tiled wall mimics of around 2000 were built):

1. **Treatment:** ozone, UV, the chlorine and pH controller, the hypochlorite and acid dosing pumps, the sample flow, the chlorine and ozone gas detectors. Mostly readouts and alarms.
2. **Filter battery:** the five filters, each with its valves (command and open/shut lamps), the pressure drop across its bed, and a backwash sequence indicator (FILTERING, DRAIN DOWN, AIR SCOUR, BACKWASH, RINSE, RETURN TO SERVICE): a backwash is a sequence to watch, or one that jams on a valve that did not make its limit.
3. **Circulation:** the balance tank's levels and make-up, the duty and standby pumps, the battery as one block, the ozone contact tank, UV, the pool return. The board looked at first.
4. **Electrical:** a single-line diagram of the busbar ring, its fused tap-offs, the generator changeover, each machine's isolator.

The Olympic's heat exchanger side-stream is one more branch on the existing heating board (`heating-mimic.ts`), which stays the boiler room's.

The balance tank keeps its own local panel (Dev28's `balance-tank-panel.ts`), to go into the Olympic plant room beside the tank hall doors.

## Where they stand

- **Local:** along the plant room's east wall, under the gantry, by the room's control panel, where power and control come in.
- **Remote:** the same wall in the control room, as the Olympic's section of its central view.

## Order of work

Each tile is tried on dev0's boards first, then the wall built twice. The filter battery tile first: it is the most complex, and where the solenoid valves show.
