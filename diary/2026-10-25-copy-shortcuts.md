# Copy references and camera pins

The owner asked for Ctrl+C to copy the highlighted object reference and Ctrl+P to copy the current pin or noclip camera position, with the results logged for debugging. Cmd works too on Mac.

The shared first-person controller owns both shortcuts, before stance and flight controls. Ctrl/Cmd+C takes the same debounced target shown in the information overlay: its stable tag, or its name for an untagged part. Ctrl/Cmd+P uses the existing pin/camera copying path, preserving room, coordinates, yaw, pitch, zoom, noclip and roll. The app supplies clipboard effects through a small controls callback; rooms bind no input.

The game’s developer console and the browser console report copied values, missing targets and clipboard failures. Camera button and menu copies share the same logging. Held keys copy once; input fields, editable content, selected-text copying, paused menus, console input and hidden or following rooms keep their existing behavior. The Controls reference and pin tooltip document the shortcuts.

Validation: typecheck, lint, formatting, all 2,212 tests (8 skipped), and production build passed; build advanced to 0.1.302. The first full test run hit the existing 5-second timeout in the day-long bather simulation while Chrome was also running; the full rerun passed without browser contention. Existing lint and bundle-size warnings remain. A fresh Chrome fixture exercised tagged and untagged references, no target, repeated keys, Ctrl and Cmd, normal and noclip URLs, clipboard denial, game-console logs, no crouch/use side effects, and exclusions for input, textarea, select, contenteditable, selected text, pause and console input. All 19 browser checks passed without browser exceptions.
