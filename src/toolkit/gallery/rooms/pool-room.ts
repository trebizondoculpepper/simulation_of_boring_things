import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { createPoolRefraction } from '../../components/pool/views/pool-refraction';
import { createPoolLightGlow } from '../../components/pool/views/pool-light-glow';
import { createColumnCove } from '../../components/architectural/views/column-cove';
import {
  createDryStairPassage,
  createRoundPinkRoom,
  DRY_PASSAGE,
  dryPassageFloorAt,
  dryPassageSolids,
  roundRoomFloorAt,
  roundRoomSolids,
} from '../views/dry-stair-passage';
import {
  archedCorridorSolids,
  archedFloorAt,
  archedZoneAt,
  archedWallShape,
  corridorJambs,
  createArchedCorridor,
} from '../views/arched-corridor';
import { createWhiteCorridor } from '../views/white-corridor';
import { createGreenRoom } from '../views/green-room';
import { createPoolLadder } from '../views/pool-ladder';

/** PR_A's ladder, on the back pool's west side: its middle. */
const BACK_LADDER = { x: POOL_RECTS[2].minX, z: -6.4 };
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  CubeCamera,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  FogExp2,
  Group,
  HalfFloatType,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  Raycaster,
  RectAreaLight,
  Scene,
  Shape,
  SpotLight,
  ShapeGeometry,
  Vector2,
  Vector3,
  ShaderMaterial,
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
  DataTexture,
  DepthTexture,
  DepthStencilFormat,
  UnsignedInt248Type,
  LinearFilter,
  RGBAFormat,
} from 'three';
import type { BufferGeometry, Material, Object3D, Texture } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flowMapTexels } from '../../components/pool/logic/flow-map';
import { POOL_FLOW_MAX, POOL_FLOW_RECT, poolFlowUv } from '../logic/pool-flow';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { DEV_ROOM_NAMES, devPortals, devWalls } from '../logic/dev-room-links';
import { cutOpenings } from '../../controls/logic/walk-collision';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  ARCADE,
  CEILING_LAMPS,
  DECK_GULLIES,
  FLOOR_INLETS,
  MAIN_DRAINS,
  OVERFLOW_WIDTH,
  WALL_FITTINGS,
  offsetOutline,
  overflowStrips,
  LECTERN,
  COLUMNS,
  COLUMN_SIDE,
  COLUMN_COVE_RADIUS,
  EAST_GLAZING,
  DEEP_END,
  basinFloorAt,
  POOL_OUTLINE,
  POOL_FLOOR,
  POOL_RECTS,
  ROOFLIGHTS,
  ROOM,
  WATER_Y,
  inPool,
  poolEdges,
  poolFloorAt,
  poolRoomSolids,
} from '../logic/pool-room-plan';
import {
  DEFAULT_POOL_LOOK,
  DEFAULT_POOL_KNOBS,
  KNOB_NAMES,
  POOL_LOOKS,
  POOL_LOOK_ORDER,
  knobFactor,
} from '../logic/pool-looks';
import type { PoolKnobs, PoolLookId } from '../logic/pool-looks';
import {
  createPartSet,
  potentiometer,
  selector,
} from '../../components/core/parts/parts';
import { knobDirection } from '../../controls/input/knob-turning';
import {
  createDeckGully,
  createFloorInlet,
  createGratingMaterial,
  createMainDrain,
  createPoolLight,
  createVacuumPoint,
  createWallInlet,
  gratingStrip,
  place,
} from '../../components/pool/views/pool-fittings';
import type { PoolFittingMaterials } from '../../components/pool/views/pool-fittings';
import { plantTools } from '../../components/plant/views/plant-tools';
import { mergeTree } from '../../components/core/views/merge-static';
import { METRE } from '../../components/core/logic/units';
import { createPortals } from '../views/portals';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { partAudio } from '../../components/core/audio/part-audio';
import { createFirstPerson } from '../../controls/input/first-person';
import {
  createComposer,
  createRenderer,
} from '../../components/core/parts/render-style';
import {
  createPoolUniforms,
  createLightShaft,
  createPoolWater,
  setPoolFlow,
  createTileMaterial,
} from '../../components/pool/views/pool-surfaces';

/**
 * The PR_A rooms, dev11 to dev13: feasibility studies for the look
 * the leisure centre's pools are to have (`doc/research/PR_A-look.md`).
 * The room is the same in each: glazed white tile on everything, a
 * wading pool running through an arcade, rooflights recessed out of
 * sight and a wall of frosted glazing; the water is clear, nearly still,
 * reflects the room (a picture of it taken once, not drawn again each
 * frame) and throws caustics on the tiles. How it is lit and finished
 * differs, by `look` (`pool-looks.ts`). The frame is drawn through a
 * post-processing chain: ambient occlusion, bloom, ACES tone mapping,
 * then a faint vignette and grain.
 *
 * Each ingredient can be switched off from the console to see what it
 * adds and what it costs: `poolRoom.set('bloom', false)`, and
 * `poolRoom.ingredients` lists them.
 */
