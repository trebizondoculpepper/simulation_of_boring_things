# Round pink room beyond CR_A_UP

The west end wall of the dry stair landing was removed. It now opens directly into `CR_A_ROUND`, a 7 m diameter room with pink ceramic tile, its own room name and URL. The two spaces share one mounted visual scene at the open threshold, so crossing does not switch the stair's finish.

The square landing and circular floor meet under a flush grated gully. The new room has a 3 m diameter, 0.2 m deep foot-cleaning basin with a shallow water surface, and a round framed skylight over its centre. The collision floor follows the basin depth. The stair landing remains dry and at its previous height.

The room transition and rendering rules learned from the staircase mismatch are recorded in `doc/design/room-transition-rendering.md`. The new room and gully were inspected in Chrome from the supplied landing URL and from within the pink room.

Walking from `CR_A_UP` into `CR_A_ROUND` initially blanked the view: the logical room-label handoff called `showOnTop`, which hid PR_A's shared render canvas while leaving the transparent stair canvas in front. The same-scene transition now changes only the URL and label. A live browser walk across the boundary retained the pink room image.
