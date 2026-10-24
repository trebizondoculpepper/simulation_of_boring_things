import { computed, signal } from '@preact/signals-core';
import type { ReadonlySignal, Signal } from '@preact/signals-core';
import { serviceAvailable } from '../../../../game/plant/services';
import {
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  BoxGeometry,
  ExtrudeGeometry,
  Path,
  Shape,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { worldStore } from '../../../save/world-store';
import { jacuzziRuns } from '../../../../game/world';
import { poolDepth } from '../../../../game/plant/pools';
import { jacuzziVisualVolume } from '../../logic/jacuzzi-water-level';
import {
  JACUZZI_CYCLE,
  JACUZZI_LEVEL_SWITCH,
} from '../../../../game/plant/jacuzzi';
import type { JacuzziAction } from '../../../../game/plant/jacuzzi';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { piezoButton } from '../../../components/core/parts/wet-parts';
import { partAudio } from '../../../components/core/audio/part-audio';
import {
  SPA_BLOWER,
  SPA_BUBBLES,
  SPA_JETS,
} from '../../../components/pool/audio/spa-sounds';
import { createBrandBadge } from '../../../components/core/views/brand-badge';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { METRE } from '../../../components/core/logic/units';
import { plantTools } from '../../../components/plant/views/plant-tools';
import {
  createPoolUniforms,
  createTileMaterial,
} from '../../../components/pool/views/pool-surfaces';
import {
  createDeckGully,
  createMainDrain,
  createOverflowGrating,
  createPoolLight,
  createWallInlet,
  fittingMaterials,
  place,
} from '../../../components/pool/views/pool-fittings';
import { rippleWater } from '../../views/round-room-light';
import { createInletStreams } from '../../views/inlet-streams';
import type { Inlet } from '../../views/inlet-streams';
import {
  createPartSet,
  pushButton,
} from '../../../components/core/parts/parts';
import {
  initialSpa,
  pressLight,
  startCycle,
  stopCycle,
  stepSpa,
} from '../../../components/pool/logic/spa-controller';
import {
  steppedTubHeightAtVolume,
  steppedTubPercentFull,
  steppedTubRadiusAtHeight,
  steppedTubVolumeAtHeight,
} from '../../../components/pool/logic/stepped-tub-volume';
import {
  initialShower,
  pressShower,
  running,
  SHOWER,
  stepShower,
} from '../../../components/pool/logic/shower';

/**
 * dev12's amenities beside the pool fittings: what the pool halls need
 * that is not a fitting in the pool's own walls, modelled here before it
 * goes into them. The pool-side shower (working: a press gives a timed
 * run), a cut-away of the walk-through footbath (POOL-04), and a jacuzzi
 * at true size (POOL-03) with its controller, which works as a spa's
 * does: the circulation and heater keep the water at its set point, the
 * jets and the air run a timed cycle from the rim's air switch or the
 * panel, the underwater light switches, and the emergency stop stops it
 * all.
 */

type Tools = ReturnType<typeof plantTools>;

/** The pools' tile, dry, as the fittings' samples have it. */
const dryTile = (kit: PanelKit, colour?: string, size?: number) => {
  const uniforms = createPoolUniforms(METRE, -100, []);
  uniforms.caustics.value = uniforms.reflected.value = 0;
  const material = createTileMaterial(uniforms, { colour, tile: size });
  kit.materials.push(material);
  return material;
};

/** A printed tag, facing +z at (x, y, z). */
function tag(
  kit: PanelKit,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
) {
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const mark = createMicroLabel(kit, line, {
      height: 0.024,
      ink: '#1f2b31',
      plate: '#eef0ea',
    });
    mark.position.set(x, y - i * 0.034, z);
    parent.add(mark);
  });
}

const stainless = (t: Tools) => t.paint('#c9cdcf', 0.25, 0.9);

// ---- The pool-side shower ----------------------------------------------------

/**
 * After Delabie's TEMPOSTOP shower panel: a brushed stainless panel on
 * the tiled wall, a fixed anti-vandal head angled down at its top, the
 * push button at chest height; behind it (not seen) the thermostatic
 * mixing valve. A press gives 30 s of water at 38 °C and it stops itself.
 */
