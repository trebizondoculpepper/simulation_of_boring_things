import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Mesh,
  PlaneGeometry,
} from 'three';
import type { Material, Object3D } from 'three';
import { createPs1Material } from '../parts/ps1-material';
import { createMicroLabel, kitGlow } from './eighties-controls';
import type { PanelKit } from './eighties-controls';
import { createCanvasTexture } from './screens';

/**
 * Shared drawing tools for building fittings (fire, general safety and
 * architectural): paint, boxes, cylinders, lamps, labels and printed
 * plates, each built in metres, facing +z, its mounting face at z = 0 (or,
 * for ceiling fittings, hanging from y = 0 and facing down).
 */

export const SANS = 'Arial, Helvetica, sans-serif';

export const PLATE_WHITE = '#f4f3ee';

export function tools(kit: PanelKit) {
  const paint = (color: string, roughness = 0.5, metalness = 0) => {
    const m = createPs1Material({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const box = (
    parent: Object3D,
    material: Material,
    w: number,
    h: number,
    d: number,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  /** A cylinder whose axis is y, or z (facing out of a wall). */
  const cyl = (
    parent: Object3D,
    material: Material,
    r: number,
    h: number,
    x = 0,
    y = 0,
    z = 0,
    axis: 'y' | 'z' | 'x' = 'y',
    segments = 20,
  ) => {
    const mesh = new Mesh(new CylinderGeometry(r, r, h, segments), material);
    mesh.position.set(x, y, z);
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    parent.add(mesh);
    return mesh;
  };
  /** A lamp: dark until lit, in its colour. */
  const led = (
    parent: Object3D,
    colour: string,
    r: number,
    x: number,
    y: number,
    z: number,
    axis: 'y' | 'z' = 'z',
  ) => {
    const material = kitGlow(kit, colour);
    const on = new Color(colour);
    const off = on.clone().multiplyScalar(0.2);
    const mesh = cyl(parent, material, r, r * 0.6, x, y, z, axis, 12);
    material.color.copy(off);
    return {
      mesh,
      set(lit: boolean | number) {
        const level = typeof lit === 'number' ? lit : lit ? 1 : 0;
        material.color.copy(off).lerp(on, level);
      },
    };
  };
  const label = (
    parent: Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    height: number,
    ink = '#1b1b1b',
    plate: string | null = null,
  ) => {
    const mark = createMicroLabel(kit, text, { height, ink, plate });
    mark.position.set(x, y, z);
    parent.add(mark);
    return mark;
  };
  /** A printed face drawn on a canvas, `w` × `h` metres. */
  const printed = (
    w: number,
    h: number,
    draw: (c: CanvasRenderingContext2D, cw: number, ch: number) => void,
    pixels = 256,
    glow = false,
  ) => {
    const { context, texture } = createCanvasTexture(
      pixels,
      Math.max(8, Math.round((pixels * h) / w)),
    );
    draw(context, context.canvas.width, context.canvas.height);
    texture.needsUpdate = true;
    kit.textures.push(texture);
    const material = createPs1Material({ map: texture }, glow, glow);
    kit.materials.push(material);
    return {
      mesh: new Mesh(new PlaneGeometry(w, h), material),
      context,
      texture,
    };
  };
  return { paint, box, cyl, led, label, printed };
}
