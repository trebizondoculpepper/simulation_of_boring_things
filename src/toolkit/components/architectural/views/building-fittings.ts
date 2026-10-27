import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  SphereGeometry,
} from 'three';
import type { Material } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import { kitGlow } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import type { PanelKit } from '../../core/views/eighties-controls';
import { PLATE_WHITE, SANS, tools } from '../../core/views/fitting-tools';
import { SWITCH_LOCATOR } from '../logic/switch-locator';

/**
 * Views of a present-day English building's general fittings: light
 * switches, dimmers, pull cords and an occupancy sensor, sockets, a fused
 * spur and a floor box, the distribution board, the climate controls
 * (air-conditioning controller and cassette, thermostat, radiator, window
 * vent and blinds), an extractor fan, an access-controlled door and an
 * intercom. They only draw: `../parts/building-parts.ts` gives them their
 * behaviour.
 */

// ---- Lighting -----------------------------------------------------------

/**
 * A white plate switch of 1 to 3 rocker gangs, its rockers each `set`;
 * with `locators` (the default), a small amber locator lens under each
 * rocker, lit by its `glow` (0 to 1).
 */
export function createRockerPlate(
  kit: PanelKit,
  gangs: number,
  { locators = true }: { locators?: boolean } = {},
) {
  const t = tools(kit);
  const group = new Group();
  const width = gangs > 2 ? 0.146 : 0.086;
  t.box(group, t.paint(PLATE_WHITE, 0.35), width, 0.086, 0.009, 0, 0, 0.0045);
  const rockers = Array.from({ length: gangs }, (_, i) => {
    const x = (i - (gangs - 1) / 2) * (gangs > 2 ? 0.04 : 0.03);
    const pivot = new Group();
    pivot.position.set(x, 0, 0.009);
    group.add(pivot);
    const mesh = t.box(pivot, t.paint('#ecebe4', 0.3), 0.022, 0.044, 0.008);
    mesh.position.z = 0.003;
    // A 3 mm lens set in the plate under the rocker.
    const locator = locators
      ? t.led(group, SWITCH_LOCATOR.colour, 0.0015, x, -0.031, 0.0095)
      : null;
    return {
      mesh,
      set(on: boolean) {
        pivot.rotation.x = on ? -0.14 : 0.14;
      },
      glow(level: number) {
        locator?.set(level);
      },
    };
  });
  return { group, rockers };
}

/**
 * A metalclad grid switch plate, after MK's Metalclad Plus Grid Plus
 * (K3494ALM: four modules in an 86 × 146 mm zinc-grey steel plate on a
 * 38 mm metalclad box): a row of 25 × 59 mm grid modules, each a white
 * rocker or a secret-key switch, each labelled under it, with a title
 * strip across the top. A placeholder; the research is
 * `doc/research/warehouse-lighting-control.md`.
 */
