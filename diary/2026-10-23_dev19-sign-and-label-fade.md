# Dev19 water quality sign and label visibility

The dev19 pool now has a post-mounted water quality sign. Its temperature, pH and free chlorine values come from typed control edges on the pool node. Unmeasured fields show dashes, and its power follows mains supply. The sign has its own graph node and physical power port.

The shared micro-label, maker badge and brand nameplate views now fade their material opacity according to the projected height of the lettering. The fade runs from invisible at five screen pixels to fully visible at twelve, so distance and camera zoom use the same rule. Dynamic labels are retained during static geometry merging.

Each dev19 motorized gas or water valve and the motorized breaker now offers a local override button. The first press forces the opposite of the remote command and the second releases back to remote operation. Dev19's physical service routes also use the pipe helper's port leads so each run begins square to its connection.
