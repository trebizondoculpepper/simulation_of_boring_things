import { Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { Footprint } from '../../../controls/logic/walk-collision';
import type { LadderZone } from '../../../controls/logic/ladder-zone';
import {
  humanLadderLayout,
  type HumanLadderKind,
  type HumanLadderLayout,
  type LadderPoint,
} from '../logic/human-ladder';
import { createPoolLadder } from '../../../gallery/views/pool-ladder';
import { createTankLadder } from '../../plant/views/tank-ladder';
import { createCagedLadder } from '../../plant/views/railings';

interface LadderRecord {
  layout: HumanLadderLayout;
  enabled: () => boolean;
}
const records = new WeakMap<Object3D, LadderRecord>();

const worldPoint = (group: Group, at: LadderPoint) =>
  group.localToWorld(new Vector3(...at));

function zoneOf(group: Group, layout: HumanLadderLayout): LadderZone {
  group.updateWorldMatrix(true, false);
  const rung = worldPoint(group, layout.rung);
  const bottom = worldPoint(group, [
    layout.rung[0],
    layout.bottom,
    layout.rung[2],
  ]);
  const top = worldPoint(group, [layout.rung[0], layout.top, layout.rung[2]]);
  const lower = worldPoint(group, layout.bottomExit);
  const upper = worldPoint(group, layout.topExit);
  return {
    minX: Math.min(rung.x, lower.x, upper.x) - 0.3,
    maxX: Math.max(rung.x, lower.x, upper.x) + 0.3,
    minZ: Math.min(rung.z, lower.z, upper.z) - 0.3,
    maxZ: Math.max(rung.z, lower.z, upper.z) + 0.3,
    bottom: bottom.y,
    top: top.y,
    rung: { x: rung.x, z: rung.z },
    bottomExit: { x: lower.x, z: lower.z },
    topExit: { x: upper.x, z: upper.z },
  };
}

/** One public constructor for ladders made for people rather than cables. */
export function createHumanLadder(
  kind: HumanLadderKind,
  height: number,
  options: {
    kit?: PanelKit;
    width?: number;
    standOff?: number;
    extension?: number;
    topExit?: LadderPoint;
    bottomExit?: LadderPoint;
    enabled?: () => boolean;
  } = {},
) {
  const layout = humanLadderLayout(kind, height, options);
  let group: Group;
  if (kind === 'pool') group = createPoolLadder(height, options.width);
  else {
    if (!options.kit) throw new Error(`${kind} ladder needs a PanelKit.`);
    group =
      kind === 'tank-access'
        ? createTankLadder(options.kit, {
            depth: height,
            standOff: options.standOff,
            extension: options.extension,
          })
        : createCagedLadder(options.kit, height);
  }
  group.name = `${kind} human access ladder`;
  const record = { layout, enabled: options.enabled ?? (() => true) };
  records.set(group, record);
  return {
    group,
    zone: () => zoneOf(group, layout),
    enabled: () => record.enabled(),
    setEnabled: (enabled: () => boolean) => {
      record.enabled = enabled;
    },
    /** Stile collision only; do not block the rung passage with one wide box. */
    solids: (): Footprint[] => {
      group.updateWorldMatrix(true, false);
      return layout.stiles.map((f) => {
        const a = group.localToWorld(new Vector3(f.minX, 0, f.minZ));
        const b = group.localToWorld(new Vector3(f.maxX, 0, f.maxZ));
        return {
          minX: Math.min(a.x, b.x),
          maxX: Math.max(a.x, b.x),
          minZ: Math.min(a.z, b.z),
          maxZ: Math.max(a.z, b.z),
        };
      });
    },
  };
}

/** Find every human ladder under a rendered room, including nested equipment. */
export function humanLadderZones(
  root: Object3D,
  floorAt?: (x: number, z: number) => number,
): LadderZone[] {
  root.updateWorldMatrix(true, true);
  const zones: LadderZone[] = [];
  root.traverse((object) => {
    const record = records.get(object);
    if (record?.enabled()) {
      const zone = zoneOf(object as Group, record.layout);
      if (floorAt && record.layout.kind === 'pool') {
        const lower = floorAt(zone.bottomExit.x, zone.bottomExit.z);
        if (Number.isFinite(lower)) zone.bottom = lower;
      }
      zones.push(zone);
    }
  });
  return zones;
}