export function createGridSwitchPlate(
  kit: PanelKit,
  modules: { legend: string; key?: boolean }[],
  title = '',
) {
  const t = tools(kit);
  const group = new Group();
  const zinc = t.paint('#a9aeaa', 0.45, 0.6);
  const width = modules.length > 2 ? 0.146 : 0.086;
  t.box(group, zinc, width - 0.006, 0.08, 0.038, 0, 0, 0.019);
  t.box(group, zinc, width, 0.086, 0.002, 0, 0, 0.039);
  // The pressed rim and dark grid yoke are visible around the modules.
  t.box(
    group,
    t.paint('#737a77', 0.55, 0.35),
    width - 0.01,
    0.066,
    0.001,
    0,
    0,
    0.0405,
  );
  for (const x of [-0.06015, 0.06015])
    if (width > 0.1) {
      t.cyl(
        group,
        t.paint('#d5d6d0', 0.3, 0.75),
        0.003,
        0.002,
        x,
        0,
        0.041,
        'z',
        10,
      );
      t.box(group, t.paint('#666a68'), 0.003, 0.0005, 0.0005, x, 0, 0.0425);
    }
  const white = t.paint(PLATE_WHITE, 0.35);
  const switches = modules.map((module, i) => {
    const x = (i - (modules.length - 1) / 2) * 0.026;
    t.box(group, white, 0.022, 0.05, 0.003, x, 0.004, 0.041);
    t.label(
      group,
      module.legend,
      x,
      -0.034,
      0.0405,
      0.0034,
      '#111111',
      '#f4f3ee',
    );
    const pivot = new Group();
    pivot.position.set(x, 0.004, 0.043);
    pivot.userData.live = true;
    group.add(pivot);
    if (module.key) {
      // The barrel stays put; only the key in it turns.
      t.cyl(
        group,
        t.paint('#c9c4ae', 0.3, 0.8),
        0.006,
        0.003,
        x,
        0.004,
        0.044,
        'z',
      );
      const bow = t.box(
        pivot,
        t.paint('#c5c7c8', 0.25, 0.9),
        0.0025,
        0.016,
        0.016,
        0,
        0,
        0.01,
      );
      return {
        mesh: bow,
        set(on: boolean) {
          pivot.rotation.z = on ? -Math.PI / 2 : 0;
        },
      };
    }
    const mesh = t.box(pivot, t.paint('#ecebe4', 0.3), 0.018, 0.04, 0.006);
    mesh.position.z = 0.002;
    return {
      mesh,
      set(on: boolean) {
        pivot.rotation.x = on ? -0.14 : 0.14;
      },
    };
  });
  if (title) t.label(group, title, 0, 0.037, 0.0405, 0.0034);
  return { group, switches };
}

/**
 * A high-bay presence detector, after CP Electronics' EBDHS-PRM in its
 * surface box: a white box 76 mm across and 65 mm deep, an 88 mm flange
 * under it and a faceted white dome 49 mm deep below that, with a small
 * red LED (licence: a walk-test LED that blinks when it sees someone). It
 * hangs from y = 0, facing down. A placeholder.
 */
export function createPresenceDetector(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const white = t.paint(PLATE_WHITE, 0.45);
  t.box(group, white, 0.076, 0.065, 0.076, 0, -0.0325, 0);
  t.cyl(group, white, 0.044, 0.004, 0, -0.067, 0, 'y', 24);
  const dome = new Mesh(
    new SphereGeometry(0.035, 16, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    t.paint('#f1f0ea', 0.3),
  );
  dome.scale.y = 49 / 35;
  dome.rotation.y = Math.PI / 16;
  dome.position.y = -0.069;
  group.add(dome);
  const led = t.led(group, '#ff2a1a', 0.002, 0.03, -0.0695, 0, 'y');
  return { group, set: led.set };
}

/**
 * A round outdoor bulkhead light, a placeholder after a common 280 mm IP65
 * LED bulkhead: a grey base and an opal polycarbonate diffuser behind a
 * cast guard, cool white when lit. Its back at z = 0, facing +z.
 */
export function createBulkheadLight(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint('#4d5356', 0.5), 0.14, 0.04, 0, 0, 0.02, 'z', 28);
  const diffuser = kitGlow(kit, '#eef3ff');
  t.cyl(group, diffuser, 0.115, 0.05, 0, 0, 0.065, 'z', 28);
  const guard = t.paint('#3a3f41', 0.5);
  for (const angle of [0, Math.PI / 2])
    t.box(group, guard, 0.24, 0.015, 0.012, 0, 0, 0.094).rotation.z = angle;
  const off = new Color('#9ea4a8');
  const on = new Color('#eef3ff');
  diffuser.color.copy(on);
  return {
    group,
    set(lit: boolean) {
      diffuser.color.copy(lit ? on : off);
    },
  };
}

/** A rotary dimmer on a plate: `set` its level, 0 to 10. */
export function createDimmerPlate(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.009, 0, 0, 0.0045);
  const knob = t.cyl(
    group,
    t.paint('#e9e8e1', 0.3),
    0.017,
    0.02,
    0,
    0,
    0.019,
    'z',
  );
  const mark = t.box(
    knob,
    t.paint('#8a8a84'),
    0.003,
    0.002,
    0.012,
    0,
    0.011,
    0,
  );
  mark.rotation.x = 0;
  return {
    group,
    knob,
    set(level: number) {
      knob.rotation.y = -((level / 10) * 1.6 * Math.PI - 0.8 * Math.PI);
    },
  };
}

