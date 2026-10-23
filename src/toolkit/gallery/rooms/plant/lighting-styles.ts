import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
} from 'three';
import type { Material } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { RoomFinish } from '../plant-room';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import {
  createPartSet,
  potentiometer,
  selector,
} from '../../../components/core/parts/parts';
import type { Part } from '../../../components/core/parts/parts';
import { createPs1Material } from '../../../components/core/parts/ps1-material';
import { createBrandBadge } from '../../../components/core/views/brand-badge';
import { METRE } from '../../../components/core/logic/units';
import { createBreezeBlockTextures } from '../../../../scene/breeze-block-texture';
import { createWash } from '../../../components/architectural/views/light-washes';
import {
  dimmerOutput,
  fadeToward,
  twinkle,
  wheelColour,
} from '../../../components/architectural/logic/architectural-lighting';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Architectural lighting, tried out: six booths, each a stretch of wall and ceiling lit one way. A direct/indirect halo panel, cove lighting, wall grazing, a shadow-gap slot, a fibre-optic starlight ceiling and a luminous ceiling, each on its own Lumenhaus dimmer.';

/** Lit by its own fittings: the room's general light only a little fill. */
export const FINISH: RoomFinish = { ownLights: true, wall: '#34383a' };

/** A booth: its width, depth and ceiling height, metres. */
const W = 3.2;
const D = 2.6;
const H = 3.0;
/** The booth's ceiling's underside. */
const CEIL = H - 0.1;
/** Its front piers, where its controls are worked from outside. */
const PIER = 0.16;

/** Each exhibit's own copy: the room places exhibits by their sizes, one each. */
const SIZE = { w: W, d: D, h: H, mount: 'floor' } as const;

/** A light's intensity and reach in the room's units (its parents scale metres up). */
const lamp = (colour: string, intensity: number, reach: number) =>
  new PointLight(colour, intensity * METRE * METRE, reach * METRE, 2);

interface Booth {
  object: Group;
  parts: ReturnType<typeof createPartSet>;
  /** Its dimmer's output, 0 to 1, faded as a lamp follows it. */
  level: () => number;
  /** Step its dimmer's fade. */
  step(delta: number): void;
  /** Paint its ceiling's or back wall's underside. */
  ceiling: Mesh;
  back: Mesh;
}

/**
 * A booth's shell: a back wall, a ceiling, thin side walls and two front
 * piers, open to the front; on its right pier a Lumenhaus dimmer plate,
 * reached from outside, and any other controls given.
 */
