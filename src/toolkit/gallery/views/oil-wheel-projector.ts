import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import type { Texture } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { createCanvasTexture } from '../../components/core/views/screens';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import { markComponent } from '../../components/core/views/component-identity';
import type { Vec3 } from '../../components/core/logic/pipe-route';
import { OIL_WHEEL, oilBlobs, wheelAngle } from '../logic/oil-wheel';
import type { OilBlob } from '../logic/oil-wheel';

/**
 * A 1970s oil-wheel effects projector (`../logic/oil-wheel.ts`) on a floor
 * stand, aimed at a flat face and throwing its swimming colours on it: a
 * louvred lamp house with a carrying handle, its lens, and in front of the
 * lens the effects rotator, a small geared motor turning a sealed glass
 * wheel of coloured oils across the beam. The light it throws is two
 * additive layers on the face lit, `width` × `height`, each the oils
 * magnified and turning (the second the other way, slower: the oils
 * drifting in the glass), and a faint beam through the room's haze.
 *
 * Every frame only turns the wheel and the two layers' textures (their UV
 * transforms): nothing is redrawn or uploaded after it is built.
 */
export function createOilWheelProjector(
  kit: PanelKit,
  options: {
    /** Where the stand stands, on the floor (y is the lens's height). */
    at: Vec3;
    /** The middle of the face it lights. */
    target: Vec3;
    /** The lit face's outward normal (towards the projector's side). */
    normal: Vec3;
    /** The lit face's size, metres, and which way is up on it. */
    width: number;
    height: number;
    up?: Vec3;
    name?: string;
  },
) {
  const t = tools(kit);
  const root = new Group();
  root.name = options.name ?? 'Oil-wheel projector';
  const [x, lensY, z] = options.at;
  const target = new Vector3(...options.target);

  // ---- The stand: a weighted round foot, a pole, a yoke ----
  const steel = t.paint('#1c1d20', 0.45, 0.6);
  const chrome = t.paint('#c9ccd0', 0.25, 0.9);
  t.cyl(root, steel, 0.16, 0.025, x, 0.0125, z, 'y', 24);
  t.cyl(root, chrome, 0.014, lensY - 0.14, x, (lensY - 0.14) / 2, z, 'y', 10);

  // ---- The head, turned to face the target (its +z) ----
  const head = new Group();
  head.position.set(x, lensY, z);
  head.lookAt(target);
  root.add(head);
  // The yoke: a U from the pole's top round the lamp house's sides.
  t.box(head, steel, 0.21, 0.012, 0.03, 0, -0.13, -0.08);
  for (const side of [-1, 1])
    t.box(head, steel, 0.012, 0.11, 0.03, side * 0.105, -0.075, -0.08);
  // The lamp house: a black box, louvred both sides, a handle over it.
  const black = t.paint('#151516', 0.55, 0.2);
  t.box(head, black, 0.17, 0.2, 0.3, 0, 0, -0.09);
  const louvre = t.paint('#050506', 0.9);
  for (const side of [-1, 1])
    for (let k = 0; k < 6; k++)
      t.box(
        head,
        louvre,
        0.004,
        0.012,
        0.2,
        side * 0.0855,
        -0.06 + k * 0.024,
        -0.1,
      );
  for (const dz of [-0.17, -0.01])
    t.box(head, chrome, 0.012, 0.045, 0.012, 0, 0.122, dz);
  t.box(head, chrome, 0.012, 0.012, 0.172, 0, 0.145, -0.09);
  // Its maker's plate on the left flank.
  const plate = t.printed(
    0.1,
    0.03,
    (c, w, h) => {
      c.fillStyle = '#b8b2a2';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#151516';
      c.font = `bold ${h * 0.5}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('PSYCHOLUX 250', w / 2, h * 0.55);
    },
    192,
  );
  plate.mesh.position.set(-0.0865, -0.08, -0.12);
  plate.mesh.rotation.y = -Math.PI / 2;
  head.add(plate.mesh);
  // The lens: a barrel out of the front, its glass lit by the lamp.
  t.cyl(head, black, 0.042, 0.11, 0, 0, 0.115, 'z', 20);
  t.cyl(head, chrome, 0.045, 0.012, 0, 0, 0.165, 'z', 20);
  const glass = createPs1Material({ color: '#fff1cf' }, true, true);
  kit.materials.push(glass);
  t.cyl(head, glass, 0.034, 0.004, 0, 0, 0.171, 'z', 20);

  // ---- The effects rotator: a bracket, a motor, the wheel ----
  // The wheel's hub stands to one side, so the lens looks through its oils
  // at about six tenths of its radius, where they move fastest.
  const radius = OIL_WHEEL.diameter / 2;
  const hubX = radius * 0.6;
  const wheelZ = 0.19;
  t.box(head, steel, 0.012, 0.012, 0.06, hubX + 0.02, 0, 0.17);
  t.box(head, steel, 0.03, 0.012, 0.012, hubX + 0.005, 0, 0.2);
  const motor = t.paint('#3a3d42', 0.5, 0.5);
  t.cyl(head, motor, 0.022, 0.035, hubX, 0, wheelZ + 0.022, 'z', 16);
  const wheelFace = createCanvasTexture(256, 256);
  paintWheel(wheelFace.context, 256, oilBlobs());
  wheelFace.texture.needsUpdate = true;
  kit.textures.push(wheelFace.texture);
  // Back-lit by the lamp, it shows its own colours.
  const wheelGlass = createPs1Material(
    { map: wheelFace.texture, transparent: true, opacity: 0.92 },
    true,
    true,
  );
  kit.materials.push(wheelGlass);
  const wheel = new Mesh(
    new CylinderGeometry(radius, radius, 0.006, 40),
    wheelGlass,
  );
  wheel.rotation.x = Math.PI / 2;
  const spin = new Group();
  spin.position.set(hubX, 0, wheelZ);
  spin.add(wheel);
  head.add(spin);

  // ---- The light it throws: two layers on the face, and the beam ----
  const normal = new Vector3(...options.normal).normalize();
  const up = new Vector3(...(options.up ?? [0, 1, 0]));
  const layer = (seed: number, lift: number, opacity: number) => {
    const { context, texture } = createCanvasTexture(256, 256);
    paintThrow(context, 256, oilBlobs(seed, 16));
    texture.needsUpdate = true;
    texture.center.set(0.5, 0.5);
    kit.textures.push(texture);
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    kit.materials.push(material);
    const mesh = new Mesh(
      new PlaneGeometry(options.width, options.height),
      material,
    );
    mesh.position.copy(target).addScaledVector(normal, lift);
    mesh.up.copy(up);
    mesh.lookAt(mesh.position.clone().add(normal));
    mesh.renderOrder = 2;
    root.add(mesh);
    return texture;
  };
  const throws: Texture[] = [
    layer(1970, 0.004, 0.55),
    layer(1974, 0.006, 0.35),
  ];

  // The beam: a faint, open cone from the lens to the face.
  // (The root is not yet placed: its world is its own frame.)
  root.updateMatrixWorld(true);
  const lens = head.localToWorld(new Vector3(0, 0, 0.175));
  const reach = lens.distanceTo(target);
  const beamMaterial = new MeshBasicMaterial({
    color: '#ffd9a8',
    transparent: true,
    opacity: 0.012,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  kit.materials.push(beamMaterial);
  const beam = new Mesh(
    new CylinderGeometry(
      0.03,
      Math.max(options.width, options.height) * 0.5,
      reach,
      24,
      1,
      true,
    ),
    beamMaterial,
  );
  beam.position.copy(lens).add(target).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(
    new Vector3(0, 1, 0),
    target.clone().sub(lens).normalize().negate(),
  );
  beam.renderOrder = 2;
  root.add(beam);

  markComponent(root, {
    name: 'Oil-wheel projector: Psycholux 250, effects rotator and liquid wheel',
    decorative: true,
  });

  let seconds = 0;
  return {
    object: root,
    /** Turns the wheel and the light it throws on by `delta` seconds. */
    update(delta: number) {
      seconds += delta;
      const a = wheelAngle(seconds);
      spin.rotation.z = a;
      throws[0].rotation = a;
      throws[1].rotation = wheelAngle(seconds, OIL_WHEEL.rpm * OIL_WHEEL.drift);
    },
  };
}

/** The wheel as seen: its oils in clear glass, a chrome rim, the hub. */
function paintWheel(
  c: CanvasRenderingContext2D,
  size: number,
  blobs: OilBlob[],
) {
  const r = size / 2;
  c.clearRect(0, 0, size, size);
  c.save();
  c.beginPath();
  c.arc(r, r, r * 0.96, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = 'rgba(40, 30, 50, 0.55)';
  c.fillRect(0, 0, size, size);
  for (const b of blobs) {
    c.globalAlpha = 0.85;
    c.fillStyle = b.colour;
    c.beginPath();
    c.arc(
      r + Math.cos(b.a) * b.r * r,
      r + Math.sin(b.a) * b.r * r,
      b.size * r,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.restore();
  c.globalAlpha = 1;
  c.strokeStyle = '#d6d8dc';
  c.lineWidth = r * 0.08;
  c.beginPath();
  c.arc(r, r, r * 0.95, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = '#2a2c30';
  c.beginPath();
  c.arc(r, r, r * 0.1, 0, Math.PI * 2);
  c.fill();
}

/** The oils as thrown: magnified, soft-edged, on black (it adds light), fading out to the edge. */
function paintThrow(
  c: CanvasRenderingContext2D,
  size: number,
  blobs: OilBlob[],
) {
  const r = size / 2;
  c.fillStyle = '#000';
  c.fillRect(0, 0, size, size);
  // Laid over one another, not added: the oils keep their colours
  // instead of summing to white.
  for (const b of blobs) {
    const cx = r + Math.cos(b.a) * b.r * r;
    const cy = r + Math.sin(b.a) * b.r * r;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, b.size * r * 1.4);
    g.addColorStop(0, b.colour);
    g.addColorStop(0.6, b.colour);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.globalAlpha = 0.9;
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
  }
  // The pool of light: bright in the middle, gone by the corners.
  c.globalCompositeOperation = 'destination-in';
  c.globalAlpha = 1;
  const pool = c.createRadialGradient(r, r, r * 0.2, r, r, r * 1.05);
  pool.addColorStop(0, 'rgba(0, 0, 0, 1)');
  pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
  c.fillStyle = pool;
  c.fillRect(0, 0, size, size);
  c.globalCompositeOperation = 'source-over';
}
