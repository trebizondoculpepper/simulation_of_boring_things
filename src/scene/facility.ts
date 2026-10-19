import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  DOOR_HEIGHT,
  ROOMS,
  WALL,
  openingsOf,
  sideSpan,
  wallRuns,
} from '../game/facility-plan';
import type { RoomPlan, Side, Zone } from '../game/facility-plan';
import { cardCentreY, cardHeight, cardWidth } from '../game/title-card';

/**
 * Builds the leisure centre's rooms as empty shells: floor, walls with
 * their doorways, ceiling and a title card. Everything is in metres.
 * Surfaces of one finish are merged into a single mesh, so the whole
 * building draws in a handful of calls.
 */

const SLAB = 0.05;

function canvasTexture(
  width: number,
  height: number,
  draw: (c: CanvasRenderingContext2D) => void,
  metresAcross: number,
  metresDown: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No 2D canvas context.');
  draw(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(1 / metresAcross, 1 / metresDown);
  return texture;
}

/** Square ceramic tiles, `tiles` to a metre, with grout lines. */
function tileTexture(face: string, grout: string, tiles: number) {
  const px = 512;
  return canvasTexture(
    px,
    px,
    (c) => {
      c.fillStyle = grout;
      c.fillRect(0, 0, px, px);
      const cell = px / tiles;
      for (let i = 0; i < tiles; i++)
        for (let j = 0; j < tiles; j++) {
          // A faint variation between tiles, as fired glaze varies.
          const shade = 0.97 + ((i * 7 + j * 13) % 5) * 0.008;
          c.fillStyle = face;
          c.globalAlpha = shade;
          c.fillRect(i * cell + 1.5, j * cell + 1.5, cell - 3, cell - 3);
        }
      c.globalAlpha = 1;
    },
    1,
    1,
  );
}

/** Painted concrete blockwork, 440 by 215 mm blocks in stretcher bond. */
function blockTexture(paint: string, joint: string) {
  const w = 512,
    h = 250;
  return canvasTexture(
    w,
    h,
    (c) => {
      c.fillStyle = joint;
      c.fillRect(0, 0, w, h);
      c.fillStyle = paint;
      const bw = w / 2,
        bh = h / 2;
      for (let row = 0; row < 2; row++)
        for (let col = -1; col < 3; col++) {
          const x = col * bw + (row % 2) * (bw / 2);
          c.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
        }
    },
    0.9,
    0.45,
  );
}

/** Sealed concrete: a mottled grey with faint saw-cut joints every 4 m. */
function concreteTexture() {
  const px = 512;
  return canvasTexture(
    px,
    px,
    (c) => {
      c.fillStyle = '#9b9a95';
      c.fillRect(0, 0, px, px);
      let seed = 7;
      const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 2600; i++) {
        const v = 130 + Math.floor(random() * 40);
        c.fillStyle = `rgba(${v},${v},${v - 4},0.25)`;
        c.fillRect(
          random() * px,
          random() * px,
          2 + random() * 6,
          2 + random() * 6,
        );
      }
      c.strokeStyle = 'rgba(60,60,58,0.5)';
      c.lineWidth = 2;
      c.strokeRect(0, 0, px, px);
    },
    4,
    4,
  );
}

interface Finishes {
  floor: Record<Zone, Material>;
  wall: Record<Zone, Material>;
  ceiling: Record<Zone, Material>;
}

function createFinishes(textures: Texture[]): Finishes {
  const keep = <T extends Texture>(t: T) => (textures.push(t), t);
  return {
    floor: {
      public: new MeshStandardMaterial({
        map: keep(tileTexture('#e9ecea', '#b9c2c2', 6)),
        roughness: 0.35,
      }),
      service: new MeshStandardMaterial({
        map: keep(concreteTexture()),
        roughness: 0.6,
      }),
    },
    wall: {
      public: new MeshStandardMaterial({
        map: keep(tileTexture('#f3f4f1', '#c9cfcd', 4)),
        roughness: 0.3,
      }),
      service: new MeshStandardMaterial({
        map: keep(blockTexture('#d8d6cc', '#bdbab0')),
        roughness: 0.85,
      }),
    },
    ceiling: {
      public: new MeshStandardMaterial({ color: '#e6e8e6', roughness: 0.9 }),
      service: new MeshStandardMaterial({ color: '#c9c8c2', roughness: 0.9 }),
    },
  };
}

/**
 * A box at a world position, its texture coordinates in world metres
 * (box-mapped by face), so tiles and blocks run on across merged pieces.
 */
function box(
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
) {
  const geometry = new BoxGeometry(sx, sy, sz).toNonIndexed();
  geometry.translate(x, y, z);
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    const nx = Math.abs(normal.getX(i)),
      ny = Math.abs(normal.getY(i));
    const px = position.getX(i),
      py = position.getY(i),
      pz = position.getZ(i);
    if (ny > 0.5) uv.setXY(i, px, pz);
    else if (nx > 0.5) uv.setXY(i, pz, py);
    else uv.setXY(i, px, py);
  }
  return geometry;
}

