import {
  BoxGeometry,
  CatmullRomCurve3,
  BufferGeometry,
  Float32BufferAttribute,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  DoubleSide,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  PlaneGeometry,
  SpotLight,
  RepeatWrapping,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material, Texture } from 'three';
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
import { BASINS, cutBasins } from '../game/pool-layout';
import {
  LOWER_Y,
  STAIRS,
  STAIR_GOING,
  STAIR_RISE,
  STAIR_RISERS,
} from '../game/facility-levels';
import type { Stair } from '../game/facility-levels';
import { ROOFLIGHTS, WINDOWS, cutWindows } from '../game/daylight-plan';
import {
  BENCHES,
  CUBICLES,
  LOCKER_BANKS,
  VANITY,
} from '../game/changing-layout';
import type { Basin } from '../game/pool-layout';

/** Each room is an independent model placed in the same world coordinates. */

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
  basin: Material;
  coping: Material;
  grating: Material;
  gully: Material;
  gullySlat: Material;
  lane: Material;
  steel: Material;
  lightFrame: Material;
  lightLens: Material;
  glass: Material;
  glazingFrame: Material;
  roofGlass: Material;
  poolBand: Material;
  cubicle: Material;
  cubicleAlt: Material;
  locker: Material;
  lockerAlt: Material;
  bench: Material;
  mirror: Material;
  plywood: Material;
  plywoodEdge: Material;
  upholstery: Material;
  vending: Material;
  vendingDisplay: Material;
  skirting: Material;
  cableTray: Material;
  accents: Record<'water' | 'heat' | 'electric' | 'work', Material>;
}

