import { withIntake } from '../../../game/plant/site-intake';
import { Light, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import { zoneLit } from '../../../game/plant/lighting';

/** How much of a room's light its emergency lighting gives, a share of its normal. */
export const EMERGENCY_SHARE = 0.12;
import type { LightingZoneId } from '../../../game/plant/lighting';
import { emergencyLit, newWorld } from '../../../game/world';
import { roomWorld } from '../../save/world-store';

/**
 * A room's electric lights, following their zones' state in the world
 * (`src/game/plant/lighting.ts`): its lights and the glowing diffusers of
 * its fittings, each at its own brightness while its zone is lit, out
 * while it is not.
 *
 * - Each belongs to the room's zone, unless it or something it hangs
 *   from says otherwise (`userData.lightZone`): a pool hall's scene holds
 *   its corridors' lamps too.
 * - Daylight (`userData.daylight`) is never switched: the sun through a
 *   hall's skylights. A light that is partly daylight bounce keeps that
 *   share when its zone is out (`userData.daylightShare`).
 * - A fitting's diffuser is a material marked `userData.lightFitting`.
 * - The torch (`Torch`) is the player's, and left alone; so is a light
 *   switched by its own room (`userData.ownSwitching`: the bridge's
 *   emergency lighting, on its own switch and the central battery).
 *
 * What it finds is found again every couple of seconds, so a machine
 * built later is caught too.
 */
export function bindRoomLights(
  scene: Object3D,
  zone: LightingZoneId | undefined,
) {
  const store = typeof window === 'undefined' ? null : roomWorld();
  const fallback = newWorld();
  type Dimmed = { zone: LightingZoneId; base: number; share: number };
  const lights = new Map<Light, Dimmed>();
  const fittings = new Map<Material, Dimmed>();
  const zoneOf = (o: Object3D | null): LightingZoneId | undefined => {
    for (let p = o; p; p = p.parent)
      if (p.userData.lightZone) return p.userData.lightZone as LightingZoneId;
    return zone;
  };
  const scan = () => {
    scene.traverse((o) => {
      if (o instanceof Light) {
        if (
          o.name === 'Torch' ||
          o.userData.daylight ||
          o.userData.ownSwitching ||
          lights.has(o)
        )
          return;
        const z = zoneOf(o);
        if (!z) return;
        lights.set(o, {
          zone: z,
          base: o.intensity,
          share: (o.userData.daylightShare as number | undefined) ?? 0,
        });
        return;
      }
      if (!(o instanceof Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of materials as Material[]) {
        if (!m.userData.lightFitting || fittings.has(m)) continue;
        const z =
          (m.userData.lightZone as LightingZoneId | undefined) ?? zoneOf(o);
        if (!z || !('emissiveIntensity' in m)) continue;
        fittings.set(m, {
          zone: z,
          base: (m as Material & { emissiveIntensity: number })
            .emissiveIntensity,
          share: 0,
        });
      }
    });
  };
  let since = Infinity;
  return {
    update(delta: number) {
      since += delta;
      if (since > 2) {
        scan();
        since = 0;
      }
      const world = store?.world.value ?? fallback;
      const lit = (z: LightingZoneId) =>
        zoneLit(withIntake(world.plant, world.intake), world.lighting, z);
      // Its normal lighting out, the emergency lighting from the central
      // battery while it has charge (`emergencyLit`): a dim fraction, as
      // the non-maintained fittings among them give.
      const emergency = (z: LightingZoneId) =>
        !lit(z) && emergencyLit(world, z) ? EMERGENCY_SHARE : 0;
      for (const [light, d] of lights)
        light.intensity =
          d.base * (lit(d.zone) ? 1 : Math.max(d.share, emergency(d.zone)));
      for (const [m, d] of fittings)
        (m as Material & { emissiveIntensity: number }).emissiveIntensity =
          d.base * (lit(d.zone) ? 1 : emergency(d.zone));
    },
  };
}