/** A ceiling pull-cord switch: its box, cord and bobble; `pull` it. */
export function createPullSwitch(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.035, 0.03, 0, -0.015, 0);
  const cord = new Group();
  group.add(cord);
  t.cyl(cord, t.paint('#efefe8', 0.8), 0.0015, 1.2, 0, -0.63, 0, 'y', 6);
  const bobble = t.cyl(
    cord,
    t.paint('#f2f1ea', 0.4),
    0.012,
    0.05,
    0,
    -1.25,
    0,
    'y',
    12,
  );
  let dip = 0;
  return {
    group,
    bobble,
    pull() {
      dip = 1;
    },
    update(delta: number) {
      dip = Math.max(0, dip - delta * 4);
      cord.position.y = -Math.sin(dip * Math.PI) * 0.06;
    },
  };
}

/** A ceiling occupancy (PIR) sensor, its LED showing it sees someone. */
export function createOccupancySensor(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.05, 0.012, 0, -0.006, 0);
  const dome = new Mesh(
    new SphereGeometry(0.03, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    t.paint('#f6f5ef', 0.2),
  );
  dome.rotation.x = Math.PI;
  dome.position.y = -0.012;
  group.add(dome);
  const lamp = t.led(group, '#ff3b2a', 0.004, 0.038, -0.013, 0, 'y');
  return { group, set: lamp.set };
}

// ---- Power --------------------------------------------------------------

/** A twin switched socket with a tester plugged into each side. */
export function createTwinSocket(
  kit: PanelKit,
  { metalclad = false, testers = true } = {},
) {
  const t = tools(kit);
  const group = new Group();
  if (metalclad) {
    t.box(
      group,
      t.paint('#969da0', 0.55, 0.45),
      0.146,
      0.086,
      0.04,
      0,
      0,
      0.02,
    );
    for (const x of [-0.06, 0.06])
      t.cyl(
        group,
        t.paint('#c3c6c5', 0.3, 0.7),
        0.0028,
        0.002,
        x,
        0,
        0.051,
        'z',
      );
  }
  const front = new Group();
  front.position.z = metalclad ? 0.04 : 0;
  group.add(front);
  t.box(
    front,
    t.paint(metalclad ? '#a9afb0' : PLATE_WHITE, 0.35),
    0.146,
    0.086,
    0.01,
    0,
    0,
    0.005,
  );
  const sides = [-0.036, 0.036].map((x) => {
    for (const [w, h, dx, dy] of [
      [0.004, 0.009, 0, 0.004],
      [0.008, 0.004, -0.011, -0.012],
      [0.008, 0.004, 0.011, -0.012],
    ] as const)
      t.box(front, t.paint('#1b1b1b'), w, h, 0.002, x + dx, dy - 0.006, 0.0105);
    const pivot = new Group();
    pivot.position.set(x + 0.026, 0.026, 0.01);
    front.add(pivot);
    // The rocker rocks: not merged with the still parts (`mergeTree`).
    pivot.userData.live = true;
    const rocker = t.box(
      pivot,
      t.paint('#ecebe4', 0.3),
      0.012,
      0.02,
      0.006,
      0,
      0,
      0.003,
    );
    const flag = t.box(
      pivot,
      t.paint('#c4231c'),
      0.008,
      0.004,
      0.0008,
      0,
      0.005,
      0.0062,
    );
    // Shown only while switched on.
    flag.userData.live = true;
    // A plug-in socket tester: three LEDs that light when the socket is live.
    const tester = new Group();
    tester.position.set(x, -0.006, 0.01);
    tester.visible = testers;
    front.add(tester);
    t.box(tester, t.paint('#f2d33a', 0.4), 0.044, 0.05, 0.03, 0, 0, 0.015);
    const lamps = [-0.012, 0, 0.012].map((dx) =>
      t.led(tester, '#ffb020', 0.003, dx, 0.012, 0.0305),
    );
    return {
      rocker,
      set(on: boolean, live: boolean) {
        pivot.rotation.x = on ? -0.15 : 0.15;
        flag.visible = on;
        for (const lamp of lamps) lamp.set(live);
      },
    };
  });
  return { group, sides };
}

