# Self-closing doors and room visibility

Added independent door models to every planned room connection, including the lower stair landing and outside entrance. Single and double leaves swing open as the walker approaches, remain open briefly while nearby, and close after departure. Closed leaves join walking collision. Room models load only for the current room and neighbours behind open doors; door models stay in the scene even when their destination rooms unload.

Walked from reception through the changing village door in the browser and confirmed the room changed without blocking passage. Pure logic tests cover door placement, automatic closing and closed-room visibility. Typecheck, lint, formatting check, tests and build passed.
