import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PlaneGeometry,
} from 'three';
import type { Material } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import { kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { BOX_FACES, boxSizeOf, faceCanvasSize } from '../logic/software-boxes';
import type { SoftwareTitle } from '../logic/software-boxes';
import { drawBoxFace } from './software-box-art';

/** Pixels a metre of box art is drawn at: legible from the chair, cheap enough for a desk of them. */
const PIXELS_PER_METRE = 1400;

/** One printed card face, drawn once. */
function faceMaterial(
  kit: PanelKit,
  draw: (context: CanvasRenderingContext2D, w: number, h: number) => void,
  w: number,
  h: number,
) {
  const { context, texture } = createCanvasTexture(w, h, 'printed');
  draw(context, w, h);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const material = createPs1Material({ map: texture, roughness: 0.7 });
  kit.materials.push(material);
  return material;
}

/**
 * A mid-1990s big-box PC software box (`logic/software-boxes.ts`) at its
 * true size, its six faces printed (`software-box-art.ts`) and folded round
 * it: the front facing +z, standing on its bottom, its origin the middle of
 * its base. Set decoration, drawn once.
 */
export function createSoftwareBox(kit: PanelKit, title: SoftwareTitle) {
  const size = boxSizeOf(title);
  const materials: Material[] = BOX_FACES.map((face) => {
    const px = faceCanvasSize(size, face, PIXELS_PER_METRE);
    return faceMaterial(
      kit,
      (context, w, h) => drawBoxFace(context, title, face, w, h),
      px.w,
      px.h,
    );
  });
  const geometry = new BoxGeometry(size.w, size.h, size.d);
  geometry.translate(0, size.h / 2, 0);
  const box = new Mesh(geometry, materials);
  box.name = `${title.title} (boxed software)`;
  return box;
}

/** The size of a title's box, metres: front width, height, depth. */
export const softwareBoxSize = (title: SoftwareTitle) => boxSizeOf(title);

/**
 * What came out of an opened box: its spiral-free perfect-bound manual
 * (A5-ish, 148 × 210 mm, 8 mm thick) and its 3.5-inch floppy disks
 * (90 × 94 × 3.3 mm, the format's own size) or a CD in its jewel case
 * (142 × 125 × 10 mm), fanned out. Origin on the surface they lie on.
 */
export function createBoxContents(kit: PanelKit, title: SoftwareTitle) {
  const group = new Group();
  group.name = `${title.title}: manual and disks`;
  const manual = new Mesh(new BoxGeometry(0.148, 0.008, 0.21), [
    kitPaint(kit, '#f2efe4'),
    kitPaint(kit, title.palette.background),
    faceMaterial(
      kit,
      (c, w, h) => {
        c.fillStyle = title.palette.background;
        c.fillRect(0, 0, w, h);
        c.fillStyle = title.palette.accent;
        c.fillRect(0, h * 0.12, w, h * 0.04);
        c.fillStyle = title.palette.ink;
        c.textAlign = 'center';
        c.font = `bold ${Math.round(h * 0.06)}px Arial, sans-serif`;
        const words = title.title.split(' ');
        const half = Math.ceil(words.length / 2);
        c.fillText(words.slice(0, half).join(' '), w / 2, h * 0.32, w * 0.9);
        c.fillText(words.slice(half).join(' '), w / 2, h * 0.4, w * 0.9);
        c.font = `${Math.round(h * 0.045)}px Georgia, serif`;
        c.fillText('User’s Guide', w / 2, h * 0.55);
        c.font = `${Math.round(h * 0.03)}px Arial, sans-serif`;
        c.fillText(title.publisher, w / 2, h * 0.92, w * 0.9);
      },
      148,
      210,
    ),
    kitPaint(kit, '#e8e4d8'),
    kitPaint(kit, '#f2efe4'),
    kitPaint(kit, '#f2efe4'),
  ]);
  manual.position.set(0, 0.004, 0);
  manual.rotation.y = 0.12;
  group.add(manual);
  const onDisks = title.media.includes('3.5');
  if (onDisks) {
    const count = Math.max(1, Number.parseInt(title.media, 10) || 3);
    for (let i = 0; i < count; i++) {
      const disk = new Group();
      const shell = new Mesh(
        new BoxGeometry(0.09, 0.0033, 0.094),
        kitPaint(kit, i % 2 ? '#2a2c30' : '#1d3f73'),
      );
      shell.position.y = 0.00165;
      const shutter = new Mesh(
        new BoxGeometry(0.048, 0.0036, 0.03),
        kitPaint(kit, '#b9bcc0', 0.7),
      );
      shutter.position.set(0.004, 0.0018, -0.032);
      const label = new Mesh(
        new PlaneGeometry(0.07, 0.05),
        faceMaterial(
          kit,
          (c, w, h) => {
            c.fillStyle = '#f7f4ea';
            c.fillRect(0, 0, w, h);
            c.fillStyle = title.palette.accent;
            c.fillRect(0, 0, w, h * 0.2);
            c.fillStyle = '#1d1d1d';
            c.font = `bold ${Math.round(h * 0.16)}px Arial, sans-serif`;
            c.fillText(title.title, 4, h * 0.45, w - 8);
            c.font = `${Math.round(h * 0.14)}px Arial, sans-serif`;
            c.fillText(`Disk ${i + 1} of ${count}`, 4, h * 0.72);
          },
          140,
          100,
        ),
      );
      label.rotation.x = -Math.PI / 2;
      label.position.set(0, 0.0034, 0.017);
      disk.add(shell, shutter, label);
      disk.position.set(0.12 + i * 0.03, 0.0034 * i, -0.02 + i * 0.035);
      disk.rotation.y = -0.3 + i * 0.25;
      group.add(disk);
    }
  } else {
    // The jewel case, and its disc out beside it.
    const jewel = new Mesh(
      new BoxGeometry(0.142, 0.01, 0.125),
      createPs1Material({
        color: '#dfe6ea',
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
      }),
    );
    kit.materials.push(jewel.material as Material);
    jewel.position.set(0.15, 0.005, 0.02);
    jewel.rotation.y = -0.25;
    const disc = new Mesh(
      new CylinderGeometry(0.06, 0.06, 0.0012, 40),
      kitPaint(kit, '#c9ccd2', 0.8),
    );
    disc.position.set(0.11, 0.0006, -0.11);
    const print = new Mesh(
      new CylinderGeometry(0.058, 0.058, 0.0004, 40),
      kitPaint(kit, title.palette.accent),
    );
    print.position.y = 0.0008;
    const hole = new Mesh(
      new CylinderGeometry(0.0075, 0.0075, 0.0005, 16),
      kitPaint(kit, '#6c6f72', 0.6),
    );
    hole.position.y = 0.0011;
    disc.add(print, hole);
    group.add(jewel, disc);
  }
  return group;
}