// The switched fused spur is a component of its own (`fused-spur.ts`).
export { createFusedSpur } from './fused-spur';

/** A flip-lid floor box flush in the floor, facing up; `set` it open. */
export function createFloorBox(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#9da3a4', 0.35, 0.6), 0.33, 0.004, 0.33, 0, 0.002, 0);
  t.box(group, t.paint('#141414', 0.9), 0.3, 0.003, 0.3, 0, 0.003, 0);
  const sockets = t.printed(
    0.15,
    0.09,
    (c, w, h) => {
      c.fillStyle = PLATE_WHITE;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1c1c1c';
      for (const cx of [w * 0.27, w * 0.73]) {
        c.fillRect(cx - 5, h * 0.3, 10, 22);
        c.fillRect(cx - 32, h * 0.65, 18, 9);
        c.fillRect(cx + 14, h * 0.65, 18, 9);
      }
    },
    256,
  );
  sockets.mesh.rotation.x = -Math.PI / 2;
  sockets.mesh.position.set(-0.05, 0.005, 0.05);
  group.add(sockets.mesh);
  const hinge = new Group();
  hinge.position.set(0, 0.006, -0.15);
  group.add(hinge);
  const lid = t.box(
    hinge,
    t.paint('#7f888b', 0.4),
    0.3,
    0.008,
    0.3,
    0,
    0,
    0.15,
  );
  return {
    group,
    lid,
    set(open: boolean) {
      hinge.rotation.x = open ? -1.8 : 0;
    },
  };
}

/**
 * A distribution board: its steel box and door, the main switch and a
 * breaker for each circuit, with their labels.
 */
/** Hager Invicta JK104B-format 125 A TPN enclosure: 465 W × 500 H × 132.5 D mm. */
export function createDistributionBoard(kit: PanelKit, circuits: string[]) {
  const t = tools(kit),
    group = new Group();
  const shell = t.paint('#d4d8d5', 0.55, 0.2);
  t.box(group, shell, 0.465, 0.5, 0.006, 0, 0, 0.003);
  for (const x of [-0.2295, 0.2295])
    t.box(group, shell, 0.006, 0.5, 0.1265, x, 0, 0.06925);
  for (const y of [-0.247, 0.247])
    t.box(group, shell, 0.453, 0.006, 0.1265, 0, y, 0.06925);
  const inside = new Group();
  group.add(inside);
  t.box(inside, t.paint('#929b99', 0.6), 0.427, 0.445, 0.004, 0, 0, 0.055);
  const handle = (x: number, y: number, red = false) => {
    const pivot = new Group();
    pivot.position.set(x, y, 0.075);
    pivot.userData.live = true;
    inside.add(pivot);
    t.box(
      pivot,
      t.paint('#e8e6db', 0.6),
      red ? 0.07 : 0.018,
      red ? 0.072 : 0.083,
      0.022,
      0,
      0,
      0.011,
    );
    const lever = t.box(
      pivot,
      t.paint(red ? '#b92d25' : '#24282a'),
      red ? 0.05 : 0.012,
      0.019,
      0.016,
      0,
      0,
      0.033,
    );
    let window: ReturnType<typeof t.paint> | undefined;
    if (!red) {
      // Contact-position window and the recessed test key of an RCBO.
      window = t.paint('#34664a');
      const flag = t.box(pivot, window, 0.009, 0.006, 0.001, 0, 0.029, 0.023);
      flag.userData.live = true;
    }
    return {
      lever,
      set(on: boolean) {
        lever.position.y = on ? 0.014 : -0.014;
        window?.color.set(on ? '#b93a31' : '#34664a');
      },
    };
  };
  const main = handle(-0.145, -0.13, true);
  t.label(inside, 'MAIN 125 A', -0.145, -0.19, 0.105, 0.004);
  const breakers = circuits.map((name, i) => {
    const x = -0.078 + (i % 12) * 0.0175;
    const y = 0.12 - Math.floor(i / 12) * 0.13;
    const breaker = handle(x, y);
    t.label(inside, name, x, y - 0.054, 0.105, 0.002);
    t.label(
      inside,
      ['B6', 'B32', 'B16', 'B6'][i % 4],
      x,
      y + 0.019,
      0.099,
      0.0018,
    );
    if (i === 0) {
      t.cyl(
        inside,
        t.paint('#ededdf'),
        0.003,
        0.002,
        x,
        y - 0.029,
        0.101,
        'z',
        12,
      );
      t.label(inside, 'T', x, y - 0.036, 0.102, 0.002);
    }
    return breaker;
  });
  for (const y of [-0.02, 0.205])
    t.box(
      inside,
      t.paint('#b0b5b3', 0.4, 0.7),
      0.39,
      0.018,
      0.006,
      0,
      y,
      0.105,
    );
  const cover = new Group();
  cover.position.set(-0.222, 0, 0.1255);
  group.add(cover);
  // It swings open: not merged with the still parts (`mergeTree`).
  cover.userData.live = true;
  const leaf = t.box(cover, shell, 0.444, 0.476, 0.014, 0.222, 0, 0);
  const latch = t.box(
    cover,
    t.paint('#51595b'),
    0.018,
    0.034,
    0.012,
    0.412,
    0,
    0.014,
  );
  // Its maker's logo, from the brand's one definition (dev8).
  const maker = createBrandBadge(kit, 'voltara', { height: 0.026 });
  maker.position.set(0.222, 0.17, 0.0075);
  cover.add(maker);
  t.label(cover, 'DB-T2  /  230–400 V', 0.222, 0.12, 0.008, 0.005);
  t.label(
    cover,
    'DANGER  ELECTRICITY',
    0.222,
    -0.13,
    0.008,
    0.005,
    '#252925',
    '#f0c940',
  );
  return {
    group,
    main,
    breakers,
    cover: leaf,
    latch,
    setOpen(open: boolean) {
      cover.rotation.y = open ? -1.85 : 0;
    },
  };
}