function buildShower(kit: PanelKit): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Pool-side shower';
  const floor = -1.15;
  const steel = stainless(t);
  const tile = dryTile(kit);
  // The tiled wall and its floor, falling to a gully.
  t.box(object, tile, 1.2, 2.3, 0.04, 0, 0, 0.02);
  t.box(object, tile, 1.2, 0.03, 0.62, 0, floor + 0.015, 0.31);
  const m = fittingMaterials(kit);
  place(object, createDeckGully(t, m), 0, floor + 0.032, 0.42);
  // The panel and its head.
  t.box(object, steel, 0.2, 1.3, 0.05, 0, 0.5, 0.065);
  const head = t.cyl(object, steel, 0.045, 0.07, 0, 1.06, 0.12, 'z', 20);
  head.rotation.x = Math.PI / 2 + 0.5;
  const rose = t.cyl(
    object,
    t.paint('#8e9396', 0.4, 0.7),
    0.035,
    0.004,
    0,
    1.04,
    0.155,
    'z',
    20,
  );
  rose.rotation.x = Math.PI / 2 + 0.5;
  const badge = createBrandBadge(kit, 'certikind', { height: 0.022 });
  badge.position.set(0, 0.78, 0.091);
  object.add(badge);
  t.label(object, 'TEMPO 30 s · 38 °C', 0, 0.72, 0.091, 0.009);
  const parts = createPartSet();
  let state = initialShower();
  const on = signal(false);
  const button = parts.add(
    pushButton(kit, {
      colour: 'white',
      head: 'flush',
      legend: 'PUSH',
      name: 'Shower push button',
      action: () => {
        state = pressShower(state);
      },
    }),
  );
  button.object.position.set(0, 0.06, 0.091);
  object.add(button.object);
  tag(
    kit,
    object,
    'Push: 30 s at 38 °C\nthen it stops itself',
    0.42,
    0.1,
    0.041,
  );

  // The spray: drops thrown from the rose in a cone, falling to the floor.
  const count = 220;
  const drops = new InstancedMesh(
    new SphereGeometry(0.004, 5, 3).scale(1, 3, 1),
    new MeshStandardMaterial({
      color: '#dff4f6',
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
    }),
    count,
  );
  drops.frustumCulled = false;
  object.add(drops);
  const seeds = Array.from({ length: count }, () => ({
    phase: Math.random(),
    a: Math.random() * Math.PI * 2,
    spread: Math.sqrt(Math.random()) * 0.35,
  }));
  const fall = Math.sqrt((2 * (1.04 - floor)) / 9.81);
  const matrix = new Matrix4();
  const showDrops = (time: number) => {
    seeds.forEach((s, i) => {
      const age = ((time / fall + s.phase) % 1) * fall;
      // Out from the rose along its tilt, spread, and falling.
      const x = Math.cos(s.a) * s.spread * age * 1.4;
      const z = 0.155 + (0.45 + Math.sin(s.a) * s.spread) * age * 1.4;
      const y = 1.04 - 0.4 * age - 4.9 * age * age;
      matrix.makeTranslation(x, Math.max(floor + 0.01, y), z);
      drops.setMatrixAt(i, matrix);
    });
    drops.instanceMatrix.needsUpdate = true;
  };
  let time = 0;
  object.traverse((o) => (o.userData.live = true));
  return {
    object,
    parts,
    update(delta) {
      time += delta;
      state = stepShower(state, delta);
      on.value = running(state);
      drops.visible = on.value;
      if (on.value) showDrops(time);
    },
  };
}

export const SHOWER_EXHIBIT: PlantExhibit = {
  title: 'Pool-side shower',
  reference: `After Delabie's TEMPOSTOP push-button shower panel: ${SHOWER.run} s timed run, ${SHOWER.flow} l/min at ${SHOWER.mixed} °C`,
  size: { w: 1.2, d: 0.7, h: 2.3, mount: 'wall', y: 1.15 },
  build: buildShower,
};

// ---- The footbath, cut away ----------------------------------------------------

