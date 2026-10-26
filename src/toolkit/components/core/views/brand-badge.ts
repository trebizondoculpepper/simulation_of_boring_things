import { CylinderGeometry, DoubleSide, Mesh, PlaneGeometry } from 'three';
import type { CanvasTexture } from 'three';
import { brandById } from '../logic/brands';
import type { BrandId } from '../logic/brands';
import { createPs1Material } from '../parts/ps1-material';
import { drawBrandMark, wordmarkFont } from './brand-logo';
import type { PanelKit } from './eighties-controls';
import { createCanvasTexture } from './screens';
import { applyLabelFade } from './label-visibility';

/**
 * A maker's mark on a device: the brand's logo (or just its name, or just
 * its symbol) as a small decal, drawn from the brand's one definition in
 * `src/toolkit/components/core/logic/brands.ts` by `src/toolkit/components/core/views/brand-logo.ts`, the same drawing the
 * Brands and Logos room (dev8) shows. Change a brand there and every
 * device it made changes with it.
 *
 * A device names its maker where it is built, once, and puts the badge
 * where that maker would: small print on a meter's dial, a corner of a
 * screen's bezel, the header of a cabinet. Most things carry none: a light
 * switch, a push button, a fuse are too small or too plain to bother.
 */

export type BadgeForm =
  /** The symbol and the name beside it. */
  | 'logo'
  /** The name alone, in the brand's own type: small print. */
  | 'wordmark'
  /** The symbol alone. */
  | 'mark';

export interface BadgeOptions {
  form?: BadgeForm;
  /** The badge's height, metres; its width follows from the drawing. */
  height?: number;
  /** The name's ink, if not the brand's own (a light ink on dark paint). */
  ink?: string;
  /** A plate behind it, in this colour, if it is a nameplate. */
  plate?: string;
  /** How much it shows, 0 to 1: a printed mark is often faint. */
  opacity?: number;
  /** The most it may be wide, metres: a smaller face shrinks it to fit. */
  maxWidth?: number;
}

const PX = 256;

/** Each brand's badge drawings, made once and shared by every device. */
const drawings = new Map<string, { texture: CanvasTexture; aspect: number }>();

function drawing(id: BrandId, form: BadgeForm, ink: string | undefined) {
  const key = `${id}:${form}:${ink ?? ''}`;
  const known = drawings.get(key);
  if (known) return known;
  const brand = brandById(id);
  const name = brand.wordmark ?? brand.name;
  const r = PX * 0.42;
  const markWidth = form === 'wordmark' ? 0 : r * 2 + PX * 0.16;
  const probe = createCanvasTexture(8, 8).context;
  probe.font = wordmarkFont(brand, PX * 0.5);
  const nameWidth =
    form === 'mark' ? 0 : Math.ceil(probe.measureText(name).width) + PX * 0.12;
  const w = Math.ceil(markWidth + nameWidth) + (form === 'mark' ? 0 : 8);
  const { context, texture } = createCanvasTexture(w, PX);
  if (form !== 'wordmark')
    drawBrandMark(context, brand, r + PX * 0.08, PX / 2, r);
  if (form !== 'mark') {
    context.fillStyle = ink ?? brand.colours[2];
    context.font = probe.font;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillText(name, markWidth + PX * 0.04, PX / 2);
  }
  texture.needsUpdate = true;
  const made = { texture, aspect: w / PX };
  drawings.set(key, made);
  return made;
}

/**
 * A brand's badge, facing +z, centred on the origin: a flat decal to lay
 * a millimetre proud of a face. It never takes a click meant for the
 * device it is printed on.
 */
export function createBrandBadge(
  kit: PanelKit,
  id: BrandId,
  {
    form = 'logo',
    height: asked = 0.01,
    ink,
    plate,
    opacity = 1,
    maxWidth = Infinity,
  }: BadgeOptions = {},
) {
  const { texture, aspect } = drawing(id, form, ink);
  // As tall as asked, unless that would make it (and its plate) too wide.
  const height = Math.min(asked, maxWidth / (aspect + (plate ? 0.5 : 0)));
  const material = createPs1Material({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    roughness: 0.5,
  });
  kit.materials.push(material);
  const width = height * aspect;
  const mesh = new Mesh(new PlaneGeometry(width, height), material);
  mesh.name = `Badge ${brandById(id).name}`;
  mesh.userData.maker = id;
  applyLabelFade(mesh, material, height, opacity);
  mesh.raycast = () => {};
  if (!plate) return mesh;
  // A nameplate: the badge on a thin plate a little larger than it.
  const plateMaterial = createPs1Material({ color: plate, metalness: 0.4 });
  kit.materials.push(plateMaterial);
  const backing = new Mesh(
    new PlaneGeometry(width + height * 0.5, height * 1.4),
    plateMaterial,
  );
  backing.name = `Nameplate ${brandById(id).name}`;
  backing.userData.maker = id;
  applyLabelFade(backing, plateMaterial, height * 1.4);
  backing.raycast = () => {};
  mesh.position.z = 0.0004;
  backing.add(mesh);
  return backing;
}

/**
 * A brand's mark wrapped round a curved face (the owner, 2026-10-26: a
 * meter's register, printed round it, not a flat sign stuck on): the same
 * drawing as its badge, on a band of an open cylinder of `radius` about
 * the y axis, `height` tall, centred on +z, a hair proud of the face. Its
 * width follows from the drawing, as far round as that takes.
 */
export function createBrandBand(
  kit: PanelKit,
  id: BrandId,
  {
    radius,
    height,
    form = 'logo',
    ink,
    opacity = 1,
  }: {
    radius: number;
    height: number;
    form?: BadgeForm;
    ink?: string;
    opacity?: number;
  },
) {
  const { texture, aspect } = drawing(id, form, ink);
  const r = radius + 0.0004;
  // As far round as its drawing is wide, never more than half round.
  const theta = Math.min(Math.PI, (height * aspect) / r);
  const material = createPs1Material({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    roughness: 0.5,
    side: DoubleSide,
  });
  kit.materials.push(material);
  const mesh = new Mesh(
    new CylinderGeometry(r, r, height, 24, 1, true, -theta / 2, theta),
    material,
  );
  mesh.name = `Band ${brandById(id).name}`;
  mesh.userData.maker = id;
  applyLabelFade(mesh, material, height, opacity);
  mesh.raycast = () => {};
  return mesh;
}