function createFinishes(textures: Texture[]): Finishes {
  const keep = <T extends Texture>(t: T) => (textures.push(t), t);
  return {
    floor: {
      public: new MeshPhysicalMaterial({
        map: keep(tileTexture('#f5f8f6', '#c4cdcb', 6)),
        roughness: 0.22,
        clearcoat: 0.45,
        clearcoatRoughness: 0.16,
      }),
      service: new MeshStandardMaterial({
        map: keep(concreteTexture()),
        roughness: 0.6,
      }),
    },
    wall: {
      public: new MeshPhysicalMaterial({
        map: keep(tileTexture('#fafbf8', '#c8d0cd', 4)),
        roughness: 0.15,
        clearcoat: 0.65,
        clearcoatRoughness: 0.1,
      }),
      service: new MeshStandardMaterial({
        map: keep(blockTexture('#d8d9d2', '#b9bdb7')),
        roughness: 0.85,
      }),
    },
    ceiling: {
      public: new MeshStandardMaterial({ color: '#e6e8e6', roughness: 0.9 }),
      service: new MeshStandardMaterial({ color: '#bbbdbb', roughness: 0.9 }),
    },
    basin: new MeshPhysicalMaterial({
      map: keep(tileTexture('#f0f8f7', '#b8cdcc', 5)),
      roughness: 0.16,
      clearcoat: 0.65,
      clearcoatRoughness: 0.12,
    }),
    coping: new MeshStandardMaterial({ color: '#e4e8e3', roughness: 0.5 }),
    grating: new MeshStandardMaterial({ color: '#879796', roughness: 0.7 }),
    gully: new MeshStandardMaterial({ color: '#536a6c', roughness: 0.52 }),
    gullySlat: new MeshStandardMaterial({ color: '#e8eeea', roughness: 0.32 }),
    lane: new MeshStandardMaterial({ color: '#174a62', roughness: 0.45 }),
    steel: new MeshStandardMaterial({
      color: '#b5c1c0',
      metalness: 0.8,
      roughness: 0.2,
    }),
    lightFrame: new MeshStandardMaterial({ color: '#a1aaa9', metalness: 0.3 }),
    lightLens: new MeshStandardMaterial({
      color: '#f5f7f1',
      emissive: '#e8f2f0',
      emissiveIntensity: 1.6,
      roughness: 0.5,
    }),
    glass: new MeshStandardMaterial({
      color: '#b4d9e4',
      metalness: 0.15,
      roughness: 0.12,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: DoubleSide,
    }),
    glazingFrame: new MeshStandardMaterial({
      color: '#4d646e',
      metalness: 0.55,
      roughness: 0.35,
    }),
    roofGlass: new MeshStandardMaterial({
      color: '#d7e4e6',
      roughness: 0.9,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      side: DoubleSide,
    }),
    poolBand: new MeshStandardMaterial({ color: '#8db8bc', roughness: 0.48 }),
    cubicle: new MeshStandardMaterial({ color: '#cbd7d2', roughness: 0.55 }),
    cubicleAlt: new MeshStandardMaterial({ color: '#b7cbd0', roughness: 0.55 }),
    locker: new MeshStandardMaterial({ color: '#799ea7', roughness: 0.48 }),
    lockerAlt: new MeshStandardMaterial({ color: '#a7bbb5', roughness: 0.48 }),
    bench: new MeshStandardMaterial({ color: '#d2d1c0', roughness: 0.6 }),
    mirror: new MeshStandardMaterial({
      color: '#bed0d3',
      metalness: 0.7,
      roughness: 0.08,
    }),
    plywood: new MeshStandardMaterial({ color: '#bd8751', roughness: 0.46 }),
    plywoodEdge: new MeshStandardMaterial({
      color: '#774522',
      roughness: 0.55,
    }),
    upholstery: new MeshStandardMaterial({ color: '#638787', roughness: 0.92 }),
    vending: new MeshStandardMaterial({
      color: '#53656a',
      metalness: 0.3,
      roughness: 0.35,
    }),
    vendingDisplay: new MeshStandardMaterial({
      color: '#172629',
      metalness: 0.25,
      roughness: 0.12,
    }),
    skirting: new MeshStandardMaterial({ color: '#5f6262', roughness: 0.9 }),
    cableTray: new MeshStandardMaterial({
      color: '#b8bfbd',
      metalness: 0.45,
      roughness: 0.5,
    }),
    accents: {
      water: new MeshStandardMaterial({ color: '#138c91', roughness: 0.8 }),
      heat: new MeshStandardMaterial({ color: '#e27532', roughness: 0.8 }),
      electric: new MeshStandardMaterial({ color: '#6a3fa0', roughness: 0.8 }),
      work: new MeshStandardMaterial({ color: '#2f5fb8', roughness: 0.8 }),
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

/** Empty tiled basin with deck overflow channels and floor outlets. */
function addBasin(
  batches: ReturnType<typeof createBatches>,
  basin: Basin,
  finish: Finishes,
) {
  const x = (basin.minX + basin.maxX) / 2;
  const z = (basin.minZ + basin.maxZ) / 2;
  const width = basin.maxX - basin.minX;
  const length = basin.maxZ - basin.minZ;
  const depth = basin.depth;
  const wall = 0.1;
  batches.add(finish.basin, box(width, SLAB, length, x, -depth, z));
  for (const edgeX of [basin.minX, basin.maxX]) {
    batches.add(finish.basin, box(wall, depth, length, edgeX, -depth / 2, z));
    batches.add(finish.coping, box(0.25, 0.08, length, edgeX, 0.025, z));
    const drainX = edgeX + (edgeX === basin.minX ? -0.28 : 0.28);
    batches.add(finish.gully, box(0.22, 0.014, length, drainX, 0.006, z));
    for (let grateZ = basin.minZ + 0.1; grateZ < basin.maxZ; grateZ += 0.22)
      batches.add(
        finish.gullySlat,
        box(0.205, 0.014, 0.038, drainX, 0.02, grateZ),
      );
  }
  for (const edgeZ of [basin.minZ, basin.maxZ]) {
    batches.add(finish.basin, box(width, depth, wall, x, -depth / 2, edgeZ));
    batches.add(finish.coping, box(width, 0.08, 0.25, x, 0.025, edgeZ));
    const drainZ = edgeZ + (edgeZ === basin.minZ ? -0.28 : 0.28);
    batches.add(finish.gully, box(width, 0.014, 0.22, x, 0.006, drainZ));
    for (let grateX = basin.minX + 0.1; grateX < basin.maxX; grateX += 0.22)
      batches.add(
        finish.gullySlat,
        box(0.038, 0.014, 0.205, grateX, 0.02, drainZ),
      );
  }
  const outlets =
    basin.id === 'main'
      ? [basin.minX + width * 0.3, basin.minX + width * 0.7]
      : [x];
  for (const outletX of outlets) {
    batches.add(finish.gully, box(0.5, 0.014, 0.5, outletX, -depth + 0.033, z));
    for (let offset = -0.18; offset <= 0.18; offset += 0.09)
      batches.add(
        finish.gullySlat,
        box(0.035, 0.012, 0.45, outletX + offset, -depth + 0.044, z),
      );
  }
  if (basin.id === 'main') {
    for (let lane = 0; lane < 6; lane++) {
      const laneZ = basin.minZ + ((lane + 0.5) * length) / 6;
      batches.add(
        finish.lane,
        box(width - 2, 0.008, 0.18, x, -depth + 0.03, laneZ),
      );
    }
  }
}

/** Original low-detail rail geometry based on a standard wall ladder. */
function addLadder(
  model: Group,
  basin: Basin,
  roomX: number,
  roomZ: number,
  steel: Material,
) {
  const edge = basin.maxX;
  const centerZ = (basin.minZ + basin.maxZ) / 2;
  for (const offsetZ of [-0.38, 0.38]) {
    const points = [
      new Vector3(
        edge - 0.25 - roomX,
        -Math.min(basin.depth - 0.15, 1.2),
        centerZ + offsetZ - roomZ,
      ),
      new Vector3(edge - 0.25 - roomX, 0.35, centerZ + offsetZ - roomZ),
      new Vector3(edge - 0.05 - roomX, 0.85, centerZ + offsetZ - roomZ),
      new Vector3(edge + 0.55 - roomX, 0.85, centerZ + offsetZ - roomZ),
      new Vector3(edge + 0.65 - roomX, 0.05, centerZ + offsetZ - roomZ),
    ];
    model.add(
      new Mesh(
        new TubeGeometry(new CatmullRomCurve3(points), 30, 0.0215, 8, false),
        steel,
      ),
    );
  }
  for (const y of [-0.25, -0.58, -0.91]) {
    if (-y >= basin.depth - 0.1) continue;
    const rung = new Mesh(new CylinderGeometry(0.025, 0.025, 0.76, 10), steel);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(edge - 0.25 - roomX, y, centerZ - roomZ);
    model.add(rung);
  }
}

/** Shallow barrel glazing over actual openings in the hall ceiling. */
function addRooflights(model: Group, room: RoomPlan, finish: Finishes) {
  const cx = (room.minX + room.maxX) / 2;
  const cz = (room.minZ + room.maxZ) / 2;
  for (const light of ROOFLIGHTS) {
    const segments = 16;
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let iz = 0; iz <= 1; iz++)
      for (let ix = 0; ix <= segments; ix++) {
        const t = ix / segments;
        vertices.push(
          light.minX + (light.maxX - light.minX) * t - cx,
          room.height + 0.75 * Math.sin(Math.PI * t),
          (iz ? light.maxZ : light.minZ) - cz,
        );
      }
    for (let ix = 0; ix < segments; ix++) {
      const a = ix,
        b = ix + 1,
        c = segments + 1 + ix,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const pane = new Mesh(geometry, finish.roofGlass);
    pane.name = 'barrel-rooflight';
    model.add(pane);
    for (const z of [light.minZ, (light.minZ + light.maxZ) / 2, light.maxZ]) {
      const points = Array.from({ length: 17 }, (_, i) => {
        const t = i / 16;
        return new Vector3(
          light.minX + (light.maxX - light.minX) * t - cx,
          room.height + 0.75 * Math.sin(Math.PI * t) + 0.02,
          z - cz,
        );
      });
      const rib = new Mesh(
        new TubeGeometry(new CatmullRomCurve3(points), 24, 0.055, 6, false),
        finish.glazingFrame,
      );
      model.add(rib);
    }
    for (const x of [light.minX, light.maxX]) {
      const rail = new Mesh(
        new BoxGeometry(0.12, 0.15, light.maxZ - light.minZ),
        finish.glazingFrame,
      );
      rail.position.set(
        x - cx,
        room.height,
        (light.minZ + light.maxZ) / 2 - cz,
      );
      model.add(rail);
    }
  }
}

function trimBox(
  room: RoomPlan,
  side: Side,
  from: number,
  to: number,
  bottom: number,
  top: number,
) {
  const t = 0.025,
    mid = (from + to) / 2,
    y = (bottom + top) / 2;
  if (side === 'north')
    return box(
      to - from,
      top - bottom,
      t,
      mid,
      y,
      room.minZ + WALL / 2 + t / 2,
    );
  if (side === 'south')
    return box(
      to - from,
      top - bottom,
      t,
      mid,
      y,
      room.maxZ - WALL / 2 - t / 2,
    );
  if (side === 'west')
    return box(
      t,
      top - bottom,
      to - from,
      room.minX + WALL / 2 + t / 2,
      y,
      mid,
    );
  return box(t, top - bottom, to - from, room.maxX - WALL / 2 - t / 2, y, mid);
}

/** Suspended LED battens in public rooms and compact downlights in service rooms. */
function addCeilingFixtures(
  batches: ReturnType<typeof createBatches>,
  room: RoomPlan,
  finish: Finishes,
) {
  const width = room.maxX - room.minX;
  const depth = room.maxZ - room.minZ;
  const columns =
    room.id === 'hall'
      ? 5
      : room.id === 'corridor'
        ? 8
        : Math.max(1, Math.floor(width / 7));
  const rows =
    room.id === 'hall'
      ? 3
      : room.id === 'changing' || room.id === 'reception'
        ? 2
        : 1;
  for (let ix = 0; ix < columns; ix++)
    for (let iz = 0; iz < rows; iz++) {
      const x = room.minX + ((ix + 0.5) * width) / columns;
      const z = room.minZ + ((iz + 0.5) * depth) / rows;
      if (room.zone === 'public') {
        const drop = room.id === 'hall' ? 1.25 : 0.38;
        const y = room.height - drop;
        const length = room.id === 'hall' ? 2.8 : 1.8;
        batches.add(finish.lightFrame, box(length, 0.12, 0.25, x, y, z));
        batches.add(
          finish.lightLens,
          box(length - 0.12, 0.018, 0.17, x, y - 0.068, z),
        );
        for (const endX of [x - length * 0.36, x + length * 0.36]) {
          batches.add(
            finish.steel,
            box(0.018, drop - 0.1, 0.018, endX, room.height - drop / 2, z),
          );
          batches.add(
            finish.lightFrame,
            box(0.18, 0.035, 0.18, endX, room.height - 0.018, z),
          );
        }
      } else {
        const y = room.height - 0.13;
        const bezel = new CylinderGeometry(0.16, 0.16, 0.055, 16);
        bezel.translate(x, y, z);
        batches.add(finish.lightFrame, bezel);
        const lens = new CylinderGeometry(0.12, 0.12, 0.012, 16);
        lens.translate(x, y - 0.035, z);
        batches.add(finish.lightLens, lens);
      }
    }
}

/** Simple, cleanable furniture for a mixed changing village. */
function addChangingFurniture(
  batches: ReturnType<typeof createBatches>,
  finish: Finishes,
) {
  for (const [index, c] of CUBICLES.entries()) {
    const panel = index % 2 ? finish.cubicleAlt : finish.cubicle;
    const midX = (c.minX + c.maxX) / 2;
    for (const z of [c.minZ, c.maxZ])
      batches.add(panel, box(c.maxX - c.minX, 2.15, 0.08, midX, 1.12, z));
    batches.add(panel, box(0.08, 2.15, 1.2, c.maxX, 1.12, c.minZ + 0.6));
    // A short privacy return keeps the opening offset without adding a door.
    batches.add(panel, box(0.55, 2.15, 0.08, c.maxX - 0.27, 1.12, c.maxZ));
    const z = (c.minZ + c.maxZ) / 2;
    batches.add(finish.bench, box(2.2, 0.11, 0.46, c.minX + 1.75, 0.47, z));
    batches.add(finish.steel, box(0.05, 0.42, 0.36, c.minX + 1.0, 0.26, z));
    batches.add(finish.steel, box(0.05, 0.42, 0.36, c.minX + 2.5, 0.26, z));
    batches.add(finish.steel, box(0.05, 0.05, 0.08, c.minX + 0.08, 1.78, z));
  }
  for (const bank of LOCKER_BANKS) {
    const count = Math.round((bank.maxZ - bank.minZ) / 0.8);
    for (let i = 0; i < count; i++) {
      const z = bank.minZ + (i + 0.5) * 0.8;
      const paint = i % 3 === 0 ? finish.lockerAlt : finish.locker;
      batches.add(paint, box(0.8, 1.84, 0.78, 94.95, 0.94, z));
      batches.add(finish.glazingFrame, box(0.035, 0.025, 0.75, 94.53, 0.94, z));
      for (const y of [0.5, 1.39])
        batches.add(finish.steel, box(0.035, 0.12, 0.028, 94.49, y, z + 0.23));
    }
  }
  for (const bench of BENCHES) {
    const x = (bench.minX + bench.maxX) / 2;
    const z = (bench.minZ + bench.maxZ) / 2;
    for (const offset of [-0.3, 0, 0.3])
      batches.add(
        finish.bench,
        box(0.24, 0.08, bench.maxZ - bench.minZ, x + offset, 0.49, z),
      );
    for (const end of [bench.minZ + 0.6, bench.maxZ - 0.6])
      batches.add(finish.steel, box(0.65, 0.44, 0.08, x, 0.24, end));
  }
  const vanityX = (VANITY.minX + VANITY.maxX) / 2;
  batches.add(finish.bench, box(6, 0.12, 0.8, vanityX, 0.85, 10.75));
  batches.add(finish.mirror, box(5.6, 0.9, 0.03, vanityX, 1.72, 10.17));
  for (const x of [87, 89, 91]) {
    batches.add(finish.coping, box(0.48, 0.025, 0.36, x, 0.92, 10.79));
    batches.add(finish.steel, box(0.04, 0.18, 0.04, x, 1.03, 10.48));
  }
  // Two simple showers at the wet end, with a low floor drain.
  for (const x of [90.2, 92.2]) {
    batches.add(finish.steel, box(0.045, 1.2, 0.045, x, 1.55, 39.78));
    batches.add(finish.steel, box(0.42, 0.035, 0.14, x, 2.2, 39.65));
    batches.add(finish.grating, box(0.7, 0.01, 0.08, x, 0.008, 38.4));
  }
  for (const x of [89.2, 91.2, 93.2])
    batches.add(finish.cubicleAlt, box(0.08, 2.1, 1.6, x, 1.1, 39));
}

/** A shallow curved plan extruded vertically, with a broad customer-facing arc. */
function receptionDesk(height: number, baseY: number) {
  const shape = new Shape();
  shape.moveTo(100.5, -17.4);
  shape.lineTo(108.5, -17.4);
  shape.lineTo(108.5, -18.65);
  shape.quadraticCurveTo(104.5, -21.1, 100.5, -18.65);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 24,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, baseY, 0);
  return geometry;
}

/** Public entry fittings, arranged around the central passage. */
function addReceptionFurniture(
  batches: ReturnType<typeof createBatches>,
  finish: Finishes,
) {
  // Moulded plywood counter, dark exposed ply edge and a recessed toe kick.
  batches.add(finish.plywoodEdge, receptionDesk(0.12, 0.04));
  batches.add(finish.plywood, receptionDesk(0.77, 0.16));
  batches.add(finish.plywoodEdge, receptionDesk(0.06, 0.93));
  batches.add(finish.plywood, receptionDesk(0.045, 0.99));
  // Two small waiting clusters, each with upholstered seats and a low table.
  for (const x of [101.5, 107.5]) {
    for (const z of [28.85, 30.75]) {
      batches.add(finish.plywood, box(1.6, 0.36, 0.9, x, 0.24, z));
      batches.add(finish.upholstery, box(1.48, 0.13, 0.83, x, 0.49, z));
      batches.add(
        finish.upholstery,
        box(1.48, 0.65, 0.12, x, 0.72, z + (z > 30 ? 0.4 : -0.4)),
      );
    }
    batches.add(finish.plywoodEdge, box(1.4, 0.055, 0.8, x, 0.4, 29.8));
    for (const legX of [x - 0.5, x + 0.5])
      batches.add(finish.steel, box(0.04, 0.35, 0.04, legX, 0.19, 29.8));
  }
  // Vending machines against the east wall, outside the entrance approach.
  for (const [index, z] of [17.7, 20.2].entries()) {
    batches.add(finish.vending, box(1.8, 2.15, 2, 110.4, 1.09, z));
    batches.add(
      finish.vendingDisplay,
      box(0.025, 1.65, 1.34, 109.48, 1.24, z - 0.2),
    );
    batches.add(
      index ? finish.cubicleAlt : finish.poolBand,
      box(0.03, 0.3, 1.3, 109.46, 1.7, z - 0.2),
    );
    batches.add(finish.steel, box(0.035, 0.48, 0.2, 109.45, 0.6, z + 0.62));
    batches.add(finish.gully, box(0.04, 0.09, 0.6, 109.44, 0.36, z - 0.2));
  }
  // Open guide rails frame the entrance to the changing village.
  for (const z of [21.15, 28.85]) {
    batches.add(finish.steel, box(0.08, 1.05, 1.7, 98.2, 0.54, z));
    batches.add(finish.glazingFrame, box(0.8, 0.07, 0.07, 98.2, 0.95, z));
  }
}

/** A few actual light sources sit beneath the repeated visible fittings. */
function addRoomLighting(model: Group, room: RoomPlan, cx: number, cz: number) {
  const positions =
    room.id === 'hall'
      ? [8, 24, 40, 56, 72].map((x) => [x, 25, 50] as const)
      : room.id === 'changing'
        ? [17.5, 32.5].flatMap((z) => [84, 92].map((x) => [x, z, 20] as const))
        : room.id === 'reception'
          ? [20, 30].flatMap((z) => [100, 108].map((x) => [x, z, 14] as const))
          : room.id === 'corridor'
            ? [6, 30, 54, 78].map((x) => [x, -2, 9] as const)
            : room.zone === 'service'
              ? [[cx, cz, 9] as const]
              : [];
  for (const [x, z, intensity] of positions) {
    const lamp = new SpotLight(
      '#edf5f2',
      intensity * 2.5,
      room.id === 'hall' ? 28 : 11,
      Math.PI / 3,
      0.78,
      2,
    );
    lamp.position.set(
      x - cx,
      room.height -
        (room.id === 'hall' ? 1.35 : room.zone === 'service' ? 0.25 : 0.48),
      z - cz,
    );
    lamp.castShadow = false;
    lamp.target.position.set(x - cx, 0, z - cz);
    model.add(lamp);
    model.add(lamp.target);
  }
}

function serviceAccent(room: RoomPlan): keyof Finishes['accents'] {
  if (
    ['pumps', 'balance-tank', 'lower-corridor', 'upper-plant'].includes(room.id)
  )
    return 'water';
  if (['boiler', 'chemicals'].includes(room.id)) return 'heat';
  if (['switch-room', 'air-handling'].includes(room.id)) return 'electric';
  return 'work';
}

function createRoomModel(
  room: RoomPlan,
  finishes: Finishes,
  textures: Texture[],
) {
  const model = new Group();
  model.name = `room:${room.id}`;
  const batches = createBatches();
  const sx = room.maxX - room.minX,
    sz = room.maxZ - room.minZ;
  const cx = (room.minX + room.maxX) / 2,
    cz = (room.minZ + room.maxZ) / 2;
  if (room.id === 'hall') {
    for (const deck of cutBasins(room))
      batches.add(
        finishes.floor.public,
        box(
          deck.maxX - deck.minX,
          SLAB,
          deck.maxZ - deck.minZ,
          (deck.minX + deck.maxX) / 2,
          -SLAB / 2,
          (deck.minZ + deck.maxZ) / 2,
        ),
      );
    for (const basin of BASINS) addBasin(batches, basin, finishes);
    for (const x of [8, 24, 40, 56, 72])
      batches.add(
        finishes.ceiling.public,
        box(0.42, 0.3, 50, x, room.height - 0.08, 25),
      );
  } else if (room.id === 'corridor') {
    // The floor is open above the stair's whole flight.
    for (const piece of cutBasins(room, STAIR_OPENINGS))
      batches.add(
        finishes.floor.service,
        box(
          piece.maxX - piece.minX,
          SLAB,
          piece.maxZ - piece.minZ,
          (piece.minX + piece.maxX) / 2,
          -SLAB / 2,
          (piece.minZ + piece.maxZ) / 2,
        ),
      );
  } else {
    batches.add(
      finishes.floor[room.zone],
      box(sx, SLAB, sz, cx, -SLAB / 2, cz),
    );
  }
  if (room.id === 'hall') {
    for (const patch of cutBasins(room, ROOFLIGHTS))
      batches.add(
        finishes.ceiling.public,
        box(
          patch.maxX - patch.minX,
          SLAB,
          patch.maxZ - patch.minZ,
          (patch.minX + patch.maxX) / 2,
          room.height + SLAB / 2,
          (patch.minZ + patch.maxZ) / 2,
        ),
      );
    addRooflights(model, room, finishes);
  } else if (room.id === 'lower-corridor') {
    // Its ceiling is open where the stair goes up through the floor above.
    for (const piece of cutBasins(room, STAIR_OPENINGS))
      batches.add(
        finishes.ceiling.service,
        box(
          piece.maxX - piece.minX,
          SLAB,
          piece.maxZ - piece.minZ,
          (piece.minX + piece.maxX) / 2,
          room.height + SLAB / 2,
          (piece.minZ + piece.maxZ) / 2,
        ),
      );
  } else {
    batches.add(
      finishes.ceiling[room.zone],
      box(sx, SLAB, sz, cx, room.height + SLAB / 2, cz),
    );
  }
  const openings = openingsOf(room);
  for (const side of ['north', 'south', 'east', 'west'] as const) {
    const span = sideSpan(room, side);
    const wall = finishes.wall[room.zone];
    const glazed =
      room.id === 'reception' && (side === 'east' || side === 'south');
    for (const run of wallRuns(span, openings[side])) {
      if (!glazed) {
        const windows = WINDOWS.filter(
          (w) => w.room === room.id && w.side === side,
        );
        const patches = cutWindows(
          { from: run.from, to: run.to, bottom: 0, top: room.height },
          windows,
        );
        for (const patch of patches.solid)
          batches.add(
            wall,
            wallBox(room, side, patch.from, patch.to, patch.bottom, patch.top),
          );
        for (const patch of patches.glass) {
          batches.add(
            finishes.glass,
            wallBox(room, side, patch.from, patch.to, patch.bottom, patch.top),
          );
          for (const y of [patch.bottom, patch.top])
            batches.add(
              finishes.glazingFrame,
              trimBox(room, side, patch.from, patch.to, y - 0.04, y + 0.04),
            );
          for (const x of [patch.from, patch.to])
            batches.add(
              finishes.glazingFrame,
              trimBox(
                room,
                side,
                x - 0.045,
                x + 0.045,
                patch.bottom,
                patch.top,
              ),
            );
        }
      } else
        batches.add(
          finishes.glass,
          wallBox(room, side, run.from, run.to, 0, room.height),
        );
      if (room.zone === 'service') {
        batches.add(
          finishes.skirting,
          trimBox(room, side, run.from, run.to, 0, 0.16),
        );
        batches.add(
          finishes.accents[serviceAccent(room)],
          trimBox(room, side, run.from, run.to, 0.93, 1.05),
        );
      }
      if (glazed) {
        // Glazing posts every few metres; the frame is part of this room model.
        const steps = Math.max(1, Math.ceil((run.to - run.from) / 3));
        for (let i = 0; i <= steps; i++) {
          const at = run.from + ((run.to - run.from) * i) / steps;
          batches.add(
            finishes.glazingFrame,
            wallBox(room, side, at - 0.045, at + 0.045, 0, room.height),
          );
        }
        batches.add(
          finishes.glazingFrame,
          wallBox(room, side, run.from, run.to, 0, 0.07),
        );
        batches.add(
          finishes.glazingFrame,
          wallBox(
            room,
            side,
            run.from,
            run.to,
            room.height - 0.09,
            room.height,
          ),
        );
      }
    }
    // The wall over each doorway.
    for (const hole of openings[side]) {
      if (glazed) {
        batches.add(
          finishes.glass,
          wallBox(room, side, hole.from, hole.to, DOOR_HEIGHT, room.height),
        );
      } else {
        const windows = WINDOWS.filter(
          (w) => w.room === room.id && w.side === side,
        );
        const patches = cutWindows(
          {
            from: hole.from,
            to: hole.to,
            bottom: DOOR_HEIGHT,
            top: room.height,
          },
          windows,
        );
        for (const patch of patches.solid)
          batches.add(
            wall,
            wallBox(room, side, patch.from, patch.to, patch.bottom, patch.top),
          );
        for (const patch of patches.glass)
          batches.add(
            finishes.glass,
            wallBox(room, side, patch.from, patch.to, patch.bottom, patch.top),
          );
      }
    }
  }
  if (room.zone === 'service' && sx > 2) {
    // A high cable tray, as in Encabulator's underground service corridor.
    // Downstairs it stops either side of the stair, clear of its headroom.
    const runs: { from: number; to: number }[] = [];
    let from = room.minX + 0.3;
    if (room.id === 'lower-corridor')
      for (const stair of STAIRS) {
        runs.push({ from, to: stair.minX - 0.3 });
        from = stair.maxX + 0.3;
      }
    runs.push({ from, to: room.maxX - 0.3 });
    for (const { from, to } of runs) {
      const mid = (from + to) / 2;
      batches.add(
        finishes.cableTray,
        box(to - from, 0.06, 0.28, mid, room.height - 0.35, room.minZ + 0.42),
      );
      batches.add(
        finishes.cableTray,
        box(to - from, 0.12, 0.025, mid, room.height - 0.27, room.minZ + 0.28),
      );
    }
  }
  const card = createTitleCard(room, textures);
  card.position.x -= cx;
  card.position.z -= cz;
  model.add(card);
  if (room.id === 'hall') {
    addLadder(model, BASINS[0], cx, cz, finishes.steel);
    addLadder(model, BASINS[1], cx, cz, finishes.steel);
  }
  if (room.id === 'changing') addChangingFurniture(batches, finishes);
  if (room.id === 'reception') addReceptionFurniture(batches, finishes);
  addCeilingFixtures(batches, room, finishes);
  addRoomLighting(model, room, cx, cz);
  for (const mesh of batches.meshes()) {
    mesh.geometry.translate(-cx, 0, -cz);
    model.add(mesh);
  }
  model.position.set(cx, room.floorY ?? 0, cz);
  return model;
}

/** Build one room at a time. Only current and adjacent rooms need models. */
export function createFacility(rooms: readonly RoomPlan[] = ROOMS) {
  const group = new Group();
  group.name = 'facility';
  const sharedTextures: Texture[] = [];
  const finishes = createFinishes(sharedTextures);
  const materials = new Set<Material>([
    ...Object.values(finishes.floor),
    ...Object.values(finishes.wall),
    ...Object.values(finishes.ceiling),
    finishes.basin,
    finishes.coping,
    finishes.grating,
    finishes.gully,
    finishes.gullySlat,
    finishes.lane,
    finishes.steel,
    finishes.lightFrame,
    finishes.lightLens,
    finishes.glass,
    finishes.glazingFrame,
    finishes.roofGlass,
    finishes.poolBand,
    finishes.cubicle,
    finishes.cubicleAlt,
    finishes.locker,
    finishes.lockerAlt,
    finishes.bench,
    finishes.mirror,
    finishes.plywood,
    finishes.plywoodEdge,
    finishes.upholstery,
    finishes.vending,
    finishes.vendingDisplay,
    finishes.skirting,
    finishes.cableTray,
    ...Object.values(finishes.accents),
  ]);
  const models = new Map<string, { group: Group; textures: Texture[] }>();
  function unload(id: string) {
    const model = models.get(id);
    if (!model) return;
    group.remove(model.group);
    model.group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      (object.geometry as BufferGeometry).dispose();
      if (object.name.startsWith('title-card:'))
        (object.material as Material).dispose();
    });
    for (const texture of model.textures) texture.dispose();
    models.delete(id);
  }
  return {
    group,
    loaded: () => [...models.keys()],
    /** Keep exactly these connected room components in the scene. */
    show(ids: ReadonlySet<string>) {
      for (const id of models.keys()) if (!ids.has(id)) unload(id);
      for (const room of rooms) {
        if (!ids.has(room.id) || models.has(room.id)) continue;
        const textures: Texture[] = [];
        const roomGroup = createRoomModel(room, finishes, textures);
        group.add(roomGroup);
        models.set(room.id, { group: roomGroup, textures });
      }
    },
    dispose() {
      for (const id of models.keys()) unload(id);
      for (const m of materials) m.dispose();
      for (const t of sharedTextures) t.dispose();
    },
  };
}