/**
 * A length of the footbath across the passage to the pools (POOL-04), cut
 * across so its section shows: the channel 1.5 m to wade and 0.15 m deep,
 * running from wall to wall; an overflow gutter under a grating at each
 * edge; the drain in its floor; the inlet low in the passage wall that
 * keeps it topped up with strongly chlorinated water, which goes to
 * waste rather than back to a pool.
 */
function buildFootbath(kit: PanelKit): Object3D {
  const t = plantTools(kit);
  const m = fittingMaterials(kit);
  const tile = dryTile(kit);
  const concrete = t.paint('#9a9a94', 0.9);
  const object = new Group();
  object.name = 'Footbath, cut away';
  const base = 0.35;
  const top = 0.6;
  const half = 0.75;
  const gutter = 0.12;
  const bed = top - 0.015 - 0.15;
  const gutterBed = top - 0.08;
  const z0 = -0.7;
  const z1 = 0.8;
  const d = z1 - z0;
  const zm = (z0 + z1) / 2;
  t.box(object, concrete, 2.6, base, 1.6, 0, base / 2, 0);
  const slab = (x0: number, x1: number, y: number) =>
    t.box(
      object,
      tile,
      x1 - x0,
      y - base,
      d,
      (x0 + x1) / 2,
      (y + base) / 2,
      zm,
    );
  slab(-1.3, -half - gutter, top);
  slab(half + gutter, 1.3, top);
  slab(-half - gutter, -half, gutterBed);
  slab(half, half + gutter, gutterBed);
  slab(-half, half, bed);
  // The passage wall behind, its foot below the channel.
  t.box(
    object,
    tile,
    2.6,
    top + 0.5 - base,
    0.1,
    0,
    (top + 0.5 + base) / 2,
    z0 - 0.05,
  );
  // The cut face: bare concrete, the channel's profile notched in it.
  const cut = (x0: number, x1: number, y: number) =>
    t.box(
      object,
      concrete,
      x1 - x0,
      y - base,
      0.004,
      (x0 + x1) / 2,
      (y + base) / 2,
      z1 + 0.002,
    );
  cut(-1.3, -half - gutter, top);
  cut(half + gutter, 1.3, top);
  cut(-half - gutter, -half, gutterBed);
  cut(half, half + gutter, gutterBed);
  cut(-half, half, bed);
  // The gratings, along the edges, and the water, out over them.
  for (const x of [-half - gutter / 2, half + gutter / 2]) {
    const grating = createOverflowGrating(t, m, d, gutter);
    place(object, grating, x, top, zm, Math.PI / 2);
  }
  const water = new Mesh(
    new CylinderGeometry(1, 1, 1, 4, 1).rotateY(Math.PI / 4),
    new MeshPhysicalMaterial({
      color: '#83d7d9',
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
    }),
  );
  water.scale.set((half + gutter) * Math.SQRT2, 0.002, (d / 2) * Math.SQRT2);
  water.position.set(0, top - 0.015, zm);
  object.add(water);
  // The drain in the channel's floor, and the inlet in the wall.
  const drain = createMainDrain(t, m);
  drain.scale.setScalar(0.45);
  place(object, drain, 0, bed + 0.001, zm);
  const inlet = createWallInlet(t, m);
  inlet.scale.setScalar(0.55);
  place(object, inlet, 0, bed + 0.08, z0);
  tag(
    kit,
    object,
    'Footbath: 1.5 m to wade, 0.15 m deep, wall to wall\nOverflow both edges · chlorinated · to waste',
    0,
    0.27,
    z1 + 0.006,
  );
  return object;
}

export const FOOTBATH_EXHIBIT: PlantExhibit = {
  title: 'Footbath, cut away',
  reference:
    'The walk-through footbath before the pools (POOL-04): 1.5 m to wade, 0.15 m deep, wall to wall, chlorinated water run to waste',
  size: { w: 2.6, d: 1.7, h: 1.15, mount: 'floor' },
  build: buildFootbath,
};

// ---- The jacuzzi's state, shared by the tub and its plate ---------------------

/**
 * The dev room's jacuzzi, shared by its two exhibits: the tub, which runs
 * it each frame (and starts it afresh when built), and the control plate
 * on the wall, whose switches act on it.
 */
