# Wiring audit, 2026-10-24

The owner asked, before more work, for an audit of every major system that is not properly wired: components that are decorative, page-local, or misleading, and what it takes to make the leisure centre fully operational. This is the result, from reading the code (three parallel read-only sweeps, their main claims spot-checked). The work it calls for is in prompts [045](../prompts/045-wiring-register-and-quick-fixes.md) to [053](../prompts/053-fire-alarm.md) and on `TODO.md`.

## The pattern

Two systems were found broken the same way this week and fixed: the air handling units (all their state in a module-level object in a view: unsaved, run only while their room was shown, no effect on the halls) and the pool plant rooms' pump panels (showing the world's pumps but their controls changing only page state). The audit looked for every other case, and for two related kinds of fault: displays fed by constants or formulas posing as readings, and controls saved to the world that nothing reads.

The register that should have caught these, `src/toolkit/gallery/logic/world-bindings.ts`, records `world` for several machines that are not: the boiler cascade, gas train, gas safety board, combustion panel, the boiler house's two mimics, the ozone generator, the jacuzzi cabinet, the sand filters and the CCTV. Its test checks only that every machine has an entry, not that the entry is true.

## Findings, by severity

### Page-local plant: the air units' fault again

- **The boiler house** (`rooms/plant/boiler.ts:63`, `house`): six boilers, the gas house, the emergency stop, the emergency control valve, combustion and fouling in one module-level object; unsaved; stepped only while the room is shown. Its controls (power keys, RESET, setpoints, the ECV, the gas emergency stop, TEST, the combustion fan) change only it. The world's heat is a flag (`sources.heat` and the boiler house's feeder): locking out every boiler leaves the pools heated, and the boilers fire because the pools are drawing heat, not the reverse. The boiler house's natural-gas safety is a separate page system from the world's gas detection.
- **The ozone generators** (lounge and Olympic, `views/room-equipment.ts:742`): each room builds its own ozone plant in closure state; START, STOP, setpoint, RESET and HAND-OFF-AUTO change only it; its circulation flow is a constant. The water counts as treated while either its UV or ozone isolator is on, so STOP has no effect. The lounge's contact tank shows the dev ozone room's residual; the Olympic's is a static vessel.
- **The jacuzzi** (`rooms/plant/pool-amenities.ts:356`, `spa`): the tub in its hall and its wall plate run a module-level spa of their own, ignoring pool_03's world water, power and isolator.
- **The central battery** (`electrical-switchgear.ts:1247`): its own per-instance state; its tests work on the page only; its MAINS lamp means "not in test". There are no emergency light fittings: on a mains failure every fitting goes dark.

### Controls that change the world but nothing reads

- **Installed valves** (`installed-valves.ts`): every registered valve is operable and saved, but only the lounge's eleven and the Olympic's battery valves change flows. About 25 do nothing: the wet hall's six (shutting the town main's stop valve does not stop the break tank filling), the jacuzzi's seven, the footbath's overflow and heating valves, the Olympic's five filter drains, its regulating valve and its four heat exchanger valves; the boiler house's gas and LTHW valves are its page model's at best.
- **The Olympic balance tank panel's START and STOP** work the pumps' isolators, not their starters: STOP isolates both, START restores only P-101A.
- **The Olympic's UV and ozone isolators** are in the world but drawn and worked nowhere.

### Displays fed by constants, formulas or the wrong source

- **The control room's heating mimic**: boiler lockout lamps always off, the ESV and circulator always on, pressures constants plus a sine, the calorifier a ramp.
- **The air mimic** (in the control room and the air plant): supply and extract RUN always lit, filter DIRTY never, outside air fixed, one hall only, none of the world's units.
- **The readout board**: supply and extract amps fixed from the `air` flag, the boilers' amps from the pools' heating.
- **The annunciator**: eight windows can never light (boiler lockout, gas detected, LTHW low, chemical leak, fire alarm, pool alarm, generator running, spare); ACCEPT and RESET are page state; MUTE only prints.
- **The alarm printer**: page state, timed by the page's clock, not the world's.
- **The spa cabinets**: dosing readouts the constants Cl 1.8, pH 7.3; filter gauge 0.7 bar; both ignore their room's power (the jacuzzi's hums and lights PUMP RUN with its feeder off); the jacuzzi's POWER, JETS and AIR are page state; opening a cabinet turns its UV off on the page only.
- **The lounge's sand filters**: one clean-filter pressure difference scaled by flow for both, no dirt, so no filter alarm outside the Olympic.
- **The poolside information sign**: hall air as the water minus 1.5 °C and humidity from the `air` flag, not the world's hall air and humidity; combined chlorine set once.
- **Mislabelled**: the lounge's dosing controller and dosing pumps carry the Olympic's tags (AIC-101, DP-101A); the lounge's dosing pumps can show running while the world's lounge dosing is held off by its shut filter path; the pump gauges' formula is tuned to the Olympic's flow; the POOLMON desk calls the lounge "LEARNER", shows the Olympic's chemistry unlabelled, and has no footbath.

### Decorative, but looking operable

- **BMS outstation** ("COMMS OK 0 ALM" painted), **fire alarm repeater** ("SYSTEM NORMAL", painted keys), **CCTV** (grain over four labelled quarters; registered as wired). The corridors' fire call points are signs only. The world has no fire alarm system.
- **Boiler house vessels**: pressurisation unit, calorifier, low-loss header, dosing pot with fixed gauges; system pressure a constant 2.4 bar.
- **Hypochlorite tanks**: each 1000 L tank shows the whole 12,000 L store's level. No control makes a chemical delivery, so stock only falls.

### Abstract flags standing in for machines

The world's utility sources (`services.ts`) are always on in practice; only the room feeders matter.

- **heat**: decides pool water and hall air heating and the boiler house's circulator, unrelated to the boilers.
- **air**: decides the `ahu-fault` alarm, a hall's "ventilated" flag (alongside its units' real share), the chemical stores' and ozone rooms' extract fans, and powers the lounge's valve actuators as if it were compressed air; unrelated to the units.
- **chemical**: the stores' feeders gate dosing beside the real stock; acid dosing needs the hypochlorite store's feeder.

## Wired, and confirmed so

The pools' water, chemistry, temperatures and levels; the circulation pumps' starters and their local panels (P-101A/B, P-201A/B); the Olympic's filter battery and its valves; the lounge's eleven valves; the Olympic balance tank's displays and make-up selector; the wet hall's booster set, meter, mimic and tanks; the chemical stores' stock, gas detection and extract; the main switchboard, main switch and lighting; the air handling units and their controllers; the footbath cabinet's POWER, setpoint, low water, drain and make-up; the scenario simulator. The control room's scripted demo loop (`plantAt`) runs only where there is no page (tests).