export function startPoolRoom(
  canvas: HTMLCanvasElement,
  id: 'dev11' | 'PR_A' = 'dev11',
) {
  const m = METRE;
  // Start with the preferred look, unless `?look=` selects another.
  const asked = new URLSearchParams(location.search).get('look');
  const firstLook =
    POOL_LOOK_ORDER.find((name) => name === asked) ?? DEFAULT_POOL_LOOK;
  const look = POOL_LOOKS[firstLook];
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = look.exposure;
  renderer.shadowMap.enabled = true;
  // The post-processing chain runs per pixel: 1.5 a CSS pixel, not 2.
  // (`?dpr=2` draws at the screen's full resolution, to measure.)
  const dpr = Number(new URLSearchParams(location.search).get('dpr') ?? 1.5);
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, dpr));
  const haze = new Color('#dde9e8');
  renderer.setClearColor(haze);
  scene.background = haze;
  const fog = new FogExp2(haze, 0.007 / m);
  // Haze is an ingredient to try, off by default: it washed the room out.
  scene.fog = null;
  const camera = new PerspectiveCamera(68, 1, 0.05 * m, 80 * m);
  RectAreaLightUniformsLib.init();

  const kit = createPanelKit();
  const t = tools(kit);
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  let dryOnly = false;

  const uniforms = createPoolUniforms(m, WATER_Y, POOL_RECTS);
  // The back hall, beyond the arcade, has no light of its own.
  uniforms.shade.value.set(ROOM.minX, ROOM.minZ, ROOM.maxX, ARCADE.z);
  uniforms.shadeDepth.value = 0.55;
  uniforms.caustics.value = look.caustics;
  uniforms.reflected.value = look.reflected;
  const tile = createTileMaterial(uniforms, { ...look.walls, bump: look.bump });
  const deck = createTileMaterial(uniforms, { ...look.deck, bump: look.bump });
  const basin = createTileMaterial(uniforms, {
    ...look.walls,
    bump: look.bump,
    colour: '#eef7f6',
    grout: '#b9c8c8',
  });
  const glow = new MeshBasicMaterial({
    color: new Color('#f4fbfb').multiplyScalar(look.rooflightGlow),
    fog: false,
  });
  const glazing = new MeshBasicMaterial({
    color: new Color('#e7f4f6').multiplyScalar(look.glazingGlow),
    fog: false,
  });
  const materials: Material[] = [tile, deck, basin, glow, glazing];

  // Geometry is gathered per material and merged: a handful of draws.
  const pieces = new Map<Material, BufferGeometry[]>();
  const add = (material: Material, geometry: BufferGeometry) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.deleteAttribute('uv');
    g.clearGroups();
    const list = pieces.get(material) ?? [];
    list.push(g);
    pieces.set(material, list);
  };
  const box = (
    material: Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => add(material, new BoxGeometry(w, h, d).translate(x, y, z));

  const { minX, maxX, minZ, maxZ, height } = ROOM;
  const depth = maxZ - minZ;
  const wall = 0.3;

  // The deck, with the pool cut out of it. A shape in (x, −z), laid flat.
  // (A ceiling, facing down, is laid the other way: `up` false.)
  const outline = (
    points: readonly (readonly [number, number])[],
    up = true,
  ) => {
    const s = new Shape();
    points.forEach(([x, z], i) =>
      i ? s.lineTo(x, up ? -z : z) : s.moveTo(x, up ? -z : z),
    );
    s.closePath();
    return s;
  };
  const deckShape = outline([
    [minX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
    [maxX, minZ],
  ]);
  // A square opening `size` across at (x, z), for a fitting's dark sump.
  const opening = (x: number, z: number, size: number) =>
    outline([
      [x - size / 2, z - size / 2],
      [x - size / 2, z + size / 2],
      [x + size / 2, z + size / 2],
      [x + size / 2, z - size / 2],
    ]);
  // The tiles stop at the overflow grating round the pool, and at each
  // deck gully.
  deckShape.holes.push(outline(offsetOutline(OVERFLOW_WIDTH)));
  for (const [x, z] of DECK_GULLIES) deckShape.holes.push(opening(x, z, 0.13));
  add(deck, new ShapeGeometry(deckShape).rotateX(-Math.PI / 2));

  // The basin: its floor (the main pool's shallow end, its slope and its
  // deep end; the channel; the back pool), side walls and a rounded
  // nosing. Each piece of floor is flat or a single slope, its height at
  // each corner the floor's there, the main drains cut through it.
  const floorPiece = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
  ) => {
    const piece = outline([
      [minX, minZ],
      [minX, maxZ],
      [maxX, maxZ],
      [maxX, minZ],
    ]);
    for (const [x, z] of MAIN_DRAINS)
      if (x > minX && x < maxX && z > minZ && z < maxZ)
        piece.holes.push(opening(x, z, 0.44));
    const geometry = new ShapeGeometry(piece).rotateX(-Math.PI / 2);
    const at = geometry.getAttribute('position');
    for (let i = 0; i < at.count; i++)
      at.setY(i, basinFloorAt(at.getX(i), at.getZ(i)));
    geometry.computeVertexNormals();
    add(basin, geometry);
  };
  {
    const [main, channel, back] = POOL_RECTS;
    const cuts = [main.minX, DEEP_END.from, DEEP_END.to, main.maxX];
    for (let i = 0; i + 1 < cuts.length; i++)
      floorPiece(cuts[i], cuts[i + 1], main.minZ, main.maxZ);
    floorPiece(channel.minX, channel.maxX, channel.minZ, channel.maxZ);
    floorPiece(back.minX, back.maxX, back.minZ, back.maxZ);
  }
  // The walls go down to the deep end's floor (below the shallower floors
  // they are hidden).
  const sink = -DEEP_END.floor;
  for (const { a, b } of poolEdges()) {
    const mx = (a[0] + b[0]) / 2,
      mz = (a[1] + b[1]) / 2;
    const alongX = a[1] === b[1];
    const length = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
    // Which side is the water: the wall stands just outside it.
    const out = alongX
      ? inPool(mx, mz + 0.05)
        ? -0.02
        : 0.02
      : inPool(mx + 0.05, mz)
        ? -0.02
        : 0.02;
    box(
      basin,
      alongX ? length + 0.04 : 0.04,
      sink,
      alongX ? 0.04 : length + 0.04,
      alongX ? mx : mx + out,
      -sink / 2,
      alongX ? mz + out : mz,
    );
  }

  // PR_A has one real opening into a dry stair passage; dev11 retains its exit.
  const exits = devPortals(
    id,
    { minX: minX * m, maxX: maxX * m, minZ: minZ * m, maxZ: maxZ * m },
    m,
  );
  for (const side of ['north', 'south', 'west', 'east'] as const) {
    const low = side === 'north' || side === 'south' ? minX : minZ;
    const high = side === 'north' || side === 'south' ? maxX : maxZ;
    const sections =
      id === 'PR_A' && side === 'west'
        ? [
            { start: low, end: DRY_PASSAGE.nearZ, bottom: 0, top: height },
            { start: DRY_PASSAGE.farZ, end: high, bottom: 0, top: height },
            {
              start: DRY_PASSAGE.nearZ,
              end: DRY_PASSAGE.farZ,
              bottom: 3.2,
              top: height,
            },
          ]
        : id === 'PR_A' && side === 'south'
          ? [
              // Either side of the arched corridor's mouth; the piece
              // round its arch is drawn below.
              {
                start: low,
                end: corridorJambs()[0] - 0.2,
                bottom: 0,
                top: height,
              },
              {
                start: corridorJambs()[1] + 0.2,
                end: high,
                bottom: 0,
                top: height,
              },
            ]
          : [{ start: low, end: high, bottom: 0, top: height }];
    for (const section of sections) {
      const span = section.end - section.start;
      const rise = section.top - section.bottom;
      const mid = (section.start + section.end) / 2;
      const y = (section.bottom + section.top) / 2;
      if (side === 'north' || side === 'south')
        box(
          tile,
          span,
          rise,
          wall,
          mid,
          y,
          side === 'north' ? minZ - wall / 2 : maxZ + wall / 2,
        );
      else
        box(
          tile,
          wall,
          rise,
          span,
          side === 'west' ? minX - wall / 2 : maxX + wall / 2,
          y,
          mid,
        );
    }
  }
  if (id === 'PR_A') {
    // The south wall round the arched corridor's mouth: its face in the
    // wall's own plane, the arch cut through its thickness.
    const [left, right] = corridorJambs();
    add(
      tile,
      new ExtrudeGeometry(archedWallShape(left - 0.2, right + 0.2, height), {
        depth: wall,
        bevelEnabled: false,
        curveSegments: 32,
      }).translate(0, 0, maxZ),
    );
    // In the scene, not the hall's group: it stays drawn while the hall is
    // hidden behind someone in the corridor looking away from it.
    scene.add(
      createArchedCorridor(
        m,
        { ...look.walls, bump: look.bump },
        { ...look.deck, bump: look.bump },
      ),
    );
  }
  if (id === 'PR_A') {
    // Continue the tiled wall through its thickness, ending flush at the
    // dry passage's side faces. The small overlap hides the joining seam.
    const jambX = minX - wall / 2;
    box(tile, wall + 0.012, 3.2, 0.035, jambX, 1.6, DRY_PASSAGE.nearZ + 0.0175);
    box(tile, wall + 0.012, 3.2, 0.035, jambX, 1.6, DRY_PASSAGE.farZ - 0.0175);
    box(
      tile,
      wall + 0.012,
      0.035,
      DRY_PASSAGE.farZ - DRY_PASSAGE.nearZ,
      jambX,
      3.2175,
      (DRY_PASSAGE.nearZ + DRY_PASSAGE.farZ) / 2,
    );
  }

  // A coved junction where wall meets floor, as in a tiled pool hall.
  const cove = (length: number) => {
    const r = 0.14;
    const s = new Shape();
    s.moveTo(0, 0);
    s.lineTo(r, 0);
    s.absarc(r, r, r, -Math.PI / 2, Math.PI, true);
    s.lineTo(0, 0);
    return new ExtrudeGeometry(s, {
      depth: length,
      bevelEnabled: false,
      curveSegments: 6,
    }).translate(0, 0, -length / 2);
  };
  // Along the north and south walls (shape x into the room), the east, and
  // the west except at openings.
  const northCove = (from: number, to: number) =>
    add(
      tile,
      cove(to - from)
        .rotateY(-Math.PI / 2)
        .translate((from + to) / 2, 0, minZ),
    );
  northCove(minX, maxX);
  const southCove = (from: number, to: number) =>
    add(
      tile,
      cove(to - from)
        .rotateY(Math.PI / 2)
        .translate((from + to) / 2, 0, maxZ),
    );
  if (id === 'PR_A') {
    southCove(minX, corridorJambs()[0]);
    southCove(corridorJambs()[1], maxX);
  } else southCove(minX, maxX);
  add(tile, cove(depth).rotateY(Math.PI).translate(maxX, 0, 0));
  const westCove = (from: number, to: number) =>
    add(tile, cove(to - from).translate(minX, 0, (from + to) / 2));
  if (id === 'PR_A') {
    westCove(minZ, DRY_PASSAGE.nearZ);
    westCove(DRY_PASSAGE.farZ, maxZ);
  } else westCove(minZ, maxZ - 2.2);

  // The same rounded tile profile softens each upright room corner.
  if (id === 'PR_A') {
    for (const [x, z, turn] of [
      [minX, maxZ, 0],
      [maxX, maxZ, Math.PI / 2],
      [maxX, minZ, Math.PI],
      [minX, minZ, (3 * Math.PI) / 2],
    ])
      add(
        tile,
        cove(height)
          .rotateX(-Math.PI / 2)
          .rotateY(turn)
          .translate(x, height / 2, z),
      );
  }

  // The arcade: a tiled wall with five round arches.
  const arcade = new Shape();
  arcade.moveTo(minX, 0);
  for (const x of ARCADE.arches) {
    const r = ARCADE.width / 2;
    arcade.lineTo(x - r, 0);
    arcade.lineTo(x - r, ARCADE.spring);
    arcade.absarc(x, ARCADE.spring, r, Math.PI, 0, true);
    arcade.lineTo(x + r, 0);
  }
  arcade.lineTo(maxX, 0);
  arcade.lineTo(maxX, height);
  arcade.lineTo(minX, height);
  arcade.closePath();
  add(
    tile,
    new ExtrudeGeometry(arcade, {
      depth: ARCADE.thickness,
      bevelEnabled: false,
      curveSegments: 24,
    }).translate(0, 0, ARCADE.z - ARCADE.thickness / 2),
  );

  // Slim columns along the pool.
  for (const [x, z] of COLUMNS) {
    box(tile, COLUMN_SIDE, height, COLUMN_SIDE, x, height / 2, z);
    add(
      tile,
      createColumnCove(COLUMN_SIDE, COLUMN_COVE_RADIUS).translate(x, 0, z),
    );
  }

  // The ceiling, its rooflights recessed in deep coffers so the light's
  // source is out of sight from most of the room.
  const ceiling = outline(
    [
      [minX, minZ],
      [maxX, minZ],
      [maxX, maxZ],
      [minX, maxZ],
    ],
    false,
  );
  const well = 0.7;
  for (const r of ROOFLIGHTS)
    ceiling.holes.push(
      outline(
        [
          [r.x - r.w / 2, r.z - r.d / 2],
          [r.x - r.w / 2, r.z + r.d / 2],
          [r.x + r.w / 2, r.z + r.d / 2],
          [r.x + r.w / 2, r.z - r.d / 2],
        ],
        false,
      ),
    );
  add(
    tile,
    new ShapeGeometry(ceiling).rotateX(Math.PI / 2).translate(0, height, 0),
  );
  for (const r of ROOFLIGHTS) {
    const y = height + well / 2;
    box(tile, r.w + 0.2, well, 0.1, r.x, y, r.z - r.d / 2 - 0.05);
    box(tile, r.w + 0.2, well, 0.1, r.x, y, r.z + r.d / 2 + 0.05);
    box(tile, 0.1, well, r.d, r.x - r.w / 2 - 0.05, y, r.z);
    box(tile, 0.1, well, r.d, r.x + r.w / 2 + 0.05, y, r.z);
    box(glow, r.w, 0.02, r.d, r.x, height + well, r.z);
  }

  // The east wall's frosted glazing, between tiled mullions.
  const g = EAST_GLAZING;
  box(
    glazing,
    0.02,
    g.head - g.sill,
    g.width,
    maxX - 0.02,
    (g.sill + g.head) / 2,
    g.z,
  );
  for (let k = 0; k <= 8; k++)
    box(
      tile,
      0.16,
      g.head - g.sill,
      0.12,
      maxX - 0.06,
      (g.sill + g.head) / 2,
      g.z - g.width / 2 + (k * g.width) / 8,
    );
  box(tile, 0.2, 0.12, g.width + 0.12, maxX - 0.08, g.sill, g.z);
  box(tile, 0.2, 0.12, g.width + 0.12, maxX - 0.08, g.head, g.z);

  for (const [material, list] of pieces) {
    const merged = mergeGeometries(list);
    for (const geometry of list) geometry.dispose();
    const mesh = new Mesh(merged, material);
    mesh.name = `Pool room: ${material.name || material.type}`;
    // The glowing panels let the sun through; the tiles cast and take shadow.
    mesh.castShadow = material !== glow && material !== glazing;
    mesh.receiveShadow = true;
    room.add(mesh);
  }

  // The pool's fittings (`pool-fittings.ts`): main drains and inlets in
  // its floor, lights, vacuum points and inlets in its walls, gullies in
  // the deck, and the overflow grating all round. Under the water they
  // are tinted and lit by caustics like the tiles.
  const plain = (colour: string, roughness: number, metalness = 0) => {
    const material = createTileMaterial(uniforms, {
      plain: true,
      colour,
      roughness: [roughness, roughness],
      glaze: 0,
      metalness,
    });
    materials.push(material);
    return material;
  };
  const lens = new MeshBasicMaterial({
    color: new Color('#e9fbff').multiplyScalar(5),
    fog: false,
  });
  materials.push(lens);
  const fittingKinds: PoolFittingMaterials = {
    abs: plain('#f2f3ef', 0.35),
    steel: plain('#c9cdcf', 0.28, 0.9),
    cavity: plain('#0f2a2e', 0.6),
    pvc: plain('#8c9295', 0.55),
    lens,
  };
  const ft = plantTools(kit);
  const fittings = new Group();
  fittings.name = 'Pool fittings';
  for (const [x, z] of MAIN_DRAINS)
    place(
      fittings,
      createMainDrain(ft, fittingKinds),
      x,
      basinFloorAt(x, z),
      z,
    );
  for (const [x, z] of FLOOR_INLETS)
    place(
      fittings,
      createFloorInlet(ft, fittingKinds),
      x,
      basinFloorAt(x, z),
      z,
    );
  // Lift the grating rims 2 mm clear of the deck to avoid z-fighting.
  for (const [x, z] of DECK_GULLIES)
    place(fittings, createDeckGully(ft, fittingKinds), x, 0.002, z);
  for (const f of WALL_FITTINGS) {
    const make =
      f.kind === 'light'
        ? createPoolLight
        : f.kind === 'vacuum'
          ? createVacuumPoint
          : createWallInlet;
    place(
      fittings,
      make(ft, fittingKinds),
      f.x,
      WATER_Y - f.depth,
      f.z,
      Math.atan2(f.facing[0], f.facing[1]),
    );
  }
  const lightGlow = createPoolLightGlow(
    uniforms,
    WALL_FITTINGS.filter((f) => f.kind === 'light').map((f) => [
      f.x + f.facing[0] * 0.06,
      WATER_Y - f.depth,
      f.z + f.facing[1] * 0.06,
    ]),
  );
  room.add(lightGlow);
  materials.push(lightGlow.material);
  room.add(fittings);
  mergeTree(fittings, () => false);
  // Every grating strip clears the tiles by at least 1 mm.
  // Longitudinal strips sit another 1 mm higher to separate inside corners.
  const gratingParts = overflowStrips().map((strip) => {
    const alongX = strip.w >= strip.d;
    const g = gratingStrip(alongX ? strip.w : strip.d, OVERFLOW_WIDTH);
    if (!alongX) g.rotateY(Math.PI / 2);
    return g.translate(strip.x, alongX ? 0.002 : 0.001, strip.z);
  });
  const grating = new Mesh(
    mergeGeometries(gratingParts),
    createGratingMaterial(kit),
  );
  for (const part of gratingParts) part.dispose();
  grating.name = 'Overflow grating';
  grating.receiveShadow = true;
  room.add(grating);

  // The water: its reflection is a picture of the room, taken below.
  const waterShape = new ShapeGeometry(outline(POOL_OUTLINE));
  // Its ripples move with the pool's circulation (`pool-flow.ts`): from the
  // inlets, up the channel, out to the overflow.
  const flowMap = new DataTexture(
    flowMapTexels(128, 104, poolFlowUv, POOL_FLOW_MAX),
    128,
    104,
    RGBAFormat,
  );
  flowMap.magFilter = flowMap.minFilter = LinearFilter;
  flowMap.needsUpdate = true;
  const flow = {
    map: flowMap,
    rect: POOL_FLOW_RECT,
    maxSpeed: POOL_FLOW_MAX,
    period: 1.5,
  };
  const water = createPoolWater(waterShape, uniforms, null, flow);
  // The caustics on the pool's floor move with the same flow.
  setPoolFlow(uniforms, flow);
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  room.add(water);
  if (id === 'PR_A') {
    // A ladder on the back pool's west side.
    const ladder = createPoolLadder(-POOL_FLOOR);
    ladder.position.set(BACK_LADDER.x, 0, BACK_LADDER.z);
    room.add(ladder);
  }

  // A discreet title card by the door.
  const card = t.printed(
    1.8,
    0.5,
    (c, w, h) => {
      c.fillStyle = '#f4f6f2';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5d7a7e';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `${h * 0.22}px ${SANS}`;
      c.fillText(DEV_ROOM_NAMES[id], w / 2, h * 0.38);
      c.font = `${h * 0.13}px ${SANS}`;
      if (id === 'dev11')
        c.fillText('Turn LOOK on the lectern to compare', w / 2, h * 0.7);
    },
    512,
  );
  card.mesh.position.set(minX + 0.01, 2.0, 4.8);
  card.mesh.rotation.y = Math.PI / 2;
  if (id === 'dev11') room.add(card.mesh);

  // Light: every look's lights are built once and shown, hidden and
  // set by `apply` (below): area lights at the rooflights and glazing, a
  // sun through the rooflights, ceiling lamps, and sky fill. Every light
  // shown costs every tile pixel some work.
  const lights = new Group();
  // One area light spans the row of rooflights, rather than three.
  const first = ROOFLIGHTS[0],
    final = ROOFLIGHTS[ROOFLIGHTS.length - 1];
  const span = final.x + final.w / 2 - (first.x - first.w / 2);
  const roofShare = (ROOFLIGHTS.length * first.w) / span;
  const roof = new RectAreaLight('#f4fbfb', 0, span * m, first.d * m);
  const roofX = (first.x - first.w / 2 + final.x + final.w / 2) / 2;
  roof.position.set(roofX * m, (height + well - 0.05) * m, first.z * m);
  roof.lookAt(roofX * m, 0, first.z * m);
  const sill = (g.sill + g.head) / 2;
  const daylight = new RectAreaLight(
    '#e4f2f6',
    0,
    g.width * m,
    (g.head - g.sill) * m,
  );
  daylight.position.set((maxX - 0.05) * m, sill * m, g.z * m);
  daylight.lookAt(0, sill * m, g.z * m);
  const sky = new HemisphereLight('#ffffff', '#ffffff', 0);
  lights.add(roof, daylight, sky);

  // The sun, through the rooflights, with shadows and shafts.
  const sunAngle = { elevation: 1.0, azimuth: 0.6 };
  const toward = new Vector3(
    Math.sin(sunAngle.azimuth) * Math.cos(sunAngle.elevation),
    Math.sin(sunAngle.elevation),
    Math.cos(sunAngle.azimuth) * Math.cos(sunAngle.elevation),
  );
  const sun = new DirectionalLight('#fff4e2', 0);
  sun.position.copy(toward).multiplyScalar(30 * m);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = 20 * m;
  Object.assign(sun.shadow.camera, {
    left: -reach,
    right: reach,
    top: reach,
    bottom: -reach,
    near: 1 * m,
    far: 70 * m,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02 * m;
  lights.add(sun, sun.target);
  const shafts = new Group();
  for (const r of ROOFLIGHTS)
    shafts.add(createLightShaft(r, height + well, toward, '#fff4e2', 0));
  room.add(shafts);

  // Spot lamps in the ceiling, each a small glowing disc.
  const lamps = new Group();
  const lampFaces = new Group();
  const disc = new MeshBasicMaterial({ color: '#ffffff', fog: false });
  materials.push(disc);
  for (const [x, z] of CEILING_LAMPS) {
    const lamp = new SpotLight('#ffffff', 0, 0, 1, 0.6, 2);
    lamp.position.set(x * m, (height - 0.02) * m, z * m);
    lamp.target.position.set(x * m, 0, z * m);
    lamps.add(lamp, lamp.target);
    const face = new Mesh(new CylinderGeometry(0.11, 0.11, 0.02, 20), disc);
    face.position.set(x, height - 0.01, z);
    lampFaces.add(face);
  }
  lights.add(lamps);
  room.add(lampFaces);
  scene.add(lights);

  // Bounce: the lit room captured as an environment, twice, so the
  // second capture carries the first's bounce; and the water's reflection,
  // the room seen once from above the pool. Taken again when the light
  // changes, not every frame.
  let environment: Texture | null = null;
  let environmentTarget: ReturnType<PMREMGenerator['fromScene']> | null = null;
  const pmrem = new PMREMGenerator(renderer);
  const mirror = new WebGLCubeRenderTarget(256, { type: HalfFloatType });
  const probe = new CubeCamera(0.05 * m, 60 * m, mirror);
  probe.position.set(-1 * m, (WATER_Y + 1.2) * m, 1.5 * m);
  (water.material as ShaderMaterial).uniforms.room.value = mirror.texture;
  const capture = (bounce: number) => {
    // Captured as plain white tile: the pool's cyan and its caustics,
    // seen by the capture, would tint the whole room green.
    const shown = shafts.visible;
    water.visible = shafts.visible = false;
    const tint = [
      uniforms.waterY.value,
      uniforms.caustics.value,
      uniforms.reflected.value,
    ];
    uniforms.waterY.value = -100;
    uniforms.caustics.value = uniforms.reflected.value = 0;
    scene.environment = null;
    scene.environmentIntensity = bounce;
    let target = null;
    if (bounce > 0)
      for (let pass = 0; pass < 2; pass++) {
        const next = pmrem.fromScene(scene, 0.03, 0.05 * m, 60 * m, {
          position: new Vector3(-1 * m, 1.6 * m, 2 * m),
        });
        scene.environment = next.texture;
        target?.dispose();
        target = next;
      }
    [uniforms.waterY.value, uniforms.caustics.value, uniforms.reflected.value] =
      tint;
    environmentTarget?.dispose();
    environmentTarget = target;
    environment = scene.environment;
    probe.update(renderer, scene);
    water.visible = true;
    shafts.visible = shown;
  };

  // The portal home, and the walker.
  const bounds: Footprint = {
    minX: minX * m,
    maxX: maxX * m,
    minZ: minZ * m,
    maxZ: maxZ * m,
  };
  const walls = devWalls(bounds, m, height * m);
  if (id === 'PR_A') {
    walls.splice(2, 1);
    // The south wall either side of the arched corridor's mouth.
    const south = walls.splice(1, 1)[0];
    const [left, right] = corridorJambs();
    walls.push({ ...south, maxX: left * m }, { ...south, minX: right * m });
    const edge = 0.15 * m;
    for (const [a, b] of [
      [minZ, DRY_PASSAGE.nearZ],
      [DRY_PASSAGE.farZ, maxZ],
    ])
      walls.push({
        minX: minX * m - edge,
        maxX: minX * m + edge,
        minZ: a * m - edge,
        maxZ: b * m + edge,
        bottom: 0,
        top: height * m,
      });
    scene.add(createDryStairPassage(m));
    scene.add(createRoundPinkRoom(m));
    scene.add(createWhiteCorridor(m));
    scene.add(createGreenRoom(m));
  }
  // The pool's edge is open at the ladder: the way out of the water, as
  // well as in, wherever the walker ends up in it.
  const solids: Footprint[] = cutOpenings(
    poolRoomSolids(),
    id === 'PR_A'
      ? [
          {
            minX: BACK_LADDER.x - 0.3,
            maxX: BACK_LADDER.x + 0.3,
            minZ: BACK_LADDER.z - 0.35,
            maxZ: BACK_LADDER.z + 0.35,
          },
        ]
      : [],
  ).map((s) => ({
    minX: s.minX * m,
    maxX: s.maxX * m,
    minZ: s.minZ * m,
    maxZ: s.maxZ * m,
  }));
  const portals = createPortals(id, exits, 0, m);
  scene.add(portals.group);

  const raycaster = new Raycaster(),
    pointer = new Vector2();
  const useAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects(
      id === 'dev11' ? [portals.group, lectern] : [portals.group],
      true,
    )[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return travel;
      const work = parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    floorAt: (x, z) =>
      ((id === 'PR_A'
        ? (dryPassageFloorAt(x / m, z / m) ??
          roundRoomFloorAt(x / m, z / m) ??
          archedFloorAt(x / m, z / m))
        : null) ?? poolFloorAt(x / m, z / m)) * m,
    start: { x: 0, z: 0 },
    ladders: () =>
      id === 'PR_A'
        ? [
            {
              minX: (BACK_LADDER.x - 0.5) * m,
              maxX: (BACK_LADDER.x + 0.5) * m,
              minZ: (BACK_LADDER.z - 0.35) * m,
              maxZ: (BACK_LADDER.z + 0.35) * m,
              bottom: POOL_FLOOR * m,
              top: 0,
              rung: { x: (BACK_LADDER.x + 0.16) * m, z: BACK_LADDER.z * m },
              bottomExit: {
                x: (BACK_LADDER.x + 0.42) * m,
                z: BACK_LADDER.z * m,
              },
              topExit: {
                x: (BACK_LADDER.x - 0.46) * m,
                z: BACK_LADDER.z * m,
              },
            },
          ]
        : [],
    solids: () => [
      ...walls,
      ...solids,
      ...(id === 'PR_A'
        ? [...dryPassageSolids(), ...roundRoomSolids()].map((s) => ({
            minX: s.minX * m,
            maxX: s.maxX * m,
            minZ: s.minZ * m,
            maxZ: s.maxZ * m,
          }))
        : []),
      ...(id === 'PR_A'
        ? archedCorridorSolids().map((s) => ({
            minX: s.minX * m,
            maxX: s.maxX * m,
            minZ: s.minZ * m,
            maxZ: s.maxZ * m,
          }))
        : []),
    ],
    use: (x, y) => useAt(x, y)?.(),
    aimed: () => Boolean(useAt(0, 0)),
  });
  const params = new URLSearchParams(location.search);
  const arrival = portals.arrival(params.get('from'));
  const start =
    arrival ??
    (id === 'PR_A'
      ? { x: 2.5 * m, z: (maxZ - 1.25) * m, yaw: 0, pitch: -0.05 }
      : {
          x: (minX + 2) * m,
          z: (maxZ - 1.2) * m,
          yaw: 1.0,
          pitch: -0.05,
        });
  walk.place(start.x, start.z, start.yaw, start.pitch);
  let activeZone: 'PR_A' | 'CR_A_UP' | 'CR_A_ARCH' | 'CR_A_STEPS' =
    params.get('room') === 'CR_A_UP' ? 'CR_A_UP' : 'PR_A';

  // The frame: the scene, ambient occlusion, bloom, tone mapping, finish.
  const target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    stencilBuffer: true,
    samples: 4,
  });
  target.depthTexture = new DepthTexture(1, 1, UnsignedInt248Type);
  target.depthTexture.format = DepthStencilFormat;
  const composer = createComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const refraction = createPoolRefraction(camera, uniforms);
  composer.addPass(refraction);
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({
    distanceExponent: 1.4,
    thickness: 1.2 * m,
    scale: 1.0,
    samples: 12,
  });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 });
  // Occlusion is of the room's surfaces: not the water over the pool's
  // floor, nor the air of a light shaft.
  const occlude = ao.render.bind(ao);
  ao.render = (...args: Parameters<typeof ao.render>) => {
    const shown = shafts.visible;
    const glowShown = lightGlow.visible;
    water.visible = shafts.visible = lightGlow.visible = false;
    occlude(...args);
    water.visible = true;
    shafts.visible = shown;
    lightGlow.visible = glowShown;
  };
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0, 0, 0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      grain: { value: 0 },
      vignette: { value: 0 },
    },
    vertexShader: /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform float time, grain, vignette;
