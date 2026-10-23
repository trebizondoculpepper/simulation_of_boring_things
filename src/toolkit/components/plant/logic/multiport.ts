/**
 * A small sand filter's top-mount multiport valve: where its body and
 * unions are, shared by its view (`createMultiportFilter`) and the rooms
 * that pipe to it. Its own frame: on the floor, WASTE toward +z. Pure.
 */
export const MULTIPORT = {
  y: 1.31,
  ports: {
    pump: { at: [-0.2, 1.31, 0], out: [-1, 0, 0] },
    return: { at: [0.2, 1.31, 0], out: [1, 0, 0] },
    waste: { at: [0, 1.31, 0.2], out: [0, 0, 1] },
  },
} as const;