function booth(
  kit: PanelKit,
  title: string,
  {
    back,
    ceiling,
    sides,
    controls = [],
    initial = 0.8,
  }: {
    back?: Material;
    ceiling?: Material;
    sides?: Material;
    /** More controls on its pier, under its dimmer: each part and its legend. */
    controls?: { part: Part; text: string }[];
    initial?: number;
  } = {},
): Booth {
  const object = new Group();
  object.name = `${title} booth`;
  const plaster = createPs1Material({ color: '#d6d8d3', roughness: 0.92 });
  kit.materials.push(plaster);
  const add = (
    m: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    object.add(mesh);
    return mesh;
  };
  const backWall = add(back ?? plaster, W, H, 0.1, 0, H / 2, -D / 2 + 0.05);
  const ceil = add(ceiling ?? plaster, W, 0.1, D, 0, H - 0.05, 0);
  for (const s of [-1, 1]) {
    add(sides ?? plaster, 0.06, H, D, s * (W / 2 - 0.03), H / 2, 0);
    add(
      plaster,
      PIER,
      H,
      PIER,
      s * (W / 2 - PIER / 2),
      H / 2,
      D / 2 - PIER / 2,
    );
  }
  // The dimmer plate, on the right pier's front face.
  const parts = createPartSet();
  const plate = new Group();
  plate.position.set(W / 2 - PIER / 2, 1.25, D / 2 + 0.002);
  object.add(plate);
  const face = new Mesh(
    new BoxGeometry(0.14, 0.2 + 0.09 * controls.length, 0.012),
    plaster,
  );
  face.position.set(0, -0.045 * controls.length, 0.006);
  plate.add(face);
  const dimmer = potentiometer(kit, {
    initial,
    steps: 20,
    name: `${title} dimmer`,
  });
  dimmer.object.position.set(0, 0.03, 0.013);
  plate.add(dimmer.object);
  parts.add(dimmer);
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.014 });
  badge.position.set(0, 0.075, 0.013);
  plate.add(badge);
  const mark = (text: string, y: number) => {
    const label = createMicroLabel(kit, text, {
      height: 0.009,
      ink: '#2b2d2b',
      maxWidth: 0.13,
    });
    label.position.set(0, y, 0.013);
    plate.add(label);
  };
  mark('DIMMER', -0.035);
  controls.forEach(({ part, text }, i) => {
    const y = -0.1 - i * 0.09;
    part.object.position.set(0, y, 0.013);
    plate.add(part.object);
    parts.add(part);
    mark(text, y - 0.035);
  });
  // A title over the booth's front.
  const card = createMicroLabel(kit, title.toUpperCase(), {
    height: 0.05,
    ink: '#e9e4d6',
    plate: '#1d2022',
    maxWidth: W - 0.6,
  });
  card.position.set(0, H + 0.08, D / 2 - 0.05);
  object.add(card);
  let level = 0;
  return {
    object,
    parts,
    level: () => level,
    step(delta) {
      level = fadeToward(level, dimmerOutput(dimmer.share.value), delta);
    },
    ceiling: ceil,
    back: backWall,
  };
}

/** A glowing surface: unlit, its colour scaled by its level. */
function glow(kit: PanelKit, colour: string) {
  const base = new Color(colour);
  const material = new MeshBasicMaterial({ color: base.clone() });
  kit.materials.push(material);
  return {
    material,
    set(level: number) {
      // A source seen directly reads bright through most of its range.
      material.color.copy(base).multiplyScalar(0.06 + 0.94 * Math.sqrt(level));
    },
  };
}

/** A mesh that changes as the light does: kept out of the room's still geometry. */
const live = <T extends Mesh | Points>(m: T) => {
  m.userData.live = true;
  return m;
};

// ---- 1. The direct/indirect halo panel (prompt 040) ------------------------

function haloPanel(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Direct/indirect halo panel');
  const frame = createPs1Material({
    color: '#232526',
    roughness: 0.5,
    metalness: 0.3,
  });
  kit.materials.push(frame);
  // Its panel, 1200 × 600, hung 200 mm under the ceiling on four wires.
  const y = CEIL - 0.2;
  const panel = new Group();
  panel.position.set(0, y, -0.1);
  b.object.add(panel);
  panel.add(new Mesh(new BoxGeometry(1.24, 0.05, 0.64), frame));
  const diffuser = glow(kit, '#fff6e6');
  const face = live(new Mesh(new PlaneGeometry(1.18, 0.58), diffuser.material));
  face.rotation.x = Math.PI / 2;
  face.position.y = -0.026;
  panel.add(face);
  const wire = createPs1Material({
    color: '#9a9c9a',
    metalness: 0.6,
    roughness: 0.4,
  });
  kit.materials.push(wire);
  for (const [x, z] of [
    [-0.55, -0.27],
    [0.55, -0.27],
    [-0.55, 0.27],
    [0.55, 0.27],
  ]) {
    const w = new Mesh(new BoxGeometry(0.004, 0.2, 0.004), wire);
    w.position.set(x, 0.12, z);
    panel.add(w);
  }
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.012 });
  badge.position.set(0.5, -0.026, 0.321);
  panel.add(badge);
  // Its halo on the ceiling round it, and its light down into the booth.
  const halo = createWash(kit, 'halo', 2.6, 1.9, '#ffeccc', { inner: 0.46 });
  halo.mesh.rotation.x = Math.PI / 2;
  halo.mesh.position.set(0, CEIL - 0.002, -0.1);
  b.object.add(halo.mesh);
  const down = lamp('#fff2dd', 2.2, 6);
  down.position.set(0, y - 0.3, 0);
  b.object.add(down);
  return {
    object: b.object,
    parts: b.parts,
    update(delta) {
      b.step(delta);
      const l = b.level();
      diffuser.set(l);
      halo.set(l);
      down.intensity = 2.2 * METRE * METRE * l;
    },
  };
}