varying vec2 vUv;
float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
void main() {
  vec2 c = vUv - 0.5;
  // A touch of chromatic aberration toward the corners.
  vec2 shift = c * dot(c, c) * 0.006;
  vec3 colour = vec3(
    texture2D(tDiffuse, vUv + shift).r,
    texture2D(tDiffuse, vUv).g,
    texture2D(tDiffuse, vUv - shift).b);
  colour *= 1.0 - vignette * smoothstep(0.25, 0.85, length(c * vec2(1.15, 1.0)));
  colour += (rand(vUv * 731.0) - 0.5) * grain;
  gl_FragColor = vec4(colour, 1.0);
}`,
  });
  composer.addPass(film);

  // ---- The lectern: LOOK, and nine knobs to turn its quantities ----------
  const parts = createPartSet();
  const lectern = new Group();
  lectern.position.set(LECTERN.x, 0, LECTERN.z);
  // Its desk toward the door, the player behind it looking east.
  lectern.rotation.y = -Math.PI / 2;
  if (id === 'dev11') room.add(lectern);
  const steel = kitPaint(kit, '#3e4547');
  const column = new Mesh(new BoxGeometry(0.14, 0.95, 0.14), steel);
  column.position.y = 0.475;
  lectern.add(column);
  const desk = new Group();
  desk.position.y = 1.0;
  desk.rotation.x = 0.45;
  lectern.add(desk);
  const fascia = new MeshStandardMaterial({
    color: '#b5bec2',
    metalness: 0.6,
    roughness: 0.38,
  });
  kit.materials.push(fascia);
  desk.add(new Mesh(new BoxGeometry(1.35, 0.04, 0.85), fascia));
  const makerFace = new Group();
  makerFace.rotation.x = -Math.PI / 2;
  desk.add(makerFace);
  panelMakerMark(kit, makerFace, { width: 1.35, height: 0.85, z: 0.021 });
  const label = (text: string, x: number, z: number, height = 0.022) => {
    const plate = createMicroLabel(kit, text, { height, ink: '#253238' });
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(x, 0.022, z);
    desk.add(plate);
  };
  label('POOLROOMS', 0, -0.36, 0.028);
  const lookKnob = selector(kit, {
    name: 'LOOK selector',
    legend: 'LOOK',
    positions: 3,
    initial: POOL_LOOK_ORDER.indexOf(firstLook),
  });
  lookKnob.object.rotation.x = -Math.PI / 2;
  lookKnob.object.position.set(-0.48, 0.021, 0.04);
  desk.add(lookKnob.object);
  parts.add(lookKnob);
  label('OVERCAST · SUN · UNITY', -0.48, -0.1, 0.016);
  const knobs = KNOB_NAMES.map((name, i) => {
    const knob = potentiometer(kit, {
      name: `${name.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()} knob`,
      legend: name.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase(),
      steps: 10,
      initial: DEFAULT_POOL_KNOBS[name],
    });
    knob.object.rotation.x = -Math.PI / 2;
    knob.object.position.set(
      -0.12 + (i % 3) * 0.28,
      0.021,
      -0.22 + Math.floor(i / 3) * 0.26,
    );
    desk.add(knob.object);
    parts.add(knob);
    return knob;
  });
  if (id === 'dev11')
    solids.push({
      minX: (LECTERN.x - 0.45) * m,
      maxX: (LECTERN.x + 0.45) * m,
      minZ: (LECTERN.z - 0.725) * m,
      maxZ: (LECTERN.z + 0.725) * m,
    });

  // Set the room to the lectern: its look, and each knob's quantity.
  // (The console can hold a look or knob: `poolRoom.look('sunlight')`.)
  const held: { look?: PoolLookId; knobs: Partial<PoolKnobs> } = { knobs: {} };
  let shownKey = '';
  let lit = '';
  const currentSettings = () => {
    const name =
      held.look ?? POOL_LOOK_ORDER[lookKnob.position.value] ?? firstLook;
    const share = Object.fromEntries(
      KNOB_NAMES.map((knob, i) => [
        knob,
        held.knobs[knob] ?? knobs[i].share.value,
      ]),
    ) as unknown as PoolKnobs;
    return { look: name, knobs: share };
  };
  const apply = () => {
    const { look: name, knobs: share } = currentSettings();
    const key = `${name} ${KNOB_NAMES.map((k) => share[k]).join(' ')}`;
    if (key === shownKey) return;
    shownKey = key;
    const look = POOL_LOOKS[name];
    const f = (knob: keyof PoolKnobs) => knobFactor(knob, share[knob]);
    const light = f('light');
    uniforms.rippleSize.value = Math.max(0.25, f('rippleSize'));
    uniforms.rippleSpeed.value = f('rippleSpeed');
    refraction.uniforms.strength.value = f('refraction');
    renderer.toneMappingExposure = look.exposure * f('exposure');
    roof.visible = look.roofArea > 0;
    roof.intensity = look.roofArea * roofShare * light;
    daylight.visible = look.glazingArea > 0;
    daylight.intensity = look.glazingArea * light;
    sky.color.set(look.hemisphere.sky);
    sky.groundColor.set(look.hemisphere.ground);
    sky.intensity = look.hemisphere.intensity * light;
    sun.visible = look.sun !== null;
    sun.intensity = (look.sun?.intensity ?? 0) * light;
    if (look.sun) sun.color.set(look.sun.colour);
    shafts.visible = (look.sun?.shafts ?? 0) > 0;
    for (const shaft of shafts.children)
      ((shaft as Mesh).material as ShaderMaterial).uniforms.strength.value =
        (look.sun?.shafts ?? 0) * light;
    lamps.visible = lampFaces.visible = look.lamps !== null;
    if (look.lamps) {
      disc.color.set(look.lamps.colour).multiplyScalar(8);
      for (const lamp of lamps.children)
        if (lamp instanceof SpotLight) {
          lamp.color.set(look.lamps.colour);
          lamp.angle = look.lamps.angle;
          lamp.intensity = look.lamps.intensity * m * m * light;
        }
    }
    glow.color.set('#f4fbfb').multiplyScalar(look.rooflightGlow * light);
    glazing.color.set('#e7f4f6').multiplyScalar(look.glazingGlow * light);
    for (const material of [tile, basin, deck]) {
      const glaze = material === deck ? look.deck : look.walls;
      material.tileUniforms.roughLow.value = glaze.roughness[0];
      material.tileUniforms.roughHigh.value = glaze.roughness[1];
      material.tileUniforms.tileBump.value = look.bump * f('bump');
      material.clearcoat = glaze.glaze;
    }
    uniforms.caustics.value = look.caustics * f('caustics');
    uniforms.reflected.value = look.reflected * f('caustics');
    bloom.strength = look.bloom.strength * f('bloom');
    lightGlow.material.uniforms.strength.value = f('bloom');
    bloom.radius = look.bloom.radius;
    bloom.threshold = look.bloom.threshold;
    ao.blendIntensity = look.ao.blend;
    ao.updateGtaoMaterial({ radius: look.ao.radius * m });
    film.uniforms.grain.value = look.grain;
    film.uniforms.vignette.value = look.vignette;
    // The bounce and the water's picture are taken again when the light
    // changes; the bounce knob only scales what was taken.
    const lighting = `${name} ${share.light}`;
    if (lighting !== lit) {
      lit = lighting;
      capture(look.bounce);
    }
    scene.environmentIntensity = look.bounce * f('bounce');
    scene.environment = scene.environmentIntensity > 0 ? environment : null;
  };

  const ingredients = {
    tiles: (on: boolean) => (uniforms.tiles.value = on ? 1 : 0),
    water: (on: boolean) => {
      water.visible = on;
      refraction.enabled = on;
      lightGlow.visible = on && bloom.enabled;
    },
    refraction: (on: boolean) => (refraction.enabled = on),
    ao: (on: boolean) => (ao.enabled = on),
    bloom: (on: boolean) => {
      bloom.enabled = on;
      lightGlow.visible = on && water.visible;
    },
    fog: (on: boolean) => (scene.fog = on ? fog : null),
    film: (on: boolean) => (film.enabled = on),
  };
  type Ingredient = keyof typeof ingredients;

  // Copy the effective choices, including console overrides, at click time.
  const settingsText = () => {
    const current = currentSettings();
    return JSON.stringify(
      {
        room: id,
        settingsVersion: 1,
        ...current,
        factors: Object.fromEntries(
          KNOB_NAMES.map((name) => [
            name,
            knobFactor(name, current.knobs[name]),
          ]),
        ),
        preset: POOL_LOOKS[current.look],
        ingredients: {
          tiles: uniforms.tiles.value !== 0,
          water: water.visible,
          refraction: refraction.enabled,
          ao: ao.enabled,
          bloom: bloom.enabled,
          fog: scene.fog !== null,
          film: film.enabled,
        },
        poolLights: { lensBrightness: 5, haloWidth: 1.1 },
        rendering: { pixelRatio: renderer.getPixelRatio() },
        viewpoint: {
          x: camera.position.x / m,
          y: camera.position.y / m,
          z: camera.position.z / m,
          yaw: camera.rotation.y,
          pitch: camera.rotation.x,
          zoom: camera.zoom,
          fieldOfView: camera.fov,
        },
      },
      null,
      2,
    );
  };
  const copyOverlay = document.createElement('div');
  if (id === 'dev11') {
    copyOverlay.className = 'pool-settings-copy';
    copyOverlay.style.top = '112px';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copy settings';
    const copyStatus = document.createElement('span');
    copyStatus.setAttribute('role', 'status');
    copyOverlay.append(copyButton, copyStatus);
    canvas.parentElement?.append(copyOverlay);
    copyButton.addEventListener('click', async () => {
      copyButton.disabled = true;
      try {
        await navigator.clipboard.writeText(settingsText());
        copyStatus.textContent = 'Copied — paste into chat';
      } catch {
        copyStatus.textContent =
          'Could not copy. Allow clipboard access and try again.';
      } finally {
        copyButton.disabled = false;
      }
    });
  }

  // A development handle for the console: stand anywhere (metres), hold a
  // look or a knob, switch ingredients, read the frame's cost.
  let frameMs = 0;
  (window as unknown as { poolRoom: unknown }).poolRoom = {
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    looks: POOL_LOOK_ORDER,
    settings: () => JSON.parse(settingsText()),
    /** Hold a look, or null to follow the LOOK selector. */
    look(name: PoolLookId | null) {
      held.look = name ?? undefined;
    },
    /** Hold a knob at a share (0 to 1), or null to follow the lectern. */
    knob(name: keyof PoolKnobs, share: number | null) {
      if (share === null) delete held.knobs[name];
      else held.knobs[name] = share;
    },
    ingredients: Object.keys(ingredients),
    set(name: Ingredient, on: boolean) {
      ingredients[name](on);
    },
    stats: () => ({ frameMs: Math.round(frameMs * 10) / 10 }),
  };

  const resize = () => {
    const { width: w, height: h } = canvas.getBoundingClientRect();
    if (!w || !h) return;
    renderer.setSize(Math.round(w), Math.round(h), false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(Math.round(w), Math.round(h));
    // Occlusion is soft: half resolution is enough, and a quarter the cost.
    const pr = renderer.getPixelRatio();
    ao.setSize(Math.round((w * pr) / 2), Math.round((h * pr) / 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    if (last) frameMs += (time - last - frameMs) * 0.05;
    last = time;
    uniforms.time.value = time / 1000;
    film.uniforms.time.value = (time / 1000) % 100;
    walk.update(delta);
    if (id === 'PR_A' && !walk.following) {
      const nextZone =
        archedZoneAt(walk.walker.x / m, walk.walker.z / m) ??
        (dryPassageFloorAt(walk.walker.x / m, walk.walker.z / m) === null
          ? 'PR_A'
          : 'CR_A_UP');
      if (nextZone !== activeZone) {
        activeZone = nextZone;
        window.dispatchEvent(
          new CustomEvent('pool-plant:room-zone', { detail: nextZone }),
        );
      }
    }
    partAudio.listen(camera, m);
    portals.update(delta, walk.walker.x, walk.walker.z);
    parts.update(delta);
    apply();
    room.visible = !dryOnly;
    refraction.enabled = !dryOnly;
    composer.render(delta);
  });

  const dispose = () => {
    copyOverlay.remove();
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    composer.dispose();
    ao.dispose();
    refraction.dispose();
    bloom.dispose();
    target.dispose();
    (water.material as ShaderMaterial).dispose();
    flowMap.dispose();
    lightGlow.dispose();
    mirror.dispose();
    waterShape.dispose();
    environmentTarget?.dispose();
    pmrem.dispose();
    parts.dispose();
    for (const material of materials) material.dispose();
    room.traverse((o) => {
      if (o instanceof Mesh && o !== water) o.geometry.dispose();
    });
    if (id === 'PR_A')
      lectern.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
    disposeKit(kit, scene as unknown as Group);
    renderer.dispose();
    delete (window as unknown as { poolRoom?: unknown }).poolRoom;
  };
  return Object.assign(dispose, {
    setDryOnly(enabled: boolean) {
      dryOnly = enabled;
    },
    enter(previous: string | null) {
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}
