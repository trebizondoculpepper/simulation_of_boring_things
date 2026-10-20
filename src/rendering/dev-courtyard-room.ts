import { computed, effect, signal } from '@preact/signals-core';
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PointLight,
  SRGBColorSpace,
  Scene,
} from 'three';
import { Group } from 'three';
import type { Camera, WebGLRenderer } from 'three';
import { SKY_IDS, createSkyChanger, sunDirection } from '../game/skies';
import type { SkyId } from '../game/skies';
import { COURTYARD_HALF, createDevCourtyard } from '../scene/dev-courtyard';
import { turn } from '../game/courtyard-join';
import type { Anchor } from '../game/courtyard-join';
import { createSkyDome } from '../scene/sky-dome';
import {
  createMicroLabel,
  kitPaint,
} from '../toolkit/components/core/views/eighties-controls';
import type { PanelKit } from '../toolkit/components/core/views/eighties-controls';
import {
  potentiometer,
  pushButton,
  selector,
} from '../toolkit/components/core/parts/parts';
import { lightSwitch } from '../toolkit/components/architectural/parts/building-parts';
import { useEnvironment } from '../toolkit/components/core/parts/render-style';

/** The views to start from, by name (`?view=`), metres and radians. */
export const COURTYARD_VIEWS: Record<
  string,
  { x: number; z: number; yaw: number; pitch: number }
> = {
  start: { x: 0, z: COURTYARD_HALF - 2, yaw: 0, pitch: 0.1 },
  up: { x: 0, z: 0, yaw: 0, pitch: 1.2 },
  smoking: { x: -2, z: -2, yaw: -Math.PI * 0.75, pitch: 0 },
  pedestal: { x: 3, z: 3.9, yaw: 0, pitch: -0.75 },
};

/** Where the control pedestal stands, and which way it faces (to +z). */
const PEDESTAL = { x: 3, z: 3, yaw: 0 };
/** Its buttons: the owner's three ambient settings. */
const PEDESTAL_SKIES: readonly {
  id: SkyId;
  legend: string;
  colour: 'green' | 'black' | 'red' | 'blue';
}[] = [
  { id: 'overcast', legend: 'OVERCAST', colour: 'black' },
  { id: 'cumulus', legend: 'FLUFFY CLOUDS', colour: 'green' },
  { id: 'quake', legend: 'HELL', colour: 'red' },
  { id: 'night', legend: 'NIGHT', colour: 'blue' },
];

/**
 * dev_courtyard: the light well in the middle of the office block, open to
 * the sky (`src/scene/dev-courtyard.ts`), the dev room for skies, as a room
 * module: it has no renderer, canvas or controls of its own, but a scene
 * of its own (its daylight lights only it) that the corridor's room draws
 * after the corridor's, with the same camera, while the courtyard can be
 * seen (`src/rendering/dev-corridor-room.ts`). It stands where `place`
 * puts it (`src/game/courtyard-join.ts`), behind the corridor door in use.
 * Over it, a sky dome (`src/scene/sky-dome.ts`) shows the chosen sky
 * (`src/game/skies.ts`), turned with the courtyard so it looks the same
 * whichever door it is behind; the sun, its shadows and the light on the
 * courtyard follow it, and a change of sky takes a few seconds. A control
 * pedestal has a button for each of the owner's ambient settings,
 * OVERCAST, FLUFFY CLOUDS, HELL and NIGHT, and HELL's own knobs. Its four
 * spring doors lead to the corridor's four sides.
 */