// ---- Climate ------------------------------------------------------------

/** An air-conditioning wall controller: LCD and four buttons. */
export function createAcController(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.12, 0.12, 0.022, 0, 0, 0.011);
  const screen = t.printed(0.09, 0.05, () => {}, 256, true);
  screen.mesh.position.set(0, 0.022, 0.0225);
  group.add(screen.mesh);
  const names = ['ON/OFF', 'MODE', '▼', '▲'] as const;
  const buttons = names.map((name, i) => {
    const x = -0.042 + i * 0.028;
    const b = t.box(
      group,
      t.paint('#d9d8d1', 0.3),
      0.022,
      0.012,
      0.006,
      x,
      -0.03,
      0.025,
    );
    t.label(group, name, x, -0.045, 0.0222, 0.004);
    return b;
  });
  let last = '';
  return {
    group,
    power: buttons[0],
    mode: buttons[1],
    down: buttons[2],
    up: buttons[3],
    set(
      on: boolean,
      mode: string,
      setpoint: number,
      room: number,
      running: boolean,
    ) {
      const text = `${on}|${mode}|${setpoint}|${room.toFixed(1)}|${running}`;
      if (text === last) return;
      last = text;
      const c = screen.context;
      const w = c.canvas.width;
      const h = c.canvas.height;
      c.fillStyle = on ? '#a9c7d8' : '#5d6b72';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#10232d';
      c.font = `bold ${h * 0.26}px monospace`;
      if (on) {
        c.fillText(`${mode.toUpperCase()}${running ? '  ~' : ''}`, 8, h * 0.3);
        c.font = `bold ${h * 0.42}px monospace`;
        c.fillText(`${setpoint.toFixed(1)}°`, 8, h * 0.75);
      }
      c.font = `${h * 0.2}px monospace`;
      c.fillText(`ROOM ${room.toFixed(1)}°`, w * 0.5, h * 0.9);
      screen.texture.needsUpdate = true;
    },
  };
}

