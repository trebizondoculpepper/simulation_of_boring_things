import { signal } from '@preact/signals-core';
import {
  ConeGeometry,
  DataTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  SphereGeometry,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import {
  createPartSet,
  pilotLight,
  potentiometer,
  pushButton,
} from '../../core/parts/parts';
import type { PartSet } from '../../core/parts/parts';
import { CCTV, FEED, adjust, snow } from '../logic/cctv-signal';
import type { DuckPose } from '../logic/duck';

/**
 * The CCTV of around 2000 and what it watches: a rubber duck, a fixed
 * box camera in a weatherproof housing on a wall bracket (after a
 * Panasonic WV-BP330 in a Videotec housing), and a 14-inch colour CCTV
 * monitor on a desk (after a JVC TM-A140), all under Poolguard's name.
 * The camera's picture travels to the monitor as a video signal
 * (`logic/cctv-signal.ts`), so they can be in different rooms. In
 * metres, facing +z.
 */

/**
 * A rubber duck, `size` metres long, its waterline at the origin, its
 * beak toward +z. A big one, so a camera across the pool can make it out.
 */
export function createDuck(kit: PanelKit, size = 0.6) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Rubber duck';
  const yellow = t.paint('#ffd21f', 0.35);
  const orange = t.paint('#f27a12', 0.4);
  const black = t.paint('#111111', 0.2);
  const body = new Mesh(new SphereGeometry(0.5, 24, 16), yellow);
  body.scale.set(0.62, 0.42, 0.85);
  body.position.y = 0.08;
  group.add(body);
  // Its tail, turned up.
  const tail = new Mesh(new ConeGeometry(0.16, 0.3, 16), yellow);
  tail.rotation.x = -Math.PI / 2.6;
  tail.position.set(0, 0.24, -0.42);
  group.add(tail);
  const head = new Mesh(new SphereGeometry(0.22, 20, 14), yellow);
  head.position.set(0, 0.48, 0.22);
  group.add(head);
  const beak = new Mesh(new SphereGeometry(0.1, 14, 8), orange);
  beak.scale.set(1.2, 0.45, 1.3);
  beak.position.set(0, 0.44, 0.44);
  group.add(beak);
  for (const x of [-0.1, 0.1]) {
    const eye = new Mesh(new SphereGeometry(0.032, 10, 8), black);
    eye.position.set(x, 0.56, 0.38);
    group.add(eye);
  }
  group.scale.setScalar(size);
  const pivot = new Group();
  pivot.add(group);
  return {
    group: pivot,
    /** Put it where `pose` says, on water whose surface is at y = 0. */
    place(pose: DuckPose, halfWidth: number, halfLength: number) {
      pivot.position.set(pose.u * halfWidth, pose.bob, pose.v * halfLength);
      pivot.rotation.set(pose.pitch, pose.heading, pose.roll, 'YXZ');
    },
  };
}

/**
 * The camera on its bracket: the bracket's foot on the wall at the
 * origin, its arm out along +z, the housing on a tilt-and-pan head at
 * the arm's end, its sunshield over it, and its cable back down the arm.
 * `view` is the camera that makes its picture, at its lens; aim the
 * whole by turning `head`.
 */
export function createCctvCamera(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'CCTV camera';
  const white = t.paint('#e8e6df', 0.45);
  const grey = t.paint('#7b7f82', 0.5, 0.4);
  t.box(group, grey, 0.12, 0.16, 0.02, 0, 0, 0.01);
  t.cyl(group, grey, 0.018, 0.3, 0, 0, 0.16, 'z');
  const head = new Group();
  head.position.set(0, -0.05, 0.32);
  group.add(head);
  t.cyl(head, grey, 0.025, 0.06, 0, 0.03, 0);
  const housing = new Group();
  housing.position.y = -0.04;
  head.add(housing);
  t.box(housing, white, 0.13, 0.12, 0.42, 0, -0.06, 0.12);
  t.box(housing, white, 0.17, 0.012, 0.46, 0, 0.006, 0.13);
  t.box(housing, t.paint('#16181a', 0.2), 0.1, 0.09, 0.004, 0, -0.06, 0.332);
  const badge = createBrandBadge(kit, 'poolguard', { height: 0.018 });
  badge.position.set(0.066, -0.06, 0.1);
  badge.rotation.y = Math.PI / 2;
  housing.add(badge);
  const view = new PerspectiveCamera(40, FEED.width / FEED.height, 0.1, 60);
  view.position.set(0, -0.06, 0.34);
  // A camera looks down its own −z; the housing faces +z.
  view.rotation.y = Math.PI;
  housing.add(view);
  return { group, head, housing, view };
}

export interface CctvMonitorView {
  group: Group;
  parts: PartSet;
  /** Its POWER button, pressed. */
  power(): void;
  /** Show the camera's latest picture; call each frame with the time, s. */
  show(now: number): void;
  dispose(): void;
}

