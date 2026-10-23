import { Group, Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';
import { beginPart } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPowerIsolator } from '../../industrial-control/views/panel-switchgear';
import { remoteValveGeometry } from '../logic/remote-valve';
import { createRemoteValve } from './remote-actuators';

/**
 * The fittings the plumber sets into a line
 * (`doc/prompts/018-plumber-valves-and-isolators.md`), each at its real
 * size against its pipe, drawn in its own frame (the pipe along x through
 * the origin) and turned into place by `placeFitting`:
 *
 * - a lever ball valve, worked by hand: its lever yellow on gas, red on
 *   heating, blue on water;
 * - the same with a chain wheel and a hand chain down toward the floor,
 *   for one out of reach;
 * - a motorised valve (`remote-valve.ts`), with no stand;
 * - a non-return valve: a cast body with its flow arrow;
 * - a rotary power isolator on a conduit drop.
 */
export type InlineFittingKind =
  | 'isolating-valve'
  | 'non-return-valve'
  | 'power-isolator'
  | 'remote-valve';

export interface InlineFittingSpec {
  kind: InlineFittingKind;
  medium: string;
  operator: 'hand' | 'chain' | 'motor' | 'self' | 'solenoid';
  od: number;
  /** Lagged heating? Its lever is red. */
  heating?: boolean;
  /** For a chain wheel: how far down the chain hangs, metres. */
  drop?: number;
}

/** What a fitting is bound to: its node's state in the simulation. */
export interface FittingBinding {
  open(): boolean;
  set(open: boolean): void;
}

/**
 * A fitting as a working part: a click on its lever, wheel, chain or
 * handle opens or shuts it (switches it on or off), through `binding`, and
 * what it shows follows the state it is bound to. A non-return valve has
 * nothing to work.
 */