/** A four-way ceiling cassette whose vanes swing open while it runs. */
export function createAcCassette(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#f0efe8', 0.4), 0.62, 0.03, 0.62, 0, -0.015, 0);
  t.box(group, t.paint('#c9c8c0', 0.5), 0.28, 0.005, 0.28, 0, -0.033, 0);
  const vanes = [0, 1, 2, 3].map((i) => {
    const pivot = new Group();
    const a = (i * Math.PI) / 2;
    pivot.position.set(Math.sin(a) * 0.23, -0.032, Math.cos(a) * 0.23);
    pivot.rotation.y = a;
    group.add(pivot);
    t.box(pivot, t.paint('#3d3f40', 0.5), 0.4, 0.004, 0.05, 0, 0, 0);
    return pivot;
  });
  let open = 0;
  let target = 0;
  return {
    group,
    set(running: boolean) {
      target = running ? 0.7 : 0;
    },
    update(delta: number) {
      open += (target - open) * Math.min(1, delta * 2);
      for (const vane of vanes) vane.rotation.x = open;
    },
  };
}

/** A dial room thermostat: its dial and its "calling for heat" lamp. */
export function createThermostat(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.cyl(group, t.paint(PLATE_WHITE, 0.4), 0.045, 0.025, 0, 0, 0.0125, 'z', 32);
  const dial = t.cyl(
    group,
    t.paint('#e3e2da', 0.3),
    0.036,
    0.012,
    0,
    0,
    0.031,
    'z',
    32,
  );
  t.box(dial, t.paint('#c4231c'), 0.003, 0.004, 0.026, 0, 0.007, 0.0);
  const face = t.printed(
    0.06,
    0.012,
    (c, w, h) => {
      c.fillStyle = PLATE_WHITE;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#333';
      c.font = `${h * 0.8}px ${SANS}`;
      c.fillText('5   10   15   20   25   30', 2, h * 0.85);
    },
    256,
  );
  face.mesh.position.set(0, 0.05, 0.002);
  group.add(face.mesh);
  const lamp = t.led(group, '#ff6a2a', 0.004, 0.032, -0.03, 0.026);
  return {
    group,
    dial,
    set(setpoint: number, calling: boolean) {
      dial.rotation.y = -(((setpoint - 5) / 25) * 1.6 - 0.8) * Math.PI;
      lamp.set(calling);
    },
  };
}

/** A panel radiator with a thermostatic valve; warms in colour as it heats. */
export function createRadiator(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const material = t.paint('#f2f1ea', 0.4);
  t.box(group, material, 1.0, 0.6, 0.08, 0, 0.45, 0.07);
  for (let x = -0.47; x <= 0.47; x += 0.05)
    t.box(group, material, 0.012, 0.58, 0.004, x, 0.45, 0.112);
  const head = t.cyl(
    group,
    t.paint('#f6f5ef', 0.4),
    0.025,
    0.07,
    0.55,
    0.22,
    0.07,
    'y',
    20,
  );
  t.cyl(
    group,
    t.paint('#c9c9c3', 0.3, 0.8),
    0.012,
    0.08,
    0.55,
    0.14,
    0.07,
    'y',
    10,
  );
  const marker = t.box(
    head,
    t.paint('#1b1b1b'),
    0.004,
    0.06,
    0.004,
    0,
    0,
    0.026,
  );
  void marker;
  const cold = new Color('#f2f1ea');
  const hot = new Color('#f7d2b8');
  return {
    group,
    head,
    set(valve: number, heat: number) {
      head.rotation.y = (valve / 5) * Math.PI * 1.5;
      (material as unknown as { color: Color }).color
        .copy(cold)
        .lerp(hot, heat);
    },
  };
}