export function createDevCourtyardRoom(
  renderer: WebGLRenderer,
  kit: PanelKit,
  m: number,
) {
  const scene = new Scene();
  const freeEnvironment = useEnvironment(renderer, scene, 0.15);
  /** Everything of the courtyard's, turned and placed by `place`. */
  const root = new Group();
  root.name = 'dev_courtyard root';
  scene.add(root);
  const courtyard = createDevCourtyard(kit);
  courtyard.group.scale.setScalar(m);
  root.add(courtyard.group);
  let placed: Anchor = { side: 'north', yaw: 0, x: 0, z: 0 };

  // ---- The sky and its light ----------------------------------------------
  const sky = createSkyDome(300 * m);
  scene.add(sky.dome);
  const changer = createSkyChanger(
    (new URLSearchParams(location.search).get('sky') as SkyId | null) ??
      'overcast',
  );
  if (!SKY_IDS.includes(changer.target)) changer.choose('overcast');
  const hemisphere = new HemisphereLight('#ffffff', '#5a574f', 1);
  const ambient = new AmbientLight('#ffffff', 0.2);
  const sun = new DirectionalLight('#ffffff', 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -14 * m,
    right: 14 * m,
    top: 14 * m,
    bottom: -14 * m,
    near: m,
    far: 60 * m,
  });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.02 * m;
  scene.add(hemisphere, ambient, sun, sun.target);
  const lightFor = (time: number, dt: number) => {
    let now = changer.step(dt);
    // HELL's own controls on the pedestal, as far as HELL is showing.
    if (now.quake > 0) {
      const q = now.quake;
      now = {
        ...now,
        layers: now.layers + (hellLayers() - now.layers) * q,
        layerSpeed: now.layerSpeed + (hellSpeed() - now.layerSpeed) * q,
      };
    }
    sky.set(now, dt, time, hellSpread() * now.quake);
    // The sun, turned with the courtyard, over its middle.
    const d = sunDirection(now);
    const flat = turn(placed.yaw, d.x, d.z);
    sun.target.position.set(placed.x * m, 0, placed.z * m);
    sun.position.set(
      (placed.x + flat.x * 30) * m,
      d.y * 30 * m,
      (placed.z + flat.z * 30) * m,
    );
    sun.color.setRGB(...now.sunColour, SRGBColorSpace);
    sun.intensity = Math.max(0, now.sun * Math.min(1, d.y * 6));
    hemisphere.color.setRGB(...now.ambient, SRGBColorSpace);
    hemisphere.groundColor.setRGB(
      now.ambient[0] * 0.45,
      now.ambient[1] * 0.42,
      now.ambient[2] * 0.38,
      SRGBColorSpace,
    );
    hemisphere.intensity = now.ambientLevel;
    ambient.intensity = 0.12 * now.ambientLevel;
    scene.environmentIntensity = 0.15 * now.ambientLevel;
  };

  // ---- The control pedestal ---------------------------------------------
  // A galvanised post on a base plate with a sloping steel desk on top,
  // standing in the courtyard, with a button for each of the owner's
  // ambient settings; the other skies are for development (`sky()`).
  const pedestal = new Group();
  pedestal.position.set(PEDESTAL.x * m, 0, PEDESTAL.z * m);
  pedestal.rotation.y = PEDESTAL.yaw;
  pedestal.scale.setScalar(m);
  root.add(pedestal);
  const galv = kitPaint(kit, '#a9aeab', 0.45);
  const desk = kitPaint(kit, '#3e4547', 0.5);
  const part = (
    geometry: BoxGeometry,
    paint: typeof galv,
    y: number,
    z = 0,
  ) => {
    const mesh = new Mesh(geometry, paint);
    mesh.position.set(0, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    pedestal.add(mesh);
    return mesh;
  };
  part(new BoxGeometry(0.4, 0.02, 0.4), galv, 0.01);
  part(new BoxGeometry(0.08, 0.95, 0.08), galv, 0.495);
  const top = new Group();
  top.position.set(0, 1.0, 0);
  // Its desk slopes up towards whoever stands at it, on its +z side.
  top.rotation.x = 0.45;
  pedestal.add(top);
  const slab = new Mesh(new BoxGeometry(0.62, 0.05, 0.42), desk);
  slab.castShadow = slab.receiveShadow = true;
  top.add(slab);
  const heading = createMicroLabel(kit, 'AMBIENT', {
    height: 0.028,
    ink: '#f0f0ea',
  });
  heading.rotation.x = -Math.PI / 2;
  heading.position.set(0, 0.027, -0.17);
  top.add(heading);
  PEDESTAL_SKIES.forEach(({ id, legend, colour }, i) => {
    const button = pushButton(kit, {
      name: `${legend} sky button`,
      legend,
      colour,
      head: 'flush',
      action: () => changer.choose(id),
    });
    button.object.rotation.x = -Math.PI / 2;
    button.object.position.set(-0.21 + i * 0.14, 0.026, -0.07);
    top.add(button.object);
    courtyard.parts.add(button);
  });
  // HELL's controls, a row below: how many layers of cloud (a three-way
  // selector), how far each layer's way is turned from the one beneath
  // (ALIGN: from all one way to each its own) and how much faster each
  // layer is than the one beneath (SPEED: 1 to 1.3 times).
  const hellHeading = createMicroLabel(kit, 'HELL', {
    height: 0.022,
    ink: '#e3a3c8',
  });
  hellHeading.rotation.x = -Math.PI / 2;
  hellHeading.position.set(0, 0.027, 0.045);
  top.add(hellHeading);
  const layersKnob = selector(kit, {
    name: 'HELL cloud layers selector',
    legend: 'LAYERS 1 2 3',
    positions: 3,
    initial: 2,
  });
  const alignKnob = potentiometer(kit, {
    name: 'HELL layer alignment knob',
    legend: 'ALIGN',
    steps: 10,
    initial: 0,
  });
  const speedKnob = potentiometer(kit, {
    name: 'HELL layer speed knob',
    legend: 'SPEED ×1–1.3',
    steps: 6,
    initial: 0.5,
  });
  [layersKnob, alignKnob, speedKnob].forEach((knob, i) => {
    knob.object.rotation.x = -Math.PI / 2;
    knob.object.position.set(-0.14 + i * 0.14, 0.026, 0.12);
    top.add(knob.object);
    courtyard.parts.add(knob);
  });
  const hellLayers = () => 1 + layersKnob.position.value;
  const hellSpread = () => alignKnob.share.value;
  const hellSpeed = () => 1 + 0.3 * speedKnob.share.value;

  // ---- The courtyard's lights ---------------------------------------------
  // A bulkhead on each wall and the lamp post, cool white LED, all on one
  // circuit, switched from beside any door: each switch flips them all, as
  // intermediate switching does. A few real lights, one a fitting.
  const switches = courtyard.switchSpots.map(() => signal(false));
  const lit = computed(() =>
    switches.reduce((on, s) => (s.value ? !on : on), true),
  );
  courtyard.switchSpots.forEach(({ wall, x, y }, i) => {
    const toggle = lightSwitch(kit, {
      name: 'courtyard lights switch',
      gangs: [
        {
          get value() {
            return switches[i].value;
          },
          set(on: boolean) {
            switches[i].value = on;
          },
        },
      ],
    });
    toggle.object.position.set(x, y, 0.02);
    wall.add(toggle.object);
    courtyard.parts.add(toggle);
  });
  const lamps = courtyard.lights.map((at) => {
    const light = new PointLight('#eef3ff', 0, 14 * m, 2);
    light.position.set(at.x * m, at.y * m, at.z * m);
    root.add(light);
    return light;
  });
  const stopLights = effect(() => {
    const on = lit.value;
    for (const lamp of courtyard.lamps) lamp.set(on);
    for (const light of lamps) light.intensity = on ? 2.4 * m * m : 0;
  });

  // ---- Where it stands ------------------------------------------------------
  /** Its door on each wall, with that door's side of the corridor. */
  const doors = courtyard.doors;
  /**
   * Stand it as `a` says. Its door on the side joined to the corridor is
   * not shown: the corridor's door is the door between them.
   */
  const place = (a: Anchor) => {
    placed = a;
    root.position.set(a.x * m, 0, a.z * m);
    root.rotation.y = a.yaw;
    sky.dome.rotation.y = a.yaw;
    for (const d of doors) {
      d.part.object.visible = d.side !== a.side;
      d.part.door.snapShut();
    }
  };

  return {
    scene,
    root,
    parts: courtyard.parts,
    doors,
    place,
    get placed() {
      return placed;
    },
    /** Run `delta` seconds on; the sky round `camera`. */
    update(delta: number, time: number, camera: Camera) {
      sky.dome.position.copy(camera.position);
      lightFor(time, delta);
      courtyard.parts.update(delta);
    },
    /** Development hooks (`devCourtyard`), less the walking ones. */
    hooks: {
      /** Change to a sky: overcast, cumulus, quake, clear, cirrus, storm, sunset, night. */
      sky(id: SkyId) {
        if (SKY_IDS.includes(id)) changer.choose(id);
      },
      skies: () => [...SKY_IDS],
      /** Whether the courtyard's lights are on, and switch them. */
      lights(on?: boolean) {
        if (on !== undefined && on !== lit.value)
          switches[0].value = !switches[0].value;
        return lit.value;
      },
      /**
       * Turn one of HELL's knobs (`layers`, `align` or `speed`) `steps`
       * detents, up (positive) or down, as clicks on it would.
       */
      turn(knob: 'layers' | 'align' | 'speed', steps: number) {
        const part = {
          layers: layersKnob,
          align: alignKnob,
          speed: speedKnob,
        }[knob];
        let use: ((direction?: number) => void) | undefined;
        part.object.traverse((o) => {
          use ??= courtyard.parts.uses.get(o);
        });
        for (let i = 0; i < Math.abs(steps); i++) use?.(Math.sign(steps));
      },
      /** HELL's controls: layers (1 to 3), alignment and speed (0 to 1 each). */
      hell: () => ({
        layers: hellLayers(),
        spread: hellSpread(),
        speed: hellSpeed(),
      }),
      /** The sky showing, or changing to. */
      showing: () => changer.target,
    },
    dispose() {
      courtyard.parts.dispose();
      stopLights();
      sky.dispose();
      freeEnvironment();
    },
  };
}