/**
 * A development room's direct control of the tub's effects (dev35's
 * effects panel): its requested fill by volume, 0 empty to 1 full, which
 * the tub fills or drains toward, and its jets, bubbles and light each on
 * or off, past the spa's controller. The jets and bubbles are writable:
 * the tub's full-level interlock switches them off when it cuts them out.
 */
export interface SpaEffects {
  fillFraction: ReadonlySignal<number>;
  jets: Signal<boolean>;
  bubbles: Signal<boolean>;
  light: ReadonlySignal<boolean>;
}

const createSpaState = (effects?: SpaEffects) => ({
  state: initialSpa(36.5, 37),
  /** The simulated quantity; geometry and percentage are presentation values. */
  waterVolumeM3: 0,
  running: signal(false),
  light: signal(false),
  effects,
});
const spa = createSpaState();

/**
 * The world, where there is a page to keep it: the jacuzzi's jets and air
 * are its (`game/plant/jacuzzi.ts`), worked from this plate and from its
 * cabinet in the plant room alike, and the tub shows them.
 */
const jacuzziWorld = () =>
  typeof window === 'undefined' ? null : worldStore('dev');
const jacuzziAct = (action: JacuzziAction) =>
  jacuzziWorld()?.dispatch({ type: 'jacuzzi', action });

/**
 * Whether power reaches the jacuzzi's controls: its plant room's supply
 * (its switch-fuse, the switchboard's way, the site's main switch) and its
 * cabinet's isolator. Off, the plate's switches are dead and their rings
 * dark, and the tub's light is out. On its own, an exhibit, always.
 */
const jacuzziPowered = computed(() => {
  const w = jacuzziWorld()?.world.value;
  return (
    !w ||
    (serviceAvailable(w.plant, 'plant_pool_03', 'power') &&
      w.plant.isolators['Jacuzzi cabinet isolator'])
  );
});

// ---- The jacuzzi, on its stepped plinth -------------------------------------

/**
 * How fast a development room's tub fills through its jets, or drains,
 * m³/s: far quicker than a real tub's make-up, so its fill can be watched
 * in a minute or two.
 */
const DEMO_FILL_RATE = 0.025;

const TUB = {
  r: 1.2,
  rim: 0.9,
  seat: 0.57,
  below: 0.45,
  gutter: 0.2,
  /** The plinth: its top deck's half-width, and three steps down. */
  deck: 1.6,
  steps: 3,
  going: 0.2,
};

/**
 * A jacuzzi at true size (POOL-03's): a tiled tub 2.4 m across, 0.9 m
 * deep, its seat round the wall for eight, set into the deck, here the
 * top of a stepped tiled plinth, three steps up; deck-level, its water
 * spilling into a gutter under a ring of grating; eight jets at the small
 * of each back, air from the seat's edge and the floor, an underwater
 * light and twin drains. Made by Lidoluxe.
 *
 * It is worked from its control plate (`JACUZZI_PLATE_EXHIBIT`), which in
 * a hall is set into the wall by the tub or into one of the plinth's
 * treads, and here is on the room's wall. The heating and the
 * circulation are the plant's (`spa-controller.ts`), unseen.
 */
