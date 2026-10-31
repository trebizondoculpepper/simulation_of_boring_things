import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import type { Material } from 'three';
import {
  CORRIDOR_DECALS,
  FRAME,
  decalPose,
} from '../logic/museum-corridor-decals';
import type { HallCorridor } from '../logic/museum-plan';

/**
 * The artwork on a corridor's walls (`museum-corridor-decals.ts`): framed
 * pictures, a black moulding round a white mount behind glass, hung flush;
 * and PVC vinyl cut-outs stuck flat, a millimetre proud, their edges cut by
 * the image's alpha, a slight satin sheen. Set decoration. One plane and
 * one box shared by every piece; each image loaded once per build (Vite
 * finds them), mipmapped.
 */
const URLS = import.meta.glob<string>(
  '../../../../resources/images/museum_decals/game/*.webp',
  { eager: true, query: '?url', import: 'default' },
);
const urlOf = (file: string) =>
  Object.entries(URLS).find(([path]) => path.endsWith(`/${file}.webp`))?.[1];

let plane: PlaneGeometry | null = null;
let box: BoxGeometry | null = null;
const shared = () => {
  plane ??= new PlaneGeometry(1, 1);
  box ??= new BoxGeometry(1, 1, 1);
  return { plane, box };
};

/**
 * A corridor's pieces, in the hall's own coordinates, as `c`'s path has
 * it: the same from both the halls that build the corridor.
 */
export function createCorridorDecals(
  c: HallCorridor,
  corridor: number,
  textures: Texture[],
  disposables: Material[],
): Group {
  const group = new Group();
  group.name = 'Corridor artwork';
  const pieces = CORRIDOR_DECALS.filter((d) => d.corridor === corridor);
  if (!pieces.length) return group;
  // The pieces are placed from Hall n's end: the path the other way round from Hall n + 1.
  const path = c.onward ? c.path : ([c.path[2], c.path[1], c.path[0]] as const);
  const { plane: g, box: b } = shared();
  const loader = new TextureLoader();
  const moulding = new MeshStandardMaterial({
    color: '#1d2224',
    roughness: 0.45,
    metalness: 0.4,
  });
  const mount = new MeshStandardMaterial({ color: '#f2efe6', roughness: 0.9 });
  disposables.push(moulding, mount);

  for (const d of pieces) {
    const url = urlOf(d.file);
    const map =
      typeof Image === 'undefined' || !url ? new Texture() : loader.load(url);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    textures.push(map);
    const pose = decalPose(path, d);
    const piece = new Group();
    piece.name = `${d.kind === 'framed' ? 'Framed picture' : 'Vinyl decal'}: ${d.file}`;
    piece.position.set(pose.x, pose.y, pose.z);
    piece.rotation.y = Math.atan2(pose.into[0], pose.into[1]);

    if (d.kind === 'framed') {
      const m = FRAME.mount;
      const r = FRAME.moulding;
      const outerW = d.width + 2 * (m + r);
      const outerH = d.height + 2 * (m + r);
      const rim = new Mesh(b, moulding);
      rim.scale.set(outerW, outerH, FRAME.depth);
      rim.position.z = FRAME.depth / 2;
      piece.add(rim);
      const card = new Mesh(g, mount);
      card.scale.set(d.width + 2 * m, d.height + 2 * m, 1);
      card.position.z = FRAME.depth + 0.001;
      piece.add(card);
      // The print behind glass: a little gloss over it.
      const print = new MeshStandardMaterial({
        map,
        // Printed and lit as any surface, a little lift so it reads in the corridor's dim light.
        emissiveMap: map,
        emissive: '#ffffff',
        emissiveIntensity: 0.15,
        roughness: 0.25,
        metalness: 0,
      });
      disposables.push(print);
      const image = new Mesh(g, print);
      image.scale.set(d.width, d.height, 1);
      image.position.z = FRAME.depth + 0.002;
      piece.add(image);
    } else {
      const vinyl = new MeshStandardMaterial({
        map,
        emissiveMap: map,
        emissive: '#ffffff',
        emissiveIntensity: 0.15,
        transparent: true,
        alphaTest: 0.5,
        roughness: 0.45,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -4,
      });
      disposables.push(vinyl);
      const sticker = new Mesh(g, vinyl);
      sticker.scale.set(d.width, d.height, 1);
      sticker.position.z = 0.001;
      sticker.renderOrder = 1;
      piece.add(sticker);
    }
    group.add(piece);
  }
  return group;
}
