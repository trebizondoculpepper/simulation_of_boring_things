import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { GLOW_SPILL, underConsoleGlow } from '../logic/bridge-lighting';

/** The glow's colour: a cool, faint blue-white. */
const GLOW = '#9fc2ff';

/** A strip of the floor's glow: brightest at the console's foot, gone at `GLOW_SPILL`. */
function spillTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  return new CanvasTexture(canvas);
}

/**
 * The bridge's emergency lighting (the owner, 2026-10-27: EMERGENCY
 * LIGHTS is "only a very dim light coming from under the consoles"):
 * hidden strips at the feet of the desk's segments, the stations and the
 * rear stations (`underConsoleGlow`), each a thin glowing line tucked
 * under its console's edge and a faint glow spilling half a metre across
 * the floor from it, with a little cool fill for the room while lit:
 * enough to just about get around. On the central battery system, so not
 * the room's power (`userData.ownPower`) or its lighting way's dimming
 * (`userData.ownSwitching`): `set(lit)` each frame from the world
 * (`bridgeEmergencyLit`).
 */
export function createBridgeEmergencyLights(kit: PanelKit) {
  const group = new Group();
  group.name = 'Bridge emergency lighting (under the consoles)';
  group.userData.ownPower = true;
  const line = new MeshBasicMaterial({ color: '#000000' });
  const spill = new MeshBasicMaterial({
    color: GLOW,
    map: spillTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  kit.materials.push(line, spill);
  for (const g of underConsoleGlow()) {
    const dx = g.b.x - g.a.x;
    const dz = g.b.z - g.a.z;
    const len = Math.hypot(dx, dz);
    const turn = Math.atan2(dx, dz);
    // The strip, 20 mm up and 30 mm in under the console's edge.
    const strip = new Mesh(new BoxGeometry(0.012, 0.008, len), line);
    strip.name = `Under-console strip (${g.name})`;
    strip.position.set(
      (g.a.x + g.b.x) / 2 - g.out.x * 0.03,
      g.y + 0.02,
      (g.a.z + g.b.z) / 2 - g.out.z * 0.03,
    );
    strip.rotation.y = turn;
    // Its light on the floor, from the foot outward.
    const floor = new Mesh(new PlaneGeometry(len, GLOW_SPILL), spill);
    floor.name = `Under-console glow (${g.name})`;
    floor.position.set(
      (g.a.x + g.b.x) / 2 + (g.out.x * GLOW_SPILL) / 2,
      g.y + 0.006,
      (g.a.z + g.b.z) / 2 + (g.out.z * GLOW_SPILL) / 2,
    );
    // Flat on the floor, its texture's top (v = 1) at the console's foot.
    floor.rotation.order = 'YXZ';
    floor.rotation.set(-Math.PI / 2, Math.atan2(g.out.x, g.out.z), 0);
    floor.renderOrder = 1;
    group.add(strip, floor);
  }
  // The little light they give the room: cool and faint.
  const fill = new HemisphereLight('#cfe0ff', '#202833', 0);
  fill.userData.ownSwitching = true;
  group.add(fill);
  const dark = new Color('#000000');
  const glow = new Color(GLOW);
  let was: number | null = null;
  return {
    group,
    /** Lit, or how far lit (0 to 1: the entrance's fade). */
    set(lit: boolean | number) {
      const level = typeof lit === 'number' ? lit : lit ? 1 : 0;
      if (level === was) return;
      was = level;
      line.color.copy(dark).lerp(glow, level);
      spill.opacity = 0.22 * level;
      fill.intensity = 0.07 * level;
    },
  };
}