function buildJacuzzi(
  kit: PanelKit,
  spaState = spa,
  rearExtent?: number,
): LiveExhibit {
  const t = plantTools(kit);
  const m = fittingMaterials(kit);
  const object = new Group();
  object.name = 'Jacuzzi on its plinth';
  const surface = TUB.rim - 0.015;
  /** The tub's tiled floor, over its plinth's base. */
  const TUB_FLOOR = 0.005;
  const uniforms = createPoolUniforms(METRE, surface, [
    { minX: -TUB.r, maxX: TUB.r, minZ: -TUB.r, maxZ: TUB.r },
  ]);
  // For the room, to dim its water with the room's lights (`room-lights.ts`).
  object.userData.poolUniforms = uniforms;
  const tile = createTileMaterial(uniforms, { colour: '#cfe1e5', tile: 0.05 });
  tile.side = DoubleSide;
  kit.materials.push(tile);
  const dry = dryTile(kit, '#cfe1e5', 0.05);
  dry.side = DoubleSide;
  const seatTop = surface - TUB.below;
  const inner = TUB.r - TUB.seat;
  const outer = TUB.r + TUB.gutter;
  const gutterBed = TUB.rim - 0.15;
  const fillProfile = {
    floor: TUB_FLOOR,
    step: seatTop,
    rim: surface,
    lowerBottomRadius: inner - 0.05,
    lowerTopRadius: inner,
    upperBottomRadius: TUB.r - 0.03,
    upperTopRadius: TUB.r,
  };
  const capacity = steppedTubVolumeAtHeight(fillProfile, surface);

  // Three tiers around the tub. In POOL-03 the rear edge of every tier
  // runs into the west wall, leaving steps only at the front and sides.
  for (let k = 0; k < TUB.steps; k++) {
    const top = (TUB.rim / TUB.steps) * (TUB.steps - k);
    const half = TUB.deck + k * TUB.going;
    const back = rearExtent ?? half;
    const tier = new Shape();
    tier.moveTo(-back, -half);
    tier.lineTo(half, -half);
    tier.lineTo(half, half);
    tier.lineTo(-back, half);
    tier.closePath();
    const hole = new Path();
    hole.absarc(0, 0, outer, 0, Math.PI * 2, false);
    tier.holes.push(hole);
    object.add(
      new Mesh(
        new ExtrudeGeometry(tier, {
          depth: top,
          bevelEnabled: false,
          curveSegments: 72,
        })
          .rotateX(Math.PI / 2)
          .translate(0, top, 0),
        dry,
      ),
    );
  }
  // Inside, wet: the floor, the seat, the wall up to the gutter's kerb,
  // the gutter's floor and its outer wall up to the deck.
  object.add(
    new Mesh(
      new LatheGeometry(
        [
          [0, TUB_FLOOR],
          [fillProfile.lowerBottomRadius, TUB_FLOOR],
          [inner, seatTop],
          [fillProfile.upperBottomRadius, seatTop],
          [TUB.r, gutterBed],
          [outer, gutterBed],
          [outer, TUB.rim],
        ].map(([r, y]) => new Vector2(r, y)),
        72,
      ),
      tile,
    ),
  );
  // The grating over the gutter: white bars round the ring.
  const bars = Math.round((2 * Math.PI * (TUB.r + TUB.gutter / 2)) / 0.02);
  const bar = new BoxGeometry(TUB.gutter - 0.01, 0.025, 0.012);
  const grating = new InstancedMesh(bar, m.abs, bars);
  const placeBar = new Matrix4();
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * Math.PI * 2;
    const r = TUB.r + TUB.gutter / 2;
    placeBar
      .makeRotationY(-a)
      .setPosition(Math.cos(a) * r, TUB.rim - 0.0125, Math.sin(a) * r);
    grating.setMatrixAt(i, placeBar);
  }
  object.add(grating);
  const badge = createBrandBadge(kit, 'lidoluxe', { height: 0.06 });
  badge.position.set(0, TUB.rim - 0.15, TUB.deck + 0.002);
  object.add(badge);

  // Jets behind each place, the light, the drains.
  const jets: Object3D[] = [];
  const jetInlets: Inlet[] = [];
  const plume = new MeshStandardMaterial({
    color: '#f2fbfb',
    transparent: true,
    opacity: 0.35,
    roughness: 0.2,
  });
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const jet = createWallInlet(t, m);
    jet.position.set(Math.cos(a) * TUB.r, seatTop + 0.2, Math.sin(a) * TUB.r);
    jet.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    object.add(jet);
    // Filling, the water comes in through the jets: over the seat, while
    // the water is below it.
    jetInlets.push({
      x: jet.position.x,
      y: jet.position.y,
      z: jet.position.z,
      yaw: jet.rotation.y,
      ledge: { y: seatTop, reach: fillProfile.upperBottomRadius - inner },
    });
    // Its stream, while the jets run: a cone of white water off the wall.
    const stream = new Mesh(
      new CylinderGeometry(0.06, 0.015, 0.35, 12, 1, true)
        .rotateX(Math.PI / 2)
        .translate(0, 0, 0.18),
      plume,
    );
    stream.position.copy(jet.position);
    stream.rotation.y = jet.rotation.y;
    stream.visible = false;
    object.add(stream);
    jets.push(stream);
  }
  const lamp = createPoolLight(t, m);
  lamp.position.set(-inner, seatTop / 2, 0);
  lamp.rotation.y = Math.PI / 2;
  object.add(lamp);
  const glow = new PointLight('#cfeeff', 0, 3, 2);
  glow.position.set(-inner + 0.15, seatTop / 2, 0);
  object.add(glow);
  for (const z of [-0.3, 0.3]) {
    const drain = createMainDrain(t, m);
    drain.scale.setScalar(0.6);
    place(object, drain, 0, 0.006, z);
  }
  // The water, at the deck, out over the gutter.
  const water = new Mesh(
    new CylinderGeometry(outer, outer, 0.001, 72),
    new MeshPhysicalMaterial({
      color: '#83d7d9',
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      depthWrite: false,
    }),
  );
  water.position.y = surface;
  water.name = 'Jacuzzi water surface';
  water.renderOrder = 1;
  object.add(water);
  // The water coming in through the jets while the tub fills: an arc from
  // each jet out of the water, as the foot spa's inlets (`inlet-streams.ts`).
  const fillStreams = createInletStreams(jetInlets);
  object.add(fillStreams.group);
  rippleWater(water, uniforms);
  const waterMaterial = water.material as MeshPhysicalMaterial;

  // Air from the seat's front edge and the floor's ring, when it runs.
  const count = 300;
  const bubbles = new InstancedMesh(
    new SphereGeometry(0.012, 6, 4),
    new MeshStandardMaterial({
      color: '#f4fbfb',
      transparent: true,
      opacity: 0.75,
      roughness: 0.2,
    }),
    count,
  );
  bubbles.frustumCulled = false;
  object.add(bubbles);
  const seeds = Array.from({ length: count }, (_, i) => ({
    a: Math.random() * Math.PI * 2,
    r: (i % 2 ? TUB.r - 0.08 : inner + 0.05) + (Math.random() - 0.5) * 0.05,
    from: i % 2 ? seatTop : 0.02,
    phase: Math.random(),
    speed: 0.8 + Math.random() * 0.6,
  }));
  const matrix = new Matrix4();
  const showBubbles = (time: number, top = surface) => {
    seeds.forEach((q, i) => {
      // A source out of the water gives no bubbles.
      if (q.from >= top) {
        matrix.makeScale(0, 0, 0);
        bubbles.setMatrixAt(i, matrix);
        return;
      }
      const rise = (q.phase + (time * q.speed) / (top - q.from)) % 1;
      const k = 0.6 + rise * 1.2;
      const wobble = Math.sin(time * 9 + i) * 0.01;
      matrix
        .makeScale(k, k, k)
        .setPosition(
          Math.cos(q.a) * (q.r + wobble),
          q.from + rise * (top - q.from),
          Math.sin(q.a) * (q.r + wobble),
        );
      bubbles.setMatrixAt(i, matrix);
    });
    bubbles.instanceMatrix.needsUpdate = true;
  };

  // The spa's state, shared with its control plate on the wall: a new
  // tub starts it afresh.
  spaState.state = initialSpa(36.5, 37);
  spaState.waterVolumeM3 = capacity;

  let time = 0;
  let fillingUntil = 0;
  object.traverse((o) => (o.userData.live = true));
  // Its sounds, each held while its part runs: the blower from under the
  // deck, the jet pump's distant whine, and the bubbles from the water,
  // which follow the blower by a few seconds.
  const sounds = [
    {
      recipe: SPA_BLOWER,
      on: false,
      from: lamp,
      when: () => spaState.state.air > 0,
    },
    {
      recipe: SPA_JETS,
      on: false,
      from: water,
      when: () => spaState.state.jets > 0,
    },
    {
      recipe: SPA_BUBBLES,
      on: false,
      from: water,
      when: () => spaState.state.bubbling,
    },
  ];
  return {
    object,
    dispose() {
      for (const sound of sounds) partAudio.hold(sound, null);
      fillStreams.dispose();
    },
    update(delta) {
      time += delta;
      // A development room's fill knob is a target: the tub fills through
      // its jets, or drains, toward it.
      const fx = spaState.effects;
      const world = spaState === spa ? jacuzziWorld()?.world.value : undefined;
      let filling = false;
      if (fx) {
        const target =
          Math.max(0, Math.min(1, fx.fillFraction.value)) * capacity;
        const gap = target - spaState.waterVolumeM3;
        const step = DEMO_FILL_RATE * delta;
        filling = gap > 1e-6;
        spaState.waterVolumeM3 =
          Math.abs(gap) <= step
            ? target
            : spaState.waterVolumeM3 + Math.sign(gap) * step;
      } else if (world) {
        const volume = jacuzziVisualVolume(
          world.pools.pool_03.level,
          poolDepth('pool_03'),
          capacity,
        );
        if (volume > spaState.waterVolumeM3 + 1e-9) fillingUntil = time + 0.2;
        spaState.waterVolumeM3 = volume;
        filling = time < fillingUntil;
      }
      const waterVolume = spaState.waterVolumeM3;
      const percentFull = steppedTubPercentFull(fillProfile, waterVolume);
      const waterY = steppedTubHeightAtVolume(fillProfile, waterVolume);
      const wet = percentFull > 0;
      // The safety interlock: a level switch just under the overflow lip.
      // Short of it, the jets and bubbles cut out and cannot be started
      // (the building's tub has this from the world's, `jacuzzi.ts`).
      const full = waterY >= surface - JACUZZI_LEVEL_SWITCH;
      if (fx && !full) {
        if (fx.jets.peek()) fx.jets.value = false;
        if (fx.bubbles.peek()) fx.bubbles.value = false;
      }
      // The jets and air as the world runs them, whoever started them.
      if (world) {
        const runs = jacuzziRuns(world);
        spaState.state = {
          ...spaState.state,
          jets: runs.jets ? JACUZZI_CYCLE : 0,
          air: runs.air ? JACUZZI_CYCLE : 0,
        };
      }
      // A development room's effects, set directly.
      if (fx)
        spaState.state = {
          ...spaState.state,
          jets: fx.jets.value ? JACUZZI_CYCLE : 0,
          air: fx.bubbles.value ? JACUZZI_CYCLE : 0,
          light: fx.light.value,
        };
      const state = (spaState.state = stepSpa(spaState.state, delta));
      // The level is from the water's volume. The narrow lower basin rises
      // faster than the wider basin above the seat; the water surface
      // widens abruptly at the seat without jumping in height.
      fillStreams.update(delta, {
        filling,
        surfaceY: wet ? waterY : TUB_FLOOR,
        wet: wet ? 1 : 0,
      });
      water.visible = wet;
      water.position.y = waterY;
      const across =
        percentFull >= 100
          ? outer
          : steppedTubRadiusAtHeight(fillProfile, waterY);
      water.scale.set(across / outer, 1, across / outer);
      uniforms.waterY.value = wet ? waterY : -10;
      for (const sound of sounds) {
        const on = sound.when();
        if (on !== sound.on) {
          sound.on = on;
          partAudio.hold(sound, on ? sound.recipe : null, sound.from);
        }
      }
      spaState.running.value = state.jets > 0 || state.air > 0;
      // The building's jacuzzi's light is out while it has no power.
      spaState.light.value =
        state.light && (spaState !== spa || jacuzziPowered.value);
      for (const j of jets) {
        // Only under water: above it, a jet's stream is not a plume.
        j.visible = state.jets > 0 && waterY > j.position.y + 0.06;
        if (j.visible) j.scale.z = 0.85 + 0.15 * Math.sin(time * 23 + j.id);
      }
      bubbles.visible = state.bubbling && wet;
      if (bubbles.visible) showBubbles(time, waterY);
      const churn = (state.jets > 0 ? 1.2 : 0) + (state.bubbling ? 1.6 : 0);
      waterMaterial.normalScale.set(0.7 + churn, 0.7 + churn);
      glow.intensity = spaState.light.value ? 1.2 : 0;
    },
  };
}

