import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
} from 'three';
import { METRE } from '../../core/logic/units';
import { COVE_RADIUS } from './room-coves';
import { createCorridor } from './corridor';
import {
  CORRIDOR_HEIGHT,
  CORRIDOR_WIDTH,
  ROTUNDA,
} from '../logic/corridor-path';

/**
 * The rotunda (`logic/corridor-path.ts`): a round room on the corridor's
 * line, built heading +x from its entry at the origin. A neck of the
 * corridor's section, the room, and a neck out. Smooth white plaster, its
 * floor coved to its round wall. Its ceiling: a bulkhead round the edge
 * at the corridor's height, stepping up inside a lip to a raised field,
 * washed from the rim by warm-white LED strip hidden in the step (cove
 * lighting) and fading toward the middle. In its middle a square column,
 * a portrait display (off) on each face toward a mouth, alike, so the
 * room has no front or back.
 */

const PLASTER = '#ece9e2';
/** Warm white, about 3000 K. */
const WARM = '#ffd9a8';

/** A 55-inch display stood portrait, its glass black (off), metres. */
export const PORTRAIT_DISPLAY = { w: 0.73, h: 1.26, d: 0.035, y: 1.5 } as const;

/** The raised field's glow: brightest at the rim, fading inward. */
function glowTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  if (!c) return tex;
  const mid = size / 2;
  const g = c.createRadialGradient(mid, mid, 0, mid, mid, mid);
  // Proportions of the field's radius: plain plaster in the middle, the
  // wash rising to a warm band just inside the lip.
  // The lip is at 0.86 of the field's radius; beyond it is hidden.
  g.addColorStop(0, '#a49e95');
  g.addColorStop(0.5, '#b0a99e');
  g.addColorStop(0.72, '#d2c2a8');
  g.addColorStop(0.82, '#f3d9b4');
  g.addColorStop(0.86, '#fff0d8');
  g.addColorStop(1, '#fff0d8');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  tex.needsUpdate = true;
  return tex;
}

export function createRotunda(metre = METRE) {
  const group = new Group();
  group.name = 'rotunda';
  const { radius: R, neck, column, bulkhead, raised, lip } = ROTUNDA;
  const half = CORRIDOR_WIDTH / 2;
  const cx = neck + R;
  const plaster = new MeshStandardMaterial({
    color: PLASTER,
    roughness: 0.92,
    side: DoubleSide,
  });
  const floor = new MeshStandardMaterial({ color: '#cfccc4', roughness: 0.6 });
  const add = (mesh: Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  // The two necks, of the corridor's own section, a little into the room.
  const into = R - Math.sqrt(R * R - half * half) + 0.05;
  const inNeck = createCorridor(neck + into, plaster);
  group.add(inNeck);
  const outNeck = createCorridor(neck + into, plaster);
  outNeck.position.x = neck + 2 * R - into;
  group.add(outNeck);

  // The floor and the round wall, up to the raised ceiling, with its two
  // mouths left open (on the line of travel).
  const ground = new Mesh(new CircleGeometry(R, 96), floor);
  ground.rotation.x = -Math.PI / 2;
  add(ground, cx, 0, 0);
  const mouth = Math.asin(half / R);
  // A lathe's angle φ: x = r sin φ, z = r cos φ; the mouths are at x = ±R,
  // φ = ±π/2.
  const arcs: [number, number][] = [
    [-Math.PI / 2 + mouth, Math.PI - 2 * mouth],
    [Math.PI / 2 + mouth, Math.PI - 2 * mouth],
  ];
  for (const [start, length] of arcs) {
    // The wall full height beside the mouths…
    const wall = new Mesh(
      new CylinderGeometry(R, R, raised, 96, 1, true, start, length),
      plaster,
    );
    add(wall, cx, raised / 2, 0);
    // …and the floor's cove round it.
    const c = COVE_RADIUS;
    const profile = Array.from({ length: 9 }, (_, i) => {
      const t = (Math.PI / 2) * (i / 8);
      return new Vector2(R - c + c * Math.sin(t), c - c * Math.cos(t));
    });
    const cove = new Mesh(
      new LatheGeometry(profile, 96, start, length),
      plaster,
    );
    add(cove, cx, 0, 0);
  }
  // Over each mouth, the wall from the corridor's head to the raised ceiling.
  for (const side of [-1, 1]) {
    const head = new Mesh(
      new CylinderGeometry(
        R,
        R,
        raised - CORRIDOR_HEIGHT,
        16,
        1,
        true,
        side > 0 ? Math.PI / 2 - mouth : -Math.PI / 2 - mouth,
        2 * mouth,
      ),
      plaster,
    );
    add(head, cx, (raised + CORRIDOR_HEIGHT) / 2, 0);
  }

  // The bulkhead: a ring of ceiling round the edge at the corridor's
  // height, its inner edge turned up into a lip hiding the strip.
  const shelf = new Mesh(new RingGeometry(lip, R, 128, 1), plaster);
  shelf.rotation.x = Math.PI / 2;
  add(shelf, cx, bulkhead, 0);
  const lipFace = new Mesh(
    new CylinderGeometry(lip, lip, 0.12, 128, 1, true),
    plaster,
  );
  add(lipFace, cx, bulkhead + 0.06, 0);
  // The LED strip on the shelf behind the lip, aimed in and up: seen only
  // as its glow.
  const strip = new Mesh(
    new TorusGeometry(lip + 0.06, 0.012, 6, 160),
    new MeshBasicMaterial({ color: WARM }),
  );
  strip.rotation.x = Math.PI / 2;
  add(strip, cx, bulkhead + 0.03, 0);
  // The raised field, washed by it: the glow, drawn, as the strip lights it.
  const field = new Mesh(
    new CircleGeometry(R, 128),
    new MeshBasicMaterial({ map: glowTexture() }),
  );
  field.rotation.x = Math.PI / 2;
  add(field, cx, raised, 0);
  // The light it throws down into the room, soft and warm, from round
  // the ring, and a little more on the column's upper faces.
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const light = new PointLight(WARM, 1.1 * metre * metre, 7 * metre, 2);
    // In the group's metres; its brightness and reach in the scene's units.
    light.position.set(
      cx + Math.cos(t) * (lip - 0.7),
      bulkhead - 0.3,
      Math.sin(t) * (lip - 0.7),
    );
    group.add(light);
  }

  // The column, up to the raised ceiling, and its two displays, alike.
  add(
    new Mesh(new BoxGeometry(column, raised, column), plaster),
    cx,
    raised / 2,
    0,
  );
  const bezel = new MeshStandardMaterial({ color: '#141516', roughness: 0.5 });
  const glass = new MeshStandardMaterial({
    color: '#050607',
    roughness: 0.12,
    metalness: 0.2,
  });
  const { w, h, d, y } = PORTRAIT_DISPLAY;
  for (const side of [-1, 1]) {
    const x = cx + side * (column / 2 + d / 2);
    const display = new Group();
    display.name = 'portrait display (off)';
    const body = new Mesh(new BoxGeometry(d, h, w), bezel);
    display.add(body);
    const screen = new Mesh(new BoxGeometry(0.002, h - 0.04, w - 0.04), glass);
    screen.position.x = side * (d / 2 + 0.001);
    display.add(screen);
    display.position.set(x, y, 0);
    group.add(display);
  }
  return group;
}
