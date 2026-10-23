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

/**
 * A gauge's boss: a ½" BSP socket in the vessel's wall on a reinforcing
 * pad, a nipple standing square out of the shell, the gauge cock on it, and
 * the gauge on that by its back connection, facing out. How far each
 * stands off the shell, and the dial's size.
 */
export const GAUGE = {
  pad: 0.045,
  nipple: 0.03,
  cock: 0.025,
  /** The gauge's centre off the shell: past its cock, by its back stem. */
  off: 0.12,
  dia: 0.1,
} as const;

/** Where a gauge's boss is: its point on the shell, the way the shell faces there (a turn about y), and the gauge's centre. */
export interface GaugeBoss {
  on: readonly [number, number, number];
  yaw: number;
  at: readonly [number, number, number];
}

/** The sight glass at the bed's top: its middle and radius (`views/pumps-plant.ts`). */
export const SIGHT_GLASS = {
  across: 0.45,
  above: 0.15,
  radius: 0.115,
} as const;

/**
 * The filter's two gauge bosses, in the vessel's wall: the inlet's high in
 * the freeboard over the bed, beside the inlet nozzle on its outer side
 * (below it is the sight glass); the outlet's low at the underdrain,
 * straight over the outlet nozzle, clear of the service hatch.
 */
export function gaugeBosses(dia: number, shell = dia * 0.57) {
  const g = sandFilterGeometry(dia, shell);
  const boss = (x: number, y: number): GaugeBoss => {
    const z = Math.sqrt(g.r * g.r - x * x);
    const yaw = Math.atan2(x, z);
    const on = [x, y, FILTER_CENTRE_Z + z] as const;
    return {
      on,
      yaw,
      at: [
        on[0] + Math.sin(yaw) * GAUGE.off,
        y,
        on[2] + Math.cos(yaw) * GAUGE.off,
      ],
    };
  };
  const { inlet, outlet } = g;
  return {
    inlet: boss(inlet.x - (inlet.od / 2 + 0.11), inlet.y),
    outlet: boss(outlet.x, outlet.y + outlet.od / 2 + 0.13),
  };
}