/** A window with a top-hung opening vent on its restrictor, and blinds. */
export function createWindowWithVent(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const alu = t.paint('#5c6267', 0.45, 0.45);
  const glass = createPs1Material({
    color: '#a8b9bc',
    roughness: 0.05,
    transparent: true,
    opacity: 0.25,
  });
  kit.materials.push(glass);
  t.box(group, alu, 1.3, 0.06, 0.1, 0, 0, 0);
  t.box(group, alu, 1.3, 0.06, 0.1, 0, 1.6, 0);
  for (const x of [-0.62, 0.62]) t.box(group, alu, 0.06, 1.6, 0.1, x, 0.8, 0);
  t.box(group, alu, 1.3, 0.05, 0.1, 0, 1.2, 0);
  t.box(group, glass, 1.18, 1.15, 0.01, 0, 0.6, 0);
  const sky = kitGlow(kit, '#c9ccd0');
  t.box(group, sky, 1.3, 1.6, 0.01, 0, 0.8, -0.2);
  const hinge = new Group();
  hinge.position.set(0, 1.57, 0.02);
  group.add(hinge);
  const sash = t.box(hinge, alu, 1.18, 0.34, 0.05, 0, -0.18, 0);
  sash.material = alu;
  t.box(hinge, glass, 1.1, 0.28, 0.01, 0, -0.18, 0.01);
  const handle = t.box(
    group,
    t.paint('#d8d8d2', 0.3, 0.6),
    0.1,
    0.02,
    0.03,
    0,
    1.24,
    0.08,
  );
  // Vertical blinds in front.
  const slats: Group[] = [];
  for (let x = -0.58; x <= 0.58; x += 0.08) {
    const pivot = new Group();
    pivot.position.set(x, 0.85, 0.2);
    group.add(pivot);
    const slat = new Mesh(
      new BoxGeometry(0.089, 1.5, 0.003),
      createPs1Material({
        color: '#e6e2d4',
        roughness: 0.85,
        side: DoubleSide,
      }),
    );
    kit.materials.push(slat.material as Material);
    pivot.add(slat);
    slats.push(pivot);
  }
  const headrail = t.box(
    group,
    t.paint('#efeee6', 0.4),
    1.3,
    0.04,
    0.06,
    0,
    1.62,
    0.2,
  );
  return {
    group,
    handle,
    sash,
    headrail,
    slats,
    set(vent: boolean, blindsOpen: boolean) {
      hinge.rotation.x = vent ? -0.18 : 0;
      for (const slat of slats) slat.rotation.y = blindsOpen ? 1.4 : 0.05;
    },
  };
}

/** A wall extractor fan: grille and blades that spin while it runs. */
export function createExtractorFan(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.4), 0.16, 0.16, 0.04, 0, 0, 0.02);
  t.cyl(group, t.paint('#1b1b1b', 0.8), 0.06, 0.005, 0, 0, 0.03, 'z', 24);
  const rotor = new Group();
  rotor.position.z = 0.034;
  group.add(rotor);
  for (let i = 0; i < 5; i++) {
    const blade = t.box(
      rotor,
      t.paint('#d9d8d1', 0.5),
      0.012,
      0.05,
      0.002,
      0,
      0.028,
      0,
    );
    const holder = new Group();
    holder.rotation.z = (i / 5) * Math.PI * 2;
    holder.add(blade);
    rotor.add(holder);
  }
  for (let y = -0.05; y <= 0.05; y += 0.02)
    t.box(group, t.paint('#f0efe8', 0.4), 0.13, 0.006, 0.006, 0, y, 0.042);
  let speed = 0;
  let running = false;
  return {
    group,
    set(value: boolean) {
      running = value;
    },
    update(delta: number) {
      speed += ((running ? 20 : 0) - speed) * Math.min(1, delta * 0.8);
      rotor.rotation.z += speed * delta;
    },
  };
}

// ---- Access and welfare -------------------------------------------------

/**
 * An access controlled door: the leaf on its hinge, the maglock over it,
 * a card reader, a push-to-exit button and a green emergency door release.
 */
