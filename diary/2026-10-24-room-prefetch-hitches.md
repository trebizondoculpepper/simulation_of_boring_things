# Remove speculative scene-build hitches

The owner reported that nearest-room preparation worsened play: a room they did not intend to enter could freeze the current room. The implementation deferred work with an idle callback but then mounted the entire room synchronously, followed by shader compilation and a full effects render. An idle callback changes when this work starts; it does not move it off the main thread or bound its duration.

Changed nearest-closed-door preparation to import and cache its starter module only. The background request does not call the starter, create a renderer or build a scene. Opening a door reuses the same import promise and constructs the needed room. Failed speculative imports are quiet and retry on an actual request. Already visited nearest rooms remain cached; the pool loop's existing neighbour policy is unchanged. Removed the hidden-scene warm-up hook so there is no speculative full composer render during play.

This removes the new rule's speculative construction and first-render stalls, but does not eliminate the first-entry cost when a complex room actually becomes visible. Full background scene preparation needs incremental scene builders, bounded texture uploads and incremental effects initialization, or a larger offscreen-rendering architecture. Recorded that remaining work in TODO.md instead of claiming that wrapping synchronous construction in a promise makes it nonblocking. Added tests covering shared in-flight imports, no starter invocation during prefetch, and retry after failure.

Browser verification at the jacuzzi's closed plant door showed no mounted plant_pool_03 section; opening the door created that section and displayed the room. This checks the construction boundary, rather than claiming a controlled frame-time improvement from manual inspection.

Validation: typecheck, lint (existing warnings), formatting and production build pass. The full suite passes with 1,955 tests passed and eight skipped; the focused cache and door-joint tests also pass. The pipe fixes from the preceding task are committed and pushed as 95318b1.
