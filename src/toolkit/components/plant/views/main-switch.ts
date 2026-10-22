import { computed, signal } from '@preact/signals-core';
import { BoxGeometry, Group, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel, kitPaint } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { MCC_BLUE, createWornPaint } from '../../core/views/worn-paint';
import {
  createPartSet,
  disconnectHandle,
  keySwitch,
  pilotLight,
} from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { createPanelMeter } from '../../industrial-control/views/panel-instruments';
import {
  createLouvres,
  createPowerMonitor,
} from '../../industrial-control/views/cabinet-fittings';
import {
  MAIN_SWITCH,
  mainSwitchShows,
} from '../../../gallery/logic/switch-room';
import type { LiveExhibit } from '../../../gallery/rooms/plant/exhibit';

/** The whole site's supply, as the switch shows and sets it. */
export interface MainsFeed {
  on(): boolean;
  set(on: boolean): void;
}

/** Unbound (a development room): a switch of its own. */
function standAlone(): MainsFeed {
  const on = signal(true);
  return { on: () => on.value, set: (v) => (on.value = v) };
}

/**
 * The main incoming switchboard: the whole site's supply, between the
 * supply company's cut-out and the main switchboard. One full-height
 * floor-standing section, built as the Encabulator's MAIN INCOMING
 * section is (`retro-encabulator-mcc.ts`, adapted: see
 * `doc/reuse-inventory.md`): folded steel in worn pale blue on a kicked
 * base channel, wireway covers top and bottom, a vertical wireway on its
 * right, and three units behind fixed covers:
 *
 * - MAIN INCOMING: the incoming line voltages, phase to phase, on the
 *   supply company's side, so live whatever the switch;
 * - MAIN SWITCH: the big red operating handle, bound to the whole site's
 *   supply, a power monitor on its outgoing side, DANGER 400 VOLTS and a
 *   trapped-key interlock;
 * - DISTRIBUTION: SUPPLY, ON (red) and OFF (green) lamps, as UK
 *   switchgear has them, and its warning: it isolates the whole site.
 *
 * Voltara's. On the floor at the middle of its footprint, front +z.
 */