export function createAccessDoor(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  const frame = t.paint('#eeece4', 0.5);
  t.box(group, frame, 1.08, 0.06, 0.12, 0, 2.11, 0);
  for (const x of [-0.51, 0.51])
    t.box(group, frame, 0.06, 2.14, 0.12, x, 1.07, 0);
  t.box(group, t.paint('#1d2326', 0.6), 0.96, 2.08, 0.02, 0, 1.04, -0.05);
  const hinge = new Group();
  hinge.position.set(-0.48, 0, 0.04);
  group.add(hinge);
  const leaf = t.box(
    hinge,
    t.paint('#8f9aa0', 0.45, 0.2),
    0.93,
    2.04,
    0.045,
    0.465,
    1.02,
    0,
  );
  t.box(
    hinge,
    t.paint('#cfd2d2', 0.2, 0.9),
    0.14,
    0.022,
    0.05,
    0.8,
    1.02,
    0.05,
  );
  t.box(group, t.paint('#c9cccc', 0.3, 0.7), 0.3, 0.05, 0.05, 0.25, 2.05, 0.08);
  // The reader, the exit button and the release, beside the door.
  const reader = new Group();
  reader.position.set(0.75, 1.2, 0);
  group.add(reader);
  const readerBody = t.box(
    reader,
    t.paint('#1e2124', 0.4),
    0.08,
    0.12,
    0.025,
    0,
    0,
    0.0125,
  );
  const readerLamp = t.led(reader, '#ff3020', 0.006, 0, 0.04, 0.026);
  const greenLamp = t.led(reader, '#35e06a', 0.006, 0.02, 0.04, 0.026);
  t.label(reader, 'PRESENT CARD', 0, -0.03, 0.0255, 0.006, '#e8e8e2');
  const exitPlate = new Group();
  exitPlate.position.set(0.75, 1.0, 0);
  group.add(exitPlate);
  t.box(exitPlate, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.01, 0, 0, 0.005);
  const exitButton = t.cyl(
    exitPlate,
    t.paint('#2fa04a', 0.4),
    0.025,
    0.01,
    0,
    0.006,
    0.014,
    'z',
    24,
  );
  t.label(exitPlate, 'PUSH TO EXIT', 0, -0.032, 0.0105, 0.005);
  const release = new Group();
  release.position.set(0.75, 1.5, 0);
  group.add(release);
  t.box(release, t.paint('#1d8a43', 0.4), 0.09, 0.09, 0.05, 0, 0, 0.025);
  const releaseFace = t.printed(
    0.07,
    0.07,
    (c, w, h) => {
      c.fillStyle = '#eef0ee';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#1d8a43';
      c.textAlign = 'center';
      c.font = `bold ${w * 0.11}px ${SANS}`;
      c.fillText('EMERGENCY', w / 2, h * 0.3);
      c.fillText('DOOR', w / 2, h * 0.46);
      c.fillText('RELEASE', w / 2, h * 0.62);
      c.font = `${w * 0.08}px ${SANS}`;
      c.fillText('PUSH HERE', w / 2, h * 0.84);
    },
    128,
  );
  releaseFace.mesh.position.z = 0.0505;
  release.add(releaseFace.mesh);
  const releaseFlag = t.box(
    release,
    t.paint('#f2c618', 0.4),
    0.05,
    0.012,
    0.002,
    0,
    -0.022,
    0.052,
  );
  const releaseKey = t.cyl(
    release,
    t.paint('#1b1b1b', 0.5),
    0.004,
    0.004,
    0.036,
    -0.036,
    0.051,
    'z',
    10,
  );
  let angle = 0;
  let target = 0;
  return {
    group,
    leaf,
    reader: readerBody,
    exitButton,
    release: releaseFace.mesh,
    releaseKey,
    set(locked: boolean, open: boolean, broken: boolean) {
      readerLamp.set(locked && !open);
      greenLamp.set(!locked || open);
      target = open ? -1.3 : 0;
      releaseFlag.visible = broken;
      releaseFace.mesh.position.z = broken ? 0.047 : 0.0505;
    },
    update(delta: number) {
      angle += (target - angle) * Math.min(1, delta * 3);
      hinge.rotation.y = angle;
    },
  };
}

/** A door entry intercom: speaker grille and call button. */
export function createIntercom(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint('#c9cccc', 0.3, 0.7), 0.1, 0.18, 0.02, 0, 0, 0.01);
  for (let y = 0.03; y < 0.08; y += 0.01)
    t.box(group, t.paint('#2a2a2a'), 0.06, 0.004, 0.002, 0, y, 0.021);
  const button = t.cyl(
    group,
    t.paint('#d9d8d1', 0.3, 0.6),
    0.018,
    0.008,
    0,
    -0.04,
    0.024,
    'z',
    24,
  );
  t.label(group, 'RECEPTION', 0, -0.07, 0.021, 0.006);
  return { group, button };
}
