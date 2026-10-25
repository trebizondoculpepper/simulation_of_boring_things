# Stair camera smoothing

Mission 055 now filters only the camera's floor height. The walker's `currentFloorY` stays exact for collision, ladders and other game logic. The view chases it at 3.81 m/s, no more than 0.46 m behind, in either direction. Placing the walker, entering or leaving noclip or a ladder, and a floor jump over 0.5 m reset the filter.

The pure filter has tests for risers in both directions, lag, reset, nonpositive frame time and a walking ramp. The project checks were run before commit. The listed stair locations still need an in-game visual walk-through.