export function createInlineFitting(
  kit: PanelKit,
  f: InlineFittingSpec,
  binding?: FittingBinding,
) {
  const t = tools(kit);
  const brass = t.paint('#ad8b4d', 0.4, 0.6);
  const iron = t.paint('#3b4245', 0.6, 0.4);
  const r = f.od / 2;
  const name =
    f.kind === 'power-isolator'
      ? 'Power isolator'
      : f.kind === 'non-return-valve'
        ? 'Non-return valve'
        : f.operator === 'chain'
          ? 'Isolating valve, chain wheel'
          : f.operator === 'motor' || f.operator === 'solenoid'
            ? 'Motorised isolating valve'
            : 'Isolating valve';
  const a = beginPart(kit, name);
  const group = a.object;
  let fallback = true;
  const open = () => binding?.open() ?? fallback;
  const toggle = () => {
    if (binding) binding.set(!binding.open());
    else fallback = !fallback;
  };
  const clickable = (object: Object3D) =>
    object.traverse((piece) => a.uses.set(piece, toggle));

  if (f.kind === 'power-isolator') {
    const isolator = createPowerIsolator(kit, {
      on: open(),
      rating: '3P  20A',
      maker: 'VOLTARA',
    });
    // Its back to the conduit, which runs up behind it.
    isolator.group.position.z = -0.03;
    group.add(isolator.group);
    clickable(isolator.handle);
    a.updates.push((delta) => {
      if (isolator.on !== open()) isolator.set(open());
      isolator.update(delta);
    });
    return a.part();
  }
  if (
    f.kind === 'remote-valve' ||
    f.operator === 'motor' ||
    f.operator === 'solenoid'
  ) {
    const g = remoteValveGeometry(
      f.medium === 'gas' ? 'gas' : 'water',
      f.od,
      0,
    );
    const valve = createRemoteValve(kit, g, { stand: false });
    group.add(valve.group);
    // Its actuator's manual override, worked by a click.
    clickable(valve.group);
    a.updates.push(() => valve.show(open()));
    return a.part();
  }
  if (f.kind === 'non-return-valve') {
    const length = Math.max(0.07, 2 * f.od + 0.02);
    t.cyl(group, iron, r * 1.25, length * 0.7, 0, 0, 0, 'x', 16);
    for (const x of [-1, 1])
      t.cyl(
        group,
        iron,
        r * 1.35,
        length * 0.15,
        x * length * 0.425,
        0,
        0,
        'x',
        6,
      );
    // The cover over its disc, and the cast arrow.
    t.cyl(group, iron, r * 0.8, r * 0.6, 0, r * 1.4, 0, 'y', 12);
    const white = t.paint('#e8e6dc', 0.6);
    t.box(group, white, length * 0.45, 0.003, 0.006, 0, r * 1.26, r * 0.9);
    return a.part();
  }
  // A lever ball valve: its lever along the pipe when open, across when shut.
  const length = Math.max(0.06, 1.4 * f.od);
  for (const x of [-1, 1])
    t.cyl(
      group,
      brass,
      r * 1.3,
      length * 0.25,
      x * length * 0.375,
      0,
      0,
      'x',
      6,
    );
  t.cyl(group, brass, r * 1.15, length * 0.5, 0, 0, 0, 'x', 16);
  t.cyl(group, brass, 0.007, r * 1.2 + 0.02, 0, r + 0.01, 0, 'y', 8);
  const paint = t.paint(
    f.medium === 'gas' ? '#e2b81e' : f.heating ? '#c0392b' : '#2d6fb7',
    0.5,
  );
  const lever = new Group();
  lever.name = 'lever';
  lever.userData.live = true;
  group.add(lever);
  if (f.operator === 'chain') {
    // A chain wheel on the stem, and its loop of chain hanging down.
    const top = r * 1.2 + 0.04;
    lever.position.y = top;
    t.cyl(lever, paint, 0.1, 0.012, 0, 0, 0, 'y', 20);
    const chain = t.paint('#6d7173', 0.5, 0.6);
    const drop = f.drop ?? 1;
    for (const z of [-0.1, 0.1]) {
      const fall = t.box(
        group,
        chain,
        0.008,
        drop,
        0.008,
        0,
        top - drop / 2,
        z,
      );
      clickable(fall);
    }
  } else {
    lever.position.y = r * 1.2 + 0.025;
    const reach = Math.max(0.12, 3.5 * f.od);
    t.box(lever, paint, reach, 0.012, 0.022, reach / 2 - 0.01, 0, 0);
  }
  clickable(lever);
  let angle = open() ? 0 : Math.PI / 2;
  a.updates.push((delta) => {
    const target = open() ? 0 : Math.PI / 2;
    angle += (target - angle) * Math.min(1, delta * 8);
    lever.rotation.y = angle;
  });
  return a.part();
}

/**
 * Turns a fitting drawn along x into place on its pipe at `at`, running
 * `along`: its top up on a level pipe; on an upright one, its top toward
 * `inward` (into the room). A power isolator stands upright, its face
 * toward `inward`.
 */
export function placeFitting(
  object: Object3D,
  kind: InlineFittingKind,
  at: readonly [number, number, number],
  along: readonly [number, number, number],
  inward: readonly [number, number],
) {
  const into = new Vector3(inward[0], 0, inward[1]).normalize();
  const x = new Vector3(...along).normalize();
  let y: Vector3;
  let z: Vector3;
  if (kind === 'power-isolator') {
    y = new Vector3(0, 1, 0);
    z = into.clone();
    const xs = new Vector3().crossVectors(y, z).normalize();
    object.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(xs, y, z));
  } else {
    y = Math.abs(x.y) > 0.5 ? into.clone() : new Vector3(0, 1, 0);
    y.sub(x.clone().multiplyScalar(y.dot(x))).normalize();
    z = new Vector3().crossVectors(x, y).normalize();
    object.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
  }
  object.position.set(at[0], at[1], at[2]);
  return object;
}