/** The in-service jacuzzi has its rear plinth face buried in the room wall. */
export function buildWallBackedJacuzzi(
  kit: PanelKit,
  rearExtent: number,
): LiveExhibit {
  return buildJacuzzi(kit, spa, rearExtent);
}

export const JACUZZI_EXHIBIT: PlantExhibit = {
  title: 'Jacuzzi on a stepped plinth',
  reference:
    "POOL-03's tub at true size, 2.4 m across, 0.9 m deep, seat for eight, set into the deck of a stepped plinth (a design kept for another attraction); worked from its plate on the wall",
  size: { w: 5.4, d: 5.4, h: 1.0, mount: 'floor' },
  build: buildJacuzzi,
};

/**
 * The jacuzzi's control plate (Penfold Controls): a brushed stainless
 * plate set into the wall by the tub, three piezo switches in it
 * (`wet-parts.ts`), each ring lit while it applies. START runs the jets
 * and the air for ten minutes (a press while running starts the ten
 * minutes again); STOP stops them at once, and is the spa's emergency
 * stop; LIGHT switches the underwater light on and off.
 */
function buildJacuzziPlate(kit: PanelKit, spaState = spa): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Jacuzzi control plate';
  const W = 0.3;
  const H = 0.13;
  // Its back box, and the plate on it, a little proud of the wall.
  t.box(
    object,
    t.paint('#9a9fa1', 0.5, 0.4),
    W - 0.01,
    H - 0.01,
    0.026,
    0,
    0,
    0.013,
  );
  t.box(object, stainless(t), W, H, 0.004, 0, 0, 0.028);
  panelMakerMark(kit, object, {
    width: W,
    height: H,
    z: 0.0301,
    size: 0.012,
    inset: 0.014,
  });
  t.label(object, 'JACUZZI', -W / 2 + 0.035, H / 2 - 0.014, 0.0301, 0.008);
  const parts = createPartSet();
  (
    [
      [
        'start',
        'green',
        'START',
        () =>
          spaState === spa && jacuzziWorld()
            ? jacuzziAct({ act: 'start' })
            : (spaState.state = startCycle(spaState.state)),
        spaState.running,
      ],
      [
        'stop',
        'red',
        'STOP',
        () =>
          spaState === spa && jacuzziWorld()
            ? jacuzziAct({ act: 'stop' })
            : (spaState.state = stopCycle(spaState.state)),
        undefined,
      ],
      [
        'light',
        'white',
        'LIGHT',
        () => (spaState.state = pressLight(spaState.state)),
        spaState.light,
      ],
    ] as const
  ).forEach(([symbol, ring, legend, action, lit], i) => {
    const button = parts.add(
      piezoButton(kit, {
        symbol,
        ring,
        legend,
        // Dead without power: a press does nothing, no ring lights.
        action: () => {
          if (spaState !== spa || jacuzziPowered.value) action();
        },
        lit:
          lit &&
          computed(
            () => (spaState !== spa || jacuzziPowered.value) && lit.value,
          ),
        name: `Spa ${legend.toLowerCase()} switch`,
      }),
    );
    button.object.position.set(-0.09 + i * 0.09, 0.006, 0.03);
    object.add(button.object);
  });
  object.traverse((o) => (o.userData.live = true));
  return { object, parts };
}

export const JACUZZI_PLATE_EXHIBIT: PlantExhibit = {
  title: 'Jacuzzi control plate',
  reference:
    'Set into the wall by the tub: three IP68 piezo switches, START (10 min of jets and air), STOP (the emergency stop), LIGHT',
  size: { w: 0.4, d: 0.06, h: 0.2, mount: 'wall', y: 1.5 },
  build: buildJacuzziPlate,
};

export const AMENITY_EXHIBITS: readonly PlantExhibit[] = [
  SHOWER_EXHIBIT,
  JACUZZI_PLATE_EXHIBIT,
  FOOTBATH_EXHIBIT,
  JACUZZI_EXHIBIT,
];

/** A fresh tub and control plate using the same components, with private state. */
export function createJacuzziDemo(
  kit: PanelKit,
  effects?: SpaEffects,
  rearExtent?: number,
) {
  const state = createSpaState(effects);
  return {
    tub: buildJacuzzi(kit, state, rearExtent),
    plate: buildJacuzziPlate(kit, state),
  };
}
