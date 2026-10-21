import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';

/** Wall-mounted shoe-cover dispenser. The open lip and the two folded blue
 * covers make its purpose visible even when the label is too small to read. */
export function createShoeCoverDispenser(kit: PanelKit) {
  const group = new Group();
  group.name = 'shoe covering dispenser';
  const white = new MeshStandardMaterial({ color: '#edf0ed', roughness: 0.55 });
  const dark = new MeshStandardMaterial({ color: '#3d5059', roughness: 0.65 });
  const cover = new MeshStandardMaterial({
    color: '#6eafd2',
    roughness: 0.82,
    side: 2,
  });
  const window = new MeshStandardMaterial({
    color: '#bbd4df',
    transparent: true,
    opacity: 0.5,
    roughness: 0.2,
    depthWrite: false,
  });
  kit.materials.push(white, dark, cover, window);
  const box = (
    name: string,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    material: MeshStandardMaterial,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  box('dispenser shell', 0.32, 0.43, 0.16, 0, 0, 0, white);
  box('supply window', 0.24, 0.17, 0.008, 0, 0.06, 0.085, window);
  box('collection slot', 0.23, 0.045, 0.014, 0, -0.15, 0.087, dark);
  box('dispenser lip', 0.28, 0.02, 0.1, 0, -0.21, 0.1, white);
  for (const x of [-0.055, 0.055])
    box('folded shoe covering', 0.085, 0.025, 0.055, x, -0.165, 0.125, cover);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#12618b';
    ctx.fillRect(0, 0, 512, 144);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('SHOE COVERS', 256, 60);
    ctx.font = '35px Arial';
    ctx.fillText('TAKE ONE PAIR', 256, 112);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  kit.textures.push(texture);
  const labelMaterial = new MeshBasicMaterial({ map: texture });
  kit.materials.push(labelMaterial);
  const label = new Mesh(new PlaneGeometry(0.25, 0.07), labelMaterial);
  label.name = 'SHOE COVERS TAKE ONE PAIR';
  label.position.set(0, 0.17, 0.085);
  group.add(label);
  return group;
}
