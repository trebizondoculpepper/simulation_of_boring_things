# Engineer’s office cupboards, sockets and PIR

Restored the scenario simulator to its original east-wall position and replaced the west-wall filing placeholder with adjacent solid-door and glazed engineer’s cupboards. The cupboards start with their doors closed, retain their working drawers and bins, and use the shared pickup controls for stored parts. Their labels and glazing are marked passive so a room power cut does not treat them as illuminated equipment.

Added a visible 240 V conduit ring and three switched twin sockets, including one near the desk. The office PIR uses the existing occupancy-sensor model, senses walker motion on entry, switches the office lighting zone on after 0.35 seconds, and switches it off after 90 seconds without movement. A focused timer test covers the make delay and vacancy hold; the office layout test checks the cupboard bounds and a power-cut regression checks its passive materials.

During the planned ten-minute check, reviewed prompts 060 and 061 and appended progress comments to the end of each prompt without changing the other agent’s implementation.
