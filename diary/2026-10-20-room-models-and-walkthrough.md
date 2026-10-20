# Separate room models in a connected shell

The owner asked to walk the planning layout as empty, named rooms before adding pools or plant equipment. The existing facility plan already contained the public and service rooms and open doorways. A pool/equipment scale study started during this session was removed after the owner clarified the scope.

`src/scene/facility.ts` now builds each room as a separate `room:<id>` group with local geometry, places it at the plan coordinates, and assembles all groups in one scene. The first-person controller and wall collision use the same door openings as before. The walkthrough remains one level; the lower level in `doc/planning/pool-district-block-plan.svg` is not yet modelled.

The room shells have no pools, machinery, scenery or working controls. The aim is to judge room size, order and travel distances before those details are chosen.