/** Collects geometry by material, then merges each into one mesh. */
function createBatches() {
  const batches = new Map<Material, BufferGeometry[]>();
  return {
    add(material: Material, geometry: BufferGeometry) {
      const list = batches.get(material) ?? [];
      list.push(geometry);
      batches.set(material, list);
    },
    meshes() {
      const meshes: Mesh[] = [];
      for (const [material, list] of batches) {
        const merged = mergeGeometries(list);
        for (const g of list) g.dispose();
        if (!merged) throw new Error('Could not merge room geometry.');
        meshes.push(new Mesh(merged, material));
      }
      return meshes;
    },
  };
}

/** A wall run's box: its length along the wall, and where it stands. */
function wallBox(
  room: RoomPlan,
  side: Side,
  from: number,
  to: number,
  bottom: number,
  top: number,
) {
  const half = WALL / 2;
  const length = to - from;
  const mid = (from + to) / 2;
  const height = top - bottom;
  const y = (bottom + top) / 2;
  switch (side) {
    case 'north':
      return box(length, height, half, mid, y, room.minZ + half / 2);
    case 'south':
      return box(length, height, half, mid, y, room.maxZ - half / 2);
    case 'west':
      return box(half, height, length, room.minX + half / 2, y, mid);
    case 'east':
      return box(half, height, length, room.maxX - half / 2, y, mid);
  }
}

/** A printed title card: the room's name over what it is for. */
function createTitleCard(room: RoomPlan, textures: Texture[]) {
  const w = cardWidth(room),
    h = cardHeight(room);
  const pw = 1536,
    ph = 512;
  const service = room.zone === 'service';
  const texture = canvasTexture(
    pw,
    ph,
    (c) => {
      c.fillStyle = service ? '#1f3b5a' : '#0f5f7a';
      c.fillRect(0, 0, pw, ph);
      c.strokeStyle = '#f2f2ec';
      c.lineWidth = 10;
      c.strokeRect(24, 24, pw - 48, ph - 48);
      c.fillStyle = '#f7f7f2';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      let size = 150;
      c.font = `bold ${size}px Arial, Helvetica, sans-serif`;
      const fit = (text: string, max: number) => {
        while (c.measureText(text).width > max && size > 20) {
          size -= 4;
          c.font = `bold ${size}px Arial, Helvetica, sans-serif`;
        }
      };
      fit(room.title, pw - 160);
      c.fillText(room.title, pw / 2, ph * 0.4);
      size = 54;
      c.font = `${size}px Arial, Helvetica, sans-serif`;
      fit(room.purpose, pw - 200);
      c.font = `${size}px Arial, Helvetica, sans-serif`;
      c.fillStyle = '#d9e6ea';
      c.fillText(room.purpose, pw / 2, ph * 0.72);
    },
    1,
    1,
  );
  texture.repeat.set(1, 1);
  textures.push(texture);
  const card = new Mesh(
    new PlaneGeometry(w, h),
    new MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  const inset = WALL / 2 + 0.02;
  const y = cardCentreY(room);
  const cx = (room.minX + room.maxX) / 2,
    cz = (room.minZ + room.maxZ) / 2;
  switch (room.card) {
    case 'north':
      card.position.set(cx, y, room.minZ + inset);
      break;
    case 'south':
      card.position.set(cx, y, room.maxZ - inset);
      card.rotation.y = Math.PI;
      break;
    case 'west':
      card.position.set(room.minX + inset, y, cz);
      card.rotation.y = Math.PI / 2;
      break;
    case 'east':
      card.position.set(room.maxX - inset, y, cz);
      card.rotation.y = -Math.PI / 2;
      break;
  }
  card.name = `title-card:${room.id}`;
  return card;
}

export function createFacility(rooms: readonly RoomPlan[] = ROOMS) {
  const group = new Group();
  group.name = 'facility';
  const textures: Texture[] = [];
  const finishes = createFinishes(textures);
  const batches = createBatches();
  for (const room of rooms) {
    const sx = room.maxX - room.minX,
      sz = room.maxZ - room.minZ;
    const cx = (room.minX + room.maxX) / 2,
      cz = (room.minZ + room.maxZ) / 2;
    batches.add(
      finishes.floor[room.zone],
      box(sx, SLAB, sz, cx, -SLAB / 2, cz),
    );
    batches.add(
      finishes.ceiling[room.zone],
      box(sx, SLAB, sz, cx, room.height + SLAB / 2, cz),
    );
    const openings = openingsOf(room);
    for (const side of ['north', 'south', 'east', 'west'] as const) {
      const span = sideSpan(room, side);
      const wall = finishes.wall[room.zone];
      for (const run of wallRuns(span, openings[side]))
        batches.add(
          wall,
          wallBox(room, side, run.from, run.to, 0, room.height),
        );
      // The wall over each doorway.
      for (const hole of openings[side])
        batches.add(
          wall,
          wallBox(room, side, hole.from, hole.to, DOOR_HEIGHT, room.height),
        );
    }
    group.add(createTitleCard(room, textures));
  }
  for (const mesh of batches.meshes()) group.add(mesh);
  const materials = new Set<Material>();
  group.traverse((o) => {
    if (o instanceof Mesh) materials.add(o.material as Material);
  });
  return {
    group,
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) (o.geometry as BufferGeometry).dispose();
      });
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