// ---- 2. Cove lighting ----------------------------------------------------

function cove(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Cove lighting');
  const plaster = createPs1Material({ color: '#d6d8d3', roughness: 0.92 });
  kit.materials.push(plaster);
  // A ledge round the back and the sides, 400 mm under the ceiling, with an
  // upstand hiding its LED strip; the light thrown up the wall and onto the ceiling.
  const ledgeY = CEIL - 0.4;
  const strip = glow(kit, '#ffe2b8');
  const runs: [number, number, number, number][] = [
    // x, z, length, turned (along z)
    [0, -D / 2 + 0.25, W - 0.2, 0],
    [-W / 2 + 0.2, 0.05, D - 0.75, 1],
    [W / 2 - 0.2, 0.05, D - 0.75, 1],
  ];
  for (const [x, z, len, turned] of runs) {
    const g = new Group();
    g.position.set(x, ledgeY, z);
    if (turned) g.rotation.y = Math.PI / 2;
    b.object.add(g);
    g.add(new Mesh(new BoxGeometry(len, 0.04, 0.3), plaster));
    const up = new Mesh(new BoxGeometry(len, 0.12, 0.03), plaster);
    up.position.set(0, 0.06, 0.135 * (turned ? (x < 0 ? -1 : 1) : 1));
    g.add(up);
    const led = live(
      new Mesh(new BoxGeometry(len - 0.05, 0.012, 0.02), strip.material),
    );
    led.position.set(0, 0.03, 0);
    g.add(led);
  }
  // The wash: the ceiling from three edges in, and each wall above its ledge.
  const ceilWash = createWash(kit, 'edges', W - 0.12, D, '#ffdcaa');
  ceilWash.mesh.rotation.x = Math.PI / 2;
  ceilWash.mesh.position.set(0, CEIL - 0.002, 0);
  b.object.add(ceilWash.mesh);
  const walls = [
    { w: W - 0.12, x: 0, z: -D / 2 + 0.102, yaw: 0 },
    { w: D - 0.2, x: -W / 2 + 0.062, z: 0, yaw: Math.PI / 2 },
    { w: D - 0.2, x: W / 2 - 0.062, z: 0, yaw: -Math.PI / 2 },
  ].map((p) => {
    const wash = createWash(kit, 'fall', p.w, 0.4, '#ffdcaa', {
      strength: 0.9,
    });
    wash.mesh.position.set(p.x, CEIL - 0.2, p.z);
    wash.mesh.rotation.y = p.yaw;
    wash.mesh.rotation.z = Math.PI;
    b.object.add(wash.mesh);
    return wash;
  });
  const fill = lamp('#ffe0b4', 0.9, 5);
  fill.position.set(0, CEIL - 0.3, -0.3);
  b.object.add(fill);
  return {
    object: b.object,
    parts: b.parts,
    update(delta) {
      b.step(delta);
      const l = b.level();
      strip.set(l);
      ceilWash.set(l);
      for (const w of walls) w.set(l);
      fill.intensity = 0.9 * METRE * METRE * l;
    },
  };
}

// ---- 3. Wall grazing -------------------------------------------------------