/** The openings in the ground floor over the stairs, plan metres. */
const STAIR_OPENINGS = STAIRS.map((stair) => ({
  minX: stair.minX,
  maxX: stair.maxX,
  minZ: -4,
  maxZ: stair.maxZ,
}));

/**
 * The stair between the service corridor and the lower corridor, a
 * separate architectural component: a prefabricated galvanised steel
 * straight flight (one of `STAIRS` in `facility-levels.ts`) on two channel
 * stringers, with open grating treads and yellow nosings, a handrail each
 * side, a guard rail round the opening upstairs, and mesh infill closing
 * off the low space under its upper half downstairs. World metres.
 */
export function createServiceStair(stair: Stair) {
  const group = new Group();
  group.name = `service-stair:${stair.id}`;
  const galvanised = new MeshStandardMaterial({
    color: '#a9afae',
    metalness: 0.6,
    roughness: 0.42,
  });
  const grating = new MeshStandardMaterial({
    color: '#7f8584',
    metalness: 0.55,
    roughness: 0.5,
  });
  const nosing = new MeshStandardMaterial({ color: '#e7c22c', roughness: 0.6 });
  const mesh = new MeshStandardMaterial({
    color: '#9aa09f',
    metalness: 0.5,
    roughness: 0.5,
    transparent: true,
    opacity: 0.55,
    side: DoubleSide,
  });
  const run = stair.maxX - stair.minX;
  const pitch = Math.atan2(-LOWER_Y, run);
  /** Height of the pitch line (the nosings) at x. */
  const pitchY = (x: number) => LOWER_Y * ((stair.maxX - x) / run);
  const slope = (
    material: MeshStandardMaterial,
    h: number,
    d: number,
    rise: number,
    z: number,
    from = stair.minX,
    to = stair.maxX,
  ) => {
    const length = (to - from) / Math.cos(pitch);
    const bar = new Mesh(new BoxGeometry(length, h, d), material);
    bar.rotation.z = pitch;
    const x = (from + to) / 2;
    bar.position.set(x, pitchY(x) + rise, z);
    group.add(bar);
    return bar;
  };
  const block = (
    material: MeshStandardMaterial,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const piece = new Mesh(new BoxGeometry(w, h, d), material);
    piece.position.set(x, y, z);
    group.add(piece);
    return piece;
  };
  const width = stair.maxZ - stair.minZ;
  const midZ = (stair.minZ + stair.maxZ) / 2;
  // Two 180 × 75 mm channel stringers, their tops just over the nosings.
  for (const z of [stair.minZ + 0.0375, stair.maxZ - 0.0375])
    slope(galvanised, 0.18, 0.075, 0.02, z);
  // Fifteen grating treads, each with its yellow nosing at its front edge.
  for (let k = 1; k < STAIR_RISERS; k++) {
    const front = stair.minX + (k - 1) * STAIR_GOING;
    const top = LOWER_Y + k * STAIR_RISE;
    block(
      grating,
      STAIR_GOING + 0.02,
      0.03,
      width - 0.15,
      front + STAIR_GOING / 2 - 0.01,
      top - 0.015,
      midZ,
    );
    block(nosing, 0.05, 0.032, width - 0.15, front + 0.015, top - 0.014, midZ);
  }
  // Handrails 0.9 m over the pitch line: a post-and-rail balustrade on the
  // open side, a wall rail on brackets on the other.
  const tube = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    z: number,
    r = 0.021,
  ) => {
    const dx = x1 - x0,
      dy = y1 - y0;
    const bar = new Mesh(
      new CylinderGeometry(r, r, Math.hypot(dx, dy), 12),
      galvanised,
    );
    bar.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    bar.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
    group.add(bar);
  };
  const side = stair.maxZ - 0.0375;
  tube(stair.minX, pitchY(stair.minX) + 0.9, stair.maxX, 0.9, side);
  tube(stair.minX, pitchY(stair.minX) + 0.45, stair.maxX, 0.45, side, 0.0135);
  for (let x = stair.minX + 0.1; x <= stair.maxX; x += run / 3)
    tube(x, pitchY(x) + 0.08, x, pitchY(x) + 0.9, side);
  const wallRail = stair.minZ + 0.07;
  tube(stair.minX, pitchY(stair.minX) + 0.9, stair.maxX, 0.9, wallRail);
  // Each handrail runs on level for 300 mm past the top and the foot.
  const foot = pitchY(stair.minX) + 0.9;
  for (const z of [side, wallRail]) {
    tube(stair.maxX, 0.9, stair.maxX + 0.3, 0.9, z);
    tube(stair.minX - 0.3, foot, stair.minX, foot, z);
  }
  // Upstairs, a 1.1 m guard rail with knee rail and kick plate round the
  // opening's long side and its far end.
  const guardZ = stair.maxZ + 0.04;
  const endX = stair.minX - 0.04;
  for (const y of [1.1, 0.55]) {
    tube(endX, y, stair.maxX, y, guardZ);
    const across = new Mesh(
      new CylinderGeometry(0.021, 0.021, guardZ - stair.minZ, 12),
      galvanised,
    );
    across.rotation.x = Math.PI / 2;
    across.position.set(endX, y, (guardZ + stair.minZ) / 2);
    group.add(across);
  }
  for (let x = endX; x <= stair.maxX + 0.01; x += run / 3)
    tube(x, 0, x, 1.1, guardZ);
  block(
    galvanised,
    run + 0.08,
    0.1,
    0.006,
    (endX + stair.maxX) / 2,
    0.05,
    guardZ,
  );
  block(
    galvanised,
    0.006,
    0.1,
    guardZ - stair.minZ,
    endX,
    0.05,
    (guardZ + stair.minZ) / 2,
  );
  // Downstairs, mesh infill closing off the space under the upper half.
  const half = (stair.minX + stair.maxX) / 2;
  const infill = new Shape();
  infill.moveTo(half, LOWER_Y);
  infill.lineTo(stair.maxX, LOWER_Y);
  infill.lineTo(stair.maxX, -0.2);
  infill.lineTo(half, pitchY(half) - 0.2);
  infill.closePath();
  const panel = new Mesh(new ShapeGeometry(infill), mesh);
  panel.position.z = stair.maxZ;
  group.add(panel);
  return {
    group,
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of [galvanised, grating, nosing, mesh]) m.dispose();
    },
  };
}
