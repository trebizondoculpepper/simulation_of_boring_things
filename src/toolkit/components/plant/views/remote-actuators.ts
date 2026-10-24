import { Group, MeshBasicMaterial } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import type { RemoteValveGeometry } from '../logic/remote-valve';

/**
 * A remotely operated valve at its real size (`logic/remote-valve.ts`): a
 * threaded ball valve with a small rotary actuator on its stem (water), or
 * a solenoid safety shut-off with its coil on top (gas), on a channel floor
 * stand. The water valve's actuator is the plant's one kind (the owner,
 * 2026-10-24), as the actuated butterfly valves have it: a spring-return
 * electric actuator by Grundflow in a grey housing, its domed position
 * indicator on top turning a quarter with the ball, its power lamp and red
 * override on its end. The gas valve's lamp shows open (green) or shut (red).
 */
export function createRemoteValve(
  kit: PanelKit,
  g: RemoteValveGeometry,
  { stand = true }: { stand?: boolean } = {},
) {
  const t = tools(kit);
  const group = new Group();
  group.name =
    g.medium === 'gas'
      ? 'Gas safety shut-off, solenoid'
      : `Motorised ball valve, ${g.actuator}`;
  const brass = t.paint('#ad8b4d', 0.48, 0.55);
  const cast = t.paint('#8c9599', 0.55, 0.45);
  const head =
    g.medium === 'gas'
      ? t.paint('#2a2f31', 0.6)
      : t.paint('#6f7a82', 0.45, 0.35);
  const dark = t.paint('#25343a', 0.5);
  const galv = t.paint('#a9aeae', 0.45, 0.6);
  const { axis, length, body } = g;

  // The stand: a channel post on its plate, up to the body; none for a
  // valve set into its line, which its pipe carries.
  if (stand) {
    t.box(group, galv, 0.16, 0.01, 0.16, 0, 0.005, 0);
    t.box(
      group,
      galv,
      0.041,
      axis - body / 2,
      0.041,
      0,
      (axis - body / 2) / 2,
      0,
    );
  }

  if (g.medium === 'water') {
    // Hexagon ends, threaded onto the pipe, and the ball's housing.
    for (const x of [-1, 1])
      t.cyl(
        group,
        brass,
        g.od * 0.68,
        length * 0.22,
        x * length * 0.39,
        axis,
        0,
        'x',
        6,
      );
    t.cyl(group, brass, body / 2, length * 0.6, 0, axis, 0, 'x', 16);
    // The stem and the actuator's bracket.
    const base = g.head.min[1];
    t.cyl(group, dark, 0.009, base - axis, 0, (axis + base) / 2, 0, 'y', 8);
    t.box(group, galv, 0.05, 0.006, 0.05, 0, base - 0.003, 0);
  } else {
    // A cast body, square in section, with hexagon ends.
    t.box(group, cast, length * 0.7, body, body, 0, axis, 0);
    for (const x of [-1, 1])
      t.cyl(
        group,
        cast,
        g.od * 0.68,
        length * 0.15,
        x * length * 0.425,
        axis,
        0,
        'x',
        6,
      );
  }

  // The actuator or coil.
  const [x0, y0, z0] = g.head.min;
  const [x1, y1, z1] = g.head.max;
  if (g.head.shape === 'box')
    t.box(
      group,
      head,
      x1 - x0,
      y1 - y0,
      z1 - z0,
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      (z0 + z1) / 2,
    );
  else t.cyl(group, head, (x1 - x0) / 2, y1 - y0, 0, (y0 + y1) / 2, 0, 'y', 16);
  // Its cable gland (a plug, on a coil), and a stub of cable.
  const [gx, gy, gz] = g.gland.at;
  if (g.medium === 'gas')
    t.box(
      group,
      cast,
      0.03,
      0.032,
      g.gland.length,
      gx,
      gy,
      gz - g.gland.length / 2,
    );
  else
    t.cyl(
      group,
      dark,
      0.008,
      g.gland.length,
      gx,
      gy,
      gz - g.gland.length / 2,
      'z',
      8,
    );

  const water = g.medium === 'water';
  // The gas valve's maker's plate on its coil's side; the actuator's badge
  // on its housing's side, facing the way the valve faces (+x).
  const maker = water
    ? createBrandBadge(kit, 'grundflow', {
        height: Math.min(0.016, (y1 - y0) * 0.3),
        maxWidth: (z1 - z0) * 0.85,
      })
    : createMicroLabel(kit, 'GAS-SAFE NC', {
        height: 0.008,
        ink: '#f5f6ed',
        plate: '#25343a',
        maxWidth: 0.06,
      });
  maker.position.set(x1 + 0.001, (y0 + y1) / 2, (z0 + z1) / 2);
  maker.rotation.y = Math.PI / 2;
  group.add(maker);
  const lamp = new MeshBasicMaterial({ color: water ? '#1d2a1f' : '#7c2520' });
  kit.materials.push(lamp);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const span = Math.min(x1 - x0, z1 - z0);
  // The actuator's dome and its pointer, turning a quarter with the ball;
  // the gas valve's lamp on its coil's top.
  const pointer = new Group();
  let overrideButton: Object3D | null = null;
  if (water) {
    t.box(
      group,
      t.paint('#59636a', 0.5, 0.3),
      (x1 - x0) * 0.94,
      0.006,
      (z1 - z0) * 0.94,
      cx,
      y1 + 0.003,
      cz,
    );
    pointer.position.set(cx, y1 + 0.006, cz);
    pointer.userData.live = true;
    group.add(pointer);
    t.cyl(
      pointer,
      t.paint('#d8dcdf', 0.2, 0.1),
      span * 0.3,
      0.012,
      0,
      0.006,
      0,
      'y',
      16,
    );
    t.box(
      pointer,
      t.paint('#f2c230', 0.4),
      span * 0.5,
      0.004,
      span * 0.09,
      0,
      0.013,
      0,
    );
    // Its power lamp and red override, on its end over the stem.
    overrideButton = t.cyl(
      group,
      t.paint('#c42b23', 0.5),
      0.006,
      0.006,
      cx,
      (y0 + y1) / 2 - (y1 - y0) * 0.15,
      z1 + 0.003,
      'z',
      12,
    );
  }
  const indicator = water
    ? t.cyl(
        group,
        lamp,
        0.0035,
        0.003,
        cx + span * 0.25,
        (y0 + y1) / 2 + (y1 - y0) * 0.2,
        z1 + 0.0015,
        'z',
        10,
      )
    : t.cyl(group, lamp, 0.008, 0.004, 0, y1 + 0.002, cz, 'y', 12);
  indicator.userData.live = true;
  return {
    group,
    /** Where a local override button goes: on the head's end over the stem. */
    override: [0, (y0 + y1) / 2, z1 + 0.004] as const,
    /** The actuator's red override, drawn there (none on a gas valve). */
    overrideButton,
    /**
     * What it shows. The gas valve's lamp: green open, red shut, amber
     * while it moves. The actuator: its pointer at `position` (0 shut, 1
     * open; open or shut if not given), its power lamp lit while `powered`.
     */
    show(open: boolean, moving = false, position?: number, powered = true) {
      if (!water) {
        lamp.color.set(moving ? '#f0a830' : open ? '#50d879' : '#d24a38');
        return;
      }
      pointer.rotation.y = (1 - (position ?? (open ? 1 : 0))) * (Math.PI / 2);
      lamp.color.set(powered ? '#3cdc5a' : '#1d2a1f');
    },
  };
}