function grazing(kit: PanelKit): LiveExhibit {
  const blocks = createBreezeBlockTextures();
  kit.textures.push(blocks.map, blocks.normalMap, blocks.roughnessMap);
  const blockwork = createPs1Material({
    map: blocks.map,
    normalMap: blocks.normalMap,
    roughnessMap: blocks.roughnessMap,
    roughness: 1,
  });
  kit.materials.push(blockwork);
  const b = booth(kit, 'Wall grazing', { back: blockwork });
  // Four recessed in-ground uplights at the wall's foot, 150 mm out from it,
  // each a stainless trim round a lit lens, raking light up the blocks.
  const trim = createPs1Material({
    color: '#9fa3a3',
    metalness: 0.7,
    roughness: 0.35,
  });
  kit.materials.push(trim);
  const lens = glow(kit, '#fff4dc');
  const xs = [-1.05, -0.35, 0.35, 1.05];
  const scallops = xs.map((x) => {
    const ring = new Mesh(new BoxGeometry(0.16, 0.006, 0.16), trim);
    ring.position.set(x, 0.003, -D / 2 + 0.25);
    b.object.add(ring);
    const l = live(new Mesh(new PlaneGeometry(0.11, 0.11), lens.material));
    l.rotation.x = -Math.PI / 2;
    l.position.set(x, 0.007, -D / 2 + 0.25);
    b.object.add(l);
    const wash = createWash(kit, 'scallop', 0.95, CEIL, '#ffe9c4', {
      strength: 0.85,
    });
    wash.mesh.position.set(x, CEIL / 2, -D / 2 + 0.102);
    b.object.add(wash.mesh);
    return wash;
  });
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.01 });
  badge.rotation.x = -Math.PI / 2;
  badge.position.set(xs[3] + 0.11, 0.008, -D / 2 + 0.25);
  b.object.add(badge);
  // Two lights low against the wall, so its blocks' faces catch it at a raking angle.
  const rakes = [-0.7, 0.7].map((x) => {
    const r = lamp('#ffeccc', 1.3, 3.2);
    r.position.set(x, 0.12, -D / 2 + 0.22);
    b.object.add(r);
    return r;
  });
  return {
    object: b.object,
    parts: b.parts,
    update(delta) {
      b.step(delta);
      const l = b.level();
      lens.set(l);
      for (const s of scallops) s.set(l);
      for (const r of rakes) r.intensity = 1.3 * METRE * METRE * l;
    },
  };
}

// ---- 4. A shadow-gap linear slot --------------------------------------------

function slot(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Shadow-gap slot');
  const reveal = createPs1Material({ color: '#151617', roughness: 0.8 });
  kit.materials.push(reveal);
  const line = glow(kit, '#f2f6ff');
  // One continuous 40 mm slot of light: across the ceiling from front to
  // back, turning down the back wall to the floor; black reveals either side.
  const x = 0.55;
  const ceilLen = D - 0.15;
  const wallLen = CEIL;
  const pieces = [
    { len: ceilLen, pos: [x, CEIL - 0.004, 0.05], rot: [Math.PI / 2, 0, 0] },
    { len: wallLen, pos: [x, wallLen / 2, -D / 2 + 0.104], rot: [0, 0, 0] },
  ] as const;
  for (const p of pieces) {
    const strip = live(new Mesh(new PlaneGeometry(0.04, p.len), line.material));
    strip.position.set(p.pos[0], p.pos[1], p.pos[2]);
    strip.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    b.object.add(strip);
    for (const s of [-1, 1]) {
      const edge = new Mesh(new PlaneGeometry(0.012, p.len), reveal);
      edge.position.set(p.pos[0] + s * 0.026, p.pos[1], p.pos[2]);
      edge.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
      b.object.add(edge);
    }
  }
  const glows = pieces.map((p) => {
    const g = createWash(kit, 'band', 0.7, p.len, '#e8efff', {
      strength: 0.55,
    });
    g.mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
    g.mesh.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    if (p.rot[0]) g.mesh.position.y -= 0.001;
    else g.mesh.position.z += 0.001;
    b.object.add(g.mesh);
    return g;
  });
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.01 });
  badge.position.set(x + 0.09, 0.15, -D / 2 + 0.103);
  b.object.add(badge);
  const fill = [
    [x, CEIL - 0.25, 0.2],
    [x, 1.2, -D / 2 + 0.35],
  ].map(([px, py, pz]) => {
    const l = lamp('#eef3ff', 0.7, 3.5);
    l.position.set(px, py, pz);
    b.object.add(l);
    return l;
  });
  return {
    object: b.object,
    parts: b.parts,
    update(delta) {
      b.step(delta);
      const l = b.level();
      line.set(l);
      for (const g of glows) g.set(l);
      for (const f of fill) f.intensity = 0.7 * METRE * METRE * l;
    },
  };
}

