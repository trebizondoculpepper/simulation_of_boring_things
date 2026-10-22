import { computed, signal } from '@preact/signals-core';
import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import {
  createPartSet,
  disconnectHandle,
  pilotLight,
} from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import { plantTools } from './plant-tools';
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
 * The main incoming switch-disconnector, after the ABB OT1600 in its
 * steel enclosure: the whole site's supply, between the supply company's
 * cut-out and the main switchboard. A big red rotary handle on a yellow
 * plate, lockable off; SUPPLY, ON (red) and OFF (green) lamps; the
 * outgoing voltmeter; and the warnings: DANGER 400 VOLTS, and MAIN
 * SWITCH: ISOLATES THE WHOLE SITE. Voltara's. Wall-mounted, its middle
 * at the origin, its front +z.
 */
export function createMainSwitch(
  kit: PanelKit,
  feed: MainsFeed = standAlone(),
): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Main incoming switch';
  const L = brandLivery(kit, 'voltara');
  const { w, h, d } = MAIN_SWITCH;
  t.box(object, L.paint.casing, w, h, d - 0.02, 0, 0, (d - 0.02) / 2);
  // The door, a seam round it, its hinges on the left.
  const face = d;
  t.box(object, L.paint.casing, w - 0.03, h - 0.03, 0.02, 0, 0, face - 0.01);
  for (const y of [h / 2 - 0.15, -h / 2 + 0.15])
    t.box(
      object,
      t.paint('#2b2e30', 0.5),
      0.02,
      0.06,
      0.03,
      -w / 2 + 0.01,
      y,
      face,
    );
  t.box(
    object,
    L.paint.main,
    w - 0.03,
    0.06,
    0.004,
    0,
    h / 2 - 0.05,
    face + 0.002,
  );
  const mark = createBrandBadge(kit, 'voltara', {
    height: 0.03,
    plate: '#eceee8',
  });
  mark.position.set(-w / 2 + 0.12, h / 2 - 0.05, face + 0.005);
  object.add(mark);
  // The warnings, printed on the door.
  const sign = (
    lines: readonly string[],
    y: number,
    sw: number,
    sh: number,
    ground: string,
    ink: string,
  ) => {
    const s = t.printed(
      sw,
      sh,
      (c, cw, ch) => {
        c.fillStyle = ground;
        c.fillRect(0, 0, cw, ch);
        c.fillStyle = ink;
        c.textAlign = 'center';
        c.font = `bold ${ch / (lines.length + 1)}px sans-serif`;
        lines.forEach((line, i) =>
          c.fillText(line, cw / 2, (ch * (i + 1)) / (lines.length + 0.6)),
        );
      },
      512,
    );
    s.mesh.position.set(0, y, face + 0.004);
    object.add(s.mesh);
  };
  sign(
    ['MAIN SWITCH', 'ISOLATES THE WHOLE SITE'],
    0.38,
    0.5,
    0.1,
    '#f2f2ee',
    '#111',
  );
  sign(['DANGER  400 VOLTS'], -0.44, 0.4, 0.07, '#f2d23a', '#111');
  // The handle on its yellow plate, bound to the site's supply.
  const parts = createPartSet();
  const mount = <P extends Part>(part: P, x: number, y: number, scale = 1) => {
    parts.add(part);
    part.object.position.set(x, y, face + 0.004);
    part.object.scale.setScalar(scale);
    object.add(part.object);
    return part;
  };
  t.box(
    object,
    t.paint('#f2c51a', 0.5),
    0.26,
    0.26,
    0.004,
    0,
    -0.12,
    face + 0.002,
  );
  mount(
    disconnectHandle(kit, {
      style: 'rotary',
      initial: feed.on() ? 'on' : 'off',
      bound: {
        get value() {
          return feed.on() ? ('on' as const) : ('off' as const);
        },
        set: (p: 'on' | 'off' | 'tripped') => feed.set(p === 'on'),
      },
      name: 'Main incoming switch',
    }),
    0,
    -0.12,
    1.8,
  );
  // Its lamps and the voltmeter, above the handle.
  const on = signal(feed.on());
  const shows = computed(() => mainSwitchShows(on.value));
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
      -0.2 + i * 0.2,
      0.22,
      0.9,
    ),
  );
  const volts = createDialGauge(kit, {
    dia: 0.11,
    max: 500,
    unit: 'V',
    legend: 'VOLTS',
    flutter: 0.002,
  });
  volts.group.position.set(0.22, -0.12, face + 0.004);
  volts.group.traverse((o: Object3D) => (o.userData.live = true));
  object.add(volts.group);
  return {
    object,
    parts,
    update(delta: number) {
      on.value = feed.on();
      volts.set(shows.value.volts);
      volts.update(delta);
    },
    dispose() {
      parts.dispose();
    },
  };
}
