/**
 * A pressure sand filter's nozzles, where they stand on its vessel: one
 * place for the room's ports (`machine-ports.ts`) and the model's own
 * fittings (`views/pumps-plant.ts`), so its gauges sit on its nozzles and
 * nothing is placed on its service hatch. Pure: metres, in the model's
 * frame (the vessel's axis at x = 0, its centre z = -0.35, its face to +z,
 * the floor at y = 0).
 *
 * The inlet to the top distributor, high on the left; the outlet from the
 * underdrain, low on the left; the drain, low on the right; the service
 * hatch low in the middle between them, the sight glass on the bed's top.
 * Each process nozzle carries its pressure gauge (inlet and outlet: the
 * difference between them is the bed's, which says when to backwash), on
 * a tapping and gauge cock rising from the nozzle's top between the
 * vessel and its flange.
 */

export interface Nozzle {
  x: number;
  y: number;
  /** Where it leaves the shell, and its flange, z. */
  shell: number;
  flange: number;
  od: number;
}

/** The vessel's centre, z, in the model's frame. */
export const FILTER_CENTRE_Z = -0.35;
/** A nozzle's flange stands this far proud of the shell. */
export const NOZZLE_REACH = 0.1;
/** The service hatch: its radius, and its centre over the shell's foot. */
export const HATCH = { radius: 0.22, above: 0.35 } as const;

export function sandFilterGeometry(dia: number, shell = dia * 0.57) {
  const r = dia / 2;
  const cy = 0.3 + r * 0.35 + shell / 2;
  const zOn = (x: number) => FILTER_CENTRE_Z + Math.sqrt(r * r - x * x);
  const side = Math.min(0.45, r * 0.7);
  const od = r >= 1 ? 0.225 : 0.09;
  const nozzle = (x: number, y: number, size = od): Nozzle => ({
    x,
    y,
    shell: zOn(x),
    flange: zOn(x) + NOZZLE_REACH,
    od: size,
  });
  return {
    r,
    cy,
    inlet: nozzle(-r * 0.55, cy + shell / 2 - 0.15),
    outlet: nozzle(-side, cy - shell / 2 + 0.15),
    drain: nozzle(side, cy - shell / 2 + 0.15, 0.09),
    hatch: { y: cy - shell / 2 + HATCH.above, radius: HATCH.radius },
  };
}

/** The gauge on a nozzle: how far its dial stands off the shell, and how far its centre is over the nozzle's top. */
export const GAUGE = { off: 0.045, over: 0.16, dia: 0.1 } as const;

/**
 * Where a nozzle's gauge goes: its centre, and its turn about y so it
 * faces square off the curved shell (a gauge facing straight ahead would
 * sink its edge into a big vessel's curve).
 */
export function gaugeOnNozzle(n: Nozzle, r: number) {
  const yaw = Math.atan2(n.x, Math.sqrt(r * r - n.x * n.x));
  return {
    at: [
      n.x + Math.sin(yaw) * GAUGE.off,
      n.y + n.od / 2 + GAUGE.over,
      n.shell + Math.cos(yaw) * GAUGE.off,
    ] as const,
    yaw,
  };
}
