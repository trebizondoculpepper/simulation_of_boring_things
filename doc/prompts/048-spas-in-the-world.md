# 048: The spa cabinets and the jacuzzi in the world

Status: partly done (checked 2026-10-26): the jacuzzi's POWER, JETS and AIR, its cabinet's controller and start-up, both cabinets' filters and their washes are in the world; the hall's tub still runs its own spa, and the cabinets' chemistry readouts are not yet from the world.

## Now

The jacuzzi's cabinet POWER is page state (the footbath's is the world's); its JETS and AIR are page state, and the world has no jets or blower. Both cabinets ignore their room's power (the jacuzzi's hums and lights PUMP RUN with its feeder off, while the room's mimic shows it stopped). Their dosing readouts are the constants Cl 1.8 and pH 7.3, their filter gauges 0.7 bar. The jacuzzi tub in its hall and its wall plate run a module-level spa of their own (`rooms/plant/pool-amenities.ts`, `spa`), with its own temperature, ignoring pool_03.

## To do

- The jacuzzi's POWER, JETS and AIR in the world (as the footbath's POWER is), with the room's power and the cabinet isolator; the blower and jets as loads and as what the tub shows (bubbles, surge, sound).
- The cabinets' dosing readouts and filter gauges from the world's pools 03 and 04 (chlorine, pH; a filter's pressure from its flow and dirt).
- The jacuzzi in its hall, and its wall plate, show and work pool_03 in the world: its water temperature, its running, its jets and air; nothing kept in the view.

## Acceptance

Switching the jacuzzi off at its cabinet, at its isolator or at its room's feeder stops it everywhere: the tub, the cabinet, the room's mimic and the control room. Its wall plate's jets button works the world's jets. Tests; checks pass.

## Remaining (checked 2026-10-26)

- The jacuzzi tub in its hall and its wall plate showing pool_03 from the world (temperature, running), with no spa state kept in `pool-amenities.ts`.
- The cabinets' chlorine and pH readouts from pools 03 and 04.
- A test that switching off at the cabinet, its isolator or the room's feeder stops the jacuzzi everywhere (tub, cabinet, room mimic, control room).
