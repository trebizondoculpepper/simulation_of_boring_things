# Human access ladders

Implemented prompt 071's shared human-ladder helper. It wraps the existing pool, tank-access and caged ladder drawings, records each ladder's ends and collision footprints, and exposes room climb zones through the central controls. Decorative handrails and cable containment keep separate names and have no climb zones. Removed the unused second climb mechanism.

The balance tank hall and backwash pit now offer their lower floors and walls to walking and only allow entry while their gates or hatch are open and the water is low. The pit and tank exits remain available to a player already below. Caged and utility ladders receive short guarded upper landings. Tests cover layout, zone discovery, landing and floor selection; the full project checks were run before commit.
