# Switch-room flyby with the lighting circuit off

Added the owner’s eight switch-room camera positions to the title’s attract sequence as an open path at the established 0.7 m/s flight speed, with the existing turn/zoom rate limits preserving the final stationary look up. It participates as a back-room shot in the existing random alternation, with the normal eight-beat excerpt and fades.

The shot uses the existing isolated lights-out preset, which switches off the main lighting supply through its world action while retaining the site’s power and working instruments. The camera flashlight is explicitly on, as the owner requested for the lights-out shot. The preset’s title now describes the switched-off circuit rather than assuming a torch. The player’s lighting settings and save are unaffected.

Validation: typecheck, lint (existing warnings only), format check, all 2,358 tests (10 optional skips), and the production build passed against the integrated tree. Build version 0.1.352. Regression checks cover the eight-key path, the final look-up and zoom, lighting-off isolation from the normal scenario, and the actual batten diffuser and point/fill lights switching off and restoring with their circuit.

The owner also reported the tank-hall lights stayed on with the main lighting switched off. Its dedicated room driver never bound its lights, and the hall had no lighting-zone membership. It now shares the Olympic plant room’s circuit, calls the shared room-lighting binder before its first frame and each frame thereafter, and switches both scene illumination and the actual battens’ emissive diffusers. The shared binder retains the central battery’s emergency-lighting behaviour in the integrated version.

The owner supplied a second path: five underwater views in the Olympic pool, with lights on, a fixed heading and pitch, increasing zoom, a rising camera and a roll from −92° to +26°. Added as a separate normal-world shot without squaring or altering the supplied keys. Camera bounds tests now accept a path below the water surface while keeping it above the basin floor. New regression checks cover its end views, constant heading/pitch and monotonic zoom.

Final combined validation: typecheck, lint, formatting, all 2,359 tests (10 optional skips), and the production build passed after adding the rolling dolly zoom. Build version 0.1.353.

Added unlisted title navigation through the shared controls: `[` restarts the current camera move at time zero on a fresh scenario world, and `]` advances to its queued next shot at time zero. The title alone owns the binding’s lifetime; text editing, composition, modified keys, repeated keydown and consumed events are ignored. No keyboard instructions or help entries were added. Pending room imports are invalidated when navigating so rapid presses cannot present an outdated shot. The lights-out shot’s flashlight is now enabled following the owner’s clarification.

Navigation and flashlight validation: typecheck, lint, formatting, 2,362 tests (10 optional skips) and the production build passed, producing 0.1.354.
