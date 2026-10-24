# Dev35 jacuzzi water lab

Added dev35 (`?room=dev35`) as a local, unsaved prototype room for water effects. It calls the existing pool-hall geometry builder for the jacuzzi hall and the existing jacuzzi tub and piezo control-plate builders. No component geometry was copied. `createJacuzziDemo` creates a fresh controller for the tub and plate together; existing callers keep their original shared controller. The prototype has no world-store, plant-power, water-quality or lighting-zone bindings and no neighbour handoffs. Its START, STOP and LIGHT controls work locally. `window.jacuzziWater` exposes its exhibit handles for development.

Registered the room URL, name and colour, added its developer-directory link and documented it in the README and changelog. Added a regression verifying that toggling the underwater light in one prototype does not change another. The owner's project brief was unavailable at its documented path. No Encabulator files were copied.

Validation passed: typecheck, lint (existing warnings only), repository formatting, 1922 tests (8 skipped) and production build. Chrome displayed the reused jacuzzi with no runtime errors. The build retains its existing chunk-size and ineffective-dynamic-import advisories.

During the later requested pull, main advanced to `fdbe3dc`. Reconciled its new world-wired jacuzzi with the local prototype: the shared original tub/plate still reads and commands the world, while the factory's private state bypasses that binding. Prototype independence and upstream jacuzzi tests passed after reconciliation.
