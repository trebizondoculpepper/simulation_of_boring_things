import { signal } from '@preact/signals-core';
import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Object3D } from 'three';
import {
  mergeTree,
  staticMergeEnabled,
} from '../../components/core/views/merge-static';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import {
  createPartSet,
  doorLatch,
  studioSwitch,
} from '../../components/core/parts/parts';
import type {
  StudioCapColour,
  StudioLedColour,
} from '../../components/industrial-control/views/studio-controls';
import {
  createRackCabinet,
  createRackUnit,
} from '../../components/industrial-control/views/rack-equipment';
import { createCharacterLcd } from '../../components/industrial-control/views/panel-instruments';

/**
 * What its switches do (Pool Plant: the whole plant, `world.ts`'s
 * `plant/full-off`, `plant/full-on` and `plant/slow-start`); `starting`
 * while a SLOW START is under way.
 */
export interface Scenarios {
  fullOff(): void;
  fullOn(): void;
  slowStart(): void;
  readonly starting: boolean;
  update(delta: number): void;
}

/** The cabinet, metres: a 42U rack, 600 mm wide and 800 mm deep. */
const UNITS = 42;
const WIDTH = 0.6;
const DEPTH = 0.8;
/** The control panel's bottom, in rack units: its 4U middle at about 1.52 m. */
const PANEL_AT = 32;
/**
 * The ground the cabinet stands on, for walking round it, metres: the box
 * round its turned footprint (its front at its origin, its door and
 * handle a little proud of it), standing at (x, z) turned by `yaw`.
 */
export function simulatorFootprint(x: number, z: number, yaw: number) {
  const corners = [-1, 1].flatMap((side) =>
    [0.07, -DEPTH - 0.02].map((depth) => {
      const cx = side * (WIDTH / 2 + 0.02);
      return {
        x: x + cx * Math.cos(yaw) + depth * Math.sin(yaw),
        z: z - cx * Math.sin(yaw) + depth * Math.cos(yaw),
      };
    }),
  );
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    maxX: Math.max(...corners.map((c) => c.x)),
    minZ: Math.min(...corners.map((c) => c.z)),
    maxZ: Math.max(...corners.map((c) => c.z)),
  };
}

type Act = Exclude<keyof Scenarios, 'starting' | 'update'>;

/**
 * The simulator's switches: Pool Plant keeps only its STATES row's FULL
 * OFF, FULL ON and SLOW START (`doc/reuse-inventory.md`).
 */
const GROUPS: readonly {
  title: string;
  switches: readonly {
    legend: string;
    cap: StudioCapColour;
    led: StudioLedColour;
    act: Act;
  }[];
}[] = [
  {
    title: 'STATES',
    switches: [
      { legend: 'FULL OFF', cap: 'red', led: 'white', act: 'fullOff' },
      { legend: 'FULL ON', cap: 'white', led: 'green', act: 'fullOn' },
      { legend: 'SLOW START', cap: 'white', led: 'green', act: 'slowStart' },
    ],
  },
];

/**
 * The Hyperplasc Scenario Simulator, by Neumann Dynamik: a modern 42U
 * rack cabinet, built as the dev3 gallery's are, behind a smoked perspex
 * door marked AUTHORISED PERSONNEL ONLY, opened by its swing handle.
 * Inside, at eye level, a 4U panel of TESTING SCENARIOS push
 * buttons sets the machine's state (`src/rendering/level0-scenarios.ts`);
 * the rest of the rack is the simulator's own equipment. Its controls
 * can be seen through the door but worked only with it open. Front faces
 * +z; metres; its origin on the floor under the middle of its front.
 */
