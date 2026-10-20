import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type {
  BufferGeometry,
  Material,
  MeshStandardMaterialParameters,
  Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CONCOURSE,
  COURT,
  ENTRANCE,
  MALL_NAME,
  PASSAGE,
  POOL_SIGN,
  SECTION,
  SERVICE_BAYS,
  UNITS,
  dimming,
} from '../game/mall-plan';
import type { ShopUnit } from '../game/mall-plan';

/**
 * The shopping-mall concourse outside the reception glazing: a long,
 * empty, evenly lit concourse with a barrel-vault rooflight, shuttered and
 * dark shop units, plastic planters, benches, a dry fountain and an
 * escalator up to a bridge in the distance, fading into dimness towards
 * both ends. It is scenery: static, merged into one mesh per material and
 * lit only by the scene's sky light and environment, with a few emissive
 * panels near the pool entrance.
 */

type Fade = (x: number, y: number, z: number) => number;
const byConcourse: Fade = (_x, _y, z) => dimming(z);

function canvasTexture(
  width: number,
  height: number,
  draw: (c: CanvasRenderingContext2D) => void,
  metresAcross = 1,
  metresDown = 1,
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

/** A small deterministic random sequence, so the textures never change. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Large-format polished terrazzo, one 1.2 m slab per texture repeat. */
function terrazzoTexture() {
  return canvasTexture(
    512,
    512,
    (c) => {
      c.fillStyle = '#d8d1c3';
      c.fillRect(0, 0, 512, 512);
      const random = seeded(7);
      const chips = ['#9b9488', '#efeae0', '#6f6a62', '#b08f72', '#c7c0b2'];
      for (let i = 0; i < 2600; i++) {
        c.fillStyle = chips[Math.floor(random() * chips.length)];
        const r = 0.6 + random() * 2.2;
        c.beginPath();
        c.arc(random() * 512, random() * 512, r, 0, Math.PI * 2);
        c.fill();
      }
      // The joint between slabs.
      c.fillStyle = '#a69f92';
      c.fillRect(0, 0, 512, 3);
      c.fillRect(0, 0, 3, 512);
    },
    1.2,
    1.2,
  );
}

/** Lay-in ceiling tiles, 600 mm square. */
function ceilingTexture() {
  return canvasTexture(
    128,
    128,
    (c) => {
      c.fillStyle = '#e7e4dc';
      c.fillRect(0, 0, 128, 128);
      c.fillStyle = '#c4c0b6';
      c.fillRect(0, 0, 128, 3);
      c.fillRect(0, 0, 3, 128);
    },
    0.6,
    0.6,
  );
}

/** Galvanised roller-shutter slats, 100 mm deep. */
function shutterTexture() {
  return canvasTexture(64, 256, (c) => {
    for (let i = 0; i < 10; i++) {
      const g = c.createLinearGradient(0, i * 25.6, 0, (i + 1) * 25.6);
      g.addColorStop(0, '#a9adab');
      g.addColorStop(0.55, '#8d9290');
      g.addColorStop(1, '#5d6260');
      c.fillStyle = g;
      c.fillRect(0, i * 25.6, 64, 25.6);
    }
  });
}

/** Two signs to a row of the atlas: shop fascias and the passage sign. */
const SIGN_COLUMNS = 2;
const SIGN_W = 1024;
const SIGN_H = 128;
const FASCIA_STYLES = [
  ['#1d2b3a', '#f2efe6'],
  ['#f1ede4', '#3b3b3b'],
  ['#7a2430', '#f6e9d8'],
  ['#20453b', '#efe8d0'],
  ['#e8dfc9', '#6b4a2b'],
  ['#2b2b2b', '#d8c27a'],
] as const;

function fitText(c: CanvasRenderingContext2D, text: string, size: number) {
  let px = size;
  do {
    c.font = `600 ${px}px "Helvetica Neue", Arial, sans-serif`;
    px -= 2;
  } while (c.measureText(text).width > SIGN_W - 110 && px > 20);
}

/** Every fascia sign, drawn once into one texture. */
function signAtlas(signs: readonly { name: string; toLet: boolean }[]) {
  const rows = Math.ceil(signs.length / SIGN_COLUMNS);
  const texture = canvasTexture(SIGN_W * SIGN_COLUMNS, SIGN_H * rows, (c) => {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    signs.forEach((sign, i) => {
      const x = (i % SIGN_COLUMNS) * SIGN_W;
      const y = Math.floor(i / SIGN_COLUMNS) * SIGN_H;
      const [ground, ink] = sign.toLet
        ? (['#f4f3ef', '#b3262d'] as const)
        : FASCIA_STYLES[i % FASCIA_STYLES.length];
      c.fillStyle = ground;
      c.fillRect(x, y, SIGN_W, SIGN_H);
      const mid = x + SIGN_W / 2;
      if (sign.toLet) {
        fitText(c, 'TO LET', 64);
        c.fillStyle = ink;
        c.fillText('TO LET', mid, y + 50);
        c.font = '400 26px "Helvetica Neue", Arial, sans-serif';
        c.fillStyle = '#4a4a4a';
        c.fillText(
          'Retail unit available  ·  Centre Management  01632 960418',
          mid,
          y + 100,
        );
        return;
      }
      const text = sign.name.toUpperCase();
      fitText(c, text, 76);
      // On some signs a letter has fallen off, leaving its weathered ghost.
      const lost = i % 4 === 2 ? text.search(/[A-Z](?=[A-Z])/) + 1 : -1;
      if (lost > 0) {
        c.fillStyle = ground === '#2b2b2b' ? '#3a3a36' : '#00000022';
        c.fillText(text, mid, y + SIGN_H / 2);
        c.fillStyle = ink;
        const kept = `${text.slice(0, lost)} ${text.slice(lost + 1)}`;
        c.fillText(kept, mid, y + SIGN_H / 2);
      } else {
        c.fillStyle = ink;
        c.fillText(text, mid, y + SIGN_H / 2);
      }
    });
  });
  texture.repeat.set(1, 1);
  return {
    texture,
    /** UV rectangle [u0, v0, u1, v1] of sign `i`. */
    cell(i: number) {
      const col = i % SIGN_COLUMNS;
      const row = Math.floor(i / SIGN_COLUMNS);
      return [
        col / SIGN_COLUMNS,
        1 - (row + 1) / rows,
        (col + 1) / SIGN_COLUMNS,
        1 - row / rows,
      ] as const;
    },
  };
}

function poolSignTexture() {
  const texture = canvasTexture(2048, 160, (c) => {
    c.fillStyle = '#16454f';
    c.fillRect(0, 0, 2048, 160);
    // Three waves for the leisure pool's mark.
    c.strokeStyle = '#7fd6e0';
    c.lineWidth = 9;
    for (let row = 0; row < 3; row++) {
      c.beginPath();
      for (let x = 0; x <= 110; x += 4) {
        const y = 48 + row * 32 + Math.sin((x / 110) * Math.PI * 2) * 9;
        if (x === 0) c.moveTo(60 + x, y);
        else c.lineTo(60 + x, y);
      }
      c.stroke();
    }
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillStyle = '#f4fbfb';
    c.font = '700 92px "Helvetica Neue", Arial, sans-serif';
    c.fillText(POOL_SIGN.title.toUpperCase(), 220, 66);
    c.fillStyle = '#a9e4ea';
    c.font = '400 38px "Helvetica Neue", Arial, sans-serif';
    c.fillText(POOL_SIGN.subtitle, 224, 128);
  });
  texture.repeat.set(1, 1);
  return texture;
}

/** The notice on the locked entrance and on the A-board outside it. */
function noticeTexture() {
  const texture = canvasTexture(512, 360, (c) => {
    c.fillStyle = '#f7f6f1';
    c.fillRect(0, 0, 512, 360);
    c.fillStyle = '#b3262d';
    c.fillRect(0, 0, 512, 92);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#ffffff';
    c.font = '700 54px "Helvetica Neue", Arial, sans-serif';
    c.fillText('NO ACCESS', 256, 48);
    c.fillStyle = '#262626';
    c.font = '600 34px "Helvetica Neue", Arial, sans-serif';
    c.fillText('Shopping centre', 256, 150);
    c.fillText('closed to pool users', 256, 194);
    c.font = '400 24px "Helvetica Neue", Arial, sans-serif';
    c.fillStyle = '#555555';
    c.fillText('Please do not prop these doors open.', 256, 260);
    c.fillText('— Centre Management', 256, 310);
  });
  texture.repeat.set(1, 1);
  return texture;
}

/** The mall plan on its directory board: units, the pool and "you are here". */
function directoryTexture() {
  const texture = canvasTexture(1024, 640, (c) => {
    c.fillStyle = '#20313a';
    c.fillRect(0, 0, 1024, 640);
    c.fillStyle = '#f2f0ea';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = '700 46px "Helvetica Neue", Arial, sans-serif';
    c.fillText(MALL_NAME, 40, 52);
    c.font = '400 26px "Helvetica Neue", Arial, sans-serif';
    c.fillStyle = '#b8c4c8';
    c.fillText('Centre directory  ·  Lower mall', 42, 98);
    // Plan z runs left to right, plan x top to bottom.
    const u = (z: number) => 40 + ((z - CONCOURSE.minZ) / 170) * 944;
    const v = (x: number) => 150 + ((x - 92) / 50) * 440;
    c.fillStyle = '#d9d4c6';
    c.fillRect(
      u(CONCOURSE.minZ),
      v(CONCOURSE.minX),
      u(CONCOURSE.maxZ) - u(CONCOURSE.minZ),
      v(CONCOURSE.maxX) - v(CONCOURSE.minX),
    );
    c.fillRect(
      u(COURT.minZ),
      v(COURT.minX),
      u(COURT.maxZ) - u(COURT.minZ),
      v(COURT.maxX) - v(COURT.minX),
    );
    const colours = ['#c98f4f', '#7aa37c', '#8a7fb4', '#c46a6a', '#6f9fb8'];
    UNITS.forEach((unit, i) => {
      c.fillStyle = unit.state === 'to-let' ? '#6b7478' : colours[i % 5];
      if (unit.frontage === 'court')
        c.fillRect(
          u(55),
          v(unit.from) + 2,
          u(60) - u(55),
          v(unit.to) - v(unit.from) - 4,
        );
      else {
        const x0 = unit.frontage === 'west' ? 107 : 136;
        c.fillRect(
          u(unit.from) + 2,
          v(x0),
          u(unit.to) - u(unit.from) - 4,
          v(x0 + 5) - v(x0),
        );
      }
    });
    c.fillStyle = '#2b8fa0';
    c.fillRect(u(15), v(94), u(35) - u(15), v(112) - v(94));
    c.fillStyle = '#ffffff';
    c.font = '600 22px "Helvetica Neue", Arial, sans-serif';
    c.fillText('Leisure Pool', u(15) + 8, v(103));
    c.fillStyle = '#d23a2f';
    c.beginPath();
    c.arc(u(43), v(98), 11, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f2f0ea';
    c.font = '600 24px "Helvetica Neue", Arial, sans-serif';
    c.fillText('You are here', u(43) + 18, v(98));
  });
  texture.repeat.set(1, 1);
  return texture;
}

/** Collected geometry, merged into one mesh per material at the end. */
function createBatches() {
  const parts = new Map<Material, BufferGeometry[]>();
  return {
    /**
     * Add a piece already placed in world coordinates. Unless `keepUv`,
     * its texture coordinates are replaced by world metres, box-mapped by
     * face, so tiles run on across pieces. Vertex colours carry the fade.
     */
    add(
      material: Material,
      geometry: BufferGeometry,
      fade: Fade = byConcourse,
      keepUv = false,
    ) {
      const g = geometry.index ? geometry.toNonIndexed() : geometry;
      const position = g.getAttribute('position');
      const normal = g.getAttribute('normal');
      const uv = g.getAttribute('uv');
      const colours: number[] = [];
      for (let i = 0; i < position.count; i++) {
        const px = position.getX(i),
          py = position.getY(i),
          pz = position.getZ(i);
        if (!keepUv) {
          const nx = Math.abs(normal.getX(i)),
            ny = Math.abs(normal.getY(i)),
            nz = Math.abs(normal.getZ(i));
          if (ny >= nx && ny >= nz) uv.setXY(i, px, pz);
          else if (nx >= nz) uv.setXY(i, pz, py);
          else uv.setXY(i, px, py);
        }
        const f = fade(px, py, pz);
        colours.push(f, f, f);
      }
      g.setAttribute('color', new Float32BufferAttribute(colours, 3));
      const list = parts.get(material) ?? [];
      list.push(g);
      parts.set(material, list);
    },
    build(group: Group) {
      for (const [material, list] of parts) {
        const merged = mergeGeometries(list);
        for (const g of list) g.dispose();
        if (!merged) continue;
        const mesh = new Mesh(merged, material);
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
      }
    },
  };
}

/** An axis-aligned box from its extents, in world metres. */
function span(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
) {
  const g = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** Long runs are cut into short bays so the fade varies along them. */
function bays(from: number, to: number, step = 5) {
  const result: [number, number][] = [];
  for (let at = from; at < to - 1e-6; at += step)
    result.push([at, Math.min(to, at + step)]);
  return result;
}

/**
 * A box against a shop frontage: `from`–`to` along it, `out0`–`out1`
 * measured from the frontage line out into the concourse or court.
 */
function frontBox(
  frontage: ShopUnit['frontage'],
  from: number,
  to: number,
  out0: number,
  out1: number,
  y0: number,
  y1: number,
) {
  switch (frontage) {
    case 'west':
      return span(
        CONCOURSE.minX + out0,
        CONCOURSE.minX + out1,
        y0,
        y1,
        from,
        to,
      );
    case 'east':
      return span(
        CONCOURSE.maxX - out1,
        CONCOURSE.maxX - out0,
        y0,
        y1,
        from,
        to,
      );
    case 'court':
      return span(from, to, y0, y1, COURT.maxZ - out1, COURT.maxZ - out0);
  }
}

/** A flat sign facing out from a frontage, with its own texture cell. */
function frontSign(
  frontage: ShopUnit['frontage'],
  from: number,
  to: number,
  out: number,
  y0: number,
  y1: number,
  cell: readonly [number, number, number, number],
) {
  const g = new PlaneGeometry(to - from, y1 - y0);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      cell[0] + uv.getX(i) * (cell[2] - cell[0]),
      cell[1] + uv.getY(i) * (cell[3] - cell[1]),
    );
  const mid = (from + to) / 2;
  const y = (y0 + y1) / 2;
  if (frontage === 'west') {
    // Along the west frontage z increases to the viewer's left.
    g.rotateY(Math.PI / 2);
    g.translate(CONCOURSE.minX + out, y, mid);
  } else if (frontage === 'east') {
    g.rotateY(-Math.PI / 2);
    g.translate(CONCOURSE.maxX - out, y, mid);
  } else {
    g.rotateY(Math.PI);
    g.translate(mid, y, COURT.maxZ - out);
  }
  return g;
}

/** A plane facing one axis direction, for notices and boards. */
function facingPlane(
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
) {
  const g = new PlaneGeometry(w, h);
  g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

export function createMallConcourse() {
  const group = new Group();
  group.name = 'mall-concourse';
  const textures: Texture[] = [];
  const keep = <T extends Texture>(t: T) => (textures.push(t), t);
  const lit = (
    color: string,
    roughness = 0.85,
    extra: MeshStandardMaterialParameters = {},
  ) =>
    new MeshStandardMaterial({
      color,
      roughness,
      vertexColors: true,
      ...extra,
    });

  const signs = [
    ...UNITS.map((u) => ({ name: u.name, toLet: u.state === 'to-let' })),
    { name: 'Toilets  ·  Car Park  ·  Lifts', toLet: false },
  ];
  const atlas = signAtlas(signs);
  keep(atlas.texture);
  const poolSign = keep(poolSignTexture());
  const notice = keep(noticeTexture());
  const directory = keep(directoryTexture());

  const m = {
    floor: new MeshPhysicalMaterial({
      map: keep(terrazzoTexture()),
      roughness: 0.2,
      clearcoat: 0.55,
      clearcoatRoughness: 0.12,
      vertexColors: true,
    }),
    ceiling: lit('#ffffff', 0.92, { map: keep(ceilingTexture()) }),
    plaster: lit('#e6e2d8', 0.9),
    cladding: lit('#cfc6b4', 0.7),
    fascia: lit('#bdb5a5', 0.75),
    poolFascia: lit('#1d4f59', 0.6),
    shutter: lit('#ffffff', 0.55, {
      map: keep(shutterTexture()),
      metalness: 0.35,
    }),
    shutterBox: lit('#7b807e', 0.5, { metalness: 0.4 }),
    darkGlass: lit('#0b1012', 0.08, { metalness: 0.3 }),
    whitewash: lit('#d7d8d2', 0.95),
    frame: lit('#6f7a7c', 0.4, { metalness: 0.55 }),
    signs: lit('#ffffff', 0.6, { map: atlas.texture }),
    poolSign: lit('#ffffff', 0.5, {
      map: poolSign,
      emissive: '#ffffff',
      emissiveMap: poolSign,
      emissiveIntensity: 0.85,
    }),
    notice: lit('#ffffff', 0.6, { map: notice, side: DoubleSide }),
    directory: lit('#ffffff', 0.4, {
      map: directory,
      emissive: '#ffffff',
      emissiveMap: directory,
      emissiveIntensity: 0.55,
    }),
    vaultGlass: new MeshStandardMaterial({
      color: '#dfe8ea',
      roughness: 0.85,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: DoubleSide,
    }),
    lightOn: lit('#f4f2ea', 0.5, {
      emissive: '#f1efe4',
      emissiveIntensity: 1.1,
    }),
    lightOff: lit('#b9b8b2', 0.5),
    planter: lit('#a49e92', 0.8),
    soil: lit('#2e2822', 1),
    plant: lit('#557650', 0.45),
    wood: lit('#9b7653', 0.6),
    chrome: lit('#c4c9ca', 0.25, { metalness: 0.8 }),
    bin: lit('#3f474a', 0.5, { metalness: 0.3 }),
    stone: lit('#cdc6b6', 0.7),
    basin: lit('#7f9c9d', 0.65),
    belt: lit('#8c1f24', 0.6),
    mat: lit('#3b3d3c', 1),
    rubber: lit('#1c1d1e', 0.6),
    endWall: lit('#3b3e3e', 0.95),
    passage: lit('#8e9190', 0.9, { side: BackSide }),
    backOfHouse: lit('#a3a69f', 0.95, { side: BackSide }),
  };
  const b = createBatches();
  const C = CONCOURSE;
  const vault0 = (C.minX + C.maxX) / 2 - SECTION.vaultWidth / 2;
  const vault1 = vault0 + SECTION.vaultWidth;

  // Floors, soffits and the vault upstands, bay by bay so the light fades.
  for (const [z0, z1] of bays(C.minZ, C.maxZ)) {
    b.add(m.floor, span(C.minX, C.maxX, -0.1, 0, z0, z1));
    b.add(
      m.ceiling,
      span(C.minX, vault0, SECTION.soffit, SECTION.soffit + 0.1, z0, z1),
    );
    b.add(
      m.ceiling,
      span(vault1, C.maxX, SECTION.soffit, SECTION.soffit + 0.1, z0, z1),
    );
    for (const x of [vault0, vault1])
      b.add(
        m.plaster,
        span(x - 0.1, x + 0.1, SECTION.soffit, SECTION.spring, z0, z1),
      );
  }
  b.add(m.floor, span(COURT.minX, COURT.maxX, -0.1, 0, COURT.minZ, COURT.maxZ));
  b.add(
    m.ceiling,
    span(
      COURT.minX,
      COURT.maxX,
      SECTION.soffit,
      SECTION.soffit + 0.1,
      COURT.minZ,
      COURT.maxZ,
    ),
  );
  b.add(
    m.plaster,
    span(
      COURT.minX,
      COURT.minX + 0.3,
      0,
      SECTION.soffit,
      COURT.minZ,
      COURT.maxZ,
    ),
  );
  // Dim end walls close the concourse.
  for (const z of [C.minZ - 0.2, C.maxZ])
    b.add(m.endWall, span(C.minX, C.maxX, 0, SECTION.crown + 0.3, z, z + 0.2));

  // The barrel-vault rooflight: glazed facets on ribs every five metres.
  const facets = 12;
  const arc = (t: number) => {
    const angle = Math.PI * (1 - t);
    return {
      x: (vault0 + vault1) / 2 + (SECTION.vaultWidth / 2) * Math.cos(angle),
      y: SECTION.spring + (SECTION.crown - SECTION.spring) * Math.sin(angle),
    };
  };
  for (let i = 0; i < facets; i++) {
    const p = arc(i / facets);
    const q = arc((i + 1) / facets);
    const length = Math.hypot(q.x - p.x, q.y - p.y);
    const tilt = Math.atan2(q.y - p.y, q.x - p.x);
    const glass = new BoxGeometry(length, 0.03, C.maxZ - C.minZ);
    glass.rotateZ(tilt);
    glass.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (C.minZ + C.maxZ) / 2);
    b.add(m.vaultGlass, glass);
    for (let z = C.minZ; z <= C.maxZ; z += 5) {
      const rib = new BoxGeometry(length + 0.02, 0.14, 0.08);
      rib.rotateZ(tilt);
      rib.translate((p.x + q.x) / 2, (p.y + q.y) / 2 - 0.05, z);
      b.add(m.frame, rib);
    }
  }

  // Shop units: pilasters, fascia, sign and a shutter, dark glass or
  // whitewashed glass below.
  UNITS.forEach((unit, i) => {
    const f = unit.frontage;
    const { from, to } = unit;
    b.add(
      m.cladding,
      frontBox(f, from, from + 0.25, -0.4, 0.2, 0, SECTION.soffit),
    );
    b.add(m.cladding, frontBox(f, to - 0.25, to, -0.4, 0.2, 0, SECTION.soffit));
    b.add(
      m.fascia,
      frontBox(
        f,
        from + 0.25,
        to - 0.25,
        -0.35,
        0.1,
        SECTION.front,
        SECTION.soffit,
      ),
    );
    b.add(
      m.signs,
      frontSign(f, from + 0.7, to - 0.7, 0.11, 4.6, 5.45, atlas.cell(i)),
      byConcourse,
      true,
    );
    const inner0 = from + 0.25;
    const inner1 = to - 0.25;
    if (unit.state === 'shuttered') {
      b.add(
        m.shutter,
        frontBox(f, inner0, inner1, -0.36, -0.3, 0, SECTION.front - 0.35),
      );
      b.add(
        m.shutterBox,
        frontBox(
          f,
          inner0,
          inner1,
          -0.35,
          -0.05,
          SECTION.front - 0.35,
          SECTION.front,
        ),
      );
      b.add(m.frame, frontBox(f, inner0, inner1, -0.36, -0.26, 0, 0.06));
    } else {
      b.add(
        unit.state === 'dark' ? m.darkGlass : m.whitewash,
        frontBox(f, inner0, inner1, -0.32, -0.3, 0, SECTION.front),
      );
      const panes = Math.max(2, Math.round((inner1 - inner0) / 2));
      for (let p = 0; p <= panes; p++) {
        const at = inner0 + ((inner1 - inner0) * p) / panes;
        b.add(
          m.frame,
          frontBox(f, at - 0.04, at + 0.04, -0.34, -0.26, 0, SECTION.front),
        );
      }
      for (const y of [0, SECTION.front - 0.08])
        b.add(m.frame, frontBox(f, inner0, inner1, -0.34, -0.26, y, y + 0.08));
    }
  });

  // The passage opposite the pool, signed for toilets and the car park,
  // running off into the dark.
  const passageFade: Fade = (x) =>
    1 - 0.9 * Math.min(1, (x - C.maxX) / PASSAGE.depth);
  b.add(
    m.passage,
    span(
      C.maxX,
      C.maxX + PASSAGE.depth,
      -0.001,
      3.2,
      PASSAGE.from + 1,
      PASSAGE.to - 1,
    ),
    passageFade,
  );
  b.add(
    m.cladding,
    frontBox(
      'east',
      PASSAGE.from,
      PASSAGE.from + 1,
      -0.4,
      0.2,
      0,
      SECTION.soffit,
    ),
  );
  b.add(
    m.cladding,
    frontBox('east', PASSAGE.to - 1, PASSAGE.to, -0.4, 0.2, 0, SECTION.soffit),
  );
  b.add(
    m.fascia,
    frontBox(
      'east',
      PASSAGE.from + 1,
      PASSAGE.to - 1,
      -0.35,
      0.1,
      3.2,
      SECTION.soffit,
    ),
  );
  b.add(
    m.signs,
    frontSign(
      'east',
      PASSAGE.from + 1.6,
      PASSAGE.to - 1.6,
      0.11,
      4.2,
      5.0,
      atlas.cell(UNITS.length),
    ),
    byConcourse,
    true,
  );

  // The leisure centre's own frontage: a pier, a fascia over the glazing
  // and its lit sign, one face to the concourse and one to the court.
  const reception = { minZ: 15, maxZ: 35 };
  b.add(
    m.cladding,
    frontBox('west', 13, reception.minZ, -0.3, 0.2, 0, SECTION.front),
  );
  b.add(
    m.poolFascia,
    span(
      C.minX,
      C.minX + 0.35,
      SECTION.front,
      SECTION.soffit,
      13,
      COURT.minZ + 0.35,
    ),
  );
  b.add(
    m.poolFascia,
    span(
      COURT.minX,
      C.minX,
      SECTION.front,
      SECTION.soffit,
      COURT.minZ,
      COURT.minZ + 0.35,
    ),
  );
  b.add(
    m.poolSign,
    facingPlane(
      18.6,
      1.45,
      C.minX + 0.36,
      5,
      (reception.minZ + reception.maxZ) / 2,
      Math.PI / 2,
    ),
    byConcourse,
    true,
  );
  b.add(
    m.poolSign,
    facingPlane(
      13.5,
      1.05,
      (COURT.minX + COURT.maxX) / 2,
      5,
      COURT.minZ + 0.36,
      0,
    ),
    byConcourse,
    true,
  );

  // Recessed lights: on near the pool entrance, dead further away.
  for (let z = C.minZ + 2.5; z < C.maxZ; z += 5)
    for (const x of [C.minX + 3, C.maxX - 3]) {
      const on = Math.abs(z - ENTRANCE.z) < 40;
      b.add(
        on ? m.lightOn : m.lightOff,
        span(
          x - 0.3,
          x + 0.3,
          SECTION.soffit - 0.02,
          SECTION.soffit,
          z - 0.3,
          z + 0.3,
        ),
      );
    }
  for (let x = COURT.minX + 4; x < COURT.maxX; x += 4)
    for (let z = COURT.minZ + 5; z < COURT.maxZ; z += 5)
      b.add(
        m.lightOn,
        span(
          x - 0.3,
          x + 0.3,
          SECTION.soffit - 0.02,
          SECTION.soffit,
          z - 0.3,
          z + 0.3,
        ),
      );

  // Directory board on the court's west wall.
  b.add(
    m.frame,
    span(COURT.minX + 0.3, COURT.minX + 0.38, 0.75, 2.85, 40.9, 45.1),
  );
  b.add(
    m.directory,
    facingPlane(4, 2, COURT.minX + 0.39, 1.8, 43, Math.PI / 2),
    byConcourse,
    true,
  );

  // The locked entrance: a mat, a belt barrier and an A-board outside,
  // and a notice on the inside of the doors.
  const ex = ENTRANCE.x;
  const ez = ENTRANCE.z;
  b.add(m.mat, span(ex + 0.05, ex + 2.6, 0, 0.012, ez - 2.5, ez + 2.5));
  const posts = [ez - 2.4, ez - 0.8, ez + 0.8, ez + 2.4];
  for (const z of posts) {
    const base = new CylinderGeometry(0.17, 0.17, 0.03, 16);
    base.translate(ex + 0.9, 0.015, z);
    b.add(m.chrome, base);
    const post = new CylinderGeometry(0.03, 0.03, 0.95, 10);
    post.translate(ex + 0.9, 0.49, z);
    b.add(m.chrome, post);
  }
  for (let k = 0; k < posts.length - 1; k++)
    b.add(
      m.belt,
      span(ex + 0.89, ex + 0.91, 0.86, 0.92, posts[k], posts[k + 1]),
    );
  for (const side of [-1, 1]) {
    const board = new BoxGeometry(0.03, 0.9, 0.6);
    board.rotateZ(side * 0.2);
    board.translate(ex + 1.8 + side * 0.1, 0.45, ez + 1.3);
    b.add(m.frame, board);
    const face = new PlaneGeometry(0.52, 0.37);
    face.rotateY((side * Math.PI) / 2);
    face.rotateZ(side * 0.2);
    face.translate(ex + 1.8 + side * 0.12 + side * 0.01, 0.55, ez + 1.3);
    b.add(m.notice, face, byConcourse, true);
  }
  b.add(
    m.notice,
    facingPlane(0.6, 0.42, ex - 0.07, 1.45, ez, -Math.PI / 2),
    byConcourse,
    true,
  );

  // Planters of plastic plants, with benches and bins, down the middle.
  const mid = (C.minX + C.maxX) / 2;
  const random = seeded(31);
  for (const z of [-18, 2, 50, 96]) {
    b.add(m.planter, span(mid - 1.6, mid + 1.6, 0, 0.6, z - 0.75, z + 0.75));
    b.add(m.soil, span(mid - 1.5, mid + 1.5, 0.6, 0.62, z - 0.65, z + 0.65));
    for (let p = 0; p < 6; p++) {
      const px = mid - 1.2 + random() * 2.4;
      const pz = z - 0.4 + random() * 0.8;
      const h = 0.9 + random() * 0.9;
      const frond = new CylinderGeometry(0, 0.32, h, 6);
      frond.translate(px, 0.62 + h / 2, pz);
      b.add(m.plant, frond);
      const bush = new IcosahedronGeometry(0.32, 0);
      bush.translate(px, 0.75, pz);
      b.add(m.plant, bush);
    }
    for (const side of [-1, 1]) {
      const bx = mid + side * 2.6;
      b.add(m.wood, span(bx - 0.25, bx + 0.25, 0.42, 0.47, z - 0.9, z + 0.9));
      for (const lz of [z - 0.7, z + 0.7])
        b.add(
          m.chrome,
          span(bx - 0.2, bx + 0.2, 0, 0.42, lz - 0.03, lz + 0.03),
        );
    }
    const bin = new CylinderGeometry(0.24, 0.22, 0.9, 14);
    bin.translate(mid + 2.6, 0.45, z + 1.4);
    b.add(m.bin, bin);
  }

  // A dry fountain further along.
  const fz = 72;
  const ring = (r: number, h: number, y: number, mat: Material) => {
    const g = new CylinderGeometry(r, r, h, 40, 1, true);
    g.translate(mid, y + h / 2, fz);
    b.add(mat, g);
  };
  ring(3.5, 0.5, 0, m.stone);
  ring(3.2, 0.5, 0, m.basin);
  const rim = new CylinderGeometry(3.5, 3.5, 0.06, 40);
  rim.translate(mid, 0.5, fz);
  b.add(m.stone, rim);
  const bed = new CircleGeometry(3.2, 40);
  bed.rotateX(-Math.PI / 2);
  bed.translate(mid, 0.53, fz);
  b.add(m.basin, bed);
  for (const [r0, r1, h, y] of [
    [0.6, 0.7, 1.5, 0.53],
    [1.3, 0.3, 0.25, 2.03],
    [0.18, 0.2, 0.8, 2.28],
    [0.65, 0.15, 0.18, 3.08],
  ]) {
    const tier = new CylinderGeometry(r0, r1, h, 24);
    tier.translate(mid, y + h / 2, fz);
    b.add(m.stone, tier);
  }

  // In the distance, a stopped escalator up to a bridge across the vault.
  const bridge = { z0: -46, z1: -42, y: 5.1 };
  b.add(
    m.cladding,
    span(C.minX, C.maxX, bridge.y - 0.5, bridge.y, bridge.z0, bridge.z1),
  );
  for (const z of [bridge.z0, bridge.z1]) {
    b.add(
      m.vaultGlass,
      span(vault0, vault1, bridge.y, bridge.y + 1, z - 0.02, z + 0.02),
    );
    b.add(
      m.chrome,
      span(vault0, vault1, bridge.y + 1, bridge.y + 1.05, z - 0.04, z + 0.04),
    );
  }
  const rise = bridge.y;
  const angle = Math.PI / 6;
  const run = rise / Math.tan(angle);
  const slope = rise / Math.sin(angle);
  const ez0 = bridge.z1 + run;
  for (const x of [mid - 0.9, mid + 0.9]) {
    const body = new BoxGeometry(1.4, 0.9, slope + 1.5);
    body.rotateX(angle);
    body.translate(x, rise / 2 - 0.35, (ez0 + bridge.z1) / 2);
    b.add(m.frame, body);
    for (const side of [-0.68, 0.68]) {
      const glass = new BoxGeometry(0.02, 0.9, slope);
      glass.rotateX(angle);
      glass.translate(x + side, rise / 2 + 0.55, (ez0 + bridge.z1) / 2);
      b.add(m.vaultGlass, glass);
      const rail = new BoxGeometry(0.08, 0.08, slope + 1);
      rail.rotateX(angle);
      rail.translate(x + side, rise / 2 + 1.03, (ez0 + bridge.z1) / 2);
      b.add(m.rubber, rail);
    }
  }

  // Windowless back-of-house bays seen through the low windows. Each is a
  // box drawn from inside, so its near face (on the window) is not drawn.
  for (const bay of SERVICE_BAYS)
    b.add(
      m.backOfHouse,
      span(bay.minX, bay.maxX, 0, bay.height, bay.minZ, bay.maxZ),
      () => 0.75,
    );

  b.build(group);
  const materials = Object.values(m);
  return {
    group,
    dispose() {
      group.traverse((o) => {
        if (o instanceof Mesh) (o.geometry as BufferGeometry).dispose();
      });
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
