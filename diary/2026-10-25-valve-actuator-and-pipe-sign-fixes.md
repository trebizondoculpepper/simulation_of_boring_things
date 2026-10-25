# Valve actuators and suspended pipe signs

The owner reported two visual faults: an actuator detached from an upright collar valve, and pipe identification plates floating below their pipes.

The upright butterfly valve's stem projects along +z, but its actuator mounting axis had been rotated toward +x. The actuator now follows the stem while its override faces horizontally. Geometry regression checks verify stem-to-yoke contact for electric and pneumatic drives on x-, y- and z-axis pipes, including room placement transforms.

Pipe plates now hang from two 3 mm metal wire loops around the pipe and short drops to the upper fasteners. Front and back share the supports; stencilled pipes and vertical runs gain no hanging hardware. Tests verify both ends of each drop on x- and z-axis runs in either flow direction.

Validation: typecheck, lint, format check, all 2,202 tests (8 skipped), and production build passed. Lint retains existing warnings outside these changes. Build advanced to 0.1.298. A fresh headless Chrome scene visually confirmed the suspended plate and attached upright actuator; screenshot: `/tmp/pool-valve-sign-fixes.png`.