export function createScenarioSimulator(kit: PanelKit, scenarios: Scenarios) {
  const group = new Group();
  group.name = 'Hyperplasc Scenario Simulator';
  const parts = createPartSet();
  const cabinet = createRackCabinet(kit, {
    units: UNITS,
    width: WIDTH,
    depth: DEPTH,
    colour: 'black',
    brand: 'neumann-dynamik',
    door: 'glass',
    glass: 'smoke',
    feet: 'levellers',
  });
  group.add(cabinet.group);
  // The simulator's own equipment, round its control panel.
  const fill: [number, Parameters<typeof createRackUnit>[1]][] = [
    [40, { u: 2, style: 'vented', colour: 'black' }],
    [
      37,
      {
        u: 3,
        style: 'display',
        colour: 'black',
        label: 'HYPERPLASC SCENARIO SIMULATOR',
      },
    ],
    [36, { u: 1, style: 'patch', colour: 'black' }],
    [28, { u: 4, style: 'drives', colour: 'black', label: 'SCENARIO STORE' }],
    [24, { u: 4, style: 'fans', colour: 'black' }],
    [20, { u: 4, style: 'handles', colour: 'black', label: 'HYPERPLASC CORE' }],
    [16, { u: 4, style: 'handles', colour: 'black', label: 'HYPERPLASC CORE' }],
    [12, { u: 4, style: 'vented', colour: 'black' }],
    [4, { u: 8, style: 'blank', colour: 'black' }],
    [
      1,
      { u: 3, style: 'handles', colour: 'black', label: 'POWER DISTRIBUTION' },
    ],
  ];
  const driveUnits: ReturnType<typeof createRackUnit>[] = [];
  const units = fill.flatMap(([at, options]) => {
    const unit = createRackUnit(kit, options);
    cabinet.mount(unit, at);
    if (options.style === 'drives') driveUnits.push(unit);
    // A patch panel is passive, and drive bays have their own activity
    // lights: neither needs a cluster of status lights over its own.
    return options.style === 'patch' || options.style === 'drives'
      ? []
      : [unit];
  });
  // Rows of tiny status LEDs on every unit, twinkling green and amber at
  // their own rates, as a busy rack of about 2015 does.
  const ledOn = {
    green: kitGlow(kit, '#3dff6a'),
    amber: kitGlow(kit, '#ffb21e'),
  };
  const ledOff = kitPaint(kit, '#1b1d1e');
  const ledShape = new BoxGeometry(0.0035, 0.0035, 0.0015);
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const leds: { led: Mesh; next: number; busy: number }[] = units.flatMap(
    (unit) =>
      Array.from({ length: 8 }, (_, i) => {
        const led = new Mesh(ledShape, ledOff);
        led.name = 'Simulator status LED';
        led.position.set(
          unit.faceWidth / 2 - 0.012 - (i % 4) * 0.008,
          unit.u * 0.0222 - 0.012 - Math.floor(i / 4) * 0.008,
          0.002,
        );
        unit.face.add(led);
        // Some blink with every access, some only now and then.
        return { led, next: 0, busy: 0.04 + random() * (i % 3 ? 0.25 : 1.5) };
      }),
  );
  // Each drive's own activity light flickers green and amber, quickly and
  // at random, as drives busy with random access do.
  for (const unit of driveUnits)
    unit.face.traverse((object) => {
      if (object.name !== 'Drive activity light') return;
      leds.push({
        led: object as Mesh,
        next: 0,
        busy: 0.03 + random() * 0.09,
      });
    });
  let clock = 0;
  const twinkle = (delta: number) => {
    clock += delta;
    for (const light of leds) {
      if (clock < light.next) continue;
      const roll = random();
      light.led.material =
        roll < 0.55 ? ledOn.green : roll < 0.85 ? ledOn.amber : ledOff;
      light.next = clock + light.busy * (0.5 + random());
    }
  };

  // The control panel, at eye level: TESTING SCENARIOS.
  const panel = createRackUnit(kit, {
    u: 4,
    style: 'blank',
    colour: 'charcoal',
    label: 'TESTING SCENARIOS',
  });
  cabinet.mount(panel, PANEL_AT);
  const controls = new Group();
  controls.name = 'Testing scenario controls';
  panel.face.add(controls);
  const title = createMicroLabel(kit, 'TESTING SCENARIOS', {
    height: 0.009,
    ink: '#e9edf0',
  });
  title.position.set(0, 0.075, 0.002);
  panel.face.add(title);
  // Studio switches, two years newer than the line-up's controls: a row
  // for each group, its name beside it, coloured caps that stand out
  // against the black rack, each LED showing its press; SLOW START's
  // stays lit while the start goes on.
  const lcd = createCharacterLcd(kit, { columns: 20, rows: 2, cell: 0.0034 });
  lcd.group.name = 'Scenario status LCD';
  lcd.group.position.set(0.165, 0.04, 0.002);
  // Keep the screen and its changing texture separate from static rack meshes.
  lcd.group.userData.live = true;
  panel.face.add(lcd.group);
  const statusLabel = createMicroLabel(kit, 'SCENARIO STATUS', {
    height: 0.004,
    ink: '#c9ced3',
  });
  statusLabel.position.set(0.165, 0.064, 0.002);
  panel.face.add(statusLabel);
  let status: readonly string[] = ['standing by', ''];
  let selected: Act | undefined;
  let statusWait = 0;
  const showStatus = (lines: readonly string[]) => {
    status = lines;
    lcd.show([...lines]);
  };
  showStatus(status);
  const startScenario = (act: Act, name: string) => {
    scenarios[act]();
    selected = act;
    statusWait = 1;
    showStatus(['running scenario:', name.toLowerCase()]);
  };
  const starting = signal(false);
  const pitch = 0.052;
  const rowPitch = 0.046;
  GROUPS.forEach((group, row) => {
    const y = 0.04 - row * rowPitch;
    const caption = createMicroLabel(kit, group.title, {
      height: 0.0055,
      ink: '#c9ced3',
    });
    caption.position.set(-0.165, y, 0.002);
    panel.face.add(caption);
    group.switches.forEach((spec, i) => {
      const button = parts.add(
        studioSwitch(kit, {
          name: `${spec.legend.replace('\n', ' ')} ${group.title.toLowerCase()} switch`,
          legend: spec.legend,
          led: spec.led,
          cap: spec.cap,
          lamp: spec.act === 'slowStart' ? starting : undefined,
          action: () => startScenario(spec.act, spec.legend.replace('\n', ' ')),
        }),
      );
      button.object.position.set(-0.09 + i * pitch, y, 0.002);
      controls.add(button.object);
    });
  });

  // The door: smoked perspex and its swing handle.
  const door = cabinet.door!;
  const sign = (
    text: string,
    height: number,
    ink: string,
    plate: string,
    y: number,
  ) => {
    const label = createMicroLabel(kit, text, { height, ink, plate });
    label.position.set(door.width / 2, y, 0.012);
    door.hinge.add(label);
  };
  sign(
    'HYPERPLASC SCENARIO SIMULATOR',
    0.02,
    '#e9edf0',
    '#1d1e20',
    door.middle + 0.86,
  );
  sign(
    'AUTHORISED PERSONNEL ONLY',
    0.018,
    '#151515',
    '#f2c418',
    door.middle - 0.2,
  );
  // A plain door: no lock, just its swing handle.
  door.lock.visible = false;
  const open = signal(false);
  // The door's latch works through its swing handle.
  const latch = doorLatch(kit, {
    name: 'Scenario simulator door',
    material: kitPaint(kit, '#18191a'),
    bound: {
      get value() {
        return open.value;
      },
      set: (value: boolean) => (open.value = value),
    },
  });
  latch.object.visible = false;
  latch.object.position.copy(door.handle.position);
  door.hinge.add(latch.object);
  // A chrome pull handle on two standoffs, on the door's free edge at
  // about hand height, so the door plainly opens there.
  const chrome = kitPaint(kit, '#d9dcde', 0.9);
  const pull = new Group();
  pull.name = 'Scenario simulator door pull';
  pull.position.set(door.width - 0.045, 1.1, 0.012);
  const bar = new Mesh(new CylinderGeometry(0.008, 0.008, 0.26, 16), chrome);
  bar.position.z = 0.04;
  pull.add(bar);
  for (const y of [-0.11, 0.11]) {
    const post = new Mesh(new CylinderGeometry(0.006, 0.006, 0.04, 12), chrome);
    post.rotation.x = Math.PI / 2;
    post.position.set(0, y, 0.02);
    pull.add(post);
  }
  door.hinge.add(pull);
  // A use anywhere on the door, its pull, handle, frame or glass, opens it
  // or shuts it.
  parts.add({
    ...latch,
    uses: new Map([[door.hinge, () => void latch.door.flip()]]),
  });

  // For speed, its still meshes are merged (`mergeTree`): what a click
  // works (the door, each switch), what moves or twinkles stays apart.
  for (const light of leds) light.led.userData.live = true;
  const merged: Mesh[] = [];
  const batches: Mesh[] = [];
  if (staticMergeEnabled()) {
    const clickable = new Set<Object3D>(parts.uses.keys());
    const separate = (object: Object3D) =>
      !object.visible ||
      Boolean(object.userData.live || object.userData.portable) ||
      (clickable.has(object) && !object.userData.still) ||
      (object instanceof Mesh && Object.keys(object.userData).length > 0);
    const made = mergeTree(group, separate, 1, {
      originals: (meshes) => merged.push(...meshes),
      share: true,
      solid: true,
      fine: [0.03, 0.1],
    });
    for (const mesh of made) {
      const within = mesh.parent?.parent;
      if (within && (clickable.has(within) || within.userData.live))
        mesh.userData.control = true;
    }
    batches.push(...made);
  }

  // Its controls take clicks only with the door open (or swinging).
  let angle = 0;
  controls.raycast = () => (open.value || angle < -0.001 ? undefined : false);
  return {
    group,
    parts,
    /** Its still meshes merged away, for a development check. */
    merged,
    /** The meshes they were merged into, to cull (`detail`). */
    batches,
    /** Whether its door is open. */
    get open() {
      return open.value;
    },
    /** The two lines currently visible on the console's LCD. */
    get status() {
      return status;
    },
    update(delta: number) {
      starting.value = scenarios.starting;
      twinkle(delta);
      // (The room updates its parts, as every room does its machines'.)
      scenarios.update(delta);
      statusWait = Math.max(0, statusWait - delta);
      if (
        (selected === 'slowStart' && !scenarios.starting) ||
        (statusWait === 0 && (selected === 'fullOn' || selected === 'fullOff'))
      ) {
        selected = undefined;
        showStatus(['standing by', '']);
      }
      const target = open.value ? -1.9 : 0;
      angle += (target - angle) * Math.min(1, delta * 6);
      if (Math.abs(angle - target) < 0.001) angle = target;
      door.hinge.rotation.y = angle;
    },
    dispose() {
      parts.dispose();
    },
  };
}