/**
 * The monitor on its desk: a plain office desk with the monitor's grey
 * case on it, its slightly domed screen showing the camera's picture at
 * the size it is sent (each of its 96 × 72 pixels a block), POWER with
 * its lamp, and BRIGHT and CONTRAST under a flap; snow when the camera
 * sends nothing. It watches its camera only while it is switched on.
 * The desk's feet on the floor at the origin.
 */
export function createCctvMonitor(
  kit: PanelKit,
  { camera, title }: { camera: string; title: string },
): CctvMonitorView {
  const t = tools(kit);
  const group = new Group();
  group.name = 'CCTV monitor on desk';
  // The desk.
  const top = 0.74;
  const wood = t.paint('#b89a6e', 0.7);
  const leg = t.paint('#3a3c3f', 0.5, 0.4);
  t.box(group, wood, 1.4, 0.03, 0.75, 0, top - 0.015, 0);
  for (const x of [-0.66, 0.66])
    for (const z of [-0.33, 0.33])
      t.box(group, leg, 0.04, top - 0.03, 0.04, x, (top - 0.03) / 2, z);
  // The monitor: a case 340 wide, 330 high, 370 deep, set back on the desk.
  const monitor = new Group();
  monitor.position.set(0, top, -0.08);
  group.add(monitor);
  const caseGrey = t.paint('#9a9c98', 0.55);
  t.box(monitor, caseGrey, 0.34, 0.33, 0.25, 0, 0.165, 0.06);
  t.box(monitor, caseGrey, 0.26, 0.26, 0.12, 0, 0.17, -0.12);
  t.box(monitor, t.paint('#2a2b2c', 0.5), 0.3, 0.25, 0.006, 0, 0.19, 0.188);
  // The screen: the picture as sent, blocky.
  const pixels = new Uint8Array(FEED.width * FEED.height * 4);
  const texture = new DataTexture(pixels, FEED.width, FEED.height, RGBAFormat);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  kit.textures.push(texture);
  // The picture arrives tone-mapped already: shown as sent.
  const glass = new MeshBasicMaterial({
    map: texture,
    color: '#000000',
    toneMapped: false,
  });
  kit.materials.push(glass);
  const screen = new Mesh(new PlaneGeometry(0.272, 0.204), glass);
  screen.position.set(0, 0.19, 0.192);
  screen.userData.live = true;
  monitor.add(screen);
  const parts = createPartSet();
  const face = new Group();
  face.position.set(0, 0.035, 0.186);
  monitor.add(face);
  const on = signal(false);
  const power = parts.add(
    pushButton(kit, {
      colour: 'black',
      legend: 'POWER',
      action: () => (on.value = !on.value),
      name: 'CCTV monitor POWER',
    }),
  );
  power.object.scale.setScalar(0.6);
  power.object.position.set(0.12, 0, 0.002);
  face.add(power.object);
  const lamp = parts.add(
    pilotLight(kit, {
      colour: 'green',
      drive: on,
      name: 'CCTV monitor power lamp',
    }),
  );
  lamp.object.scale.setScalar(0.45);
  lamp.object.position.set(0.075, 0, 0.002);
  face.add(lamp.object);
  const knob = (legend: string, x: number) => {
    const part = parts.add(
      potentiometer(kit, {
        legend,
        steps: 11,
        initial: 5,
        name: `CCTV monitor ${legend}`,
      }),
    );
    part.object.scale.setScalar(0.5);
    part.object.position.set(x, 0, 0.002);
    face.add(part.object);
    return part;
  };
  const bright = knob('BRIGHT', -0.12);
  const contrast = knob('CONTRAST', -0.06);
  const badge = createBrandBadge(kit, 'poolguard', { height: 0.014 });
  badge.position.set(0, 0.315, 0.186);
  monitor.add(badge);
  const label = createMicroLabel(kit, title, {
    height: 0.012,
    ink: '#111111',
    plate: '#f2efe4',
  });
  // Its camera's name, on a label on the desk in front of it.
  label.rotation.x = -Math.PI / 2;
  label.position.set(0.3, top + 0.002, 0.25);
  group.add(label);
  // It watches its camera while switched on.
  let stop: (() => void) | null = null;
  let flicker = 0;
  return {
    group,
    parts,
    power: () => (on.value = !on.value),
    show(now) {
      if (on.value && !stop) stop = CCTV.watch(camera);
      if (!on.value && stop) {
        stop();
        stop = null;
      }
      if (!on.value) {
        glass.color.set('#000000');
        return;
      }
      glass.color.set('#ffffff');
      const frame = CCTV.receive(camera, now);
      if (frame)
        adjust(frame.data, pixels, bright.share.value, contrast.share.value);
      else snow(pixels, ++flicker);
      texture.needsUpdate = true;
    },
    dispose() {
      stop?.();
      stop = null;
    },
  };
}
