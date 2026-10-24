# Lounge filter-valve audio

The owner reported silent valves on the lounge pool's filter controls. The mimic's OPEN/SHUT buttons already use the shared push-button component and its click, but `createActuatedButterflyValve` had no actuator audio. Added quiet synthesized solenoid switching, pneumatic cylinder exhaust while moving, and a mechanical stop when travel finishes. These belong to the shared valve component, spatially located on its pilot and actuator, and follow bound position and supplies rather than only manual clicks.

Room pipework now exposes an audibility gate through the equipment builder. Both room frameworks hush equipment when hidden or following another room's camera. A valve primes its transition history on arrival, resumes a genuinely ongoing stroke, and avoids replaying clicks or stop sounds for movement completed elsewhere. Regression coverage checks remote lounge-style commands, travel/end stops, power-loss spring return, disposal and hidden-room resynchronization.

Validation: 44 relevant valve, world, equipment and visual-connection tests pass, as do typechecking, lint and production build. Repository-wide formatting finds four files from other ongoing edits: machine-tones.ts, music-speaker.ts, spa-pack.ts and tones-room.ts; these were left untouched by this fix.
