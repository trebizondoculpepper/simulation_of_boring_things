import { Group, Mesh, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import type {
  PanelKit,
  SevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createCanvasTexture } from '../../core/views/screens';
import { createPs1Material } from '../../core/parts/ps1-material';
import { SIGN_FIELDS, signFrame } from '../logic/pool-info-sign';
import type { PoolSignState, SignFrame } from '../logic/pool-info-sign';

/**
 * A poolside information sign, in the style of Eltin's water-treatment
 * boards but in English: a shallow anodised aluminium case with a light
 * grey printed face, a red band across the top with the pool's name on
 * it (a printed insert, changed when the pool is), and under it a row for
 * each reading, its legend printed in black on the left and its red
 * seven-segment digits, in a black window, and unit on the right.
 * Made by Kessler-Moody Instruments, whose badge is in its bottom right
 * corner. Metres, its face toward +z.
 *
 * Proportions after the water-treatment boards poolside in public pools
 * (Eltin's, and Bodet's for the case: `doc/research/pool-info-sign.md`);
 * the sizes are estimates: 0.62 m × 1.3 m × 75 mm, 90 mm clock digits and 60 mm
 * reading digits.
 *
 * Two versions: `wall`, its back on the wall (origin in the wall's face,
 * at the case's middle) on two hanging lugs; and `post`, clamped to a
 * 76 mm galvanised post on a base plate (origin on the floor under the
 * post, the case's middle 1.9 m up). Cable comes in through a gland in
 * the case's underside, and on the post down the inside of the post.
 *
 * `show` takes the sign's state; `update` runs its flashing.
 */
export const POOL_SIGN = {
  w: 0.62,
  h: 1.3,
  d: 0.075,
  bezel: 0.022,
  digitHeight: 0.06,
  clockHeight: 0.09,
  /** The post version: the case's middle above the floor, and the post. */
  postCentreY: 1.9,
  postRadius: 0.038,
} as const;

export type PoolSignMount = 'wall' | 'post';

export interface PoolInfoSign {
  object: Group;
  /** Show the sign's state at `now` (seconds on the sign's clock). */
  show(state: PoolSignState, now: number): void;
  /** Flash any stale reading: call each frame with the time, seconds. */
  update(seconds: number): void;
}

/** The name band: a printed red insert, the pool's name on it in white. */
function nameBand(kit: PanelKit, w: number, h: number) {
  const pw = 768;
  const ph = Math.round((pw * h) / w);
  const { context, texture } = createCanvasTexture(pw, ph);
  kit.textures.push(texture);
  const material = createPs1Material({ map: texture, roughness: 0.5 });
  kit.materials.push(material);
  const mesh = new Mesh(new PlaneGeometry(w, h), material);
  mesh.userData.live = true;
  let last: string | null = null;
  return {
    mesh,
    show(text: string) {
      if (text === last) return;
      last = text;
      context.fillStyle = '#c3231d';
      context.fillRect(0, 0, pw, ph);
      context.fillStyle = '#ffffff';
      context.font = `bold ${Math.round(ph * 0.62)}px Arial, Helvetica, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, pw / 2, ph / 2 + 2, pw * 0.92);
      texture.needsUpdate = true;
    },
  };
}

export function createPoolInfoSign(
  kit: PanelKit,
  mount: PoolSignMount = 'wall',
): PoolInfoSign {
  const s = POOL_SIGN;
  const t = tools(kit);
  const object = new Group();
  object.name = `Pool information sign (${mount})`;
  // The sign itself, its back at z = 0, its middle at its origin.
  const sign = new Group();
  object.add(sign);
  const anodised = t.paint('#4a4e53', 0.38, 0.75);
  const black = t.paint('#0d0e10', 0.6);
  const printedFace = t.paint('#e3e4e0', 0.55);
  const ink = '#1b1d20';
  const steel = t.paint('#c9cdcf', 0.3, 0.9);
  // The case: a back tray, and the bezel round the face.
  t.box(sign, anodised, s.w, s.h, s.d - 0.006, 0, 0, (s.d - 0.006) / 2);
  const faceZ = s.d;
  const inner = { w: s.w - 2 * s.bezel, h: s.h - 2 * s.bezel };
  t.box(sign, printedFace, inner.w, inner.h, 0.004, 0, 0, faceZ - 0.004);
  for (const [w, h, x, y] of [
    [s.w, s.bezel, 0, s.h / 2 - s.bezel / 2],
    [s.w, s.bezel, 0, -s.h / 2 + s.bezel / 2],
    [s.bezel, inner.h, -s.w / 2 + s.bezel / 2, 0],
    [s.bezel, inner.h, s.w / 2 - s.bezel / 2, 0],
  ] as const)
    t.box(sign, anodised, w, h, 0.01, x, y, faceZ - 0.003);
  // Security screws in the bezel's corners.
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      t.cyl(
        sign,
        steel,
        0.006,
        0.003,
        x * (s.w / 2 - s.bezel / 2),
        y * (s.h / 2 - s.bezel / 2),
        faceZ + 0.0035,
        'z',
        12,
      );
  // The cable gland under the case, toward the back.
  t.cyl(sign, black, 0.011, 0.022, s.w / 2 - 0.08, -s.h / 2 - 0.011, 0.025);
  t.cyl(sign, steel, 0.014, 0.006, s.w / 2 - 0.08, -s.h / 2 - 0.003, 0.025);

  // The face: drawn from the top down, at its own z.
  const face = new Group();
  face.position.z = faceZ + 0.0006;
  sign.add(face);
  const top = inner.h / 2;
  const digitsRight = inner.w / 2 - 0.095;
  /** A seven-segment readout in a black window let into the face. */
  const window = (digits: number, height: number, x: number, y: number) => {
    const readout = createSevenSegment(kit, digits, { digitHeight: height });
    readout.group.traverse((o) => (o.userData.live = true));
    const w = ((40 * digits + 16) * height) / 48;
    const h = (80 * height) / 48;
    t.box(face, black, w + 0.02, h + 0.02, 0.001, x, y, 0);
    readout.group.position.set(x, y, 0.0005);
    face.add(readout.group);
    return { readout, w, h };
  };
  // The clock across the top: hours, a colon of two red dots, minutes.
  const clockY = top - 0.1;
  const clockW = ((40 * 2 + 16) * s.clockHeight) / 48;
  const hours = window(2, s.clockHeight, -clockW / 2 - 0.035, clockY).readout;
  const minutes = window(2, s.clockHeight, clockW / 2 + 0.035, clockY).readout;
  const colon = [-1, 1].map((dy) => {
    const dot = t.led(face, '#ff3b24', 0.008, 0, clockY + dy * 0.03, 0.001);
    dot.mesh.userData.live = true;
    return dot;
  });
  const readouts: SevenSegment[] = [];
  const rowH = 0.13;
  let y = clockY - 0.1;
  const name = nameBand(kit, inner.w, 0.075);
  for (const group of ['hall', 'pool'] as const) {
    if (group === 'pool') {
      // The pool's name on its red band, its readings under it.
      y -= 0.02;
      name.mesh.position.set(0, y - 0.0375, 0);
      face.add(name.mesh);
      y -= 0.085;
    }
    for (const f of SIGN_FIELDS.filter((field) => field.group === group)) {
      const rowY = y - rowH / 2;
      y -= rowH;
      const legend = createMicroLabel(kit, f.label.join('\n'), {
        height: f.label.length > 1 ? 0.016 : 0.022,
        ink,
        align: 'left',
      });
      // Left-aligned: shift by half its width.
      legend.geometry.computeBoundingBox();
      legend.position.set(
        -inner.w / 2 + 0.03 + legend.geometry.boundingBox!.max.x,
        rowY,
        0,
      );
      face.add(legend);
      // Digits right-aligned in a column, so their points line up.
      const width = ((40 * f.digits + 16) * s.digitHeight) / 48;
      readouts.push(
        window(f.digits, s.digitHeight, digitsRight - width / 2, rowY).readout,
      );
      if (f.unit) {
        const unit = createMicroLabel(kit, f.unit, {
          height: f.unit === '°C' || f.unit === '%' ? 0.022 : 0.016,
          ink,
          align: 'left',
        });
        unit.geometry.computeBoundingBox();
        unit.position.set(
          digitsRight + 0.014 + unit.geometry.boundingBox!.max.x,
          rowY + 0.018,
          0,
        );
        face.add(unit);
      }
    }
  }
  panelMakerMark(kit, face, {
    width: inner.w,
    height: inner.h,
    z: 0,
    corner: 'bottom-right',
    maker: 'kessler-moody',
    size: 0.016,
    inset: 0.018,
  });

  if (mount === 'wall') {
    // Two hanging lugs on the wall behind the case's top corners.
    for (const x of [-1, 1])
      t.box(
        object,
        steel,
        0.04,
        0.06,
        0.004,
        x * (s.w / 2 - 0.06),
        s.h / 2 - 0.05,
        0.002,
      );
  } else {
    // The post, its base plate and four anchor bolts, and two clamp bands
    // holding the case's back to it.
    const postTop = s.postCentreY + s.h / 2 + 0.05;
    const galvanised = t.paint('#9da3a6', 0.45, 0.7);
    const post = t.cyl(
      object,
      galvanised,
      s.postRadius,
      postTop,
      0,
      postTop / 2,
      0,
      'y',
      24,
    );
    post.name = 'Sign post';
    t.cyl(
      object,
      galvanised,
      s.postRadius + 0.004,
      0.012,
      0,
      postTop + 0.006,
      0,
      'y',
      24,
    );
    t.box(object, galvanised, 0.2, 0.012, 0.2, 0, 0.006, 0);
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        t.cyl(object, steel, 0.009, 0.02, x * 0.075, 0.016, z * 0.075, 'y', 8);
    for (const dy of [-1, 1]) {
      const y = s.postCentreY + dy * (s.h / 2 - 0.12);
      t.box(object, steel, 0.12, 0.035, 0.012, 0, y, s.postRadius + 0.006);
      t.cyl(object, steel, s.postRadius + 0.004, 0.035, 0, y, 0, 'y', 24);
    }
    sign.position.set(0, s.postCentreY, s.postRadius + 0.012);
  }

  let frame: SignFrame | null = null;
  let state: PoolSignState | null = null;
  let blinkOn = true;
  const draw = () => {
    if (!frame) return;
    // The name is printed, so it shows whether the sign is on or not.
    name.show(state ? state.name.toUpperCase() : '');
    hours.show(frame.hours);
    minutes.show(frame.minutes);
    for (const dot of colon) dot.set(frame.colon);
    frame.rows.forEach((row, i) =>
      readouts[i].show(row.stale && !blinkOn ? '' : row.text),
    );
  };
  return {
    object,
    show(next, now) {
      state = next;
      frame = signFrame(next, now);
      draw();
    },
    update(seconds) {
      const on = seconds % 1 < 0.6;
      if (on === blinkOn) return;
      blinkOn = on;
      draw();
    },
  };
}

/** Everything in `object` that changes as the sign runs, for room merging. */
export const markLive = (object: Object3D) =>
  object.traverse((o) => (o.userData.live = true));
