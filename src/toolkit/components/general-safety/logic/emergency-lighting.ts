/**
 * Emergency escape lighting, measured: how much light a room's emergency
 * fittings put on its floor when they are on their batteries, and whether
 * that meets BS 5266-1. Pure logic, metres, y up.
 *
 * Each fitting is a point source facing down, its intensity falling off
 * from straight below as cos^k of the angle (k = 1 is a plain diffuse
 * downlight; less than 1 is a wide open-area optic that throws more light
 * sideways; more is a narrow spot). Its luminous flux all goes into the
 * hemisphere below, so its peak intensity is flux × (k + 1) / 2π.
 * Illuminance on the floor is the sum over the fittings of I(θ) cos θ / d².
 * Reflected light is ignored, as the standard requires.
 */

export interface EmergencyFitting {
  x: number;
  z: number;
  /** Mounting height above the floor, metres. */
  height: number;
  /** Its light on battery, lumens. */
  lumens: number;
  /** How its intensity falls off from straight below: cos^spread. */
  spread: number;
}

/** BS 5266-1:2016 (with BS EN 1838). */
export const BS5266 = {
  /** An open (anti-panic) area: at least this, lux, on the floor. */
  openArea: 0.5,
  /** An escape route: at least this, lux, along its centre line. */
  escapeRoute: 1,
  /** The border of an open area left out of the measurement, metres. */
  border: 0.5,
  /** The most the brightest may be of the darkest, in an open area. */
  uniformity: 40,
  /**
   * A point of emphasis (each exit door, call point, piece of firefighting
   * equipment, first-aid point, change of direction): a fitting within
   * this horizontal distance, metres.
   */
  emphasis: 2,
  /** On the floor at a call point or firefighting equipment, lux. */
  equipment: 5,
};

/** Its intensity, candela, at angle `theta` from straight below. */
export function intensity(fitting: EmergencyFitting, theta: number) {
  if (theta >= Math.PI / 2) return 0;
  const peak = (fitting.lumens * (fitting.spread + 1)) / (2 * Math.PI);
  return peak * Math.cos(theta) ** fitting.spread;
}

/** The illuminance on the floor at (x, z), lux, from every fitting. */
export function illuminance(
  fittings: readonly EmergencyFitting[],
  x: number,
  z: number,
) {
  let lux = 0;
  for (const f of fittings) {
    const across = Math.hypot(x - f.x, z - f.z);
    const d2 = across * across + f.height * f.height;
    const cos = f.height / Math.sqrt(d2);
    lux += (intensity(f, Math.acos(cos)) * cos) / d2;
  }
  return lux;
}

export interface EmergencyCheck {
  /** The darkest and brightest of the open area, lux. */
  minimum: number;
  maximum: number;
  /** Brightest over darkest. */
  uniformity: number;
  /** For each point of emphasis, the nearest fitting, metres across. */
  emphasis: { name: string; nearest: number; lux: number }[];
  /** What fails, in words; empty if it all passes. */
  problems: string[];
}

/**
 * Check a room's emergency lighting against BS 5266-1: its open area
 * (less the border) sampled every `step` metres, and each point of
 * emphasis (`equipment` for call points and firefighting equipment, which
 * also need 5 lux on the floor).
 */
export function checkEmergencyLighting(
  fittings: readonly EmergencyFitting[],
  area: { minX: number; maxX: number; minZ: number; maxZ: number },
  points: readonly {
    name: string;
    x: number;
    z: number;
    equipment?: boolean;
  }[] = [],
  step = 0.25,
): EmergencyCheck {
  let minimum = Infinity;
  let maximum = 0;
  const b = BS5266.border;
  for (let x = area.minX + b; x <= area.maxX - b + 1e-9; x += step)
    for (let z = area.minZ + b; z <= area.maxZ - b + 1e-9; z += step) {
      const lux = illuminance(fittings, x, z);
      minimum = Math.min(minimum, lux);
      maximum = Math.max(maximum, lux);
    }
  const uniformity = maximum / Math.max(minimum, 1e-9);
  const problems: string[] = [];
  if (minimum < BS5266.openArea)
    problems.push(
      `open area: ${minimum.toFixed(2)} lux at its darkest, under ${BS5266.openArea}`,
    );
  if (uniformity > BS5266.uniformity)
    problems.push(
      `open area: uniformity ${uniformity.toFixed(0)}:1, over ${BS5266.uniformity}:1`,
    );
  const emphasis = points.map((p) => {
    const nearest = Math.min(
      ...fittings.map((f) => Math.hypot(p.x - f.x, p.z - f.z)),
    );
    const lux = illuminance(fittings, p.x, p.z);
    if (nearest > BS5266.emphasis)
      problems.push(
        `${p.name}: nearest emergency light ${nearest.toFixed(1)} m away, over ${BS5266.emphasis} m`,
      );
    if (p.equipment && lux < BS5266.equipment)
      problems.push(
        `${p.name}: ${lux.toFixed(1)} lux on the floor, under ${BS5266.equipment}`,
      );
    return { name: p.name, nearest, lux };
  });
  return { minimum, maximum, uniformity, emphasis, problems };
}