export function createMainSwitch(
  kit: PanelKit,
  feed: MainsFeed = standAlone(),
): LiveExhibit {
  const object = new Group();
  object.name = 'Main incoming switchboard';
  const { w: W, d: D, plinth: P, body: H, wireway: WW } = MAIN_SWITCH;
  const front = D / 2;
  let seed = 140;
  const worn = (
    width: number,
    height: number,
    wear: 'light' | 'heavy' = 'light',
  ) =>
    createWornPaint(kit, {
      colour: MCC_BLUE,
      width,
      height,
      seed: ++seed,
      wear,
    });
  const box = (
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    object.add(mesh);
    return mesh;
  };
  const label = (
    text: string,
    x: number,
    y: number,
    options: Parameters<typeof createMicroLabel>[2],
  ) => {
    const mesh = createMicroLabel(kit, text, options);
    mesh.position.set(x, y, front + 0.014);
    object.add(mesh);
    return mesh;
  };
  const paint = worn(W, H);
  const dark = kitPaint(kit, '#242529');
  // The base channel, kicked and scuffed; the folded steel case; the top trim.
  box(worn(W, P, 'heavy'), W + 0.01, P, D, 0, P / 2, 0);
  box(paint, W, H, D - 0.012, 0, P + H / 2, -0.006);
  box(worn(W, 0.05), W + 0.004, 0.05, D, 0, P + H - 0.025, 0);
  // The wireway covers top and bottom, the maker's plaque on the top one.
  for (const y of [P + WW / 2, P + H - WW / 2]) {
    box(worn(W - 0.025, WW - 0.01), W - 0.025, WW - 0.01, 0.012, 0, y, front);
    for (const x of [-W / 2 + 0.035, W / 2 - 0.035])
      box(dark, 0.008, 0.008, 0.006, x, y, front + 0.008);
  }
  const plaque = createBrandBadge(kit, 'voltara', {
    height: 0.026,
    ink: '#f0eee5',
    plate: '#202b32',
  });
  plaque.position.set(0, P + H - WW / 2, front + 0.0065);
  object.add(plaque);
  // The vertical wireway down its right.
  const channel = 0.105;
  box(
    worn(channel, H - 2 * WW),
    channel - 0.012,
    H - 2 * WW - 0.01,
    0.012,
    W / 2 - channel / 2 - 0.006,
    P + H / 2,
    front,
  );
  // The three units, top to bottom, behind fixed covers.
  const faceW = W - channel - 0.02;
  const cx = -channel / 2;
  const space = (H - 2 * WW) / 12;
  let top = P + H - WW;
  const units = (
    [
      ['MAIN INCOMING\n400 V 3 PH 50 Hz', 2],
      ['MAIN SWITCH\n1600 A', 6],
      ['DISTRIBUTION\nTO MAIN SWITCHBOARD', 4],
    ] as const
  ).map(([name, spaces]) => {
    const h = spaces * space;
    const y = top - h / 2;
    top -= h;
    box(worn(faceW, h - 0.006), faceW, h - 0.006, 0.012, cx, y, front);
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        box(
          dark,
          0.01,
          0.01,
          0.004,
          cx + sx * (faceW / 2 - 0.02),
          y + sy * (h / 2 - 0.02),
          front + 0.008,
        );
    label(name, cx, y + h / 2 - 0.05, {
      height: 0.016,
      ink: '#f1ecdc',
      plate: '#1d1f22',
    });
    return { y, h };
  });
  const parts = createPartSet();
  const mount = <Q extends Part>(part: Q, x: number, y: number, scale = 1) => {
    parts.add(part);
    part.object.position.set(x, y, front + 0.012);
    part.object.scale.setScalar(scale);
    object.add(part.object);
    return part;
  };
  const put = (o: Object3D, x: number, y: number) => {
    o.position.set(x, y, front + 0.012);
    object.add(o);
    return o;
  };
  const on = signal(feed.on());
  const shows = computed(() => mainSwitchShows(on.value));

  // MAIN INCOMING: the line voltages, on the supply's side.
  const meters = ['L1-L2', 'L2-L3', 'L3-L1'].map((pair, k) => {
    const meter = createPanelMeter(kit, `V  ${pair}`, {
      width: 0.08,
      scaleMax: 500,
    });
    put(meter.group, cx - 0.17 + k * 0.17, units[0].y - 0.03);
    return meter;
  });

  // MAIN SWITCH: its handle, bound to the whole site's supply.
  const main = units[1];
  mount(
    disconnectHandle(kit, {
      colour: 'red',
      initial: feed.on() ? 'on' : 'off',
      bound: {
        get value() {
          return feed.on() ? ('on' as const) : ('off' as const);
        },
        set: (p: 'on' | 'off' | 'tripped') => feed.set(p === 'on'),
      },
      name: 'Main incoming switch',
    }),
    cx + faceW / 2 - 0.1,
    main.y + 0.05,
    1.6,
  );
  const monitor = createPowerMonitor(kit);
  monitor.group.scale.setScalar(1.3);
  put(monitor.group, cx - 0.14, main.y + main.h / 2 - 0.17);
  const danger = createMicroLabel(kit, 'DANGER\n400 VOLTS', {
    height: 0.016,
    ink: '#ffffff',
    plate: '#c42a1e',
  });
  put(danger, cx - 0.14, main.y - 0.06);
  mount(
    keySwitch(kit, { initial: true, name: 'Trapped key interlock' }),
    cx - 0.14,
    main.y - 0.2,
    1.3,
  );
  label('TRAPPED KEY INTERLOCK', cx - 0.14, main.y - 0.26, {
    height: 0.01,
    ink: '#151515',
  });
  put(createLouvres(kit, 0.36, 0.1, paint), cx, main.y - main.h / 2 + 0.09);

  // DISTRIBUTION: its lamps and its warning.
  const dist = units[2];
  (
    [
      ['SUPPLY', 'white', computed(() => shows.value.supply)],
      ['ON', 'red', computed(() => shows.value.on)],
      ['OFF', 'green', computed(() => shows.value.off)],
    ] as const
  ).forEach(([legend, colour, drive], i) =>
    mount(
      pilotLight(kit, {
        colour,
        legend,
        drive,
        pushToTest: false,
        name: `Main switch ${legend} lamp`,
      }),
      cx - 0.15 + i * 0.15,
      dist.y + 0.06,
      1.2,
    ),
  );
  label('MAIN SWITCH\nISOLATES THE WHOLE SITE', cx, dist.y - 0.12, {
    height: 0.02,
    ink: '#151515',
    plate: '#f2c618',
  });

  let clock = 0;
  return {
    object,
    parts,
    update(delta: number) {
      clock += delta;
      on.value = feed.on();
      const s = shows.value;
      meters.forEach((m, k) => {
        m.set((400 + Math.sin(clock * 0.7 + k * 2.1) * 1.5) / 500);
        m.update(delta);
      });
      const volts = s.volts ? s.volts + Math.sin(clock) * 1.5 : 0;
      const amps = s.on
        ? 620 + 18 * Math.sin(clock * 0.29) + 7 * Math.sin(clock * 0.93)
        : 0;
      monitor.show(
        volts,
        amps,
        (Math.sqrt(3) * volts * amps * 0.9) / 1000,
        true,
      );
    },
    dispose() {
      parts.dispose();
    },
  };
}
