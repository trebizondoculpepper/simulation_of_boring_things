import {
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  RingGeometry,
  TubeGeometry,
  Vector3,
} from 'three';

/** A wall inlet: its centre, metres, and the way it faces (its yaw: 0 faces +z). */
export interface Inlet {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /**
   * A level ledge below it, such as a spa's seat under its jets: at
   * height `y`, reaching `reach` metres out from the wall. With the water
   * below it, a stream falling short of its edge ends on it, with no rings.
   */
  ledge?: { y: number; reach: number };
}

/** What drives them: whether water is coming in, and where the surface is. */
export interface InletFlow {
  /** Water entering through these inlets now (`footbathMakeUpEntering`). */
  filling: boolean;
  /** The water's surface, metres, in the inlets' frame. */
  surfaceY: number;
  /** How much water there is, 1 with water, falling to 0 as it empties. */
  wet: number;
}

/** How fast the water leaves an inlet, m/s: a gentle make-up, not a jet. */
const EXIT_SPEED = 0.9;
const G = 9.81;
/** A stream's radius, metres: narrow. */
const RADIUS = 0.005;
/** Half the height of a small wall inlet's nozzle, metres: water above this covers it. */
const NOZZLE = 0.012;
/** How long a ring takes to spread and fade, s, and how far it spreads, m. */
const RING_SECONDS = 1.5;
const RING_REACH = 0.2;
const RINGS = 3;
/** Fading in and out: quickly, but not in a blink. */
const FADE_SECONDS = 0.25;

/**
 * Fresh water coming in through a pool's wall inlets (`doc/prompts/
 * 041-footspa-makeup-jets.md`): from each, a narrow, clear stream, and
 * small rings spreading on the surface near it, nothing white and nothing
 * churning the whole bath. With the inlet's nozzle under water there is
 * no spray, only the rings rising over it (the owner, 2026-10-23); with
 * the water below it, it arcs down through the air and ends at the
 * surface, and the rings spread where it lands. Visual only: it is told when water is coming in and where the
 * surface is, and follows; the world's water balance decides both. No
 * lights. Built in metres, in the inlets' frame.
 */
export function createInletStreams(inlets: readonly Inlet[]) {
  const group = new Group();
  group.name = 'Inlet streams';
  // A few soft, light streaks along the stream, scrolled along it to show
  // it moving.
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 8;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#9fdfe6';
  c.fillRect(0, 0, 64, 8);
  for (const [x, w] of [
    [6, 5],
    [22, 3],
    [37, 6],
    [53, 4],
  ]) {
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillRect(x, 0, w, 8);
  }
  const streaks = new CanvasTexture(canvas);
  streaks.wrapS = streaks.wrapT = RepeatWrapping;
  const streamMaterial = new MeshStandardMaterial({
    color: '#d6f6f8',
    map: streaks,
    transparent: true,
    opacity: 0,
    roughness: 0.08,
    metalness: 0,
    depthWrite: false,
  });
  const ringMaterial = new MeshBasicMaterial({
    color: '#eefcfd',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
  });
  const ringGeometry = new RingGeometry(0.9, 1, 40);
  ringGeometry.rotateX(-Math.PI / 2);
  const outlets = inlets.map((inlet) => {
    const out = new Vector3(Math.sin(inlet.yaw), 0, Math.cos(inlet.yaw));
    const mouth = new Vector3(inlet.x, inlet.y, inlet.z).addScaledVector(
      out,
      0.02,
    );
    const stream = new Mesh(undefined, streamMaterial);
    stream.renderOrder = 3;
    group.add(stream);
    const rings = Array.from({ length: RINGS }, (_, i) => {
      const material = ringMaterial.clone();
      const ring = new Mesh(ringGeometry, material);
      ring.renderOrder = 4;
      ring.visible = false;
      group.add(ring);
      return { ring, material, phase: i / RINGS };
    });
    return {
      out,
      mouth,
      ledge: inlet.ledge,
      stream,
      rings,
      shapedFor: Number.NaN,
      landing: mouth,
      onWater: true,
    };
  });
  /** Its stream's shape for a surface at `surfaceY`, and where it meets it. */
  const shape = (o: (typeof outlets)[number], surfaceY: number) => {
    // Under water to the top of its nozzle: no spray, only the rings
    // rising over it, a little way out from the wall.
    if (surfaceY >= o.mouth.y + NOZZLE) {
      o.stream.visible = false;
      o.landing = o.mouth.clone().addScaledVector(o.out, 0.12).setY(surfaceY);
      o.shapedFor = surfaceY;
      o.onWater = true;
      return;
    }
    // Otherwise a falling arc, out and down, ending at the surface, or on
    // its ledge where the water is below the ledge and the arc short of
    // its edge.
    let end = surfaceY;
    o.onWater = true;
    if (o.ledge && surfaceY < o.ledge.y) {
      const drop = Math.max(0, o.mouth.y - o.ledge.y);
      const out = 0.02 + EXIT_SPEED * Math.sqrt((2 * drop) / G);
      if (out <= o.ledge.reach) {
        end = o.ledge.y;
        o.onWater = false;
      }
    }
    const fall = Math.max(0.002, o.mouth.y - end);
    const t = Math.sqrt((2 * fall) / G);
    const points: Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const s = (k / 10) * t;
      points.push(
        o.mouth
          .clone()
          .addScaledVector(o.out, EXIT_SPEED * s)
          .setY(o.mouth.y - (G * s * s) / 2),
      );
    }
    const landing = points[points.length - 1].clone().setY(end);
    o.stream.visible = true;
    o.stream.geometry.dispose();
    o.stream.geometry = new TubeGeometry(
      new CatmullRomCurve3(points),
      points.length * 3,
      RADIUS,
      6,
      false,
    );
    o.shapedFor = surfaceY;
    o.landing = landing;
  };
  let shown = 0;
  let clock = 0;
  return {
    group,
    update(delta: number, flow: InletFlow) {
      const goal = flow.filling ? 1 : 0;
      const step = delta / FADE_SECONDS;
      shown =
        goal > shown
          ? Math.min(goal, shown + step)
          : Math.max(goal, shown - step);
      group.visible = shown > 0;
      if (!group.visible) return;
      clock += delta;
      streaks.offset.x -= delta * EXIT_SPEED * 4;
      streamMaterial.opacity = 0.42 * shown;
      // Rings only on water: none in an empty bath.
      const ringsShown = shown * Math.min(1, flow.wet * 4);
      for (const o of outlets) {
        if (!(Math.abs(o.shapedFor - flow.surfaceY) < 0.002))
          shape(o, flow.surfaceY);
        for (const r of o.rings) {
          const p = (clock / RING_SECONDS + r.phase) % 1;
          r.ring.visible = ringsShown > 0 && o.onWater;
          r.ring.position.set(o.landing.x, flow.surfaceY + 0.002, o.landing.z);
          r.ring.scale.setScalar(0.02 + p * RING_REACH);
          r.material.opacity = 0.24 * (1 - p) ** 1.5 * ringsShown;
        }
      }
    },
    dispose() {
      for (const o of outlets) {
        o.stream.geometry.dispose();
        for (const r of o.rings) r.material.dispose();
      }
      ringGeometry.dispose();
      ringMaterial.dispose();
      streamMaterial.dispose();
      streaks.dispose();
    },
  };
}