// ---- 5. A fibre-optic starlight ceiling ------------------------------------

function starlight(kit: PanelKit): LiveExhibit {
  const night = createPs1Material({ color: '#0d1020', roughness: 0.95 });
  const dusk = createPs1Material({ color: '#262a36', roughness: 0.95 });
  kit.materials.push(night, dusk);
  // Its projector's two wheels: the twinkle wheel turning or not, the colour wheel in or out.
  const twinkleWheel = selector(kit, {
    positions: 2,
    initial: 1,
    series: 'xb4',
    name: 'Starlight twinkle wheel',
  });
  const colourWheel = selector(kit, {
    positions: 2,
    initial: 0,
    series: 'xb4',
    name: 'Starlight colour wheel',
  });
  const b = booth(kit, 'Fibre-optic starlight ceiling', {
    ceiling: night,
    back: dusk,
    sides: dusk,
    controls: [
      { part: twinkleWheel, text: 'TWINKLE' },
      { part: colourWheel, text: 'COLOUR' },
    ],
  });
  // Three hundred fibre ends in the dark ceiling, scattered, a few brighter.
  const N = 300;
  const positions = new Float32Array(N * 3);
  const colours = new Float32Array(N * 3);
  const sizes: number[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < N; i++) {
    positions[i * 3] = (rand() - 0.5) * (W - 0.25);
    positions[i * 3 + 1] = CEIL - 0.003;
    positions[i * 3 + 2] = (rand() - 0.5) * (D - 0.2);
    sizes.push(rand() < 0.1 ? 1.8 : 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  const material = new PointsMaterial({
    size: 0.022 * METRE,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  kit.materials.push(material);
  const stars = live(new Points(geometry, material));
  b.object.add(stars);
  // The projector on the floor at the back, its fibre harness rising to the ceiling.
  const box = createPs1Material({
    color: '#3b3f44',
    roughness: 0.6,
    metalness: 0.3,
  });
  const harness = createPs1Material({ color: '#111214', roughness: 0.7 });
  kit.materials.push(box, harness);
  const projector = new Mesh(new BoxGeometry(0.4, 0.22, 0.3), box);
  projector.position.set(-W / 2 + 0.45, 0.11, -D / 2 + 0.3);
  b.object.add(projector);
  const lampGlow = glow(kit, '#fff1d0');
  const port = live(new Mesh(new PlaneGeometry(0.08, 0.06), lampGlow.material));
  port.position.set(-W / 2 + 0.45, 0.13, -D / 2 + 0.452);
  b.object.add(port);
  const bundle = new Mesh(new BoxGeometry(0.05, CEIL - 0.22, 0.05), harness);
  bundle.position.set(-W / 2 + 0.45, 0.22 + (CEIL - 0.22) / 2, -D / 2 + 0.13);
  b.object.add(bundle);
  const badge = createBrandBadge(kit, 'lumenhaus', { height: 0.02 });
  badge.position.set(-W / 2 + 0.45, 0.17, -D / 2 + 0.452);
  b.object.add(badge);
  let time = 0;
  return {
    object: b.object,
    parts: b.parts,
    update(delta) {
      b.step(delta);
      time += delta;
      const l = b.level();
      const wheel = twinkleWheel.position.value === 1;
      const [r, g, bl] = wheelColour(time, colourWheel.position.value === 1);
      for (let i = 0; i < N; i++) {
        const v = l * twinkle(i, time, wheel) * sizes[i];
        colours[i * 3] = r * v;
        colours[i * 3 + 1] = g * v;
        colours[i * 3 + 2] = bl * v;
      }
      geometry.attributes.color.needsUpdate = true;
      lampGlow.set(l);
    },
  };
}

// ---- 6. A luminous ceiling -------------------------------------------------

function luminous(kit: PanelKit): LiveExhibit {
  const b = booth(kit, 'Luminous ceiling');
  const profile = createPs1Material({
    color: '#b9bdbd',
    metalness: 0.6,
    roughness: 0.4,
  });
  kit.materials.push(profile);
  // A backlit stretch membrane filling the ceiling in a slim aluminium profile: one even glowing plane.
  const membrane = glow(kit, '#f6f8ff');
  const sheet = live(
    new Mesh(new PlaneGeometry(W - 0.3, D - 0.3), membrane.material),
  );
  sheet.rotation.x = Math.PI / 2;
  sheet.position.set(0, CEIL - 0.004, 0);
  b.object.add(sheet);
  for (const [w, d, x, z] of [
    [W - 0.26, 0.03, 0, -(D - 0.27) / 2],
    [W - 0.26, 0.03, 0, (D - 0.27) / 2],
    [0.03, D - 0.26, -(W - 0.27) / 2, 0],
    [0.03, D - 0.26, (W - 0.27) / 2, 0],
  ] as const) {
    const m = new Mesh(new BoxGeometry(w, 0.02, d), profile);
    m.position.set(x, CEIL - 0.01, z);
    b.object.add(m);
  }
  // Its light falling down the walls just under it, and filling the booth evenly.
  const bands = [
    { w: W - 0.12, x: 0, z: -D / 2 + 0.102, yaw: 0 },
    { w: D - 0.2, x: -W / 2 + 0.062, z: 0, yaw: Math.PI / 2 },
    { w: D - 0.2, x: W / 2 - 0.062, z: 0, yaw: -Math.PI / 2 },
  ].map((p) => {
    const wash = createWash(kit, 'fall', p.w, 1.4, '#eef2ff', {
      strength: 0.5,
    });
    wash.mesh.position.set(p.x, CEIL - 0.7, p.z);
    wash.mesh.rotation.y = p.yaw;
    b.object.add(wash.mesh);
    return wash;
  });
  const fill = [-0.8, 0.8].map((x) => {
    const l = lamp('#f2f5ff', 1.4, 6);
    l.position.set(x, CEIL - 0.4, 0);
    b.object.add(l);
    return l;
  });
  return {
    object: b.object,
    parts: b.parts,
    update(delta) {
      b.step(delta);
      const l = b.level();
      membrane.set(l);
      for (const w of bands) w.set(l);
      for (const f of fill) f.intensity = 1.4 * METRE * METRE * l;
    },
  };
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Direct/indirect halo panel',
    reference:
      'After a suspended 1200 × 600 LED panel with an uplight halo (prompt 040): light down through its diffuser, and up onto the ceiling round it',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: haloPanel,
  },
  {
    title: 'Cove lighting',
    reference:
      'A concealed LED strip on a ledge round the room, washing the walls above it and the ceiling from its edges in: no source seen',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: cove,
  },
  {
    title: 'Wall grazing',
    reference:
      'Recessed in-ground uplights at the foot of a textured wall, raking light up it so every block’s face shows',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: grazing,
  },
  {
    title: 'Shadow-gap slot',
    reference:
      'A continuous 40 mm recessed slot of light, across the ceiling and down the wall, between black reveals',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: slot,
  },
  {
    title: 'Fibre-optic starlight ceiling',
    reference:
      'A projector with twinkle and colour wheels lighting 300 fibre ends in a dark ceiling, as 1980s and 1990s spas and pool halls had',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: starlight,
  },
  {
    title: 'Luminous ceiling',
    reference:
      'A backlit stretch-membrane ceiling in a slim aluminium profile: the whole ceiling one even glowing plane',
    size: { ...SIZE },
    maker: 'lumenhaus',
    build: luminous,
  },
];