/** A motor-operated breaker; its auxiliary motor feed is distinct from the switched supply. */
export function createRemoteBreaker(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Voltara motor-operated breaker';
  const shell = t.paint('#353d42', 0.62);
  const face = t.paint('#c9c7ba', 0.7);
  t.box(group, shell, 0.46, 0.72, 0.27, 0, 0.88, 0);
  t.box(group, face, 0.35, 0.51, 0.012, 0, 0.94, 0.145);
  const title = createMicroLabel(kit, 'VOLTARA\nMOTOR BREAKER', {
    height: 0.018,
    ink: '#21292d',
    maxWidth: 0.3,
  });
  title.position.set(0, 1.09, 0.155);
  group.add(title);
  const lamp = new MeshBasicMaterial({ color: '#7c2520' });
  kit.materials.push(lamp);
  const indicator = t.cyl(group, lamp, 0.025, 0.008, 0, 0.89, 0.16, 'z', 12);
  indicator.userData.live = true;
  const status = createMicroLabel(kit, 'CLOSED / OPEN', {
    height: 0.014,
    ink: '#263238',
    maxWidth: 0.26,
  });
  status.position.set(0, 0.79, 0.155);
  group.add(status);
  return {
    group,
    show(closed: boolean) {
      lamp.color.set(closed ? '#50d879' : '#d24a38');
    },
  };
}
